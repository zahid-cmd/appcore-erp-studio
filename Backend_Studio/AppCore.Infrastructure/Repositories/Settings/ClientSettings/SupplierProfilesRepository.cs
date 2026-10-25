//===============================================================
// Namespaces
//===============================================================

using System.Text.RegularExpressions;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ClientSettings;

using SupplierEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles;

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

namespace AppCore.Infrastructure.Configurations.Settings.ClientSettings;


//===============================================================
// Supplier Profiles Repository
//
// Code : SUP-000001 (central CodeGenerator); highest number ever
// used (deleted rows included) + 1, never reused.
//
// Supplier Name, Contact Person and Address are stored in CAPITAL
// LETTERS.
//
// Supply Type : Motor Bikes / Spare Parts / Accessories / General
// (what this supplier CODE supplies). One company may have one
// code per Supply Type (2026-10-26).
//
// Display Name : "<SUPPLIER NAME> - <BRAND> - <SUPPLY TYPE> -
// <PHONE 1>", the brand part only when a brand is set. Shown
// everywhere and used as the name of the supplier's payable
// ledger. Brand renames are followed on read.
//
// Phone 1 : 11 digits starting 01, digits only. BIN / TIN : digits
// only. Each is unique among live suppliers of the SAME Supply
// Type (the same company keeps its phone / BIN / TIN on each of
// its codes).
//
// Ledger : every supplier owns one payable General Ledger
// GLR-ccc-ggg-sss-nnnnn under SUB-003-002-001 Liability For
// Purchase (found by CODE only), created / renamed /
// (de)activated / deleted / restored with the supplier.
//
// Delete : posting checks come with the Purchase module.
//===============================================================

