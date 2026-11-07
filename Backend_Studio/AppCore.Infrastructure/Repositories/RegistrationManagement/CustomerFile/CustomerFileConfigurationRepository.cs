//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using Microsoft.EntityFrameworkCore;
using AppCore.Application.RegistrationManagement.CustomerFile;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.RegistrationManagement.CustomerFile;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.RegistrationManagement.CustomerFile;


//===============================================================
// Customer File Configuration Repository (hand-written page)
//
// Name Transfer rules (NTR-nnn) / File Delivery rules (FDR-nnn) :
//   dated; a change is a NEW row with its own Effective From; the
//   rule in force = the active row with the latest Effective From
//   on or before the date. One active row per date. One set for
//   all bikes.
//   Name Transfer : Transfers Allowed 0 - 20, Fee per Transfer >= 0.
//   File Delivery : Free Days 0 - 365, three amounts >= 0.
//
// Required documents (NTD-nnn / FDD-nnn) : a list per tab; name
//   required, unique per list among live rows; list locked after
//   saving.
//
// Codes : <prefix>-nnn, deleted rows count (never reused).
//===============================================================

public class CustomerFileConfigurationRepository
    : ICustomerFileConfigurationRepository
{
    private const int NameMaxLength = 150;

    private const int RemarksMaxLength = 500;

    private const decimal MaxAmount = 99999999.99m;

    private const string HistoryModule = "Registration Management";

    private const string HistoryEntity = "CustomerFileConfiguration";

    private const string Current = "Current";

    private const string Upcoming = "Upcoming";

    private const string Old = "Old";


    private readonly AppDbContext _context;


    public CustomerFileConfigurationRepository(
        AppDbContext context)
    {
        _context = context;
    }


    private DbSet<CustomerFileNameTransferRules> TransferRules =>
        _context.Set<CustomerFileNameTransferRules>();

    private DbSet<CustomerFileDeliveryRules> DeliveryRules =>
        _context.Set<CustomerFileDeliveryRules>();

    private DbSet<CustomerFileDocuments> Documents =>
        _context.Set<CustomerFileDocuments>();


    private static DateOnly Today =>
        DateOnly.FromDateTime(DateTime.Now);



    //===========================================================
    // Helpers
    //===========================================================

    private static string DateText(DateOnly date) =>
        date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static string DisplayDate(DateOnly date) =>
        date.ToString("dd MMM yyyy", CultureInfo.InvariantCulture);

    private static string Money(decimal value) =>
        value.ToString("#,##0.00", CultureInfo.InvariantCulture);


    private static string CleanRemarks
    (
        string? remarks
    )
    {
        string value = (remarks ?? string.Empty).Trim();

        if (value.Length > RemarksMaxLength)
        {
            throw new InvalidOperationException(
                $"Remarks cannot be longer than {RemarksMaxLength} characters.");
        }

        return value;
    }


    private static DateOnly ParseDate
    (
        string? text
    )
    {
        string value = (text ?? string.Empty).Trim();

        if (value.Length >= 10)
        {
            value = value.Substring(0, 10);
        }

        if (!DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly date))
        {
            throw new InvalidOperationException(
                "Effective From is required (a valid date).");
        }

        if (date.Year < 2000 || date.Year > 2100)
        {
            throw new InvalidOperationException(
                "Effective From must be between 2000 and 2100.");
        }

        return date;
    }


    private static decimal Amount
    (
        decimal value,
        string label
    )
    {
        if (value < 0)
        {
            throw new InvalidOperationException($"{label} cannot be negative.");
        }

        if (value > MaxAmount)
        {
            throw new InvalidOperationException($"{label} is too large.");
        }

        if (decimal.Round(value, 2) != value)
        {
            throw new InvalidOperationException($"{label} can have at most 2 decimals.");
        }

        return value;
    }


    private static string NextCode
    (
        string prefix,
        IEnumerable<string> codes
    )
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string[] parts = (code ?? string.Empty).Trim().Split('-', StringSplitOptions.RemoveEmptyEntries);

            if
            (
                parts.Length == 2
                && string.Equals(parts[0], prefix, StringComparison.OrdinalIgnoreCase)
                && int.TryParse(parts[1], out int number)
                && number > highest
            )
            {
                highest = number;
            }
        }

        return $"{prefix}-{highest + 1:D3}";
    }


    private async Task<string> NextTransferRuleCodeAsync() =>
        NextCode("NTR", await TransferRules.AsNoTracking().Select(x => x.Code).ToListAsync());

    private async Task<string> NextDeliveryRuleCodeAsync() =>
        NextCode("FDR", await DeliveryRules.AsNoTracking().Select(x => x.Code).ToListAsync());

    private async Task<string> NextDocumentCodeAsync(string documentFor) =>
        NextCode(
            CustomerFileDocumentFor.All[documentFor].Prefix,
            await Documents.AsNoTracking().Where(x => x.DocumentFor == documentFor).Select(x => x.Code).ToListAsync());

    private async Task<int> NextDocumentOrderAsync(string documentFor) =>
        (await Documents.AsNoTracking()
            .Where(x => x.DocumentFor == documentFor && !x.IsDeleted)
            .Select(x => (int?)x.DisplayOrder)
            .MaxAsync() ?? 0) + 1;


    private static string ResolveDocumentFor
    (
        string? documentFor
    )
    {
        string key = (documentFor ?? string.Empty).Trim();

        return CustomerFileDocumentFor.All.Keys
                   .FirstOrDefault(x => string.Equals(x, key, StringComparison.OrdinalIgnoreCase))
               ?? throw new InvalidOperationException(
                   "Choose the list : NameTransfer or FileDelivery.");
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


    // Current (latest active on or before today) / Upcoming / Old
    private static Dictionary<long, string> RateStates<T>
    (
        List<T> rows,
        Func<T, long> idOf,
        Func<T, DateOnly> dateOf,
        Func<T, bool> activeOf,
        DateOnly today
    )
    {
        long? currentId =
            rows.Where(x => activeOf(x) && dateOf(x) <= today)
                .OrderByDescending(dateOf)
                .Select(x => (long?)idOf(x))
                .FirstOrDefault();

        return rows.ToDictionary(
            idOf,
            x => idOf(x) == currentId
                ? Current
                : activeOf(x) && dateOf(x) > today
                    ? Upcoming
                    : Old);
    }



    //===========================================================
    // Read
    //===========================================================

    public async Task<CustomerFileConfigurationDto>
        GetAllAsync()
    {
        DateOnly today = Today;

        List<CustomerFileNameTransferRules> transfers =
            await TransferRules.AsNoTracking().Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.EffectiveFrom).ThenBy(x => x.Code).ToListAsync();

        List<CustomerFileDeliveryRules> deliveries =
            await DeliveryRules.AsNoTracking().Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.EffectiveFrom).ThenBy(x => x.Code).ToListAsync();

        List<CustomerFileDocuments> documents =
            await Documents.AsNoTracking().Where(x => !x.IsDeleted)
                .OrderBy(x => x.DocumentFor).ThenBy(x => x.DisplayOrder).ThenBy(x => x.Code).ToListAsync();

        Dictionary<long, string> transferStates =
            RateStates(transfers, x => x.NameTransferRuleId, x => x.EffectiveFrom, x => x.IsActive, today);

        Dictionary<long, string> deliveryStates =
            RateStates(deliveries, x => x.DeliveryRuleId, x => x.EffectiveFrom, x => x.IsActive, today);

        return new CustomerFileConfigurationDto
        {
            Today = DateText(today),

            NameTransferRules =
                transfers.Select(
                    x => new NameTransferRuleDto
                    {
                        NameTransferRuleId = x.NameTransferRuleId,
                        PublicId = x.PublicId,
                        Code = x.Code,
                        EffectiveFrom = DateText(x.EffectiveFrom),
                        TransfersAllowed = x.TransfersAllowed,
                        FeePerTransfer = x.FeePerTransfer,
                        RateState = transferStates[x.NameTransferRuleId],
                        Remarks = x.Remarks,
                        IsActive = x.IsActive
                    }).ToList(),

            DeliveryRules =
                deliveries.Select(
                    x => new DeliveryRuleDto
                    {
                        DeliveryRuleId = x.DeliveryRuleId,
                        PublicId = x.PublicId,
                        Code = x.Code,
                        EffectiveFrom = DateText(x.EffectiveFrom),
                        FreeDays = x.FreeDays,
                        FirstYearAmount = x.FirstYearAmount,
                        SecondYearAmount = x.SecondYearAmount,
                        PerYearAmount = x.PerYearAmount,
                        RateState = deliveryStates[x.DeliveryRuleId],
                        Remarks = x.Remarks,
                        IsActive = x.IsActive
                    }).ToList(),

            Documents =
                documents.Select(
                    x => new CustomerFileDocumentDto
                    {
                        CustomerFileDocumentId = x.CustomerFileDocumentId,
                        PublicId = x.PublicId,
                        DocumentFor = x.DocumentFor,
                        Code = x.Code,
                        Name = x.Name,
                        IsRequired = x.IsRequired,
                        DisplayOrder = x.DisplayOrder,
                        Remarks = x.Remarks,
                        IsActive = x.IsActive
                    }).ToList()
        };
    }


    public async Task<CustomerFileConfigurationDefaultsDto>
        GetDefaultsAsync()
    {
        return new CustomerFileConfigurationDefaultsDto
        {
            NameTransferRuleCode = await NextTransferRuleCodeAsync(),
            DeliveryRuleCode = await NextDeliveryRuleCodeAsync(),
            NameTransferDocumentCode = await NextDocumentCodeAsync(CustomerFileDocumentFor.NameTransfer),
            FileDeliveryDocumentCode = await NextDocumentCodeAsync(CustomerFileDocumentFor.FileDelivery),
            NextNameTransferDocumentOrder = await NextDocumentOrderAsync(CustomerFileDocumentFor.NameTransfer),
            NextFileDeliveryDocumentOrder = await NextDocumentOrderAsync(CustomerFileDocumentFor.FileDelivery)
        };
    }



    //===========================================================
    // NAME TRANSFER RULES
    //===========================================================

    private static (DateOnly Date, int Allowed, decimal Fee, string Remarks) NormalizeTransfer
    (
        SaveNameTransferRuleDto dto
    )
    {
        if (dto.TransfersAllowed < 0 || dto.TransfersAllowed > 20)
        {
            throw new InvalidOperationException(
                "Transfers Allowed must be between 0 and 20.");
        }

        return (ParseDate(dto.EffectiveFrom), dto.TransfersAllowed, Amount(dto.FeePerTransfer, "Fee per Transfer"), CleanRemarks(dto.Remarks));
    }


    private async Task EnsureTransferDateFreeAsync(DateOnly date, long excludeId, bool active)
    {
        if (!active)
        {
            return;
        }

        CustomerFileNameTransferRules? same =
            await TransferRules.AsNoTracking()
                .FirstOrDefaultAsync(
                    x => !x.IsDeleted && x.IsActive && x.EffectiveFrom == date && x.NameTransferRuleId != excludeId);

        if (same != null)
        {
            throw new InvalidOperationException(
                $"An active name transfer rule already starts on {DisplayDate(date)} ({same.Code}). Change that row, or pick another date.");
        }
    }


    public async Task<Guid>
        CreateNameTransferRuleAsync
        (
            SaveNameTransferRuleDto dto,
            long userId
        )
    {
        var input = NormalizeTransfer(dto);

        await EnsureTransferDateFreeAsync(input.Date, 0, dto.IsActive);

        CustomerFileNameTransferRules entity =
            new CustomerFileNameTransferRules
            {
                Code = await NextTransferRuleCodeAsync(),
                EffectiveFrom = input.Date,
                TransfersAllowed = input.Allowed,
                FeePerTransfer = input.Fee,
                Remarks = input.Remarks,
                IsActive = dto.IsActive,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        TransferRules.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity.NameTransferRuleId, "Create", "Name Transfer Rule Created",
            $"Name Transfer Rule {entity.Code} from {DisplayDate(entity.EffectiveFrom)} : {entity.TransfersAllowed} transfer(s), fee {Money(entity.FeePerTransfer)}.", userId);

        await _context.SaveChangesAsync();

        return entity.PublicId;
    }


    public async Task
        UpdateNameTransferRuleAsync
        (
            Guid publicId,
            SaveNameTransferRuleDto dto,
            long userId
        )
    {
        CustomerFileNameTransferRules entity =
            await TransferRules.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The name transfer rule was not found. It may have been deleted.");

        var input = NormalizeTransfer(dto);

        await EnsureTransferDateFreeAsync(input.Date, entity.NameTransferRuleId, dto.IsActive);

        entity.EffectiveFrom = input.Date;
        entity.TransfersAllowed = input.Allowed;
        entity.FeePerTransfer = input.Fee;
        entity.Remarks = input.Remarks;
        entity.IsActive = dto.IsActive;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.NameTransferRuleId, "Update", "Name Transfer Rule Updated",
            $"Name Transfer Rule {entity.Code} from {DisplayDate(entity.EffectiveFrom)} : {entity.TransfersAllowed} transfer(s), fee {Money(entity.FeePerTransfer)}.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task
        DeleteNameTransferRuleAsync
        (
            Guid publicId,
            long userId
        )
    {
        CustomerFileNameTransferRules entity =
            await TransferRules.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The name transfer rule was not found. It may have been deleted already.");

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.NameTransferRuleId, "Delete", "Name Transfer Rule Deleted",
            $"Name Transfer Rule {entity.Code} (from {DisplayDate(entity.EffectiveFrom)}) deleted.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task<bool>
        RestoreNameTransferRuleAsync
        (
            long userId
        )
    {
        CustomerFileNameTransferRules? entity =
            await TransferRules.Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate).ThenByDescending(x => x.NameTransferRuleId)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        try
        {
            await EnsureTransferDateFreeAsync(entity.EffectiveFrom, entity.NameTransferRuleId, entity.IsActive);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException($"{entity.Code} cannot be restored. {ex.Message}");
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.NameTransferRuleId, "Restore", "Name Transfer Rule Restored",
            $"Name Transfer Rule {entity.Code} (from {DisplayDate(entity.EffectiveFrom)}) restored.", userId);

        await _context.SaveChangesAsync();

        return true;
    }



    //===========================================================
    // FILE DELIVERY RULES
    //===========================================================

    private sealed record DeliveryInput(DateOnly Date, int FreeDays, decimal First, decimal Second, decimal PerYear, string Remarks);


    private static DeliveryInput NormalizeDelivery
    (
        SaveDeliveryRuleDto dto
    )
    {
        if (dto.FreeDays < 0 || dto.FreeDays > 365)
        {
            throw new InvalidOperationException(
                "Free Days must be between 0 and 365.");
        }

        return new DeliveryInput(
            ParseDate(dto.EffectiveFrom),
            dto.FreeDays,
            Amount(dto.FirstYearAmount, "Amount up to one year"),
            Amount(dto.SecondYearAmount, "Next one year amount"),
            Amount(dto.PerYearAmount, "Amount per year above two years"),
            CleanRemarks(dto.Remarks));
    }


    private async Task EnsureDeliveryDateFreeAsync(DateOnly date, long excludeId, bool active)
    {
        if (!active)
        {
            return;
        }

        CustomerFileDeliveryRules? same =
            await DeliveryRules.AsNoTracking()
                .FirstOrDefaultAsync(
                    x => !x.IsDeleted && x.IsActive && x.EffectiveFrom == date && x.DeliveryRuleId != excludeId);

        if (same != null)
        {
            throw new InvalidOperationException(
                $"An active file delivery rule already starts on {DisplayDate(date)} ({same.Code}). Change that row, or pick another date.");
        }
    }


    private static string DeliveryText(CustomerFileDeliveryRules x) =>
        $"free {x.FreeDays} day(s), {Money(x.FirstYearAmount)} / {Money(x.SecondYearAmount)} / {Money(x.PerYearAmount)} per year";


    public async Task<Guid>
        CreateDeliveryRuleAsync
        (
            SaveDeliveryRuleDto dto,
            long userId
        )
    {
        DeliveryInput input = NormalizeDelivery(dto);

        await EnsureDeliveryDateFreeAsync(input.Date, 0, dto.IsActive);

        CustomerFileDeliveryRules entity =
            new CustomerFileDeliveryRules
            {
                Code = await NextDeliveryRuleCodeAsync(),
                EffectiveFrom = input.Date,
                FreeDays = input.FreeDays,
                FirstYearAmount = input.First,
                SecondYearAmount = input.Second,
                PerYearAmount = input.PerYear,
                Remarks = input.Remarks,
                IsActive = dto.IsActive,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        DeliveryRules.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity.DeliveryRuleId, "Create", "File Delivery Rule Created",
            $"File Delivery Rule {entity.Code} from {DisplayDate(entity.EffectiveFrom)} : {DeliveryText(entity)}.", userId);

        await _context.SaveChangesAsync();

        return entity.PublicId;
    }


    public async Task
        UpdateDeliveryRuleAsync
        (
            Guid publicId,
            SaveDeliveryRuleDto dto,
            long userId
        )
    {
        CustomerFileDeliveryRules entity =
            await DeliveryRules.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The file delivery rule was not found. It may have been deleted.");

        DeliveryInput input = NormalizeDelivery(dto);

        await EnsureDeliveryDateFreeAsync(input.Date, entity.DeliveryRuleId, dto.IsActive);

        entity.EffectiveFrom = input.Date;
        entity.FreeDays = input.FreeDays;
        entity.FirstYearAmount = input.First;
        entity.SecondYearAmount = input.Second;
        entity.PerYearAmount = input.PerYear;
        entity.Remarks = input.Remarks;
        entity.IsActive = dto.IsActive;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.DeliveryRuleId, "Update", "File Delivery Rule Updated",
            $"File Delivery Rule {entity.Code} from {DisplayDate(entity.EffectiveFrom)} : {DeliveryText(entity)}.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task
        DeleteDeliveryRuleAsync
        (
            Guid publicId,
            long userId
        )
    {
        CustomerFileDeliveryRules entity =
            await DeliveryRules.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The file delivery rule was not found. It may have been deleted already.");

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.DeliveryRuleId, "Delete", "File Delivery Rule Deleted",
            $"File Delivery Rule {entity.Code} (from {DisplayDate(entity.EffectiveFrom)}) deleted.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task<bool>
        RestoreDeliveryRuleAsync
        (
            long userId
        )
    {
        CustomerFileDeliveryRules? entity =
            await DeliveryRules.Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate).ThenByDescending(x => x.DeliveryRuleId)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        try
        {
            await EnsureDeliveryDateFreeAsync(entity.EffectiveFrom, entity.DeliveryRuleId, entity.IsActive);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException($"{entity.Code} cannot be restored. {ex.Message}");
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.DeliveryRuleId, "Restore", "File Delivery Rule Restored",
            $"File Delivery Rule {entity.Code} (from {DisplayDate(entity.EffectiveFrom)}) restored.", userId);

        await _context.SaveChangesAsync();

        return true;
    }



    //===========================================================
    // REQUIRED DOCUMENTS
    //===========================================================

    private static (string Name, int Order, string Remarks) NormalizeDocument
    (
        SaveCustomerFileDocumentDto dto
    )
    {
        string name =
            string.Join(" ", (dto.Name ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries));

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Document Name is required.");
        }

        if (name.Length > NameMaxLength)
        {
            throw new InvalidOperationException($"Document Name cannot be longer than {NameMaxLength} characters.");
        }

        if (dto.DisplayOrder < 0 || dto.DisplayOrder > 9999)
        {
            throw new InvalidOperationException("Display Order must be between 1 and 9999.");
        }

        return (name, dto.DisplayOrder, CleanRemarks(dto.Remarks));
    }


    private async Task EnsureDocumentNameFreeAsync(string documentFor, string name, long excludeId)
    {
        string key = name.ToLower();

        CustomerFileDocuments? same =
            await Documents.AsNoTracking()
                .FirstOrDefaultAsync(
                    x => !x.IsDeleted && x.DocumentFor == documentFor
                         && x.CustomerFileDocumentId != excludeId && x.Name.ToLower() == key);

        if (same != null)
        {
            throw new InvalidOperationException(
                $"Document '{name}' already exists in this list ({same.Code}).");
        }
    }


    public async Task<Guid>
        CreateDocumentAsync
        (
            SaveCustomerFileDocumentDto dto,
            long userId
        )
    {
        string list = ResolveDocumentFor(dto.DocumentFor);

        var input = NormalizeDocument(dto);

        await EnsureDocumentNameFreeAsync(list, input.Name, 0);

        CustomerFileDocuments entity =
            new CustomerFileDocuments
            {
                DocumentFor = list,
                Code = await NextDocumentCodeAsync(list),
                Name = input.Name,
                IsRequired = dto.IsRequired,
                DisplayOrder = input.Order > 0 ? input.Order : await NextDocumentOrderAsync(list),
                Remarks = input.Remarks,
                IsActive = dto.IsActive,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Documents.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity.CustomerFileDocumentId, "Create", $"{CustomerFileDocumentFor.All[list].Label} Created",
            $"{CustomerFileDocumentFor.All[list].Label} '{entity.Name}' ({entity.Code}) created.", userId);

        await _context.SaveChangesAsync();

        return entity.PublicId;
    }


    public async Task
        UpdateDocumentAsync
        (
            Guid publicId,
            SaveCustomerFileDocumentDto dto,
            long userId
        )
    {
        CustomerFileDocuments entity =
            await Documents.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The document was not found. It may have been deleted.");

        if (!string.IsNullOrWhiteSpace(dto.DocumentFor) && !string.Equals(dto.DocumentFor.Trim(), entity.DocumentFor, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("The list of a document cannot be changed after saving.");
        }

        var input = NormalizeDocument(dto);

        await EnsureDocumentNameFreeAsync(entity.DocumentFor, input.Name, entity.CustomerFileDocumentId);

        entity.Name = input.Name;
        entity.IsRequired = dto.IsRequired;
        entity.DisplayOrder = input.Order > 0 ? input.Order : entity.DisplayOrder;
        entity.Remarks = input.Remarks;
        entity.IsActive = dto.IsActive;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.CustomerFileDocumentId, "Update", $"{CustomerFileDocumentFor.All[entity.DocumentFor].Label} Updated",
            $"{CustomerFileDocumentFor.All[entity.DocumentFor].Label} '{entity.Name}' ({entity.Code}) updated.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task
        DeleteDocumentAsync
        (
            Guid publicId,
            long userId
        )
    {
        CustomerFileDocuments entity =
            await Documents.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The document was not found. It may have been deleted already.");

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.CustomerFileDocumentId, "Delete", $"{CustomerFileDocumentFor.All[entity.DocumentFor].Label} Deleted",
            $"{CustomerFileDocumentFor.All[entity.DocumentFor].Label} '{entity.Name}' ({entity.Code}) deleted.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task<bool>
        RestoreDocumentAsync
        (
            string? documentFor,
            long userId
        )
    {
        string list = ResolveDocumentFor(documentFor);

        CustomerFileDocuments? entity =
            await Documents.Where(x => x.IsDeleted && x.DocumentFor == list)
                .OrderByDescending(x => x.DeletedDate).ThenByDescending(x => x.CustomerFileDocumentId)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        try
        {
            await EnsureDocumentNameFreeAsync(entity.DocumentFor, entity.Name, entity.CustomerFileDocumentId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException($"'{entity.Name}' cannot be restored. {ex.Message}");
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.CustomerFileDocumentId, "Restore", $"{CustomerFileDocumentFor.All[list].Label} Restored",
            $"{CustomerFileDocumentFor.All[list].Label} '{entity.Name}' ({entity.Code}) restored.", userId);

        await _context.SaveChangesAsync();

        return true;
    }
}
