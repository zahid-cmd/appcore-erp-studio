//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ServiceSettings;

using ServiceCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceCategory;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using ServicePolicyEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServicePolicy;

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
// Service Category Repository
//
// Category Types :
//   Brand Services  : Brand required, and the brand must have a live
//                     Service Policy (policies are declared first);
//                     one category per brand,
//                     name built here as "Service Charges - <Brand Name>"
//                     (e.g. "Service Charges - Suzuki"), never typed.
//                     Sub category types : Labor Chart,
//                     Scheduled Services.
//   Differential Services : no Brand, name typed on the form.
//                     Sub category types : Customized Services,
//                     Membership Services.
//
// Codes :
//   Category Code   BRS-nnn      Brand Services
//                   DRS-nnn      Differential Services
//                                (a separate sequence per type)
//   Income Group    GRP-ccc-ggg  an Account Group in the Income
//                                class (see ResolveIncomeClassAsync;
//                                follows renames), e.g. GRP-005-004.
//                                Same pattern and numbering as the
//                                Account Group page : ggg is the
//                                highest number used in that class
//                                (deleted rows included) + 1.
//   Neither number is ever reused.
//
// Income Group :
//   Created with the category, named exactly like it, renamed /
//   (de)activated / deleted / restored with it. Manual sub groups
//   are not allowed under it; Service Sub Categories create those.
//
// Locked : codes and Category Type never change after creation.
//===============================================================

