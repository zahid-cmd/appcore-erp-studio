//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using AppCore.Application.SalesOperations.MotorBikeSales;
using AppCore.Application.Settings.ServiceSettings;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.SalesOperations.MotorBikeSales;
using AppCore.Domain.Entities.Settings.ServiceSettings;
using AppCore.Domain.Entities.WarrantyManagement.WarrantyControl;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Inventory;
using AppCore.Infrastructure.Platform.Sales;
using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;
using BikeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeModels;
using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;
using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;
using SchemesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeAccessorySchemes;
using SchemeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeAccessorySchemeModels;
using SchemeItemsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeAccessorySchemeItems;
using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;


//===============================================================
// Namespace (kept : DependencyInjection's AUTO block uses it)
//===============================================================

namespace AppCore.Infrastructure.Configurations.SalesOperations.MotorBikeSales;


//===============================================================
// Bike Deliveries Repository (hand-written page, 2026-11-10;
// replaces the generated one). Decisions :
// claude/decisions-bike-deliveries-pdi.md
//
//   Pending  : bikes of posted Sales Invoices - MB whose line is
//              DeliveryStatus Pending.
//   Save     : final. The PDI sheet of the bike's model must be
//              filled (every required item; Not OK needs a
//              remark; Reading = a number) unless "Delivery
//              without PDI" (CFG-MOD-008-0081) is ON. Payment
//              balance and CKD status are not checked.
//              -> the line Delivered, the Sales Warranty record
//              made (Warranty Management policy on the delivery
//              date, start = delivery date).
//   Undo     : admin (activity "Undo Delivery"), reason required;
//              the line back to Pending, the warranty Void.
//===============================================================

