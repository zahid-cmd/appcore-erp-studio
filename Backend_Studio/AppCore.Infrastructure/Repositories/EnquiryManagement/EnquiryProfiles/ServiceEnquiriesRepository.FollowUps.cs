//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Domain.Common;
using ServiceEnquiriesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceEnquiries;
using EnquirySetupsEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquirySetups;
using ServiceFollowUpsEntity =
    AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.ServiceFollowUps;
using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;


//===============================================================
// Namespace (as registered by Code Synchronization)
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Enquiries Repository : Follow-ups (the call pop-up)
//
// A follow-up is a call / visit logged on an open service
// enquiry : method, outcome, note, who and when, and what it
// changed :
//   • status : another Open status, or Suspended (Lost stage)
//     with a suspend reason (next follow-up cleared, closed date
//     set). Converted only comes from a job card / invoice /
//     counter sale.
//   • the preferred visit date, when agreed on the call
//   • next follow-up date (required unless suspended)
// The enquiry keeps the latest values; every call stays in
// ServiceFollowUps. An unassigned enquiry (website, schedule)
// takes the caller as its executive. Converted enquiries are
// refused.
//===============================================================

public partial class ServiceEnquiriesRepository
{
    private static readonly string[] FollowUpOutcomes =
    {
        "Reached",
        "No answer",
        "Call back later",
        "Visit booked",
        "Not interested"
    };


    private DbSet<ServiceFollowUpsEntity> FollowUps =>
        _context.Set<ServiceFollowUpsEntity>();



    //===========================================================
    // READ
    //===========================================================

    private async Task<List<ServiceFollowUpDto>> ToFollowUpDtosAsync
    (
        List<ServiceFollowUpsEntity> rows
    )
    {
        List<long> ids =
            rows.Select(x => x.ServiceEnquiryId).Distinct().ToList();

        var enquiries =
            await Enquiries.AsNoTracking()
                .Where(x => ids.Contains(x.ServiceEnquiryId))
                .Select(x => new { x.ServiceEnquiryId, x.EnquirerName, x.EnquirerMobile, x.EnquiryType })
                .ToDictionaryAsync(x => x.ServiceEnquiryId);

        return rows
            .Select(x =>
            {
                enquiries.TryGetValue(x.ServiceEnquiryId, out var e);

                return new ServiceFollowUpDto
                {
                    ServiceFollowUpId = x.ServiceFollowUpId,
                    ServiceEnquiryId = x.ServiceEnquiryId,
                    EnquiryNo = x.EnquiryNo,
                    EnquirerName = e?.EnquirerName ?? string.Empty,
                    EnquirerMobile = e?.EnquirerMobile ?? string.Empty,
                    EnquiryType = e?.EnquiryType ?? string.Empty,
                    FollowUpAt = x.FollowUpAt,
                    FollowUpDate = x.FollowUpDate,
                    MethodId = x.MethodId,
                    MethodName = x.MethodName,
                    Outcome = x.Outcome,
                    Note = x.Note,
                    NextFollowUpDate = x.NextFollowUpDate,
                    StatusFromName = x.StatusFromName,
                    StatusToName = x.StatusToName,
                    StatusToStage = x.StatusToStage,
                    PreferredDateFrom = x.PreferredDateFrom,
                    PreferredDateTo = x.PreferredDateTo,
                    LostReasonName = x.LostReasonName,
                    ExecutiveUserId = x.ExecutiveUserId,
                    ExecutiveName = x.ExecutiveName
                };
            })
            .ToList();
    }


    public async Task<List<ServiceFollowUpDto>> GetFollowUpsAsync
    (
        long serviceEnquiryId
    )
    {
        List<ServiceFollowUpsEntity> rows =
            await FollowUps.AsNoTracking()
                .Where(x => x.ServiceEnquiryId == serviceEnquiryId && !x.IsDeleted)
                .OrderByDescending(x => x.FollowUpAt)
                .ThenByDescending(x => x.ServiceFollowUpId)
                .ToListAsync();

        return await ToFollowUpDtosAsync(rows);
    }


    public async Task<List<ServiceFollowUpDto>> GetRecentFollowUpsAsync
    (
        DateOnly fromDate
    )
    {
        List<ServiceFollowUpsEntity> rows =
            await FollowUps.AsNoTracking()
                .Where(x => x.FollowUpDate >= fromDate && !x.IsDeleted)
                .OrderByDescending(x => x.FollowUpAt)
                .ThenByDescending(x => x.ServiceFollowUpId)
                .Take(1000)
                .ToListAsync();

        return await ToFollowUpDtosAsync(rows);
    }



    //===========================================================
    // LOG A CALL / VISIT
    //===========================================================

