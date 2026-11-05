//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Domain.Common;
using SalesEnquiriesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.SalesEnquiries;
using EnquirySetupsEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquirySetups;
using SalesFollowUpsEntity =
    AppCore.Domain.Entities.EnquiryManagement.FollowUpsAppointments.SalesFollowUps;
using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;


//===============================================================
// Namespace (as registered by Code Synchronization)
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Sales Enquiries Repository : Sales Follow-ups
//
// A follow-up is a call / visit logged on an open sales enquiry :
// method, outcome, note, who and when, and what it changed :
//   • status : another Open status, or Suspended (Lost stage)
//     with a suspend reason (next follow-up cleared, closed date
//     set). Won only comes from a sale.
//   • expected purchase date and interest level (the level follows
//     the days left when the setup has day ranges)
//   • next follow-up date (required unless suspended)
// The enquiry keeps the latest values (LastFollowUpDate / Note,
// NextFollowUpDate, FollowUpMethodId …); every call stays in
// SalesFollowUps. An unassigned enquiry (website) takes the
// caller as its executive. Matured enquiries are refused.
//===============================================================

public partial class SalesEnquiriesRepository
{
    private static readonly string[] FollowUpOutcomes =
    {
        "Reached",
        "No answer",
        "Call back later",
        "Visited showroom",
        "Not interested"
    };


    private DbSet<SalesFollowUpsEntity> FollowUps =>
        _context.Set<SalesFollowUpsEntity>();



    //===========================================================
    // READ
    //===========================================================

    private async Task<List<SalesFollowUpDto>> ToFollowUpDtosAsync
    (
        List<SalesFollowUpsEntity> rows
    )
    {
        List<long> ids =
            rows.Select(x => x.SalesEnquiryId).Distinct().ToList();

        var enquiries =
            await Enquiries.AsNoTracking()
                .Where(x => ids.Contains(x.SalesEnquiryId))
                .Select(x => new { x.SalesEnquiryId, x.EnquirerName, x.EnquirerMobile, x.ModelName })
                .ToDictionaryAsync(x => x.SalesEnquiryId);

        return rows
            .Select(x =>
            {
                enquiries.TryGetValue(x.SalesEnquiryId, out var e);

                return new SalesFollowUpDto
                {
                    SalesFollowUpId = x.SalesFollowUpId,
                    SalesEnquiryId = x.SalesEnquiryId,
                    EnquiryNo = x.EnquiryNo,
                    EnquirerName = e?.EnquirerName ?? string.Empty,
                    EnquirerMobile = e?.EnquirerMobile ?? string.Empty,
                    ModelName = e?.ModelName ?? string.Empty,
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
                    InterestFromName = x.InterestFromName,
                    InterestToName = x.InterestToName,
                    ExpectedPurchaseFrom = x.ExpectedPurchaseFrom,
                    ExpectedPurchaseTo = x.ExpectedPurchaseTo,
                    LostReasonName = x.LostReasonName,
                    ExecutiveUserId = x.ExecutiveUserId,
                    ExecutiveName = x.ExecutiveName
                };
            })
            .ToList();
    }


    public async Task<List<SalesFollowUpDto>> GetFollowUpsAsync
    (
        long salesEnquiryId
    )
    {
        List<SalesFollowUpsEntity> rows =
            await FollowUps.AsNoTracking()
                .Where(x => x.SalesEnquiryId == salesEnquiryId && !x.IsDeleted)
                .OrderByDescending(x => x.FollowUpAt)
                .ThenByDescending(x => x.SalesFollowUpId)
                .ToListAsync();

        return await ToFollowUpDtosAsync(rows);
    }


    public async Task<List<SalesFollowUpDto>> GetRecentFollowUpsAsync
    (
        DateOnly fromDate
    )
    {
        List<SalesFollowUpsEntity> rows =
            await FollowUps.AsNoTracking()
                .Where(x => x.FollowUpDate >= fromDate && !x.IsDeleted)
                .OrderByDescending(x => x.FollowUpAt)
                .ThenByDescending(x => x.SalesFollowUpId)
                .Take(1000)
                .ToListAsync();

        return await ToFollowUpDtosAsync(rows);
    }



    //===========================================================
    // LOG A CALL / VISIT
    //===========================================================

