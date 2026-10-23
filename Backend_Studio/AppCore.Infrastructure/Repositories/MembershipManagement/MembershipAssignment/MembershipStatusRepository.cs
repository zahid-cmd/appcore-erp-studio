//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.MembershipManagement.MembershipAssignment;

using MembershipEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipAssignment.MembershipStatus;

using WindowEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipAssignment.MembershipServiceWindows;

using MembershipCardEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipSetup.MembershipCards;

using MembershipPolicyEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipSetup.MembershipPolicies;

using CustomerEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.CustomerProfiles;

using MotorBikeEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.MembershipManagement.MembershipAssignment;


//===============================================================
// Membership Status Repository
//
// One row = one membership period of one bike (card per bike) for
// an Inbound or Outside customer.
//
// Enroll : the card's ACTIVE policy is copied onto the row (fee,
// validity, discounts, free-service rules), so later policy edits
// do not change memberships already sold.
//   Expiry = Start + Validity months - 1 day.
//   Status = Pending until Membership Fees Collection collects the
//            fee (Active at once when the fee is 0).
//
// Free services : FIXED windows from the start date, one service
// per window (MembershipServiceWindows). States :
//   Upcoming    - window not started
//   Available   - inside the window (Mark Taken while Active)
//   Lapsed      - window ended unused
//   Rescheduled - lapsed, approved for late use : until Expiry +
//                 grace days, at most MaxMissedServices per period
//   Taken       - service taken (manual until job cards exist)
// Windows never move.
//
// Status : Pending / Active / Expired (automatic after the expiry
// date) / Suspended / Cancelled (reason required) / Renewed /
// Upgraded (set by renewal / upgrade, step 3).
//
// Motor bike : Product Settings > Motor Bikes + Chassis No (one open
// membership per chassis) + Engine No. CustomerVehicleId is a
// placeholder for the Customer Vehicles link.
//===============================================================

