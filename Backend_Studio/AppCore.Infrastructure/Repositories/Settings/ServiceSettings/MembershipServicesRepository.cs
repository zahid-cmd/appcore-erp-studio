//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ServiceSettings;

using MembershipServiceEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.MembershipServices;

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
// Membership Services Repository
//
// COMPLIMENTARY (free) services given to card members, under a
// "Membership Services" sub category of a Differential Services
// category (e.g. DRS-002-001). Each row is one service for one
// Membership Type (Silver / Gold / Platinum / Titanium Card).
//
// Invoiced, then discounted (two ledgers per row) :
//   Income Ledger  under the sub category's income sub group
//                  (e.g. SUB-005-005-001) : billed at the Service Value
//                  (Dr Customer / Cr Income Ledger)
//   Expense Ledger under SUB-004-002-001 : the same amount
//                  discounted (Dr Expense Ledger / Cr Customer)
//
// Codes (central CodeGenerator, never reused) :
//   Service Code   MSC-ccc-sss-nnnnn   e.g. sub category DRS-002-001
//                                      -> MSC-002-001-00001
//   Expense Ledger GLR-004-002-001-nnnnn under the account sub group
//                  SUB-004-002-001 (Selling & Marketing Expenses -
//                  Non Cash), found by CODE only
//   Highest number used (deleted rows included) + 1.
//
// Service Name = the sub category's name (read only; follows
// renames). Display Name : "<Service Name> - <Membership Type>"
// (e.g. "Free Wash - Gold Card"), unique among live rows; the
// expense ledger has the same name and follows the row's active /
// deleted state.
//
// Locked : Service Code, Service Sub Category.
//===============================================================

