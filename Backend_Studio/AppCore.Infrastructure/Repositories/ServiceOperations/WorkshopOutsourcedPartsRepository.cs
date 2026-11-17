//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.Platform.Accounting;
using AppCore.Application.ServiceOperations;
using AppCore.Domain.Entities.ServiceOperations;
using AppCore.Domain.Entities.Settings.ClientSettings;
using AppCore.Domain.Entities.Settings.ProductSettings;
using AppCore.Domain.Platform.Accounting;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.ServiceOperations;


//===============================================================
// What Parts Outsourcing and the service invoice share
//===============================================================

internal static class Wo
{
    public const string Posted = "Posted";

    public const string Cancelled = "Cancelled";

    public const string Other = "Other";

    // A work of the list of outside works (Workshop Configuration),
    // done by a vendor for the job card
    public const string OutsideWork = "OutsideWork";

    public const string PartySupplier = "Supplier";

    // The vendor is typed : what is owed to him
    public const string PurposePayable = "OUTSOURCED-PARTS-PAYABLE";

    // A typed part : its cost of goods sold on the invoice
    public const string PurposeCost = "OUTSOURCED-PARTS-COST";

    // Workshop WIP of what has no product behind it : a typed part,
    // an outside work (Posting Setup). Empty : Workshop WIP.
    public const string PurposePartsWip = "OUTSOURCED-PARTS-WIP";

    public const string PurposeWorkWip = "OUTSIDE-WORK-WIP";

    public const string PostingPage = "Settings > Account Settings > Posting Setup (group Service Operations)";

    // The parts bought outside for a job card that count
    public static Task<List<JobCardOutsourcedParts>> PostedAsync(AppDbContext context, long jobCardId) =>
        context.Set<JobCardOutsourcedParts>().AsNoTracking()
            .Where(x => x.JobCardId == jobCardId && x.Status == Posted)
            .OrderBy(x => x.JobCardOutsourcedPartId)
            .ToListAsync();
}


//===============================================================
// Parts Outsourcing (hand-written, 2026-11-17; NEVER run Code Sync;
// table made by ServiceOperations_Outsourced_Parts.sql)
//
// A part the store cannot give is bought from a local vendor for ONE
// job card : no purchase order, no purchase invoice, no stock. The
// part is one of the product lists (the same branded part) or typed;
// the vendor is a Supplier Profile or a typed name.
//
// Accounting : posted when the entry is saved, under its own number
// (WOP) :
//   Dr Workshop WIP (the cost)    Cr the supplier's payable ledger,
//                                    or Posting Setup OUTSOURCED-
//                                    PARTS-PAYABLE (typed vendor)
// The service invoice bills the part at its selling rate and moves
// the cost from WIP to cost of goods sold (ServiceInvoicesRepository).
// Nothing is paid here : the vendor is paid with a Payment Voucher.
//
// The selling rate starts at the price of Price Setup; above it only
// with the page action Sell Above MRP.
//
// OUTSIDE WORKS (2026-11-17) are entered the same way, in the same
// table (ItemKind OutsideWork, ItemId = the work of the list of
// Workshop Configuration) : the vendor, what he charges, what the
// customer pays. Dr Workshop WIP, Cr the supplier's payable ledger
// or Posting Setup OUTSIDE-WORK-PAYABLE (typed vendor). The invoice
// bills it as outside work (OUTSIDE-WORK-INCOME) and moves the cost
// from WIP to OUTSIDE-WORK-COST. The labour line of the same work
// that came from the estimate leaves the job card : the entry
// replaces it.
//===============================================================