    public async Task<long> LogFollowUpAsync
    (
        LogSalesFollowUpDto dto,
        long userId
    )
    {
        SalesEnquiriesEntity entity =
            await Enquiries.FirstOrDefaultAsync(x => x.SalesEnquiryId == dto.SalesEnquiryId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Sales enquiry not found. It may have been deleted.");

        if (entity.IsMatured)
        {
            throw new InvalidOperationException(
                $"Enquiry {entity.EnquiryNo} is matured by sale {entity.SaleNo}; no more follow-ups.");
        }

        DateOnly today = Today();

        // Outcome
        string outcome =
            FollowUpOutcomes.FirstOrDefault(x => string.Equals(x, (dto.Outcome ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Choose the outcome of the call.");

        string note = Squeeze(dto.Note);

        if (note.Length > 500)
        {
            note = note[..500];
        }

        if (note.Length < 2 && outcome != "No answer" && await EnquirySwitches.OnAsync(_context, EnquirySwitches.SalesCallNoteRequired, true))
        {
            throw new InvalidOperationException("Write a short note : what the customer said.");
        }

        // Method (optional)
        EnquirySetupsEntity? method =
            dto.MethodId > 0
                ? await RequireSetupAsync(dto.MethodId.Value, "FollowUpMethod", "Follow-up Method", entity.FollowUpMethodId)
                : null;

        // Status : Open or Suspended (Lost); Won only from a sale
        EnquirySetupsEntity status =
            await RequireSetupAsync(dto.StatusId, "Status", "Enquiry Status", entity.StatusId);

        if (status.Stage != "Open" && status.Stage != "Lost")
        {
            throw new InvalidOperationException("Won comes only from a sale. Choose an open status, or Suspended.");
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

        // Next follow-up : required while open
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

        // Expected purchase date (kept when not given)
        DateOnly? expected = dto.ExpectedPurchaseDate ?? entity.ExpectedPurchaseDate;

        if (dto.ExpectedPurchaseDate.HasValue && dto.ExpectedPurchaseDate.Value < entity.EnquiryDate)
        {
            throw new InvalidOperationException("The Expected Purchase Date cannot be before the enquiry date.");
        }

        // Interest : by days left when the setup has ranges, else as chosen
        List<EnquirySetupsEntity> setups =
            await Setups.AsNoTracking().Where(x => !x.IsDeleted).ToListAsync();

        long? interestId = dto.InterestLevelId > 0 ? dto.InterestLevelId : entity.InterestLevelId;

        if (interestId.HasValue && interestId != entity.InterestLevelId)
        {
            await RequireSetupAsync(interestId.Value, "InterestLevel", "Interest Level", entity.InterestLevelId);
        }

        if (!suspended && expected.HasValue)
        {
            EnquirySetupsEntity? auto = MatchInterest(InterestRulesOf(setups), DaysLeft(expected.Value, today));

            if (auto != null)
            {
                interestId = auto.EnquirySetupId;
            }
        }

        // Who made the call
        UserProfileEntity caller =
            await _context.Set<UserProfileEntity>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserProfileId == dto.ExecutiveUserId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Choose who made the call.");

        string callerName =
            caller.DisplayName != "" ? caller.DisplayName : (caller.FullName != "" ? caller.FullName : caller.UserName);

        string NameOf(long? id) =>
            id.HasValue ? setups.FirstOrDefault(x => x.EnquirySetupId == id.Value)?.Name ?? string.Empty : string.Empty;

        DateTime now = DateTime.UtcNow;

        SalesFollowUpsEntity row =
            new()
            {
                SalesEnquiryId = entity.SalesEnquiryId,
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
                InterestFromId = entity.InterestLevelId,
                InterestFromName = NameOf(entity.InterestLevelId),
                InterestToId = interestId,
                InterestToName = NameOf(interestId),
                ExpectedPurchaseFrom = entity.ExpectedPurchaseDate,
                ExpectedPurchaseTo = expected,
                LostReasonId = lostReason?.EnquirySetupId,
                LostReasonName = lostReason?.Name ?? string.Empty,
                ExecutiveUserId = caller.UserProfileId,
                ExecutiveName = Squeeze(callerName).Length > 150 ? Squeeze(callerName)[..150] : Squeeze(callerName),
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        // The enquiry takes the latest values
        string lastNote = note.Length > 0 ? $"{outcome} : {note}" : outcome;

        entity.LastFollowUpDate = today;
        entity.LastFollowUpNote = lastNote.Length <= 500 ? lastNote : lastNote[..500];
        entity.NextFollowUpDate = next;
        entity.FollowUpMethodId = method?.EnquirySetupId ?? entity.FollowUpMethodId;
        entity.StatusId = status.EnquirySetupId;
        entity.InterestLevelId = interestId;
        entity.ExpectedPurchaseDate = expected;
        entity.LostReasonId = suspended ? lostReason!.EnquirySetupId : null;
        entity.ClosedDate = suspended ? (entity.ClosedDate ?? today) : null;

        if (!(entity.ExecutiveUserId > 0))
        {
            entity.ExecutiveUserId = caller.UserProfileId;
            entity.ExecutiveName = row.ExecutiveName;
        }

        entity.ModifiedBy = userId;
        entity.ModifiedDate = now;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        FollowUps.Add(row);

        await _context.SaveChangesAsync();

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = entity.SalesEnquiryId,
                ActivityType = "Update",
                ActivityTitle = suspended ? "Sales Enquiry Suspended (follow-up)" : "Sales Enquiry Follow-up",
                ActivityDescription =
                    Cut500($"{entity.EnquiryNo} ({entity.EnquirerName} - {entity.EnquirerMobile}) : {outcome}{(method != null ? " by " + method.Name : string.Empty)}, {row.ExecutiveName}. {note}"
                           + (row.StatusFromId != row.StatusToId ? $" Status {row.StatusFromName} to {row.StatusToName}." : string.Empty)
                           + (next.HasValue ? $" Next {next.Value:dd-MMM-yyyy}." : string.Empty)),
                PerformedBy = userId,
                PerformedByName = row.ExecutiveName,
                PerformedDate = now
            });

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return row.SalesFollowUpId;
    }


    private static string Cut500(string value) =>
        value.Length <= 500 ? value : value[..500];
}