public class ServiceCategoryRepository :
    IServiceCategoryRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string BrandServicesType =
        "Brand Services";

    private const string DifferentialServicesType =
        "Differential Services";

    // Category Code prefix per Category Type
    private const string BrandServicesPrefix =
        "BRS";

    private const string DifferentialServicesPrefix =
        "DRS";

    private const string GroupPrefix =
        "GRP";

    private const string AccountClassType =
        "Account";

    private const string IncomeClassName =
        "income";

    private const int MaxNameLength =
        200;

    private static readonly string[] CategoryTypes =
    {
        BrandServicesType,
        DifferentialServicesType
    };


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public ServiceCategoryRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Service Category Query
    //===========================================================

    private IQueryable<ServiceCategoryDto>
        ServiceCategoryQuery()
    {
        return _context
            .Set<ServiceCategoryEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new ServiceCategoryDto
                    {
                        ServiceCategoryId =
                            x.ServiceCategoryId,

                        CategoryCode =
                            x.CategoryCode,

                        CategoryName =
                            x.CategoryName,

                        CategoryType =
                            x.CategoryType,

                        BrandManagementId =
                            x.BrandManagementId,

                        BrandName =
                            _context
                                .Set<BrandManagementEntity>()
                                .Where
                                (
                                    b =>
                                        b.BrandManagementId ==
                                        x.BrandManagementId
                                )
                                .Select
                                (
                                    b =>
                                        b.BrandName
                                )
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        IncomeGroupCode =
                            x.IncomeGroupCode,

                        IncomeGroupName =
                            x.IncomeGroupName,

                        SubCategoryCreationAllowed =
                            x.SubCategoryCreationAllowed,

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
    // Get All
    //===========================================================

    public async Task<List<ServiceCategoryDto>>
        GetAllAsync()
    {
        return await ServiceCategoryQuery()
            .OrderBy
            (
                x =>
                    x.CategoryCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<ServiceCategoryDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await ServiceCategoryQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.ServiceCategoryId ==
                    id
            );
    }


    //===========================================================
    // Income Class
    //
    // Never found by a fixed code or a fixed name, so the class
    // can be renamed on the Account Classes page at any time
    // (e.g. "Income" -> "Service Income"):
    //
    //   1. Once service categories exist, the class that holds
    //      their income groups is the one used (follows renames).
    //   2. Before that (first category), a class of
    //      type 'Account' whose name contains "income"; a name that
    //      also contains "service" is preferred, then the lowest
    //      class code.
    //===========================================================

    private async Task<AccountClassEntity>
        ResolveIncomeClassAsync
        (
            bool requireActive
        )
    {
        AccountClassEntity? incomeClass =
            null;

        //=======================================================
        // 1. The class already used by service categories
        //=======================================================

        List<string> usedGroupCodes =
            await _context
                .Set<ServiceCategoryEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.IncomeGroupCode != ""
                )
                .Select
                (
                    x =>
                        x.IncomeGroupCode
                )
                .ToListAsync();

        if
        (
            usedGroupCodes.Count > 0
        )
        {
            long usedClassId =
                await _context
                    .Set<AccountGroupEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            usedGroupCodes.Contains(
                                x.GroupCode)
                    )
                    .GroupBy
                    (
                        x =>
                            x.AccountClassId
                    )
                    .OrderByDescending
                    (
                        g =>
                            g.Count()
                    )
                    .Select
                    (
                        g =>
                            g.Key
                    )
                    .FirstOrDefaultAsync();

            if
            (
                usedClassId > 0
            )
            {
                incomeClass =
                    await _context
                        .Set<AccountClassEntity>()
                        .AsNoTracking()
                        .FirstOrDefaultAsync
                        (
                            x =>
                                x.AccountClassId ==
                                usedClassId
                                &&
                                !x.IsDeleted
                        );
            }
        }

        //=======================================================
        // 2. First use : an 'Account' class named "...income..."
        //=======================================================

        if
        (
            incomeClass ==
            null
        )
        {
            List<AccountClassEntity> candidates =
                await _context
                    .Set<AccountClassEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            x.ClassType ==
                            AccountClassType
                            &&
                            x.ClassName.ToLower().Contains(
                                IncomeClassName)
                    )
                    .ToListAsync();

            incomeClass =
                candidates
                    .OrderByDescending
                    (
                        x =>
                            (x.ClassName ?? string.Empty)
                                .Contains(
                                    "service",
                                    StringComparison.OrdinalIgnoreCase)
                    )
                    .ThenBy
                    (
                        x =>
                            x.ClassCode
                    )
                    .FirstOrDefault();
        }

        if
        (
            incomeClass ==
            null
        )
        {
            throw new InvalidOperationException(
                "No income Account Class found. Create an 'Account' class with 'Income' in its name " +
                "(e.g. 'Service Income') on the Account Classes page first.");
        }

        if
        (
            requireActive
            &&
            !incomeClass.IsActive
        )
        {
            throw new InvalidOperationException(
                $"The '{incomeClass.ClassName}' Account Class ({incomeClass.ClassCode}) is inactive.");
        }

        return incomeClass;
    }


    //===========================================================
    // Code Helpers
    //===========================================================

    // "CLS-005" -> 5
    private static int ClassNumber
    (
        AccountClassEntity accountClass
    )
    {
        string[] parts =
            (accountClass.ClassCode ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        if
        (
            parts.Length != 2
            ||
            !int.TryParse(
                parts[1].Trim(),
                out int number)
            ||
            number < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Account Class code '{accountClass.ClassCode}'.");
        }

        return number;
    }


    // "GRP-005-007" under class 005 -> 7, otherwise 0
    private static int GroupNumber
    (
        string? code,
        int classNumber
    )
    {
        string[] parts =
            (code ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        return parts.Length == 3
            &&
            string.Equals(
                parts[0].Trim(),
                GroupPrefix,
                StringComparison.OrdinalIgnoreCase)
            &&
            parts[1].Trim() ==
            classNumber.ToString("D3")
            &&
            int.TryParse(
                parts[2].Trim(),
                out int number)
                ? number
                : 0;
    }


    // ("BRS-007", "BRS") -> 7, otherwise 0
    private static int CategoryNumber
    (
        string? code,
        string prefix
    )
    {
        string[] parts =
            (code ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        return parts.Length == 2
            &&
            string.Equals(
                parts[0],
                prefix,
                StringComparison.OrdinalIgnoreCase)
            &&
            int.TryParse(
                parts[1],
                out int number)
                ? number
                : 0;
    }


    // Canonical Category Type ("brand services" -> "Brand Services"), or null
    private static string? CanonicalType
    (
        string? categoryType
    )
    {
        return CategoryTypes.FirstOrDefault
        (
            x =>
                string.Equals(
                    x,
                    categoryType?.Trim(),
                    StringComparison.OrdinalIgnoreCase)
        );
    }


    private static bool IsBrandType
    (
        string categoryType
    )
    {
        return string.Equals(
            categoryType,
            BrandServicesType,
            StringComparison.OrdinalIgnoreCase);
    }


    // Brand Services -> BRS, Differential Services -> DRS
    private static string CodePrefix
    (
        string categoryType
    )
    {
        return IsBrandType(categoryType)
            ? BrandServicesPrefix
            : DifferentialServicesPrefix;
    }


    //===========================================================
    // Next Income Group Code (GRP-ccc-ggg)
    //
    // Highest ggg used by any group of the Income class or by any
    // service category (deleted rows included) + 1.
    //===========================================================

    private async Task<string>
        GetNextGroupCodeAsync
        (
            AccountClassEntity incomeClass
        )
    {
        int classNumber =
            ClassNumber(
                incomeClass);

        List<string> groupCodes =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.AccountClassId ==
                        incomeClass.AccountClassId
                )
                .Select
                (
                    x =>
                        x.GroupCode
                )
                .ToListAsync();

        List<string> categoryCodes =
            await _context
                .Set<ServiceCategoryEntity>()
                .AsNoTracking()
                .Select
                (
                    x =>
                        x.IncomeGroupCode
                )
                .ToListAsync();

        int highest =
            groupCodes
                .Concat(categoryCodes)
                .Select
                (
                    x =>
                        GroupNumber(
                            x,
                            classNumber)
                )
                .DefaultIfEmpty(0)
                .Max();

        return CodeGenerator.GenerateAccountGroupCode(
            classNumber,
            highest + 1);
    }


    //===========================================================
    // Next Category Code (BRS-nnn / DRS-nnn)
    //
    // Per Category Type : highest number used with that prefix
    // (deleted rows included) + 1.
    //===========================================================

    private async Task<string>
        GetNextCategoryCodeAsync
        (
            string categoryType
        )
    {
        string prefix =
            CodePrefix(
                categoryType);

        List<string> codes =
            await _context
                .Set<ServiceCategoryEntity>()
                .AsNoTracking()
                .Select
                (
                    x =>
                        x.CategoryCode
                )
                .ToListAsync();

        int highest =
            codes
                .Select
                (
                    x =>
                        CategoryNumber(
                            x,
                            prefix)
                )
                .DefaultIfEmpty(0)
                .Max();

        // Central code generator : BRS-001 / DRS-001
        return CodeGenerator.GenerateServiceCategoryCode(
            prefix,
            highest + 1);
    }


    //===========================================================
    // Get Next Code (per Category Type)
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            string categoryType
        )
    {
        string? canonical =
            CanonicalType(
                categoryType);

        if
        (
            canonical == null
        )
        {
            throw new InvalidOperationException(
                "Invalid Category Type.");
        }

        return await GetNextCategoryCodeAsync(
            canonical);
    }


    //===========================================================
    // Get Defaults (preview of the codes and the Income class)
    //===========================================================

    public async Task<ServiceCategoryDefaultsDto>
        GetDefaultsAsync()
    {
        AccountClassEntity incomeClass =
            await ResolveIncomeClassAsync(
                false);

        return new ServiceCategoryDefaultsDto
        {
            BrandServicesCode =
                await GetNextCategoryCodeAsync(
                    BrandServicesType),

            DifferentialServicesCode =
                await GetNextCategoryCodeAsync(
                    DifferentialServicesType),

            IncomeClassId =
                incomeClass.AccountClassId,

            IncomeClassCode =
                incomeClass.ClassCode,

            IncomeClassName =
                incomeClass.ClassName,

            IncomeGroupCode =
                await GetNextGroupCodeAsync(
                    incomeClass)
        };
    }


    //===========================================================
    // Normalize Name (trim, single spaces, required, length)
    //===========================================================

    private static string NormalizeName
    (
        string? categoryName
    )
    {
        string name =
            string.Join(
                " ",
                (categoryName ?? string.Empty)
                    .Split(
                        ' ',
                        StringSplitOptions.RemoveEmptyEntries));

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "Service Category Name is required.");
        }

        if
        (
            name.Length >
            MaxNameLength
        )
        {
            throw new InvalidOperationException(
                $"Service Category Name cannot be longer than {MaxNameLength} characters.");
        }

        return name;
    }


    //===========================================================
    // Category Type + Brand -> Brand + Category Name
    //
    //   Brand Services  : Brand required (active, unless the
    //                     category already uses it);
    //                     name "Service Charges - <Brand Name>"
    //   Differential Services : no Brand; the typed name
    //===========================================================

    private async Task<(string CategoryType, long? BrandId, string CategoryName)>
        BuildCategoryAsync
        (
            string? categoryType,
            long? brandId,
            long? currentBrandId,
            string? typedName
        )
    {
        string type =
            CanonicalType(
                categoryType)
            ??
            throw new InvalidOperationException(
                "Category Type is required (Brand Services or Differential Services).");

        //=======================================================
        // Differential Services : typed name, no brand
        //=======================================================

        if
        (
            !IsBrandType(type)
        )
        {
            return
            (
                type,
                null,
                NormalizeName(
                    typedName)
            );
        }

        //=======================================================
        // Brand Services : "Service Charges - <Brand Name>"
        //=======================================================

        long id =
            brandId
            ??
            0;

        if
        (
            id <=
            0
        )
        {
            throw new InvalidOperationException(
                "Brand is required for Brand Services.");
        }

        BrandManagementEntity? brand =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BrandManagementId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            brand ==
            null
        )
        {
            throw new InvalidOperationException(
                "The selected Brand was not found. It may have been deleted.");
        }

        if
        (
            !brand.Status
            &&
            id !=
            currentBrandId
        )
        {
            throw new InvalidOperationException(
                $"Brand '{brand.BrandName}' is inactive.");
        }

        await EnsureBrandPolicyAsync(
            id,
            brand.BrandName,
            id != currentBrandId);

        return
        (
            type,
            id,
            NormalizeName(
                $"Service Charges - {brand.BrandName.Trim()}")
        );
    }


    //===========================================================
    // Brand must have a Service Policy (declared first)
    //===========================================================

    private async Task
        EnsureBrandPolicyAsync
        (
            long brandId,
            string brandName,
            bool requireActive
        )
    {
        ServicePolicyEntity? policy =
            await _context
                .Set<ServicePolicyEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.BrandManagementId ==
                        brandId
                );

        if
        (
            policy == null
        )
        {
            throw new InvalidOperationException(
                $"Brand '{brandName}' has no Service Policy. Create its Service Policy first.");
        }

        if
        (
            requireActive
            &&
            !policy.IsActive
        )
        {
            throw new InvalidOperationException(
                $"The Service Policy of brand '{brandName}' ({policy.PolicyCode}) is inactive.");
        }
    }


    //===========================================================
    // Validate Unique Name / Code / Brand (non-deleted rows)
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string categoryCode,
            string categoryName,
            long? brandId,
            long excludeId
        )
    {
        string lowerName =
            categoryName.ToLower();

        ServiceCategoryEntity? sameName =
            await _context
                .Set<ServiceCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ServiceCategoryId !=
                        excludeId
                        &&
                        x.CategoryName.ToLower() ==
                        lowerName
                );

        if
        (
            sameName !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Service Category '{categoryName}' already exists ({sameName.CategoryCode}).");
        }

        if
        (
            brandId.HasValue
        )
        {
            ServiceCategoryEntity? sameBrand =
                await _context
                    .Set<ServiceCategoryEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            x.ServiceCategoryId !=
                            excludeId
                            &&
                            x.BrandManagementId ==
                            brandId
                    );

            if
            (
                sameBrand !=
                null
            )
            {
                throw new InvalidOperationException(
                    $"This brand already has a service category : '{sameBrand.CategoryName}' ({sameBrand.CategoryCode}).");
            }
        }

        bool codeTaken =
            await _context
                .Set<ServiceCategoryEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ServiceCategoryId !=
                        excludeId
                        &&
                        x.CategoryCode ==
                        categoryCode
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Category Code '{categoryCode}' is already in use.");
        }
    }


    //===========================================================
    // Linked Account Groups (by code, deleted ones included)
    //===========================================================

    private async Task<List<AccountGroupEntity>>
        LoadLinkedGroupsAsync
        (
            ServiceCategoryEntity entity
        )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                entity.IncomeGroupCode)
        )
        {
            return new List<AccountGroupEntity>();
        }

        return await _context
            .Set<AccountGroupEntity>()
            .Where
            (
                x =>
                    x.GroupCode ==
                    entity.IncomeGroupCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Sync Income Account Group
    //
    // Creates the group when missing and keeps it in line with
    // the category : name, active state, class data.
    //===========================================================

    private async Task
        SyncAccountGroupAsync
        (
            ServiceCategoryEntity entity,
            AccountClassEntity incomeClass,
            long userId
        )
    {
        AccountGroupEntity? group =
            (await LoadLinkedGroupsAsync(entity))
                .FirstOrDefault
                (
                    x =>
                        !x.IsDeleted
                );

        if
        (
            group ==
            null
        )
        {
            _context
                .Set<AccountGroupEntity>()
                .Add
                (
                    new AccountGroupEntity
                    {
                        AccountClassId =
                            incomeClass.AccountClassId,

                        ClassCode =
                            incomeClass.ClassCode,

                        Mode =
                            incomeClass.Mode,

                        GroupCode =
                            entity.IncomeGroupCode,

                        GroupName =
                            entity.IncomeGroupName,

                        AllowManualSubGroup =
                            false,

                        Remarks =
                            $"System generated from Service Category {entity.CategoryCode}.",

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
            group.AccountClassId !=
            incomeClass.AccountClassId
        )
        {
            throw new InvalidOperationException(
                $"Account Group '{entity.IncomeGroupCode}' belongs to a different Account Class.");
        }

        bool changed =
            group.GroupName != entity.IncomeGroupName
            ||
            group.IsActive != entity.IsActive
            ||
            group.ClassCode != incomeClass.ClassCode
            ||
            group.Mode != incomeClass.Mode
            ||
            group.AllowManualSubGroup;

        if
        (
            !changed
        )
        {
            return;
        }

        group.GroupName =
            entity.IncomeGroupName;

        group.IsActive =
            entity.IsActive;

        group.ClassCode =
            incomeClass.ClassCode;

        group.Mode =
            incomeClass.Mode;

        group.AllowManualSubGroup =
            false;

        group.ModifiedBy =
            userId;

        group.ModifiedDate =
            DateTime.UtcNow;
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        ServiceCategoryEntity entity,
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
                    "Service Category",

                EntityId =
                    entity.ServiceCategoryId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Service Category {verb}",

                ActivityDescription =
                    $"Service Category '{entity.CategoryName}' ({entity.CategoryCode}) {verb.ToLower()}.",

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
    // Codes, name and group name are always built here; the
    // form's values are only a preview.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateServiceCategoryDto dto,
            long userId
        )
    {
        AccountClassEntity incomeClass =
            await ResolveIncomeClassAsync(
                true);

        (string categoryType, long? brandId, string categoryName) =
            await BuildCategoryAsync(
                dto.CategoryType,
                dto.BrandManagementId,
                null,
                dto.CategoryName);

        string categoryCode =
            await GetNextCategoryCodeAsync(
                categoryType);

        await EnsureUniqueAsync(
            categoryCode,
            categoryName,
            brandId,
            0);

        ServiceCategoryEntity entity =
            new ServiceCategoryEntity
            {
                CategoryCode =
                    categoryCode,

                CategoryName =
                    categoryName,

                CategoryType =
                    categoryType,

                BrandManagementId =
                    brandId,

                IncomeGroupCode =
                    await GetNextGroupCodeAsync(
                        incomeClass),

                IncomeGroupName =
                    categoryName,

                SubCategoryCreationAllowed =
                    dto.SubCategoryCreationAllowed,

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
        // Category + its Income group in one transaction
        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        _context
            .Set<ServiceCategoryEntity>()
            .Add(
                entity);

        await SyncAccountGroupAsync(
            entity,
            incomeClass,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.ServiceCategoryId;
    }


    //===========================================================
    // Update
    //
    // Codes and Category Type are locked. Brand Services : a new
    // Brand gives a new name. The group follows the name and the
    // active state.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateServiceCategoryDto dto,
            long userId
        )
    {
        ServiceCategoryEntity? entity =
            await _context
                .Set<ServiceCategoryEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServiceCategoryId ==
                        dto.ServiceCategoryId
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
                "Service Category not found.");
        }

        AccountClassEntity incomeClass =
            await ResolveIncomeClassAsync(
                false);

        (string categoryType, long? brandId, string categoryName) =
            await BuildCategoryAsync(
                dto.CategoryType,
                dto.BrandManagementId,
                entity.BrandManagementId,
                dto.CategoryName);

        if
        (
            !string.Equals(
                entity.CategoryType,
                categoryType,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                $"Category Type cannot be changed after saving (this category is {entity.CategoryType}).");
        }

        await EnsureUniqueAsync(
            entity.CategoryCode,
            categoryName,
            brandId,
            entity.ServiceCategoryId);

        entity.CategoryName =
            categoryName;

        entity.BrandManagementId =
            brandId;

        entity.IncomeGroupName =
            categoryName;

        entity.SubCategoryCreationAllowed =
            dto.SubCategoryCreationAllowed;

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

        // A row saved before its group existed gets a code now
        if
        (
            string.IsNullOrWhiteSpace(
                entity.IncomeGroupCode)
        )
        {
            entity.IncomeGroupCode =
                await GetNextGroupCodeAsync(
                    incomeClass);
        }


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await SyncAccountGroupAsync(
            entity,
            incomeClass,
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
    // Blocked while its Income group still has sub groups (the
    // Service Sub Categories create those). Deletes the category
    // and its group together.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        ServiceCategoryEntity? entity =
            await _context
                .Set<ServiceCategoryEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServiceCategoryId ==
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
                "Service Category not found.");
        }

        List<AccountGroupEntity> groups =
            (await LoadLinkedGroupsAsync(entity))
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .ToList();

        long[] groupIds =
            groups
                .Select
                (
                    x =>
                        x.AccountGroupId
                )
                .ToArray();

        int subGroupCount =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        groupIds.Contains(
                            x.AccountGroupId)
                        &&
                        !x.IsDeleted
                );

        if
        (
            subGroupCount >
            0
        )
        {
            throw new InvalidOperationException(
                $"Service Category '{entity.CategoryName}' cannot be deleted because its account group " +
                $"{entity.IncomeGroupCode} still has {subGroupCount} sub group(s). " +
                "Delete its service sub categories first.");
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
            AccountGroupEntity group
            in groups
        )
        {
            group.IsDeleted =
                true;

            group.DeletedBy =
                userId;

            group.DeletedDate =
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
    // Restores the most recently deleted category and its group.
    // Blocked (409) while its name / code / brand is taken, or its
    // brand has been deleted.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        ServiceCategoryEntity? entity =
            await _context
                .Set<ServiceCategoryEntity>()
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

        try
        {
            await EnsureUniqueAsync(
                entity.CategoryCode,
                entity.CategoryName,
                entity.BrandManagementId,
                entity.ServiceCategoryId);

            if
            (
                entity.BrandManagementId.HasValue
                &&
                !await _context
                    .Set<BrandManagementEntity>()
                    .AnyAsync
                    (
                        x =>
                            x.BrandManagementId ==
                            entity.BrandManagementId
                            &&
                            !x.IsDeleted
                    )
            )
            {
                throw new InvalidOperationException(
                    "Its brand has been deleted. Restore the brand first.");
            }

            if
            (
                entity.BrandManagementId.HasValue
            )
            {
                string brandName =
                    await _context
                        .Set<BrandManagementEntity>()
                        .AsNoTracking()
                        .Where(x => x.BrandManagementId == entity.BrandManagementId)
                        .Select(x => x.BrandName)
                        .FirstOrDefaultAsync()
                    ??
                    string.Empty;

                await EnsureBrandPolicyAsync(
                    entity.BrandManagementId.Value,
                    brandName,
                    false);
            }
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Service Category '{entity.CategoryName}' cannot be restored. {ex.Message}");
        }

        AccountClassEntity incomeClass =
            await ResolveIncomeClassAsync(
                false);


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        //=======================================================
        // Restore the deleted group first, then let Sync create it
        // if missing and bring name / state in line.
        //=======================================================

        foreach
        (
            AccountGroupEntity group
            in (await LoadLinkedGroupsAsync(entity))
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .Take(1)
        )
        {
            group.IsDeleted =
                false;

            group.DeletedBy =
                null;

            group.DeletedDate =
                null;

            group.ModifiedBy =
                userId;

            group.ModifiedDate =
                DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        entity.IsDeleted =
            false;

        entity.DeletedBy =
            null;

        entity.DeletedDate =
            null;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await SyncAccountGroupAsync(
            entity,
            incomeClass,
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
            .Set<ServiceCategoryEntity>()
            .AnyAsync
            (
                x =>
                    x.ServiceCategoryId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}