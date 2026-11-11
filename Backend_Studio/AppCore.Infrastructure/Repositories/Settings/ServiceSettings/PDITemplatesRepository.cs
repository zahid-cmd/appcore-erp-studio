//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.Settings.ServiceSettings;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.Settings.ServiceSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Sales;
using BikeModelsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BikeModels;
using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;


//===============================================================
// Namespace (kept : DependencyInjection's AUTO block uses it)
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ServiceSettings;


//===============================================================
// PDI Templates Repository (hand-written page, 2026-11-10;
// replaces the generated one : NEVER run Code Sync for it again)
//
//   Code PDI-0001 (deleted rows count, never reused).
//   Name required (unique among live templates); at least one
//   model; a model can be in only one active template; at least
//   one section with at least one item; item type Check /
//   Reading / Text (Reading : unit).
//   Sections and items are written again on every update (saved
//   deliveries keep their own copy of the text).
//   "...Bn" : Bangla kept escaped (ক ...).
//===============================================================

public class PdiTemplatesRepository
    : IPdiTemplatesRepository
{
    private const string HistoryModule = "Settings";

    private const string HistoryEntity = "PdiTemplates";

    private static readonly string[] ItemTypes = { "Check", "Reading", "Text" };

    private readonly AppDbContext _context;

    public PdiTemplatesRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<PdiTemplates> Templates => _context.Set<PdiTemplates>();

    private DbSet<PdiTemplateModels> TemplateModels => _context.Set<PdiTemplateModels>();

    private DbSet<PdiTemplateSections> Sections => _context.Set<PdiTemplateSections>();

    private DbSet<PdiTemplateItems> Items => _context.Set<PdiTemplateItems>();


    //===========================================================
    // Helpers
    //===========================================================

    private static string Clean(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

    private static string Limited
    (
        string? value,
        int max,
        string label
    )
    {
        string text = Clean(value);

        if (text.Length > max)
        {
            throw new InvalidOperationException($"{label} cannot be longer than {max} characters.");
        }

        return text;
    }

    private static string LimitedBn
    (
        string? value,
        int max,
        string label
    )
    {
        string text = BikeDeliveryWriter.EscapeBn(Clean(value));

        if (text.Length > max)
        {
            throw new InvalidOperationException($"{label} (Bangla) is too long.");
        }

        return text;
    }

    private static string NextCode(IEnumerable<string> codes)
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if (value.StartsWith("PDI-", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(4), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return $"PDI-{highest + 1:D4}";
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

    private async Task<PdiTemplates> FindAsync(Guid publicId)
    {
        return await Templates.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The PDI template was not found.");
    }


    //===========================================================
    // Read
    //===========================================================

    public async Task<List<PdiTemplateListItemDto>> GetListAsync()
    {
        List<PdiTemplates> templates =
            await Templates.AsNoTracking().Where(x => !x.IsDeleted).OrderBy(x => x.Code).ToListAsync();

        List<long> ids = templates.Select(x => x.PdiTemplateId).ToList();

        var models =
            await
            (
                from m in TemplateModels.AsNoTracking()
                join b in _context.Set<BikeModelsEntity>().AsNoTracking() on m.BikeModelId equals b.BikeModelId
                where ids.Contains(m.PdiTemplateId)
                orderby b.ModelName
                select new { m.PdiTemplateId, b.ModelName }
            )
            .ToListAsync();

        var sections =
            await Sections.AsNoTracking()
                .Where(x => ids.Contains(x.PdiTemplateId))
                .Select(x => new { x.PdiTemplateId, x.PdiTemplateSectionId })
                .ToListAsync();

        List<long> sectionIds = sections.Select(x => x.PdiTemplateSectionId).ToList();

        var itemCounts =
            await Items.AsNoTracking()
                .Where(x => sectionIds.Contains(x.PdiTemplateSectionId))
                .GroupBy(x => x.PdiTemplateSectionId)
                .Select(g => new { SectionId = g.Key, Count = g.Count() })
                .ToListAsync();

        return templates
            .Select(t =>
            {
                List<string> names = models.Where(m => m.PdiTemplateId == t.PdiTemplateId).Select(m => m.ModelName).ToList();
                List<long> mySections = sections.Where(s => s.PdiTemplateId == t.PdiTemplateId).Select(s => s.PdiTemplateSectionId).ToList();

                return new PdiTemplateListItemDto
                {
                    PublicId = t.PublicId,
                    Code = t.Code,
                    Name = t.Name,
                    ModelsText = string.Join(", ", names),
                    ModelCount = names.Count,
                    SectionCount = mySections.Count,
                    ItemCount = itemCounts.Where(c => mySections.Contains(c.SectionId)).Sum(c => c.Count),
                    IsActive = t.IsActive
                };
            })
            .ToList();
    }

    // The full template (also used by Bike Deliveries)
    public static async Task<PdiTemplateDto> ReadAsync(AppDbContext context, PdiTemplates t)
    {
        var models =
            await
            (
                from m in context.Set<PdiTemplateModels>().AsNoTracking()
                join b in context.Set<BikeModelsEntity>().AsNoTracking() on m.BikeModelId equals b.BikeModelId
                join r in context.Set<BrandManagementEntity>().AsNoTracking() on b.BrandManagementId equals r.BrandManagementId into rs
                from r in rs.DefaultIfEmpty()
                where m.PdiTemplateId == t.PdiTemplateId
                orderby b.ModelName
                select new
                {
                    Model = new PdiTemplateModelDto
                    {
                        BikeModelId = b.BikeModelId,
                        ModelName = b.ModelName,
                        BrandName = r != null ? r.BrandName : string.Empty
                    },
                    BrandImagePath = r != null ? r.BrandImagePath : string.Empty
                }
            )
            .ToListAsync();

        // The most used brand of the models (its logo is printed)
        var brand =
            models
                .Where(x => x.Model.BrandName.Length > 0)
                .GroupBy(x => x.Model.BrandName)
                .OrderByDescending(g => g.Count())
                .Select(g => new { Name = g.Key, Image = g.Select(x => x.BrandImagePath ?? string.Empty).FirstOrDefault(x => x.Length > 0) ?? string.Empty })
                .FirstOrDefault();

        List<PdiTemplateSections> sections =
            await context.Set<PdiTemplateSections>().AsNoTracking()
                .Where(x => x.PdiTemplateId == t.PdiTemplateId)
                .OrderBy(x => x.SortOrder).ThenBy(x => x.PdiTemplateSectionId)
                .ToListAsync();

        List<long> sectionIds = sections.Select(x => x.PdiTemplateSectionId).ToList();

        List<PdiTemplateItems> items =
            await context.Set<PdiTemplateItems>().AsNoTracking()
                .Where(x => sectionIds.Contains(x.PdiTemplateSectionId))
                .OrderBy(x => x.SortOrder).ThenBy(x => x.PdiTemplateItemId)
                .ToListAsync();

        return new PdiTemplateDto
        {
            PdiTemplateId = t.PdiTemplateId,
            PublicId = t.PublicId,
            Code = t.Code,
            Name = t.Name,
            NameBn = t.NameBn,
            SheetTitle = t.SheetTitle,
            SheetTitleBn = t.SheetTitleBn,
            FooterNote = t.FooterNote,
            FooterNoteBn = t.FooterNoteBn,
            ServiceProviderName = t.ServiceProviderName,
            BrandName = brand?.Name ?? string.Empty,
            BrandImagePath = brand?.Image ?? string.Empty,
            Remarks = t.Remarks,
            IsActive = t.IsActive,
            Models = models.Select(x => x.Model).ToList(),
            Sections = sections
                .Select(s => new PdiTemplateSectionDto
                {
                    Title = s.Title,
                    TitleBn = s.TitleBn,
                    HasComments = s.HasComments,
                    Items = items
                        .Where(i => i.PdiTemplateSectionId == s.PdiTemplateSectionId)
                        .Select(i => new PdiTemplateItemDto
                        {
                            Text = i.Text,
                            TextBn = i.TextBn,
                            ItemType = i.ItemType,
                            Unit = i.Unit,
                            IsRequired = i.IsRequired
                        })
                        .ToList()
                })
                .ToList()
        };
    }

    public async Task<PdiTemplateDto> GetAsync(Guid publicId)
    {
        PdiTemplates t =
            await Templates.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The PDI template was not found.");

        return await ReadAsync(_context, t);
    }

    public async Task<PdiTemplateDefaultsDto> GetDefaultsAsync()
    {
        string next =
            NextCode(await Templates.AsNoTracking().Select(x => x.Code).ToListAsync());

        var used =
            await
            (
                from m in TemplateModels.AsNoTracking()
                join t in Templates.AsNoTracking() on m.PdiTemplateId equals t.PdiTemplateId
                where !t.IsDeleted && t.IsActive
                select new { m.BikeModelId, t.Code, t.PublicId }
            )
            .ToListAsync();

        var models =
            await
            (
                from b in _context.Set<BikeModelsEntity>().AsNoTracking()
                join r in _context.Set<BrandManagementEntity>().AsNoTracking() on b.BrandManagementId equals r.BrandManagementId into rs
                from r in rs.DefaultIfEmpty()
                where !b.IsDeleted
                orderby b.ModelName
                select new { b.BikeModelId, b.ModelName, b.BikeType, BrandName = r != null ? r.BrandName : string.Empty }
            )
            .ToListAsync();

        return new PdiTemplateDefaultsDto
        {
            NextCode = next,
            Models = models
                .Select(m =>
                {
                    var u = used.FirstOrDefault(x => x.BikeModelId == m.BikeModelId);

                    return new PdiTemplateModelOptionDto
                    {
                        BikeModelId = m.BikeModelId,
                        ModelName = m.ModelName,
                        BrandName = m.BrandName ?? string.Empty,
                        BikeType = m.BikeType ?? string.Empty,
                        TemplateCode = u?.Code ?? string.Empty,
                        TemplatePublicId = u?.PublicId
                    };
                })
                .ToList()
        };
    }


    //===========================================================
    // Check + write
    //===========================================================

    private sealed class Checked
    {
        public string Name = string.Empty;
        public string NameBn = string.Empty;
        public string SheetTitle = string.Empty;
        public string SheetTitleBn = string.Empty;
        public string FooterNote = string.Empty;
        public string FooterNoteBn = string.Empty;
        public string ServiceProviderName = string.Empty;
        public string Remarks = string.Empty;
        public List<long> ModelIds = new();
        public List<PdiTemplateSectionDto> Sections = new();
    }

    private async Task<Checked> CheckAsync(SavePdiTemplateDto dto, long? selfId)
    {
        Checked c = new()
        {
            Name = Limited(dto.Name, 150, "Template Name"),
            NameBn = LimitedBn(dto.NameBn, 1000, "Template Name"),
            SheetTitle = Limited(dto.SheetTitle, 150, "Sheet Title"),
            SheetTitleBn = LimitedBn(dto.SheetTitleBn, 1000, "Sheet Title"),
            FooterNote = Limited(dto.FooterNote, 500, "Footer Note"),
            FooterNoteBn = LimitedBn(dto.FooterNoteBn, 3000, "Footer Note"),
            ServiceProviderName = Limited(dto.ServiceProviderName, 150, "Service Provider"),
            Remarks = Limited(dto.Remarks, 500, "Remarks")
        };

        if (c.Name.Length == 0)
        {
            throw new InvalidOperationException("Template Name is required.");
        }

        string lower = c.Name.ToLowerInvariant();

        bool taken =
            await Templates.AsNoTracking()
                .AnyAsync(x => !x.IsDeleted && x.Name.ToLower() == lower && (selfId == null || x.PdiTemplateId != selfId));

        if (taken)
        {
            throw new InvalidOperationException($"A PDI template named \"{c.Name}\" already exists.");
        }

        c.ModelIds = (dto.ModelIds ?? new()).Where(x => x > 0).Distinct().ToList();

        if (c.ModelIds.Count == 0)
        {
            throw new InvalidOperationException("Pick at least one bike model.");
        }

        int known =
            await _context.Set<BikeModelsEntity>().AsNoTracking()
                .CountAsync(x => c.ModelIds.Contains(x.BikeModelId) && !x.IsDeleted);

        if (known != c.ModelIds.Count)
        {
            throw new InvalidOperationException("A picked bike model was not found (deleted?). Reload the page.");
        }

        if (dto.IsActive)
        {
            var clash =
                await
                (
                    from m in TemplateModels.AsNoTracking()
                    join t in Templates.AsNoTracking() on m.PdiTemplateId equals t.PdiTemplateId
                    join b in _context.Set<BikeModelsEntity>().AsNoTracking() on m.BikeModelId equals b.BikeModelId
                    where c.ModelIds.Contains(m.BikeModelId) && !t.IsDeleted && t.IsActive && (selfId == null || t.PdiTemplateId != selfId)
                    select new { b.ModelName, t.Code }
                )
                .FirstOrDefaultAsync();

            if (clash != null)
            {
                throw new InvalidOperationException($"Model {clash.ModelName} is already in PDI template {clash.Code}. A model can be in only one active template.");
            }
        }

        List<PdiTemplateSectionDto> sections = dto.Sections ?? new();

        int sectionNo = 0;

        foreach (PdiTemplateSectionDto s in sections)
        {
            sectionNo++;

            string title = Limited(s.Title, 150, $"Section {sectionNo} title");

            if (title.Length == 0)
            {
                throw new InvalidOperationException($"Section {sectionNo} needs a title.");
            }

            List<PdiTemplateItemDto> items = new();

            int itemNo = 0;

            foreach (PdiTemplateItemDto i in s.Items ?? new())
            {
                itemNo++;

                string text = Limited(i.Text, 200, $"Section {sectionNo} item {itemNo}");

                if (text.Length == 0)
                {
                    throw new InvalidOperationException($"Section {sectionNo} item {itemNo} needs a text.");
                }

                string type = ItemTypes.FirstOrDefault(x => string.Equals(x, (i.ItemType ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase)) ?? string.Empty;

                if (type.Length == 0)
                {
                    throw new InvalidOperationException($"Section {sectionNo} item {itemNo} : the type must be Check, Reading or Text.");
                }

                string unit = type == "Reading" ? Limited(i.Unit, 20, $"Section {sectionNo} item {itemNo} unit") : string.Empty;

                items.Add(new PdiTemplateItemDto
                {
                    Text = text,
                    TextBn = LimitedBn(i.TextBn, 2000, $"Section {sectionNo} item {itemNo}"),
                    ItemType = type,
                    Unit = unit,
                    IsRequired = i.IsRequired
                });
            }

            if (items.Count == 0)
            {
                throw new InvalidOperationException($"Section {sectionNo} ({title}) needs at least one item.");
            }

            c.Sections.Add(new PdiTemplateSectionDto
            {
                Title = title,
                TitleBn = LimitedBn(s.TitleBn, 1000, $"Section {sectionNo} title"),
                HasComments = s.HasComments,
                Items = items
            });
        }

        if (c.Sections.Count == 0)
        {
            throw new InvalidOperationException("Add at least one section with its items.");
        }

        return c;
    }

    private async Task WriteChildrenAsync(long templateId, Checked c)
    {
        List<PdiTemplateSections> oldSections =
            await Sections.Where(x => x.PdiTemplateId == templateId).ToListAsync();

        List<long> oldIds = oldSections.Select(x => x.PdiTemplateSectionId).ToList();

        Items.RemoveRange(await Items.Where(x => oldIds.Contains(x.PdiTemplateSectionId)).ToListAsync());
        Sections.RemoveRange(oldSections);
        TemplateModels.RemoveRange(await TemplateModels.Where(x => x.PdiTemplateId == templateId).ToListAsync());

        await _context.SaveChangesAsync();

        foreach (long modelId in c.ModelIds)
        {
            TemplateModels.Add(new PdiTemplateModels { PdiTemplateId = templateId, BikeModelId = modelId });
        }

        int order = 0;

        foreach (PdiTemplateSectionDto s in c.Sections)
        {
            order++;

            PdiTemplateSections section =
                new()
                {
                    PdiTemplateId = templateId,
                    SortOrder = order,
                    Title = s.Title,
                    TitleBn = s.TitleBn,
                    HasComments = s.HasComments
                };

            Sections.Add(section);

            await _context.SaveChangesAsync();

            int itemOrder = 0;

            foreach (PdiTemplateItemDto i in s.Items)
            {
                itemOrder++;

                Items.Add(new PdiTemplateItems
                {
                    PdiTemplateSectionId = section.PdiTemplateSectionId,
                    SortOrder = itemOrder,
                    Text = i.Text,
                    TextBn = i.TextBn,
                    ItemType = i.ItemType,
                    Unit = i.Unit,
                    IsRequired = i.IsRequired
                });
            }
        }

        await _context.SaveChangesAsync();
    }

    private static string Summary(Checked c) =>
        $"{c.ModelIds.Count} model(s), {c.Sections.Count} section(s), {c.Sections.Sum(s => s.Items.Count)} item(s).";

    public async Task<PdiTemplateDto> CreateAsync(SavePdiTemplateDto dto, long userId)
    {
        Checked c = await CheckAsync(dto, null);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        PdiTemplates entity =
            new()
            {
                Code = NextCode(await Templates.AsNoTracking().Select(x => x.Code).ToListAsync()),
                Name = c.Name,
                NameBn = c.NameBn,
                SheetTitle = c.SheetTitle,
                SheetTitleBn = c.SheetTitleBn,
                FooterNote = c.FooterNote,
                FooterNoteBn = c.FooterNoteBn,
                ServiceProviderName = c.ServiceProviderName,
                Remarks = c.Remarks,
                IsActive = dto.IsActive,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Templates.Add(entity);

        await _context.SaveChangesAsync();

        await WriteChildrenAsync(entity.PdiTemplateId, c);

        AddHistory(entity.PdiTemplateId, "Create", "PDI Template Created", $"{entity.Code} {entity.Name} : {Summary(c)}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await ReadAsync(_context, entity);
    }

    public async Task UpdateAsync(Guid publicId, SavePdiTemplateDto dto, long userId)
    {
        PdiTemplates entity = await FindAsync(publicId);

        Checked c = await CheckAsync(dto, entity.PdiTemplateId);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        entity.Name = c.Name;
        entity.NameBn = c.NameBn;
        entity.SheetTitle = c.SheetTitle;
        entity.SheetTitleBn = c.SheetTitleBn;
        entity.FooterNote = c.FooterNote;
        entity.FooterNoteBn = c.FooterNoteBn;
        entity.ServiceProviderName = c.ServiceProviderName;
        entity.Remarks = c.Remarks;
        entity.IsActive = dto.IsActive;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await WriteChildrenAsync(entity.PdiTemplateId, c);

        AddHistory(entity.PdiTemplateId, "Update", "PDI Template Updated", $"{entity.Code} {entity.Name} : {Summary(c)}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        PdiTemplates entity = await FindAsync(publicId);

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity.PdiTemplateId, "Delete", "PDI Template Deleted", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();
    }

    public async Task<bool> RestoreAsync(long userId)
    {
        PdiTemplates? entity =
            await Templates.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        if (entity.IsActive)
        {
            long id = entity.PdiTemplateId;

            var clash =
                await
                (
                    from m in TemplateModels.AsNoTracking()
                    join other in TemplateModels.AsNoTracking() on m.BikeModelId equals other.BikeModelId
                    join t in Templates.AsNoTracking() on other.PdiTemplateId equals t.PdiTemplateId
                    where m.PdiTemplateId == id && t.PdiTemplateId != id && !t.IsDeleted && t.IsActive
                    select t.Code
                )
                .FirstOrDefaultAsync();

            if (clash != null)
            {
                throw new InvalidOperationException($"{entity.Code} cannot be restored : one of its models is now in PDI template {clash}.");
            }
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.PdiTemplateId, "Restore", "PDI Template Restored", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();

        return true;
    }
}
