//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Settings.ProductSettings;
using AppCore.Application.Settings.ProductSettings.BrandManagement.DTOs;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using SupplierEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using GeneralLedgerEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using VoucherEntryEntity =
    AppCore.Domain.Platform.Accounting.VoucherEntries;

using AppCore.Infrastructure.CodeMaster;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.ProductSettings;


//===============================================================
// Brand Management Repository
//
// Code      : BRAND-nnn, always generated here (the form's code
//             is only a preview). Deleted rows are counted, so a
//             number is never reused.
// Name      : required, unique among non-deleted brands.
// Remarks   : optional.
// Image     : path only; the file is saved / removed by the
//             controller ({id}/image).
//
// Motor Bikes Supplier (optional, 2026-10-26) : stored by
//             SupplierCode; must be a live supplier with Supply
//             Type Motor Bikes (active, unless already saved).
//             EMI reimbursement claims of the brand go to it.
//
// Brand Ledgers (2026-10-26) : one General Ledger per brand under
//             each sub group below (found by CODE only), named
//             "<Sub Group Name> - <Brand Name>" :
//               SUB-002-002-008  Offer Adjustment Account
//               SUB-002-002-009  EMI Claim Receivable
//             Create / Update create a missing one and leave an
//             existing one as it is (only its name and active
//             state follow the brand). Delete / Restore carry the
//             ledgers; Delete is blocked once a ledger has postings.
//             (SUB-002-002-007 Receivables Against Service Bill
//             stays with Service Policy.)
//===============================================================