public class SupplierProfilesRepository :
    ISupplierProfilesRepository
{
    //===========================================================
    // Constants
    //===========================================================

    // Supplier Types (fixed)
    public static readonly string[] SupplierTypes =
    {
        "Brand Distributor",
        "Local Vendor",
        "Service Provider"
    };

    // Supply Types (fixed) : what a supplier code supplies;
    // matches Product Category's types + General (mixed)
    public static readonly string[] SupplyTypes =
    {
        "Motor Bikes",
        "Spare Parts",
        "Accessories",
        "General"
    };

    private const string CodePrefix =
        "SUP-";

    private const string LedgerPrefix =
        "GLR";

    // Supplier payable ledgers go under this sub group, found by
    // CODE only (never by name)
    private const string PayableSubGroupCode =
        "SUB-003-002-001";

    private const int MaxNameLength =
        150;

    private const int MaxAddressLength =
        500;

    private const int MaxCreditDays =
        365;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public SupplierProfilesRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Query
    //===========================================================

    private IQueryable<SupplierProfilesDto>
        SupplierQuery()
    {
        return _context
            .Set<SupplierEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new SupplierProfilesDto
                    {
                        SupplierId = x.SupplierId,
                        SupplierCode = x.SupplierCode,
                        SupplierType = x.SupplierType,
                        SupplyType = x.SupplyType,
                        SupplierName = x.SupplierName,
                        DisplayName = x.DisplayName,
                        BrandManagementId = x.BrandManagementId,

                        BrandName =
                            _context
                                .Set<BrandManagementEntity>()
                                .Where(b => b.BrandManagementId == x.BrandManagementId)
                                .Select(b => b.BrandName)
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        ContactPerson = x.ContactPerson,
                        Phone1 = x.Phone1,
                        Phone2 = x.Phone2,
                        Email = x.Email,
                        Address = x.Address,
                        TradeLicenseNo = x.TradeLicenseNo,
                        BinNo = x.BinNo,
                        TinNo = x.TinNo,
                        PayableLedgerCode = x.PayableLedgerCode,
                        PayableLedgerName = x.PayableLedgerName,
                        CreditDays = x.CreditDays,
                        Remarks = x.Remarks,
                        IsActive = x.IsActive,
                        IsDeleted = x.IsDeleted,
                        DeletedBy = x.DeletedBy,
                        DeletedDate = x.DeletedDate,
                        CreatedBy = x.CreatedBy,
                        CreatedDate = x.CreatedDate,
                        ModifiedBy = x.ModifiedBy,
                        ModifiedDate = x.ModifiedDate
                    }
            );
    }


    //===========================================================
    // Get All (brand renames are followed first)
    //===========================================================

    public async Task<List<SupplierProfilesDto>>
        GetAllAsync()
    {
        await SyncDisplayNamesAsync();

        return await SupplierQuery()
            .OrderBy
            (
                x =>
                    x.SupplierCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<SupplierProfilesDto?>
        GetByIdAsync
        (
            long id
        )
    {
        await SyncDisplayNamesAsync();

        return await SupplierQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.SupplierId ==
                    id
            );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<SupplierProfilesDefaultsDto>
        GetDefaultsAsync()
    {
        SupplierProfilesDefaultsDto dto =
            new SupplierProfilesDefaultsDto
            {
                NextSupplierCode =
                    NextSupplierCode(
                        await AllSupplierCodesAsync()),

                PayableSubGroupCode =
                    PayableSubGroupCode,

                SupplierTypes =
                    SupplierTypes.ToList(),

                SupplyTypes =
                    SupplyTypes.ToList(),

                Brands =
                    await _context
                        .Set<BrandManagementEntity>()
                        .AsNoTracking()
                        .Where(x => !x.IsDeleted)
                        .OrderBy(x => x.BrandName)
                        .Select
                        (
                            x =>
                                new SupplierProfilesBrandOptionDto
                                {
                                    BrandManagementId = x.BrandManagementId,
                                    BrandName = x.BrandName,
                                    IsActive = x.Status
                                }
                        )
                        .ToListAsync()
            };

        try
        {
            LedgerParent parent =
                await ResolveLedgerParentAsync();

            dto.PayableSubGroupName =
                parent.SubGroup.SubGroupName;

            dto.NextLedgerCode =
                await NextLedgerCodeAsync(
                    parent);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            dto.PayableSubGroupMessage =
                ex.Message;
        }

        return dto;
    }


    //===========================================================
    // Text Helpers
    //===========================================================

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
                    new[] { ' ', '\t', '\r', '\n' },
                    StringSplitOptions.RemoveEmptyEntries));
    }


    // Names and addresses are stored in CAPITAL LETTERS
    private static string Upper
    (
        string value
    )
    {
        return (value ?? string.Empty)
            .ToUpperInvariant();
    }


    // "<SUPPLIER NAME> - <BRAND> - <SUPPLY TYPE> - <PHONE 1>" (no
    // brand part when the supplier has no brand)
    private static string BuildDisplayName
    (
        string supplierName,
        string brandName,
        string supplyType,
        string phone1
    )
    {
        string brand =
            Upper(
                Clean(brandName));

        string supply =
            Upper(
                Clean(supplyType));

        string display =
            string.Join(
                " - ",
                new[] { supplierName, brand, supply, phone1 }
                    .Where(part => !string.IsNullOrWhiteSpace(part)));

        // The payable ledger carries this name (General Ledger
        // names are at most 200 characters)
        if
        (
            display.Length > 200
        )
        {
            throw new InvalidOperationException(
                $"Display Name '{display}' is longer than 200 characters. Use a shorter supplier name.");
        }

        return display;
    }


    private static string CanonicalSupplyType
    (
        string? supplyType
    )
    {
        string value =
            (supplyType ?? string.Empty).Trim();

        string? type =
            SupplyTypes.FirstOrDefault
            (
                x =>
                    string.Equals(
                        x,
                        value,
                        StringComparison.OrdinalIgnoreCase)
            );

        return type
            ??
            throw new InvalidOperationException(
                $"Supply Type must be one of : {string.Join(", ", SupplyTypes)}.");
    }


    private static string CanonicalType
    (
        string? supplierType
    )
    {
        string value =
            (supplierType ?? string.Empty).Trim();

        string? type =
            SupplierTypes.FirstOrDefault
            (
                x =>
                    string.Equals(
                        x,
                        value,
                        StringComparison.OrdinalIgnoreCase)
            );

        return type
            ??
            throw new InvalidOperationException(
                $"Supplier Type must be one of : {string.Join(", ", SupplierTypes)}.");
    }


    private static string CheckText
    (
        string? value,
        string label,
        int maxLength,
        bool required
    )
    {
        string text =
            Clean(value);

        if
        (
            required
            &&
            text.Length == 0
        )
        {
            throw new InvalidOperationException(
                $"{label} is required.");
        }

        if
        (
            text.Length > maxLength
        )
        {
            throw new InvalidOperationException(
                $"{label} cannot be longer than {maxLength} characters.");
        }

        return text;
    }


    private static string CheckPhone
    (
        string? value,
        string label,
        bool required
    )
    {
        string phone =
            (value ?? string.Empty).Trim();

        if
        (
            phone.Length == 0
        )
        {
            if
            (
                required
            )
            {
                throw new InvalidOperationException(
                    $"{label} is required.");
            }

            return string.Empty;
        }

        if
        (
            !Regex.IsMatch(phone, "^[0-9]+$")
        )
        {
            throw new InvalidOperationException(
                $"{label} must contain digits only (no spaces or hyphens).");
        }

        if
        (
            phone.Length != 11
        )
        {
            throw new InvalidOperationException(
                $"{label} must be 11 digits ({phone.Length} entered).");
        }

        if
        (
            !phone.StartsWith("01", StringComparison.Ordinal)
        )
        {
            throw new InvalidOperationException(
                $"{label} must start with 01 (e.g. 01711223344).");
        }

        return phone;
    }


    //===========================================================
    // Validate Input
    //===========================================================

    private sealed class SupplierInput
    {
        public string SupplierType { get; init; } = string.Empty;

        public string SupplyType { get; init; } = string.Empty;

        public string SupplierName { get; init; } = string.Empty;

        public long? BrandManagementId { get; init; }

        public string ContactPerson { get; init; } = string.Empty;

        public string Phone1 { get; init; } = string.Empty;

        public string Phone2 { get; init; } = string.Empty;

        public string Email { get; init; } = string.Empty;

        public string Address { get; init; } = string.Empty;

        public string TradeLicenseNo { get; init; } = string.Empty;

        public string BinNo { get; init; } = string.Empty;

        public string TinNo { get; init; } = string.Empty;

        public int CreditDays { get; init; }

        public string Remarks { get; init; } = string.Empty;
    }


    // Update DTO -> the same fields as a Create DTO
    private static CreateSupplierProfilesDto AsCreate
    (
        UpdateSupplierProfilesDto dto
    )
    {
        return new CreateSupplierProfilesDto
        {
            SupplierCode = dto.SupplierCode,
            SupplierType = dto.SupplierType,
            SupplyType = dto.SupplyType,
            SupplierName = dto.SupplierName,
            DisplayName = dto.DisplayName,
            BrandManagementId = dto.BrandManagementId,
            ContactPerson = dto.ContactPerson,
            Phone1 = dto.Phone1,
            Phone2 = dto.Phone2,
            Email = dto.Email,
            Address = dto.Address,
            TradeLicenseNo = dto.TradeLicenseNo,
            BinNo = dto.BinNo,
            TinNo = dto.TinNo,
            PayableLedgerCode = dto.PayableLedgerCode,
            PayableLedgerName = dto.PayableLedgerName,
            CreditDays = dto.CreditDays,
            Remarks = dto.Remarks,
            IsActive = dto.IsActive
        };
    }


    private static SupplierInput ValidateInput
    (
        CreateSupplierProfilesDto dto
    )
    {
        string phone1 =
            CheckPhone(dto.Phone1, "Phone 1", true);

        string phone2 =
            CheckPhone(dto.Phone2, "Phone 2", false);

        if
        (
            phone2.Length > 0
            &&
            phone2 == phone1
        )
        {
            throw new InvalidOperationException(
                "Phone 2 cannot be the same as Phone 1.");
        }

        string email =
            (dto.Email ?? string.Empty).Trim();

        if
        (
            email.Length > 0
            &&
            (
                email.Length > 150
                ||
                !Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$")
            )
        )
        {
            throw new InvalidOperationException(
                "Email is not valid.");
        }

        string bin =
            (dto.BinNo ?? string.Empty).Trim();

        if
        (
            bin.Length > 0
            &&
            (
                !Regex.IsMatch(bin, "^[0-9]+$")
                ||
                bin.Length < 9
                ||
                bin.Length > 13
            )
        )
        {
            throw new InvalidOperationException(
                "BIN must be 9 to 13 digits (digits only), or left empty.");
        }

        string tin =
            (dto.TinNo ?? string.Empty).Trim();

        if
        (
            tin.Length > 0
            &&
            !Regex.IsMatch(tin, "^[0-9]{12}$")
        )
        {
            throw new InvalidOperationException(
                "TIN must be 12 digits (digits only), or left empty.");
        }

        if
        (
            dto.CreditDays < 0
            ||
            dto.CreditDays > MaxCreditDays
        )
        {
            throw new InvalidOperationException(
                $"Credit Days must be between 0 and {MaxCreditDays} (0 = pay on purchase).");
        }

        return new SupplierInput
        {
            SupplierType =
                CanonicalType(dto.SupplierType),

            SupplyType =
                CanonicalSupplyType(dto.SupplyType),

            SupplierName =
                Upper(CheckText(dto.SupplierName, "Supplier Name", MaxNameLength, true)),

            BrandManagementId =
                dto.BrandManagementId.HasValue && dto.BrandManagementId.Value > 0
                    ? dto.BrandManagementId.Value
                    : null,

            ContactPerson =
                Upper(CheckText(dto.ContactPerson, "Contact Person", MaxNameLength, false)),

            Phone1 = phone1,

            Phone2 = phone2,

            Email = email,

            Address =
                Upper(CheckText(dto.Address, "Address", MaxAddressLength, true)),

            TradeLicenseNo =
                Upper(CheckText(dto.TradeLicenseNo, "Trade License No", 50, false)),

            BinNo = bin,

            TinNo = tin,

            CreditDays = dto.CreditDays,

            Remarks =
                (dto.Remarks ?? string.Empty).Trim()
        };
    }


    //===========================================================
    // Brand check -> its name ('' when no brand)
    //
    // Must be a live brand. A new choice must be active; an
    // unchanged one may have been deactivated since.
    //===========================================================

    private async Task<string>
        CheckBrandAsync
        (
            long? brandId,
            long? savedBrandId
        )
    {
        if
        (
            !brandId.HasValue
        )
        {
            return string.Empty;
        }

        BrandManagementEntity? brand =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BrandManagementId ==
                        brandId.Value
                        &&
                        !x.IsDeleted
                );

        if
        (
            brand == null
        )
        {
            throw new InvalidOperationException(
                "The selected Brand was not found or is deleted.");
        }

        if
        (
            !brand.Status
            &&
            brandId != savedBrandId
        )
        {
            throw new InvalidOperationException(
                $"Brand '{brand.BrandName}' is inactive. Select another brand.");
        }

        return brand.BrandName;
    }


    //===========================================================
    // Unique Phone 1 / BIN / TIN (live suppliers of the same
    // Supply Type : one company may hold one code per type)
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string supplyType,
            string phone1,
            string binNo,
            string tinNo,
            long currentId
        )
    {
        SupplierEntity? samePhone =
            await _context
                .Set<SupplierEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.SupplierId != currentId
                        &&
                        x.SupplyType == supplyType
                        &&
                        x.Phone1 == phone1
                );

        if
        (
            samePhone != null
        )
        {
            throw new InvalidOperationException(
                $"Phone 1 {phone1} already belongs to {samePhone.SupplierName} ({samePhone.SupplierCode}, {supplyType}).");
        }

        if
        (
            binNo.Length > 0
        )
        {
            SupplierEntity? sameBin =
                await _context
                    .Set<SupplierEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            x.SupplierId != currentId
                            &&
                            x.SupplyType == supplyType
                            &&
                            x.BinNo == binNo
                    );

            if
            (
                sameBin != null
            )
            {
                throw new InvalidOperationException(
                    $"BIN {binNo} already belongs to {sameBin.SupplierName} ({sameBin.SupplierCode}, {supplyType}).");
            }
        }

        if
        (
            tinNo.Length > 0
        )
        {
            SupplierEntity? sameTin =
                await _context
                    .Set<SupplierEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            x.SupplierId != currentId
                            &&
                            x.SupplyType == supplyType
                            &&
                            x.TinNo == tinNo
                    );

            if
            (
                sameTin != null
            )
            {
                throw new InvalidOperationException(
                    $"TIN {tinNo} already belongs to {sameTin.SupplierName} ({sameTin.SupplierCode}, {supplyType}).");
            }
        }
    }


    //===========================================================
    // Supplier Code (SUP-000001, central CodeGenerator)
    //===========================================================

    // Every code ever used (deleted rows included : never reused)
    private async Task<List<string>>
        AllSupplierCodesAsync()
    {
        return await _context
            .Set<SupplierEntity>()
            .AsNoTracking()
            .Select
            (
                x =>
                    x.SupplierCode
            )
            .ToListAsync();
    }


    private static string NextSupplierCode
    (
        IEnumerable<string> existingCodes
    )
    {
        int highest =
            existingCodes
                .Where
                (
                    code =>
                        (code ?? string.Empty).StartsWith(
                            CodePrefix,
                            StringComparison.OrdinalIgnoreCase)
                )
                .Select
                (
                    code =>
                        int.TryParse(
                            code.Substring(CodePrefix.Length),
                            out int number)
                            ? number
                            : 0
                )
                .DefaultIfEmpty(0)
                .Max();

        return CodeGenerator.GenerateSupplierCode(
            highest + 1);
    }


    // "SUB-003-002-001" -> 1
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
    // Ledger parent : SUB-003-002-001 Liability For Purchase
    //===========================================================

    private sealed class LedgerParent
    {
        public AccountClassEntity Class { get; set; } = null!;

        public AccountGroupEntity Group { get; set; } = null!;

        public AccountSubGroupEntity SubGroup { get; set; } = null!;
    }


    private async Task<LedgerParent>
        ResolveLedgerParentAsync()
    {
        AccountSubGroupEntity? subGroup =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SubGroupCode ==
                        PayableSubGroupCode
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
                $"Payable account sub group {PayableSubGroupCode} (Liability For Purchase) " +
                "was not found or is deleted. Supplier ledgers are created under it.");
        }

        return new LedgerParent
        {
            Class = accountClass,
            Group = group,
            SubGroup = subGroup
        };
    }


    //===========================================================
    // Next Ledger Code (GLR-ccc-ggg-sss-nnnnn in the sub group;
    // central CodeGenerator). Highest number used by any ledger of
    // the sub group or any supplier (deleted included) + 1.
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

        codes.AddRange(
            await _context
                .Set<SupplierEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.PayableLedgerCode != ""
                )
                .Select
                (
                    x =>
                        x.PayableLedgerCode
                )
                .ToListAsync());

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
    // Sync Ledger (create when missing, follow the supplier)
    //===========================================================

    private async Task
        SyncLedgerAsync
        (
            SupplierEntity entity,
            LedgerParent parent,
            long userId
        )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                entity.PayableLedgerCode)
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
                        entity.PayableLedgerCode
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
                        AccountClassId = parent.Class.AccountClassId,
                        AccountGroupId = parent.Group.AccountGroupId,
                        AccountSubGroupId = parent.SubGroup.AccountSubGroupId,
                        ClassCode = parent.Class.ClassCode,
                        Mode = parent.Class.Mode,
                        GroupCode = parent.Group.GroupCode,
                        SubGroupCode = parent.SubGroup.SubGroupCode,
                        LedgerCode = entity.PayableLedgerCode,
                        LedgerName = entity.PayableLedgerName,
                        Remarks = $"System generated from Supplier Profiles {entity.SupplierCode} (payable).",
                        IsActive = entity.IsActive,
                        IsDeleted = false,
                        CreatedBy = userId,
                        CreatedDate = DateTime.UtcNow
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
                $"General Ledger '{entity.PayableLedgerCode}' belongs to a different sub group.");
        }

        if
        (
            ledger.LedgerName == entity.PayableLedgerName
            &&
            ledger.IsActive == entity.IsActive
        )
        {
            return;
        }

        ledger.LedgerName =
            entity.PayableLedgerName;

        ledger.IsActive =
            entity.IsActive;

        ledger.ModifiedBy =
            userId;

        ledger.ModifiedDate =
            DateTime.UtcNow;
    }


    //===========================================================
    // Brands using this supplier as their Motor Bikes Supplier
    // (live brands; '' when none), e.g. "brand Revoo, Rydo"
    //===========================================================

    private async Task<string>
        BrandsUsingAsync
        (
            string supplierCode
        )
    {
        List<string> names =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.MotorBikesSupplierCode ==
                        supplierCode
                )
                .OrderBy(x => x.BrandName)
                .Select(x => x.BrandName)
                .ToListAsync();

        return names.Count == 0
            ? string.Empty
            : $"brand {string.Join(", ", names)}";
    }


    //===========================================================
    // Sync Display Names (on read)
    //
    // A renamed brand changes the Display Name of its suppliers
    // and the name of their ledgers. Every live supplier is
    // checked (with or without a brand), so a rule change (e.g.
    // the Supply Type part, 2026-10-26) reaches the saved names.
    //===========================================================

    private async Task
        SyncDisplayNamesAsync()
    {
        var rows =
            await
            (
                from s in _context.Set<SupplierEntity>()
                join b in _context.Set<BrandManagementEntity>()
                    on s.BrandManagementId equals (long?)b.BrandManagementId
                    into brands
                from b in brands.DefaultIfEmpty()
                where !s.IsDeleted
                select new
                {
                    Supplier = s,
                    BrandName = b == null ? null : b.BrandName
                }
            )
            .ToListAsync();

        bool changed =
            false;

        foreach
        (
            var row
            in rows
        )
        {
            string display;

            try
            {
                display =
                    BuildDisplayName(
                        row.Supplier.SupplierName,
                        row.BrandName ?? string.Empty,
                        row.Supplier.SupplyType,
                        row.Supplier.Phone1);
            }
            catch (InvalidOperationException)
            {
                // Too long : left as it is (the next save reports it)
                continue;
            }

            if
            (
                display == row.Supplier.DisplayName
            )
            {
                continue;
            }

            row.Supplier.DisplayName =
                display;

            row.Supplier.PayableLedgerName =
                display;

            foreach
            (
                GeneralLedgerEntity ledger
                in await _context
                    .Set<GeneralLedgerEntity>()
                    .Where
                    (
                        x =>
                            x.LedgerCode ==
                            row.Supplier.PayableLedgerCode
                            &&
                            !x.IsDeleted
                    )
                    .ToListAsync()
            )
            {
                ledger.LedgerName =
                    display;
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
    // Apply validated input to the entity
    //===========================================================

    private static void Apply
    (
        SupplierEntity entity,
        SupplierInput input,
        string brandName,
        bool isActive
    )
    {
        entity.SupplierType = input.SupplierType;
        entity.SupplyType = input.SupplyType;
        entity.SupplierName = input.SupplierName;
        entity.BrandManagementId = input.BrandManagementId;
        entity.DisplayName = BuildDisplayName(input.SupplierName, brandName, input.SupplyType, input.Phone1);
        entity.ContactPerson = input.ContactPerson;
        entity.Phone1 = input.Phone1;
        entity.Phone2 = input.Phone2;
        entity.Email = input.Email;
        entity.Address = input.Address;
        entity.TradeLicenseNo = input.TradeLicenseNo;
        entity.BinNo = input.BinNo;
        entity.TinNo = input.TinNo;
        entity.PayableLedgerName = entity.DisplayName;
        entity.CreditDays = input.CreditDays;
        entity.Remarks = input.Remarks;
        entity.IsActive = isActive;
    }


    //===========================================================
    // Create
    //
    // Code, Display Name and ledger are always built here; the
    // form's values are only a preview.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateSupplierProfilesDto dto,
            long userId
        )
    {
        SupplierInput input =
            ValidateInput(
                dto);

        string brandName =
            await CheckBrandAsync(
                input.BrandManagementId,
                null);

        await EnsureUniqueAsync(
            input.SupplyType,
            input.Phone1,
            input.BinNo,
            input.TinNo,
            0);

        LedgerParent parent =
            await ResolveLedgerParentAsync();

        SupplierEntity entity =
            new SupplierEntity
            {
                SupplierCode =
                    NextSupplierCode(
                        await AllSupplierCodesAsync()),

                PayableLedgerCode =
                    await NextLedgerCodeAsync(
                        parent),

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };

        Apply(
            entity,
            input,
            brandName,
            dto.IsActive);


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        _context
            .Set<SupplierEntity>()
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

        return entity.SupplierId;
    }


    //===========================================================
    // Update (code is locked; the ledger follows the Display Name
    // and the active state)
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateSupplierProfilesDto dto,
            long userId
        )
    {
        SupplierEntity? entity =
            await _context
                .Set<SupplierEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SupplierId ==
                        dto.SupplierId
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Supplier not found.");
        }

        SupplierInput input =
            ValidateInput(
                AsCreate(dto));

        // A brand's Motor Bikes Supplier must stay Motor Bikes
        if
        (
            !string.Equals(
                input.SupplyType,
                entity.SupplyType,
                StringComparison.Ordinal)
        )
        {
            string brands =
                await BrandsUsingAsync(
                    entity.SupplierCode);

            if
            (
                brands.Length > 0
            )
            {
                throw new InvalidOperationException(
                    $"Supply Type cannot change : this supplier is the Motor Bikes Supplier of {brands}. Change it on Brand Management first.");
            }
        }

        string brandName =
            await CheckBrandAsync(
                input.BrandManagementId,
                entity.BrandManagementId);

        await EnsureUniqueAsync(
            input.SupplyType,
            input.Phone1,
            input.BinNo,
            input.TinNo,
            entity.SupplierId);

        LedgerParent parent =
            await ResolveLedgerParentAsync();

        Apply(
            entity,
            input,
            brandName,
            dto.IsActive);

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        if
        (
            string.IsNullOrWhiteSpace(
                entity.PayableLedgerCode)
        )
        {
            entity.PayableLedgerCode =
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
    // Delete (supplier + its ledger)
    //
    // Posting checks come with the Purchase module.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        SupplierEntity? entity =
            await _context
                .Set<SupplierEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SupplierId ==
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
                "Supplier not found.");
        }

        // Blocked while a brand uses it as its Motor Bikes Supplier
        string usedBy =
            await BrandsUsingAsync(
                entity.SupplierCode);

        if
        (
            usedBy.Length > 0
        )
        {
            throw new InvalidOperationException(
                $"Supplier '{entity.DisplayName}' cannot be deleted : it is the Motor Bikes Supplier of {usedBy}.");
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
            GeneralLedgerEntity ledger
            in await _context
                .Set<GeneralLedgerEntity>()
                .Where
                (
                    x =>
                        x.LedgerCode ==
                        entity.PayableLedgerCode
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

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Delete",
            "Deleted",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore (most recently deleted supplier + its ledger)
    //
    // Blocked (409) while its Phone 1 / BIN / TIN is taken or the
    // payable sub group is gone. A deleted brand is dropped.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        SupplierEntity? entity =
            await _context
                .Set<SupplierEntity>()
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

        LedgerParent parent;

        try
        {
            await EnsureUniqueAsync(
                entity.SupplyType,
                entity.Phone1,
                entity.BinNo,
                entity.TinNo,
                entity.SupplierId);

            parent =
                await ResolveLedgerParentAsync();
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Supplier '{entity.DisplayName}' cannot be restored. {ex.Message}");
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
                        entity.PayableLedgerCode
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

        // A deleted brand is dropped from the restored supplier
        string brandName =
            string.Empty;

        if
        (
            entity.BrandManagementId.HasValue
        )
        {
            brandName =
                await _context
                    .Set<BrandManagementEntity>()
                    .Where
                    (
                        x =>
                            x.BrandManagementId ==
                            entity.BrandManagementId.Value
                            &&
                            !x.IsDeleted
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
                brandName.Length == 0
            )
            {
                entity.BrandManagementId =
                    null;
            }
        }

        entity.DisplayName =
            BuildDisplayName(
                entity.SupplierName,
                brandName,
                entity.SupplyType,
                entity.Phone1);

        entity.PayableLedgerName =
            entity.DisplayName;

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
    // Activity History
    //===========================================================

    private void AddHistory
    (
        SupplierEntity entity,
        string activityType,
        string verb,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Client Settings",

                EntityName =
                    "Supplier Profiles",

                EntityId =
                    entity.SupplierId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Supplier {verb}",

                ActivityDescription =
                    $"Supplier '{entity.DisplayName}' ({entity.SupplierCode}) {verb.ToLower()}.",

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
    // Exists
    //===========================================================

    public async Task<bool>
        ExistsAsync
        (
            long id
        )
    {
        return await _context
            .Set<SupplierEntity>()
            .AnyAsync
            (
                x =>
                    x.SupplierId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}