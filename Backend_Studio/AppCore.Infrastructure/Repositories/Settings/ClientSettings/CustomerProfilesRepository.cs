//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using System.Text.RegularExpressions;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ClientSettings;

using CustomerEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.CustomerProfiles;

using LocationEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Locations;

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
// Customer Profiles Repository
//
// Customer Types :
//   Inbound  bought a bike from us     code CIB-000001
//   Outside  takes services only       code COS-000001
//   Two series from the central CodeGenerator; highest number
//   ever used (deleted rows and previous codes included) + 1,
//   never reused.
//
// Customer Name, Father's / Mother's Name and the three addresses
// are stored in CAPITAL LETTERS.
//
// Display Name : "<CUSTOMER NAME> - <Phone 1>", shown everywhere
// and used as the name of the customer's receivable ledger.
//
// Phone 1 : 11 digits starting 01, digits only, unique among live
// customers (both types). Phone 2 : same format, optional.
// Inbound : NID (10 / 13 / 17 digits, unique among live Inbound
// customers) and Present Address are required; the parents'
// names, date of birth, driving license, permanent and
// registration addresses are kept. Outside : those Inbound-only
// fields are cleared.
//
// Ledger : every customer owns one receivable General Ledger
// GLR-ccc-ggg-sss-nnnnn under SUB-002-002-005 Trade Receivables
// (found by CODE only), created / renamed / (de)activated /
// deleted / restored with the customer.
//
// Conversion : Outside -> Inbound (bought a bike from us) gives a
// new CIB code; the COS code moves to PreviousCode and the ledger
// is kept (same code, so balances carry over). Inbound -> Outside
// is refused.
//
// Delete : posting checks come with the transaction modules.
//===============================================================