public class MembershipStatusRepository :
    IMembershipStatusRepository
{
    //===========================================================
    // Constants
    //===========================================================

    public const string Pending = "Pending";
    public const string Active = "Active";
    public const string Expired = "Expired";
    public const string Suspended = "Suspended";
    public const string Cancelled = "Cancelled";
    public const string Renewed = "Renewed";
    public const string Upgraded = "Upgraded";

    public static readonly string[] Statuses =
    {
        Pending, Active, Expired, Suspended, Cancelled, Renewed, Upgraded
    };

    // A chassis can have one membership while Pending / Active /
    // Suspended (checked in EnsureChassisFreeAsync)

    private const string Enrollment = "Enrollment";

    private const string MembershipPrefix = "MEM-";

    private const string Months = "Months";

    private const int MaxChassisLength = 50;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public MembershipStatusRepository(
        AppDbContext context)
    {
        _context = context;
    }


    private static DateOnly Today =>
        DateOnly.FromDateTime(DateTime.Now);


    //===========================================================
    // Expire automatically (on every read)
    //===========================================================

    private async Task SyncExpiredAsync()
    {
        DateOnly today = Today;

        List<MembershipEntity> due =
            await _context
                .Set<MembershipEntity>()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (x.Status == Active || x.Status == Suspended)
                        &&
                        x.ExpiryDate < today
                )
                .ToListAsync();

        if (due.Count == 0)
        {
            return;
        }

        foreach (MembershipEntity item in due)
        {
            item.Status = Expired;
            item.StatusReason = "Expired automatically after the expiry date.";
            item.StatusDate = item.ExpiryDate.AddDays(1);
            item.ModifiedDate = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Get All (live memberships, newest first)
    //===========================================================

    public async Task<List<MembershipStatusDto>> GetAllAsync()
    {
        await SyncExpiredAsync();

        List<MembershipEntity> rows =
            await _context
                .Set<MembershipEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.MembershipId)
                .ToListAsync();

        return await ToDtosAsync(rows, false);
    }


    //===========================================================
    // Get By Id (with its windows)
    //===========================================================

    public async Task<MembershipStatusDto?> GetByIdAsync(
        long id)
    {
        await SyncExpiredAsync();

        MembershipEntity? row =
            await _context
                .Set<MembershipEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MembershipId == id && !x.IsDeleted);

        if (row == null)
        {
            return null;
        }

        return (await ToDtosAsync(new List<MembershipEntity> { row }, true))
            .FirstOrDefault();
    }


    //===========================================================
    // Map to DTOs
    //===========================================================

    private async Task<List<MembershipStatusDto>> ToDtosAsync(
        List<MembershipEntity> rows,
        bool withWindows)
    {
        List<long> ids = rows.Select(x => x.MembershipId).ToList();
        List<long> cardIds = rows.Select(x => x.MembershipCardId).Distinct().ToList();
        List<long> policyIds = rows.Select(x => x.MembershipPolicyId).Distinct().ToList();
        List<long> customerIds = rows.Select(x => x.CustomerId).Distinct().ToList();
        List<long> bikeIds = rows.Select(x => x.MotorBikeId).Distinct().ToList();

        Dictionary<long, MembershipCardEntity> cards =
            await _context.Set<MembershipCardEntity>().AsNoTracking()
                .Where(x => cardIds.Contains(x.MembershipCardId))
                .ToDictionaryAsync(x => x.MembershipCardId);

        Dictionary<long, string> policies =
            await _context.Set<MembershipPolicyEntity>().AsNoTracking()
                .Where(x => policyIds.Contains(x.MembershipPolicyId))
                .ToDictionaryAsync(x => x.MembershipPolicyId, x => x.PolicyCode);

        Dictionary<long, CustomerEntity> customers =
            await _context.Set<CustomerEntity>().AsNoTracking()
                .Where(x => customerIds.Contains(x.CustomerId))
                .ToDictionaryAsync(x => x.CustomerId);

        Dictionary<long, MotorBikeEntity> bikes =
            await _context.Set<MotorBikeEntity>().AsNoTracking()
                .Where(x => bikeIds.Contains(x.MotorBikeId))
                .ToDictionaryAsync(x => x.MotorBikeId);

        List<WindowEntity> windows =
            await _context.Set<WindowEntity>().AsNoTracking()
                .Where(x => ids.Contains(x.MembershipId))
                .OrderBy(x => x.WindowNo)
                .ToListAsync();

        DateOnly today = Today;

        List<MembershipStatusDto> result = new List<MembershipStatusDto>();

        foreach (MembershipEntity x in rows)
        {
            MembershipCardEntity? card = cards.GetValueOrDefault(x.MembershipCardId);
            CustomerEntity? customer = customers.GetValueOrDefault(x.CustomerId);
            MotorBikeEntity? bike = bikes.GetValueOrDefault(x.MotorBikeId);

            List<WindowEntity> own =
                windows.Where(w => w.MembershipId == x.MembershipId).ToList();

            int approvedCount = own.Count(w => w.IsApproved);

            List<MembershipServiceWindowDto> windowDtos =
                own.Select(w => ToWindowDto(x, w, approvedCount, today)).ToList();

            MembershipStatusDto dto = new MembershipStatusDto
            {
                MembershipId = x.MembershipId,
                MembershipNo = x.MembershipNo,
                EntryType = x.EntryType,
                PreviousMembershipId = x.PreviousMembershipId,
                MembershipCardId = x.MembershipCardId,
                MembershipPolicyId = x.MembershipPolicyId,
                CustomerId = x.CustomerId,

                CardCode = card?.CardCode ?? string.Empty,
                CardName = card?.CardName ?? string.Empty,
                PolicyCode = policies.GetValueOrDefault(x.MembershipPolicyId) ?? string.Empty,
                CustomerCode = customer?.CustomerCode ?? string.Empty,
                CustomerName = customer?.DisplayName ?? string.Empty,
                CustomerType = customer?.CustomerType ?? string.Empty,
                MotorBikeName = bike == null ? string.Empty : $"{bike.ProductCode} - {bike.ProductName}",

                UsedCount = windowDtos.Count(w => w.State == "Taken"),
                MissedCount = windowDtos.Count(w => w.State == "Lapsed"),
                ApprovedCount = approvedCount,
                IsEditable = x.Status == Pending,
                Windows = withWindows ? windowDtos : new List<MembershipServiceWindowDto>(),

                CustomerVehicleId = x.CustomerVehicleId,
                MotorBikeId = x.MotorBikeId,
                ChassisNo = x.ChassisNo,
                EngineNo = x.EngineNo,

                EnrollmentDate = x.EnrollmentDate,
                StartDate = x.StartDate,
                ExpiryDate = x.ExpiryDate,
                FeeAmount = x.FeeAmount,
                FeeCollected = x.FeeCollected,
                FeeCollectedDate = x.FeeCollectedDate,

                ValidityMonths = x.ValidityMonths,
                SparePartsDiscountPercent = x.SparePartsDiscountPercent,
                AccessoriesDiscountPercent = x.AccessoriesDiscountPercent,
                ServiceChargeDiscountPercent = x.ServiceChargeDiscountPercent,
                FreeServiceCount = x.FreeServiceCount,
                CarriedServiceCount = x.CarriedServiceCount,
                ServiceInterval = x.ServiceInterval,
                ServiceIntervalUnit = x.ServiceIntervalUnit,
                MissedServiceGraceDays = x.MissedServiceGraceDays,
                MaxMissedServices = x.MaxMissedServices,

                Status = x.Status,
                StatusReason = x.StatusReason,
                StatusDate = x.StatusDate,
                Remarks = x.Remarks,

                IsDeleted = x.IsDeleted,
                DeletedBy = x.DeletedBy,
                DeletedDate = x.DeletedDate,
                CreatedBy = x.CreatedBy,
                CreatedDate = x.CreatedDate,
                ModifiedBy = x.ModifiedBy,
                ModifiedDate = x.ModifiedDate
            };

            result.Add(dto);
        }

        return result;
    }


    //===========================================================
    // Window state and what can be done now
    //===========================================================

    private static string WindowState(
        WindowEntity w,
        DateOnly today)
    {
        if (w.UsedDate != null)
        {
            return "Taken";
        }

        if (w.IsApproved)
        {
            return "Rescheduled";
        }

        if (today < w.FromDate)
        {
            return "Upcoming";
        }

        return today <= w.ToDate
            ? "Available"
            : "Lapsed";
    }


    // Last day a missed (approved) service can still be given
    private static DateOnly LateLimit(
        MembershipEntity m)
    {
        return m.ExpiryDate.AddDays(m.MissedServiceGraceDays);
    }


    private static MembershipServiceWindowDto ToWindowDto(
        MembershipEntity m,
        WindowEntity w,
        int approvedCount,
        DateOnly today)
    {
        string state = WindowState(w, today);

        bool lateOpen =
            (m.Status == Active || m.Status == Expired)
            &&
            today <= LateLimit(m);

        return new MembershipServiceWindowDto
        {
            MembershipServiceWindowId = w.MembershipServiceWindowId,
            WindowNo = w.WindowNo,
            FromDate = w.FromDate,
            ToDate = w.ToDate,
            IsCarriedOver = w.IsCarriedOver,
            State = state,
            UsedDate = w.UsedDate,
            UsedReference = w.UsedReference,
            IsApproved = w.IsApproved,
            ApprovedDate = w.ApprovedDate,
            ApprovalReason = w.ApprovalReason,

            CanUse =
                (state == "Available" && m.Status == Active)
                ||
                (state == "Rescheduled" && lateOpen),

            CanUndo =
                state == "Taken"
                &&
                m.Status != Cancelled,

            CanApprove =
                state == "Lapsed"
                &&
                lateOpen
                &&
                approvedCount < m.MaxMissedServices
        };
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<MembershipStatusDefaultsDto> GetDefaultsAsync()
    {
        List<MembershipCardEntity> cards =
            await _context.Set<MembershipCardEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.CardRank)
                .ToListAsync();

        List<long> cardIds = cards.Select(x => x.MembershipCardId).ToList();

        List<MembershipPolicyEntity> policies =
            await _context.Set<MembershipPolicyEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && cardIds.Contains(x.MembershipCardId))
                .ToListAsync();

        MembershipStatusDefaultsDto result = new MembershipStatusDefaultsDto
        {
            NextMembershipNo = await NextMembershipNoAsync(),
            Today = Today.ToString("yyyy-MM-dd"),
            Statuses = Statuses.ToList()
        };

        foreach (MembershipCardEntity card in cards)
        {
            MembershipPolicyEntity? policy =
                policies.FirstOrDefault(x => x.MembershipCardId == card.MembershipCardId);

            if (policy == null)
            {
                continue;
            }

            result.Cards.Add(new MembershipStatusCardOptionDto
            {
                MembershipCardId = card.MembershipCardId,
                CardCode = card.CardCode,
                CardName = card.CardName,
                CardRank = card.CardRank,
                MembershipPolicyId = policy.MembershipPolicyId,
                PolicyCode = policy.PolicyCode,
                ValidityMonths = policy.ValidityMonths,
                EnrollmentFee = policy.EnrollmentFee,
                SparePartsDiscountPercent = policy.SparePartsDiscountPercent,
                AccessoriesDiscountPercent = policy.AccessoriesDiscountPercent,
                ServiceChargeDiscountPercent = policy.ServiceChargeDiscountPercent,
                FreeServiceCount = policy.FreeServiceCount,
                ServiceInterval = policy.ServiceInterval,
                ServiceIntervalUnit = policy.ServiceIntervalUnit,
                MissedServiceGraceDays = policy.MissedServiceGraceDays,
                MaxMissedServices = policy.MaxMissedServices
            });
        }

        result.Customers =
            await _context.Set<CustomerEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.DisplayName)
                .Select(x => new MembershipStatusCustomerOptionDto
                {
                    CustomerId = x.CustomerId,
                    CustomerCode = x.CustomerCode,
                    DisplayName = x.DisplayName,
                    CustomerType = x.CustomerType
                })
                .ToListAsync();

        result.MotorBikes =
            await _context.Set<MotorBikeEntity>().AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.ProductCode)
                .Select(x => new MembershipStatusMotorBikeOptionDto
                {
                    MotorBikeId = x.MotorBikeId,
                    ProductCode = x.ProductCode,
                    ProductName = x.ProductName
                })
                .ToListAsync();

        return result;
    }


    //===========================================================
    // Next Membership No (highest, deleted included, + 1)
    //===========================================================

    private async Task<string> NextMembershipNoAsync()
    {
        List<string> codes =
            await _context.Set<MembershipEntity>().AsNoTracking()
                .Select(x => x.MembershipNo)
                .ToListAsync();

        int highest =
            codes
                .Where(c => (c ?? string.Empty).StartsWith(MembershipPrefix, StringComparison.OrdinalIgnoreCase))
                .Select(c => int.TryParse(c.Substring(MembershipPrefix.Length), out int n) ? n : 0)
                .DefaultIfEmpty(0)
                .Max();

        return CodeGenerator.GenerateMembershipNo(highest + 1);
    }


    //===========================================================
    // Validation helpers
    //===========================================================

    private static string CleanCode(
        string? value)
    {
        return string.Join(
                " ",
                (value ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries))
            .ToUpperInvariant();
    }


    private sealed class EnrollContext
    {
        public MembershipCardEntity Card { get; set; } = null!;
        public MembershipPolicyEntity Policy { get; set; } = null!;
        public CustomerEntity Customer { get; set; } = null!;
        public MotorBikeEntity MotorBike { get; set; } = null!;
        public string ChassisNo { get; set; } = string.Empty;
        public string EngineNo { get; set; } = string.Empty;
    }


    private async Task<EnrollContext> ValidateEnrollAsync(
        CreateMembershipStatusDto dto,
        long excludeId)
    {
        MembershipCardEntity card =
            await _context.Set<MembershipCardEntity>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.MembershipCardId == dto.MembershipCardId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Membership Card is required.");

        if (!card.IsActive)
        {
            throw new InvalidOperationException($"Membership Card '{card.CardName}' is inactive.");
        }

        MembershipPolicyEntity policy =
            await _context.Set<MembershipPolicyEntity>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.MembershipCardId == card.MembershipCardId && !x.IsDeleted)
            ?? throw new InvalidOperationException($"Membership Card '{card.CardName}' has no policy (Membership Setup > Membership Policies).");

        if (!policy.IsActive)
        {
            throw new InvalidOperationException($"The policy {policy.PolicyCode} of '{card.CardName}' is inactive.");
        }

        CustomerEntity customer =
            await _context.Set<CustomerEntity>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.CustomerId == dto.CustomerId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Customer is required.");

        if (!customer.IsActive)
        {
            throw new InvalidOperationException($"Customer '{customer.DisplayName}' is inactive.");
        }

        MotorBikeEntity bike =
            await _context.Set<MotorBikeEntity>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.MotorBikeId == dto.MotorBikeId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Motor Bike is required.");

        string chassis = CleanCode(dto.ChassisNo);

        if (string.IsNullOrWhiteSpace(chassis))
        {
            throw new InvalidOperationException("Chassis No is required.");
        }

        if (chassis.Length > MaxChassisLength)
        {
            throw new InvalidOperationException($"Chassis No cannot be longer than {MaxChassisLength} characters.");
        }

        string engine = CleanCode(dto.EngineNo);

        if (engine.Length > MaxChassisLength)
        {
            throw new InvalidOperationException($"Engine No cannot be longer than {MaxChassisLength} characters.");
        }

        await EnsureChassisFreeAsync(chassis, excludeId);

        return new EnrollContext
        {
            Card = card,
            Policy = policy,
            Customer = customer,
            MotorBike = bike,
            ChassisNo = chassis,
            EngineNo = engine
        };
    }


    private async Task EnsureChassisFreeAsync(
        string chassis,
        long excludeId)
    {
        MembershipEntity? open =
            await _context.Set<MembershipEntity>().AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.MembershipId != excludeId
                        &&
                        x.ChassisNo == chassis
                        &&
                        (x.Status == Pending || x.Status == Active || x.Status == Suspended)
                );

        if (open != null)
        {
            throw new InvalidOperationException(
                $"Chassis No {chassis} already has the membership {open.MembershipNo} ({open.Status}).");
        }
    }


    //===========================================================
    // Copy the policy and build the period
    //===========================================================

    private static void ApplyPolicy(
        MembershipEntity m,
        MembershipPolicyEntity policy,
        DateOnly startDate)
    {
        m.MembershipPolicyId = policy.MembershipPolicyId;
        m.ValidityMonths = policy.ValidityMonths;
        m.FeeAmount = policy.EnrollmentFee;
        m.SparePartsDiscountPercent = policy.SparePartsDiscountPercent;
        m.AccessoriesDiscountPercent = policy.AccessoriesDiscountPercent;
        m.ServiceChargeDiscountPercent = policy.ServiceChargeDiscountPercent;
        m.FreeServiceCount = policy.FreeServiceCount;
        m.CarriedServiceCount = 0;
        m.ServiceInterval = policy.ServiceInterval;
        m.ServiceIntervalUnit = policy.ServiceIntervalUnit;
        m.MissedServiceGraceDays = policy.MissedServiceGraceDays;
        m.MaxMissedServices = policy.MaxMissedServices;
        m.StartDate = startDate;
        m.ExpiryDate = startDate.AddMonths(policy.ValidityMonths).AddDays(-1);
    }


    // Fixed windows from the start date; never past the expiry
    private static List<WindowEntity> BuildWindows(
        MembershipEntity m,
        long userId)
    {
        List<WindowEntity> windows = new List<WindowEntity>();

        if (m.FreeServiceCount <= 0 || m.ServiceInterval <= 0)
        {
            return windows;
        }

        DateOnly Step(int n) =>
            m.ServiceIntervalUnit == Months
                ? m.StartDate.AddMonths(n * m.ServiceInterval)
                : m.StartDate.AddDays(n * m.ServiceInterval);

        for (int i = 0; i < m.FreeServiceCount; i++)
        {
            DateOnly from = Step(i);

            if (from > m.ExpiryDate)
            {
                break;
            }

            DateOnly to = Step(i + 1).AddDays(-1);

            if (to > m.ExpiryDate)
            {
                to = m.ExpiryDate;
            }

            windows.Add(new WindowEntity
            {
                MembershipId = m.MembershipId,
                WindowNo = i + 1,
                FromDate = from,
                ToDate = to,
                IsCarriedOver = false,
                UsedReference = string.Empty,
                ApprovalReason = string.Empty,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            });
        }

        return windows;
    }


    private static void ValidateDates(
        DateOnly enrollmentDate,
        DateOnly startDate)
    {
        if (enrollmentDate == default || startDate == default)
        {
            throw new InvalidOperationException("Enrollment Date and Start Date are required.");
        }

        if (startDate < enrollmentDate)
        {
            throw new InvalidOperationException("Start Date cannot be before the Enrollment Date.");
        }
    }


    //===========================================================
    // Create (Enroll)
    //===========================================================

    public async Task<long> CreateAsync(
        CreateMembershipStatusDto dto,
        long userId)
    {
        ValidateDates(dto.EnrollmentDate, dto.StartDate);

        EnrollContext ctx = await ValidateEnrollAsync(dto, 0);

        MembershipEntity m = new MembershipEntity
        {
            MembershipNo = await NextMembershipNoAsync(),
            EntryType = Enrollment,
            MembershipCardId = ctx.Card.MembershipCardId,
            CustomerId = ctx.Customer.CustomerId,
            MotorBikeId = ctx.MotorBike.MotorBikeId,
            ChassisNo = ctx.ChassisNo,
            EngineNo = ctx.EngineNo,
            EnrollmentDate = dto.EnrollmentDate,
            Remarks = dto.Remarks?.Trim() ?? string.Empty,
            StatusReason = string.Empty,
            IsDeleted = false,
            CreatedBy = userId,
            CreatedDate = DateTime.UtcNow
        };

        ApplyPolicy(m, ctx.Policy, dto.StartDate);

        // A free card is active at once; otherwise the fee is collected first
        m.Status = m.FeeAmount > 0 ? Pending : Active;
        m.FeeCollected = m.FeeAmount <= 0;
        m.StatusDate = m.FeeAmount > 0 ? null : dto.EnrollmentDate;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        _context.Set<MembershipEntity>().Add(m);

        await _context.SaveChangesAsync();

        _context.Set<WindowEntity>().AddRange(BuildWindows(m, userId));

        AddHistory(m, "Create", "Enrolled", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return m.MembershipId;
    }


    //===========================================================
    // Update
    //
    // Pending : card, customer, bike, chassis, engine, dates (the
    // policy and windows are rebuilt). Otherwise only Status and
    // Remarks. Status changes by hand :
    //   Pending   -> Cancelled
    //   Active    -> Suspended / Cancelled
    //   Suspended -> Active / Cancelled
    // Pending -> Active happens in Fees Collection; Expired is set
    // automatically; Renewed / Upgraded by renewal / upgrade.
    //===========================================================

    public async Task UpdateAsync(
        UpdateMembershipStatusDto dto,
        long userId)
    {
        MembershipEntity m =
            await _context.Set<MembershipEntity>()
                .FirstOrDefaultAsync(x => x.MembershipId == dto.MembershipId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Membership not found.");

        string newStatus =
            Statuses.FirstOrDefault(x => string.Equals(x, dto.Status?.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? m.Status;

        string reason = dto.StatusReason?.Trim() ?? string.Empty;

        if (newStatus != m.Status)
        {
            bool allowed =
                (m.Status == Pending && newStatus == Cancelled)
                ||
                (m.Status == Active && (newStatus == Suspended || newStatus == Cancelled))
                ||
                (m.Status == Suspended && (newStatus == Active || newStatus == Cancelled));

            if (!allowed)
            {
                throw new InvalidOperationException(
                    m.Status == Pending && newStatus == Active
                        ? "A Pending membership becomes Active when its fee is collected (Membership Fees Collection)."
                        : $"Status cannot change from {m.Status} to {newStatus}.");
            }

            if ((newStatus == Suspended || newStatus == Cancelled) && string.IsNullOrWhiteSpace(reason))
            {
                throw new InvalidOperationException($"A reason is required to set the membership {newStatus}.");
            }

            if (newStatus == Active && m.ExpiryDate < Today)
            {
                throw new InvalidOperationException("The membership has passed its expiry date. Renew it instead.");
            }
        }

        bool rebuild = false;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (m.Status == Pending && newStatus == Pending)
        {
            ValidateDates(dto.EnrollmentDate, dto.StartDate);

            EnrollContext ctx =
                await ValidateEnrollAsync(
                    new CreateMembershipStatusDto
                    {
                        MembershipCardId = dto.MembershipCardId,
                        CustomerId = dto.CustomerId,
                        MotorBikeId = dto.MotorBikeId,
                        ChassisNo = dto.ChassisNo,
                        EngineNo = dto.EngineNo,
                        EnrollmentDate = dto.EnrollmentDate,
                        StartDate = dto.StartDate,
                        Remarks = dto.Remarks
                    },
                    m.MembershipId);

            m.MembershipCardId = ctx.Card.MembershipCardId;
            m.CustomerId = ctx.Customer.CustomerId;
            m.MotorBikeId = ctx.MotorBike.MotorBikeId;
            m.ChassisNo = ctx.ChassisNo;
            m.EngineNo = ctx.EngineNo;
            m.EnrollmentDate = dto.EnrollmentDate;

            // Still Pending : the card's current policy applies
            ApplyPolicy(m, ctx.Policy, dto.StartDate);

            if (m.FeeAmount <= 0)
            {
                m.Status = Active;
                m.FeeCollected = true;
                m.StatusDate = Today;
                m.StatusReason = string.Empty;
            }

            // Nothing is used while Pending : the windows are rebuilt
            rebuild = true;
        }
        else if (newStatus != m.Status)
        {
            m.Status = newStatus;
            m.StatusReason = reason;
            m.StatusDate = Today;
        }

        m.Remarks = dto.Remarks?.Trim() ?? string.Empty;
        m.ModifiedBy = userId;
        m.ModifiedDate = DateTime.UtcNow;

        if (rebuild)
        {
            List<WindowEntity> old =
                await _context.Set<WindowEntity>()
                    .Where(x => x.MembershipId == m.MembershipId)
                    .ToListAsync();

            _context.Set<WindowEntity>().RemoveRange(old);

            _context.Set<WindowEntity>().AddRange(BuildWindows(m, userId));
        }

        await _context.SaveChangesAsync();

        AddHistory(m, "Update", "Updated", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Delete (soft) : only while Pending (no fee collected)
    //===========================================================

    public async Task DeleteAsync(
        long id,
        long userId)
    {
        MembershipEntity m =
            await _context.Set<MembershipEntity>()
                .FirstOrDefaultAsync(x => x.MembershipId == id && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Membership not found.");

        if (m.Status != Pending || m.FeeCollected)
        {
            throw new InvalidOperationException(
                $"Membership {m.MembershipNo} is {m.Status}. Only a Pending membership can be deleted; cancel it instead.");
        }

        m.IsDeleted = true;
        m.DeletedBy = userId;
        m.DeletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(m, "Delete", "Deleted", userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore (most recently deleted)
    //===========================================================

    public async Task<bool> RestoreAsync(
        long userId)
    {
        MembershipEntity? m =
            await _context.Set<MembershipEntity>()
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (m == null)
        {
            return false;
        }

        try
        {
            await EnsureChassisFreeAsync(m.ChassisNo, m.MembershipId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"Membership {m.MembershipNo} cannot be restored. {ex.Message}");
        }

        m.IsDeleted = false;
        m.DeletedBy = null;
        m.DeletedDate = null;
        m.ModifiedBy = userId;
        m.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(m, "Restore", "Restored", userId);

        await _context.SaveChangesAsync();

        return true;
    }


    //===========================================================
    // Free Service Windows
    //===========================================================

    private async Task<(MembershipEntity Membership, WindowEntity Window, MembershipServiceWindowDto State)>
        LoadWindowAsync(
            long membershipId,
            long windowId)
    {
        await SyncExpiredAsync();

        MembershipEntity m =
            await _context.Set<MembershipEntity>()
                .FirstOrDefaultAsync(x => x.MembershipId == membershipId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Membership not found.");

        WindowEntity w =
            await _context.Set<WindowEntity>()
                .FirstOrDefaultAsync(x => x.MembershipServiceWindowId == windowId && x.MembershipId == membershipId)
            ?? throw new KeyNotFoundException("Free service window not found.");

        int approvedCount =
            await _context.Set<WindowEntity>()
                .CountAsync(x => x.MembershipId == membershipId && x.IsApproved);

        return (m, w, ToWindowDto(m, w, approvedCount, Today));
    }


    // Mark Used : an Available window (membership Active) or an
    // Approved missed window (until expiry + grace)
    public async Task UseWindowAsync(
        long membershipId,
        long windowId,
        UseMembershipServiceDto dto,
        long userId)
    {
        var (m, w, state) = await LoadWindowAsync(membershipId, windowId);

        if (!state.CanUse)
        {
            throw new InvalidOperationException(
                state.State == "Lapsed"
                    ? $"Free service {w.WindowNo} has lapsed. It needs approval (reschedule) before it can be given."
                    : $"Free service {w.WindowNo} cannot be used now ({state.State}; membership {m.Status}).");
        }

        DateOnly today = Today;
        DateOnly used = dto.UsedDate == default ? today : dto.UsedDate;

        if (used > today)
        {
            throw new InvalidOperationException("Used Date cannot be in the future.");
        }

        DateOnly earliest = w.IsApproved && w.ApprovedDate != null ? w.ApprovedDate.Value : w.FromDate;
        DateOnly latest = w.IsApproved ? LateLimit(m) : w.ToDate;

        if (used < earliest || used > latest)
        {
            throw new InvalidOperationException(
                $"Used Date must be from {earliest:dd-MMM-yyyy} to {latest:dd-MMM-yyyy}.");
        }

        w.UsedDate = used;
        w.UsedReference = (dto.Reference ?? string.Empty).Trim();
        w.UsedBy = userId;
        w.ModifiedBy = userId;
        w.ModifiedDate = DateTime.UtcNow;

        AddHistory(m, "Update", $"Free Service {w.WindowNo} Taken", userId);

        await _context.SaveChangesAsync();
    }


    // Undo a wrongly marked use
    public async Task UndoUseWindowAsync(
        long membershipId,
        long windowId,
        long userId)
    {
        var (m, w, state) = await LoadWindowAsync(membershipId, windowId);

        if (!state.CanUndo)
        {
            throw new InvalidOperationException($"Free service {w.WindowNo} is not marked used.");
        }

        w.UsedDate = null;
        w.UsedReference = string.Empty;
        w.UsedBy = null;
        w.ModifiedBy = userId;
        w.ModifiedDate = DateTime.UtcNow;

        AddHistory(m, "Update", $"Free Service {w.WindowNo} Taken Undone", userId);

        await _context.SaveChangesAsync();
    }


    // Approve a missed window for late use
    public async Task ApproveWindowAsync(
        long membershipId,
        long windowId,
        ApproveMembershipServiceDto dto,
        long userId)
    {
        var (m, w, state) = await LoadWindowAsync(membershipId, windowId);

        string reason = (dto.Reason ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new InvalidOperationException("A reason is required to reschedule a lapsed service.");
        }

        if (!state.CanApprove)
        {
            throw new InvalidOperationException(
                state.State != "Lapsed"
                    ? $"Free service {w.WindowNo} has not lapsed ({state.State})."
                    : Today > LateLimit(m)
                        ? $"The approval period ended on {LateLimit(m):dd-MMM-yyyy} (expiry + {m.MissedServiceGraceDays} grace days)."
                        : $"No more lapsed services can be rescheduled (maximum {m.MaxMissedServices}), or the membership is {m.Status}.");
        }

        w.IsApproved = true;
        w.ApprovedDate = Today;
        w.ApprovedBy = userId;
        w.ApprovalReason = reason;
        w.ModifiedBy = userId;
        w.ModifiedDate = DateTime.UtcNow;

        AddHistory(m, "Update", $"Lapsed Free Service {w.WindowNo} Rescheduled", userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory(
        MembershipEntity m,
        string activityType,
        string verb,
        long userId)
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = "Membership Management",
                EntityName = "Membership Status",
                EntityId = m.MembershipId,
                ActivityType = activityType,
                ActivityTitle = $"Membership {verb}",
                ActivityDescription = $"Membership {m.MembershipNo} ({m.ChassisNo}) {verb.ToLower()}.",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }


    //===========================================================
    // Exists
    //===========================================================

    public async Task<bool> ExistsAsync(
        long id)
    {
        return await _context.Set<MembershipEntity>()
            .AnyAsync(x => x.MembershipId == id && !x.IsDeleted);
    }
}