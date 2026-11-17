//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.Platform.Accounting;
using AppCore.Application.ServiceOperations;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.ServiceOperations;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Domain.Entities.Settings.ProductSettings;
using AppCore.Domain.Platform.Accounting;
using AppCore.Domain.Platform.Inventory;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.ServiceOperations;


//===============================================================
// What the parts documents and the job cards share (hand-written
// pages, 2026-11-16; NEVER run Code Sync for them; tables made by
// ServiceOperations_Parts_Engine.sql)
//===============================================================

internal static class Wp
{
    //-----------------------------------------------------------
    // Requisition statuses
    //-----------------------------------------------------------

    public const string Open = "Open";

    public const string PartlyIssued = "Partly Issued";

    public const string Issued = "Issued";

    // The rest is not needed any more
    public const string Closed = "Closed";

    public const string Cancelled = "Cancelled";

    // Still waiting for parts
    public static readonly string[] Waiting = { Open, PartlyIssued };

    public const string Posted = "Posted";

    //-----------------------------------------------------------
    // Items : the kinds of the job card and the product types of
    // the stock ledger (lubricants are spare parts there)
    //-----------------------------------------------------------

    public const string SparePart = "SparePart";

    public const string Accessory = "Accessory";

    public static string ProductType(string kind) =>
        kind == Accessory ? "AC" : "SP";

    //-----------------------------------------------------------
    // Stock ledger words (as the sales invoices write them)
    //-----------------------------------------------------------

    public const string BucketOnHand = "OnHand";

    public const string BatchOnHand = "OnHand";

    public const string BatchClosed = "Closed";

    public const string BatchInTransit = "InTransit";

    public const string BatchCancelled = "Cancelled";

    public const string MoveIssue = "PartsIssue";

    public const string MoveReturn = "PartsReturn";

    public const string PurposeWip = "WORKSHOP-WIP";

    public static string Qty(decimal value) => value.ToString("0.##");

    public static string Limit(string? value, int max)
    {
        string text = (value ?? string.Empty).Trim();

        return text.Length > max ? text.Substring(0, max) : text;
    }

    // Parts issued to a job card and not returned (quantity)
    public static async Task<decimal> NetIssuedAsync(AppDbContext context, long jobCardId)
    {
        List<long> issueIds =
            await context.Set<PartsIssues>().AsNoTracking().Where(x => x.JobCardId == jobCardId).Select(x => x.PartsIssueId).ToListAsync();

        if (issueIds.Count == 0)
        {
            return 0m;
        }

        return await context.Set<PartsIssueLines>().AsNoTracking()
            .Where(x => issueIds.Contains(x.PartsIssueId))
            .SumAsync(x => x.Quantity - x.ReturnedQuantity);
    }
}


//===============================================================
// Parts Requisitions, Parts Issues, Parts Returns, Parts Back-
// Orders
//
// Stock : exactly as the sales invoices move it. One batch per
// purchase line with its cost; a warehouse's stock is the sum of
// its OnHand movements. An issue takes the oldest batches first
// (FIFO), writes a movement and an allocation per batch slice and
// lowers the batch; a return puts the quantity back into the
// slices the issue took, at their cost.
//
// Accounting : through the voucher posting engine, under the
// number of the document (WPI / WPR).
//   Issue  : Dr Workshop WIP        Cr inventory (FIFO cost)
//   Return : Dr inventory           Cr Workshop WIP
// Workshop WIP : the ledger of Posting Setup (WORKSHOP-WIP) when
// one is selected, else the WIP ledger of the item.
//===============================================================

