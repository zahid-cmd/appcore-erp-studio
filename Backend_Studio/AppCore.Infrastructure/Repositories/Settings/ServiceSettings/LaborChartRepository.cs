//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ServiceSettings;

using LaborChartEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.LaborChart;

using ServiceCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceCategory;

using ServiceSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceSubCategory;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using GeneralLedgerEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ServiceSettings;


//===============================================================
// Labor Chart Repository
//
// One brand labour operation at one rate per row, under the
// brand's "Labor Chart" Service Sub Category.
//
// Codes (central CodeGenerator, never reused) :
//   Labor Code     BLC-ccc-sss-nnnnn   e.g. sub category BRS-001-001
//                                      -> BLC-001-001-00001
//   Income Ledger  GLR-ccc-ggg-sss-nnnnn under the sub category's
//                  account sub group
//   Highest number used (deleted rows included) + 1.
//
// Service Name : "<Operation> (<Applies To>) - <Brand>", unique
// among live rows; follows brand renames (synced on read). The
// income ledger has the same name and follows the row's active /
// deleted state.
//
// Locked : Labor Code, Service Sub Category.
//===============================================================

public class LaborChartRepository :
    ILaborChartRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string LaborChartType =
        "Labor Chart";

    private const string LedgerPrefix =
        "GLR";

    private const int MaxNameLength =
        200;

    private const int MaxMinutes =
        1440;

    private const decimal MaxAmount =
        99999999.99m;

    // Fixed Section list (shown on the form)
    public static readonly string[] Sections =
    {
        "Engine",
        "Electrical",
        "Brakes",
        "Suspension",
        "Transmission & Clutch",
        "Fuel System",
        "Wheels & Tyres",
        "Body & Frame",
        "Lubrication",
        "Diagnostics",
        "General"
    };


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public LaborChartRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Query
    //===========================================================

    private IQueryable<LaborChartDto>
        LaborChartQuery()
    {
        return _context
            .Set<LaborChartEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new LaborChartDto
                    {
                        LaborChartId =
                            x.LaborChartId,

                        LaborCode =
                            x.LaborCode,

                        ServiceSubCategoryId =
                            x.ServiceSubCategoryId,

                        SubCategoryCode =
                            _context
                                .Set<ServiceSubCategoryEntity>()
                                .Where(s => s.ServiceSubCategoryId == x.ServiceSubCategoryId)
                                .Select(s => s.SubCategoryCode)
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        SubCategoryName =
                            _context
                                .Set<ServiceSubCategoryEntity>()
                                .Where(s => s.ServiceSubCategoryId == x.ServiceSubCategoryId)
                                .Select(s => s.SubCategoryName)
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        BrandManagementId =
                            x.BrandManagementId,

                        BrandName =
                            _context
                                .Set<BrandManagementEntity>()
                                .Where(b => b.BrandManagementId == x.BrandManagementId)
                                .Select(b => b.BrandName)
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        Section =
                            x.Section,

                        OperationName =
                            x.OperationName,

                        AppliesTo =
                            x.AppliesTo,

                        StandardMinutes =
                            x.StandardMinutes,

                        ServiceCharge =
                            x.ServiceCharge,

                        ServiceName =
                            x.ServiceName,

                        IncomeLedgerCode =
                            x.IncomeLedgerCode,

                        IncomeLedgerName =
                            x.IncomeLedgerName,

                        Remarks =
                            x.Remarks,

                        IsActive =
                            x.IsActive,

                        IsDeleted =
                            x.IsDeleted,

                        DeletedBy =
                            x.DeletedBy,

                        DeletedDate =
                            x.DeletedDate,

                        CreatedBy =
                            x.CreatedBy,

                        CreatedDate =
                            x.CreatedDate,

                        ModifiedBy =
                            x.ModifiedBy,

                        ModifiedDate =
                            x.ModifiedDate
                    }
            );
    }


    //===========================================================
    // Get All (brand names synced first)
    //===========================================================

    public async Task<List<LaborChartDto>>
        GetAllAsync()
    {
        await SyncBrandNamesAsync();

        return await LaborChartQuery()
            .OrderBy
            (
                x =>
                    x.LaborCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<LaborChartDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await LaborChartQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.LaborChartId ==
                    id
            );
    }


    //===========================================================
    // Name Helpers
    //===========================================================

    private static string Clean
    (
        string? value
    )
    {
        return string.Join(
            " ",
            (value ?? string.Empty)
                .Split(
                    ' ',
                    StringSplitOptions.RemoveEmptyEntries));
    }


    // "Valve Clearance Adjustment" + "100-125cc" + "Revoo"
    //   -> "Valve Clearance Adjustment (100-125cc) - Revoo"
    private static string BuildServiceName
    (
        string operationName,
        string appliesTo,
        string? brandName
    )
    {
        string name =
            string.IsNullOrWhiteSpace(appliesTo)
                ? operationName
                : $"{operationName} ({appliesTo})";

        string brand =
            Clean(brandName);

        return string.IsNullOrWhiteSpace(brand)
            ? name
            : $"{name} - {brand}";
    }


    //===========================================================
    // Code Helpers
    //===========================================================

    // "BRS-001-002" -> (1, 2)
    private static (int CategoryNo, int SubCategoryNo) SubCategoryNumbers
    (
        string? subCategoryCode
    )
    {
        string[] parts =
            (subCategoryCode ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        if
        (
            parts.Length != 3
            ||
            !int.TryParse(parts[1], out int categoryNo)
            ||
            !int.TryParse(parts[2], out int subCategoryNo)
        )
        {
            throw new InvalidOperationException(
                $"Invalid Service Sub Category code '{subCategoryCode}'.");
        }

        return (categoryNo, subCategoryNo);
    }


    // "SUB-005-007-002" -> 2
    private static int LastNumber
    (
        string? code
    )
    {
        string[] parts =
            (code ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        if
        (
            parts.Length < 2
            ||
            !int.TryParse(
                parts[^1],
                out int number)
            ||
            number < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid account code '{code}'.");
        }

        return number;
    }


    //===========================================================
    // Next Labor Code (BLC-ccc-sss-nnnnn, central CodeGenerator)
    //===========================================================

    private static string NextLaborCode
    (
        ServiceSubCategoryEntity subCategory,
        IEnumerable<string> existingCodes
    )
    {
        (int categoryNo, int subCategoryNo) =
            SubCategoryNumbers(
                subCategory.SubCategoryCode);

        // "BLC-001-001-" : the generator's code without its running number
        string first =
            CodeGenerator.GenerateLaborChartItemCode(
                categoryNo,
                subCategoryNo,
                1);

        string prefix =
            first.Substring(
                0,
                first.LastIndexOf('-') + 1);

        int highest =
            existingCodes
                .Where
                (
                    code =>
                        (code ?? string.Empty).StartsWith(
                            prefix,
                            StringComparison.OrdinalIgnoreCase)
                )
                .Select
                (
                    code =>
                        int.TryParse(
                            code.Substring(prefix.Length),
                            out int number)
                            ? number
                            : 0
                )
                .DefaultIfEmpty(0)
                .Max();

        return CodeGenerator.GenerateLaborChartItemCode(
            categoryNo,
            subCategoryNo,
            highest + 1);
    }


    private async Task<List<string>>
        AllLaborCodesAsync()
    {
        return await _context
            .Set<LaborChartEntity>()
            .AsNoTracking()
            .Select
            (
                x =>
                    x.LaborCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Ledger parent : the sub category's account sub group
    //===========================================================

    private sealed class LedgerParent
    {
        public AccountClassEntity Class { get; set; } = null!;

        public AccountGroupEntity Group { get; set; } = null!;

        public AccountSubGroupEntity SubGroup { get; set; } = null!;
    }


    private async Task<LedgerParent>
        ResolveLedgerParentAsync
        (
            ServiceSubCategoryEntity subCategory
        )
    {
        AccountSubGroupEntity? subGroup =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SubGroupCode ==
                        subCategory.IncomeSubGroupCode
                        &&
                        !x.IsDeleted
                );

        AccountGroupEntity? group =
            subGroup == null
                ? null
                : await _context
                    .Set<AccountGroupEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            x.AccountGroupId ==
                            subGroup.AccountGroupId
                            &&
                            !x.IsDeleted
                    );

        AccountClassEntity? accountClass =
            subGroup == null
                ? null
                : await _context
                    .Set<AccountClassEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            x.AccountClassId ==
                            subGroup.AccountClassId
                            &&
                            !x.IsDeleted
                    );

        if
        (
            subGroup == null
            ||
            group == null
            ||
            accountClass == null
        )
        {
            throw new InvalidOperationException(
                $"The account sub group {subCategory.IncomeSubGroupCode} of sub category " +
                $"'{subCategory.SubCategoryName}' was not found. Open and save the sub category to rebuild it.");
        }

        return new LedgerParent
        {
            Class =
                accountClass,

            Group =
                group,

            SubGroup =
                subGroup
        };
    }


    //===========================================================
    // Next Income Ledger Code (GLR-ccc-ggg-sss-nnnnn in the sub
    // group; central CodeGenerator)
    //===========================================================

    private async Task<string>
        NextLedgerCodeAsync
        (
            LedgerParent parent
        )
    {
        int classNo =
            LastNumber(parent.Class.ClassCode);

        int groupNo =
            LastNumber(parent.Group.GroupCode);

        int subGroupNo =
            LastNumber(parent.SubGroup.SubGroupCode);

        string parentPart =
            $"{classNo:D3}-{groupNo:D3}-{subGroupNo:D3}";

        List<string> ledgerCodes =
            await _context
                .Set<GeneralLedgerEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.AccountSubGroupId ==
                        parent.SubGroup.AccountSubGroupId
                )
                .Select
                (
                    x =>
                        x.LedgerCode
                )
                .ToListAsync();

        List<string> laborLedgerCodes =
            await _context
                .Set<LaborChartEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.IncomeLedgerCode != ""
                )
                .Select
                (
                    x =>
                        x.IncomeLedgerCode
                )
                .ToListAsync();

        int highest =
            ledgerCodes
                .Concat(laborLedgerCodes)
                .Select
                (
                    code =>
                    {
                        string[] parts =
                            (code ?? string.Empty)
                                .Trim()
                                .Split(
                                    '-',
                                    StringSplitOptions.RemoveEmptyEntries);

                        return parts.Length == 5
                            &&
                            string.Equals(
                                parts[0],
                                LedgerPrefix,
                                StringComparison.OrdinalIgnoreCase)
                            &&
                            $"{parts[1]}-{parts[2]}-{parts[3]}" ==
                            parentPart
                            &&
                            int.TryParse(
                                parts[4],
                                out int number)
                                ? number
                                : 0;
                    }
                )
                .DefaultIfEmpty(0)
                .Max();

        return CodeGenerator.GenerateGeneralLedgerCode(
            classNo,
            groupNo,
            subGroupNo,
            highest + 1);
    }


    //===========================================================
    // Get Defaults
    //
    // Every live Labor Chart sub category with its brand and the
    // codes the next operation under it gets (or why it cannot
    // take one), plus the Section list.
    //===========================================================

    public async Task<LaborChartDefaultsDto>
        GetDefaultsAsync()
    {
        List<ServiceSubCategoryEntity> subCategories =
            await _context
                .Set<ServiceSubCategoryEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.SubCategoryType ==
                        LaborChartType
                )
                .OrderBy
                (
                    x =>
                        x.SubCategoryCode
                )
                .ToListAsync();

        List<string> laborCodes =
            await AllLaborCodesAsync();

        LaborChartDefaultsDto result =
            new LaborChartDefaultsDto
            {
                Sections =
                    Sections.ToList()
            };

        foreach
        (
            ServiceSubCategoryEntity subCategory
            in subCategories
        )
        {
            LaborChartSubCategoryOptionDto option =
                new LaborChartSubCategoryOptionDto
                {
                    ServiceSubCategoryId =
                        subCategory.ServiceSubCategoryId,

                    SubCategoryCode =
                        subCategory.SubCategoryCode,

                    SubCategoryName =
                        subCategory.SubCategoryName,

                    ItemCreationAllowed =
                        subCategory.ItemCreationAllowed
                };

            try
            {
                (ServiceCategoryEntity category, long brandId, string brandName) =
                    await ResolveContextAsync(
                        subCategory,
                        false);

                option.BrandManagementId =
                    brandId;

                option.BrandName =
                    brandName;

                option.IsActive =
                    subCategory.IsActive
                    &&
                    category.IsActive;

                option.NextLaborCode =
                    NextLaborCode(
                        subCategory,
                        laborCodes);

                option.NextIncomeLedgerCode =
                    await NextLedgerCodeAsync(
                        await ResolveLedgerParentAsync(
                            subCategory));

                if
                (
                    !option.IsActive
                )
                {
                    option.Message =
                        $"Sub category '{subCategory.SubCategoryName}' (or its category) is inactive.";
                }
                else if
                (
                    !subCategory.ItemCreationAllowed
                )
                {
                    option.Message =
                        $"Sub category '{subCategory.SubCategoryName}' does not allow item creation.";
                }
            }
            catch
            (
                InvalidOperationException ex
            )
            {
                option.Message =
                    ex.Message;
            }

            result.SubCategories.Add(
                option);
        }

        return result;
    }


    //===========================================================
    // Sub category context : its category, brand id and name
    //===========================================================

    private async Task<(ServiceCategoryEntity Category, long BrandId, string BrandName)>
        ResolveContextAsync
        (
            ServiceSubCategoryEntity subCategory,
            bool requireUsable
        )
    {
        if
        (
            !string.Equals(
                subCategory.SubCategoryType,
                LaborChartType,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                $"'{subCategory.SubCategoryName}' is not a {LaborChartType} sub category.");
        }

        ServiceCategoryEntity? category =
            await _context
                .Set<ServiceCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServiceCategoryId ==
                        subCategory.ServiceCategoryId
                        &&
                        !x.IsDeleted
                );

        if
        (
            category == null
            ||
            !category.BrandManagementId.HasValue
        )
        {
            throw new InvalidOperationException(
                $"The Brand Services category of '{subCategory.SubCategoryName}' was not found.");
        }

        string brandName =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.BrandManagementId ==
                        category.BrandManagementId
                )
                .Select
                (
                    x =>
                        x.BrandName
                )
                .FirstOrDefaultAsync()
            ??
            string.Empty;

        if
        (
            requireUsable
            &&
            (
                !subCategory.IsActive
                ||
                !category.IsActive
            )
        )
        {
            throw new InvalidOperationException(
                $"Sub category '{subCategory.SubCategoryName}' (or its category) is inactive.");
        }

        if
        (
            requireUsable
            &&
            !subCategory.ItemCreationAllowed
        )
        {
            throw new InvalidOperationException(
                $"Sub category '{subCategory.SubCategoryName}' does not allow item creation.");
        }

        return (category, category.BrandManagementId.Value, brandName);
    }


    private async Task<ServiceSubCategoryEntity>
        LoadSubCategoryAsync
        (
            long serviceSubCategoryId
        )
    {
        if
        (
            serviceSubCategoryId <= 0
        )
        {
            throw new InvalidOperationException(
                "Service Sub Category is required.");
        }

        return await _context
                .Set<ServiceSubCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServiceSubCategoryId ==
                        serviceSubCategoryId
                        &&
                        !x.IsDeleted
                )
            ??
            throw new InvalidOperationException(
                "The selected Service Sub Category was not found. It may have been deleted.");
    }


    //===========================================================
    // Validate input -> (section, operation, applies to, minutes,
    // charge)
    //===========================================================

    private static (string Section, string Operation, string AppliesTo, int Minutes, decimal Charge)
        ValidateInput
        (
            string? section,
            string? operationName,
            string? appliesTo,
            int standardMinutes,
            decimal serviceCharge
        )
    {
        string sectionValue =
            Sections.FirstOrDefault
            (
                x =>
                    string.Equals(
                        x,
                        section?.Trim(),
                        StringComparison.OrdinalIgnoreCase)
            )
            ??
            throw new InvalidOperationException(
                "Section is required (choose one from the list).");

        string operation =
            Clean(operationName);

        if
        (
            string.IsNullOrWhiteSpace(operation)
        )
        {
            throw new InvalidOperationException(
                "Operation Name is required.");
        }

        string applies =
            Clean(appliesTo);

        if
        (
            string.IsNullOrWhiteSpace(applies)
        )
        {
            throw new InvalidOperationException(
                "Applies To is required (a model, a CC range such as 100-125cc, or All Models).");
        }

        if
        (
            operation.Length > 120
            ||
            applies.Length > 60
        )
        {
            throw new InvalidOperationException(
                "Operation Name (max 120) or Applies To (max 60) is too long.");
        }

        if
        (
            standardMinutes < 1
            ||
            standardMinutes > MaxMinutes
        )
        {
            throw new InvalidOperationException(
                $"Standard Time must be between 1 and {MaxMinutes} minutes.");
        }

        decimal charge =
            Math.Round(
                serviceCharge,
                2);

        if
        (
            charge <= 0
            ||
            charge > MaxAmount
        )
        {
            throw new InvalidOperationException(
                $"Service Charge must be more than 0 and not more than {MaxAmount:N2}.");
        }

        return (sectionValue, operation, applies, standardMinutes, charge);
    }


    //===========================================================
    // Unique Service Name / Labor Code (live rows)
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string serviceName,
            string laborCode,
            long excludeId
        )
    {
        if
        (
            serviceName.Length >
            MaxNameLength
        )
        {
            throw new InvalidOperationException(
                $"Service Name cannot be longer than {MaxNameLength} characters.");
        }

        string lowerName =
            serviceName.ToLower();

        LaborChartEntity? sameName =
            await _context
                .Set<LaborChartEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.LaborChartId !=
                        excludeId
                        &&
                        x.ServiceName.ToLower() ==
                        lowerName
                );

        if
        (
            sameName != null
        )
        {
            throw new InvalidOperationException(
                $"'{serviceName}' already exists ({sameName.LaborCode}). " +
                "Use a different Applies To for another rate.");
        }

        bool codeTaken =
            await _context
                .Set<LaborChartEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.LaborChartId !=
                        excludeId
                        &&
                        x.LaborCode ==
                        laborCode
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Labor Code '{laborCode}' is already in use.");
        }
    }


    //===========================================================
    // Sync Income Ledger (create when missing, follow the row)
    //===========================================================

    private async Task
        SyncLedgerAsync
        (
            LaborChartEntity entity,
            LedgerParent parent,
            long userId
        )
    {
        GeneralLedgerEntity? ledger =
            await _context
                .Set<GeneralLedgerEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.LedgerCode ==
                        entity.IncomeLedgerCode
                        &&
                        !x.IsDeleted
                );

        if
        (
            ledger == null
        )
        {
            _context
                .Set<GeneralLedgerEntity>()
                .Add
                (
                    new GeneralLedgerEntity
                    {
                        AccountClassId =
                            parent.Class.AccountClassId,

                        AccountGroupId =
                            parent.Group.AccountGroupId,

                        AccountSubGroupId =
                            parent.SubGroup.AccountSubGroupId,

                        ClassCode =
                            parent.Class.ClassCode,

                        Mode =
                            parent.Class.Mode,

                        GroupCode =
                            parent.Group.GroupCode,

                        SubGroupCode =
                            parent.SubGroup.SubGroupCode,

                        LedgerCode =
                            entity.IncomeLedgerCode,

                        LedgerName =
                            entity.IncomeLedgerName,

                        Remarks =
                            $"System generated from Labor Chart {entity.LaborCode}.",

                        IsActive =
                            entity.IsActive,

                        IsDeleted =
                            false,

                        CreatedBy =
                            userId,

                        CreatedDate =
                            DateTime.UtcNow
                    }
                );

            return;
        }

        if
        (
            ledger.AccountSubGroupId !=
            parent.SubGroup.AccountSubGroupId
        )
        {
            throw new InvalidOperationException(
                $"General Ledger '{entity.IncomeLedgerCode}' belongs to a different sub group.");
        }

        if
        (
            ledger.LedgerName == entity.IncomeLedgerName
            &&
            ledger.IsActive == entity.IsActive
        )
        {
            return;
        }

        ledger.LedgerName =
            entity.IncomeLedgerName;

        ledger.IsActive =
            entity.IsActive;

        ledger.ModifiedBy =
            userId;

        ledger.ModifiedDate =
            DateTime.UtcNow;
    }


    //===========================================================
    // Sync Brand Names (on read)
    //
    // The Service Name carries the brand; when the brand is
    // renamed, the row and its ledger follow. Matched by id / code
    // only. A name that would clash with another row is left.
    //===========================================================

    private async Task
        SyncBrandNamesAsync()
    {
        var rows =
            await
            (
                from l in _context.Set<LaborChartEntity>()
                join b in _context.Set<BrandManagementEntity>()
                    on l.BrandManagementId equals b.BrandManagementId
                where !l.IsDeleted
                select new
                {
                    Entity = l,
                    b.BrandName
                }
            )
            .ToListAsync();

        if
        (
            rows.Count == 0
        )
        {
            return;
        }

        HashSet<string> takenNames =
            rows
                .Select
                (
                    x =>
                        x.Entity.ServiceName.ToLower()
                )
                .ToHashSet();

        bool changed =
            false;

        foreach
        (
            var row
            in rows
        )
        {
            string expected =
                BuildServiceName(
                    row.Entity.OperationName,
                    row.Entity.AppliesTo,
                    row.BrandName);

            if
            (
                row.Entity.ServiceName == expected
                ||
                expected.Length > MaxNameLength
            )
            {
                continue;
            }

            if
            (
                !string.Equals(
                    row.Entity.ServiceName,
                    expected,
                    StringComparison.OrdinalIgnoreCase)
                &&
                takenNames.Contains(
                    expected.ToLower())
            )
            {
                continue;
            }

            takenNames.Remove(
                row.Entity.ServiceName.ToLower());

            takenNames.Add(
                expected.ToLower());

            row.Entity.ServiceName =
                expected;

            row.Entity.IncomeLedgerName =
                expected;

            GeneralLedgerEntity? ledger =
                await _context
                    .Set<GeneralLedgerEntity>()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            x.LedgerCode ==
                            row.Entity.IncomeLedgerCode
                            &&
                            !x.IsDeleted
                    );

            if
            (
                ledger != null
            )
            {
                ledger.LedgerName =
                    expected;

                ledger.ModifiedDate =
                    DateTime.UtcNow;
            }

            changed =
                true;
        }

        if
        (
            changed
        )
        {
            await _context.SaveChangesAsync();
        }
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        LaborChartEntity entity,
        string activityType,
        string verb,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Service Settings",

                EntityName =
                    "Labor Chart",

                EntityId =
                    entity.LaborChartId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Labor Chart {verb}",

                ActivityDescription =
                    $"Labor Chart '{entity.ServiceName}' ({entity.LaborCode}) {verb.ToLower()}.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );
    }


    //===========================================================
    // Create
    //
    // Codes, name and ledger are always built here; the form's
    // values are only a preview.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateLaborChartDto dto,
            long userId
        )
    {
        ServiceSubCategoryEntity subCategory =
            await LoadSubCategoryAsync(
                dto.ServiceSubCategoryId);

        (_, long brandId, string brandName) =
            await ResolveContextAsync(
                subCategory,
                true);

        LedgerParent parent =
            await ResolveLedgerParentAsync(
                subCategory);

        (string section, string operation, string appliesTo, int minutes, decimal charge) =
            ValidateInput(
                dto.Section,
                dto.OperationName,
                dto.AppliesTo,
                dto.StandardMinutes,
                dto.ServiceCharge);

        string serviceName =
            BuildServiceName(
                operation,
                appliesTo,
                brandName);

        string laborCode =
            NextLaborCode(
                subCategory,
                await AllLaborCodesAsync());

        await EnsureUniqueAsync(
            serviceName,
            laborCode,
            0);

        LaborChartEntity entity =
            new LaborChartEntity
            {
                LaborCode =
                    laborCode,

                ServiceSubCategoryId =
                    subCategory.ServiceSubCategoryId,

                BrandManagementId =
                    brandId,

                Section =
                    section,

                OperationName =
                    operation,

                AppliesTo =
                    appliesTo,

                StandardMinutes =
                    minutes,

                ServiceCharge =
                    charge,

                ServiceName =
                    serviceName,

                IncomeLedgerCode =
                    await NextLedgerCodeAsync(
                        parent),

                IncomeLedgerName =
                    serviceName,

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty,

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        _context
            .Set<LaborChartEntity>()
            .Add(
                entity);

        await SyncLedgerAsync(
            entity,
            parent,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.LaborChartId;
    }


    //===========================================================
    // Update
    //
    // Labor Code and Service Sub Category are locked. The name and
    // ledger follow Operation / Applies To; the ledger follows the
    // active state. Cannot be active under an inactive sub category.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateLaborChartDto dto,
            long userId
        )
    {
        LaborChartEntity? entity =
            await _context
                .Set<LaborChartEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.LaborChartId ==
                        dto.LaborChartId
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Labor Chart not found.");
        }

        if
        (
            dto.ServiceSubCategoryId > 0
            &&
            dto.ServiceSubCategoryId !=
            entity.ServiceSubCategoryId
        )
        {
            throw new InvalidOperationException(
                "Service Sub Category cannot be changed after saving.");
        }

        ServiceSubCategoryEntity subCategory =
            await LoadSubCategoryAsync(
                entity.ServiceSubCategoryId);

        (ServiceCategoryEntity category, long brandId, string brandName) =
            await ResolveContextAsync(
                subCategory,
                false);

        if
        (
            dto.IsActive
            &&
            (
                !subCategory.IsActive
                ||
                !category.IsActive
            )
        )
        {
            throw new InvalidOperationException(
                $"Sub category '{subCategory.SubCategoryName}' (or its category) is inactive. Activate it first.");
        }

        LedgerParent parent =
            await ResolveLedgerParentAsync(
                subCategory);

        (string section, string operation, string appliesTo, int minutes, decimal charge) =
            ValidateInput(
                dto.Section,
                dto.OperationName,
                dto.AppliesTo,
                dto.StandardMinutes,
                dto.ServiceCharge);

        string serviceName =
            BuildServiceName(
                operation,
                appliesTo,
                brandName);

        await EnsureUniqueAsync(
            serviceName,
            entity.LaborCode,
            entity.LaborChartId);

        entity.BrandManagementId =
            brandId;

        entity.Section =
            section;

        entity.OperationName =
            operation;

        entity.AppliesTo =
            appliesTo;

        entity.StandardMinutes =
            minutes;

        entity.ServiceCharge =
            charge;

        entity.ServiceName =
            serviceName;

        entity.IncomeLedgerName =
            serviceName;

        entity.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;

        entity.IsActive =
            dto.IsActive;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        if
        (
            string.IsNullOrWhiteSpace(
                entity.IncomeLedgerCode)
        )
        {
            entity.IncomeLedgerCode =
                await NextLedgerCodeAsync(
                    parent);
        }


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await SyncLedgerAsync(
            entity,
            parent,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Update",
            "Updated",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Delete (row + its income ledger)
    //
    // Posting checks come with the transaction modules.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        LaborChartEntity? entity =
            await _context
                .Set<LaborChartEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.LaborChartId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Labor Chart not found.");
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            now;

        List<GeneralLedgerEntity> ledgers =
            await _context
                .Set<GeneralLedgerEntity>()
                .Where
                (
                    x =>
                        x.LedgerCode ==
                        entity.IncomeLedgerCode
                        &&
                        !x.IsDeleted
                )
                .ToListAsync();

        foreach
        (
            GeneralLedgerEntity ledger
            in ledgers
        )
        {
            ledger.IsDeleted =
                true;

            ledger.DeletedBy =
                userId;

            ledger.DeletedDate =
                now;
        }

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Delete",
            "Deleted",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore (most recently deleted row + its ledger)
    //
    // Blocked (409) while its sub category is deleted, or its name
    // / code is taken.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        LaborChartEntity? entity =
            await _context
                .Set<LaborChartEntity>()
                .Where
                (
                    x =>
                        x.IsDeleted
                )
                .OrderByDescending
                (
                    x =>
                        x.DeletedDate
                )
                .FirstOrDefaultAsync();

        if
        (
            entity == null
        )
        {
            return false;
        }

        ServiceSubCategoryEntity subCategory;

        ServiceCategoryEntity category;

        LedgerParent parent;

        try
        {
            subCategory =
                await LoadSubCategoryAsync(
                    entity.ServiceSubCategoryId);

            (ServiceCategoryEntity resolvedCategory, long brandId, string brandName) =
                await ResolveContextAsync(
                    subCategory,
                    false);

            category =
                resolvedCategory;

            parent =
                await ResolveLedgerParentAsync(
                    subCategory);

            string serviceName =
                BuildServiceName(
                    entity.OperationName,
                    entity.AppliesTo,
                    brandName);

            await EnsureUniqueAsync(
                serviceName,
                entity.LaborCode,
                entity.LaborChartId);

            entity.BrandManagementId =
                brandId;

            entity.ServiceName =
                serviceName;

            entity.IncomeLedgerName =
                serviceName;
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Labor Chart '{entity.ServiceName}' cannot be restored. {ex.Message}");
        }


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        foreach
        (
            GeneralLedgerEntity ledger
            in await _context
                .Set<GeneralLedgerEntity>()
                .Where
                (
                    x =>
                        x.LedgerCode ==
                        entity.IncomeLedgerCode
                        &&
                        x.IsDeleted
                )
                .OrderByDescending
                (
                    x =>
                        x.DeletedDate
                )
                .Take(1)
                .ToListAsync()
        )
        {
            ledger.IsDeleted =
                false;

            ledger.DeletedBy =
                null;

            ledger.DeletedDate =
                null;

            ledger.ModifiedBy =
                userId;

            ledger.ModifiedDate =
                DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        entity.IsDeleted =
            false;

        entity.DeletedBy =
            null;

        entity.DeletedDate =
            null;

        // Never active under an inactive sub category / category
        if
        (
            !subCategory.IsActive
            ||
            !category.IsActive
        )
        {
            entity.IsActive =
                false;
        }

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await SyncLedgerAsync(
            entity,
            parent,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Restore",
            "Restored",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return true;
    }


    //===========================================================
    // Exists
    //===========================================================

    public async Task<bool>
        ExistsAsync
        (
            long id
        )
    {
        return await _context
            .Set<LaborChartEntity>()
            .AnyAsync
            (
                x =>
                    x.LaborChartId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}