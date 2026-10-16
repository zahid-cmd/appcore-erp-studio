//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.FinancialYears.DTOs;

using FinancialYearsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.FinancialYears;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.GeneralSettings;


//===============================================================
// Financial Years Repository
//===============================================================

public class FinancialYearsRepository : IFinancialYearsRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "General Settings";

    private const string EntityName =
        "FinancialYear";

    // Code : FY-0001
    private const string CodePrefix =
        "FY";

    private const int CodeDigits =
        4;

    // Name : FY 2026-2027 / FY 2026
    private const string NamePrefix =
        "FY";

    // Default financial year : July – June
    private const int DefaultStartMonth =
        7;

    private const int DefaultYearMonths =
        12;

    private const int MaxYearMonths =
        18;

    private const int RemarksMaxLength =
        1000;

    private const string StatusOpen =
        "Open";

    private const string StatusClosed =
        "Closed";

    private const string StatusLocked =
        "Locked";

    private static readonly string[] AllowedYearStatuses =
    [
        StatusOpen,
        StatusClosed,
        StatusLocked
    ];


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public FinancialYearsRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Normalized Input
    //===========================================================

    private sealed class YearInput
    {
        public string FinancialYearName { get; set; } = string.Empty;

        public DateOnly StartDate { get; set; }

        public DateOnly EndDate { get; set; }

        public bool IsCurrent { get; set; }

        public string YearStatus { get; set; } = StatusOpen;

        public string Remarks { get; set; } = string.Empty;

        public bool Status { get; set; }
    }


    //===========================================================
    // Financial Years Query
    //===========================================================

    private IQueryable<FinancialYearsDto> FinancialYearsQuery()
    {
        return _context
            .Set<FinancialYearsEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .Select
            (
                x =>
                    new FinancialYearsDto
                    {
                        FinancialYearId =
                            x.FinancialYearId,

                        FinancialYearCode =
                            x.FinancialYearCode,

                        FinancialYearName =
                            x.FinancialYearName,

                        StartDate =
                            x.StartDate,

                        EndDate =
                            x.EndDate,

                        IsCurrent =
                            x.IsCurrent,

                        YearStatus =
                            x.YearStatus,

                        Remarks =
                            x.Remarks,

                        Status =
                            x.Status,

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
    // Get All (newest year first)
    //===========================================================

    public async Task<List<FinancialYearsDto>>
        GetAllAsync()
    {
        return await FinancialYearsQuery()
            .OrderByDescending(x => x.StartDate)
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<FinancialYearsDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await FinancialYearsQuery()
            .FirstOrDefaultAsync(x => x.FinancialYearId == id);
    }


    //===========================================================
    // Get Current
    //===========================================================

    public async Task<FinancialYearsDto?>
        GetCurrentAsync()
    {
        return await FinancialYearsQuery()
            .FirstOrDefaultAsync(x => x.IsCurrent);
    }


    //===========================================================
    // Get Next Code
    //
    // Deleted rows are included, because the unique index on
    // FinancialYearCode covers them too. A code is never reused.
    //===========================================================

    public async Task<string>
        GetNextCodeAsync()
    {
        List<string> existingCodes =
            await _context
                .Set<FinancialYearsEntity>()
                .AsNoTracking()
                .Select(x => x.FinancialYearCode)
                .ToListAsync();

        int highest = 0;

        foreach (string code in existingCodes)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                continue;
            }

            string[] parts =
                code.Split('-', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length != 2)
            {
                continue;
            }

            if (!string.Equals(parts[0].Trim(), CodePrefix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (int.TryParse(parts[1].Trim(), out int sequenceNo) && sequenceNo > highest)
            {
                highest = sequenceNo;
            }
        }

        return $"{CodePrefix}-{(highest + 1).ToString().PadLeft(CodeDigits, '0')}";
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<FinancialYearsDefaultsDto>
        GetDefaultsAsync()
    {
        DateOnly? latestEnd =
            await _context
                .Set<FinancialYearsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.EndDate)
                .Select(x => (DateOnly?)x.EndDate)
                .FirstOrDefaultAsync();

        DateOnly start;

        if (latestEnd.HasValue)
        {
            start =
                latestEnd.Value.AddDays(1);
        }
        else
        {
            DateOnly today =
                DateOnly.FromDateTime(DateTime.Today);

            int year =
                today.Month >= DefaultStartMonth
                    ? today.Year
                    : today.Year - 1;

            start =
                new DateOnly(year, DefaultStartMonth, 1);
        }

        DateOnly end =
            start.AddMonths(DefaultYearMonths).AddDays(-1);

        bool hasCurrent =
            await _context
                .Set<FinancialYearsEntity>()
                .AnyAsync(x => !x.IsDeleted && x.IsCurrent);

        return new FinancialYearsDefaultsDto
        {
            Code =
                await GetNextCodeAsync(),

            Name =
                BuildFinancialYearName(start, end),

            StartDate =
                start,

            EndDate =
                end,

            IsCurrent =
                !hasCurrent
        };
    }


    //===========================================================
    // Build Financial Year Name
    //===========================================================

    private static string BuildFinancialYearName
    (
        DateOnly start,
        DateOnly end
    )
    {
        return start.Year == end.Year
            ? $"{NamePrefix} {start.Year}"
            : $"{NamePrefix} {start.Year}-{end.Year}";
    }


    //===========================================================
    // Months Covered (start and end inclusive)
    //
    // 2026-07-01 → 2027-06-30 = 12
    //===========================================================

    private static int MonthsCovered
    (
        DateOnly start,
        DateOnly end
    )
    {
        DateOnly next =
            end.AddDays(1);

        return (next.Year - start.Year) * 12
            + (next.Month - start.Month);
    }


    //===========================================================
    // Normalize Year Status
    //===========================================================

    private static string NormalizeYearStatus
    (
        string? value
    )
    {
        string status =
            (value ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(status))
        {
            return StatusOpen;
        }

        string? match =
            AllowedYearStatuses.FirstOrDefault
            (
                x =>
                    string.Equals(x, status, StringComparison.OrdinalIgnoreCase)
            );

        if (match == null)
        {
            throw new InvalidOperationException(
                "Year Status must be Open, Closed or Locked.");
        }

        return match;
    }


    //===========================================================
    // Normalize & Validate Input
    //===========================================================

    private async Task<YearInput>
        NormalizeInputAsync
        (
            DateOnly startDate,
            DateOnly endDate,
            bool isCurrent,
            string? yearStatus,
            string? remarks,
            bool status,
            long? excludeId
        )
    {
        //=======================================================
        // Dates
        //=======================================================

        if (startDate == default)
        {
            throw new InvalidOperationException(
                "Start Date is required.");
        }

        if (endDate == default)
        {
            throw new InvalidOperationException(
                "End Date is required.");
        }

        if (endDate <= startDate)
        {
            throw new InvalidOperationException(
                "End Date must be after Start Date.");
        }

        int months =
            MonthsCovered(startDate, endDate);

        if (months < 1 || months > MaxYearMonths)
        {
            throw new InvalidOperationException(
                $"A financial year must be between 1 and {MaxYearMonths} months long.");
        }

        //=======================================================
        // Year Status & Current
        //=======================================================

        string normalizedStatus =
            NormalizeYearStatus(yearStatus);

        if (isCurrent && normalizedStatus != StatusOpen)
        {
            throw new InvalidOperationException(
                "Only an Open year can be the current year.");
        }

        //=======================================================
        // Remarks
        //=======================================================

        string cleanRemarks =
            remarks?.Trim()
            ??
            string.Empty;

        if (cleanRemarks.Length > RemarksMaxLength)
        {
            throw new InvalidOperationException(
                $"Remarks cannot be longer than {RemarksMaxLength} characters.");
        }

        //=======================================================
        // Name (generated) & Duplicates
        //=======================================================

        string name =
            BuildFinancialYearName(startDate, endDate);

        await EnsureNoOverlapAsync(
            startDate,
            endDate,
            excludeId);

        await EnsureUniqueNameAsync(
            name,
            excludeId);

        return new YearInput
        {
            FinancialYearName =
                name,

            StartDate =
                startDate,

            EndDate =
                endDate,

            IsCurrent =
                isCurrent,

            YearStatus =
                normalizedStatus,

            Remarks =
                cleanRemarks,

            Status =
                status
        };
    }


    //===========================================================
    // Ensure No Overlap
    //
    // Two ranges overlap when A.Start <= B.End and A.End >= B.Start.
    //===========================================================

    private async Task
        EnsureNoOverlapAsync
        (
            DateOnly startDate,
            DateOnly endDate,
            long? excludeId
        )
    {
        FinancialYearsEntity? overlap =
            await _context
                .Set<FinancialYearsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (excludeId == null || x.FinancialYearId != excludeId)
                        &&
                        x.StartDate <= endDate
                        &&
                        x.EndDate >= startDate
                )
                .OrderBy(x => x.StartDate)
                .FirstOrDefaultAsync();

        if (overlap != null)
        {
            throw new InvalidOperationException(
                $"These dates overlap {overlap.FinancialYearName} " +
                $"({overlap.StartDate:dd-MMM-yyyy} to {overlap.EndDate:dd-MMM-yyyy}). " +
                "Financial years cannot overlap.");
        }
    }


    //===========================================================
    // Ensure Unique Name
    //===========================================================

    private async Task
        EnsureUniqueNameAsync
        (
            string name,
            long? excludeId
        )
    {
        string key =
            name.Trim().ToUpper();

        bool exists =
            await _context
                .Set<FinancialYearsEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (excludeId == null || x.FinancialYearId != excludeId)
                        &&
                        x.FinancialYearName.Trim().ToUpper() == key
                );

        if (exists)
        {
            throw new InvalidOperationException(
                $"Financial Year '{name}' already exists.");
        }
    }


    //===========================================================
    // Clear Other Current Years
    //
    // Saved before the new current year, so the one-current
    // unique index is never violated.
    //===========================================================

    private async Task
        ClearOtherCurrentAsync
        (
            long? keepId,
            long userId,
            DateTime now
        )
    {
        List<FinancialYearsEntity> others =
            await _context
                .Set<FinancialYearsEntity>()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.IsCurrent
                        &&
                        (keepId == null || x.FinancialYearId != keepId)
                )
                .ToListAsync();

        if (others.Count == 0)
        {
            return;
        }

        foreach (FinancialYearsEntity other in others)
        {
            other.IsCurrent =
                false;

            other.ModifiedBy =
                userId;

            other.ModifiedDate =
                now;

            AddHistory(
                other,
                "Update",
                "Current Year Changed",
                $"Financial Year '{other.FinancialYearName}' ({other.FinancialYearCode}) is no longer the current year.",
                userId,
                now);
        }

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Apply Input To Entity
    //===========================================================

    private static void ApplyInput
    (
        FinancialYearsEntity entity,
        YearInput input
    )
    {
        entity.FinancialYearName =
            input.FinancialYearName;

        entity.StartDate =
            input.StartDate;

        entity.EndDate =
            input.EndDate;

        entity.IsCurrent =
            input.IsCurrent;

        entity.YearStatus =
            input.YearStatus;

        entity.Remarks =
            input.Remarks;

        entity.Status =
            input.Status;
    }


    //===========================================================
    // Add Activity History
    //===========================================================

    private void AddHistory
    (
        FinancialYearsEntity entity,
        string activityType,
        string title,
        string description,
        long userId,
        DateTime performedDate
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    ModuleName,

                EntityName =
                    EntityName,

                EntityId =
                    entity.FinancialYearId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    title,

                ActivityDescription =
                    description,

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    performedDate
            });
    }


    //===========================================================
    // Create
    //
    // Code and Name are always generated here (values sent by
    // the client are ignored).
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateFinancialYearsDto dto,
            long userId
        )
    {
        YearInput input =
            await NormalizeInputAsync
            (
                dto.StartDate,
                dto.EndDate,
                dto.IsCurrent,
                dto.YearStatus,
                dto.Remarks,
                dto.Status,
                null
            );

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            if (input.IsCurrent)
            {
                await ClearOtherCurrentAsync(
                    null,
                    userId,
                    now);
            }

            FinancialYearsEntity entity =
                new FinancialYearsEntity
                {
                    FinancialYearCode =
                        await GetNextCodeAsync(),

                    IsDeleted =
                        false,

                    CreatedBy =
                        userId,

                    CreatedDate =
                        now
                };

            ApplyInput(
                entity,
                input);

            _context
                .Set<FinancialYearsEntity>()
                .Add(entity);

            await _context.SaveChangesAsync();

            AddHistory(
                entity,
                "Create",
                "Financial Year Created",
                $"Financial Year '{entity.FinancialYearName}' ({entity.FinancialYearCode}) created." +
                (entity.IsCurrent ? " Set as the current year." : string.Empty),
                userId,
                now);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return entity.FinancialYearId;
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Update
    //
    // Code is locked after creation. A Locked year cannot be
    // changed at all.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateFinancialYearsDto dto,
            long userId
        )
    {
        FinancialYearsEntity? entity =
            await _context
                .Set<FinancialYearsEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.FinancialYearId == dto.FinancialYearId
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Financial Year not found.");
        }

        if (entity.YearStatus == StatusLocked)
        {
            throw new InvalidOperationException(
                $"Financial Year '{entity.FinancialYearName}' is Locked and cannot be changed.");
        }

        YearInput input =
            await NormalizeInputAsync
            (
                dto.StartDate,
                dto.EndDate,
                dto.IsCurrent,
                dto.YearStatus,
                dto.Remarks,
                dto.Status,
                entity.FinancialYearId
            );

        //=======================================================
        // TODO: when vouchers / opening balances exist, block
        // changing the dates of a year that already has postings.
        //=======================================================

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            bool becameCurrent =
                input.IsCurrent
                &&
                !entity.IsCurrent;

            if (becameCurrent)
            {
                await ClearOtherCurrentAsync(
                    entity.FinancialYearId,
                    userId,
                    now);
            }

            ApplyInput(
                entity,
                input);

            entity.ModifiedBy =
                userId;

            entity.ModifiedDate =
                now;

            AddHistory(
                entity,
                "Update",
                "Financial Year Updated",
                $"Financial Year '{entity.FinancialYearName}' ({entity.FinancialYearCode}) updated." +
                (becameCurrent ? " Set as the current year." : string.Empty),
                userId,
                now);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Delete
    //
    // Blocked (409) when the year is:
    //   • the current year, or
    //   • Closed / Locked.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        FinancialYearsEntity? entity =
            await _context
                .Set<FinancialYearsEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.FinancialYearId == id
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Financial Year not found.");
        }

        if (entity.IsCurrent)
        {
            throw new InvalidOperationException(
                $"Financial Year '{entity.FinancialYearName}' is the current year and cannot be deleted. Make another year current first.");
        }

        if (entity.YearStatus != StatusOpen)
        {
            throw new InvalidOperationException(
                $"Financial Year '{entity.FinancialYearName}' is {entity.YearStatus} and cannot be deleted.");
        }

        //=======================================================
        // TODO: vouchers / opening balances dated inside this
        // year → count them here and throw (409).
        //=======================================================

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            entity.IsDeleted =
                true;

            entity.DeletedBy =
                userId;

            entity.DeletedDate =
                now;

            AddHistory(
                entity,
                "Delete",
                "Financial Year Deleted",
                $"Financial Year '{entity.FinancialYearName}' ({entity.FinancialYearCode}) deleted.",
                userId,
                now);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Restore
    //
    // Restores the most recently deleted year (never as current).
    // Blocked (409) when its dates now overlap an active year or
    // its name is taken.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        FinancialYearsEntity? entity =
            await _context
                .Set<FinancialYearsEntity>()
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        try
        {
            await EnsureNoOverlapAsync(
                entity.StartDate,
                entity.EndDate,
                entity.FinancialYearId);

            await EnsureUniqueNameAsync(
                entity.FinancialYearName ?? string.Empty,
                entity.FinancialYearId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"Financial Year '{entity.FinancialYearName}' cannot be restored. {ex.Message}");
        }

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            entity.IsDeleted =
                false;

            entity.DeletedBy =
                null;

            entity.DeletedDate =
                null;

            entity.IsCurrent =
                false;

            entity.ModifiedBy =
                userId;

            entity.ModifiedDate =
                now;

            AddHistory(
                entity,
                "Restore",
                "Financial Year Restored",
                $"Financial Year '{entity.FinancialYearName}' ({entity.FinancialYearCode}) restored.",
                userId,
                now);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return true;
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
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
            .Set<FinancialYearsEntity>()
            .AnyAsync
            (
                x =>
                    x.FinancialYearId == id
                    &&
                    !x.IsDeleted
            );
    }
}