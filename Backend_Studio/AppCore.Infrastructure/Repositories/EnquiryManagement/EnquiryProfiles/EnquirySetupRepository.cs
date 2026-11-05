//===============================================================
// Namespaces
//===============================================================

using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Domain.Common;
using AppCore.Infrastructure.Persistence;
using EnquirySetupsEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquirySetups;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Enquiry Setup Repository
//
// One table, six lists (SetupType) : Source / Status /
// InterestLevel / FollowUpMethod / LostReason / TimeSlot.
//
// Code      : <prefix>-nnn per type (SRC / EST / INT / FUM / LRS),
//             always generated here; deleted rows count, so a
//             number is never reused.
// Name      : required, max 100, unique per type among live rows
//             (ignoring case).
// Colour    : #RRGGBB, required for Status / Interest Level;
//             cleared for the other lists.
// Stage     : Open / Won / Lost, required for Status; cleared for
//             the other lists.
// Days      : Interest Level only : days to purchase, From 0+,
//             To >= From or empty (= and more); ranges of live
//             interest levels may not overlap. Both empty = the
//             level is chosen by hand only.
// Time Slot : a booking day for one page, Used For Service
//             (appointments) or TestRide (locked after saving);
//             name generated "<Service Appointment|Test Ride> n"
//             (deleted rows count); interval 15 / 30 / 45 / 60;
//             working hours From - To; optional lunch break inside
//             them; at least one slot. ONE DEFAULT PER PAGE (the
//             slot the page books with) : saving a default clears
//             the other default of the same page only. Status works
//             as in every list (a default must be active).
// Default   : at most one per type; saving a default clears the
//             others. A default row must be active.
// System    : the seeded New / Won / Lost statuses. Cannot be
//             deleted or deactivated; their Stage is locked.
//             Name, colour, order and remarks stay editable.
// Type      : locked after saving.
//===============================================================

