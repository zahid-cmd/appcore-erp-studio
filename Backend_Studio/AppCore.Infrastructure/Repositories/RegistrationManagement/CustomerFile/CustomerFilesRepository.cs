//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.RegistrationManagement.CustomerFile;
using AppCore.Application.RegistrationManagement.RegistrationControl;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.RegistrationManagement.CustomerFile;
using AppCore.Domain.Entities.Settings.ClientSettings;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Domain.Entities.Settings.ProductSettings;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.RegistrationManagement.CustomerFile;


//===============================================================
// Customer Files Repository (hand-written page)
//
// One file per chassis (live, not cancelled). Owners are Customer
// Profiles records (each with its own receivable ledger).
//
// Opening files (bikes sold before the system) : CF-OPEN-0001,
//   typed on the page; editable while Open with no transfers.
//   Invoice files are made by Sales Invoice - MB (later) :
//   <invoice no>/<line>.
//
// Status : Open -> ReadyForDelivery (ready date) -> Delivered
//   (collected date); a step can be taken back one at a time.
//   Cancelled : opening files only, while Open with no transfers
//   (an invoice file goes with its invoice); Reopen when the
//   chassis is still free.
//
// Name transfers (before registration) : file Open; the policy in
//   force on the transfer date (Customer File Configuration) sets
//   the transfers allowed and the fee; the required Name Transfer
//   Documents must be ticked. The new owner becomes the current
//   customer; documents in the old owner's name are no longer
//   printable. Only the latest transfer can be cancelled.
//
// Fees (owner 2026-11-08) : a name transfer fee (policy in force)
//   and a custody charge (delivery policy in force on the ready
//   date, collected late) are collected on Fees Collection by a
//   Receipt Voucher (Payment Desk) : Dr cash / bank / MFS / POS,
//   Cr GLR-009-002-001-00002 Customer File Income.
//   Pay first : a transfer with a fee is saved FeePending and
//   takes effect when its fee is collected; a file with an unpaid
//   custody charge is not delivered (the charge is raised as a
//   Pending fee). Switch CFG-MOD-011-0101 ON : the user may tick
//   "without payment" : the action goes ahead and the fee is
//   booked as the customer's due by a Journal Voucher (Dr the
//   customer's receivable / Cr Customer File Income); collecting
//   it later credits the customer's receivable.
//
// Codes : CF-OPEN-nnnn / NTF-nnnnnn / CFF-nnnnnn, deleted rows
// count.
//===============================================================

