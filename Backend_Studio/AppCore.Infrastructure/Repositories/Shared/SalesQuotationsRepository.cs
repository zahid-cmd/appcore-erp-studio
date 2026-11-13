//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using System.Text.Json;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Platform.Accounting;
using AppCore.Application.SalesOperations.Shared;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.SalesOperations.AccessoriesSales;
using AppCore.Domain.Entities.SalesOperations.MotorBikeSales;
using AppCore.Domain.Entities.SalesOperations.Shared;
using AppCore.Domain.Entities.SalesOperations.SparePartsLubricantSales;
using AppCore.Domain.Entities.Settings.ClientSettings;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;

using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;

using MotorBikeUnitsEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.MotorBikeUnits;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Shared;


//===============================================================
// Sales Quotations repository (MB / SP / AC;
// SalesQuotations_Engine.sql)
//
// Stores what the controller priced with the Sales Invoice engine
// of the type in quotation mode : the header (customer or
// prospect, discounts, totals) and the lines (as typed + as
// priced). Number SQMB / SQSP / SQAC; Valid Until from the switch
// Quotation Validity (0103 / 0104 / 0105, default 7 days).
// Open -> Converted (by the invoice's posting, in the sales
// engine) / Cancelled. An open quotation with no invoice made
// from it can be deleted.
//===============================================================

