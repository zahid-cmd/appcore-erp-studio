//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using Microsoft.EntityFrameworkCore;
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
// Codes : CF-OPEN-nnnn / NTF-nnnnnn, deleted rows count.
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


    private readonly AppDbContext _context;


    public CustomerFilesRepository(
        AppDbContext context)
    {
        _context = context;
    }


    private DbSet<CustomerFiles> Files =>
        _context.Set<CustomerFiles>();

    private DbSet<CustomerFileNameTransfers> Transfers =>
        _context.Set<CustomerFileNameTransfers>();


    private static DateOnly Today =>
        DateOnly.FromDateTime(DateTime.Now);



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


    private static NameTransferQuoteDto Quote
    (
        CustomerFiles file,
        CustomerFileNameTransferRules? policy,
        DateOnly date
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
            $"Transfer {file.TransferCount + 1} of {policy.TransfersAllowed} ({policy.Code}), fee {Money(policy.FeePerTransfer)}.";

        return quote;
    }



    //===========================================================
    // Read
    //===========================================================

    public async Task<CustomerFilesPageDto>
        GetAllAsync()
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

        HashSet<long> customerIds =
            files.SelectMany(x => new[] { x.OriginalCustomerId, x.CurrentCustomerId })
                .Concat(transfers.SelectMany(x => new[] { x.FromCustomerId, x.ToCustomerId }))
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
            files.Select(x => x.BranchId).ToHashSet();

        Dictionary<long, string> branches =
            await _context.Set<Branches>().AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName);

        Dictionary<long, CustomerFiles> fileById =
            files.ToDictionary(x => x.CustomerFileId);

        // Latest transfer of each file
        HashSet<long> latestIds =
            transfers.GroupBy(x => x.CustomerFileId)
                .Select(g => g.OrderByDescending(x => x.NameTransferId).First().NameTransferId)
                .ToHashSet();

        string NameOf(long id) =>
            customers.TryGetValue(id, out CustomerProfiles? c)
                ? $"{c.CustomerName} ({c.CustomerCode})"
                : $"#{id}";

        return new CustomerFilesPageDto
        {
            Today = DateText(Today),

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
                            Remarks = x.Remarks
                        };
                    }).ToList(),

            Transfers =
                transfers
                    .Where(x => fileById.ContainsKey(x.CustomerFileId))
                    .Select(
                        x => new CustomerFileTransferDto
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
                            IsLatest = latestIds.Contains(x.NameTransferId)
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

        return Quote(file, await PolicyOnAsync(on), on);
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
    // STATUS
    //===========================================================

    public async Task
        SetStatusAsync
        (
            Guid publicId,
            SetCustomerFileStatusDto dto,
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

        string detail;

        switch (to)
        {
            case CustomerFileStatuses.ReadyForDelivery when from == CustomerFileStatuses.Open:
            {
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

            case CustomerFileStatuses.Delivered when from == CustomerFileStatuses.ReadyForDelivery:
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

                entity.CollectedDate = collected;

                detail = $"collected on {DisplayDate(collected)}";

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

                if (entity.TransferCount > 0)
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
    }



    //===========================================================
    // NAME TRANSFERS
    //===========================================================

    public async Task<Guid>
        CreateNameTransferAsync
        (
            SaveNameTransferDto dto,
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

        NameTransferQuoteDto quote = Quote(file, policy, date);

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

        CustomerFileNameTransfers entity =
            new()
            {
                TransferNo = await NextTransferNoAsync(),
                CustomerFileId = file.CustomerFileId,
                TransferDate = date,
                FromCustomerId = from.CustomerId,
                ToCustomerId = to.CustomerId,
                NameTransferRuleId = policy.NameTransferRuleId,
                FeeAmount = policy.FeePerTransfer,
                DocumentCodes = codes,
                Remarks = Clean(dto.Remarks, "Remarks", RemarksMaxLength),
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Transfers.Add(entity);

        file.CurrentCustomerId = to.CustomerId;
        file.TransferCount += 1;
        file.ModifiedBy = userId;
        file.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(file.CustomerFileId, "Update", "Name Transferred",
            $"{entity.TransferNo} on {DisplayDate(date)} : {from.CustomerName} ({from.CustomerCode}) -> {to.CustomerName} ({to.CustomerCode}), transfer {file.TransferCount} of {policy.TransfersAllowed} ({policy.Code}), fee {Money(entity.FeeAmount)}, documents {(codes.Length == 0 ? "none" : codes)}.",
            userId);

        await _context.SaveChangesAsync();

        return entity.PublicId;
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

        if (file.CurrentCustomerId != entity.ToCustomerId)
        {
            throw new InvalidOperationException(
                $"The owner of {file.CustomerFileNo} has changed since {entity.TransferNo}.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        file.CurrentCustomerId = entity.FromCustomerId;
        file.TransferCount = Math.Max(0, file.TransferCount - 1);
        file.ModifiedBy = userId;
        file.ModifiedDate = DateTime.UtcNow;

        string fromName =
            await _context.Set<CustomerProfiles>().AsNoTracking()
                .Where(x => x.CustomerId == entity.FromCustomerId)
                .Select(x => x.CustomerName + " (" + x.CustomerCode + ")")
                .FirstOrDefaultAsync()
            ?? $"customer #{entity.FromCustomerId}";

        AddHistory(file.CustomerFileId, "Delete", "Name Transfer Cancelled",
            $"{entity.TransferNo} of {DisplayDate(entity.TransferDate)} cancelled : the owner is back to {fromName}, fee {Money(entity.FeeAmount)}.",
            userId);

        await _context.SaveChangesAsync();
    }
}
