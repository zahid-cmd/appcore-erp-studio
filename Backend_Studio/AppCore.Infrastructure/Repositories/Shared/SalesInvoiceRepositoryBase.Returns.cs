//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using System.Text.Json;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.Platform.Accounting;
using AppCore.Application.SalesOperations.Shared;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.SalesOperations.Shared;
using AppCore.Domain.Platform.Accounting;
using AppCore.Infrastructure.Persistence;

using PostingLedgerCodes =
    AppCore.Infrastructure.Platform.Accounting.PostingLedgerCodes;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;

using MotorBikeUnitsEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.MotorBikeUnits;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using StockMovementsEntity =
    AppCore.Domain.Platform.Inventory.StockMovements;

using StockAllocationsEntity =
    AppCore.Domain.Platform.Inventory.StockAllocations;

using VatRegisterEntity =
    AppCore.Domain.Platform.Inventory.VatRegister;

using RegistrationOnInvoice =
    AppCore.Infrastructure.Platform.Sales.RegistrationOnInvoice;

using RegistrationProfilesEntity =
    AppCore.Domain.Entities.RegistrationManagement.RegistrationProcessing.RegistrationProfiles;

using CustomerFilesEntity =
    AppCore.Domain.Entities.RegistrationManagement.CustomerFile.CustomerFiles;

using CustomerFileFeesEntity =
    AppCore.Domain.Entities.RegistrationManagement.CustomerFile.CustomerFileFees;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SalesOperations.Shared;


//===============================================================
// Sales Returns - MB / SP / AC (2026-11-11; SalesReturns_Engine.sql)
//
// One return = ONE posted invoice of the page (owner) : the page
// finds the invoice, then returns quantities of its lines. Each
// return line takes the invoice line's own figures pro-rata of
// the quantity (cumulative : the last unit returned takes what is
// left, so the returns of a line add up to the line exactly).
//
// Switches (per page; MB 0061.., SP 0065.., AC 0069..) :
//   +0 Post on Approval : ON = Draft -> Approved -> Posted;
//                         OFF = saving posts at once
//   +1 Return Window    : days after the invoice date (OFF = any
//                         time); checked on save and approve
//   +2 Allow Cash Refund: not used here (always to the ledger)
//   +3 Restock          : not used yet (always back to stock)
//
// Post (journal under the return number SRMB / SRSP / SRAC, dated
// the posting day) :
//   Cr customer receivable   goods (net) + registration refund
//   Cr campaign / membership / special / fractional discounts
//   Dr Sales (per product's sales ledger)
//   Dr VAT Current Account   base VAT
//   Dr VAT Payable - MB      (MB)
//   Dr Price Increase Income / Cr Price Reduction Expense (MB :
//      VAT Reimbursement - MB) : the line's VAT difference
//   Dr Registration Fees Collection / Commission (MB refund)
//   Dr Inventory / Cr COGS   the units back to the SAME batches
//      at the cost they went out (movement SaleReturn); a part
//      sold without stock comes back at its cost, no movement
//   VAT register : reversal rows (the return is the Credit Note,
//      Mushak 6.7)
//   MB : the chassis is back in stock; its Registration Profile
//      (refused once sent to BRTA), Customer File (refused once
//      it moved on or has fees) and delivery are cancelled.
// A Price Adjustment released by the sale is not taken back (the
// unit returns at its batch's current MRP).
// A posted return is final (no cancel).
//===============================================================