public class WorkshopOutsourcedPartsRepository
    : IWorkshopOutsourcedPartsRepository
{
    private const string CardEntity = "JobCards";

    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;

    private readonly IVoucherPostingService _postingService;

    private readonly IServiceEstimatesRepository _catalogue;

    public WorkshopOutsourcedPartsRepository(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVoucherPostingService postingService,
        IServiceEstimatesRepository catalogue)
    {
        _context = context;
        _numberService = numberService;
        _postingService = postingService;
        _catalogue = catalogue;
    }

    private DbSet<JobCardOutsourcedParts> Rows => _context.Set<JobCardOutsourcedParts>();

    private async Task<JobCards> CardAsync(Guid jobCardPublicId) =>
        await _context.Set<JobCards>().FirstOrDefaultAsync(x => x.PublicId == jobCardPublicId && !x.IsDeleted)
        ?? throw new KeyNotFoundException("The job card was not found.");


    //===========================================================
    // Reading
    //===========================================================

    private async Task<OutsourcedPartsDto> ReadAsync(JobCards card, bool canAboveMrp)
    {
        List<JobCardOutsourcedParts> rows =
            await Rows.AsNoTracking().Where(x => x.JobCardId == card.JobCardId).OrderBy(x => x.JobCardOutsourcedPartId).ToListAsync();

        List<OutsourcedSupplierDto> suppliers =
            await _context.Set<SupplierProfiles>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.DisplayName)
                .Select(x => new OutsourcedSupplierDto { SupplierId = x.SupplierId, Code = x.SupplierCode, Name = x.DisplayName })
                .ToListAsync();

        List<long> supplierIds = rows.Where(x => x.SupplierId != null).Select(x => x.SupplierId!.Value).Distinct().ToList();

        Dictionary<long, string> names =
            supplierIds.Count == 0
                ? new Dictionary<long, string>()
                : await _context.Set<SupplierProfiles>().AsNoTracking()
                    .Where(x => supplierIds.Contains(x.SupplierId))
                    .ToDictionaryAsync(x => x.SupplierId, x => x.DisplayName);

        return new OutsourcedPartsDto
        {
            JobCardNo = card.JobCardNo,
            CanAdd = Ws.Workable.Contains(card.Status),
            CanAboveMrp = canAboveMrp,
            Today = HrCalendar.Day(HrCalendar.Today()),
            Suppliers = suppliers,
            Lines =
                rows.Select(x => new OutsourcedPartDto
                {
                    Id = x.JobCardOutsourcedPartId,
                    PublicId = x.PublicId,
                    PurchaseNo = x.PurchaseNo,
                    PurchaseDate = HrCalendar.Day(x.PurchaseDate),
                    ItemKind = x.ItemKind,
                    ItemId = x.ItemId,
                    ItemCode = x.ItemCode,
                    ItemName = x.ItemName,
                    SupplierId = x.SupplierId,
                    VendorName = x.SupplierId != null && names.TryGetValue(x.SupplierId.Value, out string? name) ? name : x.VendorName,
                    BillNo = x.BillNo,
                    Quantity = x.Quantity,
                    CostRate = x.CostRate,
                    CostAmount = x.CostAmount,
                    Mrp = x.Mrp,
                    SellRate = x.SellRate,
                    SellAmount = x.SellAmount,
                    Status = x.Status,
                    CancelReason = x.CancelReason,
                    Note = x.Note
                })
                .ToList(),
            CostTotal = rows.Where(x => x.Status == Wo.Posted).Sum(x => x.CostAmount),
            SellTotal = rows.Where(x => x.Status == Wo.Posted).Sum(x => x.SellAmount)
        };
    }

    public async Task<OutsourcedPartsDto> GetAsync(Guid jobCardPublicId, bool canAboveMrp) =>
        await ReadAsync(await CardAsync(jobCardPublicId), canAboveMrp);


    //===========================================================
    // A part is bought outside
    //===========================================================

    public async Task<OutsourcedPartsDto> AddAsync(Guid jobCardPublicId, SaveOutsourcedPartDto dto, bool canAboveMrp, long userId)
    {
        JobCards card = await CardAsync(jobCardPublicId);

        // The stages go in order : outsourcing for an assigned card only
        if (!Ws.Workable.Contains(card.Status))
        {
            throw new InvalidOperationException(card.Status == Ws.Open ? Ws.NotWorkable(card.JobCardNo, card.Status) : $"{card.JobCardNo} is {card.Status} : a part cannot be outsourced for it.");
        }

        DateOnly date =
            HrCalendar.ParseDay(dto.PurchaseDate)
            ?? throw new InvalidOperationException("Give the date the part was bought.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The date cannot be in the future.");
        }

        decimal quantity = Ws.Round(dto.Quantity);
        decimal costRate = Ws.Round(dto.CostRate);
        decimal sellRate = Ws.Round(dto.SellRate);

        if (quantity <= 0m)
        {
            throw new InvalidOperationException("Give the quantity.");
        }

        if (costRate <= 0m)
        {
            throw new InvalidOperationException("Give the cost : what the vendor charges for one.");
        }

        if (sellRate < 0m)
        {
            throw new InvalidOperationException("The selling rate cannot be below 0.");
        }

        //-------------------------------------------------------
        // The part : of the product lists, or typed
        //-------------------------------------------------------

        string kind = (dto.ItemKind ?? string.Empty).Trim();

        string code;
        string name;
        string itemWip = string.Empty;
        decimal? mrp = null;
        long? itemId = null;

        bool work = kind == Wo.OutsideWork;

        if (work)
        {
            WorkshopOutsideWorks listed =
                await _context.Set<WorkshopOutsideWorks>().AsNoTracking().FirstOrDefaultAsync(x => x.WorkshopOutsideWorkId == dto.ItemId && !x.IsDeleted)
                ?? throw new InvalidOperationException("Pick the outside work (the list is in Workshop Configuration, tab Outside Works).");

            if (!listed.IsActive)
            {
                throw new InvalidOperationException($"{listed.Name} is not active (Workshop Configuration, tab Outside Works).");
            }

            itemId = listed.WorkshopOutsideWorkId;
            code = listed.Code;
            name = Wp.Limit(listed.Name, 200);
        }
        else if ((kind == Wp.SparePart || kind == Wp.Accessory) && dto.ItemId != null)
        {
            itemId = dto.ItemId.Value;

            if (kind == Wp.SparePart)
            {
                var part =
                    await _context.Set<SpareParts>().AsNoTracking()
                        .Where(x => x.SparePartId == itemId && !x.IsDeleted)
                        .Select(x => new { x.PartNumber, x.ProductCode, Name = x.PartName, x.WipLedgerCode })
                        .FirstOrDefaultAsync()
                    ?? throw new InvalidOperationException("The part was not found in the product lists.");

                code = Wp.Limit(string.IsNullOrWhiteSpace(part.PartNumber) ? part.ProductCode : part.PartNumber, 40);
                name = Wp.Limit(part.Name, 200);
                itemWip = (part.WipLedgerCode ?? string.Empty).Trim();
            }
            else
            {
                var part =
                    await _context.Set<Accessories>().AsNoTracking()
                        .Where(x => x.AccessoryId == itemId && !x.IsDeleted)
                        .Select(x => new { x.PartNumber, x.ProductCode, Name = x.AccessoryName, x.WipLedgerCode })
                        .FirstOrDefaultAsync()
                    ?? throw new InvalidOperationException("The accessory was not found in the product lists.");

                code = Wp.Limit(string.IsNullOrWhiteSpace(part.PartNumber) ? part.ProductCode : part.PartNumber, 40);
                name = Wp.Limit(part.Name, 200);
                itemWip = (part.WipLedgerCode ?? string.Empty).Trim();
            }

            // The business lines of the service center (Business
            // Configuration)
            HashSet<string> lines = await Ws.BranchLinesAsync(_context, card.BranchId);

            if (!lines.Contains(Ws.PartLine(kind)))
            {
                throw new InvalidOperationException($"{name} : {Ws.PartLine(kind)} is not a business line of this service center (Settings > Business Configuration).");
            }

            // The price of Price Setup
            mrp =
                (await _catalogue.GetPartsAsync())
                .Where(x => x.Kind == kind && x.Id == itemId)
                .Select(x => x.Price)
                .FirstOrDefault();

            if (mrp != null && mrp.Value > 0m && sellRate > mrp.Value && !canAboveMrp)
            {
                throw new InvalidOperationException($"{name} : the price is {mrp.Value:N2}. Selling above it needs the page action Sell Above MRP (Security & Permission > Activity Assignment, Job Cards).");
            }
        }
        else
        {
            kind = Wo.Other;
            code = Ws.Clean(dto.ItemCode, 40, "Part No");
            name = Ws.Clean(dto.ItemName, 200, "Part");

            if (name.Length == 0)
            {
                throw new InvalidOperationException("Pick the part, or type its name.");
            }
        }

        //-------------------------------------------------------
        // The vendor : a Supplier Profile, or typed
        //-------------------------------------------------------

        long? supplierId = null;
        string supplierCode = string.Empty;
        string vendor;
        string payable;

        if (dto.SupplierId != null)
        {
            SupplierProfiles supplier =
                await _context.Set<SupplierProfiles>().AsNoTracking().FirstOrDefaultAsync(x => x.SupplierId == dto.SupplierId && !x.IsDeleted)
                ?? throw new InvalidOperationException("The supplier was not found.");

            if (!supplier.IsActive)
            {
                throw new InvalidOperationException($"{supplier.DisplayName} is not active.");
            }

            supplierId = supplier.SupplierId;
            supplierCode = (supplier.SupplierCode ?? string.Empty).Trim();
            vendor = Wp.Limit(supplier.DisplayName, 150);
            payable = (supplier.PayableLedgerCode ?? string.Empty).Trim();

            if (payable.Length == 0)
            {
                throw new InvalidOperationException($"{supplier.DisplayName} has no payable ledger (Supplier Profiles).");
            }
        }
        else
        {
            vendor = Ws.Clean(dto.VendorName, 150, "Vendor");

            if (vendor.Length == 0)
            {
                throw new InvalidOperationException("Pick the supplier, or type the name of the vendor.");
            }

            payable = PostingLedgerCodes.TryGet(_context, work ? Sb.PurposeOutsidePayable : Wo.PurposePayable);

            if (payable.Length == 0)
            {
                throw new InvalidOperationException($"The vendor is typed : select the {(work ? "Outside Work Payable" : "Outsourced Parts Payable")} ledger ({Wo.PostingPage}), or pick a supplier.");
            }
        }

        //-------------------------------------------------------
        // Workshop WIP.
        //   A part of the product lists : the ledger of Posting Setup
        //     (Workshop WIP), else the one of the part - as a parts
        //     issue does.
        //   A typed part / an outside work (no product behind it) :
        //     its own ledger of Posting Setup (Outsourced Parts WIP /
        //     Outside Work WIP), else Workshop WIP.
        //-------------------------------------------------------

        string wipOfSetup = PostingLedgerCodes.TryGet(_context, Wp.PurposeWip);

        string wip;

        if (itemId != null && !work)
        {
            wip = wipOfSetup.Length > 0 ? wipOfSetup : itemWip;
        }
        else
        {
            string own = PostingLedgerCodes.TryGet(_context, work ? Wo.PurposeWorkWip : Wo.PurposePartsWip);

            wip = own.Length > 0 ? own : wipOfSetup;
        }

        if (wip.Length == 0)
        {
            throw new InvalidOperationException(
                work ? $"Select the Outside Work WIP ledger ({Wo.PostingPage})."
                : itemId == null ? $"Select the Outsourced Parts WIP ledger ({Wo.PostingPage})."
                : $"Select the Workshop WIP ledger ({Wo.PostingPage}).");
        }

        // Fails here when the financial year of the date is not open
        await _numberService.ResolvePeriodAsync(card.BranchId, date);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        DateTime now = DateTime.UtcNow;

        var entity =
            new JobCardOutsourcedParts
            {
                PurchaseNo = (await _numberService.NextAsync(VoucherTypes.WorkshopOutsourcedPart, card.BranchId, date)).VoucherNo,
                PurchaseDate = date,
                BranchId = card.BranchId,
                JobCardId = card.JobCardId,
                ItemKind = kind,
                ItemId = itemId,
                ItemCode = code,
                ItemName = name,
                SupplierId = supplierId,
                SupplierCode = supplierCode,
                VendorName = vendor,
                BillNo = Ws.Clean(dto.BillNo, 60, "Bill No"),
                Quantity = quantity,
                CostRate = costRate,
                CostAmount = Ws.Round(quantity * costRate),
                Mrp = mrp,
                SellRate = sellRate,
                SellAmount = Ws.Round(quantity * sellRate),
                WipLedgerCode = wip,
                PayableLedgerCode = payable,
                Status = Wo.Posted,
                Note = Ws.Clean(dto.Note, 200, "Note"),
                CreatedBy = userId,
                CreatedDate = now
            };

        Rows.Add(entity);

        await _context.SaveChangesAsync();

        // The labour line of the same outside work that came from the
        // estimate is replaced by this entry (it would be billed twice)
        if (work)
        {
            List<JobCardServices> quoted =
                await _context.Set<JobCardServices>().Where(x => x.JobCardId == card.JobCardId && x.ItemKind == Wo.Other && x.ItemCode == code).ToListAsync();

            _context.Set<JobCardServices>().RemoveRange(quoted);
        }

        string narration =
            Wp.Limit(work
                ? $"{name} done by {vendor} for job card {card.JobCardNo} ({card.CustomerName})"
                : $"{name} x {Wp.Qty(quantity)} bought from {vendor} for job card {card.JobCardNo} ({card.CustomerName})", 300);

        await _postingService.PostAsync(
            new VoucherPostingRequest
            {
                VoucherType = VoucherTypes.WorkshopOutsourcedPart,
                VoucherId = entity.JobCardOutsourcedPartId,
                VoucherNo = entity.PurchaseNo,
                VoucherDate = date,
                BranchId = card.BranchId,
                ReferenceNo = card.JobCardNo,
                Narration = narration,
                Lines =
                    new List<VoucherPostingLine>
                    {
                        new VoucherPostingLine { GroupNo = 1, LedgerCode = wip, Debit = entity.CostAmount, Narration = narration },
                        new VoucherPostingLine
                        {
                            GroupNo = 1,
                            LedgerCode = payable,
                            Credit = entity.CostAmount,
                            Narration = narration,
                            PartyType = supplierCode.Length > 0 ? Wo.PartySupplier : string.Empty,
                            PartyCode = supplierCode
                        }
                    }
            },
            userId);

        Ws.AddHistory(_context, CardEntity, card.JobCardId, "Update", work ? "Outside Work Posted" : "Part Outsourced", $"{card.JobCardNo} : {entity.PurchaseNo}, {name} x {Wp.Qty(quantity)} {(work ? "by" : "from")} {vendor}, cost {entity.CostAmount:N2}, billed {entity.SellAmount:N2}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await ReadAsync(card, canAboveMrp);
    }


    //===========================================================
    // An entry is cancelled : its journal is reversed
    //===========================================================

    public async Task<OutsourcedPartsDto> CancelAsync(Guid jobCardPublicId, Guid publicId, CancelOutsourcedPartDto dto, bool canAboveMrp, long userId)
    {
        JobCards card = await CardAsync(jobCardPublicId);

        JobCardOutsourcedParts entity =
            await Rows.FirstOrDefaultAsync(x => x.PublicId == publicId && x.JobCardId == card.JobCardId)
            ?? throw new KeyNotFoundException("The outsourced part was not found.");

        if (entity.Status != Wo.Posted)
        {
            throw new InvalidOperationException($"{entity.PurchaseNo} is {entity.Status} already.");
        }

        if (await _context.Set<ServiceInvoices>().AsNoTracking().AnyAsync(x => x.JobCardId == card.JobCardId && x.Status == Sb.Posted))
        {
            throw new InvalidOperationException($"{card.JobCardNo} is invoiced : {entity.PurchaseNo} is billed on it. Return the invoice first (Service Returns).");
        }

        string reason = Ws.Clean(dto.Reason, 300, "Reason");

        if (reason.Length == 0)
        {
            throw new InvalidOperationException("Give the reason.");
        }

        DateOnly today = HrCalendar.Today();

        DateOnly date = today < entity.PurchaseDate ? entity.PurchaseDate : today;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (await _postingService.IsPostedAsync(entity.PurchaseNo))
        {
            await _postingService.ReverseAsync(entity.PurchaseNo, date, reason, userId);
        }

        entity.Status = Wo.Cancelled;
        entity.CancelReason = reason;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, CardEntity, card.JobCardId, "Update", entity.ItemKind == Wo.OutsideWork ? "Outside Work Cancelled" : "Outsourced Part Cancelled", $"{card.JobCardNo} : {entity.PurchaseNo} ({entity.ItemName} x {Wp.Qty(entity.Quantity)}, {entity.VendorName}) cancelled. {reason}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await ReadAsync(card, canAboveMrp);
    }
}
