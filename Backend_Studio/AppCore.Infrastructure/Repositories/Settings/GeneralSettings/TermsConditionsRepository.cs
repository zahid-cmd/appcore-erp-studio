//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.Settings.GeneralSettings;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.GeneralSettings;


//===============================================================
// Terms & Conditions Repository (hand-written page, 2026-11-13;
// NEVER run Code Sync for it)
//
//   Code TC-0001 (deleted rows count, never reused).
//   Title made by the server from the operation's page name and
//   a number : "Sales Invoice - MB 1", "... 2" (numbers count
//   deleted sets too, never reused; not editable).
//   Operation from TermsOperations, fixed once saved (an update
//   cannot change it); at least one line with
//   English text (Bangla optional : the print falls back to the
//   English line).
//   One Default per live, active set of an operation : saving a
//   new Default clears the old one first (same transaction).
//   Lines are written again on every update (posted documents
//   will keep their own copy of the text).
//===============================================================

public class TermsConditionsRepository
    : ITermsConditionsRepository
{
    private const string HistoryModule = "Settings";

    private const string HistoryEntity = "TermsConditions";

    private const int MaxLines = 50;

    // The operations (document types) that print terms. Add new
    // ones here (and in the page's model) : Delivery, Sales
    // Return, Service Job Card ...
    public static readonly (string Code, string Name, string Group)[] TermsOperations =
    {
        ("SIMB", "Sales Invoice - MB", "Sales"),
        ("SISP", "Sales Invoice - SP", "Sales"),
        ("SIAC", "Sales Invoice - AC", "Sales"),
        ("SQMB", "Sales Quotation - MB", "Sales"),
        ("SQSP", "Sales Quotation - SP", "Sales"),
        ("SQAC", "Sales Quotation - AC", "Sales"),
        ("BKMB", "Booking - MB", "Sales"),
        ("BKSP", "Booking - SP", "Sales"),
        ("BKAC", "Booking - AC", "Sales"),
        ("POMB", "Purchase Order - MB", "Procurement"),
        ("POSP", "Purchase Order - SP", "Procurement"),
        ("POAC", "Purchase Order - AC", "Procurement")
    };

    private readonly AppDbContext _context;

    public TermsConditionsRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<TermsConditionSets> Sets => _context.Set<TermsConditionSets>();

    private DbSet<TermsConditionLines> Lines => _context.Set<TermsConditionLines>();


    //===========================================================
    // Helpers
    //===========================================================

    public static string OperationName(string? code) =>
        TermsOperations.FirstOrDefault(x => x.Code == code).Name ?? (code ?? string.Empty);

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

    private static string NextCode(IEnumerable<string> codes)
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if (value.StartsWith("TC-", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(3), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return $"TC-{highest + 1:D4}";
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

    // "<operation name> <n>" : n = highest number used by the
    // operation's sets (deleted ones too) + 1
    private static string NextTitle(string operationCode, IEnumerable<string> titles)
    {
        string prefix = OperationName(operationCode) + " ";

        int highest = 0;

        foreach (string title in titles)
        {
            string value = (title ?? string.Empty).Trim();

            if (value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(prefix.Length), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return $"{prefix}{highest + 1}";
    }

    private async Task<List<string>> TitlesOfAsync(string operationCode) =>
        await Sets.AsNoTracking().Where(x => x.OperationCode == operationCode).Select(x => x.Title).ToListAsync();

    private async Task<TermsConditionSets> FindAsync(Guid publicId)
    {
        return await Sets.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The terms & conditions set was not found.");
    }

    private async Task<TermsConditionSetDto> ReadAsync(TermsConditionSets s)
    {
        List<TermsConditionLines> lines =
            await Lines.AsNoTracking()
                .Where(x => x.TermsConditionSetId == s.TermsConditionSetId)
                .OrderBy(x => x.LineNo).ThenBy(x => x.TermsConditionLineId)
                .ToListAsync();

        return new TermsConditionSetDto
        {
            TermsConditionSetId = s.TermsConditionSetId,
            PublicId = s.PublicId,
            Code = s.Code,
            Title = s.Title,
            OperationCode = s.OperationCode,
            OperationName = OperationName(s.OperationCode),
            IsDefault = s.IsDefault,
            Note = s.Note,
            IsActive = s.IsActive,
            Lines = lines.Select(l => new TermsConditionLineDto { TextEn = l.TextEn, TextBn = l.TextBn }).ToList()
        };
    }


    //===========================================================
    // Read
    //===========================================================

    public async Task<List<TermsConditionListItemDto>> GetListAsync()
    {
        List<TermsConditionSets> sets =
            await Sets.AsNoTracking().Where(x => !x.IsDeleted).OrderBy(x => x.Code).ToListAsync();

        List<long> ids = sets.Select(x => x.TermsConditionSetId).ToList();

        var lines =
            await Lines.AsNoTracking()
                .Where(x => ids.Contains(x.TermsConditionSetId))
                .OrderBy(x => x.LineNo)
                .Select(x => new { x.TermsConditionSetId, x.TextEn, x.TextBn })
                .ToListAsync();

        return sets
            .Select(s =>
            {
                var mine = lines.Where(l => l.TermsConditionSetId == s.TermsConditionSetId).ToList();

                string joined = string.Join(" ", mine.Select(l => l.TextEn));

                return new TermsConditionListItemDto
                {
                    PublicId = s.PublicId,
                    Code = s.Code,
                    Title = s.Title,
                    OperationCode = s.OperationCode,
                    OperationName = OperationName(s.OperationCode),
                    LineCount = mine.Count,
                    BanglaCount = mine.Count(l => !string.IsNullOrWhiteSpace(l.TextBn)),
                    IsDefault = s.IsDefault && s.IsActive,
                    IsActive = s.IsActive,
                    LinesText = joined.Length > 400 ? joined.Substring(0, 400) : joined
                };
            })
            .ToList();
    }

    public async Task<TermsConditionSetDto> GetAsync(Guid publicId)
    {
        TermsConditionSets s =
            await Sets.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The terms & conditions set was not found.");

        return await ReadAsync(s);
    }

    public async Task<TermsConditionDefaultsDto> GetDefaultsAsync()
    {
        string next =
            NextCode(await Sets.AsNoTracking().Select(x => x.Code).ToListAsync());

        var defaults =
            await Sets.AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && x.IsDefault)
                .Select(x => new { x.OperationCode, x.Code, x.PublicId })
                .ToListAsync();

        var titles =
            await Sets.AsNoTracking()
                .Select(x => new { x.OperationCode, x.Title })
                .ToListAsync();

        return new TermsConditionDefaultsDto
        {
            NextCode = next,
            Operations = TermsOperations
                .Select(o =>
                {
                    var d = defaults.FirstOrDefault(x => x.OperationCode == o.Code);

                    return new TermsOperationDto
                    {
                        Code = o.Code,
                        Name = o.Name,
                        Group = o.Group,
                        DefaultSetCode = d?.Code ?? string.Empty,
                        DefaultSetPublicId = d?.PublicId,
                        NextTitle = NextTitle(o.Code, titles.Where(t => t.OperationCode == o.Code).Select(t => t.Title))
                    };
                })
                .ToList()
        };
    }

    public async Task<TermsConditionSetDto?> GetDefaultForAsync(string operationCode)
    {
        string code = (operationCode ?? string.Empty).Trim().ToUpperInvariant();

        TermsConditionSets? s =
            await Sets.AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && x.IsDefault && x.OperationCode == code)
                .OrderByDescending(x => x.ModifiedDate ?? x.CreatedDate)
                .FirstOrDefaultAsync();

        return s == null ? null : await ReadAsync(s);
    }


    //===========================================================
    // Check + write
    //===========================================================

    private sealed class Checked
    {
        public string OperationCode = string.Empty;
        public string Note = string.Empty;
        public List<TermsConditionLineDto> Lines = new();
    }

    // fixedOperation : the saved set's operation (an update keeps it)
    private Checked Check(SaveTermsConditionSetDto dto, string? fixedOperation)
    {
        Checked c = new()
        {
            OperationCode = (dto.OperationCode ?? string.Empty).Trim().ToUpperInvariant(),
            Note = Limited(dto.Note, 500, "Note")
        };

        if (fixedOperation != null)
        {
            if (c.OperationCode.Length > 0 && c.OperationCode != fixedOperation)
            {
                throw new InvalidOperationException("The operation of a saved set cannot be changed. Add a new set for the other operation.");
            }

            c.OperationCode = fixedOperation;
        }

        if (!TermsOperations.Any(x => x.Code == c.OperationCode))
        {
            throw new InvalidOperationException("Pick the operation (document) these terms are for.");
        }

        int lineNo = 0;

        foreach (TermsConditionLineDto line in dto.Lines ?? new())
        {
            lineNo++;

            string en = Limited(line.TextEn, 1000, $"Line {lineNo} (English)");
            string bn = Limited(line.TextBn, 1000, $"Line {lineNo} (Bangla)");

            if (en.Length == 0 && bn.Length == 0)
            {
                // an empty row is simply dropped
                continue;
            }

            if (en.Length == 0)
            {
                throw new InvalidOperationException($"Line {lineNo} needs the English text (the Bangla text is optional).");
            }

            c.Lines.Add(new TermsConditionLineDto { TextEn = en, TextBn = bn });
        }

        if (c.Lines.Count == 0)
        {
            throw new InvalidOperationException("Add at least one line.");
        }

        if (c.Lines.Count > MaxLines)
        {
            throw new InvalidOperationException($"A set can have at most {MaxLines} lines.");
        }

        return c;
    }

    // Clears the operation's other Default (before this one is saved
    // as the Default : the database allows one per operation)
    private async Task ClearOtherDefaultsAsync(string operationCode, long? selfId, long userId)
    {
        List<TermsConditionSets> others =
            await Sets
                .Where(x => !x.IsDeleted && x.IsDefault && x.OperationCode == operationCode && (selfId == null || x.TermsConditionSetId != selfId))
                .ToListAsync();

        foreach (TermsConditionSets o in others)
        {
            o.IsDefault = false;
            o.ModifiedBy = userId;
            o.ModifiedDate = DateTime.UtcNow;

            AddHistory(o.TermsConditionSetId, "Update", "Terms & Conditions Default Moved", $"{o.Code} {o.Title} : no longer the Default of {OperationName(operationCode)}.", userId);
        }

        if (others.Count > 0)
        {
            await _context.SaveChangesAsync();
        }
    }

    private async Task WriteLinesAsync(long setId, Checked c)
    {
        Lines.RemoveRange(await Lines.Where(x => x.TermsConditionSetId == setId).ToListAsync());

        await _context.SaveChangesAsync();

        int no = 0;

        foreach (TermsConditionLineDto line in c.Lines)
        {
            no++;

            Lines.Add(new TermsConditionLines
            {
                TermsConditionSetId = setId,
                LineNo = no,
                TextEn = line.TextEn,
                TextBn = line.TextBn
            });
        }

        await _context.SaveChangesAsync();
    }

    private static string Summary(Checked c, bool isDefault) =>
        $"{OperationName(c.OperationCode)}, {c.Lines.Count} line(s){(isDefault ? ", Default" : string.Empty)}.";

    public async Task<TermsConditionSetDto> CreateAsync(SaveTermsConditionSetDto dto, long userId)
    {
        Checked c = Check(dto, null);

        bool isDefault = dto.IsDefault && dto.IsActive;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (isDefault)
        {
            await ClearOtherDefaultsAsync(c.OperationCode, null, userId);
        }

        TermsConditionSets entity =
            new()
            {
                Code = NextCode(await Sets.AsNoTracking().Select(x => x.Code).ToListAsync()),
                Title = NextTitle(c.OperationCode, await TitlesOfAsync(c.OperationCode)),
                OperationCode = c.OperationCode,
                IsDefault = isDefault,
                Note = c.Note,
                IsActive = dto.IsActive,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Sets.Add(entity);

        await _context.SaveChangesAsync();

        await WriteLinesAsync(entity.TermsConditionSetId, c);

        AddHistory(entity.TermsConditionSetId, "Create", "Terms & Conditions Created", $"{entity.Code} {entity.Title} : {Summary(c, isDefault)}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await ReadAsync(entity);
    }

    public async Task UpdateAsync(Guid publicId, SaveTermsConditionSetDto dto, long userId)
    {
        TermsConditionSets entity = await FindAsync(publicId);

        Checked c = Check(dto, entity.OperationCode);

        bool isDefault = dto.IsDefault && dto.IsActive;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (isDefault)
        {
            await ClearOtherDefaultsAsync(c.OperationCode, entity.TermsConditionSetId, userId);
        }

        entity.IsDefault = isDefault;
        entity.Note = c.Note;
        entity.IsActive = dto.IsActive;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await WriteLinesAsync(entity.TermsConditionSetId, c);

        AddHistory(entity.TermsConditionSetId, "Update", "Terms & Conditions Updated", $"{entity.Code} {entity.Title} : {Summary(c, isDefault)}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        TermsConditionSets entity = await FindAsync(publicId);

        entity.IsDeleted = true;
        entity.IsDefault = false;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity.TermsConditionSetId, "Delete", "Terms & Conditions Deleted", $"{entity.Code} {entity.Title} ({OperationName(entity.OperationCode)})", userId);

        await _context.SaveChangesAsync();
    }

    public async Task<bool> RestoreAsync(long userId)
    {
        TermsConditionSets? entity =
            await Sets.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        string lower = entity.Title.ToLower();

        bool taken =
            await Sets.AsNoTracking()
                .AnyAsync(x => !x.IsDeleted && x.OperationCode == entity.OperationCode && x.Title.ToLower() == lower);

        if (taken)
        {
            throw new InvalidOperationException($"{entity.Code} cannot be restored : {OperationName(entity.OperationCode)} already has a set titled \"{entity.Title}\".");
        }

        // comes back as a normal (not Default) set
        entity.IsDeleted = false;
        entity.IsDefault = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.TermsConditionSetId, "Restore", "Terms & Conditions Restored", $"{entity.Code} {entity.Title}", userId);

        await _context.SaveChangesAsync();

        return true;
    }
}