public class BrandManagementRepository : IBrandManagementRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string CodePrefix =
        "BRAND";

    // Brand ledger sub groups (by CODE only, never by name)
    public const string OfferAdjustmentSubGroupCode =
        "SUB-002-002-008";

    public const string EmiClaimSubGroupCode =
        "SUB-002-002-009";

    // Supplier Profiles Supply Type of a brand's supplier
    private const string MotorBikesSupplyType =
        "Motor Bikes";

    private const string LedgerPrefix =
        "GLR";

    private const int MaxLedgerNameLength =
        200;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public BrandManagementRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Query
    //===========================================================

    private IQueryable<BrandManagementDto> BrandManagementQuery()
    {
        return _context
            .Set<BrandManagementEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new BrandManagementDto
                    {
                        BrandManagementId =
                            x.BrandManagementId,

                        BrandCode =
                            x.BrandCode,

                        BrandName =
                            x.BrandName,

                        BrandImagePath =
                            x.BrandImagePath,

                        Remarks =
                            x.Remarks,

                        Status =
                            x.Status,

                        MotorBikesSupplierCode =
                            x.MotorBikesSupplierCode,

                        MotorBikesSupplierName =
                            x.MotorBikesSupplierCode == ""
                                ? ""
                                : _context
                                    .Set<SupplierEntity>()
                                    .Where
                                    (
                                        s =>
                                            s.SupplierCode == x.MotorBikesSupplierCode
                                            &&
                                            !s.IsDeleted
                                    )
                                    .Select(s => s.DisplayName)
                                    .FirstOrDefault()
                                  ??
                                  x.MotorBikesSupplierCode,

                        OfferAdjustmentLedgerCode =
                            x.OfferAdjustmentLedgerCode,

                        OfferAdjustmentLedgerName =
                            x.OfferAdjustmentLedgerName,

                        EmiClaimLedgerCode =
                            x.EmiClaimLedgerCode,

                        EmiClaimLedgerName =
                            x.EmiClaimLedgerName,

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

    public async Task<List<BrandManagementDto>>
        GetAllAsync()
    {
        // Sub group renames reach the brand ledger names
        await SyncLedgerNamesAsync();

        return await BrandManagementQuery()
            .OrderBy
            (
                x =>
                    x.BrandCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<BrandManagementDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await BrandManagementQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.BrandManagementId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code (deleted rows included → never reused)
    //===========================================================

    public async Task<string>
        GetNextCodeAsync()
    {
        List<string> codes =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Select
                (
                    x =>
                        x.BrandCode
                )
                .ToListAsync();

        int highest =
            0;

        foreach
        (
            string code
            in codes
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
                parts.Length == 2
                &&
                string.Equals(
                    parts[0].Trim(),
                    CodePrefix,
                    StringComparison.OrdinalIgnoreCase)
                &&
                int.TryParse(
                    parts[1].Trim(),
                    out int number)
                &&
                number > highest
            )
            {
                highest =
                    number;
            }
        }

        return $"{CodePrefix}-{highest + 1:D3}";
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<BrandManagementDefaultsDto>
        GetDefaultsAsync()
    {
        BrandManagementDefaultsDto dto =
            new BrandManagementDefaultsDto
            {
                Code =
                    await GetNextCodeAsync(),

                OfferAdjustmentSubGroupCode =
                    OfferAdjustmentSubGroupCode,

                EmiClaimSubGroupCode =
                    EmiClaimSubGroupCode,

                // Motor Bikes suppliers (inactive ones are offered
                // only to a brand that already uses them : the form
                // filters by IsActive)
                MotorBikesSuppliers =
                    await _context
                        .Set<SupplierEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                x.SupplyType == MotorBikesSupplyType
                        )
                        .OrderBy(x => x.DisplayName)
                        .Select
                        (
                            x =>
                                new BrandSupplierOptionDto
                                {
                                    SupplierCode = x.SupplierCode,
                                    DisplayName = x.DisplayName,
                                    IsActive = x.IsActive
                                }
                        )
                        .ToListAsync()
            };

        List<string> problems =
            new();

        try
        {
            LedgerParent offer =
                await ResolveLedgerParentAsync(
                    OfferAdjustmentSubGroupCode,
                    "Offer Adjustment Account",
                    false);

            dto.OfferAdjustmentSubGroupName =
                Clean(offer.SubGroup.SubGroupName);

            dto.NextOfferAdjustmentLedgerCode =
                await NextLedgerCodeAsync(
                    offer,
                    null);
        }
        catch (InvalidOperationException ex)
        {
            problems.Add(ex.Message);
        }

        try
        {
            LedgerParent claim =
                await ResolveLedgerParentAsync(
                    EmiClaimSubGroupCode,
                    "EMI Claim Receivable",
                    false);

            dto.EmiClaimSubGroupName =
                Clean(claim.SubGroup.SubGroupName);

            dto.NextEmiClaimLedgerCode =
                await NextLedgerCodeAsync(
                    claim,
                    null);
        }
        catch (InvalidOperationException ex)
        {
            problems.Add(ex.Message);
        }

        dto.LedgerMessage =
            string.Join(" ", problems);

        return dto;
    }


    //===========================================================
    // Normalize Name
    //===========================================================

    private static string NormalizeName
    (
        string? brandName
    )
    {
        string name =
            brandName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "Brand Name is required.");
        }

        if
        (
            name.Length >
            200
        )
        {
            throw new InvalidOperationException(
                "Brand Name cannot be longer than 200 characters.");
        }

        return name;
    }


    //===========================================================
    // Duplicate Check (non-deleted rows only)
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string code,
            string name,
            long excludeId
        )
    {
        string codeKey =
            code.Trim().ToLower();

        string nameKey =
            name.Trim().ToLower();

        BrandManagementEntity? sameCode =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.BrandManagementId != excludeId
                        &&
                        x.BrandCode.ToLower() == codeKey
                );

        if
        (
            sameCode !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Brand Code '{code}' is already used by '{sameCode.BrandName}'.");
        }

        BrandManagementEntity? sameName =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.BrandManagementId != excludeId
                        &&
                        x.BrandName.ToLower() == nameKey
                );

        if
        (
            sameName !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Brand '{name}' already exists ({sameName.BrandCode}).");
        }
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        BrandManagementEntity entity,
        string activityType,
        string verb,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Product Settings",

                EntityName =
                    "BrandManagement",

                EntityId =
                    entity.BrandManagementId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Brand {verb}",

                ActivityDescription =
                    $"Brand '{entity.BrandName}' ({entity.BrandCode}) {verb.ToLower()}.",

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
    // Create (code always generated here)
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateBrandManagementDto dto,
            long userId
        )
    {
        string brandName =
            NormalizeName(
                dto.BrandName);

        string supplierCode =
            await CheckMotorBikesSupplierAsync(
                dto.MotorBikesSupplierCode,
                null);

        string brandCode =
            await GetNextCodeAsync();

        await EnsureUniqueAsync(
            brandCode,
            brandName,
            0);

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        BrandManagementEntity entity =
            new BrandManagementEntity
            {
                BrandCode =
                    brandCode,

                BrandName =
                    brandName,

                BrandImagePath =
                    string.Empty,

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty,

                Status =
                    dto.Status,

                MotorBikesSupplierCode =
                    supplierCode,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };

        _context
            .Set<BrandManagementEntity>()
            .Add(
                entity);

        await _context.SaveChangesAsync();

        // Brand ledgers (Offer Adjustment, EMI Claim Receivable)
        await EnsureBrandLedgersAsync(
            entity,
            userId);

        AddHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.BrandManagementId;
    }


    //===========================================================
    // Update (code locked)
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateBrandManagementDto dto,
            long userId
        )
    {
        BrandManagementEntity? entity =
            await _context
                .Set<BrandManagementEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BrandManagementId ==
                        dto.BrandManagementId
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
                "Brand not found.");
        }

        string brandName =
            NormalizeName(
                dto.BrandName);

        string supplierCode =
            await CheckMotorBikesSupplierAsync(
                dto.MotorBikesSupplierCode,
                entity.MotorBikesSupplierCode);

        await EnsureUniqueAsync(
            entity.BrandCode,
            brandName,
            entity.BrandManagementId);

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        entity.BrandName =
            brandName;

        entity.MotorBikesSupplierCode =
            supplierCode;

        entity.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;

        entity.Status =
            dto.Status;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        // Creates a missing brand ledger; an existing one only
        // follows the brand's name and status
        await EnsureBrandLedgersAsync(
            entity,
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
    // Set Image Path
    //
    // Stores the new path ('' clears it) and returns the old one.
    //===========================================================

    public async Task<string>
        SetImagePathAsync
        (
            long id,
            string imagePath,
            long userId
        )
    {
        BrandManagementEntity? entity =
            await _context
                .Set<BrandManagementEntity>()
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
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Brand not found.");
        }

        string oldPath =
            entity.BrandImagePath
            ??
            string.Empty;

        entity.BrandImagePath =
            imagePath
            ??
            string.Empty;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return oldPath;
    }


    //===========================================================
    // Delete
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        BrandManagementEntity? entity =
            await _context
                .Set<BrandManagementEntity>()
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
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Brand not found.");
        }

        //=======================================================
        // Dependency : Product Categories (409)
        //=======================================================

        List<string> categoryNames =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.BrandManagementId ==
                        id
                        &&
                        !x.IsDeleted
                )
                .OrderBy
                (
                    x =>
                        x.CategoryCode
                )
                .Select
                (
                    x =>
                        x.CategoryName
                )
                .ToListAsync();

        if
        (
            categoryNames.Count >
            0
        )
        {
            throw new InvalidOperationException(
                $"Brand '{entity.BrandName}' cannot be deleted because it is used by " +
                $"{categoryNames.Count} product categor{(categoryNames.Count == 1 ? "y" : "ies")} " +
                $"({string.Join(", ", categoryNames)}).");
        }

        // TODO (Motor Bikes rebuild): also block while products use this brand.

        //=======================================================
        // Dependency : postings on the brand ledgers (409)
        //=======================================================

        List<string> ledgerCodes =
            BrandLedgerCodes(entity);

        if
        (
            ledgerCodes.Count > 0
            &&
            await _context
                .Set<VoucherEntryEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        ledgerCodes.Contains(x.LedgerCode)
                )
        )
        {
            throw new InvalidOperationException(
                $"Brand '{entity.BrandName}' cannot be deleted because its ledgers " +
                $"({string.Join(", ", ledgerCodes)}) have postings.");
        }

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        await SetLedgersDeletedAsync(
            ledgerCodes,
            true,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Delete",
            "Deleted",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Restore (latest deleted; blocked while code / name taken)
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        BrandManagementEntity? entity =
            await _context
                .Set<BrandManagementEntity>()
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
                entity.BrandCode,
                entity.BrandName,
                entity.BrandManagementId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Brand '{entity.BrandName}' cannot be restored. {ex.Message}");
        }

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

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

        // A supplier deleted (or moved off Motor Bikes) meanwhile is
        // dropped from the restored brand
        if
        (
            entity.MotorBikesSupplierCode.Length > 0
            &&
            !await _context
                .Set<SupplierEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        x.SupplierCode == entity.MotorBikesSupplierCode
                        &&
                        !x.IsDeleted
                        &&
                        x.SupplyType == MotorBikesSupplyType
                )
        )
        {
            entity.MotorBikesSupplierCode =
                string.Empty;
        }

        // Its ledgers come back, then follow the brand (a missing
        // one is created)
        await SetLedgersDeletedAsync(
            BrandLedgerCodes(entity),
            false,
            userId);

        await _context.SaveChangesAsync();

        try
        {
            await EnsureBrandLedgersAsync(
                entity,
                userId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Brand '{entity.BrandName}' cannot be restored. {ex.Message}");
        }

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
    // BRAND LEDGERS
    //===========================================================

    // Sub group + its group + its class
    private sealed class LedgerParent
    {
        public AccountClassEntity Class { get; set; } = null!;

        public AccountGroupEntity Group { get; set; } = null!;

        public AccountSubGroupEntity SubGroup { get; set; } = null!;
    }


    // Trim, single spaces
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


    // "Offer Adjustment Account" + "Revoo" ->
    // "Offer Adjustment Account - Revoo"
    private static string LedgerName
    (
        string? subGroupName,
        string brandName
    )
    {
        string name =
            $"{Clean(subGroupName)} - {Clean(brandName)}";

        if
        (
            name.Length >
            MaxLedgerNameLength
        )
        {
            throw new InvalidOperationException(
                $"Ledger name '{name}' is longer than {MaxLedgerNameLength} characters. Use a shorter brand name.");
        }

        return name;
    }


    // The brand's ledger codes ('' left out)
    private static List<string> BrandLedgerCodes
    (
        BrandManagementEntity entity
    )
    {
        return new[]
            {
                entity.OfferAdjustmentLedgerCode,
                entity.EmiClaimLedgerCode
            }
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct()
            .ToList();
    }


    //===========================================================
    // Ledger Parent (sub group found by CODE only)
    //===========================================================

    private async Task<LedgerParent>
        ResolveLedgerParentAsync
        (
            string subGroupCode,
            string purpose,
            bool requireActive
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
                        subGroupCode
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
                $"Account sub group {subGroupCode} ({purpose}) was not found or is deleted. " +
                "Brand ledgers are created under it : create it on the Account Sub Groups page.");
        }

        if
        (
            requireActive
            &&
            (
                !subGroup.IsActive
                ||
                !group.IsActive
                ||
                !accountClass.IsActive
            )
        )
        {
            throw new InvalidOperationException(
                $"Account sub group {subGroupCode} - {subGroup.SubGroupName} (or its group / class) is inactive. Activate it first.");
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


    // "SUB-002-002-008" -> 8
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
    // Next Ledger Code in a sub group : GLR-ccc-ggg-sss-nnnnn
    // (central CodeGenerator). Highest of the sub group's General
    // Ledgers (deleted included) and the codes stored on brands
    // (deleted included), + 1.
    //===========================================================

    private async Task<string>
        NextLedgerCodeAsync
        (
            LedgerParent parent,
            IEnumerable<string>? reserved
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

        List<string> codes =
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

        // One query per column (EF cannot translate an array projection)
        codes.AddRange(
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Select(x => x.OfferAdjustmentLedgerCode)
                .ToListAsync());

        codes.AddRange(
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Select(x => x.EmiClaimLedgerCode)
                .ToListAsync());

        if
        (
            reserved != null
        )
        {
            codes.AddRange(
                reserved);
        }

        int highest =
            codes
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
    // Ensure Brand Ledgers
    //
    // For each brand ledger sub group :
    //   • the brand's ledger exists  → left as it is; only its
    //     name ("<Sub Group> - <Brand>") and active state follow
    //     the brand
    //   • missing                    → created (a live ledger of
    //     that sub group already carrying the expected name is
    //     adopted instead, so nothing is duplicated)
    // The codes / names are stored on the brand. The caller saves.
    //===========================================================

    private async Task
        EnsureBrandLedgersAsync
        (
            BrandManagementEntity entity,
            long userId
        )
    {
        (string offerCode, string offerName) =
            await EnsureOneLedgerAsync(
                OfferAdjustmentSubGroupCode,
                "Offer Adjustment Account",
                entity.OfferAdjustmentLedgerCode,
                entity,
                userId);

        entity.OfferAdjustmentLedgerCode =
            offerCode;

        entity.OfferAdjustmentLedgerName =
            offerName;

        (string claimCode, string claimName) =
            await EnsureOneLedgerAsync(
                EmiClaimSubGroupCode,
                "EMI Claim Receivable",
                entity.EmiClaimLedgerCode,
                entity,
                userId);

        entity.EmiClaimLedgerCode =
            claimCode;

        entity.EmiClaimLedgerName =
            claimName;
    }


    private async Task<(string Code, string Name)>
        EnsureOneLedgerAsync
        (
            string subGroupCode,
            string purpose,
            string currentCode,
            BrandManagementEntity entity,
            long userId
        )
    {
        string code =
            (currentCode ?? string.Empty).Trim();

        GeneralLedgerEntity? ledger =
            code.Length == 0
                ? null
                : await _context
                    .Set<GeneralLedgerEntity>()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            x.LedgerCode ==
                            code
                            &&
                            !x.IsDeleted
                    );

        // Existing : only the name and active state follow
        if
        (
            ledger != null
        )
        {
            LedgerParent parent =
                await ResolveLedgerParentAsync(
                    subGroupCode,
                    purpose,
                    false);

            if
            (
                ledger.AccountSubGroupId !=
                parent.SubGroup.AccountSubGroupId
            )
            {
                throw new InvalidOperationException(
                    $"General Ledger '{code}' of brand '{entity.BrandName}' belongs to a different sub group than {subGroupCode}.");
            }

            string name =
                LedgerName(
                    parent.SubGroup.SubGroupName,
                    entity.BrandName);

            if
            (
                ledger.LedgerName != name
                &&
                await _context
                    .Set<GeneralLedgerEntity>()
                    .AnyAsync
                    (
                        x =>
                            x.AccountSubGroupId ==
                            parent.SubGroup.AccountSubGroupId
                            &&
                            x.LedgerName ==
                            name
                            &&
                            !x.IsDeleted
                            &&
                            x.GeneralLedgerId !=
                            ledger.GeneralLedgerId
                    )
            )
            {
                throw new InvalidOperationException(
                    $"Another ledger named '{name}' already exists in sub group {subGroupCode}. Rename or delete it first.");
            }

            if
            (
                ledger.LedgerName != name
                ||
                ledger.IsActive != entity.Status
            )
            {
                ledger.LedgerName =
                    name;

                ledger.IsActive =
                    entity.Status;

                ledger.ModifiedBy =
                    userId;

                ledger.ModifiedDate =
                    DateTime.UtcNow;
            }

            return (ledger.LedgerCode, name);
        }

        // Missing : create (sub group must be active)
        LedgerParent newParent =
            await ResolveLedgerParentAsync(
                subGroupCode,
                purpose,
                true);

        string newName =
            LedgerName(
                newParent.SubGroup.SubGroupName,
                entity.BrandName);

        GeneralLedgerEntity? sameName =
            await _context
                .Set<GeneralLedgerEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountSubGroupId ==
                        newParent.SubGroup.AccountSubGroupId
                        &&
                        x.LedgerName ==
                        newName
                        &&
                        !x.IsDeleted
                );

        if
        (
            sameName != null
        )
        {
            // Another live brand must not own it already
            bool owned =
                await _context
                    .Set<BrandManagementEntity>()
                    .AsNoTracking()
                    .AnyAsync
                    (
                        x =>
                            x.BrandManagementId != entity.BrandManagementId
                            &&
                            !x.IsDeleted
                            &&
                            (
                                x.OfferAdjustmentLedgerCode == sameName.LedgerCode
                                ||
                                x.EmiClaimLedgerCode == sameName.LedgerCode
                            )
                    );

            if
            (
                owned
            )
            {
                throw new InvalidOperationException(
                    $"Ledger '{newName}' ({sameName.LedgerCode}) already belongs to another brand.");
            }

            sameName.IsActive =
                entity.Status;

            sameName.ModifiedBy =
                userId;

            sameName.ModifiedDate =
                DateTime.UtcNow;

            return (sameName.LedgerCode, newName);
        }

        // Keep a code the brand already had (its ledger was lost),
        // else the next free one
        string newCode =
            code.Length > 0
            &&
            !await _context
                .Set<GeneralLedgerEntity>()
                .AnyAsync(x => x.LedgerCode == code)
                ? code
                : await NextLedgerCodeAsync(
                    newParent,
                    null);

        _context
            .Set<GeneralLedgerEntity>()
            .Add
            (
                new GeneralLedgerEntity
                {
                    AccountClassId =
                        newParent.Class.AccountClassId,

                    AccountGroupId =
                        newParent.Group.AccountGroupId,

                    AccountSubGroupId =
                        newParent.SubGroup.AccountSubGroupId,

                    ClassCode =
                        newParent.Class.ClassCode,

                    Mode =
                        newParent.Class.Mode,

                    GroupCode =
                        newParent.Group.GroupCode,

                    SubGroupCode =
                        newParent.SubGroup.SubGroupCode,

                    LedgerCode =
                        newCode,

                    LedgerName =
                        newName,

                    Remarks =
                        $"Auto : Brand Management ({entity.BrandCode})",

                    IsActive =
                        entity.Status,

                    IsDeleted =
                        false,

                    CreatedBy =
                        userId,

                    CreatedDate =
                        DateTime.UtcNow
                }
            );

        return (newCode, newName);
    }


    //===========================================================
    // Delete / Restore ledgers by code
    //
    // Delete  : every live ledger with one of the codes.
    // Restore : for each code without a live ledger, its most
    //           recently deleted one.
    //===========================================================

    private async Task
        SetLedgersDeletedAsync
        (
            List<string> codes,
            bool deleted,
            long userId
        )
    {
        if
        (
            codes.Count == 0
        )
        {
            return;
        }

        DateTime now =
            DateTime.UtcNow;

        if
        (
            deleted
        )
        {
            foreach
            (
                GeneralLedgerEntity ledger
                in await _context
                    .Set<GeneralLedgerEntity>()
                    .Where
                    (
                        x =>
                            codes.Contains(x.LedgerCode)
                            &&
                            !x.IsDeleted
                    )
                    .ToListAsync()
            )
            {
                ledger.IsDeleted =
                    true;

                ledger.DeletedBy =
                    userId;

                ledger.DeletedDate =
                    now;
            }

            return;
        }

        foreach
        (
            string code
            in codes
        )
        {
            bool live =
                await _context
                    .Set<GeneralLedgerEntity>()
                    .AnyAsync
                    (
                        x =>
                            x.LedgerCode ==
                            code
                            &&
                            !x.IsDeleted
                    );

            if
            (
                live
            )
            {
                continue;
            }

            GeneralLedgerEntity? ledger =
                await _context
                    .Set<GeneralLedgerEntity>()
                    .Where
                    (
                        x =>
                            x.LedgerCode ==
                            code
                            &&
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
                ledger == null
            )
            {
                continue;
            }

            ledger.IsDeleted =
                false;

            ledger.DeletedBy =
                null;

            ledger.DeletedDate =
                null;

            ledger.ModifiedBy =
                userId;

            ledger.ModifiedDate =
                now;
        }
    }


    //===========================================================
    // Sync Ledger Names (on list read)
    //
    // Brand renames are applied on save; this catches renames of
    // the two sub groups. Brands without ledgers yet are left for
    // their next Update (create-if-missing).
    //===========================================================

    private async Task
        SyncLedgerNamesAsync()
    {
        Dictionary<string, string> subGroupNames =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        (
                            x.SubGroupCode == OfferAdjustmentSubGroupCode
                            ||
                            x.SubGroupCode == EmiClaimSubGroupCode
                        )
                        &&
                        !x.IsDeleted
                )
                .ToDictionaryAsync
                (
                    x => x.SubGroupCode,
                    x => x.SubGroupName
                );

        if
        (
            subGroupNames.Count == 0
        )
        {
            return;
        }

        List<BrandManagementEntity> brands =
            await _context
                .Set<BrandManagementEntity>()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (
                            x.OfferAdjustmentLedgerCode != ""
                            ||
                            x.EmiClaimLedgerCode != ""
                        )
                )
                .ToListAsync();

        bool changed =
            false;

        foreach
        (
            BrandManagementEntity brand
            in brands
        )
        {
            foreach
            (
                (string subGroupCode, bool isOffer)
                in new[]
                {
                    (OfferAdjustmentSubGroupCode, true),
                    (EmiClaimSubGroupCode, false)
                }
            )
            {
                string code =
                    isOffer
                        ? brand.OfferAdjustmentLedgerCode
                        : brand.EmiClaimLedgerCode;

                if
                (
                    code.Length == 0
                    ||
                    !subGroupNames.TryGetValue(subGroupCode, out string? subGroupName)
                )
                {
                    continue;
                }

                string expected =
                    $"{Clean(subGroupName)} - {Clean(brand.BrandName)}";

                if
                (
                    expected.Length > MaxLedgerNameLength
                    ||
                    expected == (isOffer ? brand.OfferAdjustmentLedgerName : brand.EmiClaimLedgerName)
                )
                {
                    continue;
                }

                GeneralLedgerEntity? ledger =
                    await _context
                        .Set<GeneralLedgerEntity>()
                        .FirstOrDefaultAsync
                        (
                            x =>
                                x.LedgerCode ==
                                code
                                &&
                                !x.IsDeleted
                        );

                if
                (
                    ledger == null
                    ||
                    // the name is taken by another ledger : left as it is
                    await _context
                        .Set<GeneralLedgerEntity>()
                        .AnyAsync
                        (
                            x =>
                                x.AccountSubGroupId ==
                                ledger.AccountSubGroupId
                                &&
                                x.LedgerName ==
                                expected
                                &&
                                !x.IsDeleted
                                &&
                                x.GeneralLedgerId !=
                                ledger.GeneralLedgerId
                        )
                )
                {
                    continue;
                }

                ledger.LedgerName =
                    expected;

                if
                (
                    isOffer
                )
                {
                    brand.OfferAdjustmentLedgerName =
                        expected;
                }
                else
                {
                    brand.EmiClaimLedgerName =
                        expected;
                }

                changed =
                    true;
            }
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
    // Motor Bikes Supplier check
    //
    // '' = none. Otherwise a live supplier with Supply Type Motor
    // Bikes; it must be active unless the brand already has it.
    //===========================================================

    private async Task<string>
        CheckMotorBikesSupplierAsync
        (
            string? supplierCode,
            string? savedCode
        )
    {
        string code =
            (supplierCode ?? string.Empty).Trim();

        if
        (
            code.Length == 0
        )
        {
            return string.Empty;
        }

        SupplierEntity? supplier =
            await _context
                .Set<SupplierEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SupplierCode ==
                        code
                        &&
                        !x.IsDeleted
                );

        if
        (
            supplier == null
        )
        {
            throw new InvalidOperationException(
                $"Motor Bikes Supplier '{code}' was not found or is deleted.");
        }

        if
        (
            !string.Equals(
                supplier.SupplyType,
                MotorBikesSupplyType,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                $"Supplier '{supplier.DisplayName}' supplies {supplier.SupplyType}, not Motor Bikes.");
        }

        if
        (
            !supplier.IsActive
            &&
            code != (savedCode ?? string.Empty)
        )
        {
            throw new InvalidOperationException(
                $"Supplier '{supplier.DisplayName}' is inactive. Select another supplier.");
        }

        return supplier.SupplierCode;
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
            .Set<BrandManagementEntity>()
            .AnyAsync
            (
                x =>
                    x.BrandManagementId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}