public class WorkshopPartsRepository
    : IWorkshopPartsRepository
{
    // The number a requisition would get (nothing is taken); a
    // text when no open financial year covers the date
    private async Task<string> PeekRequisitionNoAsync(long branchId, DateOnly date)
    {
        try
        {
            return (await _numberService.PeekAsync(VoucherTypes.PartsRequisition, branchId, date)).VoucherNo;
        }
        catch (InvalidOperationException)
        {
            return "Given when it is saved";
        }
    }

    private const string RequisitionEntity = "PartsRequisitions";

    private const string IssueEntity = "PartsIssues";

    private const string ReturnEntity = "PartsReturns";

    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;

    private readonly IVoucherPostingService _postingService;

    public WorkshopPartsRepository(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVoucherPostingService postingService)
    {
        _context = context;
        _numberService = numberService;
        _postingService = postingService;
    }

    private DbSet<JobCards> Cards => _context.Set<JobCards>();

    private DbSet<PartsRequisitions> Requisitions => _context.Set<PartsRequisitions>();

    private DbSet<PartsRequisitionLines> RequisitionLines => _context.Set<PartsRequisitionLines>();

    private DbSet<PartsIssues> Issues => _context.Set<PartsIssues>();

    private DbSet<PartsIssueLines> IssueLines => _context.Set<PartsIssueLines>();

    private DbSet<PartsReturns> Returns => _context.Set<PartsReturns>();

    private DbSet<PartsReturnLines> ReturnLines => _context.Set<PartsReturnLines>();


    //===========================================================
    // Items (spare parts, lubricants, accessories)
    //===========================================================

    private sealed class Item
    {
        public string Kind { get; init; } = string.Empty;

        public long Id { get; init; }

        public string Code { get; init; } = string.Empty;

        public string Name { get; init; } = string.Empty;

        public string InventoryLedgerCode { get; init; } = string.Empty;

        public string WipLedgerCode { get; init; } = string.Empty;

        public bool IsActive { get; init; }
    }

    private static string Key(string kind, long id) => $"{kind}:{id}";

    private async Task<Dictionary<string, Item>> ItemsAsync(IEnumerable<PartsLineDto> lines)
    {
        List<long> spareIds = lines.Where(x => x.ItemKind == Wp.SparePart).Select(x => x.ItemId).Distinct().ToList();
        List<long> accessoryIds = lines.Where(x => x.ItemKind == Wp.Accessory).Select(x => x.ItemId).Distinct().ToList();

        var items = new Dictionary<string, Item>();

        if (spareIds.Count > 0)
        {
            foreach (var x in await _context.Set<SpareParts>().AsNoTracking()
                         .Where(x => spareIds.Contains(x.SparePartId) && !x.IsDeleted)
                         .Select(x => new { x.SparePartId, x.PartNumber, x.ProductCode, x.PartName, x.InventoryLedgerCode, x.WipLedgerCode, x.IsActive })
                         .ToListAsync())
            {
                items[Key(Wp.SparePart, x.SparePartId)] =
                    new Item
                    {
                        Kind = Wp.SparePart,
                        Id = x.SparePartId,
                        Code = Wp.Limit(string.IsNullOrWhiteSpace(x.PartNumber) ? x.ProductCode : x.PartNumber, 40),
                        Name = Wp.Limit(x.PartName, 200),
                        InventoryLedgerCode = (x.InventoryLedgerCode ?? string.Empty).Trim(),
                        WipLedgerCode = (x.WipLedgerCode ?? string.Empty).Trim(),
                        IsActive = x.IsActive
                    };
            }
        }

        if (accessoryIds.Count > 0)
        {
            foreach (var x in await _context.Set<Accessories>().AsNoTracking()
                         .Where(x => accessoryIds.Contains(x.AccessoryId) && !x.IsDeleted)
                         .Select(x => new { x.AccessoryId, x.PartNumber, x.ProductCode, x.AccessoryName, x.InventoryLedgerCode, x.WipLedgerCode, x.IsActive })
                         .ToListAsync())
            {
                items[Key(Wp.Accessory, x.AccessoryId)] =
                    new Item
                    {
                        Kind = Wp.Accessory,
                        Id = x.AccessoryId,
                        Code = Wp.Limit(string.IsNullOrWhiteSpace(x.PartNumber) ? x.ProductCode : x.PartNumber, 40),
                        Name = Wp.Limit(x.AccessoryName, 200),
                        InventoryLedgerCode = (x.InventoryLedgerCode ?? string.Empty).Trim(),
                        WipLedgerCode = (x.WipLedgerCode ?? string.Empty).Trim(),
                        IsActive = x.IsActive
                    };
            }
        }

        return items;
    }

    // The parts of a document belong to business lines the service
    // center runs (Business Configuration)
    private async Task CheckBusinessLinesAsync(long branchId, List<PartsLineDto> lines)
    {
        HashSet<string> own = await Ws.BranchLinesAsync(_context, branchId);

        foreach (string line in lines.Select(x => Ws.PartLine(x.ItemKind)).Distinct())
        {
            if (!own.Contains(line))
            {
                throw new InvalidOperationException($"{line} is not a business line of this service center (Settings > Business Configuration) : remove those lines.");
            }
        }
    }

    // The lines of a document as they are sent : every line a known
    // item, a quantity, no item twice
    private async Task<Dictionary<string, Item>> CheckLinesAsync(List<PartsLineDto> lines)
    {
        if (lines.Count == 0)
        {
            throw new InvalidOperationException("Put one part on the document at least.");
        }

        foreach (PartsLineDto line in lines)
        {
            line.ItemKind = (line.ItemKind ?? string.Empty).Trim();

            if (line.ItemKind != Wp.SparePart && line.ItemKind != Wp.Accessory)
            {
                throw new InvalidOperationException("Only spare parts, lubricants and accessories of the product lists can be on a parts document.");
            }

            line.Quantity = Ws.Round(line.Quantity);
        }

        Dictionary<string, Item> items = await ItemsAsync(lines);

        var seen = new HashSet<string>();

        foreach (PartsLineDto line in lines)
        {
            string key = Key(line.ItemKind, line.ItemId);

            if (!items.TryGetValue(key, out Item? item))
            {
                throw new InvalidOperationException("A part of the document was not found in the product lists.");
            }

            if (line.Quantity <= 0)
            {
                throw new InvalidOperationException($"{item.Name} : give the quantity.");
            }

            if (!seen.Add(key))
            {
                throw new InvalidOperationException($"{item.Name} is on the document twice : put it on one line.");
            }
        }

        return items;
    }


    //===========================================================
    // Names
    //===========================================================

    private sealed class Names
    {
        public Dictionary<long, string> Branches { get; init; } = new();

        public Dictionary<long, string> Warehouses { get; init; } = new();

        public Dictionary<long, string> Employees { get; init; } = new();

        // technician id : the employee's name
        public Dictionary<long, string> Technicians { get; init; } = new();

        public Dictionary<long, JobCards> Cards { get; init; } = new();

        public static string Of(Dictionary<long, string> names, long? id) =>
            id != null && names.TryGetValue(id.Value, out string? name) ? name : string.Empty;
    }

    private async Task<Names> NamesAsync(IEnumerable<long> cardIds)
    {
        List<long> ids = cardIds.Distinct().ToList();

        Dictionary<long, string> employees =
            (await _context.Set<HrEmployees>().AsNoTracking().Select(x => new { x.EmployeeId, x.FullName }).ToListAsync())
            .ToDictionary(x => x.EmployeeId, x => x.FullName);

        return new Names
        {
            Branches = await Ws.BranchNamesAsync(_context),
            Warehouses =
                (await _context.Set<Warehouses>().AsNoTracking().Select(x => new { x.WarehouseId, x.WarehouseName }).ToListAsync())
                .ToDictionary(x => x.WarehouseId, x => x.WarehouseName),
            Employees = employees,
            Technicians =
                (await _context.Set<WorkshopTechnicians>().AsNoTracking().Select(x => new { x.WorkshopTechnicianId, x.EmployeeId, x.Code }).ToListAsync())
                .ToDictionary(x => x.WorkshopTechnicianId, x => employees.TryGetValue(x.EmployeeId, out string? name) ? name : x.Code),
            Cards =
                (await Cards.AsNoTracking().Where(x => ids.Contains(x.JobCardId)).ToListAsync())
                .ToDictionary(x => x.JobCardId)
        };
    }

    private static void FillCard(PartsDocumentDto dto, long jobCardId, Names names)
    {
        if (!names.Cards.TryGetValue(jobCardId, out JobCards? card))
        {
            return;
        }

        dto.JobCardPublicId = card.PublicId;
        dto.JobCardNo = card.JobCardNo;
        dto.JobCardStatus = card.Status;
        dto.CustomerName = card.CustomerName;
        dto.Mobile = card.Mobile;
        dto.ModelName = card.ModelName;
        dto.BikeNo = card.RegistrationNo.Length > 0 ? card.RegistrationNo : card.ChassisNo;
    }

    private static string CardText(JobCards x) =>
        string.Join("  |  ", new[] { x.JobCardNo, x.CustomerName, x.ModelName, x.RegistrationNo.Length > 0 ? x.RegistrationNo : x.ChassisNo }.Where(v => !string.IsNullOrWhiteSpace(v)));


    //===========================================================
    // Lookups
    //===========================================================

    public async Task<PartsLookupsDto> GetLookupsAsync()
    {
        List<JobCards> cards =
            await Cards.AsNoTracking()
                .Where(x => !x.IsDeleted && Ws.Workable.Contains(x.Status))
                .OrderByDescending(x => x.JobCardId)
                .ToListAsync();

        Dictionary<long, JobCards> allCards =
            (await Cards.AsNoTracking().Where(x => !x.IsDeleted).Select(x => new JobCards { JobCardId = x.JobCardId, PublicId = x.PublicId, JobCardNo = x.JobCardNo, CustomerName = x.CustomerName, Status = x.Status }).ToListAsync())
            .ToDictionary(x => x.JobCardId);

        List<PartsRequisitions> requisitions =
            await Requisitions.AsNoTracking()
                .Where(x => !x.IsDeleted && Wp.Waiting.Contains(x.Status))
                .OrderByDescending(x => x.PartsRequisitionId)
                .ToListAsync();

        // Issues something can still come back of (the job is not
        // invoiced yet)
        List<long> returnable =
            await IssueLines.AsNoTracking()
                .Where(x => x.Quantity > x.ReturnedQuantity)
                .Select(x => x.PartsIssueId)
                .Distinct()
                .ToListAsync();

        List<PartsIssues> issues =
            await Issues.AsNoTracking()
                .Where(x => returnable.Contains(x.PartsIssueId))
                .OrderByDescending(x => x.PartsIssueId)
                .ToListAsync();

        Dictionary<long, string> employees =
            (await _context.Set<HrEmployees>().AsNoTracking().Select(x => new { x.EmployeeId, x.FullName }).ToListAsync())
            .ToDictionary(x => x.EmployeeId, x => x.FullName);

        return new PartsLookupsDto
        {
            Today = HrCalendar.Day(HrCalendar.Today()),
            NextRequisitionNo = "Given when it is saved",
            JobCards =
                cards.Select(x => new PartsOptionDto { PublicId = x.PublicId, No = x.JobCardNo, Text = CardText(x), BranchId = x.BranchId, JobCardPublicId = x.PublicId }).ToList(),
            Requisitions =
                requisitions
                    .Where(x => allCards.TryGetValue(x.JobCardId, out JobCards? card) && Ws.Workable.Contains(card.Status))
                    .Select(x => new PartsOptionDto
                    {
                        PublicId = x.PublicId,
                        No = x.RequisitionNo,
                        Text = $"{x.RequisitionNo}  |  {allCards[x.JobCardId].JobCardNo}  |  {allCards[x.JobCardId].CustomerName}  |  {x.Status}",
                        BranchId = x.BranchId,
                        JobCardPublicId = allCards[x.JobCardId].PublicId
                    })
                    .ToList(),
            Issues =
                issues
                    .Where(x => allCards.TryGetValue(x.JobCardId, out JobCards? card) && card.Status != Ws.Invoiced && card.Status != Ws.Delivered)
                    .Select(x => new PartsOptionDto
                    {
                        PublicId = x.PublicId,
                        No = x.IssueNo,
                        Text = $"{x.IssueNo}  |  {allCards[x.JobCardId].JobCardNo}  |  {allCards[x.JobCardId].CustomerName}",
                        BranchId = x.BranchId,
                        JobCardPublicId = allCards[x.JobCardId].PublicId
                    })
                    .ToList(),
            Warehouses =
                await _context.Set<Warehouses>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderByDescending(x => x.IsDefault).ThenBy(x => x.WarehouseName)
                    .Select(x => new WsLookupDto { Id = x.WarehouseId, Code = x.WarehouseCode, Name = x.WarehouseName, BranchId = x.BranchId })
                    .ToListAsync(),
            Employees = await Ws.EmployeesAsync(_context),
            Technicians =
                (await _context.Set<WorkshopTechnicians>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.Code)
                    .ToListAsync())
                .Select(x => new WsLookupDto
                {
                    Id = x.WorkshopTechnicianId,
                    Code = x.Code,
                    Name = employees.TryGetValue(x.EmployeeId, out string? name) ? name : x.Code,
                    BranchId = x.BranchId
                })
                .ToList(),
            IssueWithoutRequisition = (await Ws.SwitchesAsync(_context)).IssueWithoutRequisition
        };
    }

    // What a warehouse holds now, item by item
    public async Task<List<PartsStockDto>> GetStockAsync(long warehouseId)
    {
        var sums =
            await _context.Set<StockMovements>().AsNoTracking()
                .Where(x => x.Bucket == Wp.BucketOnHand && x.WarehouseId == warehouseId && (x.ProductType == "SP" || x.ProductType == "AC"))
                .GroupBy(x => new { x.ProductType, x.ProductId })
                .Select(g => new { g.Key.ProductType, g.Key.ProductId, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                .ToListAsync();

        return sums
            .Where(x => x.Quantity > 0)
            .Select(x => new PartsStockDto { ItemKind = x.ProductType == "AC" ? Wp.Accessory : Wp.SparePart, ItemId = x.ProductId, OnHand = x.Quantity })
            .ToList();
    }

    private async Task<JobCards> OpenCardAsync(Guid jobCardPublicId, string what)
    {
        JobCards card =
            await Cards.FirstOrDefaultAsync(x => x.PublicId == jobCardPublicId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Pick the job card.");

        // The stages go in order : parts for an assigned card only
        if (!Ws.Workable.Contains(card.Status))
        {
            throw new InvalidOperationException(card.Status == Ws.Open ? Ws.NotWorkable(card.JobCardNo, card.Status) : $"{card.JobCardNo} is {card.Status} : {what}.");
        }

        return card;
    }


    //===========================================================
    // Parts Requisitions
    //===========================================================

    private static List<string> NextOf(string status) =>
        status switch
        {
            Wp.Open => new List<string> { Wp.Cancelled },
            Wp.PartlyIssued => new List<string> { Wp.Closed },
            _ => new List<string>()
        };

    private static PartsDocumentDto Head(PartsRequisitions x, Names names)
    {
        var dto =
            new PartsDocumentDto
            {
                Id = x.PartsRequisitionId,
                PublicId = x.PublicId,
                DocumentNo = x.RequisitionNo,
                DocumentDate = HrCalendar.Day(x.RequisitionDate),
                BranchId = x.BranchId,
                BranchName = Names.Of(names.Branches, x.BranchId),
                PersonId = x.RequestedByEmployeeId,
                PersonName = Names.Of(names.Employees, x.RequestedByEmployeeId),
                Status = x.Status,
                Remarks = x.Remarks,
                CanEdit = x.Status == Wp.Open,
                NextStatuses = NextOf(x.Status)
            };

        FillCard(dto, x.JobCardId, names);

        return dto;
    }

    public async Task<List<PartsDocumentDto>> GetRequisitionsAsync()
    {
        List<PartsRequisitions> rows =
            await Requisitions.AsNoTracking().Where(x => !x.IsDeleted).OrderByDescending(x => x.PartsRequisitionId).ToListAsync();

        Names names = await NamesAsync(rows.Select(x => x.JobCardId));

        var totals =
            (await RequisitionLines.AsNoTracking()
                .GroupBy(x => x.PartsRequisitionId)
                .Select(g => new { g.Key, Quantity = g.Sum(x => x.Quantity) })
                .ToListAsync())
            .ToDictionary(x => x.Key, x => x.Quantity);

        return rows
            .Select(x =>
            {
                PartsDocumentDto dto = Head(x, names);

                dto.TotalQuantity = totals.TryGetValue(x.PartsRequisitionId, out decimal quantity) ? quantity : 0m;

                return dto;
            })
            .ToList();
    }

    private async Task<PartsDocumentDto> FullAsync(PartsRequisitions requisition)
    {
        PartsDocumentDto dto = Head(requisition, await NamesAsync(new[] { requisition.JobCardId }));

        dto.Lines =
            (await RequisitionLines.AsNoTracking()
                .Where(x => x.PartsRequisitionId == requisition.PartsRequisitionId)
                .OrderBy(x => x.LineNo)
                .ToListAsync())
            .Select(x => new PartsLineDto
            {
                LineId = x.PartsRequisitionLineId,
                ItemKind = x.ItemKind,
                ItemId = x.ItemId,
                ItemCode = x.ItemCode,
                ItemName = x.ItemName,
                Quantity = x.Quantity,
                IssuedQuantity = x.IssuedQuantity,
                Note = x.Note
            })
            .ToList();

        dto.TotalQuantity = dto.Lines.Sum(x => x.Quantity);

        return dto;
    }

    public async Task<PartsDocumentDto> GetRequisitionAsync(Guid publicId)
    {
        PartsRequisitions requisition =
            await Requisitions.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The requisition was not found.");

        return await FullAsync(requisition);
    }

    // A new requisition, not saved yet : the parts the job card
    // needs that no requisition asked for yet
    public async Task<PartsDocumentDto> GetRequisitionDraftAsync(Guid jobCardPublicId)
    {
        JobCards card = await OpenCardAsync(jobCardPublicId, "parts cannot be asked for it");

        var names = await NamesAsync(new[] { card.JobCardId });

        var dto =
            new PartsDocumentDto
            {
                DocumentNo = await PeekRequisitionNoAsync(card.BranchId, HrCalendar.Today()),
                DocumentDate = HrCalendar.Day(HrCalendar.Today()),
                BranchId = card.BranchId,
                BranchName = Names.Of(names.Branches, card.BranchId),
                Status = Wp.Open,
                CanEdit = true
            };

        FillCard(dto, card.JobCardId, names);

        // What live requisitions of the card ask for already
        List<long> liveIds =
            await Requisitions.AsNoTracking()
                .Where(x => x.JobCardId == card.JobCardId && !x.IsDeleted && x.Status != Wp.Cancelled)
                .Select(x => x.PartsRequisitionId)
                .ToListAsync();

        var asked =
            (await RequisitionLines.AsNoTracking().Where(x => liveIds.Contains(x.PartsRequisitionId)).ToListAsync())
            .GroupBy(x => Key(x.ItemKind, x.ItemId))
            .ToDictionary(x => x.Key, x => x.Sum(y => y.Quantity));

        foreach (JobCardParts part in await _context.Set<JobCardParts>().AsNoTracking().Where(x => x.JobCardId == card.JobCardId).OrderBy(x => x.LineNo).ToListAsync())
        {
            if (part.ItemId == null || (part.ItemKind != Wp.SparePart && part.ItemKind != Wp.Accessory))
            {
                continue;
            }

            decimal left = part.Quantity - (asked.TryGetValue(Key(part.ItemKind, part.ItemId.Value), out decimal done) ? done : 0m);

            if (left <= 0)
            {
                continue;
            }

            dto.Lines.Add(
                new PartsLineDto
                {
                    ItemKind = part.ItemKind,
                    ItemId = part.ItemId.Value,
                    ItemCode = part.ItemCode,
                    ItemName = part.ItemName,
                    Quantity = left,
                    Note = part.Note
                });
        }

        dto.TotalQuantity = dto.Lines.Sum(x => x.Quantity);

        return dto;
    }

    public async Task<PartsDocumentDto> SaveRequisitionAsync(Guid? publicId, SavePartsRequisitionDto dto, long userId)
    {
        DateOnly date =
            HrCalendar.ParseDay(dto.RequisitionDate)
            ?? throw new InvalidOperationException("Give the date of the requisition.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The date of a requisition cannot be in the future.");
        }

        if (dto.RequestedByEmployeeId != null
            && !await _context.Set<HrEmployees>().AsNoTracking().AnyAsync(x => x.EmployeeId == dto.RequestedByEmployeeId))
        {
            throw new InvalidOperationException("The employee who asks was not found.");
        }

        List<PartsLineDto> lines = dto.Lines ?? new();

        Dictionary<string, Item> items = await CheckLinesAsync(lines);

        PartsRequisitions entity;

        if (publicId == null)
        {
            JobCards card = await OpenCardAsync(dto.JobCardPublicId, "parts cannot be asked for it");

            entity =
                new PartsRequisitions
                {
                    RequisitionNo = string.Empty,
                    BranchId = card.BranchId,
                    JobCardId = card.JobCardId,
                    Status = Wp.Open,
                    StatusDate = DateTime.UtcNow,
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                };
        }
        else
        {
            entity =
                await Requisitions.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
                ?? throw new KeyNotFoundException("The requisition was not found.");

            if (entity.Status != Wp.Open)
            {
                throw new InvalidOperationException($"{entity.RequisitionNo} is {entity.Status} : it cannot be changed. Make another requisition for more parts.");
            }

            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;
        }

        await CheckBusinessLinesAsync(entity.BranchId, lines);

        entity.RequisitionDate = date;
        entity.RequestedByEmployeeId = dto.RequestedByEmployeeId;
        entity.Remarks = Ws.Clean(dto.Remarks, 500, "Remarks");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        bool isNew = publicId == null;

        if (isNew)
        {
            entity.RequisitionNo = (await _numberService.NextAsync(VoucherTypes.PartsRequisition, entity.BranchId, date)).VoucherNo;

            Requisitions.Add(entity);
        }

        await _context.SaveChangesAsync();

        long id = entity.PartsRequisitionId;

        if (!isNew)
        {
            RequisitionLines.RemoveRange(await RequisitionLines.Where(x => x.PartsRequisitionId == id).ToListAsync());
        }

        int lineNo = 0;

        foreach (PartsLineDto line in lines)
        {
            Item item = items[Key(line.ItemKind, line.ItemId)];

            RequisitionLines.Add(
                new PartsRequisitionLines
                {
                    PartsRequisitionId = id,
                    LineNo = ++lineNo,
                    ItemKind = item.Kind,
                    ItemId = item.Id,
                    ItemCode = item.Code,
                    ItemName = item.Name,
                    Quantity = line.Quantity,
                    IssuedQuantity = 0m,
                    Note = Ws.Clean(line.Note, 200, "Note")
                });
        }

        Ws.AddHistory(_context, RequisitionEntity, id, isNew ? "Create" : "Update", isNew ? "Parts Requisition Created" : "Parts Requisition Updated", $"{entity.RequisitionNo} : {lines.Count} part(s), quantity {Wp.Qty(lines.Sum(x => x.Quantity))}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await FullAsync(entity);
    }

    // Cancelled (nothing issued) / Closed (the rest is not needed)
    public async Task<PartsDocumentDto> ChangeRequisitionStatusAsync(Guid publicId, PartsStatusChangeDto dto, long userId)
    {
        PartsRequisitions entity =
            await Requisitions.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The requisition was not found.");

        string status = (dto.Status ?? string.Empty).Trim();

        if (!NextOf(entity.Status).Contains(status))
        {
            throw new InvalidOperationException($"{entity.RequisitionNo} is {entity.Status} : it cannot be made {(status.Length > 0 ? status : "that")}.");
        }

        entity.Status = status;
        entity.StatusDate = DateTime.UtcNow;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, RequisitionEntity, entity.PartsRequisitionId, "Status", $"Parts Requisition {status}", $"{entity.RequisitionNo} is {status}.", userId);

        await _context.SaveChangesAsync();

        return await FullAsync(entity);
    }

    // After an issue or a return : what the requisition still waits for
    private static void SetRequisitionStatus(PartsRequisitions requisition, List<PartsRequisitionLines> lines, long userId)
    {
        if (requisition.Status is Wp.Cancelled or Wp.Closed)
        {
            return;
        }

        string status =
            lines.All(x => x.IssuedQuantity >= x.Quantity) ? Wp.Issued
            : lines.Any(x => x.IssuedQuantity > 0) ? Wp.PartlyIssued
            : Wp.Open;

        if (status != requisition.Status)
        {
            requisition.Status = status;
            requisition.StatusDate = DateTime.UtcNow;
            requisition.ModifiedBy = userId;
            requisition.ModifiedDate = DateTime.UtcNow;
        }
    }


    //===========================================================
    // Parts Issues
    //===========================================================

    private static PartsDocumentDto Head(PartsIssues x, Names names, Dictionary<long, PartsRequisitions> requisitions)
    {
        var dto =
            new PartsDocumentDto
            {
                Id = x.PartsIssueId,
                PublicId = x.PublicId,
                DocumentNo = x.IssueNo,
                DocumentDate = HrCalendar.Day(x.IssueDate),
                BranchId = x.BranchId,
                BranchName = Names.Of(names.Branches, x.BranchId),
                WarehouseId = x.WarehouseId,
                WarehouseName = Names.Of(names.Warehouses, x.WarehouseId),
                PersonId = x.WorkshopTechnicianId,
                PersonName = Names.Of(names.Technicians, x.WorkshopTechnicianId),
                Status = x.Status,
                TotalCost = x.TotalCost,
                Remarks = x.Remarks
            };

        if (x.PartsRequisitionId != null && requisitions.TryGetValue(x.PartsRequisitionId.Value, out PartsRequisitions? requisition))
        {
            dto.SourcePublicId = requisition.PublicId;
            dto.SourceNo = requisition.RequisitionNo;
        }

        FillCard(dto, x.JobCardId, names);

        return dto;
    }

    private async Task<Dictionary<long, PartsRequisitions>> RequisitionsOfAsync(IEnumerable<PartsIssues> issues)
    {
        List<long> ids = issues.Where(x => x.PartsRequisitionId != null).Select(x => x.PartsRequisitionId!.Value).Distinct().ToList();

        return ids.Count == 0
            ? new Dictionary<long, PartsRequisitions>()
            : (await Requisitions.AsNoTracking().Where(x => ids.Contains(x.PartsRequisitionId)).ToListAsync()).ToDictionary(x => x.PartsRequisitionId);
    }

    public async Task<List<PartsDocumentDto>> GetIssuesAsync()
    {
        List<PartsIssues> rows = await Issues.AsNoTracking().OrderByDescending(x => x.PartsIssueId).ToListAsync();

        Names names = await NamesAsync(rows.Select(x => x.JobCardId));

        Dictionary<long, PartsRequisitions> requisitions = await RequisitionsOfAsync(rows);

        var totals =
            (await IssueLines.AsNoTracking()
                .GroupBy(x => x.PartsIssueId)
                .Select(g => new { g.Key, Quantity = g.Sum(x => x.Quantity), Returned = g.Sum(x => x.ReturnedQuantity) })
                .ToListAsync())
            .ToDictionary(x => x.Key);

        return rows
            .Select(x =>
            {
                PartsDocumentDto dto = Head(x, names, requisitions);

                if (totals.TryGetValue(x.PartsIssueId, out var total))
                {
                    dto.TotalQuantity = total.Quantity;
                    dto.CanReturn = total.Quantity > total.Returned && dto.JobCardStatus != Ws.Invoiced && dto.JobCardStatus != Ws.Delivered;
                }

                return dto;
            })
            .ToList();
    }

    private async Task<PartsDocumentDto> FullAsync(PartsIssues issue)
    {
        PartsDocumentDto dto = Head(issue, await NamesAsync(new[] { issue.JobCardId }), await RequisitionsOfAsync(new[] { issue }));

        dto.Lines =
            (await IssueLines.AsNoTracking().Where(x => x.PartsIssueId == issue.PartsIssueId).OrderBy(x => x.LineNo).ToListAsync())
            .Select(x => new PartsLineDto
            {
                LineId = x.PartsIssueLineId,
                SourceLineId = x.PartsRequisitionLineId,
                ItemKind = x.ItemKind,
                ItemId = x.ItemId,
                ItemCode = x.ItemCode,
                ItemName = x.ItemName,
                Quantity = x.Quantity,
                ReturnedQuantity = x.ReturnedQuantity,
                Cost = x.Cost,
                Note = x.Note
            })
            .ToList();

        dto.TotalQuantity = dto.Lines.Sum(x => x.Quantity);
        dto.CanReturn = dto.Lines.Any(x => x.Quantity > x.ReturnedQuantity) && dto.JobCardStatus != Ws.Invoiced && dto.JobCardStatus != Ws.Delivered;

        return dto;
    }

    public async Task<PartsDocumentDto> GetIssueAsync(Guid publicId)
    {
        PartsIssues issue =
            await Issues.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId)
            ?? throw new KeyNotFoundException("The parts issue was not found.");

        return await FullAsync(issue);
    }

    // A batch with what the warehouse holds of it
    private sealed class Held
    {
        public StockBatches Batch { get; init; } = null!;

        public decimal OnHand { get; set; }
    }

    // The batches of the items in the warehouse, oldest first
    // (tracked : they are changed). The caller locked them.
    private async Task<Dictionary<long, List<Held>>> FifoAsync(string productType, long warehouseId, List<long> productIds)
    {
        var sums =
            await _context.Set<StockMovements>().AsNoTracking()
                .Where(x => x.ProductType == productType && x.Bucket == Wp.BucketOnHand && x.WarehouseId == warehouseId && productIds.Contains(x.ProductId))
                .GroupBy(x => x.StockBatchId)
                .Select(g => new { StockBatchId = g.Key, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                .ToListAsync();

        Dictionary<long, decimal> onHand = sums.Where(x => x.Quantity > 0).ToDictionary(x => x.StockBatchId, x => x.Quantity);

        List<long> batchIds = onHand.Keys.ToList();

        List<StockBatches> batches =
            (await _context.Set<StockBatches>().Where(x => batchIds.Contains(x.StockBatchId) && x.Status != Wp.BatchCancelled).ToListAsync())
            .OrderBy(x => x.SourceDate).ThenBy(x => x.StockBatchId)
            .ToList();

        return batches
            .GroupBy(x => x.ProductId)
            .ToDictionary(x => x.Key, x => x.Select(b => new Held { Batch = b, OnHand = onHand[b.StockBatchId] }).ToList());
    }

    public async Task<PartsDocumentDto> PostIssueAsync(PostPartsIssueDto dto, long userId)
    {
        DateOnly date =
            HrCalendar.ParseDay(dto.IssueDate)
            ?? throw new InvalidOperationException("Give the date of the issue.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The date of an issue cannot be in the future.");
        }

        JobCards card = await OpenCardAsync(dto.JobCardPublicId, "parts cannot be issued to it");

        WorkshopSwitchesDto switches = await Ws.SwitchesAsync(_context);

        if (switches.RequireEstimate
            && !Est.NoEstimateJobTypes.Contains(card.JobType)
            && !await Est.ApprovedAsync(_context, card.JobCardId))
        {
            throw new InvalidOperationException($"{card.JobCardNo} was not made from an estimate : parts cannot be issued to it.");
        }

        Warehouses warehouse =
            await _context.Set<Warehouses>().AsNoTracking().FirstOrDefaultAsync(x => x.WarehouseId == dto.WarehouseId && !x.IsDeleted && x.IsActive)
            ?? throw new InvalidOperationException("Pick the warehouse the parts go out of.");

        if (warehouse.BranchId != card.BranchId)
        {
            throw new InvalidOperationException($"{warehouse.WarehouseName} is not a warehouse of the service center of {card.JobCardNo}.");
        }

        if (dto.WorkshopTechnicianId != null
            && !await _context.Set<WorkshopTechnicians>().AsNoTracking().AnyAsync(x => x.WorkshopTechnicianId == dto.WorkshopTechnicianId && !x.IsDeleted))
        {
            throw new InvalidOperationException("The technician was not found.");
        }

        List<PartsLineDto> lines = dto.Lines ?? new();

        Dictionary<string, Item> items = await CheckLinesAsync(lines);

        // Fails here when the financial year of the date is not open
        await _numberService.ResolvePeriodAsync(card.BranchId, date);

        await CheckBusinessLinesAsync(card.BranchId, lines);

        string wipOfSetup = PostingLedgerCodes.TryGet(_context, Wp.PurposeWip);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        //-------------------------------------------------------
        // The requisition
        //-------------------------------------------------------

        PartsRequisitions? requisition = null;

        var requisitionLines = new List<PartsRequisitionLines>();

        if (dto.RequisitionPublicId != null)
        {
            requisition =
                await Requisitions.FirstOrDefaultAsync(x => x.PublicId == dto.RequisitionPublicId && !x.IsDeleted)
                ?? throw new InvalidOperationException("The requisition was not found.");

            if (requisition.JobCardId != card.JobCardId)
            {
                throw new InvalidOperationException($"{requisition.RequisitionNo} is not a requisition of {card.JobCardNo}.");
            }

            if (!Wp.Waiting.Contains(requisition.Status))
            {
                throw new InvalidOperationException($"{requisition.RequisitionNo} is {requisition.Status} : nothing can be issued for it.");
            }

            requisitionLines = await RequisitionLines.Where(x => x.PartsRequisitionId == requisition.PartsRequisitionId).ToListAsync();
        }
        else if (!switches.IssueWithoutRequisition)
        {
            throw new InvalidOperationException("Parts are issued against a requisition only (Workshop Configuration, switch Issue without Requisition). Pick the requisition.");
        }

        foreach (PartsLineDto line in lines)
        {
            Item item = items[Key(line.ItemKind, line.ItemId)];

            if (!item.IsActive)
            {
                throw new InvalidOperationException($"{item.Name} is not active.");
            }

            if (requisition == null)
            {
                line.SourceLineId = null;
                continue;
            }

            PartsRequisitionLines asked =
                requisitionLines.FirstOrDefault(x => x.ItemKind == item.Kind && x.ItemId == item.Id)
                ?? throw new InvalidOperationException($"{item.Name} is not on {requisition.RequisitionNo}.");

            decimal left = asked.Quantity - asked.IssuedQuantity;

            if (line.Quantity > left)
            {
                throw new InvalidOperationException($"{item.Name} : {requisition.RequisitionNo} still waits for {Wp.Qty(Math.Max(0m, left))} only.");
            }

            line.SourceLineId = asked.PartsRequisitionLineId;
        }

        //-------------------------------------------------------
        // The batches : locked, then split oldest first
        //-------------------------------------------------------

        var fifo = new Dictionary<string, Dictionary<long, List<Held>>>();

        foreach (string type in lines.Select(x => Wp.ProductType(x.ItemKind)).Distinct().OrderBy(x => x))
        {
            List<long> ids = lines.Where(x => Wp.ProductType(x.ItemKind) == type).Select(x => x.ItemId).Distinct().ToList();

            await _context.Database.ExecuteSqlRawAsync(
                "SELECT 1 FROM \"StockBatches\" WHERE \"ProductType\" = {0} AND \"ProductId\" = ANY({1}) FOR UPDATE",
                type,
                ids.ToArray());

            fifo[type] = await FifoAsync(type, warehouse.WarehouseId, ids);
        }

        //-------------------------------------------------------
        // The document
        //-------------------------------------------------------

        DateTime now = DateTime.UtcNow;

        string issueNo = (await _numberService.NextAsync(VoucherTypes.WorkshopPartsIssue, card.BranchId, date)).VoucherNo;

        var issue =
            new PartsIssues
            {
                IssueNo = issueNo,
                IssueDate = date,
                BranchId = card.BranchId,
                WarehouseId = warehouse.WarehouseId,
                JobCardId = card.JobCardId,
                PartsRequisitionId = requisition?.PartsRequisitionId,
                WorkshopTechnicianId = dto.WorkshopTechnicianId,
                Status = Wp.Posted,
                Remarks = Ws.Clean(dto.Remarks, 500, "Remarks"),
                CreatedBy = userId,
                CreatedDate = now
            };

        Issues.Add(issue);

        await _context.SaveChangesAsync();

        var debit = new Dictionary<string, decimal>();
        var credit = new Dictionary<string, decimal>();

        int lineNo = 0;

        string narration = Wp.Limit($"Parts issued to job card {card.JobCardNo} ({card.CustomerName})", 300);

        foreach (PartsLineDto line in lines)
        {
            Item item = items[Key(line.ItemKind, line.ItemId)];

            string type = Wp.ProductType(item.Kind);

            List<Held> held = fifo[type].TryGetValue(item.Id, out List<Held>? list) ? list : new List<Held>();

            decimal available = held.Sum(x => x.OnHand);

            if (line.Quantity > available)
            {
                throw new InvalidOperationException($"{item.Name} : only {Wp.Qty(available)} in stock in {warehouse.WarehouseName}.");
            }

            string wipLedger = wipOfSetup.Length > 0 ? wipOfSetup : item.WipLedgerCode;

            if (wipLedger.Length == 0)
            {
                throw new InvalidOperationException($"{item.Name} has no WIP ledger. Select the Workshop WIP ledger on Settings > Account Settings > Posting Setup (group Service Operations).");
            }

            var saved =
                new PartsIssueLines
                {
                    PartsIssueId = issue.PartsIssueId,
                    LineNo = ++lineNo,
                    PartsRequisitionLineId = line.SourceLineId,
                    ItemKind = item.Kind,
                    ItemId = item.Id,
                    ItemCode = item.Code,
                    ItemName = item.Name,
                    Quantity = line.Quantity,
                    WipLedgerCode = wipLedger,
                    Note = Ws.Clean(line.Note, 200, "Note")
                };

            IssueLines.Add(saved);

            await _context.SaveChangesAsync();

            decimal left = line.Quantity;
            decimal lineCost = 0m;

            foreach (Held slice in held)
            {
                if (left <= 0m)
                {
                    break;
                }

                StockBatches batch = slice.Batch;

                decimal take = Math.Min(left, Math.Min(slice.OnHand, batch.QuantityOnHand));

                if (take <= 0m)
                {
                    continue;
                }

                // The last units of a batch take the value that is
                // left, so the batch closes at exactly 0.00
                decimal unitsLeft = batch.QuantityOnHand + batch.QuantityInTransit;

                decimal cost =
                    take >= unitsLeft
                        ? batch.RemainingValue
                        : Math.Min(Ws.Round(take * batch.UnitCost), batch.RemainingValue);

                string inventoryLedger =
                    string.IsNullOrWhiteSpace(batch.InventoryLedgerCode) ? item.InventoryLedgerCode : batch.InventoryLedgerCode.Trim();

                if (inventoryLedger.Length == 0)
                {
                    throw new InvalidOperationException($"{item.Name} has no inventory ledger (Product Settings).");
                }

                _context.Set<StockMovements>().Add(
                    new StockMovements
                    {
                        StockBatchId = batch.StockBatchId,
                        ProductType = type,
                        ProductId = batch.ProductId,
                        BranchId = issue.BranchId,
                        WarehouseId = issue.WarehouseId,
                        Bucket = Wp.BucketOnHand,
                        MovementType = Wp.MoveIssue,
                        QuantityIn = 0m,
                        QuantityOut = take,
                        UnitCost = batch.UnitCost,
                        Value = cost,
                        DocumentType = VoucherTypes.WorkshopPartsIssue,
                        DocumentId = issue.PartsIssueId,
                        DocumentLineId = saved.PartsIssueLineId,
                        DocumentNo = issue.IssueNo,
                        DocumentDate = issue.IssueDate,
                        IsReversal = false,
                        Narration = narration,
                        CreatedBy = userId,
                        CreatedDate = now
                    });

                _context.Set<StockAllocations>().Add(
                    new StockAllocations
                    {
                        StockBatchId = batch.StockBatchId,
                        DocumentType = VoucherTypes.WorkshopPartsIssue,
                        DocumentId = issue.PartsIssueId,
                        DocumentLineId = saved.PartsIssueLineId,
                        Quantity = take,
                        UnitCost = batch.UnitCost,
                        Value = cost,
                        IsReversed = false,
                        CreatedBy = userId,
                        CreatedDate = now
                    });

                batch.QuantityOnHand -= take;
                batch.QuantityOut += take;
                batch.RemainingValue -= cost;

                if (batch.QuantityOnHand + batch.QuantityInTransit <= 0m)
                {
                    batch.Status = Wp.BatchClosed;
                }

                batch.ModifiedBy = userId;
                batch.ModifiedDate = now;

                slice.OnHand -= take;
                left -= take;
                lineCost += cost;

                credit[inventoryLedger] = (credit.TryGetValue(inventoryLedger, out decimal c) ? c : 0m) + cost;
            }

            if (left > 0m)
            {
                throw new InvalidOperationException($"{item.Name} : only {Wp.Qty(line.Quantity - left)} could be taken from the batches in {warehouse.WarehouseName}.");
            }

            saved.Cost = lineCost;

            debit[wipLedger] = (debit.TryGetValue(wipLedger, out decimal d) ? d : 0m) + lineCost;

            PartsRequisitionLines? asked = requisitionLines.FirstOrDefault(x => x.PartsRequisitionLineId == line.SourceLineId);

            if (asked != null)
            {
                asked.IssuedQuantity += line.Quantity;
            }
        }

        issue.TotalCost = debit.Values.Sum();

        if (requisition != null)
        {
            SetRequisitionStatus(requisition, requisitionLines, userId);
        }

        Ws.AddHistory(_context, IssueEntity, issue.PartsIssueId, "Create", "Parts Issued", $"{issue.IssueNo} : {lines.Count} part(s), quantity {Wp.Qty(lines.Sum(x => x.Quantity))}, cost {issue.TotalCost:0.00}, to {card.JobCardNo} from {warehouse.WarehouseName}.", userId);

        await _context.SaveChangesAsync();

        //-------------------------------------------------------
        // The journal : Dr Workshop WIP, Cr inventory
        //-------------------------------------------------------

        if (issue.TotalCost > 0m)
        {
            var postingLines = new List<VoucherPostingLine>();

            postingLines.AddRange(debit.Where(x => x.Value > 0m).Select(x => new VoucherPostingLine { GroupNo = 1, LedgerCode = x.Key, Debit = x.Value, Narration = narration }));
            postingLines.AddRange(credit.Where(x => x.Value > 0m).Select(x => new VoucherPostingLine { GroupNo = 1, LedgerCode = x.Key, Credit = x.Value, Narration = narration }));

            await _postingService.PostAsync(
                new VoucherPostingRequest
                {
                    VoucherType = VoucherTypes.WorkshopPartsIssue,
                    VoucherId = issue.PartsIssueId,
                    VoucherNo = issue.IssueNo,
                    VoucherDate = issue.IssueDate,
                    BranchId = issue.BranchId,
                    ReferenceNo = card.JobCardNo,
                    Narration = narration,
                    Lines = postingLines
                },
                userId);
        }

        await transaction.CommitAsync();

        return await FullAsync(issue);
    }


    //===========================================================
    // Parts Returns
    //===========================================================

    private static PartsDocumentDto Head(PartsReturns x, Names names, Dictionary<long, PartsIssues> issues)
    {
        var dto =
            new PartsDocumentDto
            {
                Id = x.PartsReturnId,
                PublicId = x.PublicId,
                DocumentNo = x.ReturnNo,
                DocumentDate = HrCalendar.Day(x.ReturnDate),
                BranchId = x.BranchId,
                BranchName = Names.Of(names.Branches, x.BranchId),
                WarehouseId = x.WarehouseId,
                WarehouseName = Names.Of(names.Warehouses, x.WarehouseId),
                Status = x.Status,
                TotalCost = x.TotalCost,
                Remarks = x.Remarks
            };

        if (issues.TryGetValue(x.PartsIssueId, out PartsIssues? issue))
        {
            dto.SourcePublicId = issue.PublicId;
            dto.SourceNo = issue.IssueNo;
        }

        FillCard(dto, x.JobCardId, names);

        return dto;
    }

    private async Task<Dictionary<long, PartsIssues>> IssuesOfAsync(IEnumerable<PartsReturns> returns)
    {
        List<long> ids = returns.Select(x => x.PartsIssueId).Distinct().ToList();

        return (await Issues.AsNoTracking().Where(x => ids.Contains(x.PartsIssueId)).ToListAsync()).ToDictionary(x => x.PartsIssueId);
    }

    public async Task<List<PartsDocumentDto>> GetReturnsAsync()
    {
        List<PartsReturns> rows = await Returns.AsNoTracking().OrderByDescending(x => x.PartsReturnId).ToListAsync();

        Names names = await NamesAsync(rows.Select(x => x.JobCardId));

        Dictionary<long, PartsIssues> issues = await IssuesOfAsync(rows);

        var totals =
            (await ReturnLines.AsNoTracking()
                .GroupBy(x => x.PartsReturnId)
                .Select(g => new { g.Key, Quantity = g.Sum(x => x.Quantity) })
                .ToListAsync())
            .ToDictionary(x => x.Key, x => x.Quantity);

        return rows
            .Select(x =>
            {
                PartsDocumentDto dto = Head(x, names, issues);

                dto.TotalQuantity = totals.TryGetValue(x.PartsReturnId, out decimal quantity) ? quantity : 0m;

                return dto;
            })
            .ToList();
    }

    private async Task<PartsDocumentDto> FullAsync(PartsReturns entity)
    {
        PartsDocumentDto dto = Head(entity, await NamesAsync(new[] { entity.JobCardId }), await IssuesOfAsync(new[] { entity }));

        dto.Lines =
            (await ReturnLines.AsNoTracking().Where(x => x.PartsReturnId == entity.PartsReturnId).OrderBy(x => x.LineNo).ToListAsync())
            .Select(x => new PartsLineDto
            {
                LineId = x.PartsReturnLineId,
                SourceLineId = x.PartsIssueLineId,
                ItemKind = x.ItemKind,
                ItemId = x.ItemId,
                ItemCode = x.ItemCode,
                ItemName = x.ItemName,
                Quantity = x.Quantity,
                Cost = x.Cost,
                Note = x.Note
            })
            .ToList();

        dto.TotalQuantity = dto.Lines.Sum(x => x.Quantity);

        return dto;
    }

    public async Task<PartsDocumentDto> GetReturnAsync(Guid publicId)
    {
        PartsReturns entity =
            await Returns.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId)
            ?? throw new KeyNotFoundException("The parts return was not found.");

        return await FullAsync(entity);
    }

    public async Task<PartsDocumentDto> PostReturnAsync(PostPartsReturnDto dto, long userId)
    {
        DateOnly date =
            HrCalendar.ParseDay(dto.ReturnDate)
            ?? throw new InvalidOperationException("Give the date of the return.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The date of a return cannot be in the future.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        PartsIssues issue =
            await Issues.FirstOrDefaultAsync(x => x.PublicId == dto.IssuePublicId)
            ?? throw new InvalidOperationException("Pick the parts issue the parts come back of.");

        if (date < issue.IssueDate)
        {
            throw new InvalidOperationException($"The return cannot be dated before {issue.IssueNo} ({HrCalendar.Day(issue.IssueDate)}).");
        }

        JobCards card =
            await Cards.AsNoTracking().FirstOrDefaultAsync(x => x.JobCardId == issue.JobCardId)
            ?? throw new InvalidOperationException("The job card of the issue was not found.");

        if (card.Status == Ws.Invoiced || card.Status == Ws.Delivered)
        {
            throw new InvalidOperationException($"{card.JobCardNo} is {card.Status} : its parts are billed. Use a Service Return.");
        }

        Warehouses warehouse =
            await _context.Set<Warehouses>().AsNoTracking().FirstOrDefaultAsync(x => x.WarehouseId == issue.WarehouseId)
            ?? throw new InvalidOperationException("The warehouse of the issue was not found.");

        List<PartsLineDto> lines = (dto.Lines ?? new()).Where(x => x.Quantity > 0).ToList();

        if (lines.Count == 0)
        {
            throw new InvalidOperationException("Give the quantity that comes back on one line at least.");
        }

        List<PartsIssueLines> issueLines = await IssueLines.Where(x => x.PartsIssueId == issue.PartsIssueId).ToListAsync();

        if (lines.GroupBy(x => x.SourceLineId).Any(x => x.Count() > 1))
        {
            throw new InvalidOperationException("A line of the issue is on the return twice.");
        }

        await _numberService.ResolvePeriodAsync(issue.BranchId, date);

        // The slices the issue took, and what earlier returns put back
        List<long> issueLineIds = issueLines.Select(x => x.PartsIssueLineId).ToList();

        List<StockAllocations> allocations =
            await _context.Set<StockAllocations>()
                .Where(x => x.DocumentType == VoucherTypes.WorkshopPartsIssue && x.DocumentId == issue.PartsIssueId && issueLineIds.Contains(x.DocumentLineId) && !x.IsReversed)
                .OrderBy(x => x.StockAllocationId)
                .ToListAsync();

        List<long> allocationIds = allocations.Select(x => x.StockAllocationId).ToList();

        var back =
            (await _context.Set<PartsReturnAllocations>().AsNoTracking()
                .Where(x => allocationIds.Contains(x.StockAllocationId))
                .GroupBy(x => x.StockAllocationId)
                .Select(g => new { g.Key, Quantity = g.Sum(x => x.Quantity), Value = g.Sum(x => x.Value) })
                .ToListAsync())
            .ToDictionary(x => x.Key);

        long[] batchIds = allocations.Select(x => x.StockBatchId).Distinct().ToArray();

        if (batchIds.Length > 0)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "SELECT 1 FROM \"StockBatches\" WHERE \"StockBatchId\" = ANY({0}) FOR UPDATE",
                batchIds);
        }

        Dictionary<long, StockBatches> batches =
            (await _context.Set<StockBatches>().Where(x => batchIds.Contains(x.StockBatchId)).ToListAsync())
            .ToDictionary(x => x.StockBatchId);

        Dictionary<string, Item> items =
            await ItemsAsync(issueLines.Select(x => new PartsLineDto { ItemKind = x.ItemKind, ItemId = x.ItemId }));

        DateTime now = DateTime.UtcNow;

        string returnNo = (await _numberService.NextAsync(VoucherTypes.WorkshopPartsReturn, issue.BranchId, date)).VoucherNo;

        var entity =
            new PartsReturns
            {
                ReturnNo = returnNo,
                ReturnDate = date,
                BranchId = issue.BranchId,
                WarehouseId = issue.WarehouseId,
                JobCardId = issue.JobCardId,
                PartsIssueId = issue.PartsIssueId,
                Status = Wp.Posted,
                Remarks = Ws.Clean(dto.Remarks, 500, "Remarks"),
                CreatedBy = userId,
                CreatedDate = now
            };

        Returns.Add(entity);

        await _context.SaveChangesAsync();

        var debit = new Dictionary<string, decimal>();
        var credit = new Dictionary<string, decimal>();

        string narration = Wp.Limit($"Parts returned from job card {card.JobCardNo} ({card.CustomerName}), issue {issue.IssueNo}", 300);

        PartsRequisitions? requisition =
            issue.PartsRequisitionId == null ? null : await Requisitions.FirstOrDefaultAsync(x => x.PartsRequisitionId == issue.PartsRequisitionId);

        List<PartsRequisitionLines> requisitionLines =
            requisition == null ? new() : await RequisitionLines.Where(x => x.PartsRequisitionId == requisition.PartsRequisitionId).ToListAsync();

        int lineNo = 0;

        foreach (PartsLineDto line in lines)
        {
            PartsIssueLines source =
                issueLines.FirstOrDefault(x => x.PartsIssueLineId == line.SourceLineId)
                ?? throw new InvalidOperationException($"A line of the return is not a line of {issue.IssueNo}.");

            decimal quantity = Ws.Round(line.Quantity);

            decimal room = source.Quantity - source.ReturnedQuantity;

            if (quantity > room)
            {
                throw new InvalidOperationException($"{source.ItemName} : only {Wp.Qty(Math.Max(0m, room))} of {issue.IssueNo} can still come back.");
            }

            items.TryGetValue(Key(source.ItemKind, source.ItemId), out Item? item);

            var saved =
                new PartsReturnLines
                {
                    PartsReturnId = entity.PartsReturnId,
                    LineNo = ++lineNo,
                    PartsIssueLineId = source.PartsIssueLineId,
                    ItemKind = source.ItemKind,
                    ItemId = source.ItemId,
                    ItemCode = source.ItemCode,
                    ItemName = source.ItemName,
                    Quantity = quantity,
                    Note = Ws.Clean(line.Note, 200, "Note")
                };

            ReturnLines.Add(saved);

            await _context.SaveChangesAsync();

            decimal need = quantity;
            decimal lineCost = 0m;

            foreach (StockAllocations allocation in allocations.Where(x => x.DocumentLineId == source.PartsIssueLineId))
            {
                if (need <= 0m)
                {
                    break;
                }

                decimal backQuantity = back.TryGetValue(allocation.StockAllocationId, out var done) ? done.Quantity : 0m;
                decimal backValue = done?.Value ?? 0m;

                decimal sliceRoom = allocation.Quantity - backQuantity;

                if (sliceRoom <= 0m)
                {
                    continue;
                }

                decimal take = Math.Min(sliceRoom, need);

                // The last units of a slice take the value that is left
                decimal value =
                    take == sliceRoom
                        ? allocation.Value - backValue
                        : Math.Min(Ws.Round(take * allocation.UnitCost), allocation.Value - backValue);

                if (!batches.TryGetValue(allocation.StockBatchId, out StockBatches? batch))
                {
                    throw new InvalidOperationException($"{source.ItemName} : a batch of {issue.IssueNo} was not found.");
                }

                string inventoryLedger =
                    string.IsNullOrWhiteSpace(batch.InventoryLedgerCode) ? (item?.InventoryLedgerCode ?? string.Empty) : batch.InventoryLedgerCode.Trim();

                if (inventoryLedger.Length == 0)
                {
                    throw new InvalidOperationException($"{source.ItemName} has no inventory ledger (Product Settings).");
                }

                _context.Set<StockMovements>().Add(
                    new StockMovements
                    {
                        StockBatchId = batch.StockBatchId,
                        ProductType = Wp.ProductType(source.ItemKind),
                        ProductId = batch.ProductId,
                        BranchId = entity.BranchId,
                        WarehouseId = entity.WarehouseId,
                        Bucket = Wp.BucketOnHand,
                        MovementType = Wp.MoveReturn,
                        QuantityIn = take,
                        QuantityOut = 0m,
                        UnitCost = batch.UnitCost,
                        Value = value,
                        DocumentType = VoucherTypes.WorkshopPartsReturn,
                        DocumentId = entity.PartsReturnId,
                        DocumentLineId = saved.PartsReturnLineId,
                        DocumentNo = entity.ReturnNo,
                        DocumentDate = entity.ReturnDate,
                        IsReversal = false,
                        Narration = narration,
                        CreatedBy = userId,
                        CreatedDate = now
                    });

                _context.Set<PartsReturnAllocations>().Add(
                    new PartsReturnAllocations
                    {
                        PartsReturnLineId = saved.PartsReturnLineId,
                        StockAllocationId = allocation.StockAllocationId,
                        StockBatchId = batch.StockBatchId,
                        Quantity = take,
                        Value = value
                    });

                batch.QuantityOnHand += take;
                batch.QuantityOut -= take;
                batch.RemainingValue += value;

                if (batch.Status == Wp.BatchClosed)
                {
                    batch.Status = batch.QuantityInTransit > 0m ? Wp.BatchInTransit : Wp.BatchOnHand;
                }

                batch.ModifiedBy = userId;
                batch.ModifiedDate = now;

                need -= take;
                lineCost += value;

                debit[inventoryLedger] = (debit.TryGetValue(inventoryLedger, out decimal d) ? d : 0m) + value;
            }

            if (need > 0m)
            {
                throw new InvalidOperationException($"{source.ItemName} : the batches of {issue.IssueNo} have no room for {Wp.Qty(need)} more.");
            }

            saved.Cost = lineCost;

            source.ReturnedQuantity += quantity;
            source.ReturnedCost += lineCost;

            string wipLedger = source.WipLedgerCode.Trim();

            if (wipLedger.Length == 0)
            {
                throw new InvalidOperationException($"{source.ItemName} : the WIP ledger of {issue.IssueNo} is not known.");
            }

            credit[wipLedger] = (credit.TryGetValue(wipLedger, out decimal c) ? c : 0m) + lineCost;

            PartsRequisitionLines? asked = requisitionLines.FirstOrDefault(x => x.PartsRequisitionLineId == source.PartsRequisitionLineId);

            if (asked != null)
            {
                asked.IssuedQuantity = Math.Max(0m, asked.IssuedQuantity - quantity);
            }
        }

        entity.TotalCost = debit.Values.Sum();

        if (requisition != null)
        {
            SetRequisitionStatus(requisition, requisitionLines, userId);
        }

        Ws.AddHistory(_context, ReturnEntity, entity.PartsReturnId, "Create", "Parts Returned", $"{entity.ReturnNo} : {lines.Count} part(s), quantity {Wp.Qty(lines.Sum(x => x.Quantity))}, cost {entity.TotalCost:0.00}, back to {warehouse.WarehouseName} from {card.JobCardNo} ({issue.IssueNo}).", userId);

        await _context.SaveChangesAsync();

        //-------------------------------------------------------
        // The journal : Dr inventory, Cr Workshop WIP
        //-------------------------------------------------------

        if (entity.TotalCost > 0m)
        {
            var postingLines = new List<VoucherPostingLine>();

            postingLines.AddRange(debit.Where(x => x.Value > 0m).Select(x => new VoucherPostingLine { GroupNo = 1, LedgerCode = x.Key, Debit = x.Value, Narration = narration }));
            postingLines.AddRange(credit.Where(x => x.Value > 0m).Select(x => new VoucherPostingLine { GroupNo = 1, LedgerCode = x.Key, Credit = x.Value, Narration = narration }));

            await _postingService.PostAsync(
                new VoucherPostingRequest
                {
                    VoucherType = VoucherTypes.WorkshopPartsReturn,
                    VoucherId = entity.PartsReturnId,
                    VoucherNo = entity.ReturnNo,
                    VoucherDate = entity.ReturnDate,
                    BranchId = entity.BranchId,
                    ReferenceNo = issue.IssueNo,
                    Narration = narration,
                    Lines = postingLines
                },
                userId);
        }

        await transaction.CommitAsync();

        return await FullAsync(entity);
    }


    //===========================================================
    // Parts Back-Orders : requisition lines still waiting that the
    // service center has not enough stock for (oldest first)
    //===========================================================

    public async Task<List<PartsBackOrderDto>> GetBackOrdersAsync()
    {
        List<PartsRequisitions> requisitions =
            await Requisitions.AsNoTracking()
                .Where(x => !x.IsDeleted && Wp.Waiting.Contains(x.Status))
                .OrderBy(x => x.RequisitionDate).ThenBy(x => x.PartsRequisitionId)
                .ToListAsync();

        if (requisitions.Count == 0)
        {
            return new List<PartsBackOrderDto>();
        }

        List<long> ids = requisitions.Select(x => x.PartsRequisitionId).ToList();

        List<PartsRequisitionLines> lines =
            await RequisitionLines.AsNoTracking()
                .Where(x => ids.Contains(x.PartsRequisitionId) && x.Quantity > x.IssuedQuantity)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        Names names = await NamesAsync(requisitions.Select(x => x.JobCardId));

        // Stock by branch (through the warehouse of the movement)
        Dictionary<long, long> warehouseBranch =
            (await _context.Set<Warehouses>().AsNoTracking().Select(x => new { x.WarehouseId, x.BranchId }).ToListAsync())
            .ToDictionary(x => x.WarehouseId, x => x.BranchId);

        var stock =
            await _context.Set<StockMovements>().AsNoTracking()
                .Where(x => x.Bucket == Wp.BucketOnHand && x.WarehouseId != null && (x.ProductType == "SP" || x.ProductType == "AC"))
                .GroupBy(x => new { x.ProductType, x.ProductId, x.WarehouseId })
                .Select(g => new { g.Key.ProductType, g.Key.ProductId, g.Key.WarehouseId, Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut) })
                .ToListAsync();

        // item : branch : quantity
        var here = new Dictionary<string, Dictionary<long, decimal>>();

        foreach (var row in stock.Where(x => x.Quantity > 0))
        {
            string key = Key(row.ProductType == "AC" ? Wp.Accessory : Wp.SparePart, row.ProductId);

            long branchId = warehouseBranch.TryGetValue(row.WarehouseId!.Value, out long branch) ? branch : 0;

            if (!here.TryGetValue(key, out Dictionary<long, decimal>? byBranch))
            {
                here[key] = byBranch = new Dictionary<long, decimal>();
            }

            byBranch[branchId] = (byBranch.TryGetValue(branchId, out decimal q) ? q : 0m) + row.Quantity;
        }

        var result = new List<PartsBackOrderDto>();

        foreach (PartsRequisitions requisition in requisitions)
        {
            names.Cards.TryGetValue(requisition.JobCardId, out JobCards? card);

            foreach (PartsRequisitionLines line in lines.Where(x => x.PartsRequisitionId == requisition.PartsRequisitionId))
            {
                string key = Key(line.ItemKind, line.ItemId);

                here.TryGetValue(key, out Dictionary<long, decimal>? byBranch);

                decimal available = byBranch != null && byBranch.TryGetValue(requisition.BranchId, out decimal q) ? q : 0m;

                decimal waiting = line.Quantity - line.IssuedQuantity;

                decimal covered = Math.Min(available, waiting);

                // the next requisition sees what this one leaves
                if (byBranch != null && covered > 0m)
                {
                    byBranch[requisition.BranchId] = available - covered;
                }

                if (waiting - covered <= 0m)
                {
                    continue;
                }

                result.Add(
                    new PartsBackOrderDto
                    {
                        RequisitionNo = requisition.RequisitionNo,
                        RequisitionPublicId = requisition.PublicId,
                        RequisitionDate = HrCalendar.Day(requisition.RequisitionDate),
                        BranchId = requisition.BranchId,
                        BranchName = Names.Of(names.Branches, requisition.BranchId),
                        JobCardNo = card?.JobCardNo ?? string.Empty,
                        CustomerName = card?.CustomerName ?? string.Empty,
                        ItemKind = line.ItemKind,
                        ItemId = line.ItemId,
                        ItemCode = line.ItemCode,
                        ItemName = line.ItemName,
                        Requested = line.Quantity,
                        Issued = line.IssuedQuantity,
                        Waiting = waiting,
                        Available = covered,
                        Short = waiting - covered,
                        ElsewhereOnHand = byBranch == null ? 0m : byBranch.Where(x => x.Key != requisition.BranchId).Sum(x => x.Value)
                    });
            }
        }

        return result;
    }
}