public class SalesQuotationsRepository
    : ISalesQuotationsRepository
{
    private const string StatusOpen = "Open";

    private const string StatusCancelled = "Cancelled";

    private const string HistoryModule = "Sales Operations";

    private const string HistoryEntity = "SalesQuotation";

    private static readonly Dictionary<string, (string Prefix, string Validity)> Types =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["MB"] = ("SQMB", "CFG-MOD-008-0103"),
            ["SP"] = ("SQSP", "CFG-MOD-008-0104"),
            ["AC"] = ("SQAC", "CFG-MOD-008-0105")
        };


    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;


    public SalesQuotationsRepository(
        AppDbContext context,
        IVoucherNumberService numberService)
    {
        _context = context;
        _numberService = numberService;
    }


    private DbSet<SalesQuotations> Rows =>
        _context.Set<SalesQuotations>();

    private DbSet<SalesQuotationLines> LineRows =>
        _context.Set<SalesQuotationLines>();


    //===========================================================
    // Helpers
    //===========================================================

    private static string TypeCode(string? productType)
    {
        string code = (productType ?? string.Empty).Trim().ToUpperInvariant();

        return Types.ContainsKey(code)
            ? code
            : throw new InvalidOperationException("Quotation type must be MB, SP or AC.");
    }

    // Business date : Bangladesh time
    private static DateOnly Today =>
        DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));

    private static string DateText(DateOnly? date) =>
        date.HasValue ? date.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : string.Empty;

    private static string Limit(string? value, int max)
    {
        string text = (value ?? string.Empty).Replace("\r", " ").Replace("\n", " ").Trim();

        return text.Length > max ? text.Substring(0, max) : text;
    }

    private static string Qty(decimal value) =>
        value.ToString("0.##", CultureInfo.InvariantCulture);

    private void AddHistory(SalesQuotations row, string type, string title, string description, long userId)
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = $"{HistoryEntity}{row.ProductType}",
                EntityId = row.SalesQuotationId,
                ActivityType = type,
                ActivityTitle = title,
                ActivityDescription = description.Length > 1000 ? description.Substring(0, 1000) : description,
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }

    private async Task InTransactionAsync(Func<Task> work)
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

    // Quotation Validity (days; null = no expiry; missing switch = 7)
    private async Task<int?> ValidityDaysAsync(string type)
    {
        string code = Types[type].Validity;

        var row =
            await _context.Set<SystemConfigurations>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == code && !x.IsDeleted)
                .Select(x => new { x.IsEnabled, x.Value })
                .FirstOrDefaultAsync();

        if (row == null)
        {
            return 7;
        }

        if (!row.IsEnabled)
        {
            return null;
        }

        return int.TryParse((row.Value ?? string.Empty).Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out int days) && days >= 1
            ? Math.Min(days, 365)
            : 7;
    }

    // Invoices (draft / approved) made from the quotations
    private async Task<Dictionary<long, string>> HeldByAsync(string type, List<long> ids)
    {
        if (ids.Count == 0)
        {
            return new Dictionary<long, string>();
        }

        List<(long Id, string No)> rows =
            type switch
            {
                "SP" => (await _context.Set<SalesInvoicesSp>().AsNoTracking()
                            .Where(x => !x.IsDeleted && x.QuotationId.HasValue && ids.Contains(x.QuotationId.Value)
                                        && (x.Status == "Draft" || x.Status == "Approved"))
                            .Select(x => new { Id = x.QuotationId!.Value, x.InvoiceNo })
                            .ToListAsync())
                        .Select(x => (x.Id, x.InvoiceNo)).ToList(),

                "AC" => (await _context.Set<SalesInvoicesAc>().AsNoTracking()
                            .Where(x => !x.IsDeleted && x.QuotationId.HasValue && ids.Contains(x.QuotationId.Value)
                                        && (x.Status == "Draft" || x.Status == "Approved"))
                            .Select(x => new { Id = x.QuotationId!.Value, x.InvoiceNo })
                            .ToListAsync())
                        .Select(x => (x.Id, x.InvoiceNo)).ToList(),

                _ => (await _context.Set<SalesInvoicesMb>().AsNoTracking()
                            .Where(x => !x.IsDeleted && x.QuotationId.HasValue && ids.Contains(x.QuotationId.Value)
                                        && (x.Status == "Draft" || x.Status == "Approved"))
                            .Select(x => new { Id = x.QuotationId!.Value, x.InvoiceNo })
                            .ToListAsync())
                        .Select(x => (x.Id, x.InvoiceNo)).ToList()
            };

        return rows
            .GroupBy(x => x.Id)
            .ToDictionary(g => g.Key, g => g.First().No);
    }

    private async Task<SalesQuotations> FindAsync(string type, Guid publicId)
    {
        return await Rows.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted && x.ProductType == type)
               ?? throw new KeyNotFoundException("Quotation not found (refresh the page).");
    }

    private static string ItemsText(List<SalesQuotationLines> lines)
    {
        string text =
            string.Join(", ", lines.OrderBy(x => x.LineNo).Take(2).Select(x => $"{x.ProductName} x {Qty(x.Quantity)}"));

        return lines.Count > 2 ? $"{text} (+{lines.Count - 2} more)" : text;
    }


    //===========================================================
    // List
    //===========================================================

    public async Task<List<SalesQuotationListItemDto>> GetAllAsync(string productType)
    {
        string type = TypeCode(productType);

        List<SalesQuotations> rows =
            await Rows
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.ProductType == type)
                .OrderByDescending(x => x.QuotationDate)
                .ThenByDescending(x => x.SalesQuotationId)
                .ToListAsync();

        List<long> ids = rows.Select(x => x.SalesQuotationId).ToList();

        Dictionary<long, List<SalesQuotationLines>> lines =
            (await LineRows
                .AsNoTracking()
                .Where(x => ids.Contains(x.SalesQuotationId))
                .ToListAsync())
            .GroupBy(x => x.SalesQuotationId)
            .ToDictionary(g => g.Key, g => g.ToList());

        Dictionary<long, string> held = await HeldByAsync(type, ids);

        List<long> branchIds = rows.Select(x => x.BranchId).Distinct().ToList();

        Dictionary<long, string> branches =
            await _context.Set<Branches>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName);

        DateOnly today = Today;

        return rows
            .Select
            (
                x =>
                    new SalesQuotationListItemDto
                    {
                        SalesQuotationId = x.SalesQuotationId,
                        PublicId = x.PublicId,
                        QuotationNo = x.QuotationNo,
                        QuotationDate = DateText(x.QuotationDate),
                        ValidUntil = DateText(x.ValidUntil),
                        IsExpired = x.Status == StatusOpen && x.ValidUntil.HasValue && x.ValidUntil.Value < today,
                        BranchId = x.BranchId,
                        BranchName = branches.GetValueOrDefault(x.BranchId, string.Empty),
                        IsProspect = !x.CustomerId.HasValue,
                        CustomerName = x.CustomerName,
                        CustomerPhone = x.CustomerPhone,
                        ItemsText = ItemsText(lines.GetValueOrDefault(x.SalesQuotationId) ?? new List<SalesQuotationLines>()),
                        TotalQuantity = x.TotalQuantity,
                        QuotationTotal = x.QuotationTotal,
                        SalesPersonName = x.SalesPersonName,
                        Status = x.Status,
                        SalesInvoiceNo = x.SalesInvoiceNo,
                        HeldByInvoiceNo = held.GetValueOrDefault(x.SalesQuotationId, string.Empty)
                    }
            )
            .ToList();
    }


    //===========================================================
    // One quotation
    //===========================================================

    public async Task<SalesQuotationDto?> GetAsync(string productType, Guid publicId)
    {
        string type = TypeCode(productType);

        SalesQuotations? x =
            await Rows
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.PublicId == publicId && !r.IsDeleted && r.ProductType == type);

        if (x == null)
        {
            return null;
        }

        List<SalesQuotationLines> lines =
            await LineRows
                .AsNoTracking()
                .Where(l => l.SalesQuotationId == x.SalesQuotationId)
                .OrderBy(l => l.LineNo)
                .ToListAsync();

        string held =
            (await HeldByAsync(type, new List<long> { x.SalesQuotationId }))
                .GetValueOrDefault(x.SalesQuotationId, string.Empty);

        string branch =
            await _context.Set<Branches>()
                .AsNoTracking()
                .Where(b => b.BranchId == x.BranchId)
                .Select(b => b.BranchName)
                .FirstOrDefaultAsync() ?? string.Empty;

        string createdBy =
            await _context.Set<UserProfileEntity>()
                .AsNoTracking()
                .Where(u => u.UserProfileId == x.CreatedBy)
                .Select(u => u.DisplayName ?? u.FullName ?? u.UserName)
                .FirstOrDefaultAsync() ?? string.Empty;

        return new SalesQuotationDto
        {
            SalesQuotationId = x.SalesQuotationId,
            PublicId = x.PublicId,
            ProductType = x.ProductType,
            QuotationNo = x.QuotationNo,
            QuotationDate = DateText(x.QuotationDate),
            ValidUntil = DateText(x.ValidUntil),
            IsExpired = x.Status == StatusOpen && x.ValidUntil.HasValue && x.ValidUntil.Value < Today,
            BranchId = x.BranchId,
            BranchName = branch,
            WarehouseId = x.WarehouseId,
            SalesPersonId = x.SalesPersonId,
            SalesPersonName = x.SalesPersonName,
            CustomerId = x.CustomerId,
            IsProspect = !x.CustomerId.HasValue,
            CustomerCode = x.CustomerCode,
            CustomerName = x.CustomerName,
            CustomerPhone = x.CustomerPhone,
            CustomerAddress = x.CustomerAddress,
            SaleType = x.SaleType,
            InvoiceSpecialType = x.InvoiceSpecialType,
            InvoiceSpecialValue = x.InvoiceSpecialValue,
            FractionalDiscount = x.FractionalDiscount,
            TotalQuantity = x.TotalQuantity,
            GrossAmount = x.GrossAmount,
            DiscountAmount = x.DiscountAmount,
            QuotationTotal = x.QuotationTotal,
            TotalVatInside = x.TotalVatInside,
            Narration = x.Narration,
            Terms = x.Terms,
            SpecificUnits = x.SpecificUnits,
            Status = x.Status,
            SalesInvoiceNo = x.SalesInvoiceNo,
            ConvertedDate = DateText(x.ConvertedDate),
            HeldByInvoiceNo = held,
            CancelReason = x.CancelReason,
            CreatedByName = createdBy,
            CreatedDate = x.CreatedDate,
            Lines =
                lines
                    .Select
                    (
                        l =>
                            new SalesQuotationLineDto
                            {
                                LineNo = l.LineNo,
                                ProductId = l.ProductId,
                                ProductCode = l.ProductCode,
                                PartNumber = l.PartNumber,
                                ProductName = l.ProductName,
                                Unit = l.Unit,
                                Quantity = l.Quantity,
                                TypedPrice = l.TypedPrice,
                                TypedSpecialPercent = l.TypedSpecialPercent,
                                TypedSpecialTk = l.TypedSpecialTk,
                                Mrp = l.Mrp,
                                UnitPrice = l.UnitPrice,
                                GrossAmount = l.GrossAmount,
                                DiscountLabel = l.DiscountLabel,
                                DiscountAmount = l.DiscountAmount,
                                NetAmount = l.NetAmount,
                                VatInside = l.VatInside,
                                Units = UnitsOf(l.ProductId, l.UnitsJson)
                            }
                    )
                    .ToList()
        };
    }


    //===========================================================
    // Header + lines from the priced body
    //===========================================================

    private async Task FillAsync
    (
        SalesQuotations row,
        SaveSalesQuotationDto dto,
        SalesInvoiceQuoteDto priced,
        long userId
    )
    {
        if (priced.Errors.Count > 0)
        {
            throw new InvalidOperationException(priced.Errors[0]);
        }

        if (priced.Lines.Count == 0)
        {
            throw new InvalidOperationException("Add at least one item.");
        }

        // Customer or prospect
        if (dto.CustomerId > 0)
        {
            CustomerProfiles customer =
                await _context.Set<CustomerProfiles>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.CustomerId == dto.CustomerId && !x.IsDeleted)
                ?? throw new InvalidOperationException("The customer was not found. It may have been deleted.");

            row.CustomerId = customer.CustomerId;
            row.CustomerCode = Limit(customer.CustomerCode, 20);
            row.CustomerName = Limit(customer.DisplayName, 200);
            row.CustomerPhone = Limit(customer.Phone1, 20);
            row.CustomerAddress = Limit(customer.PresentAddress, 500);
        }
        else
        {
            string name = Limit(dto.ProspectName, 200);

            string phone = Limit(dto.ProspectPhone, 20);

            if (name.Length < 2)
            {
                throw new InvalidOperationException("Pick the customer, or type the prospect's name.");
            }

            if (phone.Length < 6)
            {
                throw new InvalidOperationException("Type the prospect's phone.");
            }

            row.CustomerId = null;
            row.CustomerCode = string.Empty;
            row.CustomerName = name;
            row.CustomerPhone = phone;
            row.CustomerAddress = Limit(dto.ProspectAddress, 500);
        }

        // Sales person (none = the user)
        long personId = dto.SalesPersonId is > 0 ? dto.SalesPersonId.Value : userId;

        var person =
            await _context.Set<UserProfileEntity>()
                .AsNoTracking()
                .Where(u => u.UserProfileId == personId)
                .Select(u => new { u.DisplayName, u.FullName, u.UserName })
                .FirstOrDefaultAsync();

        row.SalesPersonId = dto.SalesPersonId is > 0 ? dto.SalesPersonId : null;
        row.SalesPersonName =
            Limit(
                person == null
                    ? string.Empty
                    : !string.IsNullOrWhiteSpace(person.DisplayName)
                        ? person.DisplayName
                        : !string.IsNullOrWhiteSpace(person.FullName)
                            ? person.FullName
                            : person.UserName,
                150);

        row.WarehouseId = dto.WarehouseId;
        row.SaleType = Limit(dto.SaleType, 10);
        row.InvoiceSpecialType = string.IsNullOrWhiteSpace(dto.InvoiceSpecialType) ? "None" : Limit(dto.InvoiceSpecialType, 10);
        row.InvoiceSpecialValue = dto.InvoiceSpecialValue;
        row.FractionalDiscount = priced.FractionalDiscount;
        row.TotalQuantity = priced.TotalQuantity;
        row.GrossAmount = priced.GrossAmount;
        row.QuotationTotal = priced.InvoiceTotal;
        row.DiscountAmount = Math.Max(0m, priced.GrossAmount - priced.InvoiceTotal);
        row.TotalVatInside = priced.TotalVatInside;
        row.Narration = Limit(dto.Narration, 500);
        row.Terms = Limit(dto.Terms, 1000);
        row.SpecificUnits = row.ProductType == "MB" && dto.SpecificUnits;
    }


    //===========================================================
    // MB Specific unit : the bikes named on each model line
    //===========================================================

    // Kept on the line as JSON (short keys)
    private sealed class UnitJson
    {
        public long u { get; set; }

        public string c { get; set; } = string.Empty;

        public string e { get; set; } = string.Empty;

        public string k { get; set; } = string.Empty;
    }

    private static List<SalesQuotationUnitDto> UnitsOf(long productId, string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new List<SalesQuotationUnitDto>();
        }

        try
        {
            return (JsonSerializer.Deserialize<List<UnitJson>>(json) ?? new List<UnitJson>())
                .Select(x => new SalesQuotationUnitDto
                {
                    ProductId = productId,
                    MotorBikeUnitId = x.u,
                    ChassisNo = x.c,
                    EngineNo = x.e,
                    ColorName = x.k
                })
                .ToList();
        }
        catch (JsonException)
        {
            return new List<SalesQuotationUnitDto>();
        }
    }

    // The bikes of each priced line (by line no) : one per
    // quantity, of the line's model, in stock in the quotation's
    // warehouse (nothing is reserved : a quotation takes no stock)
    private async Task<Dictionary<int, string>> UnitsByLineAsync(SalesQuotations row, SaveSalesQuotationDto dto, SalesInvoiceQuoteDto priced)
    {
        Dictionary<int, string> result = new();

        if (!row.SpecificUnits)
        {
            return result;
        }

        List<SalesQuotationUnitDto> asked =
            (dto.Units ?? new())
                .Where(x => x != null && x.MotorBikeUnitId > 0)
                .ToList();

        List<long> ids = asked.Select(x => x.MotorBikeUnitId).ToList();

        if (ids.Count != ids.Distinct().Count())
        {
            throw new InvalidOperationException("A chassis is picked twice.");
        }

        long warehouseBranch =
            await _context.Set<AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses>()
                .AsNoTracking()
                .Where(x => x.WarehouseId == row.WarehouseId)
                .Select(x => x.BranchId)
                .FirstOrDefaultAsync();

        Dictionary<long, MotorBikeUnitsEntity> units =
            await _context.Set<MotorBikeUnitsEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.MotorBikeUnitId) && !x.IsDeleted)
                .ToDictionaryAsync(x => x.MotorBikeUnitId);

        HashSet<long> used = new();

        foreach (SalesInvoiceLineDto line in priced.Lines.OrderBy(x => x.LineNo))
        {
            List<SalesQuotationUnitDto> mine =
                asked
                    .Where(x => x.ProductId == line.ProductId && !used.Contains(x.MotorBikeUnitId))
                    .ToList();

            int need = (int)Math.Round(line.Quantity, 0);

            if (mine.Count < need)
            {
                throw new InvalidOperationException(
                    $"{line.ProductName} : pick {need} chassis (picked {mine.Count}), or turn Specific unit off.");
            }

            List<UnitJson> rows = new();

            foreach (SalesQuotationUnitDto pick in mine.Take(need))
            {
                if (!units.TryGetValue(pick.MotorBikeUnitId, out MotorBikeUnitsEntity? unit))
                {
                    throw new InvalidOperationException($"A picked chassis ({pick.ChassisNo}) was not found : pick it again.");
                }

                if (unit.ProductId != line.ProductId)
                {
                    throw new InvalidOperationException($"Chassis {unit.ChassisNo} is not a {line.ProductName}.");
                }

                if (unit.Status != "InStock")
                {
                    throw new InvalidOperationException($"Chassis {unit.ChassisNo} is not in stock ({unit.Status}).");
                }

                bool here =
                    unit.WarehouseId == row.WarehouseId
                    ||
                    (unit.WarehouseId == null && unit.BranchId == warehouseBranch);

                if (!here)
                {
                    throw new InvalidOperationException($"Chassis {unit.ChassisNo} is not in this warehouse.");
                }

                used.Add(unit.MotorBikeUnitId);

                rows.Add(
                    new UnitJson
                    {
                        u = unit.MotorBikeUnitId,
                        c = Limit(unit.ChassisNo, 60),
                        e = Limit(unit.EngineNo, 60),
                        k = Limit(pick.ColorName, 60)
                    });
            }

            result[line.LineNo] = JsonSerializer.Serialize(rows);
        }

        if (used.Count != ids.Count)
        {
            throw new InvalidOperationException("A picked chassis is not on any line (its model is not on the quotation) : remove it.");
        }

        return result;
    }

    private async Task SaveLinesAsync(SalesQuotations row, SaveSalesQuotationDto dto, SalesInvoiceQuoteDto priced)
    {
        List<SalesQuotationLines> old =
            await LineRows
                .Where(x => x.SalesQuotationId == row.SalesQuotationId)
                .ToListAsync();

        LineRows.RemoveRange(old);

        Dictionary<int, string> unitsByLine = await UnitsByLineAsync(row, dto, priced);

        int no = 1;

        foreach (SalesInvoiceLineDto line in priced.Lines.OrderBy(x => x.LineNo))
        {
            CreateSalesInvoiceLineDto? typed =
                line.LineNo >= 1 && line.LineNo <= dto.Lines.Count
                    ? dto.Lines[line.LineNo - 1]
                    : null;

            LineRows.Add(
                new SalesQuotationLines
                {
                    SalesQuotationId = row.SalesQuotationId,
                    LineNo = no++,
                    ProductId = line.ProductId,
                    ProductCode = Limit(line.ProductCode, 50),
                    PartNumber = Limit(line.PartNumber, 50),
                    ProductName = Limit(line.ProductName, 250),
                    Unit = Limit(line.Unit, 20),
                    Quantity = line.Quantity,
                    TypedPrice = typed?.UnitPrice is > 0 ? typed.UnitPrice : null,
                    TypedSpecialPercent = typed?.SpecialDiscountPercent is > 0 ? typed.SpecialDiscountPercent : null,
                    TypedSpecialTk = typed?.SpecialDiscountTk is > 0 ? typed.SpecialDiscountTk : null,
                    Mrp = line.Mrp,
                    UnitPrice = line.UnitPrice,
                    GrossAmount = line.GrossAmount,
                    DiscountLabel = Limit(line.DiscountLabel, 100),
                    DiscountAmount = Math.Max(0m, line.GrossAmount - line.LineTotal),
                    NetAmount = line.LineTotal,
                    VatInside = line.VatInside,
                    UnitsJson = unitsByLine.GetValueOrDefault(line.LineNo, string.Empty)
                });
        }
    }


    //===========================================================
    // Create / Update
    //===========================================================

    public async Task<SalesQuotationSavedDto> CreateAsync(string productType, SaveSalesQuotationDto dto, SalesInvoiceQuoteDto priced, long branchId, long userId)
    {
        string type = TypeCode(productType);

        if (branchId <= 0)
        {
            throw new InvalidOperationException("Log in with a branch first.");
        }

        DateOnly date = Today;

        int? validity = await ValidityDaysAsync(type);

        SalesQuotationSavedDto result = new();

        await InTransactionAsync(
            async () =>
            {
                VoucherNumberDto number = await _numberService.NextAsync(Types[type].Prefix, branchId, date);

                DateTime now = DateTime.UtcNow;

                SalesQuotations row =
                    new()
                    {
                        ProductType = type,
                        QuotationNo = number.VoucherNo,
                        QuotationDate = date,
                        ValidUntil = validity.HasValue ? date.AddDays(validity.Value) : null,
                        BranchId = branchId,
                        Status = StatusOpen,
                        CreatedBy = userId,
                        CreatedDate = now
                    };

                await FillAsync(row, dto, priced, userId);

                Rows.Add(row);

                await _context.SaveChangesAsync();

                await SaveLinesAsync(row, dto, priced);

                AddHistory(row, "Create", "Quotation Created",
                    $"{row.QuotationNo} : {row.CustomerName}{(row.CustomerId.HasValue ? string.Empty : " (prospect)")}, {row.QuotationTotal:N2}.",
                    userId);

                await _context.SaveChangesAsync();

                result.PublicId = row.PublicId;
                result.QuotationNo = row.QuotationNo;
            });

        if (result.PublicId == Guid.Empty)
        {
            result.PublicId =
                await Rows.Where(x => x.QuotationNo == result.QuotationNo).Select(x => x.PublicId).FirstAsync();
        }

        return result;
    }


    public async Task<SalesQuotationSavedDto> UpdateAsync(string productType, Guid publicId, SaveSalesQuotationDto dto, SalesInvoiceQuoteDto priced, long userId)
    {
        string type = TypeCode(productType);

        SalesQuotations row = await FindAsync(type, publicId);

        if (row.Status != StatusOpen)
        {
            throw new InvalidOperationException($"{row.QuotationNo} is {row.Status} : it cannot be changed.");
        }

        string held =
            (await HeldByAsync(type, new List<long> { row.SalesQuotationId }))
                .GetValueOrDefault(row.SalesQuotationId, string.Empty);

        if (held.Length > 0)
        {
            throw new InvalidOperationException($"{row.QuotationNo} is on Sales Invoice {held} : change the invoice (or delete it) instead.");
        }

        await InTransactionAsync(
            async () =>
            {
                await FillAsync(row, dto, priced, userId);

                row.ModifiedBy = userId;
                row.ModifiedDate = DateTime.UtcNow;

                await SaveLinesAsync(row, dto, priced);

                AddHistory(row, "Update", "Quotation Updated",
                    $"{row.QuotationNo} : {row.CustomerName}, {row.QuotationTotal:N2}.",
                    userId);

                await _context.SaveChangesAsync();
            });

        return new SalesQuotationSavedDto { PublicId = row.PublicId, QuotationNo = row.QuotationNo };
    }


    //===========================================================
    // Cancel / Delete
    //===========================================================

    public async Task CancelAsync(string productType, Guid publicId, CancelSalesQuotationDto dto, long userId)
    {
        string type = TypeCode(productType);

        SalesQuotations row = await FindAsync(type, publicId);

        if (row.Status != StatusOpen)
        {
            throw new InvalidOperationException($"{row.QuotationNo} is {row.Status}.");
        }

        string reason = Limit(dto?.Reason, 500);

        if (reason.Length < 5)
        {
            throw new InvalidOperationException("A reason (at least 5 characters) is required to cancel the quotation.");
        }

        string held =
            (await HeldByAsync(type, new List<long> { row.SalesQuotationId }))
                .GetValueOrDefault(row.SalesQuotationId, string.Empty);

        if (held.Length > 0)
        {
            throw new InvalidOperationException($"{row.QuotationNo} is on Sales Invoice {held} : delete that draft first.");
        }

        DateTime now = DateTime.UtcNow;

        row.Status = StatusCancelled;
        row.CancelReason = reason;
        row.CancelledBy = userId;
        row.CancelledDate = now;
        row.ModifiedBy = userId;
        row.ModifiedDate = now;

        AddHistory(row, "Cancel", "Quotation Cancelled", $"{row.QuotationNo} : {reason}.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task DeleteAsync(string productType, Guid publicId, long userId)
    {
        string type = TypeCode(productType);

        SalesQuotations row = await FindAsync(type, publicId);

        if (row.Status != StatusOpen)
        {
            throw new InvalidOperationException($"{row.QuotationNo} is {row.Status} : it cannot be deleted.");
        }

        string held =
            (await HeldByAsync(type, new List<long> { row.SalesQuotationId }))
                .GetValueOrDefault(row.SalesQuotationId, string.Empty);

        if (held.Length > 0)
        {
            throw new InvalidOperationException($"{row.QuotationNo} is on Sales Invoice {held} : delete that draft first.");
        }

        DateTime now = DateTime.UtcNow;

        row.IsDeleted = true;
        row.DeletedBy = userId;
        row.DeletedDate = now;

        AddHistory(row, "Delete", "Quotation Deleted", $"{row.QuotationNo} deleted.", userId);

        await _context.SaveChangesAsync();
    }
}