public class BikeDeliveriesRepository
    : IBikeDeliveriesRepository
{
    private const string HistoryModule = "Sales Operations";

    private const string HistoryEntity = "BikeDeliveries";

    private const string SwitchDeliveryOnSale = "CFG-MOD-008-0011";

    private const string SwitchDeliveryWithoutPdi = "CFG-MOD-008-0081";

    private const string LinePending = "Pending";

    private const string LineDelivered = "Delivered";

    private const string InvoicePosted = "Posted";

    private static readonly string[] CheckAnswers = { "OK", "Not OK", "N/A" };

    private readonly AppDbContext _context;

    public BikeDeliveriesRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private static DateOnly Today => DateOnly.FromDateTime(DateTime.Now);

    private static string Iso(DateOnly? date) =>
        date.HasValue ? date.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : string.Empty;

    private static string Clean(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

    private static string Limited(string? value, int max, string label)
    {
        string text = Clean(value);

        if (text.Length > max)
        {
            throw new InvalidOperationException($"{label} cannot be longer than {max} characters.");
        }

        return text;
    }

    private static DateOnly? ParseDate(string? text)
    {
        string value = (text ?? string.Empty).Trim();

        if (value.Length >= 10)
        {
            value = value.Substring(0, 10);
        }

        return DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly date)
            ? date
            : null;
    }

    private async Task<bool> SwitchOnAsync(string code, bool fallback)
    {
        var row =
            await _context.Set<SystemConfigurationsEntity>().AsNoTracking()
                .Where(x => x.ConfigurationCode == code && !x.IsDeleted)
                .Select(x => new { x.IsEnabled })
                .FirstOrDefaultAsync();

        return row?.IsEnabled ?? fallback;
    }

    private void AddHistory(long id, string type, string title, string description, long userId)
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = id,
                ActivityType = type,
                ActivityTitle = title,
                ActivityDescription = description.Length > 1000 ? description.Substring(0, 1000) : description,
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }


    //===========================================================
    // Defaults
    //===========================================================

    public async Task<BikeDeliveryDefaultsDto> GetDefaultsAsync()
    {
        return new BikeDeliveryDefaultsDto
        {
            DeliveryWithoutPdi = await SwitchOnAsync(SwitchDeliveryWithoutPdi, false),
            DeliveryOnSale = await SwitchOnAsync(SwitchDeliveryOnSale, false),
            Today = Iso(Today)
        };
    }


    //===========================================================
    // List
    //===========================================================

    private static bool Matches(BikeDeliveryRowDto row, string search)
    {
        if (search.Length == 0)
        {
            return true;
        }

        return new[]
        {
            row.SalesInvoiceNo, row.CustomerName, row.CustomerPhone, row.ProductName,
            row.ModelName, row.ColorName, row.ChassisNo, row.EngineNo, row.DeliveryNo, row.Status
        }
        .Any(x => (x ?? string.Empty).Contains(search, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<BikeDeliveryListDto> GetListAsync(long? branchId, string tab, string search)
    {
        string find = Clean(search);

        DateOnly today = Today;

        var pending =
            await
            (
                from l in _context.Set<SalesInvoicesMbLines>().AsNoTracking()
                join h in _context.Set<SalesInvoicesMb>().AsNoTracking() on l.SalesInvoiceId equals h.SalesInvoiceId
                where !h.IsDeleted
                      && h.Status == InvoicePosted
                      && l.DeliveryStatus == LinePending
                      && (l.MotorBikeUnitId ?? 0) > 0
                      && (branchId == null || h.BranchId == branchId)
                select new
                {
                    l.SalesInvoiceLineId,
                    l.ProductId,
                    l.ProductName,
                    l.ColorName,
                    l.ChassisNo,
                    l.EngineNo,
                    h.PublicId,
                    h.InvoiceNo,
                    h.InvoiceDate,
                    h.CustomerName,
                    h.CustomerPhone,
                    h.DueAmount,
                    h.PaymentTerm
                }
            )
            .ToListAsync();

        List<BikeDeliveries> delivered =
            await _context.Set<BikeDeliveries>().AsNoTracking()
                .Where(x => !x.IsDeleted && (branchId == null || x.BranchId == branchId))
                .OrderByDescending(x => x.DeliveryDate).ThenByDescending(x => x.BikeDeliveryId)
                .ToListAsync();

        List<long> productIds = pending.Select(x => x.ProductId).Distinct().ToList();

        HashSet<long> electric = await MotorBikePower.ElectricAsync(_context, productIds);

        var models =
            await
            (
                from b in _context.Set<MotorBikesEntity>().AsNoTracking()
                join s in _context.Set<AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory>().AsNoTracking()
                    on b.ProductSubCategoryId equals s.ProductSubCategoryId
                join m in _context.Set<BikeModelsEntity>().AsNoTracking() on s.BikeModelId equals (long?)m.BikeModelId
                where productIds.Contains(b.MotorBikeId)
                select new { b.MotorBikeId, m.ModelName }
            )
            .ToListAsync();

        List<long> invoiceIds = delivered.Select(x => x.SalesInvoiceId).Distinct().ToList();

        var invoices =
            await _context.Set<SalesInvoicesMb>().AsNoTracking()
                .Where(x => invoiceIds.Contains(x.SalesInvoiceId))
                .Select(x => new { x.SalesInvoiceId, x.PublicId, x.DueAmount, x.PaymentTerm })
                .ToListAsync();

        List<BikeDeliveryRowDto> rows =
            pending
                .Select(x => new BikeDeliveryRowDto
                {
                    Key = "L" + x.SalesInvoiceLineId.ToString(CultureInfo.InvariantCulture),
                    Status = LinePending,
                    SalesInvoiceLineId = x.SalesInvoiceLineId,
                    InvoicePublicId = x.PublicId,
                    SalesInvoiceNo = x.InvoiceNo,
                    InvoiceDate = Iso(x.InvoiceDate),
                    CustomerName = x.CustomerName,
                    CustomerPhone = x.CustomerPhone,
                    ProductName = x.ProductName,
                    ModelName = models.FirstOrDefault(m => m.MotorBikeId == x.ProductId)?.ModelName ?? string.Empty,
                    ColorName = x.ColorName,
                    ChassisNo = x.ChassisNo,
                    EngineNo = x.EngineNo,
                    IsElectric = electric.Contains(x.ProductId),
                    DaysWaiting = Math.Max(0, today.DayNumber - x.InvoiceDate.DayNumber),
                    DueAmount = x.DueAmount,
                    PaymentTerm = x.PaymentTerm
                })
                .OrderBy(x => x.InvoiceDate).ThenBy(x => x.SalesInvoiceNo)
                .ToList();

        rows.AddRange(
            delivered.Select(x =>
            {
                var inv = invoices.FirstOrDefault(i => i.SalesInvoiceId == x.SalesInvoiceId);

                return new BikeDeliveryRowDto
                {
                    Key = x.PublicId.ToString(),
                    Status = x.Status,
                    SalesInvoiceLineId = x.SalesInvoiceLineId,
                    InvoicePublicId = inv?.PublicId,
                    SalesInvoiceNo = x.SalesInvoiceNo,
                    InvoiceDate = Iso(x.SalesInvoiceDate),
                    CustomerName = x.CustomerName,
                    CustomerPhone = x.CustomerPhone,
                    ProductName = x.ProductName,
                    ModelName = x.ModelName,
                    ColorName = x.ColorName,
                    ChassisNo = x.ChassisNo,
                    EngineNo = x.EngineNo,
                    IsElectric = x.IsElectric,
                    DaysWaiting = Math.Max(0, x.DeliveryDate.DayNumber - x.SalesInvoiceDate.DayNumber),
                    DueAmount = inv?.DueAmount ?? 0,
                    PaymentTerm = inv?.PaymentTerm ?? string.Empty,
                    DeliveryPublicId = x.PublicId,
                    DeliveryNo = x.DeliveryNo,
                    DeliveryDate = Iso(x.DeliveryDate),
                    HasPdi = x.PdiTemplateId != null
                };
            }));

        List<BikeDeliveryRowDto> found = rows.Where(x => Matches(x, find)).ToList();

        string wanted = (tab ?? string.Empty).Trim();

        return new BikeDeliveryListDto
        {
            Pending = found.Count(x => x.Status == LinePending),
            Delivered = found.Count(x => x.Status == BikeDeliveryWriter.StatusDelivered),
            Undone = found.Count(x => x.Status == BikeDeliveryWriter.StatusUndone),
            Rows = wanted.Length == 0 || wanted.Equals("All", StringComparison.OrdinalIgnoreCase)
                ? found
                : found.Where(x => x.Status.Equals(wanted, StringComparison.OrdinalIgnoreCase)).ToList()
        };
    }


    //===========================================================
    // The bike of an invoice line
    //===========================================================

    private sealed class LineRow
    {
        public SalesInvoicesMbLines Line = null!;
        public SalesInvoicesMb Header = null!;
    }

    private async Task<LineRow> LineAsync(long lineId, bool track)
    {
        IQueryable<SalesInvoicesMbLines> lines = _context.Set<SalesInvoicesMbLines>();
        IQueryable<SalesInvoicesMb> heads = _context.Set<SalesInvoicesMb>();

        if (!track)
        {
            lines = lines.AsNoTracking();
            heads = heads.AsNoTracking();
        }

        SalesInvoicesMbLines line =
            await lines.FirstOrDefaultAsync(x => x.SalesInvoiceLineId == lineId)
            ?? throw new KeyNotFoundException("The sold bike (invoice line) was not found.");

        SalesInvoicesMb header =
            await heads.FirstOrDefaultAsync(x => x.SalesInvoiceId == line.SalesInvoiceId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The sales invoice of the bike was not found.");

        return new LineRow { Line = line, Header = header };
    }

    private async Task<BikeDeliveryBikeDto> BikeAsync(SalesInvoicesMb h, SalesInvoicesMbLines l)
    {
        BikeDeliveryWriter.BikeModelInfo info = await BikeDeliveryWriter.BikeModelAsync(_context, l.ProductId);

        string brand =
            info.BrandManagementId.HasValue
                ? await _context.Set<BrandManagementEntity>().AsNoTracking()
                    .Where(x => x.BrandManagementId == info.BrandManagementId.Value)
                    .Select(x => x.BrandName).FirstOrDefaultAsync() ?? string.Empty
                : string.Empty;

        string image =
            await _context.Set<MotorBikesEntity>().AsNoTracking()
                .Where(x => x.MotorBikeId == l.ProductId)
                .Select(x => x.ImagePath).FirstOrDefaultAsync() ?? string.Empty;

        HashSet<long> electric = await MotorBikePower.ElectricAsync(_context, new[] { l.ProductId });

        return new BikeDeliveryBikeDto
        {
            SalesInvoiceLineId = l.SalesInvoiceLineId,
            SalesInvoiceId = h.SalesInvoiceId,
            InvoicePublicId = h.PublicId,
            SalesInvoiceNo = h.InvoiceNo,
            InvoiceDate = Iso(h.InvoiceDate),
            BranchName = h.BranchName,
            CustomerCode = h.CustomerCode,
            CustomerName = h.CustomerName,
            CustomerPhone = h.CustomerPhone,
            CustomerAddress = h.CustomerAddress,
            ProductCode = l.ProductCode,
            ProductName = l.ProductName,
            ModelName = info.ModelName,
            BrandName = brand,
            ColorName = l.ColorName,
            ChassisNo = l.ChassisNo,
            EngineNo = l.EngineNo,
            ManufactureYear = l.ManufactureYear,
            IsElectric = electric.Contains(l.ProductId),
            ImagePath = image,
            InvoiceTotal = h.InvoiceTotal,
            DueAmount = h.DueAmount,
            PaymentTerm = h.PaymentTerm,
            SalesPersonName = h.SalesPersonName
        };
    }

    // The active template of a model
    private async Task<PdiTemplateDto?> TemplateOfAsync(long? modelId)
    {
        if (!modelId.HasValue)
        {
            return null;
        }

        long id = modelId.Value;

        PdiTemplates? template =
            await
            (
                from m in _context.Set<PdiTemplateModels>().AsNoTracking()
                join t in _context.Set<PdiTemplates>().AsNoTracking() on m.PdiTemplateId equals t.PdiTemplateId
                where m.BikeModelId == id && !t.IsDeleted && t.IsActive
                orderby t.PdiTemplateId
                select t
            )
            .FirstOrDefaultAsync();

        return template == null ? null : await AppCore.Infrastructure.Configurations.Settings.ServiceSettings.PdiTemplatesRepository.ReadAsync(_context, template);
    }

    // Bike Accessory Schemes valid on the date covering the model
    private async Task<List<BikeDeliveryAccessoryDto>> AccessoriesAsync(long? modelId, DateOnly date)
    {
        if (!modelId.HasValue)
        {
            return new List<BikeDeliveryAccessoryDto>();
        }

        long id = modelId.Value;

        var rows =
            await
            (
                from sm in _context.Set<SchemeModelsEntity>().AsNoTracking()
                join s in _context.Set<SchemesEntity>().AsNoTracking() on sm.BikeAccessorySchemeId equals s.BikeAccessorySchemeId
                join i in _context.Set<SchemeItemsEntity>().AsNoTracking() on s.BikeAccessorySchemeId equals i.BikeAccessorySchemeId
                join a in _context.Set<AccessoriesEntity>().AsNoTracking() on i.AccessoryId equals a.AccessoryId
                where sm.BikeModelId == id
                      && !s.IsDeleted && s.Status
                      && s.ValidFrom <= date
                      && (s.ValidTo == null || s.ValidTo >= date)
                orderby s.SchemeKind, s.SchemeCode, i.LineNo
                select new BikeDeliveryAccessoryDto
                {
                    SchemeCode = s.SchemeCode,
                    SchemeName = s.SchemeName,
                    SchemeKind = s.SchemeKind,
                    ProductCode = a.ProductCode,
                    AccessoryName = a.AccessoryName,
                    Unit = a.Unit,
                    Quantity = i.QuantityPerBike
                }
            )
            .ToListAsync();

        return rows;
    }

    public async Task<BikeDeliverySheetDto> GetSheetAsync(long salesInvoiceLineId, long? branchId)
    {
        LineRow row = await LineAsync(salesInvoiceLineId, false);

        CheckDeliverable(row, branchId);

        BikeDeliveryWriter.BikeModelInfo info = await BikeDeliveryWriter.BikeModelAsync(_context, row.Line.ProductId);

        return new BikeDeliverySheetDto
        {
            Bike = await BikeAsync(row.Header, row.Line),
            Template = await TemplateOfAsync(info.BikeModelId),
            Accessories = await AccessoriesAsync(info.BikeModelId, row.Header.InvoiceDate),
            Defaults = await GetDefaultsAsync()
        };
    }

    private static void CheckDeliverable(LineRow row, long? branchId)
    {
        if (row.Header.Status != InvoicePosted)
        {
            throw new InvalidOperationException($"Sales invoice {row.Header.InvoiceNo} is {row.Header.Status}; only a posted invoice's bike can be delivered.");
        }

        if (branchId.HasValue && branchId.Value > 0 && row.Header.BranchId != branchId.Value)
        {
            throw new InvalidOperationException($"Sales invoice {row.Header.InvoiceNo} belongs to {row.Header.BranchName}. Switch to that branch to deliver the bike.");
        }

        if ((row.Line.MotorBikeUnitId ?? 0) <= 0)
        {
            throw new InvalidOperationException("This invoice line has no chassis.");
        }

        if (row.Line.DeliveryStatus != LinePending)
        {
            throw new InvalidOperationException($"Chassis {row.Line.ChassisNo} is {row.Line.DeliveryStatus}, not waiting for delivery.");
        }
    }


    //===========================================================
    // One saved delivery
    //===========================================================

    public async Task<BikeDeliveryDto> GetAsync(Guid publicId)
    {
        BikeDeliveries d =
            await _context.Set<BikeDeliveries>().AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The bike delivery was not found.");

        LineRow row = await LineAsync(d.SalesInvoiceLineId, false);

        BikeDeliveryBikeDto bike = await BikeAsync(row.Header, row.Line);

        // The delivery's own copy wins (the bike may change later)
        bike.ChassisNo = d.ChassisNo;
        bike.EngineNo = d.EngineNo;
        bike.ColorName = d.ColorName;
        bike.IsElectric = d.IsElectric;

        if (d.ModelName.Length > 0)
        {
            bike.ModelName = d.ModelName;
        }

        PdiTemplates? template =
            d.PdiTemplateId.HasValue
                ? await _context.Set<PdiTemplates>().AsNoTracking().FirstOrDefaultAsync(x => x.PdiTemplateId == d.PdiTemplateId.Value)
                : null;

        List<BikeDeliveryAnswerDto> answers =
            await _context.Set<BikeDeliveryAnswers>().AsNoTracking()
                .Where(x => x.BikeDeliveryId == d.BikeDeliveryId)
                .OrderBy(x => x.SectionOrder).ThenBy(x => x.ItemOrder)
                .Select(x => new BikeDeliveryAnswerDto
                {
                    SectionOrder = x.SectionOrder,
                    SectionTitle = x.SectionTitle,
                    SectionTitleBn = x.SectionTitleBn,
                    HasComments = x.HasComments,
                    ItemOrder = x.ItemOrder,
                    ItemText = x.ItemText,
                    ItemTextBn = x.ItemTextBn,
                    ItemType = x.ItemType,
                    Unit = x.Unit,
                    IsRequired = x.IsRequired,
                    Answer = x.Answer,
                    Remark = x.Remark,
                    TechnicianComment = x.TechnicianComment,
                    QcComment = x.QcComment
                })
                .ToListAsync();

        SalesWarrantyRecords? warranty =
            await _context.Set<SalesWarrantyRecords>().AsNoTracking()
                .Where(x => x.SourceType == BikeDeliveryWriter.SourceBikeDelivery && x.SourceId == d.BikeDeliveryId && !x.IsDeleted)
                .OrderByDescending(x => x.SalesWarrantyRecordId)
                .FirstOrDefaultAsync();

        BikeDeliveryWarrantyDto? warrantyDto = null;

        if (warranty != null)
        {
            List<BikeDeliveryWarrantyPartDto> parts =
                (await _context.Set<SalesWarrantyRecordParts>().AsNoTracking()
                    .Where(x => x.SalesWarrantyRecordId == warranty.SalesWarrantyRecordId)
                    .OrderBy(x => x.SalesWarrantyRecordPartId)
                    .ToListAsync())
                .Select(x => new BikeDeliveryWarrantyPartDto
                {
                    PartName = x.PartName,
                    ExpiryDate = Iso(x.ExpiryDate),
                    KmLimit = x.KmLimit,
                    Notes = x.Notes
                })
                .ToList();

            warrantyDto = new BikeDeliveryWarrantyDto
            {
                Code = warranty.Code,
                PolicyCode = warranty.PolicyCode,
                PolicyName = warranty.PolicyName,
                StartDate = Iso(warranty.StartDate),
                ExpiryDate = Iso(warranty.ExpiryDate),
                KmLimit = warranty.KmLimit,
                Status = warranty.Status,
                Parts = parts
            };
        }

        return new BikeDeliveryDto
        {
            BikeDeliveryId = d.BikeDeliveryId,
            PublicId = d.PublicId,
            DeliveryNo = d.DeliveryNo,
            Status = d.Status,
            DeliveryDate = Iso(d.DeliveryDate),
            ReceivedBy = d.ReceivedBy,
            ReceiverName = d.ReceiverName,
            ReceiverPhone = d.ReceiverPhone,
            OdometerKm = d.OdometerKm,
            Remarks = d.Remarks,
            PdiTemplateCode = d.PdiTemplateCode,
            PdiTemplateName = d.PdiTemplateName,
            SheetTitle = template?.SheetTitle ?? string.Empty,
            SheetTitleBn = template?.SheetTitleBn ?? string.Empty,
            FooterNote = template?.FooterNote ?? string.Empty,
            FooterNoteBn = template?.FooterNoteBn ?? string.Empty,
            PdiDate = Iso(d.PdiDate),
            TechnicianName = d.TechnicianName,
            ProblemsFound = d.ProblemsFound,
            PdiRemarks = d.PdiRemarks,
            UndoReason = d.UndoReason,
            UndoneDate = d.UndoneDate.HasValue ? d.UndoneDate.Value.ToLocalTime().ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture) : string.Empty,
            CreatedDate = d.CreatedDate.ToLocalTime().ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
            Bike = bike,
            Answers = answers,
            Accessories = await AccessoriesAsync(d.BikeModelId, d.SalesInvoiceDate),
            Warranty = warrantyDto
        };
    }


    //===========================================================
    // Save (final)
    //===========================================================

    private static List<BikeDeliveryAnswers> CheckSheet(PdiTemplateDto template, SaveBikeDeliveryDto dto)
    {
        List<BikeDeliveryAnswers> answers = new();

        Dictionary<(int, int), SaveBikeDeliveryAnswerDto> given =
            (dto.Answers ?? new())
                .GroupBy(x => (x.SectionIndex, x.ItemIndex))
                .ToDictionary(g => g.Key, g => g.Last());

        for (int s = 0; s < template.Sections.Count; s++)
        {
            PdiTemplateSectionDto section = template.Sections[s];

            for (int i = 0; i < section.Items.Count; i++)
            {
                PdiTemplateItemDto item = section.Items[i];

                given.TryGetValue((s, i), out SaveBikeDeliveryAnswerDto? a);

                string answer = Clean(a?.Answer);
                string remark = Limited(a?.Remark, 500, $"Remark of \"{item.Text}\"");
                string label = $"\"{item.Text}\" ({section.Title})";

                if (item.ItemType == "Check")
                {
                    string? match = CheckAnswers.FirstOrDefault(x => string.Equals(x, answer, StringComparison.OrdinalIgnoreCase));

                    if (answer.Length > 0 && match == null)
                    {
                        throw new InvalidOperationException($"{label} : the answer must be OK, Not OK or N/A.");
                    }

                    answer = match ?? string.Empty;

                    if (answer == "Not OK" && remark.Length == 0)
                    {
                        throw new InvalidOperationException($"{label} is Not OK : write a remark (what is wrong / what was agreed).");
                    }
                }
                else if (item.ItemType == "Reading")
                {
                    if (answer.Length > 0 && !decimal.TryParse(answer, NumberStyles.Number, CultureInfo.InvariantCulture, out _))
                    {
                        throw new InvalidOperationException($"{label} : the reading must be a number.");
                    }
                }

                if (answer.Length > 200)
                {
                    throw new InvalidOperationException($"{label} : the answer is too long.");
                }

                if (item.IsRequired && answer.Length == 0)
                {
                    throw new InvalidOperationException($"{label} is not filled. Fill every item of the PDI sheet.");
                }

                answers.Add(new BikeDeliveryAnswers
                {
                    SectionOrder = s + 1,
                    SectionTitle = section.Title,
                    SectionTitleBn = section.TitleBn,
                    HasComments = section.HasComments,
                    ItemOrder = i + 1,
                    ItemText = item.Text,
                    ItemTextBn = item.TextBn,
                    ItemType = item.ItemType,
                    Unit = item.Unit,
                    IsRequired = item.IsRequired,
                    Answer = answer,
                    Remark = remark,
                    TechnicianComment = section.HasComments ? Limited(a?.TechnicianComment, 500, $"Technician's comment of \"{item.Text}\"") : string.Empty,
                    QcComment = section.HasComments ? Limited(a?.QcComment, 500, $"QC In-charge's comment of \"{item.Text}\"") : string.Empty
                });
            }
        }

        return answers;
    }

    public async Task<BikeDeliveryDto> CreateAsync(SaveBikeDeliveryDto dto, long? branchId, long userId)
    {
        if (dto.SalesInvoiceLineId <= 0)
        {
            throw new InvalidOperationException("Pick the sold bike to deliver.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        // One delivery at a time per invoice line
        await _context.Database.ExecuteSqlRawAsync(
            "SELECT 1 FROM \"SalesInvoicesMbLines\" WHERE \"SalesInvoiceLineId\" = {0} FOR UPDATE",
            dto.SalesInvoiceLineId);

        LineRow row = await LineAsync(dto.SalesInvoiceLineId, true);

        CheckDeliverable(row, branchId);

        DateOnly date =
            ParseDate(dto.DeliveryDate)
            ?? throw new InvalidOperationException("Delivery Date is required (a valid date).");

        if (date < row.Header.InvoiceDate)
        {
            throw new InvalidOperationException($"Delivery Date cannot be before the invoice date ({row.Header.InvoiceDate:dd-MMM-yyyy}).");
        }

        if (date > Today)
        {
            throw new InvalidOperationException("Delivery Date cannot be in the future.");
        }

        string receivedBy =
            string.Equals((dto.ReceivedBy ?? string.Empty).Trim(), "Nominee", StringComparison.OrdinalIgnoreCase) ? "Nominee" : "Customer";

        string receiverName = Limited(dto.ReceiverName, 150, "Received by (name)");
        string receiverPhone = Regex.Replace(dto.ReceiverPhone ?? string.Empty, "[^0-9]", string.Empty);

        if (receivedBy == "Nominee")
        {
            if (receiverName.Length == 0)
            {
                throw new InvalidOperationException("Write the nominee's name.");
            }

            if (!Regex.IsMatch(receiverPhone, "^01[0-9]{9}$"))
            {
                throw new InvalidOperationException("The nominee's phone must be 11 digits starting 01.");
            }
        }
        else
        {
            receiverName = row.Header.CustomerName;
            receiverPhone = row.Header.CustomerPhone;
        }

        bool withoutPdi = await SwitchOnAsync(SwitchDeliveryWithoutPdi, false);

        BikeDeliveryWriter.BikeModelInfo info = await BikeDeliveryWriter.BikeModelAsync(_context, row.Line.ProductId);

        PdiTemplateDto? template = await TemplateOfAsync(info.BikeModelId);

        bool anyAnswer =
            (dto.Answers ?? new()).Any(x => Clean(x.Answer).Length > 0)
            || Clean(dto.TechnicianName).Length > 0;

        bool usePdi = template != null && (!withoutPdi || anyAnswer);

        if (!withoutPdi && template == null)
        {
            throw new InvalidOperationException(
                $"Model {(info.ModelName.Length > 0 ? info.ModelName : row.Line.ProductName)} has no PDI template. Add it on Settings > Service Settings > PDI Templates (or turn ON \"Delivery without PDI\").");
        }

        List<BikeDeliveryAnswers> answers = new();
        DateOnly? pdiDate = null;
        string technician = string.Empty;

        if (usePdi)
        {
            technician = Limited(dto.TechnicianName, 150, "Technician Name");

            if (technician.Length == 0)
            {
                throw new InvalidOperationException("Write the Technician's name (PDI sheet).");
            }

            pdiDate = ParseDate(dto.PdiDate) ?? date;

            if (pdiDate > date)
            {
                throw new InvalidOperationException("PDI Date cannot be after the Delivery Date.");
            }

            answers = CheckSheet(template!, dto);
        }

        HashSet<long> electric = await MotorBikePower.ElectricAsync(_context, new[] { row.Line.ProductId });

        DateTime now = DateTime.UtcNow;

        BikeDeliveries delivery =
            new()
            {
                DeliveryNo = await BikeDeliveryWriter.NextDeliveryNoAsync(_context),
                BranchId = row.Header.BranchId,
                BranchName = row.Header.BranchName,
                SalesInvoiceId = row.Header.SalesInvoiceId,
                SalesInvoiceNo = row.Header.InvoiceNo,
                SalesInvoiceDate = row.Header.InvoiceDate,
                SalesInvoiceLineId = row.Line.SalesInvoiceLineId,
                CustomerId = row.Header.CustomerId,
                CustomerCode = row.Header.CustomerCode,
                CustomerName = row.Header.CustomerName,
                CustomerPhone = row.Header.CustomerPhone,
                ProductId = row.Line.ProductId,
                ProductCode = row.Line.ProductCode,
                ProductName = row.Line.ProductName,
                BikeModelId = info.BikeModelId,
                ModelName = info.ModelName,
                MotorBikeUnitId = row.Line.MotorBikeUnitId,
                ChassisNo = row.Line.ChassisNo,
                EngineNo = row.Line.EngineNo,
                ColorName = row.Line.ColorName,
                IsElectric = electric.Contains(row.Line.ProductId),
                DeliveryDate = date,
                ReceivedBy = receivedBy,
                ReceiverName = receiverName.Length > 150 ? receiverName.Substring(0, 150) : receiverName,
                ReceiverPhone = receiverPhone.Length > 20 ? receiverPhone.Substring(0, 20) : receiverPhone,
                OdometerKm = 0,
                Remarks = Limited(dto.Remarks, 1000, "Remarks"),
                PdiTemplateId = usePdi ? template!.PdiTemplateId : null,
                PdiTemplateCode = usePdi ? template!.Code : string.Empty,
                PdiTemplateName = usePdi ? template!.Name : string.Empty,
                PdiDate = pdiDate,
                TechnicianName = technician,
                ProblemsFound = usePdi ? Limited(dto.ProblemsFound, 2000, "Problems found at delivery") : string.Empty,
                PdiRemarks = usePdi ? Limited(dto.PdiRemarks, 1000, "PDI Remarks") : string.Empty,
                Status = BikeDeliveryWriter.StatusDelivered,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        _context.Set<BikeDeliveries>().Add(delivery);

        await _context.SaveChangesAsync();

        foreach (BikeDeliveryAnswers answer in answers)
        {
            answer.BikeDeliveryId = delivery.BikeDeliveryId;
            _context.Set<BikeDeliveryAnswers>().Add(answer);
        }

        row.Line.DeliveryStatus = LineDelivered;
        row.Line.DeliveredDate = date;

        SalesWarrantyRecords? warranty = await BikeDeliveryWriter.CreateWarrantyAsync(_context, delivery, userId, now);

        int notOk = answers.Count(x => x.Answer == "Not OK");

        AddHistory(
            delivery.BikeDeliveryId,
            "Create",
            "Bike Delivered",
            $"{delivery.DeliveryNo} : chassis {delivery.ChassisNo}, invoice {delivery.SalesInvoiceNo}, {delivery.CustomerName}. "
                + (usePdi ? $"PDI {delivery.PdiTemplateCode} by {technician}{(notOk > 0 ? $", {notOk} Not OK" : string.Empty)}. " : "Without PDI. ")
                + (warranty != null ? $"Warranty {warranty.Code} until {Iso(warranty.ExpiryDate)}." : "No warranty policy on that date."),
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetAsync(delivery.PublicId);
    }


    //===========================================================
    // Undo (admin)
    //===========================================================

    public async Task UndoAsync(Guid publicId, string reason, long userId)
    {
        string why = Limited(reason, 500, "Reason");

        if (why.Length == 0)
        {
            throw new InvalidOperationException("Write the reason for undoing the delivery.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        BikeDeliveries d =
            await _context.Set<BikeDeliveries>().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The bike delivery was not found.");

        if (d.Status != BikeDeliveryWriter.StatusDelivered)
        {
            throw new InvalidOperationException($"Delivery {d.DeliveryNo} is already {d.Status}.");
        }

        LineRow row = await LineAsync(d.SalesInvoiceLineId, true);

        if (row.Header.Status != InvoicePosted)
        {
            throw new InvalidOperationException($"Sales invoice {row.Header.InvoiceNo} is {row.Header.Status}; the delivery cannot be undone.");
        }

        DateTime now = DateTime.UtcNow;

        d.Status = BikeDeliveryWriter.StatusUndone;
        d.UndoneBy = userId;
        d.UndoneDate = now;
        d.UndoReason = why;
        d.ModifiedBy = userId;
        d.ModifiedDate = now;

        row.Line.DeliveryStatus = LinePending;
        row.Line.DeliveredDate = null;

        await BikeDeliveryWriter.VoidWarrantyAsync(_context, d.BikeDeliveryId, $"Delivery {d.DeliveryNo} undone : {why}", userId, now);

        AddHistory(d.BikeDeliveryId, "Undo", "Delivery Undone", $"{d.DeliveryNo} : chassis {d.ChassisNo} back to Pending. Reason : {why}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }
}