public class CustomerProfilesRepository :
    ICustomerProfilesRepository
{
    //===========================================================
    // Constants
    //===========================================================

    public const string InboundType =
        "Inbound";

    public const string OutsideType =
        "Outside";

    private const string InboundPrefix =
        "CIB-";

    private const string OutsidePrefix =
        "COS-";

    private const string LedgerPrefix =
        "GLR";

    // Customer receivable ledgers go under this sub group, found
    // by CODE only (never by name)
    private const string ReceivableSubGroupCode =
        "SUB-002-002-006";

    private const int MaxNameLength =
        150;

    private const int MaxAddressLength =
        500;

    private const decimal MaxAmount =
        99999999.99m;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public CustomerProfilesRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Query
    //===========================================================

    private IQueryable<CustomerProfilesDto>
        CustomerQuery()
    {
        return _context
            .Set<CustomerEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new CustomerProfilesDto
                    {
                        CustomerId = x.CustomerId,
                        CustomerType = x.CustomerType,
                        CustomerCode = x.CustomerCode,
                        PreviousCode = x.PreviousCode,
                        CustomerName = x.CustomerName,
                        DisplayName = x.DisplayName,
                        FatherName = x.FatherName,
                        MotherName = x.MotherName,

                        // formatted after the query
                        DateOfBirth = string.Empty,

                        PhotoPath = x.PhotoPath,
                        Phone1 = x.Phone1,
                        Phone2 = x.Phone2,
                        Email = x.Email,
                        NidNo = x.NidNo,
                        DrivingLicenseNo = x.DrivingLicenseNo,
                        PresentAddress = x.PresentAddress,
                        PermanentAddress = x.PermanentAddress,
                        RegistrationAddress = x.RegistrationAddress,
                        LocationId = x.LocationId,

                        LocationName =
                            _context
                                .Set<LocationEntity>()
                                .Where(l => l.LocationId == x.LocationId)
                                .Select(l => l.DisplayName)
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        ReceivableLedgerCode = x.ReceivableLedgerCode,
                        ReceivableLedgerName = x.ReceivableLedgerName,
                        CreditLimit = x.CreditLimit,
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


    // Date of birth as "YYYY-MM-DD" (read separately : EF cannot
    // format a date inside the projection)
    private async Task FillDatesAsync
    (
        List<CustomerProfilesDto> rows
    )
    {
        if
        (
            rows.Count == 0
        )
        {
            return;
        }

        List<long> ids =
            rows
                .Select(x => x.CustomerId)
                .ToList();

        Dictionary<long, DateOnly?> dates =
            await _context
                .Set<CustomerEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.CustomerId))
                .Select(x => new { x.CustomerId, x.DateOfBirth })
                .ToDictionaryAsync(
                    x => x.CustomerId,
                    x => x.DateOfBirth);

        foreach
        (
            CustomerProfilesDto row
            in rows
        )
        {
            row.DateOfBirth =
                dates.TryGetValue(row.CustomerId, out DateOnly? date)
                &&
                date.HasValue
                    ? date.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
                    : string.Empty;
        }
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<CustomerProfilesDto>>
        GetAllAsync()
    {
        List<CustomerProfilesDto> rows =
            await CustomerQuery()
                .OrderBy
                (
                    x =>
                        x.CustomerCode
                )
                .ToListAsync();

        await FillDatesAsync(
            rows);

        return rows;
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<CustomerProfilesDto?>
        GetByIdAsync
        (
            long id
        )
    {
        CustomerProfilesDto? row =
            await CustomerQuery()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.CustomerId ==
                        id
                );

        if
        (
            row != null
        )
        {
            await FillDatesAsync(
                new List<CustomerProfilesDto> { row });
        }

        return row;
    }


    //===========================================================
    // Get Defaults
    //
    // Next codes (preview), the receivable sub group, and the
    // locations (live; inactive ones are listed too so a saved
    // customer keeps showing its location; the form offers only
    // active ones for a new choice).
    //===========================================================

    public async Task<CustomerProfilesDefaultsDto>
        GetDefaultsAsync()
    {
        List<string> codes =
            await AllCustomerCodesAsync();

        CustomerProfilesDefaultsDto dto =
            new CustomerProfilesDefaultsDto
            {
                NextInboundCode =
                    NextCustomerCode(
                        InboundType,
                        codes),

                NextOutsideCode =
                    NextCustomerCode(
                        OutsideType,
                        codes),

                ReceivableSubGroupCode =
                    ReceivableSubGroupCode,

                Locations =
                    await _context
                        .Set<LocationEntity>()
                        .AsNoTracking()
                        .Where(x => !x.IsDeleted)
                        .OrderBy(x => x.DisplayName)
                        .Select
                        (
                            x =>
                                new CustomerProfilesLocationOptionDto
                                {
                                    LocationId = x.LocationId,
                                    DisplayName = x.DisplayName,
                                    IsActive = x.IsActive
                                }
                        )
                        .ToListAsync()
            };

        try
        {
            LedgerParent parent =
                await ResolveLedgerParentAsync();

            dto.ReceivableSubGroupName =
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
            dto.ReceivableSubGroupMessage =
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


    private static string BuildDisplayName
    (
        string customerName,
        string phone1
    )
    {
        return $"{customerName} - {phone1}";
    }


    private static string CanonicalType
    (
        string? customerType
    )
    {
        string value =
            (customerType ?? string.Empty).Trim();

        if
        (
            string.Equals(value, InboundType, StringComparison.OrdinalIgnoreCase)
        )
        {
            return InboundType;
        }

        if
        (
            string.Equals(value, OutsideType, StringComparison.OrdinalIgnoreCase)
        )
        {
            return OutsideType;
        }

        throw new InvalidOperationException(
            "Customer Type must be Inbound or Outside.");
    }


    //===========================================================
    // Validate Input
    //
    // Returns the cleaned values; Inbound-only fields are cleared
    // for Outside customers.
    //===========================================================

    private sealed class CustomerInput
    {
        public string CustomerType { get; init; } = string.Empty;

        public string CustomerName { get; init; } = string.Empty;

        public string FatherName { get; init; } = string.Empty;

        public string MotherName { get; init; } = string.Empty;

        public DateOnly? DateOfBirth { get; init; }

        public string Phone1 { get; init; } = string.Empty;

        public string Phone2 { get; init; } = string.Empty;

        public string Email { get; init; } = string.Empty;

        public string NidNo { get; init; } = string.Empty;

        public string DrivingLicenseNo { get; init; } = string.Empty;

        public string PresentAddress { get; init; } = string.Empty;

        public string PermanentAddress { get; init; } = string.Empty;

        public string RegistrationAddress { get; init; } = string.Empty;

        public long? LocationId { get; init; }

        public decimal CreditLimit { get; init; }

        public string Remarks { get; init; } = string.Empty;
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


    // Update DTO -> the same fields as a Create DTO
    private static CreateCustomerProfilesDto AsCreate
    (
        UpdateCustomerProfilesDto dto
    )
    {
        return new CreateCustomerProfilesDto
        {
            CustomerType = dto.CustomerType,
            CustomerCode = dto.CustomerCode,
            PreviousCode = dto.PreviousCode,
            CustomerName = dto.CustomerName,
            DisplayName = dto.DisplayName,
            FatherName = dto.FatherName,
            MotherName = dto.MotherName,
            DateOfBirth = dto.DateOfBirth,
            PhotoPath = dto.PhotoPath,
            Phone1 = dto.Phone1,
            Phone2 = dto.Phone2,
            Email = dto.Email,
            NidNo = dto.NidNo,
            DrivingLicenseNo = dto.DrivingLicenseNo,
            PresentAddress = dto.PresentAddress,
            PermanentAddress = dto.PermanentAddress,
            RegistrationAddress = dto.RegistrationAddress,
            LocationId = dto.LocationId,
            ReceivableLedgerCode = dto.ReceivableLedgerCode,
            ReceivableLedgerName = dto.ReceivableLedgerName,
            CreditLimit = dto.CreditLimit,
            Remarks = dto.Remarks,
            IsActive = dto.IsActive
        };
    }


    private static CustomerInput ValidateInput
    (
        CreateCustomerProfilesDto dto
    )
    {
        string customerType =
            CanonicalType(
                dto.CustomerType);

        bool inbound =
            customerType == InboundType;

        // CAPITAL LETTERS (the Display Name and the ledger name
        // follow it)
        string name =
            Upper(
                CheckText(dto.CustomerName, "Customer Name", MaxNameLength, true));

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

        //=======================================================
        // Inbound-only identity
        //=======================================================

        string nid =
            string.Empty;

        DateOnly? dateOfBirth =
            null;

        if
        (
            inbound
        )
        {
            nid =
                (dto.NidNo ?? string.Empty).Trim();

            if
            (
                nid.Length == 0
            )
            {
                throw new InvalidOperationException(
                    "NID No is required for Inbound customers.");
            }

            if
            (
                !Regex.IsMatch(nid, "^[0-9]+$")
                ||
                (nid.Length != 10 && nid.Length != 13 && nid.Length != 17)
            )
            {
                throw new InvalidOperationException(
                    "NID No must be 10, 13 or 17 digits (digits only).");
            }

            string dob =
                (dto.DateOfBirth ?? string.Empty).Trim();

            if
            (
                dob.Length > 0
            )
            {
                if
                (
                    !DateOnly.TryParseExact(
                        dob,
                        "yyyy-MM-dd",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out DateOnly parsed)
                )
                {
                    throw new InvalidOperationException(
                        "Date of Birth is not a valid date.");
                }

                if
                (
                    parsed > DateOnly.FromDateTime(DateTime.Today)
                )
                {
                    throw new InvalidOperationException(
                        "Date of Birth cannot be in the future.");
                }

                if
                (
                    parsed.Year < 1900
                )
                {
                    throw new InvalidOperationException(
                        "Date of Birth is too far in the past.");
                }

                dateOfBirth =
                    parsed;
            }
        }

        if
        (
            dto.CreditLimit < 0
            ||
            dto.CreditLimit > MaxAmount
        )
        {
            throw new InvalidOperationException(
                "Credit Limit must be 0 or more (0 = cash only).");
        }

        return new CustomerInput
        {
            CustomerType = customerType,

            CustomerName = name,

            FatherName =
                inbound
                    ? Upper(CheckText(dto.FatherName, "Father's Name", MaxNameLength, false))
                    : string.Empty,

            MotherName =
                inbound
                    ? Upper(CheckText(dto.MotherName, "Mother's Name", MaxNameLength, false))
                    : string.Empty,

            DateOfBirth = dateOfBirth,

            Phone1 = phone1,

            Phone2 = phone2,

            Email = email,

            NidNo = nid,

            DrivingLicenseNo =
                inbound
                    ? CheckText(dto.DrivingLicenseNo, "Driving License No", 30, false)
                    : string.Empty,

            PresentAddress =
                Upper(CheckText(dto.PresentAddress, "Present Address", MaxAddressLength, inbound)),

            PermanentAddress =
                inbound
                    ? Upper(CheckText(dto.PermanentAddress, "Permanent Address", MaxAddressLength, false))
                    : string.Empty,

            RegistrationAddress =
                inbound
                    ? Upper(CheckText(dto.RegistrationAddress, "Registration Address", MaxAddressLength, false))
                    : string.Empty,

            LocationId =
                dto.LocationId.HasValue && dto.LocationId.Value > 0
                    ? dto.LocationId.Value
                    : null,

            CreditLimit =
                Math.Round(dto.CreditLimit, 2),

            Remarks =
                (dto.Remarks ?? string.Empty).Trim()
        };
    }


    //===========================================================
    // Location check
    //
    // Must be a live location. A new choice must be active; an
    // unchanged one may have been deactivated since.
    //===========================================================

    private async Task
        CheckLocationAsync
        (
            long? locationId,
            long? savedLocationId
        )
    {
        if
        (
            !locationId.HasValue
        )
        {
            return;
        }

        LocationEntity? location =
            await _context
                .Set<LocationEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.LocationId ==
                        locationId.Value
                        &&
                        !x.IsDeleted
                );

        if
        (
            location == null
        )
        {
            throw new InvalidOperationException(
                "The selected Location was not found or is deleted.");
        }

        if
        (
            !location.IsActive
            &&
            locationId != savedLocationId
        )
        {
            throw new InvalidOperationException(
                $"Location '{location.DisplayName}' is inactive. Select another location.");
        }
    }


    //===========================================================
    // Unique Phone 1 (all live customers) / NID (live Inbound)
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string phone1,
            string nidNo,
            string customerType,
            long currentId
        )
    {
        CustomerEntity? samePhone =
            await _context
                .Set<CustomerEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.CustomerId != currentId
                        &&
                        x.Phone1 == phone1
                );

        if
        (
            samePhone != null
        )
        {
            throw new InvalidOperationException(
                $"Phone 1 {phone1} already belongs to {samePhone.CustomerName} ({samePhone.CustomerCode}).");
        }

        if
        (
            customerType == InboundType
            &&
            nidNo.Length > 0
        )
        {
            CustomerEntity? sameNid =
                await _context
                    .Set<CustomerEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            x.CustomerId != currentId
                            &&
                            x.CustomerType == InboundType
                            &&
                            x.NidNo == nidNo
                    );

            if
            (
                sameNid != null
            )
            {
                throw new InvalidOperationException(
                    $"NID No {nidNo} already belongs to {sameNid.CustomerName} ({sameNid.CustomerCode}).");
            }
        }
    }


    //===========================================================
    // Customer Codes (CIB-000001 / COS-000001, central CodeGenerator)
    //===========================================================

    // Every code ever used : current and previous codes, deleted
    // rows included (never reused)
    private async Task<List<string>>
        AllCustomerCodesAsync()
    {
        List<string> codes =
            await _context
                .Set<CustomerEntity>()
                .AsNoTracking()
                .Select
                (
                    x =>
                        x.CustomerCode
                )
                .ToListAsync();

        // Separate query : EF cannot translate an array projection
        codes.AddRange(
            await _context
                .Set<CustomerEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.PreviousCode != ""
                )
                .Select
                (
                    x =>
                        x.PreviousCode
                )
                .ToListAsync());

        return codes;
    }


    private static string NextCustomerCode
    (
        string customerType,
        IEnumerable<string> existingCodes
    )
    {
        string prefix =
            customerType == InboundType
                ? InboundPrefix
                : OutsidePrefix;

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

        return customerType == InboundType
            ? CodeGenerator.GenerateInboundCustomerCode(highest + 1)
            : CodeGenerator.GenerateOutsideCustomerCode(highest + 1);
    }


    // "SUB-002-002-005" -> 5
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
    // Ledger parent : SUB-002-002-005 Trade Receivables (by code)
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
                        ReceivableSubGroupCode
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
                $"Receivable account sub group {ReceivableSubGroupCode} (Trade Receivables) " +
                "was not found or is deleted. Customer ledgers are created under it.");
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
    // the sub group or any customer (deleted included) + 1.
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
                .Set<CustomerEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ReceivableLedgerCode != ""
                )
                .Select
                (
                    x =>
                        x.ReceivableLedgerCode
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
    // Sync Ledger (create when missing, follow the customer)
    //===========================================================

    private async Task
        SyncLedgerAsync
        (
            CustomerEntity entity,
            LedgerParent parent,
            long userId
        )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                entity.ReceivableLedgerCode)
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
                        entity.ReceivableLedgerCode
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
                        LedgerCode = entity.ReceivableLedgerCode,
                        LedgerName = entity.ReceivableLedgerName,
                        Remarks = $"System generated from Customer Profiles {entity.CustomerCode} (receivable).",
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
                $"General Ledger '{entity.ReceivableLedgerCode}' belongs to a different sub group.");
        }

        if
        (
            ledger.LedgerName == entity.ReceivableLedgerName
            &&
            ledger.IsActive == entity.IsActive
        )
        {
            return;
        }

        ledger.LedgerName =
            entity.ReceivableLedgerName;

        ledger.IsActive =
            entity.IsActive;

        ledger.ModifiedBy =
            userId;

        ledger.ModifiedDate =
            DateTime.UtcNow;
    }


    //===========================================================
    // Apply validated input to the entity
    //===========================================================

    private static void Apply
    (
        CustomerEntity entity,
        CustomerInput input,
        bool isActive
    )
    {
        entity.CustomerType = input.CustomerType;
        entity.CustomerName = input.CustomerName;
        entity.DisplayName = BuildDisplayName(input.CustomerName, input.Phone1);
        entity.FatherName = input.FatherName;
        entity.MotherName = input.MotherName;
        entity.DateOfBirth = input.DateOfBirth;
        entity.Phone1 = input.Phone1;
        entity.Phone2 = input.Phone2;
        entity.Email = input.Email;
        entity.NidNo = input.NidNo;
        entity.DrivingLicenseNo = input.DrivingLicenseNo;
        entity.PresentAddress = input.PresentAddress;
        entity.PermanentAddress = input.PermanentAddress;
        entity.RegistrationAddress = input.RegistrationAddress;
        entity.LocationId = input.LocationId;
        entity.ReceivableLedgerName = entity.DisplayName;
        entity.CreditLimit = input.CreditLimit;
        entity.Remarks = input.Remarks;
        entity.IsActive = isActive;
    }


    //===========================================================
    // Create
    //
    // Code, Display Name and ledger are always built here; the
    // form's values are only a preview. The photo is uploaded
    // separately once the customer exists.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateCustomerProfilesDto dto,
            long userId
        )
    {
        CustomerInput input =
            ValidateInput(
                dto);

        await CheckLocationAsync(
            input.LocationId,
            null);

        await EnsureUniqueAsync(
            input.Phone1,
            input.NidNo,
            input.CustomerType,
            0);

        LedgerParent parent =
            await ResolveLedgerParentAsync();

        CustomerEntity entity =
            new CustomerEntity
            {
                CustomerCode =
                    NextCustomerCode(
                        input.CustomerType,
                        await AllCustomerCodesAsync()),

                PreviousCode =
                    string.Empty,

                PhotoPath =
                    string.Empty,

                ReceivableLedgerCode =
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
            dto.IsActive);


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        _context
            .Set<CustomerEntity>()
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

        return entity.CustomerId;
    }


    //===========================================================
    // Update
    //
    // Code is locked, except an Outside -> Inbound conversion,
    // which assigns a new CIB code (old code -> PreviousCode).
    // Inbound -> Outside is refused. The ledger follows the
    // Display Name and the active state.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateCustomerProfilesDto dto,
            long userId
        )
    {
        CustomerEntity? entity =
            await _context
                .Set<CustomerEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.CustomerId ==
                        dto.CustomerId
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Customer not found.");
        }

        CustomerInput input =
            ValidateInput(
                AsCreate(dto));

        bool converting =
            entity.CustomerType == OutsideType
            &&
            input.CustomerType == InboundType;

        if
        (
            entity.CustomerType == InboundType
            &&
            input.CustomerType == OutsideType
        )
        {
            throw new InvalidOperationException(
                "An Inbound customer cannot be changed to Outside.");
        }

        await CheckLocationAsync(
            input.LocationId,
            entity.LocationId);

        await EnsureUniqueAsync(
            input.Phone1,
            input.NidNo,
            input.CustomerType,
            entity.CustomerId);

        LedgerParent parent =
            await ResolveLedgerParentAsync();

        string oldCode =
            entity.CustomerCode;

        if
        (
            converting
        )
        {
            entity.CustomerCode =
                NextCustomerCode(
                    InboundType,
                    await AllCustomerCodesAsync());

            entity.PreviousCode =
                oldCode;
        }

        Apply(
            entity,
            input,
            dto.IsActive);

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        if
        (
            string.IsNullOrWhiteSpace(
                entity.ReceivableLedgerCode)
        )
        {
            entity.ReceivableLedgerCode =
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

        if
        (
            converting
        )
        {
            AddHistory(
                entity,
                "Update",
                $"Converted from Outside ({oldCode}) to Inbound",
                userId);
        }
        else
        {
            AddHistory(
                entity,
                "Update",
                "Updated",
                userId);
        }

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Photo Path (returns the old path so the file can be removed)
    //===========================================================

    public async Task<string>
        SetPhotoPathAsync
        (
            long id,
            string photoPath,
            long userId
        )
    {
        CustomerEntity? entity =
            await _context
                .Set<CustomerEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.CustomerId ==
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
                "Customer not found.");
        }

        string oldPath =
            entity.PhotoPath ?? string.Empty;

        entity.PhotoPath =
            photoPath ?? string.Empty;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return oldPath;
    }


    //===========================================================
    // Delete (customer + its ledger)
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
        CustomerEntity? entity =
            await _context
                .Set<CustomerEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.CustomerId ==
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
                "Customer not found.");
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
                        entity.ReceivableLedgerCode
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
    // Restore (most recently deleted customer + its ledger)
    //
    // Blocked (409) while its Phone 1 / NID is taken by another
    // customer or the receivable sub group is gone.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        CustomerEntity? entity =
            await _context
                .Set<CustomerEntity>()
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
                entity.Phone1,
                entity.NidNo,
                entity.CustomerType,
                entity.CustomerId);

            parent =
                await ResolveLedgerParentAsync();
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Customer '{entity.DisplayName}' cannot be restored. {ex.Message}");
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
                        entity.ReceivableLedgerCode
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

        // A deleted location is dropped from the restored customer
        if
        (
            entity.LocationId.HasValue
            &&
            !await _context
                .Set<LocationEntity>()
                .AnyAsync
                (
                    x =>
                        x.LocationId ==
                        entity.LocationId.Value
                        &&
                        !x.IsDeleted
                )
        )
        {
            entity.LocationId =
                null;
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
    // Activity History
    //===========================================================

    private void AddHistory
    (
        CustomerEntity entity,
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
                    "Customer Profiles",

                EntityId =
                    entity.CustomerId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    activityType == "Update" && verb.StartsWith("Converted")
                        ? "Customer Converted"
                        : $"Customer {verb}",

                ActivityDescription =
                    verb.StartsWith("Converted")
                        ? $"Customer '{entity.DisplayName}' {verb} as {entity.CustomerCode}."
                        : $"Customer '{entity.DisplayName}' ({entity.CustomerCode}) {verb.ToLower()}.",

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
            .Set<CustomerEntity>()
            .AnyAsync
            (
                x =>
                    x.CustomerId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}