public class MembershipServicesRepository :
    IMembershipServicesRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string MembershipServicesType =
        "Membership Services";

    private const string LedgerPrefix =
        "GLR";

    private const int MaxNameLength =
        200;

    // Free services are an expense : their ledgers go under this
    // account sub group, found by CODE only (never by name)
    private const string ExpenseSubGroupCode =
        "SUB-004-002-001";

    // Membership Types (fixed for now; later from the Membership module)
    public static readonly string[] MembershipTypes =
    {
        "Silver Card",
        "Gold Card",
        "Platinum Card",
        "Titanium Card"
    };

    private const decimal MaxAmount =
        99999999.99m;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public MembershipServicesRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Query
    //===========================================================

    private IQueryable<MembershipServicesDto>
        MembershipServiceQuery()
    {
        return _context
            .Set<MembershipServiceEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new MembershipServicesDto
                    {
                        MembershipServiceId =
                            x.MembershipServiceId,

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

                        MembershipType =
                            x.MembershipType,

                        DisplayName =
                            x.DisplayName,

                        ServiceValue =
                            x.ServiceValue,

                        IncomeLedgerCode =
                            x.IncomeLedgerCode,

                        IncomeLedgerName =
                            x.IncomeLedgerName,

                        ExpenseLedgerCode =
                            x.ExpenseLedgerCode,

                        ExpenseLedgerName =
                            x.ExpenseLedgerName,

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

    public async Task<List<MembershipServicesDto>>
        GetAllAsync()
    {
        await SyncSubCategoryNamesAsync();

        return await MembershipServiceQuery()
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

    public async Task<MembershipServicesDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await MembershipServiceQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.MembershipServiceId ==
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
    // Every live Membership Services sub category with the codes
    // the next service under it gets (or why it cannot take one).
    //===========================================================

    public async Task<MembershipServicesDefaultsDto>
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
                        MembershipServicesType
                )
                .OrderBy
                (
                    x =>
                        x.SubCategoryCode
                )
                .ToListAsync();

        List<string> serviceCodes =
            await AllServiceCodesAsync();

        MembershipServicesDefaultsDto result =
            new MembershipServicesDefaultsDto
            {
                MembershipTypes =
                    MembershipTypes.ToList()
            };

        // Expense sub group (display; found by code)
        try
        {
            LedgerParent expenseParent =
                await ResolveLedgerParentAsync(
                    null);

            result.ExpenseSubGroupCode =
                expenseParent.SubGroup.SubGroupCode;

            result.ExpenseSubGroupName =
                expenseParent.SubGroup.SubGroupName;
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            result.ExpenseSubGroupCode =
                ExpenseSubGroupCode;

            result.ExpenseSubGroupMessage =
                ex.Message;
        }

        foreach
        (
            ServiceSubCategoryEntity subCategory
            in subCategories
        )
        {
            MembershipServicesSubCategoryOptionDto option =
                new MembershipServicesSubCategoryOptionDto
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
                        await ResolveIncomeParentAsync(
                            subCategory));

                option.NextExpenseLedgerCode =
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
                MembershipServicesType,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                $"'{subCategory.SubCategoryName}' is not a {MembershipServicesType} sub category.");
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
    // Validate input -> (name, membership type, value)
    //===========================================================

    private static (string Name, string MembershipType, decimal Value)
        ValidateInput
        (
            string? serviceName,
            string? membershipType,
            decimal serviceValue
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
                "Service Name is required (it is the sub category name).");
        }

        if
        (
            name.Length > 150
        )
        {
            throw new InvalidOperationException(
                "Service Name (the sub category name) cannot be longer than 150 characters.");
        }

        string type =
            MembershipTypes.FirstOrDefault
            (
                x =>
                    string.Equals(
                        x,
                        membershipType?.Trim(),
                        StringComparison.OrdinalIgnoreCase)
            )
            ??
            throw new InvalidOperationException(
                "Membership Type is required (Silver, Gold, Platinum or Titanium Card).");

        decimal value =
            Math.Round(
                serviceValue,
                2);

        if
        (
            value <= 0
            ||
            value > MaxAmount
        )
        {
            throw new InvalidOperationException(
                $"Service Value must be more than 0 and not more than {MaxAmount:N2}.");
        }

        return (name, type, value);
    }


    // "Free Wash" + "Gold Card" -> "Free Wash - Gold Card"
    private static string BuildDisplayName
    (
        string serviceName,
        string membershipType
    )
    {
        return $"{serviceName} - {membershipType}";
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
            CreateMembershipServicesDto dto,
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

        LedgerParent incomeParent =
            await ResolveIncomeParentAsync(
                subCategory);

        (string serviceName, string membershipType, decimal value) =
            ValidateInput(
                subCategory.SubCategoryName,
                dto.MembershipType,
                dto.ServiceValue);

        string displayName =
            BuildDisplayName(
                serviceName,
                membershipType);

        string serviceCode =
            NextServiceCode(
                subCategory,
                await AllServiceCodesAsync());

        await EnsureUniqueAsync(
            displayName,
            serviceCode,
            0);

        MembershipServiceEntity entity =
            new MembershipServiceEntity
            {
                ServiceCode =
                    serviceCode,

                ServiceSubCategoryId =
                    subCategory.ServiceSubCategoryId,

                MembershipType =
                    membershipType,

                ServiceName =
                    serviceName,

                DisplayName =
                    displayName,

                ServiceValue =
                    value,

                IncomeLedgerCode =
                    await NextLedgerCodeAsync(
                        incomeParent),

                IncomeLedgerName =
                    displayName,

                ExpenseLedgerCode =
                    await NextLedgerCodeAsync(
                        parent),

                ExpenseLedgerName =
                    displayName,

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
            .Set<MembershipServiceEntity>()
            .Add(
                entity);

        await SyncLedgerAsync(
            entity,
            parent,
            incomeParent,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.MembershipServiceId;
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
            UpdateMembershipServicesDto dto,
            long userId
        )
    {
        MembershipServiceEntity? entity =
            await _context
                .Set<MembershipServiceEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipServiceId ==
                        dto.MembershipServiceId
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Membership Service not found.");
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

        LedgerParent incomeParent =
            await ResolveIncomeParentAsync(
                subCategory);

        (string serviceName, string membershipType, decimal value) =
            ValidateInput(
                subCategory.SubCategoryName,
                dto.MembershipType,
                dto.ServiceValue);

        string displayName =
            BuildDisplayName(
                serviceName,
                membershipType);

        await EnsureUniqueAsync(
            displayName,
            entity.ServiceCode,
            entity.MembershipServiceId);

        entity.MembershipType =
            membershipType;

        entity.ServiceName =
            serviceName;

        entity.DisplayName =
            displayName;

        entity.ServiceValue =
            value;

        entity.IncomeLedgerName =
            displayName;

        entity.ExpenseLedgerName =
            displayName;

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
                entity.ExpenseLedgerCode)
        )
        {
            entity.ExpenseLedgerCode =
                await NextLedgerCodeAsync(
                    parent);
        }

        // A row saved before income ledgers existed gets one now
        if
        (
            string.IsNullOrWhiteSpace(
                entity.IncomeLedgerCode)
        )
        {
            entity.IncomeLedgerCode =
                await NextLedgerCodeAsync(
                    incomeParent);
        }


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await SyncLedgerAsync(
            entity,
            parent,
            incomeParent,
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
        MembershipServiceEntity? entity =
            await _context
                .Set<MembershipServiceEntity>()
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

        LedgerParent incomeParent;

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

            incomeParent =
                await ResolveIncomeParentAsync(
                    subCategory);

            // Names follow the current sub category name
            entity.ServiceName =
                Clean(
                    subCategory.SubCategoryName);

            entity.DisplayName =
                BuildDisplayName(
                    entity.ServiceName,
                    entity.MembershipType);

            entity.ExpenseLedgerName =
                entity.DisplayName;

            entity.IncomeLedgerName =
                entity.DisplayName;

            await EnsureUniqueAsync(
                entity.DisplayName,
                entity.ServiceCode,
                entity.MembershipServiceId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Membership Service '{entity.ServiceName}' cannot be restored. {ex.Message}");
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
                        (
                            x.LedgerCode ==
                            entity.ExpenseLedgerCode
                            ||
                            x.LedgerCode ==
                            entity.IncomeLedgerCode
                        )
                        &&
                        x.IsDeleted
                )
                .OrderByDescending
                (
                    x =>
                        x.DeletedDate
                )
                .Take(2)
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
            incomeParent,
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
    // Next Service Code (MSC-ccc-sss-nnnnn, central CodeGenerator)
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

        // "MSC-001-001-" : the generator's code without its running number
        string first =
            CodeGenerator.GenerateMembershipServiceItemCode(
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

        return CodeGenerator.GenerateMembershipServiceItemCode(
            categoryNo,
            subCategoryNo,
            highest + 1);
    }


    private async Task<List<string>>
        AllServiceCodesAsync()
    {
        return await _context
            .Set<MembershipServiceEntity>()
            .AsNoTracking()
            .Select
            (
                x =>
                    x.ServiceCode
            )
            .ToListAsync();
    }



    //===========================================================
    // Ledger parent : the EXPENSE sub group SUB-004-002-001
    // (Selling & Marketing Expenses - Non Cash), by code only
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
            ServiceSubCategoryEntity? subCategory
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
                        ExpenseSubGroupCode
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
                $"Expense account sub group {ExpenseSubGroupCode} (Selling & Marketing Expenses - Non Cash) " +
                "was not found or is deleted. Membership service ledgers are created under it.");
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
    // Income ledger parent : the sub category's account sub group
    // (e.g. SUB-005-005-001 under the Membership Services group)
    //===========================================================

    private async Task<LedgerParent>
        ResolveIncomeParentAsync
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
                $"The income account sub group {subCategory.IncomeSubGroupCode} of sub category " +
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
    // Next Expense Ledger Code (GLR-ccc-ggg-sss-nnnnn in the sub
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
                .Set<MembershipServiceEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ExpenseLedgerCode != ""
                )
                .Select
                (
                    x =>
                        x.ExpenseLedgerCode
                )
                .ToListAsync();

        // Income ledger codes (a separate query : EF cannot translate
        // an array projection)
        serviceLedgerCodes.AddRange(
            await _context
                .Set<MembershipServiceEntity>()
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
                .ToListAsync());

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
            string serviceCode,
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

        MembershipServiceEntity? sameName =
            await _context
                .Set<MembershipServiceEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.MembershipServiceId !=
                        excludeId
                        &&
                        x.DisplayName.ToLower() ==
                        lowerName
                );

        if
        (
            sameName != null
        )
        {
            throw new InvalidOperationException(
                $"'{serviceName}' already exists ({sameName.ServiceCode}). " +
                "A sub category can have one service per Membership Type.");
        }

        bool codeTaken =
            await _context
                .Set<MembershipServiceEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.MembershipServiceId !=
                        excludeId
                        &&
                        x.ServiceCode ==
                        serviceCode
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Service Code '{serviceCode}' is already in use.");
        }
    }



    //===========================================================
    // Sync Ledgers (create when missing, follow the row)
    //
    //   Income ledger  : billed on the invoice at the Service Value
    //   Expense ledger : the same amount discounted (free service)
    //===========================================================

    private async Task
        SyncLedgerAsync
        (
            MembershipServiceEntity entity,
            LedgerParent expenseParent,
            LedgerParent incomeParent,
            long userId
        )
    {
        await SyncOneLedgerAsync(
            entity,
            entity.IncomeLedgerCode,
            entity.IncomeLedgerName,
            $"System generated from Membership Services {entity.ServiceCode} (billed service value).",
            incomeParent,
            userId);

        await SyncOneLedgerAsync(
            entity,
            entity.ExpenseLedgerCode,
            entity.ExpenseLedgerName,
            $"System generated from Membership Services {entity.ServiceCode} (complimentary discount).",
            expenseParent,
            userId);
    }


    private async Task
        SyncOneLedgerAsync
        (
            MembershipServiceEntity entity,
            string ledgerCode,
            string ledgerName,
            string remarks,
            LedgerParent parent,
            long userId
        )
    {
        // A row saved before this ledger existed : nothing to sync yet
        if
        (
            string.IsNullOrWhiteSpace(ledgerCode)
        )
        {
            return;
        }

        GeneralLedgerEntity? ledger =
            await _context
                .Set<GeneralLedgerEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.LedgerCode ==
                        ledgerCode
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
                            ledgerCode,

                        LedgerName =
                            ledgerName,

                        Remarks =
                            remarks,

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
                $"General Ledger '{ledgerCode}' belongs to a different sub group.");
        }

        if
        (
            ledger.LedgerName == ledgerName
            &&
            ledger.IsActive == entity.IsActive
        )
        {
            return;
        }

        ledger.LedgerName =
            ledgerName;

        ledger.IsActive =
            entity.IsActive;

        ledger.ModifiedBy =
            userId;

        ledger.ModifiedDate =
            DateTime.UtcNow;
    }



    //===========================================================
    // Sync Sub Category Names (on read)
    //
    // Service Name = the sub category's name. When the sub
    // category is renamed, the row, its Display Name and its
    // expense ledger follow. Matched by id / code only. A name that
    // would clash with another row is left as it is.
    //===========================================================

    private async Task
        SyncSubCategoryNamesAsync()
    {
        var rows =
            await
            (
                from m in _context.Set<MembershipServiceEntity>()
                join s in _context.Set<ServiceSubCategoryEntity>()
                    on m.ServiceSubCategoryId equals s.ServiceSubCategoryId
                where !m.IsDeleted
                select new
                {
                    Entity = m,
                    s.SubCategoryName
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
                        x.Entity.DisplayName.ToLower()
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
            string serviceName =
                Clean(
                    row.SubCategoryName);

            if
            (
                string.IsNullOrWhiteSpace(serviceName)
                ||
                serviceName.Length > 150
                ||
                row.Entity.ServiceName == serviceName
            )
            {
                continue;
            }

            string displayName =
                BuildDisplayName(
                    serviceName,
                    row.Entity.MembershipType);

            if
            (
                !string.Equals(
                    row.Entity.DisplayName,
                    displayName,
                    StringComparison.OrdinalIgnoreCase)
                &&
                takenNames.Contains(
                    displayName.ToLower())
            )
            {
                continue;
            }

            takenNames.Remove(
                row.Entity.DisplayName.ToLower());

            takenNames.Add(
                displayName.ToLower());

            row.Entity.ServiceName =
                serviceName;

            row.Entity.DisplayName =
                displayName;

            row.Entity.ExpenseLedgerName =
                displayName;

            row.Entity.IncomeLedgerName =
                displayName;

            GeneralLedgerEntity? ledger =
                await _context
                    .Set<GeneralLedgerEntity>()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            x.LedgerCode ==
                            row.Entity.ExpenseLedgerCode
                            &&
                            !x.IsDeleted
                    );

            if
            (
                ledger != null
            )
            {
                ledger.LedgerName =
                    displayName;

                ledger.ModifiedDate =
                    DateTime.UtcNow;
            }

            GeneralLedgerEntity? incomeLedger =
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
                incomeLedger != null
            )
            {
                incomeLedger.LedgerName =
                    displayName;

                incomeLedger.ModifiedDate =
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
        MembershipServiceEntity entity,
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
                    "Membership Services",

                EntityId =
                    entity.MembershipServiceId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Membership Service {verb}",

                ActivityDescription =
                    $"Membership Service '{entity.ServiceName}' ({entity.ServiceCode}) {verb.ToLower()}.",

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
    // Delete (row + its expense ledger)
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
        MembershipServiceEntity? entity =
            await _context
                .Set<MembershipServiceEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipServiceId ==
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
                "Membership Service not found.");
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
                        (
                            x.LedgerCode ==
                            entity.ExpenseLedgerCode
                            ||
                            x.LedgerCode ==
                            entity.IncomeLedgerCode
                        )
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
            .Set<MembershipServiceEntity>()
            .AnyAsync
            (
                x =>
                    x.MembershipServiceId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}