public abstract partial class SalesInvoiceRepositoryBase<THeader, TLine, TPayment>
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ReturnModule =
        "Sales Operations";

    private const string ReturnEntityPrefix =
        "SalesReturn";

    private const string MoveSaleReturn =
        "SaleReturn";

    private const int ReturnSearchLimit =
        50;

    private string ReturnPrefix =>
        "SR" + Page.PageType;

    // MB 0061.., SP 0065.., AC 0069..
    private int ReturnSwitchBase =>
        Page.PageType switch
        {
            "SP" => 65,
            "AC" => 69,
            _ => 61
        };

    private string ReturnSwitch(int offset) =>
        $"CFG-MOD-008-{ReturnSwitchBase + offset:0000}";


    //===========================================================
    // Small helpers
    //===========================================================

    public sealed class ReturnRestock
    {
        // Allocation id (0 = the part sold without stock)
        public long a { get; set; }

        public long b { get; set; }

        public decimal q { get; set; }

        public decimal v { get; set; }
    }

    private static List<ReturnRestock> ReadRestocked(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new List<ReturnRestock>();
        }

        try
        {
            return JsonSerializer.Deserialize<List<ReturnRestock>>(json) ?? new List<ReturnRestock>();
        }
        catch (JsonException)
        {
            return new List<ReturnRestock>();
        }
    }

    // The share of a line total for qty units, given before units
    // were returned already (cumulative rounding : all the returns
    // of a line add up to the line total exactly)
    private static decimal ShareOf
    (
        decimal total,
        decimal sold,
        decimal before,
        decimal qty
    )
    {
        if (sold <= 0m || qty <= 0m)
        {
            return 0m;
        }

        decimal upTo = Math.Min(before + qty, sold);

        return Money(total * upTo / sold) - Money(total * Math.Min(before, sold) / sold);
    }

    private async Task<(bool PostOnApproval, int? WindowDays)> ReturnSwitchesAsync()
    {
        string postCode = ReturnSwitch(0);

        string windowCode = ReturnSwitch(1);

        var rows =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => (x.ConfigurationCode == postCode || x.ConfigurationCode == windowCode) && !x.IsDeleted)
                .Select(x => new { x.ConfigurationCode, x.IsEnabled, x.Value })
                .ToListAsync();

        var post = rows.FirstOrDefault(x => x.ConfigurationCode == postCode);

        var window = rows.FirstOrDefault(x => x.ConfigurationCode == windowCode);

        int? days;

        if (window == null)
        {
            days = 7;
        }
        else if (!window.IsEnabled)
        {
            days = null;
        }
        else
        {
            days =
                int.TryParse((window.Value ?? string.Empty).Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out int value) && value >= 1
                    ? Math.Min(value, 3650)
                    : 7;
        }

        return (post?.IsEnabled ?? false, days);
    }

    private void AddReturnHistory
    (
        SalesReturns row,
        string activityType,
        string title,
        string description,
        long userId,
        DateTime now
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = ReturnModule,
                EntityName = $"{ReturnEntityPrefix}{row.ProductType}",
                EntityId = row.SalesReturnId,
                ActivityType = activityType,
                ActivityTitle = title,
                ActivityDescription = Limit(description, 1000),
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = now
            });
    }

    private void AddInvoiceNote
    (
        THeader invoice,
        string activityType,
        string title,
        string description,
        long userId,
        DateTime now
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = ModuleName,
                EntityName = $"{EntityPrefix}{invoice.PageType}",
                EntityId = invoice.SalesInvoiceId,
                ActivityType = activityType,
                ActivityTitle = title,
                ActivityDescription = Limit(description, 1000),
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = now
            });
    }

    // Quantities on draft / approved returns of the invoice (other
    // than exceptReturnId), per invoice line
    private async Task<Dictionary<long, decimal>> PendingReturnsAsync
    (
        long invoiceId,
        long exceptReturnId
    )
    {
        string type = Page.PageType;

        return await (
                from line in _context.Set<SalesReturnLines>().AsNoTracking()
                join head in _context.Set<SalesReturns>().AsNoTracking()
                    on line.SalesReturnId equals head.SalesReturnId
                where head.ProductType == type
                      && head.SalesInvoiceId == invoiceId
                      && !head.IsDeleted
                      && (head.Status == StatusDraft || head.Status == StatusApproved)
                      && head.SalesReturnId != exceptReturnId
                group line by line.SalesInvoiceLineId
                into g
                select new { Id = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.Id, x => x.Qty);
    }

    private static int AgeOf(DateOnly invoiceDate) =>
        Math.Max(BusinessToday().DayNumber - invoiceDate.DayNumber, 0);

    private static string WindowIssue(THeader invoice, int? windowDays)
    {
        if (!windowDays.HasValue)
        {
            return string.Empty;
        }

        int age = AgeOf(invoice.InvoiceDate);

        return age > windowDays.Value
            ? $"Sales invoice {invoice.InvoiceNo} is {age} days old : goods can be returned only within {windowDays.Value} days of the invoice (System Configuration › Return Window)."
            : string.Empty;
    }

    private static decimal DiscountOf(TLine line) =>
        line.CampaignMembershipAmount + line.SpecialAmount + line.FractionalShare;

    // MB : the registration fee refunded with one chassis (the
    // invoice's registration still active and the chassis
    // registered on it)
    private static (decimal Refund, decimal Commission) RegistrationShareOf(THeader invoice, TLine line)
    {
        if (invoice is not IMotorBikeSaleHeader header
            || line is not IMotorBikeSaleLine bike
            || header.RegistrationStatus != RegistrationOnInvoice.StatusActive
            || !bike.IsRegistered
            || header.RegistrationCount <= 0
            || header.RegistrationTotal <= 0m)
        {
            return (0m, 0m);
        }

        decimal refund =
            Money(header.RegistrationTotal / header.RegistrationCount);

        decimal commission =
            Money(Math.Min(header.RegistrationCommission, header.RegistrationTotal) / header.RegistrationCount);

        return (refund, Math.Min(commission, refund));
    }

    // MB : why a chassis of the invoice cannot be returned
    private async Task<Dictionary<long, string>> BikeBlocksAsync
    (
        THeader invoice,
        List<TLine> lines
    )
    {
        Dictionary<long, string> blocked = new();

        if (Page.PageType != "MB")
        {
            return blocked;
        }

        List<IMotorBikeSaleLine> bikes =
            lines.OfType<IMotorBikeSaleLine>().Where(x => (x.MotorBikeUnitId ?? 0) > 0).ToList();

        if (bikes.Count == 0)
        {
            return blocked;
        }

        List<long> unitIds = bikes.Select(x => x.MotorBikeUnitId!.Value).ToList();

        var units =
            await _context.Set<MotorBikeUnitsEntity>()
                .AsNoTracking()
                .Where(x => unitIds.Contains(x.MotorBikeUnitId) && !x.IsDeleted)
                .Select(x => new { x.MotorBikeUnitId, x.Status })
                .ToListAsync();

        var profiles =
            await _context.Set<RegistrationProfilesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted
                            && x.SalesInvoiceId == invoice.SalesInvoiceId
                            && x.Status != "Cancelled"
                            && x.Status != "Pending"
                            && x.Status != "Processing")
                .Select(x => new { x.MotorBikeUnitId, x.ProfileNo, x.Status })
                .ToListAsync();

        var files =
            await _context.Set<CustomerFilesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted
                            && x.SalesInvoiceId == invoice.SalesInvoiceId
                            && x.Status != "Cancelled")
                .Select(x => new { x.CustomerFileId, x.CustomerFileNo, x.ChassisNo, x.Status, x.TransferCount })
                .ToListAsync();

        List<long> fileIds = files.Select(x => x.CustomerFileId).ToList();

        HashSet<long> withFees =
            (await _context.Set<CustomerFileFeesEntity>()
                .AsNoTracking()
                .Where(x => fileIds.Contains(x.CustomerFileId) && !x.IsDeleted && x.Status != "Cancelled")
                .Select(x => x.CustomerFileId)
                .ToListAsync())
            .ToHashSet();

        foreach (TLine line in lines)
        {
            if (line is not IMotorBikeSaleLine bike || (bike.MotorBikeUnitId ?? 0) <= 0)
            {
                continue;
            }

            var unit = units.FirstOrDefault(x => x.MotorBikeUnitId == bike.MotorBikeUnitId);

            var profile = profiles.FirstOrDefault(x => x.MotorBikeUnitId == bike.MotorBikeUnitId);

            var file =
                files.FirstOrDefault(x => string.Equals(x.ChassisNo, bike.ChassisNo, StringComparison.OrdinalIgnoreCase));

            string reason =
                profile != null
                    ? $"Registration Profile {profile.ProfileNo} was sent to BRTA ({profile.Status})."
                    : file != null && file.TransferCount > 0
                        ? $"Customer File {file.CustomerFileNo} was name-transferred."
                        : file != null && file.Status != "Open"
                            ? $"Customer File {file.CustomerFileNo} is {file.Status}."
                            : file != null && withFees.Contains(file.CustomerFileId)
                                ? $"Customer File {file.CustomerFileNo} has fees : cancel them on Customer Files first."
                                : unit != null && unit.Status != UnitSold && line.ReturnedQuantity < line.Quantity
                                    ? $"Chassis {bike.ChassisNo} is {unit.Status}, not Sold."
                                    : string.Empty;

            if (reason.Length > 0)
            {
                blocked[line.SalesInvoiceLineId] = reason;
            }
        }

        return blocked;
    }

    private async Task<THeader> InvoiceByPublicIdAsync(Guid publicId)
    {
        THeader? invoice =
            await _context.Set<THeader>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted);

        if (invoice == null || invoice.PageType != Page.PageType)
        {
            throw new KeyNotFoundException("Sales invoice not found (search it again).");
        }

        return invoice;
    }

    private async Task<SalesReturns> ReturnRowAsync(Guid publicId, bool forUpdate)
    {
        string type = Page.PageType;

        SalesReturns? row =
            await _context.Set<SalesReturns>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted && x.ProductType == type);

        if (row == null)
        {
            throw new KeyNotFoundException("Sales return not found (refresh the page).");
        }

        if (!forUpdate)
        {
            return row;
        }

        await _context.Database.ExecuteSqlRawAsync(
            "SELECT 1 FROM \"SalesReturns\" WHERE \"SalesReturnId\" = {0} FOR UPDATE",
            row.SalesReturnId);

        return await _context.Set<SalesReturns>().FirstAsync(x => x.SalesReturnId == row.SalesReturnId);
    }

    private static void RequireReturnStatus(SalesReturns row, string action, params string[] statuses)
    {
        if (!statuses.Contains(row.Status))
        {
            throw new InvalidOperationException(
                $"Sales return {row.ReturnNo} is {row.Status}; only a {string.Join(" or ", statuses)} return can be {action}.");
        }
    }

    private static string ItemsTextOf(IEnumerable<SalesReturnLines> lines)
    {
        List<SalesReturnLines> list = lines.OrderBy(x => x.LineNo).ToList();

        string text =
            string.Join(
                ", ",
                list.Take(2).Select(x => x.ChassisNo.Length > 0 ? $"{x.ProductName} ({x.ChassisNo})" : $"{x.ProductName} x {Qty(x.Quantity)}"));

        return list.Count > 2 ? $"{text} (+{list.Count - 2} more)" : text;
    }


    //===========================================================
    // Switches + the login branch (page header)
    //===========================================================

    public async Task<SalesReturnSwitchesDto> GetReturnSwitchesAsync(long? branchId)
    {
        (bool post, int? days) = await ReturnSwitchesAsync();

        string branch =
            branchId.HasValue && branchId.Value > 0
                ? await _context.Set<BranchesEntity>()
                      .AsNoTracking()
                      .Where(x => x.BranchId == branchId.Value)
                      .Select(x => x.BranchName)
                      .FirstOrDefaultAsync() ?? string.Empty
                : string.Empty;

        return new SalesReturnSwitchesDto
        {
            PostOnApproval = post,
            ReturnWindowDays = days,
            PostOnApprovalCode = ReturnSwitch(0),
            ReturnWindowCode = ReturnSwitch(1),
            BranchId = branchId ?? 0,
            BranchName = branch,
            Today = DateText(BusinessToday())
        };
    }


    //===========================================================
    // Find the invoice : posted invoices of the page (the login
    // branch) with something left to return. Search : invoice no,
    // customer name / code / phone, MB chassis / engine no.
    //===========================================================

    public async Task<List<SalesReturnInvoiceItemDto>> FindReturnInvoicesAsync(string? search, long? branchId)
    {
        RequireWiredPage();

        string text = OneLine(search, 60).ToLowerInvariant();

        IQueryable<THeader> query =
            _context.Set<THeader>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.PageType == Page.PageType && x.Status == StatusPosted);

        if (branchId.HasValue && branchId.Value > 0)
        {
            long branch = branchId.Value;

            query = query.Where(x => x.BranchId == branch);
        }

        if (text.Length > 0)
        {
            List<long> byChassis = new();

            if (Page.PageType == "MB" && text.Length >= 3)
            {
                byChassis =
                    await _context.Set<TLine>()
                        .AsNoTracking()
                        .Where(x => EF.Property<string>(x, "ChassisNo").ToLower().Contains(text)
                                    || EF.Property<string>(x, "EngineNo").ToLower().Contains(text))
                        .Select(x => x.SalesInvoiceId)
                        .Distinct()
                        .Take(ReturnSearchLimit)
                        .ToListAsync();
            }

            query =
                query.Where(x => x.InvoiceNo.ToLower().Contains(text)
                                 || x.CustomerName.ToLower().Contains(text)
                                 || x.CustomerCode.ToLower().Contains(text)
                                 || x.CustomerPhone.Contains(text)
                                 || byChassis.Contains(x.SalesInvoiceId));
        }

        List<THeader> invoices =
            await query
                .OrderByDescending(x => x.InvoiceDate)
                .ThenByDescending(x => x.SalesInvoiceId)
                .Take(ReturnSearchLimit)
                .ToListAsync();

        List<long> ids = invoices.Select(x => x.SalesInvoiceId).ToList();

        List<TLine> lines =
            await _context.Set<TLine>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.SalesInvoiceId))
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        string type = Page.PageType;

        var pending =
            await (
                    from line in _context.Set<SalesReturnLines>().AsNoTracking()
                    join head in _context.Set<SalesReturns>().AsNoTracking()
                        on line.SalesReturnId equals head.SalesReturnId
                    where head.ProductType == type
                          && ids.Contains(head.SalesInvoiceId)
                          && !head.IsDeleted
                          && (head.Status == StatusDraft || head.Status == StatusApproved)
                    group line by head.SalesInvoiceId
                    into g
                    select new { Id = g.Key, Qty = g.Sum(x => x.Quantity) })
                .ToDictionaryAsync(x => x.Id, x => x.Qty);

        int? days = (await ReturnSwitchesAsync()).WindowDays;

        List<SalesReturnInvoiceItemDto> result = new();

        foreach (THeader invoice in invoices)
        {
            List<TLine> mine = lines.Where(x => x.SalesInvoiceId == invoice.SalesInvoiceId).ToList();

            decimal sold = mine.Sum(x => x.Quantity);

            decimal returned = mine.Sum(x => x.ReturnedQuantity);

            decimal returnable = Math.Max(sold - returned - pending.GetValueOrDefault(invoice.SalesInvoiceId), 0m);

            if (returnable <= 0m)
            {
                continue;
            }

            string items =
                string.Join(
                    ", ",
                    mine.Take(2).Select(x => x is IMotorBikeSaleLine b && b.ChassisNo.Length > 0 ? $"{x.ProductName} ({b.ChassisNo})" : $"{x.ProductName} x {Qty(x.Quantity)}"));

            if (mine.Count > 2)
            {
                items += $" (+{mine.Count - 2} more)";
            }

            int age = AgeOf(invoice.InvoiceDate);

            result.Add(
                new SalesReturnInvoiceItemDto
                {
                    SalesInvoiceId = invoice.SalesInvoiceId,
                    PublicId = invoice.PublicId,
                    InvoiceNo = invoice.InvoiceNo,
                    InvoiceDate = DateText(invoice.InvoiceDate),
                    CustomerCode = invoice.CustomerCode,
                    CustomerName = invoice.CustomerName,
                    CustomerPhone = invoice.CustomerPhone,
                    ItemsText = items,
                    InvoiceTotal = invoice.InvoiceTotal,
                    SoldQuantity = sold,
                    ReturnedQuantity = returned,
                    ReturnableQuantity = returnable,
                    AgeDays = age,
                    OutsideWindow = days.HasValue && age > days.Value
                });
        }

        return result;
    }


    //===========================================================
    // One invoice with what can still be returned
    //===========================================================

    public async Task<SalesReturnInvoiceDto> GetReturnInvoiceAsync(Guid invoicePublicId, Guid? exceptReturnPublicId)
    {
        RequireWiredPage();

        THeader invoice = await InvoiceByPublicIdAsync(invoicePublicId);

        long except = 0;

        if (exceptReturnPublicId.HasValue && exceptReturnPublicId.Value != Guid.Empty)
        {
            except =
                await _context.Set<SalesReturns>()
                    .AsNoTracking()
                    .Where(x => x.PublicId == exceptReturnPublicId.Value)
                    .Select(x => x.SalesReturnId)
                    .FirstOrDefaultAsync();
        }

        List<TLine> lines =
            await _context.Set<TLine>()
                .AsNoTracking()
                .Where(x => x.SalesInvoiceId == invoice.SalesInvoiceId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        Dictionary<long, decimal> pending = await PendingReturnsAsync(invoice.SalesInvoiceId, except);

        Dictionary<long, string> blocks = await BikeBlocksAsync(invoice, lines);

        int? days = (await ReturnSwitchesAsync()).WindowDays;

        string branch =
            await _context.Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => x.BranchId == invoice.BranchId)
                .Select(x => x.BranchName)
                .FirstOrDefaultAsync() ?? string.Empty;

        string blocked =
            invoice.Status != StatusPosted
                ? $"Sales invoice {invoice.InvoiceNo} is {invoice.Status}; only a posted invoice can be returned."
                : WindowIssue(invoice, days);

        return new SalesReturnInvoiceDto
        {
            SalesInvoiceId = invoice.SalesInvoiceId,
            PublicId = invoice.PublicId,
            InvoiceNo = invoice.InvoiceNo,
            InvoiceDate = DateText(invoice.InvoiceDate),
            BranchId = invoice.BranchId,
            BranchName = branch,
            WarehouseName = invoice.WarehouseName,
            CustomerId = invoice.CustomerId,
            CustomerCode = invoice.CustomerCode,
            CustomerName = invoice.CustomerName,
            CustomerPhone = invoice.CustomerPhone,
            CustomerAddress = invoice.CustomerAddress,
            SalesPersonName = invoice.SalesPersonName,
            PaymentTerm = invoice.PaymentTerm,
            InvoiceTotal = invoice.InvoiceTotal,
            PaidAmount = invoice.PaidAmount,
            DueAmount = invoice.DueAmount,
            AgeDays = AgeOf(invoice.InvoiceDate),
            Blocked = blocked,
            Lines =
                lines
                    .Select
                    (
                        x =>
                        {
                            IMotorBikeSaleLine? bike = x as IMotorBikeSaleLine;

                            decimal waiting = pending.GetValueOrDefault(x.SalesInvoiceLineId);

                            return new SalesReturnInvoiceLineDto
                            {
                                SalesInvoiceLineId = x.SalesInvoiceLineId,
                                LineNo = x.LineNo,
                                ProductId = x.ProductId,
                                ProductCode = x.ProductCode,
                                PartNumber = x.PartNumber,
                                ProductName = x.ProductName,
                                Unit = x.Unit,
                                MotorBikeUnitId = bike?.MotorBikeUnitId,
                                ChassisNo = bike?.ChassisNo ?? string.Empty,
                                EngineNo = bike?.EngineNo ?? string.Empty,
                                ColorName = bike?.ColorName ?? string.Empty,
                                SoldQuantity = x.Quantity,
                                ReturnedQuantity = x.ReturnedQuantity,
                                PendingQuantity = waiting,
                                ReturnableQuantity = Math.Max(x.Quantity - x.ReturnedQuantity - waiting, 0m),
                                UnitPrice = x.UnitPrice,
                                GrossAmount = x.GrossAmount,
                                DiscountAmount = DiscountOf(x),
                                LineTotal = x.LineTotal,
                                NetPerUnit = x.Quantity > 0m ? decimal.Round(x.LineTotal / x.Quantity, 4) : 0m,
                                VatInside = x.VatInside,
                                RegistrationRefund = RegistrationShareOf(invoice, x).Refund,
                                Blocked = blocks.GetValueOrDefault(x.SalesInvoiceLineId, string.Empty)
                            };
                        }
                    )
                    .ToList()
        };
    }


    //===========================================================
    // List and one return
    //===========================================================

    public async Task<List<SalesReturnListItemDto>> GetReturnsAsync()
    {
        string type = Page.PageType;

        List<SalesReturns> rows =
            await _context.Set<SalesReturns>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.ProductType == type)
                .OrderByDescending(x => x.ReturnDate)
                .ThenByDescending(x => x.SalesReturnId)
                .ToListAsync();

        List<long> ids = rows.Select(x => x.SalesReturnId).ToList();

        Dictionary<long, List<SalesReturnLines>> lines =
            (await _context.Set<SalesReturnLines>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.SalesReturnId))
                .ToListAsync())
            .GroupBy(x => x.SalesReturnId)
            .ToDictionary(g => g.Key, g => g.ToList());

        List<long> branchIds = rows.Select(x => x.BranchId).Distinct().ToList();

        Dictionary<long, string> branches =
            await _context.Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName);

        return rows
            .Select
            (
                x =>
                    new SalesReturnListItemDto
                    {
                        SalesReturnId = x.SalesReturnId,
                        PublicId = x.PublicId,
                        ReturnNo = x.ReturnNo,
                        ReturnDate = DateText(x.ReturnDate),
                        BranchId = x.BranchId,
                        BranchName = branches.GetValueOrDefault(x.BranchId, string.Empty),
                        SalesInvoiceNo = x.SalesInvoiceNo,
                        SalesInvoiceDate = DateText(x.SalesInvoiceDate),
                        CustomerName = x.CustomerName,
                        CustomerPhone = x.CustomerPhone,
                        ItemsText = ItemsTextOf(lines.GetValueOrDefault(x.SalesReturnId) ?? new List<SalesReturnLines>()),
                        TotalQuantity = x.TotalQuantity,
                        ReturnTotal = x.ReturnTotal,
                        Reason = x.Reason,
                        Status = x.Status
                    }
            )
            .ToList();
    }

    public async Task<SalesReturnDto?> GetReturnAsync(Guid publicId)
    {
        string type = Page.PageType;

        SalesReturns? x =
            await _context.Set<SalesReturns>()
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.PublicId == publicId && !r.IsDeleted && r.ProductType == type);

        if (x == null)
        {
            return null;
        }

        List<SalesReturnLines> lines =
            await _context.Set<SalesReturnLines>()
                .AsNoTracking()
                .Where(l => l.SalesReturnId == x.SalesReturnId)
                .OrderBy(l => l.LineNo)
                .ToListAsync();

        var invoice =
            await _context.Set<THeader>()
                .AsNoTracking()
                .Where(i => i.SalesInvoiceId == x.SalesInvoiceId)
                .Select(i => new { i.PublicId, i.CustomerAddress, i.WarehouseName })
                .FirstOrDefaultAsync();

        string branch =
            await _context.Set<BranchesEntity>()
                .AsNoTracking()
                .Where(b => b.BranchId == x.BranchId)
                .Select(b => b.BranchName)
                .FirstOrDefaultAsync() ?? string.Empty;

        List<long> userIds =
            new[] { (long?)x.CreatedBy, x.ApprovedBy, x.PostedBy }
                .Where(u => u.HasValue)
                .Select(u => u!.Value)
                .Distinct()
                .ToList();

        Dictionary<long, string> users =
            (await _context.Set<UserProfileEntity>()
                .AsNoTracking()
                .Where(u => userIds.Contains(u.UserProfileId))
                .Select(u => new { u.UserProfileId, u.DisplayName, u.FullName, u.UserName })
                .ToListAsync())
            .ToDictionary(
                u => u.UserProfileId,
                u => !string.IsNullOrWhiteSpace(u.DisplayName)
                    ? u.DisplayName!
                    : !string.IsNullOrWhiteSpace(u.FullName)
                        ? u.FullName!
                        : u.UserName ?? string.Empty);

        return new SalesReturnDto
        {
            SalesReturnId = x.SalesReturnId,
            PublicId = x.PublicId,
            ProductType = x.ProductType,
            ReturnNo = x.ReturnNo,
            ReturnDate = DateText(x.ReturnDate),
            BranchId = x.BranchId,
            BranchName = branch,
            WarehouseName = invoice?.WarehouseName ?? string.Empty,
            SalesInvoiceId = x.SalesInvoiceId,
            InvoicePublicId = invoice?.PublicId ?? Guid.Empty,
            SalesInvoiceNo = x.SalesInvoiceNo,
            SalesInvoiceDate = DateText(x.SalesInvoiceDate),
            CustomerId = x.CustomerId,
            CustomerCode = x.CustomerCode,
            CustomerName = x.CustomerName,
            CustomerPhone = x.CustomerPhone,
            CustomerAddress = invoice?.CustomerAddress ?? string.Empty,
            Reason = x.Reason,
            Narration = x.Narration,
            TotalQuantity = x.TotalQuantity,
            GrossAmount = x.GrossAmount,
            DiscountAmount = x.DiscountAmount,
            ItemsAmount = x.ItemsAmount,
            RegistrationRefund = x.RegistrationRefund,
            ReturnTotal = x.ReturnTotal,
            TotalVatInside = x.TotalVatInside,
            TotalBaseVat = x.TotalBaseVat,
            CostAmount = x.CostAmount,
            Status = x.Status,
            VoucherNo = x.VoucherNo,
            CancelReason = x.CancelReason,
            CreatedByName = users.GetValueOrDefault(x.CreatedBy, string.Empty),
            CreatedDate = x.CreatedDate,
            ApprovedByName = x.ApprovedBy.HasValue ? users.GetValueOrDefault(x.ApprovedBy.Value, string.Empty) : string.Empty,
            PostedByName = x.PostedBy.HasValue ? users.GetValueOrDefault(x.PostedBy.Value, string.Empty) : string.Empty,
            PostedDate = x.PostedDate,
            Lines =
                lines
                    .Select
                    (
                        l =>
                            new SalesReturnLineDto
                            {
                                SalesReturnLineId = l.SalesReturnLineId,
                                LineNo = l.LineNo,
                                SalesInvoiceLineId = l.SalesInvoiceLineId,
                                InvoiceLineNo = l.InvoiceLineNo,
                                ProductId = l.ProductId,
                                ProductCode = l.ProductCode,
                                PartNumber = l.PartNumber,
                                ProductName = l.ProductName,
                                Unit = l.Unit,
                                MotorBikeUnitId = l.MotorBikeUnitId,
                                ChassisNo = l.ChassisNo,
                                EngineNo = l.EngineNo,
                                ColorName = l.ColorName,
                                SoldQuantity = l.SoldQuantity,
                                Quantity = l.Quantity,
                                UnitPrice = l.UnitPrice,
                                GrossAmount = l.GrossAmount,
                                DiscountAmount = l.CampaignMembershipAmount + l.SpecialAmount + l.FractionalShare,
                                LineTotal = l.LineTotal,
                                VatRate = l.VatRate,
                                VatInside = l.VatInside,
                                BaseVat = l.BaseVat,
                                RegistrationRefund = l.RegistrationRefund,
                                CostAmount = l.CostAmount,
                                Reason = l.Reason
                            }
                    )
                    .ToList()
        };
    }


    //===========================================================
    // Lines of a return from the body : checked against the
    // invoice (quantity left, MB whole chassis, blocks) and given
    // the invoice line's figures for the quantity
    //===========================================================

    private static void FillReturnLine
    (
        SalesReturnLines target,
        THeader invoice,
        TLine source,
        decimal qty
    )
    {
        decimal sold = source.Quantity;

        decimal before = source.ReturnedQuantity;

        IMotorBikeSaleLine? bike = source as IMotorBikeSaleLine;

        target.SalesInvoiceLineId = source.SalesInvoiceLineId;
        target.InvoiceLineNo = source.LineNo;
        target.ProductId = source.ProductId;
        target.ProductCode = Limit(source.ProductCode, 50);
        target.PartNumber = Limit(source.PartNumber, 100);
        target.ProductName = Limit(source.ProductName, 250);
        target.Unit = Limit(source.Unit, 30);
        target.MotorBikeUnitId = bike?.MotorBikeUnitId;
        target.ChassisNo = Limit(bike?.ChassisNo, 50);
        target.EngineNo = Limit(bike?.EngineNo, 50);
        target.ColorName = Limit(bike?.ColorName, 50);
        target.SoldQuantity = sold;
        target.Quantity = qty;
        target.UnitPrice = source.UnitPrice;
        target.GrossAmount = ShareOf(source.GrossAmount, sold, before, qty);
        target.DiscountSource = Limit(source.DiscountSource, 20);
        target.CampaignMembershipAmount = ShareOf(source.CampaignMembershipAmount, sold, before, qty);
        target.SpecialAmount = ShareOf(source.SpecialAmount, sold, before, qty);
        target.FractionalShare = ShareOf(source.FractionalShare, sold, before, qty);
        target.LineTotal = ShareOf(source.LineTotal, sold, before, qty);
        target.VatRate = source.VatRate;
        target.VatInside = ShareOf(source.VatInside, sold, before, qty);
        target.BaseVat = ShareOf(source.BaseVat, sold, before, qty);
        target.VatPayable = bike != null ? ShareOf(bike.VatPayable, sold, before, qty) : 0m;

        (decimal refund, decimal commission) = RegistrationShareOf(invoice, source);

        target.RegistrationRefund = refund;
        target.RegistrationCommission = commission;
    }

    private static void TotalReturn(SalesReturns row, List<SalesReturnLines> lines)
    {
        row.TotalQuantity = lines.Sum(x => x.Quantity);
        row.GrossAmount = lines.Sum(x => x.GrossAmount);
        row.DiscountAmount = lines.Sum(x => x.CampaignMembershipAmount + x.SpecialAmount + x.FractionalShare);
        row.ItemsAmount = lines.Sum(x => x.LineTotal);
        row.RegistrationRefund = lines.Sum(x => x.RegistrationRefund);
        row.ReturnTotal = row.ItemsAmount + row.RegistrationRefund;
        row.TotalVatInside = lines.Sum(x => x.VatInside);
        row.TotalBaseVat = lines.Sum(x => x.BaseVat);
        row.CostAmount = lines.Sum(x => x.CostAmount);
    }

    private async Task<List<SalesReturnLines>> BuildReturnLinesAsync
    (
        THeader invoice,
        SaveSalesReturnDto dto,
        long exceptReturnId,
        int? windowDays
    )
    {
        if (invoice.Status != StatusPosted)
        {
            throw new InvalidOperationException(
                $"Sales invoice {invoice.InvoiceNo} is {invoice.Status}; only a posted invoice can be returned.");
        }

        string window = WindowIssue(invoice, windowDays);

        if (window.Length > 0)
        {
            throw new InvalidOperationException(window);
        }

        List<SaveSalesReturnLineDto> asked =
            (dto.Lines ?? new List<SaveSalesReturnLineDto>())
                .Where(x => x != null && x.Quantity > 0m)
                .ToList();

        if (asked.Count == 0)
        {
            throw new InvalidOperationException("Type the quantity returned on at least one line.");
        }

        if (asked.Select(x => x.SalesInvoiceLineId).Distinct().Count() != asked.Count)
        {
            throw new InvalidOperationException("A line of the invoice is on the return twice.");
        }

        List<TLine> lines =
            await _context.Set<TLine>()
                .AsNoTracking()
                .Where(x => x.SalesInvoiceId == invoice.SalesInvoiceId)
                .ToListAsync();

        Dictionary<long, decimal> pending = await PendingReturnsAsync(invoice.SalesInvoiceId, exceptReturnId);

        Dictionary<long, string> blocks = await BikeBlocksAsync(invoice, lines);

        List<SalesReturnLines> result = new();

        int lineNo = 0;

        foreach (SaveSalesReturnLineDto ask in asked)
        {
            TLine source =
                lines.FirstOrDefault(x => x.SalesInvoiceLineId == ask.SalesInvoiceLineId)
                ?? throw new InvalidOperationException(
                    $"A line is not on Sales invoice {invoice.InvoiceNo} (one return takes the lines of one invoice only).");

            decimal qty = decimal.Round(ask.Quantity, 2, MidpointRounding.AwayFromZero);

            decimal left = source.Quantity - source.ReturnedQuantity - pending.GetValueOrDefault(source.SalesInvoiceLineId);

            string name =
                source is IMotorBikeSaleLine b && b.ChassisNo.Length > 0
                    ? $"{source.ProductName} ({b.ChassisNo})"
                    : source.ProductName;

            if (Page.PageType == "MB" && qty != decimal.Truncate(qty))
            {
                throw new InvalidOperationException($"{name} : a motor bike is returned whole (quantity 1).");
            }

            if (qty > left)
            {
                decimal waiting = pending.GetValueOrDefault(source.SalesInvoiceLineId);

                throw new InvalidOperationException(
                    left <= 0m
                        ? $"{name} : nothing left to return (sold {Qty(source.Quantity)}, returned {Qty(source.ReturnedQuantity)}{(waiting > 0m ? $", {Qty(waiting)} on another return not posted yet" : string.Empty)})."
                        : $"{name} : at most {Qty(left)} can be returned (sold {Qty(source.Quantity)}, returned {Qty(source.ReturnedQuantity)}{(waiting > 0m ? $", {Qty(waiting)} on another return not posted yet" : string.Empty)}).");
            }

            if (blocks.TryGetValue(source.SalesInvoiceLineId, out string? blocked))
            {
                throw new InvalidOperationException($"{name} cannot be returned : {blocked}");
            }

            SalesReturnLines line = new() { LineNo = ++lineNo, Reason = OneLine(ask.Reason, 300) };

            FillReturnLine(line, invoice, source, qty);

            result.Add(line);
        }

        return result;
    }


    //===========================================================
    // Create / Update (Draft; Post on Approval OFF : posted at
    // once) / Approve / Return to Draft / Post / Cancel / Delete
    //===========================================================

    private static string ReasonOf(SaveSalesReturnDto dto)
    {
        string reason = OneLine(dto?.Reason, 500);

        if (reason.Length < 5)
        {
            throw new InvalidOperationException("Type why the goods are returned (at least 5 characters).");
        }

        return reason;
    }

    private static SalesReturnSavedDto ReturnSaved(SalesReturns row, List<string>? warnings = null) =>
        new()
        {
            SalesReturnId = row.SalesReturnId,
            PublicId = row.PublicId,
            ReturnNo = row.ReturnNo,
            Status = row.Status,
            ReturnTotal = row.ReturnTotal,
            Warnings = warnings ?? new List<string>()
        };

    public async Task<SalesReturnSavedDto> CreateReturnAsync(SaveSalesReturnDto dto, long userId)
    {
        RequireWiredPage();

        dto ??= new SaveSalesReturnDto();

        string reason = ReasonOf(dto);

        SalesReturns? saved = null;

        await InTransactionAsync(
            async () =>
            {
                THeader found = await InvoiceByPublicIdAsync(dto.InvoicePublicId);

                // The invoice row locked : returns of one invoice are
                // saved one after another
                THeader invoice = await LoadAsync(found.SalesInvoiceId);

                (bool postOnApproval, int? days) = await ReturnSwitchesAsync();

                List<SalesReturnLines> lines = await BuildReturnLinesAsync(invoice, dto, 0, days);

                DateTime now = DateTime.UtcNow;

                DateOnly today = BusinessToday();

                VoucherNumberDto number = await _numberService.NextAsync(ReturnPrefix, invoice.BranchId, today);

                SalesReturns row =
                    new()
                    {
                        ProductType = Page.PageType,
                        ReturnNo = Limit(number.VoucherNo, 40),
                        ReturnDate = today,
                        BranchId = invoice.BranchId,
                        WarehouseId = invoice.WarehouseId,
                        SalesInvoiceId = invoice.SalesInvoiceId,
                        SalesInvoiceNo = Limit(invoice.InvoiceNo, 50),
                        SalesInvoiceDate = invoice.InvoiceDate,
                        CustomerId = invoice.CustomerId,
                        CustomerCode = Limit(invoice.CustomerCode, 20),
                        CustomerName = Limit(invoice.CustomerName, 200),
                        CustomerPhone = Limit(invoice.CustomerPhone, 20),
                        ReceivableLedgerCode = Limit(invoice.ReceivableLedgerCode, 30),
                        Reason = reason,
                        Narration = OneLine(dto.Narration, 500),
                        Status = StatusDraft,
                        CreatedBy = userId,
                        CreatedDate = now
                    };

                TotalReturn(row, lines);

                _context.Set<SalesReturns>().Add(row);

                await _context.SaveChangesAsync();

                foreach (SalesReturnLines line in lines)
                {
                    line.SalesReturnId = row.SalesReturnId;

                    _context.Set<SalesReturnLines>().Add(line);
                }

                AddReturnHistory(row, "Create", "Sales Return Created",
                    $"Sales return {row.ReturnNo} of invoice {row.SalesInvoiceNo} ({row.CustomerName}, {row.ReturnTotal:N2}) created. Reason : {reason}",
                    userId, now);

                await _context.SaveChangesAsync();

                if (!postOnApproval)
                {
                    await PostReturnCoreAsync(row, invoice, userId, now, "Posted (on save)");
                }

                saved = row;
            });

        return ReturnSaved(saved!);
    }

    public async Task<SalesReturnSavedDto> UpdateReturnAsync(Guid publicId, SaveSalesReturnDto dto, long userId)
    {
        RequireWiredPage();

        dto ??= new SaveSalesReturnDto();

        string reason = ReasonOf(dto);

        SalesReturns? saved = null;

        await InTransactionAsync(
            async () =>
            {
                SalesReturns row = await ReturnRowAsync(publicId, true);

                RequireReturnStatus(row, "changed", StatusDraft);

                THeader invoice = await LoadAsync(row.SalesInvoiceId);

                int? days = (await ReturnSwitchesAsync()).WindowDays;

                List<SalesReturnLines> lines = await BuildReturnLinesAsync(invoice, dto, row.SalesReturnId, days);

                DateTime now = DateTime.UtcNow;

                List<SalesReturnLines> old =
                    await _context.Set<SalesReturnLines>()
                        .Where(x => x.SalesReturnId == row.SalesReturnId)
                        .ToListAsync();

                _context.Set<SalesReturnLines>().RemoveRange(old);

                foreach (SalesReturnLines line in lines)
                {
                    line.SalesReturnId = row.SalesReturnId;

                    _context.Set<SalesReturnLines>().Add(line);
                }

                row.Reason = reason;
                row.Narration = OneLine(dto.Narration, 500);
                row.ModifiedBy = userId;
                row.ModifiedDate = now;

                TotalReturn(row, lines);

                AddReturnHistory(row, "Update", "Sales Return Updated",
                    $"Sales return {row.ReturnNo} updated ({row.TotalQuantity:0.##} units, {row.ReturnTotal:N2}).",
                    userId, now);

                await _context.SaveChangesAsync();

                saved = row;
            });

        return ReturnSaved(saved!);
    }

    public async Task ApproveReturnAsync(Guid publicId, long userId)
    {
        await InTransactionAsync(
            async () =>
            {
                SalesReturns row = await ReturnRowAsync(publicId, true);

                RequireReturnStatus(row, "approved", StatusDraft);

                THeader invoice = await LoadAsync(row.SalesInvoiceId);

                int? days = (await ReturnSwitchesAsync()).WindowDays;

                List<SalesReturnLines> lines =
                    await _context.Set<SalesReturnLines>()
                        .AsNoTracking()
                        .Where(x => x.SalesReturnId == row.SalesReturnId)
                        .OrderBy(x => x.LineNo)
                        .ToListAsync();

                // Checked again (quantities left, window, blocks)
                await BuildReturnLinesAsync(
                    invoice,
                    new SaveSalesReturnDto
                    {
                        Lines = lines.Select(x => new SaveSalesReturnLineDto { SalesInvoiceLineId = x.SalesInvoiceLineId, Quantity = x.Quantity }).ToList()
                    },
                    row.SalesReturnId,
                    days);

                DateTime now = DateTime.UtcNow;

                row.Status = StatusApproved;
                row.ApprovedBy = userId;
                row.ApprovedDate = now;
                row.ModifiedBy = userId;
                row.ModifiedDate = now;

                AddReturnHistory(row, "Approve", "Sales Return Approved", $"Sales return {row.ReturnNo} approved.", userId, now);

                await _context.SaveChangesAsync();
            });
    }

    public async Task ReturnToDraftReturnAsync(Guid publicId, long userId)
    {
        await InTransactionAsync(
            async () =>
            {
                SalesReturns row = await ReturnRowAsync(publicId, true);

                RequireReturnStatus(row, "returned to draft", StatusApproved);

                DateTime now = DateTime.UtcNow;

                row.Status = StatusDraft;
                row.ApprovedBy = null;
                row.ApprovedDate = null;
                row.ModifiedBy = userId;
                row.ModifiedDate = now;

                AddReturnHistory(row, "ReturnToDraft", "Sales Return Returned To Draft", $"Sales return {row.ReturnNo} returned to draft.", userId, now);

                await _context.SaveChangesAsync();
            });
    }

    public async Task<SalesReturnSavedDto> PostReturnAsync(Guid publicId, long userId)
    {
        SalesReturns? posted = null;

        await InTransactionAsync(
            async () =>
            {
                SalesReturns row = await ReturnRowAsync(publicId, true);

                RequireReturnStatus(row, "posted", StatusApproved);

                THeader invoice = await LoadAsync(row.SalesInvoiceId);

                await PostReturnCoreAsync(row, invoice, userId, DateTime.UtcNow, "Posted");

                posted = row;
            });

        return ReturnSaved(posted!);
    }

    public async Task CancelReturnAsync(Guid publicId, CancelSalesReturnDto dto, long userId)
    {
        string reason = OneLine(dto?.Reason, 500);

        if (reason.Length < 5)
        {
            throw new InvalidOperationException("A reason (at least 5 characters) is required to cancel the return.");
        }

        await InTransactionAsync(
            async () =>
            {
                SalesReturns row = await ReturnRowAsync(publicId, true);

                if (row.Status == StatusPosted)
                {
                    throw new InvalidOperationException(
                        $"Sales return {row.ReturnNo} is posted : a posted return is final (sell the goods again on a new invoice).");
                }

                RequireReturnStatus(row, "cancelled", StatusDraft, StatusApproved);

                DateTime now = DateTime.UtcNow;

                row.Status = StatusCancelled;
                row.CancelReason = reason;
                row.CancelledBy = userId;
                row.CancelledDate = now;
                row.ModifiedBy = userId;
                row.ModifiedDate = now;

                AddReturnHistory(row, "Cancel", "Sales Return Cancelled", $"Sales return {row.ReturnNo} cancelled. Reason : {reason}", userId, now);

                await _context.SaveChangesAsync();
            });
    }

    public async Task DeleteReturnAsync(Guid publicId, long userId)
    {
        await InTransactionAsync(
            async () =>
            {
                SalesReturns row = await ReturnRowAsync(publicId, true);

                RequireReturnStatus(row, "deleted", StatusDraft);

                DateTime now = DateTime.UtcNow;

                row.IsDeleted = true;
                row.DeletedBy = userId;
                row.DeletedDate = now;

                AddReturnHistory(row, "Delete", "Sales Return Deleted", $"Sales return {row.ReturnNo} deleted.", userId, now);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Post core (inside the caller's transaction; the invoice row
    // is locked by LoadAsync)
    //===========================================================

    private async Task PostReturnCoreAsync
    (
        SalesReturns row,
        THeader invoice,
        long userId,
        DateTime now,
        string verb
    )
    {
        if (invoice.Status != StatusPosted)
        {
            throw new InvalidOperationException(
                $"Sales invoice {invoice.InvoiceNo} is {invoice.Status}; only a posted invoice can be returned.");
        }

        string receivable = (invoice.ReceivableLedgerCode ?? string.Empty).Trim();

        if (receivable.Length == 0)
        {
            throw new InvalidOperationException(
                $"Customer '{invoice.CustomerName}' has no receivable ledger (Customer Profiles).");
        }

        DateOnly today = BusinessToday();

        List<SalesReturnLines> rlines =
            await _context.Set<SalesReturnLines>()
                .Where(x => x.SalesReturnId == row.SalesReturnId)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        if (rlines.Count == 0)
        {
            throw new InvalidOperationException($"Sales return {row.ReturnNo} has no lines.");
        }

        // Tracked : ReturnedQuantity changes
        List<TLine> lines = await LinesOfAsync(invoice.SalesInvoiceId);

        Dictionary<long, string> blocks = await BikeBlocksAsync(invoice, lines);

        // Figures again from the invoice lines (another return may
        // have been posted since the draft)
        foreach (SalesReturnLines rline in rlines)
        {
            TLine source =
                lines.FirstOrDefault(x => x.SalesInvoiceLineId == rline.SalesInvoiceLineId)
                ?? throw new InvalidOperationException($"Line {rline.LineNo} : its invoice line was not found.");

            decimal left = source.Quantity - source.ReturnedQuantity;

            if (rline.Quantity <= 0m || rline.Quantity > left)
            {
                throw new InvalidOperationException(
                    $"{rline.ProductName}{(rline.ChassisNo.Length > 0 ? $" ({rline.ChassisNo})" : string.Empty)} : at most {Qty(Math.Max(left, 0m))} can be returned now (sold {Qty(source.Quantity)}, returned {Qty(source.ReturnedQuantity)}).");
            }

            if (blocks.TryGetValue(source.SalesInvoiceLineId, out string? blocked))
            {
                throw new InvalidOperationException($"{rline.ProductName} cannot be returned : {blocked}");
            }

            FillReturnLine(rline, invoice, source, rline.Quantity);
        }

        Dictionary<long, ProductInfo> products =
            await ProductsAsync(rlines.Select(x => x.ProductId).Distinct().ToList());

        string narration =
            Limit(WithTyped($"Sales return from {invoice.CustomerName} (invoice {invoice.InvoiceNo})", row.Reason), 500);

        List<VoucherPostingLine> journal = new();

        void Post(string ledger, decimal debit, decimal credit, string text, bool party = false)
        {
            // A negative amount goes to the other side
            if (debit < 0m)
            {
                credit += -debit;
                debit = 0m;
            }

            if (credit < 0m)
            {
                debit += -credit;
                credit = 0m;
            }

            if (debit == 0m && credit == 0m)
            {
                return;
            }

            journal.Add(
                new VoucherPostingLine
                {
                    GroupNo = 1,
                    LedgerCode = ledger,
                    Debit = debit,
                    Credit = credit,
                    Narration = Limit(text, 500),
                    PartyType = party ? PartyCustomer : string.Empty,
                    PartyCode = party ? invoice.CustomerCode : string.Empty
                });
        }

        //=======================================================
        // Customer, discounts, sales, VAT, the VAT difference,
        // registration refund
        //=======================================================

        string vatLedger = string.Empty;

        decimal customerTotal = 0m;

        Dictionary<string, decimal> sales = new(StringComparer.OrdinalIgnoreCase);

        decimal special = 0m, fractional = 0m, membership = 0m;

        // Offer discounts back to the ledger they were posted to
        // ('' = CAMPAIGN-DISCOUNT-<type>)
        Dictionary<string, decimal> campaigns = new(StringComparer.OrdinalIgnoreCase);

        decimal baseVat = 0m, vatPayable = 0m, increase = 0m, reduction = 0m;

        decimal regCollection = 0m, regCommission = 0m;

        foreach (SalesReturnLines rline in rlines)
        {
            ProductInfo product =
                products.GetValueOrDefault(rline.ProductId)
                ?? throw new InvalidOperationException($"{rline.ProductName} : the product was not found.");

            if (product.SalesLedgerCode.Length == 0)
            {
                throw new InvalidOperationException(
                    $"{product.ProductCode} ({product.ProductName}) has no sales ledger. Save it once on its product page (or run ProductSales_Accounts.sql).");
            }

            customerTotal += rline.LineTotal + rline.RegistrationRefund;

            if (rline.DiscountSource == SourceMembership)
            {
                membership += rline.CampaignMembershipAmount;
            }
            else
            {
                string offerLedger =
                    (lines.FirstOrDefault(x => x.SalesInvoiceLineId == rline.SalesInvoiceLineId)?.CampaignLedgerCode ?? string.Empty).Trim();

                campaigns[offerLedger] = campaigns.GetValueOrDefault(offerLedger) + rline.CampaignMembershipAmount;
            }

            special += rline.SpecialAmount;

            fractional += rline.FractionalShare;

            // Sales = what the customer and the discounts carried,
            // less the VAT inside (= gross - VAT inside)
            sales[product.SalesLedgerCode] =
                sales.GetValueOrDefault(product.SalesLedgerCode)
                + rline.LineTotal + rline.CampaignMembershipAmount + rline.SpecialAmount + rline.FractionalShare
                - rline.VatInside;

            baseVat += rline.BaseVat;

            vatPayable += rline.VatPayable;

            decimal difference = rline.VatInside - rline.BaseVat - rline.VatPayable;

            if (difference > 0m)
            {
                increase += difference;
            }
            else
            {
                reduction += -difference;
            }

            regCollection += rline.RegistrationRefund - rline.RegistrationCommission;

            regCommission += rline.RegistrationCommission;
        }

        Post(receivable, 0m, customerTotal, narration, true);

        foreach (KeyValuePair<string, decimal> offer in campaigns.Where(x => x.Value != 0m))
        {
            Post(
                offer.Key.Length > 0 ? offer.Key : PostingLedgerCodes.Get(_context, Page.PurposeCampaignDiscount),
                0m,
                offer.Value,
                offer.Key.Length > 0 ? "Offer discount returned (distributor)" : "Offer discount returned");
        }

        if (membership != 0m)
        {
            string ledger = (invoice.MembershipDiscountLedgerCode ?? string.Empty).Trim();

            if (ledger.Length == 0)
            {
                throw new InvalidOperationException(
                    $"Sales invoice {invoice.InvoiceNo} has no membership Discount ledger : the membership discount cannot be returned.");
            }

            Post(ledger, 0m, membership, $"Membership discount returned ({invoice.MembershipCardName}, {invoice.MembershipNo})");
        }

        if (special != 0m)
        {
            Post(PostingLedgerCodes.Get(_context, Page.PurposeSpecialDiscount), 0m, special, "Special discount returned");
        }

        if (fractional != 0m)
        {
            Post(PostingLedgerCodes.Get(_context, Page.PurposeFractionalDiscount), 0m, fractional, "Fractional discount returned");
        }

        foreach (KeyValuePair<string, decimal> ledger in sales)
        {
            Post(ledger.Key, ledger.Value, 0m, "Sales returned");
        }

        if (baseVat != 0m)
        {
            vatLedger = PostingLedgerCodes.Get(_context, Page.PurposeVat);

            Post(vatLedger, baseVat, 0m, "VAT (paid at source) on the goods returned");
        }

        if (vatPayable != 0m)
        {
            Post(PostingLedgerCodes.Get(_context, PurposeVatPayableMb), vatPayable, 0m, "VAT payable on the bikes returned");
        }

        bool reimburse = Page.PageType == "MB";

        if (increase != 0m)
        {
            Post(
                reimburse
                    ? PostingLedgerCodes.Get(_context, PurposeVatReimbursementMb)
                    : PostingLedgerCodes.Get(_context, PostingPurposes.PriceIncreaseIncome),
                increase,
                0m,
                reimburse ? "VAT reimbursement on the bikes returned" : "VAT inside the price above the VAT paid at source (returned)");
        }

        if (reduction != 0m)
        {
            Post(
                reimburse
                    ? PostingLedgerCodes.Get(_context, PurposeVatReimbursementMb)
                    : PostingLedgerCodes.Get(_context, PostingPurposes.PriceReductionExpense),
                0m,
                reduction,
                reimburse ? "VAT reimbursement on the bikes returned" : "VAT paid at source above the VAT inside the price (returned)");
        }

        if (regCollection != 0m)
        {
            Post(RegistrationOnInvoice.LedgerCollection, regCollection, 0m, "Registration fees refunded with the bikes returned");
        }

        if (regCommission != 0m)
        {
            Post(RegistrationOnInvoice.LedgerCommission, regCommission, 0m, "Registration commission refunded with the bikes returned");
        }

        //=======================================================
        // Stock back to the same batches (allocations of the
        // invoice line, what earlier returns did not take back
        // yet; then the part sold without stock)
        //=======================================================

        List<long> rlineInvoiceIds = rlines.Select(x => x.SalesInvoiceLineId).ToList();

        List<StockAllocationsEntity> allocations =
            await _context.Set<StockAllocationsEntity>()
                .AsNoTracking()
                .Where(x => x.DocumentType == Page.Prefix
                            && x.DocumentId == invoice.SalesInvoiceId
                            && rlineInvoiceIds.Contains(x.DocumentLineId)
                            && !x.IsReversed)
                .OrderBy(x => x.StockAllocationId)
                .ToListAsync();

        // What the posted returns took back already, per allocation
        List<string> earlierJson =
            await (
                    from line in _context.Set<SalesReturnLines>().AsNoTracking()
                    join head in _context.Set<SalesReturns>().AsNoTracking()
                        on line.SalesReturnId equals head.SalesReturnId
                    where head.ProductType == row.ProductType
                          && head.SalesInvoiceId == invoice.SalesInvoiceId
                          && head.Status == StatusPosted
                          && !head.IsDeleted
                          && rlineInvoiceIds.Contains(line.SalesInvoiceLineId)
                    select line.Restocked)
                .ToListAsync();

        List<ReturnRestock> earlier = earlierJson.SelectMany(x => ReadRestocked(x)).ToList();

        List<long> batchIds = allocations.Select(x => x.StockBatchId).Distinct().ToList();

        if (batchIds.Count > 0)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "SELECT 1 FROM \"StockBatches\" WHERE \"StockBatchId\" = ANY({0}) FOR UPDATE",
                batchIds.ToArray());
        }

        Dictionary<long, StockBatchesEntity> batches =
            await _context.Set<StockBatchesEntity>()
                .Where(x => batchIds.Contains(x.StockBatchId))
                .ToDictionaryAsync(x => x.StockBatchId);

        Dictionary<string, decimal> inventory = new(StringComparer.OrdinalIgnoreCase);

        Dictionary<string, decimal> cogs = new(StringComparer.OrdinalIgnoreCase);

        foreach (SalesReturnLines rline in rlines)
        {
            TLine source = lines.First(x => x.SalesInvoiceLineId == rline.SalesInvoiceLineId);

            ProductInfo product = products[rline.ProductId];

            List<ReturnRestock> taken = new();

            decimal need = rline.Quantity;

            List<StockAllocationsEntity> mine =
                allocations.Where(x => x.DocumentLineId == source.SalesInvoiceLineId).ToList();

            foreach (StockAllocationsEntity allocation in mine)
            {
                if (need <= 0m)
                {
                    break;
                }

                decimal backQty = earlier.Where(x => x.a == allocation.StockAllocationId).Sum(x => x.q);

                decimal backValue = earlier.Where(x => x.a == allocation.StockAllocationId).Sum(x => x.v);

                decimal room = allocation.Quantity - backQty;

                if (room <= 0m)
                {
                    continue;
                }

                decimal qty = Math.Min(room, need);

                decimal value =
                    qty == room
                        ? allocation.Value - backValue
                        : Money(qty * allocation.UnitCost);

                taken.Add(new ReturnRestock { a = allocation.StockAllocationId, b = allocation.StockBatchId, q = qty, v = value });

                need -= qty;
            }

            // The part sold without stock : its cost back, no
            // movement (as it went out)
            if (need > 0m)
            {
                decimal allocatedValue = mine.Sum(x => x.Value);

                decimal unallocatedCost = Math.Max(source.CostAmount - allocatedValue, 0m);

                decimal unallocatedQty = source.UnallocatedQuantity;

                decimal backQty = earlier.Where(x => x.a == 0 && x.b == source.SalesInvoiceLineId).Sum(x => x.q);

                decimal value =
                    unallocatedQty > 0m
                        ? ShareOf(unallocatedCost, unallocatedQty, backQty, Math.Min(need, Math.Max(unallocatedQty - backQty, 0m)))
                        : 0m;

                // b = the invoice line (no batch)
                taken.Add(new ReturnRestock { a = 0, b = source.SalesInvoiceLineId, q = need, v = value });

                need = 0m;
            }

            rline.CostAmount = taken.Sum(x => x.v);

            rline.Restocked = JsonSerializer.Serialize(taken);

            if (rline.CostAmount != 0m && product.CogsLedgerCode.Length == 0)
            {
                throw new InvalidOperationException($"'{product.ProductName}' has no COGS ledger (Product Settings).");
            }

            foreach (ReturnRestock part in taken)
            {
                string inventoryLedger =
                    part.a != 0 && batches.TryGetValue(part.b, out StockBatchesEntity? owner) && owner.InventoryLedgerCode.Length > 0
                        ? owner.InventoryLedgerCode
                        : product.InventoryLedgerCode;

                if (part.v != 0m && inventoryLedger.Length == 0)
                {
                    throw new InvalidOperationException($"'{product.ProductName}' has no inventory ledger.");
                }

                if (part.v != 0m)
                {
                    inventory[inventoryLedger] = inventory.GetValueOrDefault(inventoryLedger) + part.v;

                    cogs[product.CogsLedgerCode] = cogs.GetValueOrDefault(product.CogsLedgerCode) + part.v;
                }

                if (part.a == 0)
                {
                    continue;
                }

                StockBatchesEntity batch = batches[part.b];

                _context.Set<StockMovementsEntity>().Add(
                    new StockMovementsEntity
                    {
                        StockBatchId = batch.StockBatchId,
                        ProductType = Page.PageType,
                        ProductId = batch.ProductId,
                        BranchId = invoice.BranchId,
                        WarehouseId = invoice.WarehouseId,
                        Bucket = BatchOnHand,
                        MovementType = MoveSaleReturn,
                        QuantityIn = part.q,
                        QuantityOut = 0m,
                        UnitCost = batch.UnitCost,
                        Value = part.v,
                        DocumentType = ReturnPrefix,
                        DocumentId = row.SalesReturnId,
                        DocumentLineId = rline.SalesReturnLineId,
                        DocumentNo = row.ReturnNo,
                        DocumentDate = today,
                        IsReversal = false,
                        Narration = Limit($"Returned on {row.ReturnNo} (invoice {invoice.InvoiceNo}) : {row.Reason}", 300),
                        CreatedBy = userId,
                        CreatedDate = now
                    });

                batch.QuantityOnHand += part.q;
                batch.QuantityOut -= part.q;
                batch.RemainingValue += part.v;

                // A closed batch opens again
                if (batch.Status == BatchClosed)
                {
                    batch.Status =
                        batch.QuantityInTransit > 0m
                            ? BatchInTransit
                            : BatchOnHand;
                }

                batch.ModifiedBy = userId;
                batch.ModifiedDate = now;
            }

            //===================================================
            // VAT register : reversal rows of the return (Credit
            // Note, Mushak 6.7)
            //===================================================

            if (invoice.VatApplicable && (rline.BaseVat != 0m || rline.VatInside != 0m))
            {
                _context.Set<VatRegisterEntity>().Add(
                    new VatRegisterEntity
                    {
                        Direction = "Sale",
                        DocumentType = ReturnPrefix,
                        DocumentId = row.SalesReturnId,
                        DocumentLineId = rline.SalesReturnLineId,
                        DocumentNo = row.ReturnNo,
                        DocumentDate = today,
                        MushakNo = "6.7",
                        MushakDate = today,
                        PartyType = PartyCustomer,
                        PartyCode = Limit(invoice.CustomerCode, 30),
                        PartyName = Limit(invoice.CustomerName, 200),
                        PartyBin = string.Empty,
                        BranchId = invoice.BranchId,
                        ProductType = Page.PageType,
                        ProductId = rline.ProductId,
                        ProductCode = Limit(rline.ProductCode, 40),
                        ProductName = Limit(rline.ProductName, 250),
                        Quantity = rline.Quantity,
                        TaxableValue = rline.GrossAmount - rline.VatInside,
                        VatRate = rline.VatRate,
                        VatAmount = rline.BaseVat,
                        VatClaimable = 0m,
                        VatLedgerCode = Limit(vatLedger, 30),
                        IsReversal = true,
                        CreatedBy = userId,
                        CreatedDate = now
                    });
            }

            source.ReturnedQuantity += rline.Quantity;
        }

        foreach (KeyValuePair<string, decimal> ledger in inventory)
        {
            Post(ledger.Key, ledger.Value, 0m, "Goods returned to stock");
        }

        foreach (KeyValuePair<string, decimal> ledger in cogs)
        {
            Post(ledger.Key, 0m, ledger.Value, "Cost of sales returned");
        }

        decimal debitTotal = journal.Sum(x => x.Debit);

        decimal creditTotal = journal.Sum(x => x.Credit);

        if (debitTotal != creditTotal)
        {
            throw new InvalidOperationException(
                $"Sales return {row.ReturnNo} does not balance (debit {debitTotal:N2}, credit {creditTotal:N2}).");
        }

        row.ReturnDate = today;

        TotalReturn(row, rlines);

        await _context.SaveChangesAsync();

        await _postingService.PostAsync(
            new VoucherPostingRequest
            {
                VoucherType = ReturnPrefix,
                VoucherId = row.SalesReturnId,
                VoucherNo = row.ReturnNo,
                VoucherDate = today,
                BranchId = invoice.BranchId,
                PartyType = PartyCustomer,
                PartyCode = invoice.CustomerCode,
                ReferenceNo = Limit(invoice.InvoiceNo, 50),
                Narration = narration,
                Lines = journal
            },
            userId);

        //=======================================================
        // MB : the bikes back in stock; registration, customer
        // file and delivery of each chassis cancelled
        //=======================================================

        if (Page.PageType == "MB")
        {
            foreach (SalesReturnLines rline in rlines)
            {
                TLine source = lines.First(x => x.SalesInvoiceLineId == rline.SalesInvoiceLineId);

                if (source is not IMotorBikeSaleLine bike || (bike.MotorBikeUnitId ?? 0) <= 0)
                {
                    continue;
                }

                long unitId = bike.MotorBikeUnitId!.Value;

                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT 1 FROM \"MotorBikeUnits\" WHERE \"MotorBikeUnitId\" = {0} FOR UPDATE",
                    unitId);

                MotorBikeUnitsEntity unit =
                    await _context.Set<MotorBikeUnitsEntity>().FirstOrDefaultAsync(x => x.MotorBikeUnitId == unitId && !x.IsDeleted)
                    ?? throw new InvalidOperationException($"Chassis {bike.ChassisNo} was not found.");

                if (unit.Status != UnitSold)
                {
                    throw new InvalidOperationException($"Chassis {unit.ChassisNo} is {unit.Status}, not Sold : it cannot be returned.");
                }

                unit.Status = UnitInStock;
                unit.ModifiedBy = userId;
                unit.ModifiedDate = now;

                bike.DeliveryStatus = DeliveryCancelled;

                string why = $"Sales return {row.ReturnNo} : {row.Reason}";

                await RegistrationOnInvoice.CancelForInvoiceAsync(
                    _context,
                    invoice.SalesInvoiceId,
                    invoice.InvoiceNo,
                    why,
                    userId,
                    now,
                    unitId);

                await AppCore.Infrastructure.Platform.Sales.CustomerFileWriter.CancelForInvoiceAsync(
                    _context,
                    invoice.SalesInvoiceId,
                    invoice.InvoiceNo,
                    userId,
                    now,
                    bike.ChassisNo);

                await AppCore.Infrastructure.Platform.Sales.BikeDeliveryWriter.UndoForInvoiceAsync(
                    _context,
                    invoice.SalesInvoiceId,
                    invoice.InvoiceNo,
                    userId,
                    now,
                    source.SalesInvoiceLineId,
                    why);
            }
        }

        row.Status = StatusPosted;
        row.VoucherNo = row.ReturnNo;
        row.PostedBy = userId;
        row.PostedDate = now;
        row.ModifiedBy = userId;
        row.ModifiedDate = now;

        AddReturnHistory(row, "Post", $"Sales Return {verb}",
            $"Sales return {row.ReturnNo} {verb.ToLowerInvariant()} : {row.TotalQuantity:0.##} units, {row.ReturnTotal:N2} credited to {row.CustomerName}.",
            userId, now);

        AddInvoiceNote(invoice, "Return", "Sales Invoice Returned",
            $"Sales return {row.ReturnNo} posted on invoice {invoice.InvoiceNo} : {ItemsTextOf(rlines)}; {row.ReturnTotal:N2} credited to the customer.",
            userId, now);

        await _context.SaveChangesAsync();
    }
}
