//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ServiceSettings;

using CustomizedServiceEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.CustomizedServices;

using ServiceCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceCategory;

using ServiceSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceSubCategory;

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
// Customized Services Repository
//
// Dealer-level services (any brand) at one fixed charge, under a
// "Customized Services" sub category of a Differential Services
// category.
//
// Codes (central CodeGenerator, never reused) :
//   Service Code   OCS-ccc-sss-nnnnn   e.g. sub category DRS-001-001
//                                      -> OCS-001-001-00001
//   Income Ledger  GLR-ccc-ggg-sss-nnnnn under the sub category's
//                  account sub group
//   Highest number used (deleted rows included) + 1.
//
// Service Name : typed, unique among live rows. The income ledger
// has the same name and follows the row's active / deleted state.
//
// Locked : Service Code, Service Sub Category.
//===============================================================

public class CustomizedServicesRepository :
    ICustomizedServicesRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string CustomizedServicesType =
        "Customized Services";

    private const string LedgerPrefix =
        "GLR";

    private const int MaxNameLength =
        200;

    private const int MaxMinutes =
        1440;

    private const decimal MaxAmount =
        99999999.99m;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public CustomizedServicesRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Query
    //===========================================================

    private IQueryable<CustomizedServicesDto>
        CustomizedServiceQuery()
    {
        return _context
            .Set<CustomizedServiceEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new CustomizedServicesDto
                    {
                        CustomizedServiceId =
                            x.CustomizedServiceId,

                        ServiceCode =
                            x.ServiceCode,

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

                        ServiceName =
                            x.ServiceName,

                        StandardMinutes =
                            x.StandardMinutes,

                        ServiceCharge =
                            x.ServiceCharge,

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
    // Get All
    //===========================================================

    public async Task<List<CustomizedServicesDto>>
        GetAllAsync()
    {
        return await CustomizedServiceQuery()
            .OrderBy
            (
                x =>
                    x.ServiceCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<CustomizedServicesDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await CustomizedServiceQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.CustomizedServiceId ==
                    id
            );
    }


    //===========================================================
    // Name Helper (trim, single spaces)
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


    //===========================================================
    // Get Defaults
    //
    // Every live Customized Services sub category with the codes
    // the next service under it gets (or why it cannot take one).
    //===========================================================

    public async Task<CustomizedServicesDefaultsDto>
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
                        CustomizedServicesType
                )
                .OrderBy
                (
                    x =>
                        x.SubCategoryCode
                )
                .ToListAsync();

        List<string> serviceCodes =
            await AllServiceCodesAsync();

        CustomizedServicesDefaultsDto result =
            new CustomizedServicesDefaultsDto();

        foreach
        (
            ServiceSubCategoryEntity subCategory
            in subCategories
        )
        {
            CustomizedServicesSubCategoryOptionDto option =
                new CustomizedServicesSubCategoryOptionDto
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
                ServiceCategoryEntity category =
                    await ResolveCategoryAsync(
                        subCategory,
                        false);

                option.CategoryName =
                    category.CategoryName;

                option.IsActive =
                    subCategory.IsActive
                    &&
                    category.IsActive;

                option.NextServiceCode =
                    NextServiceCode(
                        subCategory,
                        serviceCodes);

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
    // Sub category's category (live); usable checks
    //===========================================================

    private async Task<ServiceCategoryEntity>
        ResolveCategoryAsync
        (
            ServiceSubCategoryEntity subCategory,
            bool requireUsable
        )
    {
        if
        (
            !string.Equals(
                subCategory.SubCategoryType,
                CustomizedServicesType,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                $"'{subCategory.SubCategoryName}' is not a {CustomizedServicesType} sub category.");
        }

        ServiceCategoryEntity category =
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
                )
            ??
            throw new InvalidOperationException(
                $"The service category of '{subCategory.SubCategoryName}' was not found.");

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

        return category;
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
    // Validate input -> (name, minutes, charge)
    //===========================================================

    private static (string Name, int Minutes, decimal Charge)
        ValidateInput
        (
            string? serviceName,
            int standardMinutes,
            decimal serviceCharge
        )
    {
        string name =
            Clean(serviceName);

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "Service Name is required.");
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

        return (name, standardMinutes, charge);
    }


    //===========================================================
    // Create
    //
    // Codes and ledger are always built here; the form's values
    // are only a preview.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateCustomizedServicesDto dto,
            long userId
        )
    {
        ServiceSubCategoryEntity subCategory =
            await LoadSubCategoryAsync(
                dto.ServiceSubCategoryId);

        await ResolveCategoryAsync(
            subCategory,
            true);

        LedgerParent parent =
            await ResolveLedgerParentAsync(
                subCategory);

        (string serviceName, int minutes, decimal charge) =
            ValidateInput(
                dto.ServiceName,
                dto.StandardMinutes,
                dto.ServiceCharge);

        string serviceCode =
            NextServiceCode(
                subCategory,
                await AllServiceCodesAsync());

        await EnsureUniqueAsync(
            serviceName,
            serviceCode,
            0);

        CustomizedServiceEntity entity =
            new CustomizedServiceEntity
            {
                ServiceCode =
                    serviceCode,

                ServiceSubCategoryId =
                    subCategory.ServiceSubCategoryId,

                ServiceName =
                    serviceName,

                StandardMinutes =
                    minutes,

                ServiceCharge =
                    charge,

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
            .Set<CustomizedServiceEntity>()
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

        return entity.CustomizedServiceId;
    }


    //===========================================================
    // Update
    //
    // Service Code and Service Sub Category are locked. The ledger
    // follows the name and the active state. Cannot be active under
    // an inactive sub category / category.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateCustomizedServicesDto dto,
            long userId
        )
    {
        CustomizedServiceEntity? entity =
            await _context
                .Set<CustomizedServiceEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.CustomizedServiceId ==
                        dto.CustomizedServiceId
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Customized Service not found.");
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

        ServiceCategoryEntity category =
            await ResolveCategoryAsync(
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

        (string serviceName, int minutes, decimal charge) =
            ValidateInput(
                dto.ServiceName,
                dto.StandardMinutes,
                dto.ServiceCharge);

        await EnsureUniqueAsync(
            serviceName,
            entity.ServiceCode,
            entity.CustomizedServiceId);

        entity.ServiceName =
            serviceName;

        entity.StandardMinutes =
            minutes;

        entity.ServiceCharge =
            charge;

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
        CustomizedServiceEntity? entity =
            await _context
                .Set<CustomizedServiceEntity>()
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

            category =
                await ResolveCategoryAsync(
                    subCategory,
                    false);

            parent =
                await ResolveLedgerParentAsync(
                    subCategory);

            await EnsureUniqueAsync(
                entity.ServiceName,
                entity.ServiceCode,
                entity.CustomizedServiceId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Customized Service '{entity.ServiceName}' cannot be restored. {ex.Message}");
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
    // Next Service Code (OCS-ccc-sss-nnnnn, central CodeGenerator)
    //===========================================================

    private static string NextServiceCode
    (
        ServiceSubCategoryEntity subCategory,
        IEnumerable<string> existingCodes
    )
    {
        (int categoryNo, int subCategoryNo) =
            SubCategoryNumbers(
                subCategory.SubCategoryCode);

        // "OCS-001-001-" : the generator's code without its running number
        string first =
            CodeGenerator.GenerateCustomizedServiceItemCode(
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

        return CodeGenerator.GenerateCustomizedServiceItemCode(
            categoryNo,
            subCategoryNo,
            highest + 1);
    }


    private async Task<List<string>>
        AllServiceCodesAsync()
    {
        return await _context
            .Set<CustomizedServiceEntity>()
            .AsNoTracking()
            .Select
            (
                x =>
                    x.ServiceCode
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

        List<string> serviceLedgerCodes =
            await _context
                .Set<CustomizedServiceEntity>()
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
                .Concat(serviceLedgerCodes)
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
    // Unique Service Name / Service Code (live rows)
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

        CustomizedServiceEntity? sameName =
            await _context
                .Set<CustomizedServiceEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.CustomizedServiceId !=
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
                $"Customized Service '{serviceName}' already exists ({sameName.ServiceCode}).");
        }

        bool codeTaken =
            await _context
                .Set<CustomizedServiceEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.CustomizedServiceId !=
                        excludeId
                        &&
                        x.ServiceCode ==
                        laborCode
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Service Code '{laborCode}' is already in use.");
        }
    }



    //===========================================================
    // Sync Income Ledger (create when missing, follow the row)
    //===========================================================

    private async Task
        SyncLedgerAsync
        (
            CustomizedServiceEntity entity,
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
                            $"System generated from Customized Services {entity.ServiceCode}.",

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
    // Activity History
    //===========================================================

    private void AddHistory
    (
        CustomizedServiceEntity entity,
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
                    "Customized Services",

                EntityId =
                    entity.CustomizedServiceId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Customized Service {verb}",

                ActivityDescription =
                    $"Customized Service '{entity.ServiceName}' ({entity.ServiceCode}) {verb.ToLower()}.",

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
        CustomizedServiceEntity? entity =
            await _context
                .Set<CustomizedServiceEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.CustomizedServiceId ==
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
                "Customized Service not found.");
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
    // Exists
    //===========================================================

    public async Task<bool>
        ExistsAsync
        (
            long id
        )
    {
        return await _context
            .Set<CustomizedServiceEntity>()
            .AnyAsync
            (
                x =>
                    x.CustomizedServiceId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}