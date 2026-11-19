//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.Paging;
using AppCore.Infrastructure.Persistence.Paging;

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.Company.DTOs;
using AppCore.Application.Platform.Tenancy;

using CompanyEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Company;

using WingEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Wings;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.GeneralSettings;


//===============================================================
// Company Repository
//===============================================================

public class CompanyRepository : ICompanyRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;

    // Tenancy : the company limit of this client (set in the Console)
    private readonly ITenantLimits _limits;


    //===========================================================
    // Constructor
    //===========================================================

    public CompanyRepository(
        AppDbContext context,
        ITenantLimits limits)
    {
        _context =
            context;

        _limits =
            limits;
    }


    //===========================================================
    // Company Limit (Console : Tenants.MaxCompanies)
    //
    // The client makes and edits his own company here; the
    // Console only says how many he may have (1 by default).
    // No tenant found : no check.
    //===========================================================

    private async Task EnsureCompanyLimitAsync()
    {
        string? message =
            await GetLimitMessageAsync();

        if (message is not null)
        {
            throw new InvalidOperationException(message);
        }
    }


    // null while one more company may be added, else the message
    // One company per client (owner 2026-11-20 : the ERP is not
    // ready for several companies). Applies everywhere, also where
    // no tenant is found (development); a Console limit can only
    // make it smaller, never larger, until multi-company is ready.
    private const int MaxCompaniesPerClient = 1;

    public async Task<string?> GetLimitMessageAsync()
    {
        int? consoleLimit =
            (await _limits.GetAsync())?.MaxCompanies;

        int? limit =
            Math.Min(consoleLimit ?? MaxCompaniesPerClient, MaxCompaniesPerClient);

        int count =
            await _context
                .Set<CompanyEntity>()
                .AsNoTracking()
                .CountAsync(x => !x.IsDeleted);

        return count >= limit.Value
            ? "AppCore runs one company per client, and it already exists. " +
              "Open the existing company to change its details."
            : null;
    }


    //===========================================================
    // Default Wings of a new company
    //
    // Every company starts with its three wings, numbered the way
    // the working-branch rule reads them : WNG-<company>-01 Sales
    // Center, -02 Service Center, -03 Accessory Shop. The client
    // then makes his branches under them (each branch brings its
    // own warehouse).
    //===========================================================

    private static readonly string[] DefaultWingNames =
    [
        "Sales Center",
        "Service Center",
        "Accessory Shop"
    ];


    private async Task<List<WingEntity>> AddDefaultWingsAsync
        (
            CompanyEntity company,

            long userId
        )
    {
        List<WingEntity> wings =
            new();

        string sequence =
            (company.CompanyCode ?? string.Empty)
                .Trim()
                .Replace("CMP-", "", StringComparison.OrdinalIgnoreCase);

        // a hand-typed code that is not CMP-<number> : no default wings
        if (!int.TryParse(sequence, out int companySequenceNo) || companySequenceNo < 1)
        {
            return wings;
        }

        for (int i = 0; i < DefaultWingNames.Length; i++)
        {
            string wingCode =
                CodeGenerator.GenerateWingCode(companySequenceNo, i + 1);

            // wing codes are unique in the table (deleted rows too)
            bool taken =
                await _context
                    .Set<WingEntity>()
                    .AsNoTracking()
                    .AnyAsync(x => x.WingCode == wingCode);

            if (taken)
            {
                continue;
            }

            WingEntity wing =
                new WingEntity
                {
                    CompanyId = company.CompanyId,
                    WingCode = wingCode,
                    WingName = DefaultWingNames[i],
                    Remarks = string.Empty,
                    IsActive = true,
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                };

            _context.Set<WingEntity>().Add(wing);

            wings.Add(wing);
        }

        if (wings.Count > 0)
        {
            await _context.SaveChangesAsync();
        }

        return wings;
    }


    //===========================================================
    // Company Query
    //===========================================================

    private IQueryable<CompanyDto> CompanyQuery()
    {
        return _context
            .Set<CompanyEntity>()

            .AsNoTracking()

            .Where
            (
                x =>
                    !x.IsDeleted
            )

            .Select
            (
                x =>
                    new CompanyDto
                    {
                        CompanyId =
                            x.CompanyId,

                        PublicId =
                            x.PublicId,

                        CompanyCode =
                            x.CompanyCode,

                        CompanyName =
                            x.CompanyName,

                        CompanyShortName =
                            x.CompanyShortName,


                        //===================================================
                        // Address & Contact Information
                        //===================================================

                        AddressLine1 =
                            x.AddressLine1,

                        AddressLine2 =
                            x.AddressLine2,

                        Phone =
                            x.Phone,

                        Mobile =
                            x.Mobile,

                        Email =
                            x.Email,

                        Website =
                            x.Website,


                        //===================================================
                        // Business Information
                        //===================================================

                        BINNo =
                            x.BINNo,

                        OwnershipType =
                            x.OwnershipType,

                        EconomicActivity =
                            x.EconomicActivity,

                        TINNo =
                            x.TINNo,

                        TradeLicenseNo =
                            x.TradeLicenseNo,


                        //===================================================
                        // Configuration
                        //===================================================

                        CompanyLogoPath =
                            x.CompanyLogoPath,

                        Remarks =
                            x.Remarks,


                        //===================================================
                        // Status
                        //===================================================

                        IsActive =
                            x.IsActive,

                        IsDeleted =
                            x.IsDeleted,


                        //===================================================
                        // Soft Delete
                        //===================================================

                        DeletedBy =
                            x.DeletedBy,

                        DeletedDate =
                            x.DeletedDate,


                        //===================================================
                        // Audit
                        //===================================================

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
    // List Page (server paging)
    //
    // Search : every word must match one of the list's columns
    // Counts : Total · Active · Inactive (search + filters, not
    //          the status filter)
    //===========================================================

    private SortMap<CompanyDto> ListSorts()
    {
        return new SortMap<CompanyDto>("CompanyCode")
            .Add("CompanyCode", x => x.CompanyCode)
            .Add("CompanyName", x => x.CompanyName)
            .Add("CompanyShortName", x => x.CompanyShortName)
            .Add("Phone", x => x.Phone)
            .Add("Mobile", x => x.Mobile)
            .Add("Email", x => x.Email)
            .Add("IsActive", x => x.IsActive)
            .Tie(x => x.CompanyId);
    }


    public async Task<PagedResult<CompanyDto>> GetPagedAsync(
        GeneralSettingsPageRequest request)
    {
        IQueryable<CompanyDto> query =
            CompanyQuery();

        foreach
        (
            string word in request.SafeSearch
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        )
        {
            string like =
                PagingQuery.LikePattern(word);

            query =
                query.Where(
                    x =>
                        EF.Functions.ILike(x.CompanyCode ?? string.Empty, like)
                        ||
                        EF.Functions.ILike(x.CompanyName ?? string.Empty, like)
                        ||
                        EF.Functions.ILike(x.CompanyShortName ?? string.Empty, like)
                        ||
                        EF.Functions.ILike(x.Phone ?? string.Empty, like)
                        ||
                        EF.Functions.ILike(x.Mobile ?? string.Empty, like)
                        ||
                        EF.Functions.ILike(x.Email ?? string.Empty, like)
                        ||
                        EF.Functions.ILike(x.Website ?? string.Empty, like)
                        ||
                        EF.Functions.ILike(x.BINNo ?? string.Empty, like)
                        ||
                        EF.Functions.ILike(x.TINNo ?? string.Empty, like)
                        ||
                        EF.Functions.ILike(x.Remarks ?? string.Empty, like));
        }



        // Summary counts (before the status filter)
        var statusCounts =
            await query
                .GroupBy(x => x.IsActive)
                .Select(g => new { Active = g.Key, Count = g.Count() })
                .ToListAsync();

        int activeCount =
            statusCounts.Where(x => x.Active).Sum(x => x.Count);

        int inactiveCount =
            statusCounts.Where(x => !x.Active).Sum(x => x.Count);

        string status =
            (request.Status ?? string.Empty).Trim().ToLowerInvariant();

        if (status == "active")
        {
            query = query.Where(x => x.IsActive);
        }
        else if (status == "inactive")
        {
            query = query.Where(x => !x.IsActive);
        }

        int total =
            await query.CountAsync();

        PagingQuery.FitPage(request, total);

        List<CompanyDto> items =
            await ListSorts()
                .Apply(query, request)
                .Page(request)
                .ToListAsync();

        PagedResult<CompanyDto> result = new()
        {
            Items = items,
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize
        };

        result.Counts["Total"] = activeCount + inactiveCount;
        result.Counts["Active"] = activeCount;
        result.Counts["Inactive"] = inactiveCount;

        return result;
    }



    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<CompanyDto>>
        GetAllAsync()
    {
        return await CompanyQuery()

            .OrderBy
            (
                x =>
                    x.CompanyCode
            )

            .ToListAsync();
    }


    //===========================================================
    // Public Id -> internal id (live rows only)
    //===========================================================

    public async Task<long?>
        GetIdByPublicIdAsync
        (
            Guid publicId
        )
    {
        if
        (
            publicId == Guid.Empty
        )
        {
            return null;
        }

        return await _context
            .Set<CompanyEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.PublicId == publicId)
            .Select(x => (long?)x.CompanyId)
            .FirstOrDefaultAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<CompanyDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await CompanyQuery()

            .FirstOrDefaultAsync
            (
                x =>
                    x.CompanyId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync()
    {
        List<string> existingCodes =
            await _context
                .Set<CompanyEntity>()

                .AsNoTracking()

                .Where
                (
                    x =>
                        !x.IsDeleted
                )

                .Select
                (
                    x =>
                        x.CompanyCode
                )

                .ToListAsync();


        int nextSequenceNo =
            1;


        while
        (
            existingCodes.Any
            (
                x =>
                    string.Equals
                    (
                        x,

                        CodeGenerator.GenerateCompanyCode(
                            nextSequenceNo),

                        StringComparison.OrdinalIgnoreCase
                    )
            )
        )
        {
            nextSequenceNo++;
        }


        return CodeGenerator.GenerateCompanyCode(
            nextSequenceNo);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<CompanyDefaultsDto>
        GetDefaultsAsync()
    {
        return new CompanyDefaultsDto
        {
            Code =
                await GetNextCodeAsync()
        };
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateCompanyDto dto,

            long userId
        )
    {
        await EnsureCompanyLimitAsync();


        string companyCode =
            dto.CompanyCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(companyCode)
        )
        {
            companyCode =
                await GetNextCodeAsync();
        }


        CompanyEntity entity =
            new CompanyEntity
            {
                CompanyCode =
                    companyCode,

                CompanyName =
                    dto.CompanyName?.Trim()
                    ??
                    string.Empty,

                CompanyShortName =
                    dto.CompanyShortName?.Trim()
                    ??
                    string.Empty,


                //=======================================================
                // Address & Contact Information
                //=======================================================

                AddressLine1 =
                    dto.AddressLine1?.Trim()
                    ??
                    string.Empty,

                AddressLine2 =
                    dto.AddressLine2?.Trim()
                    ??
                    string.Empty,

                Phone =
                    dto.Phone?.Trim()
                    ??
                    string.Empty,

                Mobile =
                    dto.Mobile?.Trim()
                    ??
                    string.Empty,

                Email =
                    dto.Email?.Trim()
                    ??
                    string.Empty,

                Website =
                    dto.Website?.Trim()
                    ??
                    string.Empty,


                //=======================================================
                // Business Information
                //=======================================================

                BINNo =
                    dto.BINNo?.Trim()
                    ??
                    string.Empty,

                OwnershipType =
                    dto.OwnershipType?.Trim()
                    ??
                    string.Empty,

                EconomicActivity =
                    dto.EconomicActivity?.Trim()
                    ??
                    string.Empty,

                TINNo =
                    dto.TINNo?.Trim()
                    ??
                    string.Empty,

                TradeLicenseNo =
                    dto.TradeLicenseNo?.Trim()
                    ??
                    string.Empty,


                //=======================================================
                // Configuration
                //=======================================================

                CompanyLogoPath =
                    dto.CompanyLogoPath?.Trim()
                    ??
                    string.Empty,

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty,


                //=======================================================
                // Status
                //=======================================================

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };


        // company and its three wings are saved together or not at all
        await using var transaction =
            await _context.Database.BeginTransactionAsync();


        _context
            .Set<CompanyEntity>()
            .Add(
                entity
            );


        await _context.SaveChangesAsync();


        //===========================================================
        // Default Wings
        //===========================================================

        List<WingEntity> defaultWings =
            await AddDefaultWingsAsync(entity, userId);

        foreach (WingEntity wing in defaultWings)
        {
            _context.ActivityHistories.Add(
                new ActivityHistory
                {
                    Module = "General Settings",
                    EntityName = "Wing",
                    EntityId = wing.WingId,
                    ActivityType = "Create",
                    ActivityTitle = "Wing Created",
                    ActivityDescription = $"Wing '{wing.WingName}' created with company '{entity.CompanyName}'.",
                    PerformedBy = userId,
                    PerformedByName = "System",
                    PerformedDate = DateTime.UtcNow
                }
            );
        }


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(

            new ActivityHistory
            {
                Module =
                    "General Settings",

                EntityName =
                    "Company",

                EntityId =
                    entity.CompanyId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Company Created",

                ActivityDescription =
                    $"Company '{entity.CompanyName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();

        await transaction.CommitAsync();


        return entity.CompanyId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateCompanyDto dto,

            long userId
        )
    {
        CompanyEntity? entity =

            await _context
                .Set<CompanyEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.CompanyId ==
                        dto.CompanyId

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
                "Company not found."
            );
        }


        //===========================================================
        // Company Code : fixed once wings exist
        //
        // Wing and branch codes are built from the company
        // (WNG-<company>-<wing>, BRN-<company>-<wing>-<n>).
        //===========================================================

        string newCompanyCode =
            dto.CompanyCode?.Trim()
            ??
            string.Empty;

        if
        (
            !string.Equals(newCompanyCode, entity.CompanyCode, StringComparison.OrdinalIgnoreCase)
            &&
            await _context
                .Set<WingEntity>()
                .AsNoTracking()
                .AnyAsync(x => x.CompanyId == entity.CompanyId && !x.IsDeleted)
        )
        {
            throw new InvalidOperationException(
                "The Company Code cannot be changed after wings are created under this company."
            );
        }


        //===========================================================
        // The only active company cannot be made inactive
        // (login page, top bar and every print take their name
        // and logo from it)
        //===========================================================

        if
        (
            entity.IsActive
            &&
            !dto.IsActive
            &&
            !await _context
                .Set<CompanyEntity>()
                .AsNoTracking()
                .AnyAsync(x => x.CompanyId != entity.CompanyId && !x.IsDeleted && x.IsActive)
        )
        {
            throw new InvalidOperationException(
                "This is the only active company; it cannot be made inactive."
            );
        }


        entity.CompanyCode =
            newCompanyCode;


        entity.CompanyName =
            dto.CompanyName?.Trim()
            ??
            string.Empty;


        entity.CompanyShortName =
            dto.CompanyShortName?.Trim()
            ??
            string.Empty;


        //===========================================================
        // Address & Contact Information
        //===========================================================

        entity.AddressLine1 =
            dto.AddressLine1?.Trim()
            ??
            string.Empty;


        entity.AddressLine2 =
            dto.AddressLine2?.Trim()
            ??
            string.Empty;


        entity.Phone =
            dto.Phone?.Trim()
            ??
            string.Empty;


        entity.Mobile =
            dto.Mobile?.Trim()
            ??
            string.Empty;


        entity.Email =
            dto.Email?.Trim()
            ??
            string.Empty;


        entity.Website =
            dto.Website?.Trim()
            ??
            string.Empty;


        //===========================================================
        // Business Information
        //===========================================================

        entity.BINNo =
            dto.BINNo?.Trim()
            ??
            string.Empty;


        entity.OwnershipType =
            dto.OwnershipType?.Trim()
            ??
            string.Empty;


        entity.EconomicActivity =
            dto.EconomicActivity?.Trim()
            ??
            string.Empty;


        entity.TINNo =
            dto.TINNo?.Trim()
            ??
            string.Empty;


        entity.TradeLicenseNo =
            dto.TradeLicenseNo?.Trim()
            ??
            string.Empty;


        //===========================================================
        // Configuration
        //===========================================================

        entity.CompanyLogoPath =
            dto.CompanyLogoPath?.Trim()
            ??
            string.Empty;


        entity.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;


        //===========================================================
        // Status
        //===========================================================

        entity.IsActive =
            dto.IsActive;


        entity.ModifiedBy =
            userId;


        entity.ModifiedDate =
            DateTime.UtcNow;


        await _context.SaveChangesAsync();


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(

            new ActivityHistory
            {
                Module =
                    "General Settings",

                EntityName =
                    "Company",

                EntityId =
                    entity.CompanyId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Company Updated",

                ActivityDescription =
                    $"Company '{entity.CompanyName}' updated.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();
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
        //===========================================================
        // Resolve Company
        //===========================================================

        CompanyEntity? entity =

            await _context
                .Set<CompanyEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.CompanyId ==
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
                "Company not found."
            );
        }


        //===========================================================
        // Dependency Check : Wings
        //
        // A soft delete is an UPDATE, so the database foreign key
        // never fires. Block the delete here while any
        // non-deleted Wing still belongs to this Company.
        //===========================================================

        int wingCount =
            await _context
                .Set<WingEntity>()

                .AsNoTracking()

                .CountAsync
                (
                    x =>

                        x.CompanyId ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            wingCount >
            0
        )
        {
            throw new InvalidOperationException(
                $"Company '{entity.CompanyName}' cannot be deleted because " +
                $"{wingCount} wing(s) are created under it. " +
                "Delete those wings first."
            );
        }


        //===========================================================
        // The last company cannot be deleted
        //===========================================================

        bool hasAnother =
            await _context
                .Set<CompanyEntity>()
                .AsNoTracking()
                .AnyAsync(x => x.CompanyId != id && !x.IsDeleted);

        if
        (
            !hasAnother
        )
        {
            throw new InvalidOperationException(
                $"Company '{entity.CompanyName}' is the only company; it cannot be deleted. " +
                "Open it to change its details instead."
            );
        }


        //===========================================================
        // Soft Delete Company
        //===========================================================

        entity.IsDeleted =
            true;


        entity.DeletedBy =
            userId;


        entity.DeletedDate =
            DateTime.UtcNow;


        await _context.SaveChangesAsync();


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(

            new ActivityHistory
            {
                Module =
                    "General Settings",

                EntityName =
                    "Company",

                EntityId =
                    entity.CompanyId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Company Deleted",

                ActivityDescription =
                    $"Company '{entity.CompanyName}' deleted.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        CompanyEntity? entity =

            await _context
                .Set<CompanyEntity>()

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


        await EnsureCompanyLimitAsync();


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


        await _context.SaveChangesAsync();


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(

            new ActivityHistory
            {
                Module =
                    "General Settings",

                EntityName =
                    "Company",

                EntityId =
                    entity.CompanyId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Company Restored",

                ActivityDescription =
                    $"Company '{entity.CompanyName}' restored.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


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
            .Set<CompanyEntity>()

            .AnyAsync
            (
                x =>

                    x.CompanyId ==
                    id

                    &&

                    !x.IsDeleted
            );
    }
}