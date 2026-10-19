//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ServiceSettings;

using ServiceSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceSubCategory;

using ServiceCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceCategory;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using GeneralLedgerEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ServiceSettings;


//===============================================================
// Service Sub Category Repository
//
// Sub Category Types per Category Type :
//   Brand Services        : Labor Chart, Scheduled Services
//                           one sub category per type per category,
//                           name built here as "<Type> - <Brand>"
//                           (e.g. "Labor Chart - Suzuki"), never typed;
//                           follows brand renames (synced on read).
//   Differential Services : Customized Services, Membership Services
//                           any number per type, name typed.
//
// Codes :
//   Sub Category Code  <Category Code>-sss   e.g. BRS-001-001
//   Income Sub Group   SUB-ccc-ggg-sss       an Account Sub Group
//                      under the category's Income Group (same
//                      pattern and numbering as the Account Sub Group
//                      page : highest sss in that group, deleted rows
//                      included, + 1).
//   Neither number is ever reused.
//
// Income Sub Group :
//   Created with the sub category, named exactly like it, renamed /
//   (de)activated / deleted / restored with it. Manual ledgers are
//   not allowed under it; the service item pages create those.
//
// Locked : codes, Service Category and Sub Category Type never
// change after creation.
//===============================================================

public class ServiceSubCategoryRepository :
    IServiceSubCategoryRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string BrandServicesType =
        "Brand Services";

    private const string DifferentialServicesType =
        "Differential Services";

    private const string SubGroupPrefix =
        "SUB";

    private const string GroupPrefix =
        "GRP";

    private const int MaxNameLength =
        200;

    // Sub Category Types allowed per Category Type
    private static readonly Dictionary<string, string[]> SubCategoryTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            [BrandServicesType] =
                new[]
                {
                    "Labor Chart",
                    "Scheduled Services"
                },

            [DifferentialServicesType] =
                new[]
                {
                    "Customized Services",
                    "Membership Services"
                }
        };


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public ServiceSubCategoryRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Service Sub Category Query
    //===========================================================

    private IQueryable<ServiceSubCategoryDto>
        ServiceSubCategoryQuery()
    {
        return _context
            .Set<ServiceSubCategoryEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new ServiceSubCategoryDto
                    {
                        ServiceSubCategoryId =
                            x.ServiceSubCategoryId,

                        SubCategoryCode =
                            x.SubCategoryCode,

                        SubCategoryType =
                            x.SubCategoryType,

                        SubCategoryName =
                            x.SubCategoryName,

                        ServiceCategoryId =
                            x.ServiceCategoryId,

                        CategoryCode =
                            _context
                                .Set<ServiceCategoryEntity>()
                                .Where(c => c.ServiceCategoryId == x.ServiceCategoryId)
                                .Select(c => c.CategoryCode)
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        CategoryName =
                            _context
                                .Set<ServiceCategoryEntity>()
                                .Where(c => c.ServiceCategoryId == x.ServiceCategoryId)
                                .Select(c => c.CategoryName)
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        CategoryType =
                            _context
                                .Set<ServiceCategoryEntity>()
                                .Where(c => c.ServiceCategoryId == x.ServiceCategoryId)
                                .Select(c => c.CategoryType)
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        BrandName =
                            _context
                                .Set<ServiceCategoryEntity>()
                                .Where(c => c.ServiceCategoryId == x.ServiceCategoryId)
                                .Select
                                (
                                    c =>
                                        _context
                                            .Set<BrandManagementEntity>()
                                            .Where(b => b.BrandManagementId == c.BrandManagementId)
                                            .Select(b => b.BrandName)
                                            .FirstOrDefault()
                                )
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        IncomeGroupCode =
                            _context
                                .Set<ServiceCategoryEntity>()
                                .Where(c => c.ServiceCategoryId == x.ServiceCategoryId)
                                .Select(c => c.IncomeGroupCode)
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        IncomeSubGroupCode =
                            x.IncomeSubGroupCode,

                        IncomeSubGroupName =
                            x.IncomeSubGroupName,

                        ItemCreationAllowed =
                            x.ItemCreationAllowed,

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

    public async Task<List<ServiceSubCategoryDto>>
        GetAllAsync()
    {
        await SyncBrandNamesAsync();

        return await ServiceSubCategoryQuery()
            .OrderBy
            (
                x =>
                    x.SubCategoryCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<ServiceSubCategoryDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await ServiceSubCategoryQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.ServiceSubCategoryId ==
                    id
            );
    }


    //===========================================================
    // Type Helpers
    //===========================================================

    private static bool IsBrandType
    (
        string? categoryType
    )
    {
        return string.Equals(
            categoryType?.Trim(),
            BrandServicesType,
            StringComparison.OrdinalIgnoreCase);
    }


    // Canonical Sub Category Type allowed for the category type, or null
    private static string? CanonicalSubType
    (
        string? categoryType,
        string? subCategoryType
    )
    {
        if
        (
            !SubCategoryTypes.TryGetValue(
                categoryType?.Trim() ?? string.Empty,
                out string[]? allowed)
        )
        {
            return null;
        }

        return allowed.FirstOrDefault
        (
            x =>
                string.Equals(
                    x,
                    subCategoryType?.Trim(),
                    StringComparison.OrdinalIgnoreCase)
        );
    }


    // "Suzuki" + "Labor Chart" -> "Labor Chart - Suzuki"
    private static string BrandSubCategoryName
    (
        string? brandName,
        string subCategoryType
    )
    {
        string brand =
            string.Join(
                " ",
                (brandName ?? string.Empty)
                    .Split(
                        ' ',
                        StringSplitOptions.RemoveEmptyEntries));

        return string.IsNullOrWhiteSpace(brand)
            ? string.Empty
            : $"{subCategoryType} - {brand}";
    }


    //===========================================================
    // Normalize Name (trim, single spaces, required, length)
    //===========================================================

    private static string NormalizeName
    (
        string? subCategoryName
    )
    {
        string name =
            string.Join(
                " ",
                (subCategoryName ?? string.Empty)
                    .Split(
                        ' ',
                        StringSplitOptions.RemoveEmptyEntries));

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "Sub Category Name is required.");
        }

        if
        (
            name.Length >
            MaxNameLength
        )
        {
            throw new InvalidOperationException(
                $"Sub Category Name cannot be longer than {MaxNameLength} characters.");
        }

        return name;
    }


    //===========================================================
    // Code Helpers
    //===========================================================

    // "GRP-005-007" -> (5, 7)
    private static (int ClassNo, int GroupNo) GroupNumbers
    (
        string? groupCode
    )
    {
        string[] parts =
            (groupCode ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        if
        (
            parts.Length != 3
            ||
            !string.Equals(
                parts[0],
                GroupPrefix,
                StringComparison.OrdinalIgnoreCase)
            ||
            !int.TryParse(parts[1], out int classNo)
            ||
            !int.TryParse(parts[2], out int groupNo)
            ||
            classNo < 1
            ||
            groupNo < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Income Group code '{groupCode}'.");
        }

        return (classNo, groupNo);
    }


    // "SUB-005-007-003" under (5, 7) -> 3, otherwise 0
    private static int SubGroupNumber
    (
        string? code,
        int classNo,
        int groupNo
    )
    {
        string[] parts =
            (code ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        return parts.Length == 4
            &&
            string.Equals(
                parts[0],
                SubGroupPrefix,
                StringComparison.OrdinalIgnoreCase)
            &&
            parts[1] == classNo.ToString("D3")
            &&
            parts[2] == groupNo.ToString("D3")
            &&
            int.TryParse(
                parts[3],
                out int number)
                ? number
                : 0;
    }


    // ("BRS-001-004", "BRS-001") -> 4, otherwise 0
    private static int SubCategoryNumber
    (
        string? code,
        string categoryCode
    )
    {
        string prefix =
            $"{categoryCode}-";

        string value =
            (code ?? string.Empty).Trim();

        return value.StartsWith(
                prefix,
                StringComparison.OrdinalIgnoreCase)
            &&
            int.TryParse(
                value.Substring(prefix.Length),
                out int number)
                ? number
                : 0;
    }


    //===========================================================
    // Next Sub Category Code (<Category Code>-sss)
    //
    // Highest number used under the category (deleted rows
    // included) + 1.
    //===========================================================

    private static string NextSubCategoryCode
    (
        ServiceCategoryEntity category,
        IEnumerable<ServiceSubCategoryEntity> allSubCategories
    )
    {
        int highest =
            allSubCategories
                .Where
                (
                    x =>
                        x.ServiceCategoryId ==
                        category.ServiceCategoryId
                )
                .Select
                (
                    x =>
                        SubCategoryNumber(
                            x.SubCategoryCode,
                            category.CategoryCode)
                )
                .DefaultIfEmpty(0)
                .Max();

        (string prefix, int categoryNo) =
            CategoryCodeParts(
                category.CategoryCode);

        // Central code generator : BRS-001-002
        return CodeGenerator.GenerateServiceSubCategoryCode(
            prefix,
            categoryNo,
            highest + 1);
    }


    // "BRS-001" -> ("BRS", 1)
    private static (string Prefix, int Number) CategoryCodeParts
    (
        string? categoryCode
    )
    {
        string[] parts =
            (categoryCode ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        if
        (
            parts.Length != 2
            ||
            !int.TryParse(
                parts[1],
                out int number)
            ||
            number < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Service Category code '{categoryCode}'.");
        }

        return (parts[0], number);
    }


    //===========================================================
    // Next Income Sub Group Code (SUB-ccc-ggg-sss)
    //
    // Highest sss used by any sub group of the group or by any
    // service sub category (deleted rows included) + 1.
    //===========================================================

    private static string NextSubGroupCode
    (
        AccountGroupEntity group,
        IEnumerable<AccountSubGroupEntity> allSubGroups,
        IEnumerable<ServiceSubCategoryEntity> allSubCategories
    )
    {
        (int classNo, int groupNo) =
            GroupNumbers(
                group.GroupCode);

        int highest =
            allSubGroups
                .Where
                (
                    x =>
                        x.AccountGroupId ==
                        group.AccountGroupId
                )
                .Select
                (
                    x =>
                        x.SubGroupCode
                )
                .Concat
                (
                    allSubCategories
                        .Select
                        (
                            x =>
                                x.IncomeSubGroupCode
                        )
                )
                .Select
                (
                    x =>
                        SubGroupNumber(
                            x,
                            classNo,
                            groupNo)
                )
                .DefaultIfEmpty(0)
                .Max();

        return CodeGenerator.GenerateAccountSubGroupCode(
            classNo,
            groupNo,
            highest + 1);
    }


    private async Task<string>
        NextSubCategoryCodeAsync
        (
            ServiceCategoryEntity category
        )
    {
        List<ServiceSubCategoryEntity> rows =
            await _context
                .Set<ServiceSubCategoryEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ServiceCategoryId ==
                        category.ServiceCategoryId
                )
                .ToListAsync();

        return NextSubCategoryCode(
            category,
            rows);
    }


    private async Task<string>
        NextSubGroupCodeAsync
        (
            AccountGroupEntity group
        )
    {
        List<AccountSubGroupEntity> subGroups =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.AccountGroupId ==
                        group.AccountGroupId
                )
                .ToListAsync();

        List<ServiceSubCategoryEntity> subCategories =
            await _context
                .Set<ServiceSubCategoryEntity>()
                .AsNoTracking()
                .ToListAsync();

        return NextSubGroupCode(
            group,
            subGroups,
            subCategories);
    }


    //===========================================================
    // Get Defaults
    //
    // Every live Service Category with its income account and the
    // next codes under it. The form offers only active categories
    // that allow sub categories (plus the row's own category).
    //===========================================================

    public async Task<ServiceSubCategoryDefaultsDto>
        GetDefaultsAsync()
    {
        List<ServiceCategoryEntity> categories =
            await _context
                .Set<ServiceCategoryEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .OrderBy
                (
                    x =>
                        x.CategoryCode
                )
                .ToListAsync();

        List<string> groupCodes =
            categories
                .Select
                (
                    x =>
                        x.IncomeGroupCode
                )
                .ToList();

        List<AccountGroupEntity> groups =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        groupCodes.Contains(
                            x.GroupCode)
                )
                .ToListAsync();

        List<long> groupIds =
            groups
                .Select
                (
                    x =>
                        x.AccountGroupId
                )
                .ToList();

        List<long> classIds =
            groups
                .Select
                (
                    x =>
                        x.AccountClassId
                )
                .Distinct()
                .ToList();

        List<AccountClassEntity> classes =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        classIds.Contains(
                            x.AccountClassId)
                )
                .ToListAsync();

        List<AccountSubGroupEntity> subGroups =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        groupIds.Contains(
                            x.AccountGroupId)
                )
                .ToListAsync();

        List<ServiceSubCategoryEntity> subCategories =
            await _context
                .Set<ServiceSubCategoryEntity>()
                .AsNoTracking()
                .ToListAsync();

        List<long?> brandIds =
            categories
                .Where
                (
                    x =>
                        x.BrandManagementId.HasValue
                )
                .Select
                (
                    x =>
                        x.BrandManagementId
                )
                .ToList();

        Dictionary<long, string> brandNames =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        brandIds.Contains(
                            x.BrandManagementId)
                )
                .ToDictionaryAsync
                (
                    x =>
                        x.BrandManagementId,
                    x =>
                        x.BrandName
                );

        ServiceSubCategoryDefaultsDto result =
            new ServiceSubCategoryDefaultsDto();

        foreach
        (
            ServiceCategoryEntity category
            in categories
        )
        {
            AccountGroupEntity? group =
                groups.FirstOrDefault
                (
                    x =>
                        x.GroupCode ==
                        category.IncomeGroupCode
                );

            AccountClassEntity? accountClass =
                group == null
                    ? null
                    : classes.FirstOrDefault
                    (
                        x =>
                            x.AccountClassId ==
                            group.AccountClassId
                    );

            string nextSubGroupCode =
                string.Empty;

            if
            (
                group != null
            )
            {
                try
                {
                    nextSubGroupCode =
                        NextSubGroupCode(
                            group,
                            subGroups,
                            subCategories);
                }
                catch
                (
                    InvalidOperationException
                )
                {
                    // An unexpected group code : no preview
                }
            }

            result.Categories.Add
            (
                new ServiceSubCategoryCategoryOptionDto
                {
                    ServiceCategoryId =
                        category.ServiceCategoryId,

                    CategoryCode =
                        category.CategoryCode,

                    CategoryName =
                        category.CategoryName,

                    CategoryType =
                        category.CategoryType,

                    BrandName =
                        category.BrandManagementId.HasValue
                        &&
                        brandNames.TryGetValue(
                            category.BrandManagementId.Value,
                            out string? brandName)
                            ? brandName
                            : string.Empty,

                    IsActive =
                        category.IsActive,

                    SubCategoryCreationAllowed =
                        category.SubCategoryCreationAllowed,

                    IncomeClassCode =
                        accountClass?.ClassCode
                        ??
                        string.Empty,

                    IncomeClassName =
                        accountClass?.ClassName
                        ??
                        string.Empty,

                    IncomeGroupCode =
                        category.IncomeGroupCode,

                    IncomeGroupName =
                        group?.GroupName
                        ??
                        category.IncomeGroupName,

                    NextSubCategoryCode =
                        NextSubCategoryCode(
                            category,
                            subCategories),

                    NextSubGroupCode =
                        nextSubGroupCode,

                    UsedSubCategoryTypes =
                        IsBrandType(category.CategoryType)
                            ? subCategories
                                .Where
                                (
                                    x =>
                                        !x.IsDeleted
                                        &&
                                        x.ServiceCategoryId ==
                                        category.ServiceCategoryId
                                )
                                .Select
                                (
                                    x =>
                                        x.SubCategoryType
                                )
                                .Distinct()
                                .ToList()
                            : new List<string>()
                }
            );
        }

        return result;
    }


    //===========================================================
    // Load Service Category (live)
    //
    // forNewLink : creating a sub category under it, so it must be
    // active and allow sub categories.
    //===========================================================

    private async Task<ServiceCategoryEntity>
        LoadCategoryAsync
        (
            long serviceCategoryId,
            bool forNewLink
        )
    {
        if
        (
            serviceCategoryId <=
            0
        )
        {
            throw new InvalidOperationException(
                "Service Category is required.");
        }

        ServiceCategoryEntity? category =
            await _context
                .Set<ServiceCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServiceCategoryId ==
                        serviceCategoryId
                        &&
                        !x.IsDeleted
                );

        if
        (
            category ==
            null
        )
        {
            throw new InvalidOperationException(
                "The selected Service Category was not found. It may have been deleted.");
        }

        if
        (
            forNewLink
            &&
            !category.IsActive
        )
        {
            throw new InvalidOperationException(
                $"Service Category '{category.CategoryName}' ({category.CategoryCode}) is inactive.");
        }

        if
        (
            forNewLink
            &&
            !category.SubCategoryCreationAllowed
        )
        {
            throw new InvalidOperationException(
                $"Service Category '{category.CategoryName}' ({category.CategoryCode}) does not allow sub categories.");
        }

        return category;
    }


    //===========================================================
    // Load the category's Income Group (live)
    //===========================================================

    private async Task<AccountGroupEntity>
        LoadIncomeGroupAsync
        (
            ServiceCategoryEntity category
        )
    {
        AccountGroupEntity? group =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.GroupCode ==
                        category.IncomeGroupCode
                        &&
                        !x.IsDeleted
                );

        if
        (
            group ==
            null
        )
        {
            throw new InvalidOperationException(
                $"The income account group {category.IncomeGroupCode} of Service Category " +
                $"'{category.CategoryName}' was not found. Open and save the category to rebuild it.");
        }

        return group;
    }


    //===========================================================
    // Sub Category Type + Name
    //
    //   Brand Services        : "<Type> - <Brand>", never typed
    //   Differential Services : the typed name
    //===========================================================

    private async Task<(string SubType, string Name)>
        BuildSubCategoryAsync
        (
            ServiceCategoryEntity category,
            string? subCategoryType,
            string? typedName
        )
    {
        string subType =
            CanonicalSubType(
                category.CategoryType,
                subCategoryType)
            ??
            throw new InvalidOperationException(
                SubCategoryTypes.TryGetValue(
                    category.CategoryType,
                    out string[]? allowed)
                    ? $"Sub Category Type must be {string.Join(" or ", allowed)} for {category.CategoryType}."
                    : "Sub Category Type is required.");

        if
        (
            !IsBrandType(category.CategoryType)
        )
        {
            return
            (
                subType,
                NormalizeName(
                    typedName)
            );
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
            string.IsNullOrWhiteSpace(brandName)
        )
        {
            throw new InvalidOperationException(
                $"The brand of Service Category '{category.CategoryName}' was not found.");
        }

        return
        (
            subType,
            NormalizeName(
                BrandSubCategoryName(
                    brandName,
                    subType))
        );
    }


    //===========================================================
    // Validate Unique Name / Code / Brand Type (non-deleted rows)
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            ServiceCategoryEntity category,
            string subCategoryCode,
            string subType,
            string subCategoryName,
            long excludeId
        )
    {
        string lowerName =
            subCategoryName.ToLower();

        ServiceSubCategoryEntity? sameName =
            await _context
                .Set<ServiceSubCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ServiceSubCategoryId !=
                        excludeId
                        &&
                        x.SubCategoryName.ToLower() ==
                        lowerName
                );

        if
        (
            sameName !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Service Sub Category '{subCategoryName}' already exists ({sameName.SubCategoryCode}).");
        }

        // Brand Services : one sub category per type
        if
        (
            IsBrandType(category.CategoryType)
        )
        {
            ServiceSubCategoryEntity? sameType =
                await _context
                    .Set<ServiceSubCategoryEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            x.ServiceSubCategoryId !=
                            excludeId
                            &&
                            x.ServiceCategoryId ==
                            category.ServiceCategoryId
                            &&
                            x.SubCategoryType ==
                            subType
                    );

            if
            (
                sameType !=
                null
            )
            {
                throw new InvalidOperationException(
                    $"'{category.CategoryName}' already has its {subType} sub category : " +
                    $"'{sameType.SubCategoryName}' ({sameType.SubCategoryCode}).");
            }
        }

        bool codeTaken =
            await _context
                .Set<ServiceSubCategoryEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ServiceSubCategoryId !=
                        excludeId
                        &&
                        x.SubCategoryCode ==
                        subCategoryCode
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Sub Category Code '{subCategoryCode}' is already in use.");
        }
    }


    //===========================================================
    // Linked Account Sub Groups (by code, deleted ones included)
    //===========================================================

    private async Task<List<AccountSubGroupEntity>>
        LoadLinkedSubGroupsAsync
        (
            ServiceSubCategoryEntity entity
        )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                entity.IncomeSubGroupCode)
        )
        {
            return new List<AccountSubGroupEntity>();
        }

        return await _context
            .Set<AccountSubGroupEntity>()
            .Where
            (
                x =>
                    x.SubGroupCode ==
                    entity.IncomeSubGroupCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Sync Income Account Sub Group
    //
    // Creates the sub group when missing and keeps it in line with
    // the sub category : name, active state, group / class data.
    //===========================================================

    private async Task
        SyncAccountSubGroupAsync
        (
            ServiceSubCategoryEntity entity,
            AccountGroupEntity group,
            long userId
        )
    {
        AccountSubGroupEntity? subGroup =
            (await LoadLinkedSubGroupsAsync(entity))
                .FirstOrDefault
                (
                    x =>
                        !x.IsDeleted
                );

        if
        (
            subGroup ==
            null
        )
        {
            _context
                .Set<AccountSubGroupEntity>()
                .Add
                (
                    new AccountSubGroupEntity
                    {
                        AccountClassId =
                            group.AccountClassId,

                        AccountGroupId =
                            group.AccountGroupId,

                        ClassCode =
                            group.ClassCode,

                        Mode =
                            group.Mode,

                        GroupCode =
                            group.GroupCode,

                        SubGroupCode =
                            entity.IncomeSubGroupCode,

                        SubGroupName =
                            entity.IncomeSubGroupName,

                        AllowManualLedger =
                            false,

                        Remarks =
                            $"System generated from Service Sub Category {entity.SubCategoryCode}.",

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
            subGroup.AccountGroupId !=
            group.AccountGroupId
        )
        {
            throw new InvalidOperationException(
                $"Account Sub Group '{entity.IncomeSubGroupCode}' belongs to a different Account Group.");
        }

        bool changed =
            subGroup.SubGroupName != entity.IncomeSubGroupName
            ||
            subGroup.IsActive != entity.IsActive
            ||
            subGroup.ClassCode != group.ClassCode
            ||
            subGroup.Mode != group.Mode
            ||
            subGroup.GroupCode != group.GroupCode
            ||
            subGroup.AllowManualLedger;

        if
        (
            !changed
        )
        {
            return;
        }

        subGroup.SubGroupName =
            entity.IncomeSubGroupName;

        subGroup.IsActive =
            entity.IsActive;

        subGroup.ClassCode =
            group.ClassCode;

        subGroup.Mode =
            group.Mode;

        subGroup.GroupCode =
            group.GroupCode;

        subGroup.AllowManualLedger =
            false;

        subGroup.ModifiedBy =
            userId;

        subGroup.ModifiedDate =
            DateTime.UtcNow;
    }


    //===========================================================
    // Sync Brand Names (on read)
    //
    // Brand Services sub categories are named "<Type> - <Brand>".
    // When a brand is renamed (or a category moved to another
    // brand), the sub category and its sub group follow. Matched
    // by id / code only, never by name. A name that would clash
    // with another row is left as it is.
    //===========================================================

    private async Task
        SyncBrandNamesAsync()
    {
        var rows =
            await
            (
                from s in _context.Set<ServiceSubCategoryEntity>()
                join c in _context.Set<ServiceCategoryEntity>()
                    on s.ServiceCategoryId equals c.ServiceCategoryId
                join b in _context.Set<BrandManagementEntity>()
                    on c.BrandManagementId equals (long?)b.BrandManagementId
                where !s.IsDeleted
                      &&
                      c.CategoryType == BrandServicesType
                select new
                {
                    Entity = s,
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
            (
                await _context
                    .Set<ServiceSubCategoryEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            !x.IsDeleted
                    )
                    .Select
                    (
                        x =>
                            x.SubCategoryName
                    )
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    x.ToLower()
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
                BrandSubCategoryName(
                    row.BrandName,
                    row.Entity.SubCategoryType);

            if
            (
                string.IsNullOrWhiteSpace(expected)
                ||
                expected.Length > MaxNameLength
                ||
                row.Entity.SubCategoryName == expected
            )
            {
                continue;
            }

            // Only a case change, or a name nobody else uses
            if
            (
                !string.Equals(
                    row.Entity.SubCategoryName,
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
                row.Entity.SubCategoryName.ToLower());

            takenNames.Add(
                expected.ToLower());

            row.Entity.SubCategoryName =
                expected;

            row.Entity.IncomeSubGroupName =
                expected;

            foreach
            (
                AccountSubGroupEntity subGroup
                in (await LoadLinkedSubGroupsAsync(row.Entity))
                    .Where(x => !x.IsDeleted)
            )
            {
                subGroup.SubGroupName =
                    expected;

                subGroup.ModifiedDate =
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
        ServiceSubCategoryEntity entity,
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
                    "Service Sub Category",

                EntityId =
                    entity.ServiceSubCategoryId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Service Sub Category {verb}",

                ActivityDescription =
                    $"Service Sub Category '{entity.SubCategoryName}' ({entity.SubCategoryCode}) {verb.ToLower()}.",

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
    // Codes, name and sub group name are always built here; the
    // form's values are only a preview.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateServiceSubCategoryDto dto,
            long userId
        )
    {
        ServiceCategoryEntity category =
            await LoadCategoryAsync(
                dto.ServiceCategoryId,
                true);

        AccountGroupEntity group =
            await LoadIncomeGroupAsync(
                category);

        (string subType, string name) =
            await BuildSubCategoryAsync(
                category,
                dto.SubCategoryType,
                dto.SubCategoryName);

        string subCategoryCode =
            await NextSubCategoryCodeAsync(
                category);

        await EnsureUniqueAsync(
            category,
            subCategoryCode,
            subType,
            name,
            0);

        ServiceSubCategoryEntity entity =
            new ServiceSubCategoryEntity
            {
                SubCategoryCode =
                    subCategoryCode,

                ServiceCategoryId =
                    category.ServiceCategoryId,

                SubCategoryType =
                    subType,

                SubCategoryName =
                    name,

                IncomeSubGroupCode =
                    await NextSubGroupCodeAsync(
                        group),

                IncomeSubGroupName =
                    name,

                ItemCreationAllowed =
                    dto.ItemCreationAllowed,

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


        //=======================================================
        // Sub category + its Income sub group in one transaction
        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        _context
            .Set<ServiceSubCategoryEntity>()
            .Add(
                entity);

        await SyncAccountSubGroupAsync(
            entity,
            group,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.ServiceSubCategoryId;
    }


    //===========================================================
    // Update
    //
    // Codes, Service Category and Sub Category Type are locked.
    // Differential Services : the name may change. The sub group
    // follows the name and the active state. A sub category cannot
    // be active under an inactive category.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateServiceSubCategoryDto dto,
            long userId
        )
    {
        ServiceSubCategoryEntity? entity =
            await _context
                .Set<ServiceSubCategoryEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServiceSubCategoryId ==
                        dto.ServiceSubCategoryId
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Service Sub Category not found.");
        }

        if
        (
            dto.ServiceCategoryId > 0
            &&
            dto.ServiceCategoryId !=
            entity.ServiceCategoryId
        )
        {
            throw new InvalidOperationException(
                "Service Category cannot be changed after saving.");
        }

        ServiceCategoryEntity category =
            await LoadCategoryAsync(
                entity.ServiceCategoryId,
                false);

        AccountGroupEntity group =
            await LoadIncomeGroupAsync(
                category);

        (string subType, string name) =
            await BuildSubCategoryAsync(
                category,
                dto.SubCategoryType,
                dto.SubCategoryName);

        if
        (
            !string.Equals(
                entity.SubCategoryType,
                subType,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                $"Sub Category Type cannot be changed after saving (this sub category is {entity.SubCategoryType}).");
        }

        if
        (
            dto.IsActive
            &&
            !category.IsActive
        )
        {
            throw new InvalidOperationException(
                $"Service Category '{category.CategoryName}' is inactive. Activate the category first.");
        }

        await EnsureUniqueAsync(
            category,
            entity.SubCategoryCode,
            entity.SubCategoryType,
            name,
            entity.ServiceSubCategoryId);

        entity.SubCategoryName =
            name;

        entity.IncomeSubGroupName =
            name;

        entity.ItemCreationAllowed =
            dto.ItemCreationAllowed;

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

        // A row saved before its sub group existed gets a code now
        if
        (
            string.IsNullOrWhiteSpace(
                entity.IncomeSubGroupCode)
        )
        {
            entity.IncomeSubGroupCode =
                await NextSubGroupCodeAsync(
                    group);
        }


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await SyncAccountSubGroupAsync(
            entity,
            group,
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
    // Delete
    //
    // Blocked while its Income sub group still has ledgers (the
    // service item pages create those). Deletes the sub category
    // and its sub group together.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        ServiceSubCategoryEntity? entity =
            await _context
                .Set<ServiceSubCategoryEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServiceSubCategoryId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Service Sub Category not found.");
        }

        List<AccountSubGroupEntity> subGroups =
            (await LoadLinkedSubGroupsAsync(entity))
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .ToList();

        long[] subGroupIds =
            subGroups
                .Select
                (
                    x =>
                        x.AccountSubGroupId
                )
                .ToArray();

        int ledgerCount =
            await _context
                .Set<GeneralLedgerEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        subGroupIds.Contains(
                            x.AccountSubGroupId)
                        &&
                        !x.IsDeleted
                );

        if
        (
            ledgerCount >
            0
        )
        {
            throw new InvalidOperationException(
                $"Service Sub Category '{entity.SubCategoryName}' cannot be deleted because its account sub group " +
                $"{entity.IncomeSubGroupCode} still has {ledgerCount} ledger(s). " +
                "Delete its service items first.");
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            now;

        foreach
        (
            AccountSubGroupEntity subGroup
            in subGroups
        )
        {
            subGroup.IsDeleted =
                true;

            subGroup.DeletedBy =
                userId;

            subGroup.DeletedDate =
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
    // Restore
    //
    // Restores the most recently deleted sub category and its sub
    // group. Blocked (409) while its category / income group is
    // deleted, or its name / code / brand type is taken.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        ServiceSubCategoryEntity? entity =
            await _context
                .Set<ServiceSubCategoryEntity>()
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
            entity ==
            null
        )
        {
            return false;
        }

        ServiceCategoryEntity category;

        AccountGroupEntity group;

        try
        {
            category =
                await LoadCategoryAsync(
                    entity.ServiceCategoryId,
                    false);

            group =
                await LoadIncomeGroupAsync(
                    category);

            // Brand Services : the name follows the current brand name
            if
            (
                IsBrandType(category.CategoryType)
            )
            {
                (_, string name) =
                    await BuildSubCategoryAsync(
                        category,
                        entity.SubCategoryType,
                        entity.SubCategoryName);

                entity.SubCategoryName =
                    name;

                entity.IncomeSubGroupName =
                    name;
            }

            await EnsureUniqueAsync(
                category,
                entity.SubCategoryCode,
                entity.SubCategoryType,
                entity.SubCategoryName,
                entity.ServiceSubCategoryId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Service Sub Category '{entity.SubCategoryName}' cannot be restored. {ex.Message}");
        }


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        //=======================================================
        // Restore the deleted sub group first, then let Sync
        // create it if missing and bring name / state in line.
        //=======================================================

        foreach
        (
            AccountSubGroupEntity subGroup
            in (await LoadLinkedSubGroupsAsync(entity))
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .Take(1)
        )
        {
            subGroup.IsDeleted =
                false;

            subGroup.DeletedBy =
                null;

            subGroup.DeletedDate =
                null;

            subGroup.ModifiedBy =
                userId;

            subGroup.ModifiedDate =
                DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        entity.IsDeleted =
            false;

        entity.DeletedBy =
            null;

        entity.DeletedDate =
            null;

        // Never active under an inactive category
        if
        (
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

        await SyncAccountSubGroupAsync(
            entity,
            group,
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
            .Set<ServiceSubCategoryEntity>()
            .AnyAsync
            (
                x =>
                    x.ServiceSubCategoryId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}