public class EnquirySetupRepository
    : IEnquirySetupRepository
{
    private const int NameMaxLength = 100;

    private const int RemarksMaxLength = 500;

    private const string HistoryModule = "Enquiry Management";

    private const string HistoryEntity = "EnquirySetups";

    private static readonly Regex ColorPattern =
        new("^#[0-9A-Fa-f]{6}$", RegexOptions.Compiled);


    private readonly AppDbContext _context;


    public EnquirySetupRepository(
        AppDbContext context)
    {
        _context = context;
    }


    private DbSet<EnquirySetupsEntity> Rows =>
        _context.Set<EnquirySetupsEntity>();



    //===========================================================
    // Type : the canonical spelling, or a 400 message
    //===========================================================

    private static string ResolveType
    (
        string? setupType
    )
    {
        string key =
            (setupType ?? string.Empty).Trim();

        string? match =
            EnquirySetupTypes.All.Keys
                .FirstOrDefault(
                    x =>
                        string.Equals(x, key, StringComparison.OrdinalIgnoreCase));

        if
        (
            match == null
        )
        {
            throw new InvalidOperationException(
                "Choose a valid list : Source, Status, InterestLevel, FollowUpMethod, LostReason (Suspend Reasons) or TimeSlot.");
        }

        return match;
    }


    private static string Label
    (
        string setupType
    )
    {
        return EnquirySetupTypes.All.TryGetValue(setupType, out var item)
            ? item.Label
            : "Enquiry Setup";
    }



    //===========================================================
    // Read
    //===========================================================

    private static EnquirySetupDto ToDto
    (
        EnquirySetupsEntity x
    )
    {
        return new EnquirySetupDto
        {
            EnquirySetupId = x.EnquirySetupId,
            SetupType = x.SetupType,
            Code = x.Code,
            Name = x.Name,
            ColorCode = x.ColorCode,
            Stage = x.Stage,
            DaysFrom = x.DaysFrom,
            DaysTo = x.DaysTo,
            UsedFor = x.UsedFor,
            IntervalMinutes = x.IntervalMinutes,
            SlotCapacity = x.SlotCapacity,
            TimeFrom = x.TimeFrom.HasValue ? x.TimeFrom.Value.ToString("HH:mm") : string.Empty,
            TimeTo = x.TimeTo.HasValue ? x.TimeTo.Value.ToString("HH:mm") : string.Empty,
            BreakFrom = x.BreakFrom.HasValue ? x.BreakFrom.Value.ToString("HH:mm") : string.Empty,
            BreakTo = x.BreakTo.HasValue ? x.BreakTo.Value.ToString("HH:mm") : string.Empty,
            SlotCount =
                x.TimeFrom.HasValue && x.TimeTo.HasValue && x.IntervalMinutes.HasValue
                    ? TimeSlotUses.BuildSlots(x.TimeFrom.Value, x.TimeTo.Value, x.IntervalMinutes.Value, x.BreakFrom, x.BreakTo).Count
                    : 0,
            DisplayOrder = x.DisplayOrder,
            IsDefault = x.IsDefault,
            IsSystem = x.IsSystem,
            Remarks = x.Remarks,
            IsActive = x.IsActive,
            CreatedBy = x.CreatedBy,
            CreatedDate = x.CreatedDate,
            ModifiedBy = x.ModifiedBy,
            ModifiedDate = x.ModifiedDate
        };
    }


    public async Task<List<EnquirySetupDto>>
        GetAllAsync
        (
            string? setupType
        )
    {
        IQueryable<EnquirySetupsEntity> query =
            Rows
                .AsNoTracking()
                .Where(x => !x.IsDeleted);

        if
        (
            !string.IsNullOrWhiteSpace(setupType)
        )
        {
            string type =
                ResolveType(setupType);

            query =
                query.Where(x => x.SetupType == type);
        }

        List<EnquirySetupsEntity> rows =
            await query
                .OrderBy(x => x.SetupType)
                .ThenBy(x => x.DisplayOrder)
                .ThenBy(x => x.Code)
                .ToListAsync();

        return rows
            .Select(ToDto)
            .ToList();
    }


    public async Task<EnquirySetupDto?>
        GetByIdAsync
        (
            long id
        )
    {
        EnquirySetupsEntity? row =
            await Rows
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        x.EnquirySetupId == id
                        &&
                        !x.IsDeleted);

        return row == null
            ? null
            : ToDto(row);
    }



    //===========================================================
    // Next Code (per type; deleted rows included)
    //===========================================================

    private async Task<string>
        GetNextCodeAsync
        (
            string setupType
        )
    {
        string prefix =
            EnquirySetupTypes.All[setupType].Prefix;

        List<string> codes =
            await Rows
                .AsNoTracking()
                .Where(x => x.SetupType == setupType)
                .Select(x => x.Code)
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
                    .Split('-', StringSplitOptions.RemoveEmptyEntries);

            if
            (
                parts.Length == 2
                &&
                string.Equals(parts[0], prefix, StringComparison.OrdinalIgnoreCase)
                &&
                int.TryParse(parts[1], out int number)
                &&
                number > highest
            )
            {
                highest =
                    number;
            }
        }

        return $"{prefix}-{highest + 1:D3}";
    }


    private async Task<int>
        GetNextDisplayOrderAsync
        (
            string setupType
        )
    {
        int highest =
            await Rows
                .AsNoTracking()
                .Where(
                    x =>
                        x.SetupType == setupType
                        &&
                        !x.IsDeleted)
                .Select(x => (int?)x.DisplayOrder)
                .MaxAsync()
            ?? 0;

        return highest + 1;
    }


    public async Task<EnquirySetupDefaultsDto>
        GetDefaultsAsync
        (
            string setupType
        )
    {
        string type =
            ResolveType(setupType);

        return new EnquirySetupDefaultsDto
        {
            SetupType = type,

            Code = await GetNextCodeAsync(type),

            NextDisplayOrder = await GetNextDisplayOrderAsync(type)
        };
    }



    //===========================================================
    // Input : cleaned values, or a 400 message
    //===========================================================

    private sealed record CleanInput
    (
        string Name,
        string ColorCode,
        string Stage,
        int? DaysFrom,
        int? DaysTo,
        TimeOnly? TimeFrom,
        TimeOnly? TimeTo,
        string UsedFor,
        int? IntervalMinutes,
        int? SlotCapacity,
        TimeOnly? BreakFrom,
        TimeOnly? BreakTo,
        int DisplayOrder,
        string Remarks
    );


    // "HH:mm" (24 h) or null
    private static TimeOnly? ParseTime
    (
        string? text
    )
    {
        string value =
            (text ?? string.Empty).Trim();

        return TimeOnly.TryParseExact(value, new[] { "HH:mm", "H:mm", "HH:mm:ss" }, null, System.Globalization.DateTimeStyles.None, out TimeOnly time)
            ? time
            : null;
    }


    // 10:00 AM
    private static string TimeText
    (
        TimeOnly? time
    )
    {
        return time.HasValue
            ? time.Value.ToString("hh:mm tt", System.Globalization.CultureInfo.InvariantCulture)
            : string.Empty;
    }


    private static CleanInput Normalize
    (
        string setupType,
        CreateEnquirySetupDto dto
    )
    {
        string label =
            Label(setupType);

        // Name : single spaces (Time Slots : generated on create,
        // kept on update)
        string name =
            EnquirySetupTypes.HasTime(setupType)
                ? "-"
                : string.Join(
                    " ",
                    (dto.Name ?? string.Empty)
                        .Split(' ', StringSplitOptions.RemoveEmptyEntries));

        if
        (
            name.Length == 0
        )
        {
            throw new InvalidOperationException(
                $"{label} Name is required.");
        }

        if
        (
            name.Length > NameMaxLength
        )
        {
            throw new InvalidOperationException(
                $"{label} Name cannot be longer than {NameMaxLength} characters.");
        }


        // Colour (Status / Interest Level only)
        string color =
            string.Empty;

        if
        (
            EnquirySetupTypes.HasColor(setupType)
        )
        {
            color =
                (dto.ColorCode ?? string.Empty).Trim();

            if
            (
                color.Length == 0
            )
            {
                throw new InvalidOperationException(
                    "Colour is required.");
            }

            if
            (
                !color.StartsWith('#')
            )
            {
                color =
                    "#" + color;
            }

            if
            (
                !ColorPattern.IsMatch(color)
            )
            {
                throw new InvalidOperationException(
                    "Colour must be a hex colour such as #2563EB.");
            }

            color =
                color.ToUpperInvariant();
        }


        // Stage (Status only)
        string stage =
            string.Empty;

        if
        (
            EnquirySetupTypes.HasStage(setupType)
        )
        {
            string key =
                (dto.Stage ?? string.Empty).Trim();

            stage =
                EnquiryStages.All
                    .FirstOrDefault(
                        x =>
                            string.Equals(x, key, StringComparison.OrdinalIgnoreCase))
                ?? string.Empty;

            if
            (
                stage.Length == 0
            )
            {
                throw new InvalidOperationException(
                    "Stage is required : Open, Won or Suspended.");
            }
        }


        // Days to purchase (Interest Level only)
        int? daysFrom =
            null;

        int? daysTo =
            null;

        if
        (
            EnquirySetupTypes.HasDays(setupType)
        )
        {
            daysFrom =
                dto.DaysFrom;

            daysTo =
                dto.DaysTo;

            if
            (
                daysFrom == null
                &&
                daysTo != null
            )
            {
                throw new InvalidOperationException(
                    "Enter Days From as well (0 or more), or clear Days To.");
            }

            if
            (
                daysFrom < 0
                ||
                daysFrom > 3650
                ||
                daysTo < 0
                ||
                daysTo > 3650
            )
            {
                throw new InvalidOperationException(
                    "Days must be between 0 and 3650.");
            }

            if
            (
                daysFrom != null
                &&
                daysTo != null
                &&
                daysTo < daysFrom
            )
            {
                throw new InvalidOperationException(
                    "Days To cannot be less than Days From.");
            }
        }


        // Time Slot : page, length, hours, lunch break
        TimeOnly? timeFrom =
            null;

        TimeOnly? timeTo =
            null;

        TimeOnly? breakFrom =
            null;

        TimeOnly? breakTo =
            null;

        int? interval =
            null;

        int? capacity =
            null;

        string usedFor =
            string.Empty;

        if
        (
            EnquirySetupTypes.HasTime(setupType)
        )
        {
            string key =
                (dto.UsedFor ?? string.Empty).Trim();

            usedFor =
                TimeSlotUses.All
                    .FirstOrDefault(
                        x =>
                            string.Equals(x, key, StringComparison.OrdinalIgnoreCase))
                ?? string.Empty;

            if
            (
                usedFor.Length == 0
            )
            {
                throw new InvalidOperationException(
                    "Choose the page : Service Appointment or Test Ride.");
            }

            if
            (
                dto.IntervalMinutes == null
                ||
                !TimeSlotUses.Intervals.Contains(dto.IntervalMinutes.Value)
            )
            {
                throw new InvalidOperationException(
                    "Choose the Time Interval : 15, 30, 45 or 60 minutes.");
            }

            interval =
                dto.IntervalMinutes;

            if
            (
                dto.SlotCapacity == null
                ||
                dto.SlotCapacity < 1
                ||
                dto.SlotCapacity > 20
            )
            {
                throw new InvalidOperationException(
                    "Bookings per Slot must be between 1 and 20.");
            }

            capacity =
                dto.SlotCapacity;

            timeFrom =
                ParseTime(dto.TimeFrom);

            timeTo =
                ParseTime(dto.TimeTo);

            if
            (
                timeFrom == null
                ||
                timeTo == null
            )
            {
                throw new InvalidOperationException(
                    "Start Time and End Time are required.");
            }

            if
            (
                timeTo.Value <= timeFrom.Value
            )
            {
                throw new InvalidOperationException(
                    "End Time must be after Start Time.");
            }

            breakFrom =
                ParseTime(dto.BreakFrom);

            breakTo =
                ParseTime(dto.BreakTo);

            if
            (
                (breakFrom == null) != (breakTo == null)
            )
            {
                throw new InvalidOperationException(
                    "Enter both Lunch From and Lunch To, or leave both empty.");
            }

            if
            (
                breakFrom != null
                &&
                breakTo != null
            )
            {
                if
                (
                    breakTo.Value <= breakFrom.Value
                )
                {
                    throw new InvalidOperationException(
                        "Lunch To must be after Lunch From.");
                }

                if
                (
                    breakFrom.Value < timeFrom.Value
                    ||
                    breakTo.Value > timeTo.Value
                )
                {
                    throw new InvalidOperationException(
                        "The lunch break must be inside the working hours.");
                }
            }

            if
            (
                TimeSlotUses.BuildSlots(timeFrom.Value, timeTo.Value, interval.Value, breakFrom, breakTo).Count == 0
            )
            {
                throw new InvalidOperationException(
                    "No slot fits these hours. Widen the hours or shorten the interval.");
            }
        }

        // Order (0 = after the last one; filled by the caller)
        if
        (
            dto.DisplayOrder < 0
            ||
            dto.DisplayOrder > 9999
        )
        {
            throw new InvalidOperationException(
                "Display Order must be between 1 and 9999.");
        }


        string remarks =
            (dto.Remarks ?? string.Empty).Trim();

        if
        (
            remarks.Length > RemarksMaxLength
        )
        {
            throw new InvalidOperationException(
                $"Remarks cannot be longer than {RemarksMaxLength} characters.");
        }


        if
        (
            dto.IsDefault
            &&
            !dto.IsActive
        )
        {
            throw new InvalidOperationException(
                $"A default {label.ToLower()} must be active. Make it active, or set another default first.");
        }


        return new CleanInput(
            name,
            color,
            stage,
            daysFrom,
            daysTo,
            timeFrom,
            timeTo,
            usedFor,
            interval,
            capacity,
            breakFrom,
            breakTo,
            dto.DisplayOrder,
            remarks);
    }



    //===========================================================
    // Days ranges of the interest levels may not overlap
    //===========================================================

    private async Task
        EnsureDaysFreeAsync
        (
            string setupType,
            int? daysFrom,
            int? daysTo,
            long excludeId
        )
    {
        if
        (
            !EnquirySetupTypes.HasDays(setupType)
            ||
            daysFrom == null
        )
        {
            return;
        }

        int from =
            daysFrom.Value;

        int to =
            daysTo ?? int.MaxValue;

        List<EnquirySetupsEntity> others =
            await Rows
                .AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                        &&
                        x.SetupType == setupType
                        &&
                        x.EnquirySetupId != excludeId
                        &&
                        x.DaysFrom != null)
                .ToListAsync();

        EnquirySetupsEntity? clash =
            others.FirstOrDefault(
                x =>
                    from <= (x.DaysTo ?? int.MaxValue)
                    &&
                    x.DaysFrom!.Value <= to);

        if
        (
            clash != null
        )
        {
            string range =
                clash.DaysTo == null
                    ? $"{clash.DaysFrom}+ days"
                    : $"{clash.DaysFrom} - {clash.DaysTo} days";

            throw new InvalidOperationException(
                $"These days overlap '{clash.Name}' ({range}). Each day may belong to one interest level only.");
        }
    }



    //===========================================================
    // Time Slots : one default per page; generated names
    //===========================================================

    // Default of a page : clears the other default of the same
    // page (Service Appointment / Test Ride) only
    private async Task
        ClearOtherSlotDefaultsAsync
        (
            string usedFor,
            long keepId,
            long userId
        )
    {
        List<EnquirySetupsEntity> others =
            await Rows
                .Where(
                    x =>
                        x.SetupType == EnquirySetupTypes.TimeSlot
                        &&
                        x.UsedFor == usedFor
                        &&
                        x.IsDefault
                        &&
                        x.EnquirySetupId != keepId)
                .ToListAsync();

        foreach
        (
            EnquirySetupsEntity row
            in others
        )
        {
            row.IsDefault = false;
            row.ModifiedBy = userId;
            row.ModifiedDate = DateTime.UtcNow;
        }
    }


    // "Service Appointment 3" : highest number of the page (deleted
    // rows count) + 1
    private async Task<string>
        NextSlotNameAsync
        (
            string usedFor
        )
    {
        string prefix =
            TimeSlotUses.Label(usedFor) + " ";

        List<string> names =
            await Rows
                .AsNoTracking()
                .Where(
                    x =>
                        x.SetupType == EnquirySetupTypes.TimeSlot
                        &&
                        x.UsedFor == usedFor)
                .Select(x => x.Name)
                .ToListAsync();

        int highest =
            names
                .Select(
                    x =>
                        x.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
                        &&
                        int.TryParse(x.Substring(prefix.Length), out int n)
                            ? n
                            : 0)
                .DefaultIfEmpty(0)
                .Max();

        return prefix + (highest + 1);
    }



    //===========================================================
    // Duplicate Name (per type, live rows, ignoring case)
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string setupType,
            string name,
            long excludeId
        )
    {
        string key =
            name.Trim().ToLower();

        EnquirySetupsEntity? same =
            await Rows
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        !x.IsDeleted
                        &&
                        x.EnquirySetupId != excludeId
                        &&
                        x.SetupType == setupType
                        &&
                        x.Name.ToLower() == key);

        if
        (
            same != null
        )
        {
            throw new InvalidOperationException(
                $"{Label(setupType)} '{name}' already exists ({same.Code}).");
        }
    }



    //===========================================================
    // Default : clear the other defaults of the type
    //===========================================================

    private async Task
        ClearOtherDefaultsAsync
        (
            string setupType,
            long keepId,
            long userId
        )
    {
        List<EnquirySetupsEntity> others =
            await Rows
                .Where(
                    x =>
                        x.SetupType == setupType
                        &&
                        x.IsDefault
                        &&
                        x.EnquirySetupId != keepId)
                .ToListAsync();

        foreach
        (
            EnquirySetupsEntity row
            in others
        )
        {
            row.IsDefault = false;

            row.ModifiedBy = userId;

            row.ModifiedDate = DateTime.UtcNow;
        }
    }



    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        EnquirySetupsEntity entity,
        string activityType,
        string verb,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    HistoryModule,

                EntityName =
                    HistoryEntity,

                EntityId =
                    entity.EnquirySetupId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"{Label(entity.SetupType)} {verb}",

                ActivityDescription =
                    $"{Label(entity.SetupType)} '{entity.Name}' ({entity.Code}) {verb.ToLower()}.",

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
            CreateEnquirySetupDto dto,
            long userId
        )
    {
        string type =
            ResolveType(dto.SetupType);

        CleanInput input =
            Normalize(type, dto);

        await EnsureUniqueAsync(
            type,
            input.Name,
            0);

        await EnsureDaysFreeAsync(
            type,
            input.DaysFrom,
            input.DaysTo,
            0);

        bool isSlot =
            EnquirySetupTypes.HasTime(type);

        int order =
            input.DisplayOrder > 0
                ? input.DisplayOrder
                : await GetNextDisplayOrderAsync(type);

        EnquirySetupsEntity entity =
            new EnquirySetupsEntity
            {
                SetupType = type,
                Code = await GetNextCodeAsync(type),
                Name = isSlot ? await NextSlotNameAsync(input.UsedFor) : input.Name,
                ColorCode = input.ColorCode,
                Stage = input.Stage,
                DaysFrom = input.DaysFrom,
                DaysTo = input.DaysTo,
                TimeFrom = input.TimeFrom,
                TimeTo = input.TimeTo,
                UsedFor = input.UsedFor,
                IntervalMinutes = input.IntervalMinutes,
                SlotCapacity = input.SlotCapacity,
                BreakFrom = input.BreakFrom,
                BreakTo = input.BreakTo,
                DisplayOrder = order,
                IsDefault = dto.IsDefault,
                IsSystem = false,
                Remarks = input.Remarks,
                IsActive = dto.IsActive,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        if
        (
            entity.IsDefault
        )
        {
            if
            (
                isSlot
            )
            {
                await ClearOtherSlotDefaultsAsync(entity.UsedFor, 0, userId);
            }
            else
            {
                await ClearOtherDefaultsAsync(type, 0, userId);
            }
        }

        Rows.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity, "Create", "Created", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.EnquirySetupId;
    }



    //===========================================================
    // Update (type and code locked; system rows keep their stage
    // and stay active)
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateEnquirySetupDto dto,
            long userId
        )
    {
        EnquirySetupsEntity? entity =
            await Rows
                .FirstOrDefaultAsync(
                    x =>
                        x.EnquirySetupId == dto.EnquirySetupId
                        &&
                        !x.IsDeleted);

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "The record was not found. It may have been deleted.");
        }

        if
        (
            !string.IsNullOrWhiteSpace(dto.SetupType)
            &&
            !string.Equals(dto.SetupType.Trim(), entity.SetupType, StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                "The list of a record cannot be changed after saving.");
        }

        string type =
            entity.SetupType;

        CleanInput input =
            Normalize(type, dto);

        if
        (
            entity.IsSystem
        )
        {
            if
            (
                !string.Equals(input.Stage, entity.Stage, StringComparison.OrdinalIgnoreCase)
            )
            {
                throw new InvalidOperationException(
                    $"'{entity.Name}' is a system status : its Stage ({entity.Stage}) cannot be changed.");
            }

            if
            (
                !dto.IsActive
            )
            {
                throw new InvalidOperationException(
                    $"'{entity.Name}' is a system status and must stay active.");
            }
        }

        // Unticking the default is allowed : the list then simply
        // has no default.

        await EnsureUniqueAsync(
            type,
            input.Name,
            entity.EnquirySetupId);

        await EnsureDaysFreeAsync(
            type,
            input.DaysFrom,
            input.DaysTo,
            entity.EnquirySetupId);

        bool isSlot =
            EnquirySetupTypes.HasTime(type);

        if
        (
            isSlot
            &&
            !string.Equals(input.UsedFor, entity.UsedFor, StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                "The page of a time slot cannot be changed after saving. Add a new time slot instead.");
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        if
        (
            dto.IsDefault
            &&
            !entity.IsDefault
        )
        {
            if
            (
                isSlot
            )
            {
                await ClearOtherSlotDefaultsAsync(entity.UsedFor, entity.EnquirySetupId, userId);
            }
            else
            {
                await ClearOtherDefaultsAsync(type, entity.EnquirySetupId, userId);
            }
        }

        entity.Name = isSlot ? entity.Name : input.Name;
        entity.ColorCode = input.ColorCode;
        entity.Stage = input.Stage;
        entity.DaysFrom = input.DaysFrom;
        entity.DaysTo = input.DaysTo;
        entity.TimeFrom = input.TimeFrom;
        entity.TimeTo = input.TimeTo;
        entity.UsedFor = input.UsedFor;
        entity.IntervalMinutes = input.IntervalMinutes;
        entity.SlotCapacity = input.SlotCapacity;
        entity.BreakFrom = input.BreakFrom;
        entity.BreakTo = input.BreakTo;
        entity.DisplayOrder = input.DisplayOrder > 0 ? input.DisplayOrder : entity.DisplayOrder;
        entity.IsDefault = dto.IsDefault;
        entity.Remarks = input.Remarks;
        entity.IsActive = dto.IsActive;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity, "Update", "Updated", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }



    //===========================================================
    // Delete (soft; system and default rows refused)
    //
    // Later : refuse while enquiries / follow-ups use the row
    // (those pages are not built yet).
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        EnquirySetupsEntity? entity =
            await Rows
                .FirstOrDefaultAsync(
                    x =>
                        x.EnquirySetupId == id
                        &&
                        !x.IsDeleted);

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "The record was not found. It may have been deleted already.");
        }

        if
        (
            entity.IsSystem
        )
        {
            throw new InvalidOperationException(
                $"'{entity.Name}' is a system status and cannot be deleted. You can rename it instead.");
        }

        if
        (
            entity.IsDefault
        )
        {
            throw new InvalidOperationException(
                $"'{entity.Name}' is the default {Label(entity.SetupType).ToLower()}. Set another default first.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity, "Delete", "Deleted", userId);

        await _context.SaveChangesAsync();
    }



    //===========================================================
    // Restore (the most recently deleted row of the type; 409
    // while its name is taken again)
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            string? setupType,
            long userId
        )
    {
        IQueryable<EnquirySetupsEntity> deleted =
            Rows.Where(x => x.IsDeleted);

        if
        (
            !string.IsNullOrWhiteSpace(setupType)
        )
        {
            string type =
                ResolveType(setupType);

            deleted =
                deleted.Where(x => x.SetupType == type);
        }

        EnquirySetupsEntity? entity =
            await deleted
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.EnquirySetupId)
                .FirstOrDefaultAsync();

        if
        (
            entity == null
        )
        {
            return false;
        }

        try
        {
            await EnsureUniqueAsync(
                entity.SetupType,
                entity.Name,
                entity.EnquirySetupId);

            await EnsureDaysFreeAsync(
                entity.SetupType,
                entity.DaysFrom,
                entity.DaysTo,
                entity.EnquirySetupId);
        }

        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"'{entity.Name}' cannot be restored. {ex.Message}");
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.IsDefault = false;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity, "Restore", "Restored", userId);

        await _context.SaveChangesAsync();

        return true;
    }
}