public class CustomerFilesRepository
    : ICustomerFilesRepository
{
    private const int RemarksMaxLength = 500;

    private const int TextMaxLength = 50;

    private const string HistoryModule = "Registration Management";

    private const string HistoryEntity = "CustomerFile";

    private const string OpeningPrefix = "CF-OPEN";

    private const string TransferPrefix = "NTF";

    private const string FeePrefix = "CFF";

    // Other Income > Registration Management > Customer File Income
    private const string IncomeLedgerCode = "GLR-009-002-001-00002";

    // Customer Files : Allow Without Fee Payment (critical, OFF)
    private const string WithoutPaymentSwitch = "CFG-MOD-011-0101";

    private const string LedgerTypeCustomer = "Customer";

    private const string LedgerTypeGeneral = "General Ledger";


    private readonly AppDbContext _context;

    private readonly IReceiptVoucherRepository _receiptVouchers;

    private readonly IJournalVoucherRepository _journalVouchers;


    public CustomerFilesRepository(
        AppDbContext context,
        IReceiptVoucherRepository receiptVouchers,
        IJournalVoucherRepository journalVouchers)
    {
        _context = context;

        _receiptVouchers = receiptVouchers;

        _journalVouchers = journalVouchers;
    }


    private DbSet<CustomerFiles> Files =>
        _context.Set<CustomerFiles>();

    private DbSet<CustomerFileNameTransfers> Transfers =>
        _context.Set<CustomerFileNameTransfers>();

    private DbSet<CustomerFileFees> Fees =>
        _context.Set<CustomerFileFees>();


    // Business date : Bangladesh time, whatever the server clock
    private static DateOnly Today =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, BusinessZone));

    private static readonly TimeZoneInfo BusinessZone =
        FindBusinessZone();

    private static TimeZoneInfo FindBusinessZone()
    {
        foreach (string id in new[] { "Asia/Dhaka", "Bangladesh Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return TimeZoneInfo.CreateCustomTimeZone("BD", TimeSpan.FromHours(6), "Bangladesh", "Bangladesh");
    }



    //===========================================================
    // Helpers
    //===========================================================

    private static string DateText(DateOnly date) =>
        date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static string DateText(DateOnly? date) =>
        date.HasValue ? DateText(date.Value) : string.Empty;

    private static string DisplayDate(DateOnly date) =>
        date.ToString("dd MMM yyyy", CultureInfo.InvariantCulture);

    private static string Money(decimal value) =>
        value.ToString("#,##0.00", CultureInfo.InvariantCulture);

    private static string StatusLabel(string status) =>
        status == CustomerFileStatuses.ReadyForDelivery ? "Ready for Delivery" : status;

    private static string FeeTypeLabel(string type) =>
        type == CustomerFileFeeTypes.Custody ? "Custody Charge" : "Name Transfer Fee";

    private static string Limit(string? text, int max)
    {
        string value = (text ?? string.Empty).Trim();

        return value.Length > max ? value.Substring(0, max) : value;
    }


    private static string Clean
    (
        string? text,
        string label,
        int maxLength,
        bool required = false
    )
    {
        string value = (text ?? string.Empty).Trim();

        if (required && value.Length == 0)
        {
            throw new InvalidOperationException($"{label} is required.");
        }

        if (value.Length > maxLength)
        {
            throw new InvalidOperationException(
                $"{label} cannot be longer than {maxLength} characters.");
        }

        return value;
    }


    private static DateOnly ParseDate
    (
        string? text,
        string label
    )
    {
        string value = (text ?? string.Empty).Trim();

        if (value.Length >= 10)
        {
            value = value.Substring(0, 10);
        }

        if (!DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly date))
        {
            throw new InvalidOperationException($"{label} is required (a valid date).");
        }

        if (date.Year < 2000 || date.Year > 2100)
        {
            throw new InvalidOperationException($"{label} must be between 2000 and 2100.");
        }

        return date;
    }


    private static DateOnly? ParseOptionalDate
    (
        string? text,
        string label
    )
    {
        return string.IsNullOrWhiteSpace(text)
            ? null
            : ParseDate(text, label);
    }


    private static string NextCode
    (
        string prefix,
        int digits,
        IEnumerable<string> codes
    )
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if
            (
                value.StartsWith(prefix + "-", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(prefix.Length + 1), NumberStyles.None, CultureInfo.InvariantCulture, out int number)
                && number > highest
            )
            {
                highest = number;
            }
        }

        return $"{prefix}-{(highest + 1).ToString("D" + digits, CultureInfo.InvariantCulture)}";
    }


    private async Task<string> NextOpeningNoAsync() =>
        NextCode(
            OpeningPrefix,
            4,
            await Files.AsNoTracking()
                .Where(x => x.Source == CustomerFileSources.Opening)
                .Select(x => x.CustomerFileNo)
                .ToListAsync());


    private async Task<string> NextTransferNoAsync() =>
        NextCode(
            TransferPrefix,
            6,
            await Transfers.AsNoTracking().Select(x => x.TransferNo).ToListAsync());


    private async Task<string> NextFeeNoAsync() =>
        NextCode(
            FeePrefix,
            6,
            await Fees.AsNoTracking().Select(x => x.FeeNo).ToListAsync());


    // System Configuration switch (by code; missing = OFF)
    private async Task<bool> IsWithoutPaymentAllowedAsync()
    {
        bool? value =
            await _context
                .Set<AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == WithoutPaymentSwitch && !x.IsDeleted)
                .Select(x => (bool?)x.IsEnabled)
                .FirstOrDefaultAsync();

        return value ?? false;
    }


    // All or nothing (the fee, its voucher and the file change)
    private async Task InTransactionAsync
    (
        Func<Task> work
    )
    {
        if (_context.Database.CurrentTransaction != null)
        {
            await work();

            return;
        }

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            await work();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    // A fee booked as the customer's due : Journal Voucher
    // Dr the customer's receivable / Cr Customer File Income
    private async Task<JournalVoucherSavedDto> BookDueAsync
    (
        CustomerProfiles customer,
        decimal amount,
        DateOnly date,
        long branchId,
        string narration,
        string reference,
        long userId
    )
    {
        if (string.IsNullOrWhiteSpace(customer.ReceivableLedgerCode))
        {
            throw new InvalidOperationException(
                $"{customer.CustomerName} ({customer.CustomerCode}) has no receivable ledger : the fee cannot be booked as a due.");
        }

        return await _journalVouchers.CreatePostedAsync(
            new CreateJournalVoucherDto
            {
                VoucherDate = DateText(date),
                BranchId = branchId,
                Narration = Limit(narration, 500),
                Lines =
                    new List<JournalVoucherLineDto>
                    {
                        new JournalVoucherLineDto
                        {
                            Side = "Debit",
                            GroupNo = 1,
                            LedgerType = LedgerTypeCustomer,
                            LedgerCode = customer.ReceivableLedgerCode.Trim(),
                            Amount = amount,
                            ShortNotes = Limit(reference, 250)
                        },
                        new JournalVoucherLineDto
                        {
                            Side = "Credit",
                            GroupNo = 1,
                            LedgerType = LedgerTypeGeneral,
                            LedgerCode = IncomeLedgerCode,
                            Amount = amount,
                            ShortNotes = Limit(reference, 250)
                        }
                    }
            },
            reference,
            userId);
    }


    private void AddHistory
    (
        long entityId,
        string activityType,
        string title,
        string description,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = entityId,
                ActivityType = activityType,
                ActivityTitle = title,
                ActivityDescription = description,
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }


    private async Task<CustomerFiles> FindFileAsync
    (
        Guid publicId
    )
    {
        return await Files.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
               ?? throw new KeyNotFoundException("The customer file was not found.");
    }


    private async Task<CustomerProfiles> FindCustomerAsync
    (
        long customerId
    )
    {
        if (customerId <= 0)
        {
            throw new InvalidOperationException("Choose the customer.");
        }

        CustomerProfiles customer =
            await _context.Set<CustomerProfiles>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.CustomerId == customerId && !x.IsDeleted)
            ?? throw new InvalidOperationException("The customer was not found.");

        if (!customer.IsActive)
        {
            throw new InvalidOperationException(
                $"{customer.CustomerName} ({customer.CustomerCode}) is inactive.");
        }

        return customer;
    }


    // Fuel / Electric of a bike : its model's specification
    private async Task<(MotorBikes Bike, string Power)> FindBikeAsync
    (
        long motorBikeId
    )
    {
        if (motorBikeId <= 0)
        {
            throw new InvalidOperationException("Choose the motor bike.");
        }

        MotorBikes bike =
            await _context.Set<MotorBikes>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.MotorBikeId == motorBikeId && !x.IsDeleted)
            ?? throw new InvalidOperationException("The motor bike was not found.");

        string? fuelType =
            await (
                from s in _context.Set<ProductSubCategory>().AsNoTracking()
                join p in _context.Set<MotorBikeSpecifications>().AsNoTracking()
                    on s.BikeModelId equals (long?)p.BikeModelId
                where s.ProductSubCategoryId == bike.ProductSubCategoryId && !p.IsDeleted
                select p.FuelType
            ).FirstOrDefaultAsync();

        return (bike, RegistrationVehiclePowers.OfFuelType(fuelType));
    }


    private async Task EnsureChassisFreeAsync
    (
        string chassisNo,
        long excludeId
    )
    {
        string upper = chassisNo.ToUpperInvariant();

        CustomerFiles? same =
            await Files.AsNoTracking()
                .FirstOrDefaultAsync(
                    x => !x.IsDeleted
                         && x.Status != CustomerFileStatuses.Cancelled
                         && x.CustomerFileId != excludeId
                         && x.ChassisNo.ToUpper() == upper);

        if (same != null)
        {
            throw new InvalidOperationException(
                $"Chassis {chassisNo} already has the customer file {same.CustomerFileNo}.");
        }
    }


    // The name transfer policy in force on a date
    private async Task<CustomerFileNameTransferRules?> PolicyOnAsync
    (
        DateOnly date
    )
    {
        return await _context.Set<CustomerFileNameTransferRules>().AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive && x.EffectiveFrom <= date)
            .OrderByDescending(x => x.EffectiveFrom)
            .FirstOrDefaultAsync();
    }


    private async Task<string> PendingTransferNoAsync
    (
        long customerFileId
    )
    {
        return await Transfers.AsNoTracking()
            .Where(x => x.CustomerFileId == customerFileId && !x.IsDeleted && x.Status == CustomerFileTransferStatuses.FeePending)
            .Select(x => x.TransferNo)
            .FirstOrDefaultAsync()
            ?? string.Empty;
    }


    private static NameTransferQuoteDto Quote
    (
        CustomerFiles file,
        CustomerFileNameTransferRules? policy,
        DateOnly date,
        string pendingTransferNo
    )
    {
        NameTransferQuoteDto quote =
            new()
            {
                TransfersMade = file.TransferCount,
                TransfersAllowed = policy?.TransfersAllowed ?? 0,
                FeePerTransfer = policy?.FeePerTransfer ?? 0,
                PolicyCode = policy?.Code ?? string.Empty
            };

        if (file.Status != CustomerFileStatuses.Open)
        {
            quote.Message =
                $"File {file.CustomerFileNo} is {StatusLabel(file.Status)} : a name transfer is only allowed while the file is Open (before registration).";

            return quote;
        }

        if (pendingTransferNo.Length > 0)
        {
            quote.Message =
                $"Transfer {pendingTransferNo} of file {file.CustomerFileNo} is waiting for its fee : collect it on Fees Collection (or cancel it) first.";

            return quote;
        }

        if (policy == null)
        {
            quote.Message =
                $"No name transfer policy is in force on {DisplayDate(date)} (Customer File Configuration).";

            return quote;
        }

        if (file.TransferCount >= policy.TransfersAllowed)
        {
            quote.Message =
                policy.TransfersAllowed == 0
                    ? $"Policy {policy.Code} allows no name transfer before registration."
                    : $"File {file.CustomerFileNo} already has {file.TransferCount} transfer(s); policy {policy.Code} allows {policy.TransfersAllowed}.";

            return quote;
        }

        quote.Allowed = true;

        quote.Message =
            policy.FeePerTransfer > 0
                ? $"Transfer {file.TransferCount + 1} of {policy.TransfersAllowed} ({policy.Code}), fee {Money(policy.FeePerTransfer)} : the transfer takes effect when the fee is collected."
                : $"Transfer {file.TransferCount + 1} of {policy.TransfersAllowed} ({policy.Code}), no fee.";

        return quote;
    }



    //===========================================================
    // Read
    //===========================================================

    public async Task<CustomerFilesPageDto>
        GetAllAsync
        (
            long branchId
        )
    {
        List<CustomerFiles> files =
            await Files.AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.FileDate)
                .ThenByDescending(x => x.CustomerFileId)
                .ToListAsync();

        List<CustomerFileNameTransfers> transfers =
            await Transfers.AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.TransferDate)
                .ThenByDescending(x => x.NameTransferId)
                .ToListAsync();

        List<CustomerFileFees> fees =
            await Fees.AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.FeeDate)
                .ThenByDescending(x => x.CustomerFileFeeId)
                .ToListAsync();

        HashSet<long> customerIds =
            files.SelectMany(x => new[] { x.OriginalCustomerId, x.CurrentCustomerId })
                .Concat(transfers.SelectMany(x => new[] { x.FromCustomerId, x.ToCustomerId }))
                .Concat(fees.Select(x => x.CustomerId))
                .ToHashSet();

        Dictionary<long, CustomerProfiles> customers =
            await _context.Set<CustomerProfiles>().AsNoTracking()
                .Where(x => customerIds.Contains(x.CustomerId))
                .ToDictionaryAsync(x => x.CustomerId);

        HashSet<long> bikeIds =
            files.Select(x => x.MotorBikeId).ToHashSet();

        Dictionary<long, string> bikes =
            await _context.Set<MotorBikes>().AsNoTracking()
                .Where(x => bikeIds.Contains(x.MotorBikeId))
                .ToDictionaryAsync(x => x.MotorBikeId, x => x.ProductName);

        HashSet<long> branchIds =
            files.Select(x => x.BranchId).Append(branchId).ToHashSet();

        Dictionary<long, string> branches =
            await _context.Set<Branches>().AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName);

        Dictionary<long, CustomerFiles> fileById =
            files.ToDictionary(x => x.CustomerFileId);

        // CKD documents per chassis (bike records; an opening file
        // without one uses its own status)
        List<string> chassisList =
            files.Select(x => x.ChassisNo.ToUpper()).Distinct().ToList();

        Dictionary<string, string> ckdByChassis =
            (await _context.Set<AppCore.Domain.Entities.Procurement.MotorBikePurchase.MotorBikeUnits>().AsNoTracking()
                .Where(x => !x.IsDeleted && chassisList.Contains(x.ChassisNo.ToUpper()))
                .Select(x => new { Chassis = x.ChassisNo.ToUpper(), x.CkdStatus })
                .ToListAsync())
            .GroupBy(x => x.Chassis)
            .ToDictionary(g => g.Key, g => g.Any(x => x.CkdStatus == "Yes") ? "Yes" : "No");

        Dictionary<long, CustomerFileNameTransfers> transferById =
            transfers.ToDictionary(x => x.NameTransferId);

        // Latest transfer of each file
        HashSet<long> latestIds =
            transfers.GroupBy(x => x.CustomerFileId)
                .Select(g => g.OrderByDescending(x => x.NameTransferId).First().NameTransferId)
                .ToHashSet();

        // Pending transfer of each file
        Dictionary<long, string> pendingByFile =
            transfers.Where(x => x.Status == CustomerFileTransferStatuses.FeePending)
                .GroupBy(x => x.CustomerFileId)
                .ToDictionary(g => g.Key, g => g.First().TransferNo);

        // Fee of each transfer (the live one)
        Dictionary<long, CustomerFileFees> feeByTransfer =
            fees.Where(x => x.NameTransferId.HasValue && x.Status != CustomerFileFeeStatuses.Cancelled)
                .GroupBy(x => x.NameTransferId!.Value)
                .ToDictionary(g => g.Key, g => g.First());

        string NameOf(long id) =>
            customers.TryGetValue(id, out CustomerProfiles? c)
                ? $"{c.CustomerName} ({c.CustomerCode})"
                : $"#{id}";

        return new CustomerFilesPageDto
        {
            Today = DateText(Today),

            BranchId = branchId,

            BranchName = branches.GetValueOrDefault(branchId, string.Empty),

            AllowWithoutPayment = await IsWithoutPaymentAllowedAsync(),

            Files =
                files.Select(
                    x =>
                    {
                        customers.TryGetValue(x.CurrentCustomerId, out CustomerProfiles? current);

                        return new CustomerFileDto
                        {
                            CustomerFileId = x.CustomerFileId,
                            PublicId = x.PublicId,
                            CustomerFileNo = x.CustomerFileNo,
                            Source = x.Source,
                            FileDate = DateText(x.FileDate),
                            BranchId = x.BranchId,
                            BranchName = branches.GetValueOrDefault(x.BranchId, string.Empty),
                            SalesInvoiceNo = x.SalesInvoiceNo,
                            SalesInvoiceDate = DateText(x.SalesInvoiceDate),
                            SalesmanName = x.SalesmanName,
                            MotorBikeId = x.MotorBikeId,
                            BikeName = bikes.GetValueOrDefault(x.MotorBikeId, string.Empty),
                            ChassisNo = x.ChassisNo,
                            EngineNo = x.EngineNo,
                            VehiclePower = x.VehiclePower,
                            OriginalCustomerId = x.OriginalCustomerId,
                            OriginalCustomerName = NameOf(x.OriginalCustomerId),
                            CurrentCustomerId = x.CurrentCustomerId,
                            CurrentCustomerName = NameOf(x.CurrentCustomerId),
                            CurrentCustomerPhone = current?.Phone1 ?? string.Empty,
                            CurrentCustomerNid = current?.NidNo ?? string.Empty,
                            RegistrationBy = x.RegistrationBy,
                            RegistrationFileNo = x.RegistrationFileNo,
                            TransferCount = x.TransferCount,
                            FileReadyDate = DateText(x.FileReadyDate),
                            CollectedDate = DateText(x.CollectedDate),
                            Status = x.Status,
                            Remarks = x.Remarks,
                            PendingTransferNo = pendingByFile.GetValueOrDefault(x.CustomerFileId, string.Empty),
                            CkdStatus = ckdByChassis.GetValueOrDefault(x.ChassisNo.ToUpper(), x.CkdStatus)
                        };
                    }).ToList(),

            Transfers =
                transfers
                    .Where(x => fileById.ContainsKey(x.CustomerFileId))
                    .Select(
                        x =>
                        {
                            feeByTransfer.TryGetValue(x.NameTransferId, out CustomerFileFees? fee);

                            return new CustomerFileTransferDto
                            {
                                NameTransferId = x.NameTransferId,
                                PublicId = x.PublicId,
                                TransferNo = x.TransferNo,
                                CustomerFileId = x.CustomerFileId,
                                CustomerFilePublicId = fileById[x.CustomerFileId].PublicId,
                                CustomerFileNo = fileById[x.CustomerFileId].CustomerFileNo,
                                ChassisNo = fileById[x.CustomerFileId].ChassisNo,
                                TransferDate = DateText(x.TransferDate),
                                FromCustomerId = x.FromCustomerId,
                                FromCustomerName = NameOf(x.FromCustomerId),
                                ToCustomerId = x.ToCustomerId,
                                ToCustomerName = NameOf(x.ToCustomerId),
                                FeeAmount = x.FeeAmount,
                                DocumentCodes = x.DocumentCodes,
                                Remarks = x.Remarks,
                                Status = x.Status,
                                FeeNo = fee?.FeeNo ?? string.Empty,
                                FeeStatus = fee?.Status ?? string.Empty,
                                IsLatest = latestIds.Contains(x.NameTransferId)
                            };
                        }).ToList(),

            Fees =
                fees
                    .Where(x => fileById.ContainsKey(x.CustomerFileId))
                    .Select(
                        x => new CustomerFileFeeDto
                        {
                            CustomerFileFeeId = x.CustomerFileFeeId,
                            PublicId = x.PublicId,
                            FeeNo = x.FeeNo,
                            CustomerFileId = x.CustomerFileId,
                            CustomerFilePublicId = fileById[x.CustomerFileId].PublicId,
                            CustomerFileNo = fileById[x.CustomerFileId].CustomerFileNo,
                            ChassisNo = fileById[x.CustomerFileId].ChassisNo,
                            FeeType = x.FeeType,
                            TransferNo =
                                x.NameTransferId.HasValue && transferById.TryGetValue(x.NameTransferId.Value, out CustomerFileNameTransfers? t)
                                    ? t.TransferNo
                                    : string.Empty,
                            FeeDate = DateText(x.FeeDate),
                            CustomerId = x.CustomerId,
                            CustomerName = NameOf(x.CustomerId),
                            Amount = x.Amount,
                            CustodyUpTo = DateText(x.CustodyUpTo),
                            Status = x.Status,
                            BranchId = x.BranchId,
                            DueVoucherNo = x.DueVoucherNo,
                            ReceiptVoucherNo = x.ReceiptVoucherNo,
                            PaidDate = DateText(x.PaidDate),
                            Remarks = x.Remarks
                        }).ToList()
        };
    }


    public async Task<CustomerFilesDefaultsDto>
        GetDefaultsAsync()
    {
        // Motor bikes with the power of their model
        var bikeRows =
            await (
                from b in _context.Set<MotorBikes>().AsNoTracking()
                where !b.IsDeleted && b.IsActive
                join s in _context.Set<ProductSubCategory>().AsNoTracking()
                    on b.ProductSubCategoryId equals s.ProductSubCategoryId into sj
                from s in sj.DefaultIfEmpty()
                orderby b.ProductName
                select new
                {
                    b.MotorBikeId,
                    b.ProductCode,
                    b.ProductName,
                    BikeModelId = s == null ? null : s.BikeModelId
                }
            ).ToListAsync();

        Dictionary<long, string> fuelByModel =
            (await _context.Set<MotorBikeSpecifications>().AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.BikeModelId, x.FuelType })
                .ToListAsync())
            .GroupBy(x => x.BikeModelId)
            .ToDictionary(g => g.Key, g => g.First().FuelType);

        List<CustomerFileLookupItem> customers =
            await _context.Set<CustomerProfiles>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.CustomerType == "Inbound" ? 0 : 1)
                .ThenBy(x => x.CustomerName)
                .Select(
                    x => new CustomerFileLookupItem
                    {
                        Id = x.CustomerId,
                        Code = x.CustomerCode,
                        Name = x.CustomerName,
                        Extra = x.Phone1
                    })
                .ToListAsync();

        List<CustomerFileLookupItem> documents =
            await _context.Set<CustomerFileDocuments>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && x.DocumentFor == CustomerFileDocumentFor.NameTransfer)
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.Code)
                .Select(
                    x => new CustomerFileLookupItem
                    {
                        Id = x.CustomerFileDocumentId,
                        Code = x.Code,
                        Name = x.Name,
                        Extra = x.IsRequired ? "Required" : "Optional"
                    })
                .ToListAsync();

        return new CustomerFilesDefaultsDto
        {
            NextOpeningNo = await NextOpeningNoAsync(),
            NextTransferNo = await NextTransferNoAsync(),

            Bikes =
                bikeRows.Select(
                    x => new CustomerFileLookupItem
                    {
                        Id = x.MotorBikeId,
                        Code = x.ProductCode,
                        Name = x.ProductName,
                        Extra = RegistrationVehiclePowers.OfFuelType(
                            x.BikeModelId.HasValue && fuelByModel.TryGetValue(x.BikeModelId.Value, out string? fuel) ? fuel : null)
                    }).ToList(),

            Customers = customers,

            TransferDocuments = documents
        };
    }


    public async Task<NameTransferQuoteDto>
        GetTransferQuoteAsync
        (
            Guid filePublicId,
            string? date
        )
    {
        CustomerFiles file =
            await Files.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == filePublicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The customer file was not found.");

        DateOnly on =
            string.IsNullOrWhiteSpace(date) ? Today : ParseDate(date, "Transfer Date");

        return Quote(file, await PolicyOnAsync(on), on, await PendingTransferNoAsync(file.CustomerFileId));
    }



    //===========================================================
    // OPENING FILES
    //===========================================================

    private sealed record OpeningValues
    (
        DateOnly FileDate,
        string InvoiceNo,
        DateOnly? InvoiceDate,
        string Salesman,
        string ChassisNo,
        string EngineNo,
        string RegistrationBy,
        string Remarks
    );


    private static OpeningValues NormalizeOpening
    (
        SaveOpeningFileDto dto
    )
    {
        DateOnly fileDate = ParseDate(dto.FileDate, "File Date");

        DateOnly? invoiceDate = ParseOptionalDate(dto.SalesInvoiceDate, "Sales Invoice Date");

        if (invoiceDate.HasValue && invoiceDate.Value > fileDate)
        {
            throw new InvalidOperationException("Sales Invoice Date cannot be after the File Date.");
        }

        if (fileDate > Today)
        {
            throw new InvalidOperationException("File Date cannot be in the future.");
        }

        string registrationBy =
            string.Equals((dto.RegistrationBy ?? string.Empty).Trim(), "Customer", StringComparison.OrdinalIgnoreCase)
                ? "Customer"
                : "Dealer";

        return new OpeningValues(
            fileDate,
            Clean(dto.SalesInvoiceNo, "Sales Invoice No", TextMaxLength),
            invoiceDate,
            Clean(dto.SalesmanName, "Salesman", 150),
            Clean(dto.ChassisNo, "Chassis No", TextMaxLength, true).ToUpperInvariant(),
            Clean(dto.EngineNo, "Engine No", TextMaxLength, true).ToUpperInvariant(),
            registrationBy,
            Clean(dto.Remarks, "Remarks", RemarksMaxLength));
    }


    public async Task<Guid>
        CreateOpeningFileAsync
        (
            SaveOpeningFileDto dto,
            long branchId,
            long userId
        )
    {
        OpeningValues v = NormalizeOpening(dto);

        (MotorBikes bike, string power) = await FindBikeAsync(dto.MotorBikeId);

        CustomerProfiles customer = await FindCustomerAsync(dto.CustomerId);

        await EnsureChassisFreeAsync(v.ChassisNo, 0);

        CustomerFiles entity =
            new()
            {
                CustomerFileNo = await NextOpeningNoAsync(),
                Source = CustomerFileSources.Opening,
                FileDate = v.FileDate,
                BranchId = branchId,
                SalesInvoiceId = null,
                SalesInvoiceNo = v.InvoiceNo,
                SalesInvoiceDate = v.InvoiceDate,
                SalesmanName = v.Salesman,
                MotorBikeId = bike.MotorBikeId,
                ChassisNo = v.ChassisNo,
                EngineNo = v.EngineNo,
                VehiclePower = power,
                OriginalCustomerId = customer.CustomerId,
                CurrentCustomerId = customer.CustomerId,
                RegistrationBy = v.RegistrationBy,
                RegistrationFileNo = string.Empty,
                TransferCount = 0,
                Status = CustomerFileStatuses.Open,
                Remarks = v.Remarks,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Files.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity.CustomerFileId, "Create", "Opening File Created",
            $"{entity.CustomerFileNo} : {bike.ProductName}, chassis {entity.ChassisNo}, engine {entity.EngineNo} ({power}), customer {customer.CustomerName} ({customer.CustomerCode}), file date {DisplayDate(entity.FileDate)}.",
            userId);

        await _context.SaveChangesAsync();

        return entity.PublicId;
    }


    public async Task
        UpdateOpeningFileAsync
        (
            Guid publicId,
            SaveOpeningFileDto dto,
            long userId
        )
    {
        CustomerFiles entity = await FindFileAsync(publicId);

        if (entity.Source != CustomerFileSources.Opening)
        {
            throw new InvalidOperationException(
                $"{entity.CustomerFileNo} comes from its sales invoice : change the invoice instead.");
        }

        if (entity.Status != CustomerFileStatuses.Open || entity.TransferCount > 0)
        {
            throw new InvalidOperationException(
                $"{entity.CustomerFileNo} can only be changed while it is Open with no name transfer.");
        }

        OpeningValues v = NormalizeOpening(dto);

        (MotorBikes bike, string power) = await FindBikeAsync(dto.MotorBikeId);

        CustomerProfiles customer = await FindCustomerAsync(dto.CustomerId);

        await EnsureChassisFreeAsync(v.ChassisNo, entity.CustomerFileId);

        entity.FileDate = v.FileDate;
        entity.SalesInvoiceNo = v.InvoiceNo;
        entity.SalesInvoiceDate = v.InvoiceDate;
        entity.SalesmanName = v.Salesman;
        entity.MotorBikeId = bike.MotorBikeId;
        entity.ChassisNo = v.ChassisNo;
        entity.EngineNo = v.EngineNo;
        entity.VehiclePower = power;
        entity.OriginalCustomerId = customer.CustomerId;
        entity.CurrentCustomerId = customer.CustomerId;
        entity.RegistrationBy = v.RegistrationBy;
        entity.Remarks = v.Remarks;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.CustomerFileId, "Update", "Opening File Updated",
            $"{entity.CustomerFileNo} : {bike.ProductName}, chassis {entity.ChassisNo}, engine {entity.EngineNo} ({power}), customer {customer.CustomerName} ({customer.CustomerCode}), file date {DisplayDate(entity.FileDate)}.",
            userId);

        await _context.SaveChangesAsync();
    }



    //===========================================================
    // CKD DOCUMENTS : the bike's status (MotorBikeUnits, by
    // chassis); a chassis with no bike record (opening file) uses
    // the file's own status
    //===========================================================

    private async Task<bool> CkdReadyAsync
    (
        CustomerFiles file
    )
    {
        string chassis = file.ChassisNo.Trim().ToUpperInvariant();

        List<string> statuses =
            await _context.Set<AppCore.Domain.Entities.Procurement.MotorBikePurchase.MotorBikeUnits>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.ChassisNo.ToUpper() == chassis)
                .Select(x => x.CkdStatus)
                .ToListAsync();

        return statuses.Count > 0
            ? statuses.Any(x => x == "Yes")
            : file.CkdStatus == "Yes";
    }



    //===========================================================
    // CUSTODY CHARGE
    //===========================================================

    // The charge if the file is collected on this date : the File
    // Delivery Policy in force on the ready date (none = 0)
    private async Task<(decimal Charge, CustomerFileDeliveryRules? Rule)> CustodyChargeAsync
    (
        CustomerFiles file,
        DateOnly collected
    )
    {
        if (!file.FileReadyDate.HasValue)
        {
            return (0m, null);
        }

        DateOnly ready = file.FileReadyDate.Value;

        CustomerFileDeliveryRules? rule =
            await _context.Set<CustomerFileDeliveryRules>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && x.EffectiveFrom <= ready)
                .OrderByDescending(x => x.EffectiveFrom)
                .FirstOrDefaultAsync();

        if (rule == null)
        {
            return (0m, null);
        }

        decimal charge =
            CustodyCharge.Calculate(
                ready,
                collected,
                rule.FreeDays,
                rule.FirstYearAmount,
                rule.SecondYearAmount,
                rule.PerYearAmount);

        return (Math.Round(charge, 2), rule);
    }


    // Custody charges paid or booked as due
    private async Task<decimal> CustodyCoveredAsync
    (
        long customerFileId
    )
    {
        return await Fees.AsNoTracking()
            .Where(
                x => x.CustomerFileId == customerFileId
                     && !x.IsDeleted
                     && x.FeeType == CustomerFileFeeTypes.Custody
                     && (x.Status == CustomerFileFeeStatuses.Paid || x.Status == CustomerFileFeeStatuses.Due))
            .SumAsync(x => (decimal?)x.Amount) ?? 0m;
    }


    private async Task<List<CustomerFileFees>> PendingCustodyAsync
    (
        long customerFileId
    )
    {
        return await Fees
            .Where(
                x => x.CustomerFileId == customerFileId
                     && !x.IsDeleted
                     && x.FeeType == CustomerFileFeeTypes.Custody
                     && x.Status == CustomerFileFeeStatuses.Pending)
            .ToListAsync();
    }


    public async Task<CustodyQuoteDto>
        GetCustodyQuoteAsync
        (
            Guid filePublicId,
            string? date
        )
    {
        CustomerFiles file =
            await Files.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == filePublicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The customer file was not found.");

        DateOnly collected =
            string.IsNullOrWhiteSpace(date) ? Today : ParseDate(date, "Collected Date");

        (decimal charge, CustomerFileDeliveryRules? rule) = await CustodyChargeAsync(file, collected);

        decimal covered = await CustodyCoveredAsync(file.CustomerFileId);

        decimal pending =
            await Fees.AsNoTracking()
                .Where(
                    x => x.CustomerFileId == file.CustomerFileId
                         && !x.IsDeleted
                         && x.FeeType == CustomerFileFeeTypes.Custody
                         && x.Status == CustomerFileFeeStatuses.Pending)
                .SumAsync(x => (decimal?)x.Amount) ?? 0m;

        decimal remaining = Math.Max(0m, charge - covered);

        string message =
            !file.FileReadyDate.HasValue
                ? "The file has no ready date."
                : rule == null
                    ? "No file delivery policy was in force on the ready date : no custody charge."
                    : charge == 0m
                        ? $"Within the free days of {rule.Code} : no custody charge."
                        : remaining == 0m
                            ? $"Custody charge {Money(charge)} ({rule.Code}) is paid / booked."
                            : $"Custody charge {Money(charge)} ({rule.Code}); {Money(remaining)} to collect before delivery.";

        return new CustodyQuoteDto
        {
            Charge = charge,
            Covered = covered,
            Pending = pending,
            Remaining = remaining,
            PolicyCode = rule?.Code ?? string.Empty,
            Message = message
        };
    }



    //===========================================================
    // STATUS
    //===========================================================

    public async Task<CustomerFileStatusResultDto>
        SetStatusAsync
        (
            Guid publicId,
            SetCustomerFileStatusDto dto,
            long branchId,
            long userId
        )
    {
        CustomerFiles entity = await FindFileAsync(publicId);

        string to =
            CustomerFileStatuses.All.FirstOrDefault(
                x => string.Equals(x, (dto.Status ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Choose the status.");

        string from = entity.Status;

        if (to == from)
        {
            throw new InvalidOperationException($"{entity.CustomerFileNo} is already {StatusLabel(to)}.");
        }

        if (to == CustomerFileStatuses.Delivered && from == CustomerFileStatuses.ReadyForDelivery)
        {
            return await DeliverAsync(entity, dto, branchId, userId);
        }

        string detail;

        switch (to)
        {
            case CustomerFileStatuses.ReadyForDelivery when from == CustomerFileStatuses.Open:
            {
                if (await PendingTransferNoAsync(entity.CustomerFileId) is { Length: > 0 } pendingNo)
                {
                    throw new InvalidOperationException(
                        $"Transfer {pendingNo} is waiting for its fee : collect or cancel it first.");
                }

                // CKD documents must be in hand / on the portal
                if (!await CkdReadyAsync(entity))
                {
                    throw new InvalidOperationException(
                        $"CKD documents of chassis {entity.ChassisNo} are not marked Yes : the file cannot be ready for delivery (Inventory Status > CKD Documents Status).");
                }

                DateOnly ready = ParseDate(dto.Date, "Ready Date");

                if (ready < entity.FileDate)
                {
                    throw new InvalidOperationException(
                        $"Ready Date cannot be before the File Date ({DisplayDate(entity.FileDate)}).");
                }

                if (ready > Today)
                {
                    throw new InvalidOperationException("Ready Date cannot be in the future.");
                }

                entity.FileReadyDate = ready;

                detail = $"ready on {DisplayDate(ready)}";

                break;
            }

            // One step back
            case CustomerFileStatuses.ReadyForDelivery when from == CustomerFileStatuses.Delivered:
            {
                detail = $"delivery taken back (was collected on {DateText(entity.CollectedDate)})";

                entity.CollectedDate = null;

                break;
            }

            case CustomerFileStatuses.Open when from == CustomerFileStatuses.ReadyForDelivery:
            {
                if (await CustodyCoveredAsync(entity.CustomerFileId) > 0m)
                {
                    throw new InvalidOperationException(
                        $"{entity.CustomerFileNo} has a custody charge paid / booked from its ready date : the ready date can no longer be taken back.");
                }

                // A custody charge raised but not collected goes with
                // the ready date
                foreach (CustomerFileFees fee in await PendingCustodyAsync(entity.CustomerFileId))
                {
                    fee.Status = CustomerFileFeeStatuses.Cancelled;
                    fee.ModifiedBy = userId;
                    fee.ModifiedDate = DateTime.UtcNow;
                }

                detail = $"ready date taken back (was {DateText(entity.FileReadyDate)})";

                entity.FileReadyDate = null;

                break;
            }

            case CustomerFileStatuses.Cancelled when from == CustomerFileStatuses.Open:
            {
                if (entity.Source != CustomerFileSources.Opening)
                {
                    throw new InvalidOperationException(
                        $"{entity.CustomerFileNo} comes from its sales invoice : it is cancelled with the invoice.");
                }

                if (entity.TransferCount > 0 || await PendingTransferNoAsync(entity.CustomerFileId) is { Length: > 0 })
                {
                    throw new InvalidOperationException(
                        $"{entity.CustomerFileNo} has name transfers : cancel them first.");
                }

                detail = "cancelled";

                break;
            }

            // Reopen
            case CustomerFileStatuses.Open when from == CustomerFileStatuses.Cancelled:
            {
                await EnsureChassisFreeAsync(entity.ChassisNo, entity.CustomerFileId);

                detail = "reopened";

                break;
            }

            default:
                throw new InvalidOperationException(
                    $"{entity.CustomerFileNo} cannot go from {StatusLabel(from)} to {StatusLabel(to)}.");
        }

        entity.Status = to;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.CustomerFileId, "Update", $"Status : {StatusLabel(to)}",
            $"{entity.CustomerFileNo} : {StatusLabel(from)} -> {StatusLabel(to)}, {detail}.",
            userId);

        await _context.SaveChangesAsync();

        return new CustomerFileStatusResultDto
        {
            Done = true,
            Message = $"{entity.CustomerFileNo} is now {StatusLabel(to)}."
        };
    }


    // Ready for Delivery -> Delivered. An unpaid custody charge :
    //   without payment (switch ON, ticked) : booked as the owner's
    //     due, then delivered;
    //   otherwise : raised as a Pending fee (or the pending one is
    //     brought up to date) and the file stays Ready.
    private async Task<CustomerFileStatusResultDto> DeliverAsync
    (
        CustomerFiles entity,
        SetCustomerFileStatusDto dto,
        long branchId,
        long userId
    )
    {
        DateOnly collected = ParseDate(dto.Date, "Collected Date");

        if (entity.FileReadyDate.HasValue && collected < entity.FileReadyDate.Value)
        {
            throw new InvalidOperationException(
                $"Collected Date cannot be before the Ready Date ({DisplayDate(entity.FileReadyDate.Value)}).");
        }

        if (collected > Today)
        {
            throw new InvalidOperationException("Collected Date cannot be in the future.");
        }

        (decimal charge, CustomerFileDeliveryRules? rule) = await CustodyChargeAsync(entity, collected);

        decimal covered = await CustodyCoveredAsync(entity.CustomerFileId);

        decimal remaining = Math.Max(0m, charge - covered);

        List<CustomerFileFees> pending = await PendingCustodyAsync(entity.CustomerFileId);

        DateTime now = DateTime.UtcNow;

        // Not paid, pay first : raise / refresh the pending charge
        if (remaining > 0m && !dto.WithoutPayment)
        {
            CustomerFileFees fee;

            if (pending.Count > 0)
            {
                fee = pending[0];

                foreach (CustomerFileFees extra in pending.Skip(1))
                {
                    extra.Status = CustomerFileFeeStatuses.Cancelled;
                    extra.ModifiedBy = userId;
                    extra.ModifiedDate = now;
                }

                fee.Amount = remaining;
                fee.CustodyUpTo = collected;
                fee.CustomerId = entity.CurrentCustomerId;
                fee.ModifiedBy = userId;
                fee.ModifiedDate = now;
            }
            else
            {
                fee =
                    new CustomerFileFees
                    {
                        FeeNo = await NextFeeNoAsync(),
                        CustomerFileId = entity.CustomerFileId,
                        FeeType = CustomerFileFeeTypes.Custody,
                        NameTransferId = null,
                        FeeDate = Today,
                        CustomerId = entity.CurrentCustomerId,
                        Amount = remaining,
                        CustodyUpTo = collected,
                        Status = CustomerFileFeeStatuses.Pending,
                        BranchId = branchId,
                        DueVoucherNo = string.Empty,
                        ReceiptVoucherNo = string.Empty,
                        Remarks = string.Empty,
                        IsDeleted = false,
                        CreatedBy = userId,
                        CreatedDate = now
                    };

                Fees.Add(fee);
            }

            AddHistory(entity.CustomerFileId, "Update", "Custody Charge Raised",
                $"{entity.CustomerFileNo} : custody charge {Money(remaining)} ({rule?.Code}) for collection on {DisplayDate(collected)}, fee {fee.FeeNo}; the file is delivered after it is collected.",
                userId);

            await _context.SaveChangesAsync();

            return new CustomerFileStatusResultDto
            {
                Done = false,
                FeeNo = fee.FeeNo,
                Message = $"Custody charge {Money(remaining)} ({rule?.Code}) must be collected first : fee {fee.FeeNo} is on Fees Collection. Deliver again after it is collected."
            };
        }

        if (remaining > 0m && !await IsWithoutPaymentAllowedAsync())
        {
            throw new InvalidOperationException(
                "Delivery without payment is not allowed (System Configuration : Customer Files : Allow Without Fee Payment is OFF).");
        }

        string feeNo = string.Empty;

        string dueNo = string.Empty;

        await InTransactionAsync(
            async () =>
            {
                // The pending charge is no longer needed : either
                // covered already, or replaced by the due below
                foreach (CustomerFileFees fee in pending)
                {
                    fee.Status = CustomerFileFeeStatuses.Cancelled;
                    fee.ModifiedBy = userId;
                    fee.ModifiedDate = now;
                }

                if (remaining > 0m)
                {
                    CustomerProfiles owner = await FindCustomerAsync(entity.CurrentCustomerId);

                    CustomerFileFees due =
                        new()
                        {
                            FeeNo = await NextFeeNoAsync(),
                            CustomerFileId = entity.CustomerFileId,
                            FeeType = CustomerFileFeeTypes.Custody,
                            NameTransferId = null,
                            FeeDate = collected,
                            CustomerId = owner.CustomerId,
                            Amount = remaining,
                            CustodyUpTo = collected,
                            Status = CustomerFileFeeStatuses.Due,
                            BranchId = branchId,
                            DueVoucherNo = string.Empty,
                            ReceiptVoucherNo = string.Empty,
                            Remarks = "Delivered without payment",
                            IsDeleted = false,
                            CreatedBy = userId,
                            CreatedDate = now
                        };

                    JournalVoucherSavedDto jv =
                        await BookDueAsync(
                            owner,
                            remaining,
                            collected,
                            branchId,
                            $"Custody charge of customer file {entity.CustomerFileNo} (chassis {entity.ChassisNo}), {due.FeeNo}, delivered without payment",
                            $"{entity.CustomerFileNo} {due.FeeNo}",
                            userId);

                    due.DueVoucherId = jv.JournalVoucherId;
                    due.DueVoucherNo = jv.VoucherNo;

                    Fees.Add(due);

                    feeNo = due.FeeNo;
                    dueNo = jv.VoucherNo;
                }

                entity.CollectedDate = collected;
                entity.Status = CustomerFileStatuses.Delivered;
                entity.ModifiedBy = userId;
                entity.ModifiedDate = now;

                AddHistory(entity.CustomerFileId, "Update", "Status : Delivered",
                    $"{entity.CustomerFileNo} : Ready for Delivery -> Delivered, collected on {DisplayDate(collected)}"
                    + (charge > 0m ? $", custody charge {Money(charge)} ({rule?.Code})" : string.Empty)
                    + (feeNo.Length > 0 ? $", {Money(remaining)} without payment : due {feeNo} ({dueNo})" : string.Empty)
                    + ".",
                    userId);

                await _context.SaveChangesAsync();
            });

        return new CustomerFileStatusResultDto
        {
            Done = true,
            FeeNo = feeNo,
            Message =
                feeNo.Length > 0
                    ? $"{entity.CustomerFileNo} delivered; custody charge {Money(remaining)} booked as the customer's due ({feeNo}, {dueNo})."
                    : $"{entity.CustomerFileNo} delivered."
        };
    }



    //===========================================================
    // NAME TRANSFERS
    //===========================================================

    public async Task<NameTransferSavedDto>
        CreateNameTransferAsync
        (
            SaveNameTransferDto dto,
            long branchId,
            long userId
        )
    {
        CustomerFiles file = await FindFileAsync(dto.CustomerFilePublicId);

        DateOnly date = ParseDate(dto.TransferDate, "Transfer Date");

        if (date < file.FileDate)
        {
            throw new InvalidOperationException(
                $"Transfer Date cannot be before the File Date ({DisplayDate(file.FileDate)}).");
        }

        if (date > Today)
        {
            throw new InvalidOperationException("Transfer Date cannot be in the future.");
        }

        CustomerFileNameTransfers? last =
            await Transfers.AsNoTracking()
                .Where(x => x.CustomerFileId == file.CustomerFileId && !x.IsDeleted)
                .OrderByDescending(x => x.NameTransferId)
                .FirstOrDefaultAsync();

        if (last != null && date < last.TransferDate)
        {
            throw new InvalidOperationException(
                $"Transfer Date cannot be before the last transfer ({last.TransferNo}, {DisplayDate(last.TransferDate)}).");
        }

        CustomerFileNameTransferRules? policy = await PolicyOnAsync(date);

        NameTransferQuoteDto quote = Quote(file, policy, date, await PendingTransferNoAsync(file.CustomerFileId));

        if (!quote.Allowed || policy == null)
        {
            throw new InvalidOperationException(quote.Message);
        }

        CustomerProfiles from = await FindCustomerAsync(file.CurrentCustomerId);

        CustomerProfiles to = await FindCustomerAsync(dto.ToCustomerId);

        if (to.CustomerId == from.CustomerId)
        {
            throw new InvalidOperationException(
                $"{to.CustomerName} is already the owner of {file.CustomerFileNo}.");
        }

        // Documents : the required ones must be ticked
        List<CustomerFileDocuments> documents =
            await _context.Set<CustomerFileDocuments>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && x.DocumentFor == CustomerFileDocumentFor.NameTransfer)
                .OrderBy(x => x.DisplayOrder)
                .ToListAsync();

        HashSet<string> ticked =
            (dto.DocumentCodes ?? new List<string>())
                .Select(x => (x ?? string.Empty).Trim())
                .Where(x => x.Length > 0)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

        List<string> unknown =
            ticked.Where(x => documents.All(d => !string.Equals(d.Code, x, StringComparison.OrdinalIgnoreCase))).ToList();

        if (unknown.Count > 0)
        {
            throw new InvalidOperationException($"Unknown document(s) : {string.Join(", ", unknown)}.");
        }

        List<string> missing =
            documents.Where(d => d.IsRequired && !ticked.Contains(d.Code)).Select(d => d.Name).ToList();

        if (missing.Count > 0)
        {
            throw new InvalidOperationException($"Required document(s) not received : {string.Join(", ", missing)}.");
        }

        string codes =
            string.Join(",", documents.Where(d => ticked.Contains(d.Code)).Select(d => d.Code));

        decimal feeAmount = policy.FeePerTransfer;

        bool withoutPayment = dto.WithoutPayment && feeAmount > 0m;

        if (withoutPayment && !await IsWithoutPaymentAllowedAsync())
        {
            throw new InvalidOperationException(
                "Transfer without payment is not allowed (System Configuration : Customer Files : Allow Without Fee Payment is OFF).");
        }

        if (withoutPayment && string.IsNullOrWhiteSpace(to.ReceivableLedgerCode))
        {
            throw new InvalidOperationException(
                $"{to.CustomerName} ({to.CustomerCode}) has no receivable ledger : the fee cannot be booked as a due.");
        }

        // Pay first : the transfer waits for its fee
        bool waits = feeAmount > 0m && !withoutPayment;

        DateTime now = DateTime.UtcNow;

        CustomerFileNameTransfers entity =
            new()
            {
                TransferNo = await NextTransferNoAsync(),
                CustomerFileId = file.CustomerFileId,
                TransferDate = date,
                FromCustomerId = from.CustomerId,
                ToCustomerId = to.CustomerId,
                NameTransferRuleId = policy.NameTransferRuleId,
                FeeAmount = feeAmount,
                DocumentCodes = codes,
                Remarks = Clean(dto.Remarks, "Remarks", RemarksMaxLength),
                Status = waits ? CustomerFileTransferStatuses.FeePending : CustomerFileTransferStatuses.Completed,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        CustomerFileFees? fee = null;

        string dueNo = string.Empty;

        await InTransactionAsync(
            async () =>
            {
                Transfers.Add(entity);

                if (!waits)
                {
                    file.CurrentCustomerId = to.CustomerId;
                    file.TransferCount += 1;
                    file.ModifiedBy = userId;
                    file.ModifiedDate = now;
                }

                await _context.SaveChangesAsync();

                if (feeAmount > 0m)
                {
                    fee =
                        new CustomerFileFees
                        {
                            FeeNo = await NextFeeNoAsync(),
                            CustomerFileId = file.CustomerFileId,
                            FeeType = CustomerFileFeeTypes.NameTransfer,
                            NameTransferId = entity.NameTransferId,
                            FeeDate = date,
                            // The new owner pays
                            CustomerId = to.CustomerId,
                            Amount = feeAmount,
                            CustodyUpTo = null,
                            Status = waits ? CustomerFileFeeStatuses.Pending : CustomerFileFeeStatuses.Due,
                            BranchId = branchId,
                            DueVoucherNo = string.Empty,
                            ReceiptVoucherNo = string.Empty,
                            Remarks = withoutPayment ? "Transferred without payment" : string.Empty,
                            IsDeleted = false,
                            CreatedBy = userId,
                            CreatedDate = now
                        };

                    if (withoutPayment)
                    {
                        JournalVoucherSavedDto jv =
                            await BookDueAsync(
                                to,
                                feeAmount,
                                date,
                                branchId,
                                $"Name transfer fee of customer file {file.CustomerFileNo} (chassis {file.ChassisNo}), {entity.TransferNo} / {fee.FeeNo}, transferred without payment",
                                $"{file.CustomerFileNo} {entity.TransferNo} {fee.FeeNo}",
                                userId);

                        fee.DueVoucherId = jv.JournalVoucherId;
                        fee.DueVoucherNo = jv.VoucherNo;

                        dueNo = jv.VoucherNo;
                    }

                    Fees.Add(fee);
                }

                string feeText =
                    fee == null
                        ? "no fee"
                        : waits
                            ? $"fee {Money(feeAmount)} ({fee.FeeNo}) to collect : the transfer takes effect after it is collected"
                            : $"fee {Money(feeAmount)} without payment : due {fee.FeeNo} ({dueNo})";

                AddHistory(file.CustomerFileId, waits ? "Create" : "Update", waits ? "Name Transfer Waiting for Fee" : "Name Transferred",
                    $"{entity.TransferNo} on {DisplayDate(date)} : {from.CustomerName} ({from.CustomerCode}) -> {to.CustomerName} ({to.CustomerCode}), policy {policy.Code}, {feeText}, documents {(codes.Length == 0 ? "none" : codes)}.",
                    userId);

                await _context.SaveChangesAsync();
            });

        return new NameTransferSavedDto
        {
            PublicId = entity.PublicId,
            TransferNo = entity.TransferNo,
            Status = entity.Status,
            FeeNo = fee?.FeeNo ?? string.Empty,
            FeeAmount = feeAmount,
            DueVoucherNo = dueNo
        };
    }


    public async Task
        CancelNameTransferAsync
        (
            Guid publicId,
            long userId
        )
    {
        CustomerFileNameTransfers entity =
            await Transfers.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The name transfer was not found.");

        await CancelTransferCoreAsync(entity, userId);

        await _context.SaveChangesAsync();
    }


    // The caller saves
    private async Task CancelTransferCoreAsync
    (
        CustomerFileNameTransfers entity,
        long userId
    )
    {
        CustomerFiles file =
            await Files.FirstOrDefaultAsync(x => x.CustomerFileId == entity.CustomerFileId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The customer file was not found.");

        if (file.Status != CustomerFileStatuses.Open)
        {
            throw new InvalidOperationException(
                $"{file.CustomerFileNo} is {StatusLabel(file.Status)} : its transfers can no longer be cancelled.");
        }

        long latestId =
            await Transfers.AsNoTracking()
                .Where(x => x.CustomerFileId == file.CustomerFileId && !x.IsDeleted)
                .MaxAsync(x => x.NameTransferId);

        if (latestId != entity.NameTransferId)
        {
            throw new InvalidOperationException(
                $"Only the latest transfer of {file.CustomerFileNo} can be cancelled.");
        }

        CustomerFileFees? fee =
            await Fees.FirstOrDefaultAsync(
                x => x.NameTransferId == entity.NameTransferId
                     && !x.IsDeleted
                     && x.Status != CustomerFileFeeStatuses.Cancelled);

        DateTime now = DateTime.UtcNow;

        if (entity.Status == CustomerFileTransferStatuses.FeePending)
        {
            // Never took effect : the file is unchanged
            if (fee != null && fee.Status != CustomerFileFeeStatuses.Pending)
            {
                throw new InvalidOperationException(
                    $"The fee {fee.FeeNo} of {entity.TransferNo} is {fee.Status}.");
            }

            if (fee != null)
            {
                fee.Status = CustomerFileFeeStatuses.Cancelled;
                fee.ModifiedBy = userId;
                fee.ModifiedDate = now;
            }

            entity.IsDeleted = true;
            entity.DeletedBy = userId;
            entity.DeletedDate = now;

            AddHistory(file.CustomerFileId, "Delete", "Name Transfer Cancelled",
                $"{entity.TransferNo} of {DisplayDate(entity.TransferDate)} cancelled before its fee was collected" + (fee != null ? $" (fee {fee.FeeNo} cancelled)" : string.Empty) + ".",
                userId);

            return;
        }

        if (fee != null)
        {
            throw new InvalidOperationException(
                $"The fee {fee.FeeNo} of {entity.TransferNo} is {(fee.Status == CustomerFileFeeStatuses.Paid ? $"collected ({fee.ReceiptVoucherNo})" : $"booked as a due ({fee.DueVoucherNo})")} : the transfer can no longer be cancelled.");
        }

        if (file.CurrentCustomerId != entity.ToCustomerId)
        {
            throw new InvalidOperationException(
                $"The owner of {file.CustomerFileNo} has changed since {entity.TransferNo}.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = now;

        file.CurrentCustomerId = entity.FromCustomerId;
        file.TransferCount = Math.Max(0, file.TransferCount - 1);
        file.ModifiedBy = userId;
        file.ModifiedDate = now;

        string fromName =
            await _context.Set<CustomerProfiles>().AsNoTracking()
                .Where(x => x.CustomerId == entity.FromCustomerId)
                .Select(x => x.CustomerName + " (" + x.CustomerCode + ")")
                .FirstOrDefaultAsync()
            ?? $"customer #{entity.FromCustomerId}";

        AddHistory(file.CustomerFileId, "Delete", "Name Transfer Cancelled",
            $"{entity.TransferNo} of {DisplayDate(entity.TransferDate)} cancelled : the owner is back to {fromName}.",
            userId);
    }



    //===========================================================
    // FEES COLLECTION
    //===========================================================

    public async Task<CollectCustomerFileFeesResultDto>
        CollectFeesAsync
        (
            CollectCustomerFileFeesDto dto,
            long branchId,
            long userId
        )
    {
        List<Guid> ids =
            (dto.FeePublicIds ?? new List<Guid>()).Distinct().ToList();

        if (ids.Count == 0)
        {
            throw new InvalidOperationException("Choose the fee(s) to collect.");
        }

        List<CustomerFileFees> fees =
            await Fees
                .Where(x => ids.Contains(x.PublicId) && !x.IsDeleted)
                .OrderBy(x => x.CustomerFileFeeId)
                .ToListAsync();

        if (fees.Count != ids.Count)
        {
            throw new KeyNotFoundException("A fee was not found (refresh the page).");
        }

        CustomerFileFees? closed =
            fees.FirstOrDefault(x => x.Status != CustomerFileFeeStatuses.Pending && x.Status != CustomerFileFeeStatuses.Due);

        if (closed != null)
        {
            throw new InvalidOperationException($"Fee {closed.FeeNo} is {closed.Status}.");
        }

        bool due = fees[0].Status == CustomerFileFeeStatuses.Due;

        if (fees.Any(x => (x.Status == CustomerFileFeeStatuses.Due) != due))
        {
            throw new InvalidOperationException(
                "Collect pending fees and dues separately (a due is credited to the customer's ledger).");
        }

        if (due && fees.Select(x => x.CustomerId).Distinct().Count() > 1)
        {
            throw new InvalidOperationException("Dues of different customers are collected separately.");
        }

        decimal total = fees.Sum(x => x.Amount);

        List<ReceiptVoucherDebitDto> debits =
            dto.Debits ?? new List<ReceiptVoucherDebitDto>();

        if (debits.Count == 0)
        {
            throw new InvalidOperationException("Add the payment (Payment Desk).");
        }

        decimal paid = Math.Round(debits.Sum(x => x.Amount), 2);

        if (paid != Math.Round(total, 2))
        {
            throw new InvalidOperationException(
                $"The payment ({Money(paid)}) must equal the fee total ({Money(total)}).");
        }

        DateOnly date =
            string.IsNullOrWhiteSpace(dto.Date) ? Today : ParseDate(dto.Date, "Receipt Date");

        if (date > Today)
        {
            throw new InvalidOperationException("Receipt Date cannot be in the future.");
        }

        CustomerProfiles payer = await FindCustomerAsync(fees[0].CustomerId);

        List<long> fileIds =
            fees.Select(x => x.CustomerFileId).Distinct().ToList();

        Dictionary<long, CustomerFiles> files =
            await Files
                .Where(x => fileIds.Contains(x.CustomerFileId))
                .ToDictionaryAsync(x => x.CustomerFileId);

        string nos = string.Join(", ", fees.Select(x => x.FeeNo));

        string fileNos =
            string.Join(", ", fees.Select(x => files.TryGetValue(x.CustomerFileId, out CustomerFiles? f) ? f.CustomerFileNo : string.Empty).Where(x => x.Length > 0).Distinct());

        ReceiptVoucherCreditDto credit;

        if (due)
        {
            if (string.IsNullOrWhiteSpace(payer.ReceivableLedgerCode))
            {
                throw new InvalidOperationException(
                    $"{payer.CustomerName} ({payer.CustomerCode}) has no receivable ledger.");
            }

            credit =
                new ReceiptVoucherCreditDto
                {
                    LedgerType = LedgerTypeCustomer,
                    LedgerCode = payer.ReceivableLedgerCode.Trim(),
                    Amount = total,
                    ShortNotes = Limit($"Customer file dues {nos}", 250)
                };
        }
        else
        {
            credit =
                new ReceiptVoucherCreditDto
                {
                    LedgerType = LedgerTypeGeneral,
                    LedgerCode = IncomeLedgerCode,
                    Amount = total,
                    ShortNotes = Limit($"Customer file fees {nos}", 250)
                };
        }

        string narration =
            string.IsNullOrWhiteSpace(dto.Narration)
                ? $"Customer file {(due ? "dues" : "fees")} {nos} ({fileNos}) from {payer.CustomerName} ({payer.CustomerCode})"
                : dto.Narration.Trim();

        CollectCustomerFileFeesResultDto result = new() { Amount = total };

        await InTransactionAsync(
            async () =>
            {
                ReceiptVoucherSavedDto receipt =
                    await _receiptVouchers.CreatePostedAsync(
                        new CreateReceiptVoucherDto
                        {
                            VoucherDate = DateText(date),
                            BranchId = branchId,
                            Narration = Limit(narration, 500),
                            Debits = debits,
                            Credits = new List<ReceiptVoucherCreditDto> { credit }
                        },
                        Limit($"{fileNos} {nos}", 100),
                        userId);

                result.ReceiptVoucherPublicId = receipt.PublicId;
                result.ReceiptVoucherNo = receipt.VoucherNo;

                DateTime now = DateTime.UtcNow;

                foreach (CustomerFileFees fee in fees)
                {
                    bool wasPending = fee.Status == CustomerFileFeeStatuses.Pending;

                    fee.Status = CustomerFileFeeStatuses.Paid;
                    fee.ReceiptVoucherId = receipt.ReceiptVoucherId;
                    fee.ReceiptVoucherNo = receipt.VoucherNo;
                    fee.PaidDate = date;
                    fee.ModifiedBy = userId;
                    fee.ModifiedDate = now;

                    CustomerFiles? file = files.GetValueOrDefault(fee.CustomerFileId);

                    // A transfer waiting for this fee takes effect now
                    if (wasPending && fee.FeeType == CustomerFileFeeTypes.NameTransfer && fee.NameTransferId.HasValue && file != null)
                    {
                        CustomerFileNameTransfers transfer =
                            await Transfers.FirstOrDefaultAsync(x => x.NameTransferId == fee.NameTransferId.Value && !x.IsDeleted)
                            ?? throw new InvalidOperationException($"The transfer of fee {fee.FeeNo} was cancelled.");

                        if (transfer.Status != CustomerFileTransferStatuses.FeePending)
                        {
                            throw new InvalidOperationException($"Transfer {transfer.TransferNo} is already {transfer.Status}.");
                        }

                        if (file.Status != CustomerFileStatuses.Open)
                        {
                            throw new InvalidOperationException(
                                $"{file.CustomerFileNo} is {StatusLabel(file.Status)} : transfer {transfer.TransferNo} can no longer take effect. Cancel the fee instead.");
                        }

                        if (file.CurrentCustomerId != transfer.FromCustomerId)
                        {
                            throw new InvalidOperationException(
                                $"The owner of {file.CustomerFileNo} has changed since {transfer.TransferNo} : cancel the fee instead.");
                        }

                        transfer.Status = CustomerFileTransferStatuses.Completed;
                        transfer.ModifiedBy = userId;
                        transfer.ModifiedDate = now;

                        file.CurrentCustomerId = transfer.ToCustomerId;
                        file.TransferCount += 1;
                        file.ModifiedBy = userId;
                        file.ModifiedDate = now;

                        result.CompletedTransfers.Add(transfer.TransferNo);

                        AddHistory(file.CustomerFileId, "Update", "Name Transferred",
                            $"{transfer.TransferNo} took effect : fee {fee.FeeNo} {Money(fee.Amount)} collected by {receipt.VoucherNo}; the file now belongs to {payer.CustomerName} ({payer.CustomerCode}).",
                            userId);
                    }
                    else
                    {
                        AddHistory(fee.CustomerFileId, "Update", $"{FeeTypeLabel(fee.FeeType)} Collected",
                            $"{fee.FeeNo} {Money(fee.Amount)} {(wasPending ? "collected" : "due collected")} by {receipt.VoucherNo} on {DisplayDate(date)}.",
                            userId);
                    }
                }

                await _context.SaveChangesAsync();
            });

        return result;
    }


    public async Task
        CancelFeeAsync
        (
            Guid publicId,
            long userId
        )
    {
        CustomerFileFees fee =
            await Fees.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The fee was not found.");

        if (fee.Status != CustomerFileFeeStatuses.Pending)
        {
            throw new InvalidOperationException(
                $"Fee {fee.FeeNo} is {fee.Status} : only a pending fee can be cancelled.");
        }

        if (fee.FeeType == CustomerFileFeeTypes.NameTransfer && fee.NameTransferId.HasValue)
        {
            CustomerFileNameTransfers transfer =
                await Transfers.FirstOrDefaultAsync(x => x.NameTransferId == fee.NameTransferId.Value && !x.IsDeleted)
                ?? throw new InvalidOperationException($"The transfer of fee {fee.FeeNo} was not found.");

            // Cancels the waiting transfer and its fee
            await CancelTransferCoreAsync(transfer, userId);
        }
        else
        {
            fee.Status = CustomerFileFeeStatuses.Cancelled;
            fee.ModifiedBy = userId;
            fee.ModifiedDate = DateTime.UtcNow;

            AddHistory(fee.CustomerFileId, "Delete", "Custody Charge Cancelled",
                $"{fee.FeeNo} {Money(fee.Amount)} cancelled before collection.",
                userId);
        }

        await _context.SaveChangesAsync();
    }
}