    public async Task<long> LogFollowUpAsync
    (
        LogServiceFollowUpDto dto,
        long userId
    )
    {
        ServiceEnquiriesEntity entity =
            await Enquiries.FirstOrDefaultAsync(x => x.ServiceEnquiryId == dto.ServiceEnquiryId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Service enquiry not found. It may have been deleted.");

        if (entity.IsConverted)
        {
            throw new InvalidOperationException(
                $"Enquiry {entity.EnquiryNo} is closed by {entity.ConvertedDocType} {entity.ConvertedDocNo}; no more follow-ups.");
        }

        DateOnly today = Today();

        string outcome =
            FollowUpOutcomes.FirstOrDefault(x => string.Equals(x, (dto.Outcome ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Choose the outcome of the call.");

        string note = Cut(Squeeze(dto.Note), 500);

        if (note.Length < 2 && outcome != "No answer" && await EnquirySwitches.OnAsync(_context, EnquirySwitches.ServiceCallNoteRequired, true))
        {
            throw new InvalidOperationException("Write a short note : what the customer said.");
        }

        EnquirySetupsEntity? method =
            dto.MethodId > 0
                ? await RequireSetupAsync(dto.MethodId.Value, "FollowUpMethod", "Follow-up Method", entity.FollowUpMethodId)
                : null;

        EnquirySetupsEntity status =
            await RequireSetupAsync(dto.StatusId, "Status", "Enquiry Status", entity.StatusId);

        if (status.Stage != "Open" && status.Stage != "Lost")
        {
            throw new InvalidOperationException("An enquiry is closed only by a job card, invoice or counter sale. Choose an open status, or Suspended.");
        }

        // New (the system open status) is only where an enquiry
        // starts : the first follow-up moves it on
        if (status.Stage == "Open" && status.IsSystem)
        {
            throw new InvalidOperationException(
                $"A follow-up moves the enquiry on from \"{status.Name}\". Choose the status it moves to.");
        }

        bool suspended = status.Stage == "Lost";

        EnquirySetupsEntity? lostReason = null;

        if (suspended)
        {
            if (!(dto.LostReasonId > 0))
            {
                throw new InvalidOperationException("Choose the Suspend Reason.");
            }

            lostReason = await RequireSetupAsync(dto.LostReasonId!.Value, "LostReason", "Suspend Reason", entity.LostReasonId);
        }

        DateOnly? next = suspended ? null : dto.NextFollowUpDate;

        if (!suspended)
        {
            if (!next.HasValue)
            {
                throw new InvalidOperationException("Choose the Next Follow-up Date.");
            }

            if (next.Value < today || next.Value > today.AddDays(365))
            {
                throw new InvalidOperationException("The Next Follow-up Date must be from today, within a year.");
            }
        }

        // Visit date agreed on the call (kept when not given)
        DateOnly? preferred = entity.PreferredDate;

        if (!suspended && dto.PreferredDate.HasValue && entity.EnquiryType == "Service")
        {
            if (dto.PreferredDate.Value < today || dto.PreferredDate.Value > today.AddDays(180))
            {
                throw new InvalidOperationException("The visit date must be from today, within 6 months.");
            }

            preferred = dto.PreferredDate;
        }

        List<EnquirySetupsEntity> setups =
            await Setups.AsNoTracking().Where(x => !x.IsDeleted).ToListAsync();

        string NameOf(long? id) =>
            id.HasValue ? setups.FirstOrDefault(x => x.EnquirySetupId == id.Value)?.Name ?? string.Empty : string.Empty;

        UserProfileEntity caller =
            await _context.Set<UserProfileEntity>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserProfileId == dto.ExecutiveUserId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Choose who made the call.");

        string callerName =
            Cut(Squeeze(caller.DisplayName != "" ? caller.DisplayName : (caller.FullName != "" ? caller.FullName : caller.UserName)), 150);

        DateTime now = DateTime.UtcNow;

        ServiceFollowUpsEntity row =
            new()
            {
                ServiceEnquiryId = entity.ServiceEnquiryId,
                EnquiryNo = entity.EnquiryNo,
                FollowUpAt = now,
                FollowUpDate = today,
                MethodId = method?.EnquirySetupId,
                MethodName = method?.Name ?? string.Empty,
                Outcome = outcome,
                Note = note,
                NextFollowUpDate = next,
                StatusFromId = entity.StatusId,
                StatusFromName = NameOf(entity.StatusId),
                StatusToId = status.EnquirySetupId,
                StatusToName = status.Name,
                StatusToStage = status.Stage,
                PreferredDateFrom = entity.PreferredDate,
                PreferredDateTo = preferred,
                LostReasonId = lostReason?.EnquirySetupId,
                LostReasonName = lostReason?.Name ?? string.Empty,
                ExecutiveUserId = caller.UserProfileId,
                ExecutiveName = callerName,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        string lastNote = Cut(note.Length > 0 ? $"{outcome} : {note}" : outcome, 500);

        entity.LastFollowUpDate = today;
        entity.LastFollowUpNote = lastNote;
        entity.NextFollowUpDate = next;
        entity.FollowUpMethodId = method?.EnquirySetupId ?? entity.FollowUpMethodId;
        entity.StatusId = status.EnquirySetupId;
        entity.PreferredDate = preferred;
        entity.LostReasonId = suspended ? lostReason!.EnquirySetupId : null;
        entity.ClosedDate = suspended ? (entity.ClosedDate ?? today) : null;

        if (!(entity.ExecutiveUserId > 0))
        {
            entity.ExecutiveUserId = caller.UserProfileId;
            entity.ExecutiveName = callerName;
        }

        entity.ModifiedBy = userId;
        entity.ModifiedDate = now;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        FollowUps.Add(row);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Update",
            suspended ? "Suspended (follow-up)" : "Follow-up",
            $"{entity.EnquiryNo} ({entity.EnquirerName} - {entity.EnquirerMobile}) : {outcome}{(method != null ? " by " + method.Name : string.Empty)}, {callerName}. {note}"
                + (row.StatusFromId != row.StatusToId ? $" Status {row.StatusFromName} to {row.StatusToName}." : string.Empty)
                + (preferred != row.PreferredDateFrom && preferred.HasValue ? $" Visit {preferred.Value:dd-MMM-yyyy}." : string.Empty)
                + (next.HasValue ? $" Next {next.Value:dd-MMM-yyyy}." : string.Empty),
            userId,
            callerName);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return row.ServiceFollowUpId;
    }
}
