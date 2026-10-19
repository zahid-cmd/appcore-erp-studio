//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using ScheduledServiceEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ScheduledServices;

using ServicePolicyEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServicePolicy;

using ServicePolicyScheduleEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServicePolicySchedule;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using GeneralLedgerEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ServiceSettings;


//===============================================================
// Scheduled Service Sync
//
// Service Policy owns the list of scheduled services : one
// ScheduledService row per schedule position, matched by
// (ServicePolicyId, SequenceNo) - never by the schedule row id,
// because a policy save replaces its schedule rows.
//
// Called by Service Policy (create / update / delete / restore)
// and by the Scheduled Services page (on read, so policies saved
// before this page existed are picked up).
//
//   New position       -> new Pending row
//   Changed position   -> days / km / grace / name updated;
//                         Free <-> Paid : price cleared, Pending
//   Removed position / deleted policy
//                      -> never priced (no code, no ledger) : removed
//                         otherwise : Not in Policy, inactive
//   Brand renamed      -> names follow ("<Position> - <Brand>")
//
// The income ledger (when one exists) follows the name and is
// active only while the row is in policy and active.
//===============================================================

public static class ScheduledServicesSync
{
    //===========================================================
    // "1st Free Service" + "Revoo" -> "1st Free Service - Revoo"
    //===========================================================

    public static string BuildServiceName
    (
        string? positionName,
        string? brandName
    )
    {
        string position =
            Clean(positionName);

        string brand =
            Clean(brandName);

        return string.IsNullOrWhiteSpace(brand)
            ? position
            : $"{position} - {brand}";
    }


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
    // Sync every policy (live ones and those that still have rows)
    //===========================================================

    public static async Task
        SyncAllAsync
        (
            AppDbContext context,
            long userId
        )
    {
        List<long> policyIds =
            await context
                .Set<ServicePolicyEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .Select
                (
                    x =>
                        x.ServicePolicyId
                )
                .ToListAsync();

        List<long> rowPolicyIds =
            await context
                .Set<ScheduledServiceEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .Select
                (
                    x =>
                        x.ServicePolicyId
                )
                .Distinct()
                .ToListAsync();

        foreach
        (
            long policyId
            in policyIds
                .Concat(rowPolicyIds)
                .Distinct()
        )
        {
            await SyncPolicyAsync(
                context,
                policyId,
                userId);
        }
    }


    //===========================================================
    // Sync one policy
    //===========================================================

    public static async Task
        SyncPolicyAsync
        (
            AppDbContext context,
            long servicePolicyId,
            long userId
        )
    {
        ServicePolicyEntity? policy =
            await context
                .Set<ServicePolicyEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServicePolicyId ==
                        servicePolicyId
                );

        bool live =
            policy != null
            &&
            !policy.IsDeleted;

        List<ServicePolicyScheduleEntity> positions =
            live
                ? await context
                    .Set<ServicePolicyScheduleEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            x.ServicePolicyId ==
                            servicePolicyId
                    )
                    .OrderBy
                    (
                        x =>
                            x.SequenceNo
                    )
                    .ToListAsync()
                : new List<ServicePolicyScheduleEntity>();

        string brandName =
            policy == null
                ? string.Empty
                : await context
                    .Set<BrandManagementEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            x.BrandManagementId ==
                            policy.BrandManagementId
                    )
                    .Select
                    (
                        x =>
                            x.BrandName
                    )
                    .FirstOrDefaultAsync()
                ??
                string.Empty;

        List<ScheduledServiceEntity> rows =
            await context
                .Set<ScheduledServiceEntity>()
                .Where
                (
                    x =>
                        x.ServicePolicyId ==
                        servicePolicyId
                        &&
                        !x.IsDeleted
                )
                .ToListAsync();

        DateTime now =
            DateTime.UtcNow;

        bool changed =
            false;

        //=======================================================
        // Positions of the policy : add / update
        //=======================================================

        foreach
        (
            ServicePolicyScheduleEntity position
            in positions
        )
        {
            string positionName =
                Clean(
                    position.ServiceName);

            string serviceName =
                BuildServiceName(
                    positionName,
                    brandName);

            ScheduledServiceEntity? row =
                rows.FirstOrDefault
                (
                    x =>
                        x.SequenceNo ==
                        position.SequenceNo
                );

            if
            (
                row == null
            )
            {
                context
                    .Set<ScheduledServiceEntity>()
                    .Add
                    (
                        new ScheduledServiceEntity
                        {
                            ServicePolicyId =
                                servicePolicyId,

                            BrandManagementId =
                                policy!.BrandManagementId,

                            SequenceNo =
                                position.SequenceNo,

                            ServiceType =
                                position.ServiceType,

                            ServiceTypeNo =
                                position.ServiceTypeNo,

                            PositionName =
                                positionName,

                            ServiceName =
                                serviceName,

                            IntervalDays =
                                position.IntervalDays,

                            IntervalKm =
                                position.IntervalKm,

                            GraceDays =
                                position.GraceDays,

                            InPolicy =
                                true,

                            IsConfigured =
                                false,

                            CustomerCharge =
                                0,

                            BrandReimbursement =
                                0,

                            Remarks =
                                string.Empty,

                            IsActive =
                                true,

                            IsDeleted =
                                false,

                            CreatedBy =
                                userId,

                            CreatedDate =
                                now
                        }
                    );

                changed =
                    true;

                continue;
            }

            bool typeChanged =
                !string.Equals(
                    row.ServiceType,
                    position.ServiceType,
                    StringComparison.OrdinalIgnoreCase);

            bool rowChanged =
                typeChanged
                ||
                !row.InPolicy
                ||
                row.BrandManagementId != policy!.BrandManagementId
                ||
                row.ServiceTypeNo != position.ServiceTypeNo
                ||
                row.PositionName != positionName
                ||
                row.ServiceName != serviceName
                ||
                row.IntervalDays != position.IntervalDays
                ||
                row.IntervalKm != position.IntervalKm
                ||
                row.GraceDays != position.GraceDays;

            if
            (
                !rowChanged
            )
            {
                continue;
            }

            // Free <-> Paid : the old price no longer applies
            if
            (
                typeChanged
            )
            {
                row.CustomerCharge =
                    0;

                row.BrandReimbursement =
                    0;

                row.IsConfigured =
                    false;
            }

            // Back in the policy (e.g. policy restored) : active again
            if
            (
                !row.InPolicy
            )
            {
                row.InPolicy =
                    true;

                row.IsActive =
                    true;
            }

            row.BrandManagementId =
                policy!.BrandManagementId;

            row.ServiceType =
                position.ServiceType;

            row.ServiceTypeNo =
                position.ServiceTypeNo;

            row.PositionName =
                positionName;

            row.ServiceName =
                serviceName;

            row.IncomeLedgerName =
                string.IsNullOrWhiteSpace(row.IncomeLedgerCode)
                    ? row.IncomeLedgerName
                    : serviceName;

            row.IntervalDays =
                position.IntervalDays;

            row.IntervalKm =
                position.IntervalKm;

            row.GraceDays =
                position.GraceDays;

            row.ModifiedBy =
                userId;

            row.ModifiedDate =
                now;

            changed =
                true;
        }

        //=======================================================
        // Rows whose position is gone (or the policy is deleted)
        //=======================================================

        HashSet<int> sequenceNos =
            positions
                .Select
                (
                    x =>
                        x.SequenceNo
                )
                .ToHashSet();

        foreach
        (
            ScheduledServiceEntity row
            in rows
                .Where
                (
                    x =>
                        !sequenceNos.Contains(
                            x.SequenceNo)
                )
        )
        {
            bool neverPriced =
                !row.IsConfigured
                &&
                string.IsNullOrWhiteSpace(row.ServiceCode)
                &&
                string.IsNullOrWhiteSpace(row.IncomeLedgerCode);

            if
            (
                neverPriced
            )
            {
                context
                    .Set<ScheduledServiceEntity>()
                    .Remove(
                        row);

                changed =
                    true;

                continue;
            }

            if
            (
                !row.InPolicy
                &&
                !row.IsActive
            )
            {
                continue;
            }

            row.InPolicy =
                false;

            row.IsActive =
                false;

            row.ModifiedBy =
                userId;

            row.ModifiedDate =
                now;

            changed =
                true;
        }

        if
        (
            changed
        )
        {
            await context.SaveChangesAsync();
        }

        await SyncLedgersAsync(
            context,
            rows,
            userId);
    }


    //===========================================================
    // Income ledgers follow the row : name and active state
    //===========================================================

    private static async Task
        SyncLedgersAsync
        (
            AppDbContext context,
            List<ScheduledServiceEntity> rows,
            long userId
        )
    {
        List<ScheduledServiceEntity> withLedger =
            rows
                .Where
                (
                    x =>
                        context.Entry(x).State != EntityState.Detached
                        &&
                        !string.IsNullOrWhiteSpace(x.IncomeLedgerCode)
                )
                .ToList();

        if
        (
            withLedger.Count == 0
        )
        {
            return;
        }

        List<string> codes =
            withLedger
                .Select
                (
                    x =>
                        x.IncomeLedgerCode
                )
                .ToList();

        List<GeneralLedgerEntity> ledgers =
            await context
                .Set<GeneralLedgerEntity>()
                .Where
                (
                    x =>
                        codes.Contains(
                            x.LedgerCode)
                        &&
                        !x.IsDeleted
                )
                .ToListAsync();

        bool changed =
            false;

        foreach
        (
            ScheduledServiceEntity row
            in withLedger
        )
        {
            GeneralLedgerEntity? ledger =
                ledgers.FirstOrDefault
                (
                    x =>
                        x.LedgerCode ==
                        row.IncomeLedgerCode
                );

            if
            (
                ledger == null
            )
            {
                continue;
            }

            bool active =
                row.InPolicy
                &&
                row.IsActive;

            if
            (
                ledger.LedgerName == row.ServiceName
                &&
                ledger.IsActive == active
                &&
                row.IncomeLedgerName == row.ServiceName
            )
            {
                continue;
            }

            ledger.LedgerName =
                row.ServiceName;

            ledger.IsActive =
                active;

            ledger.ModifiedBy =
                userId;

            ledger.ModifiedDate =
                DateTime.UtcNow;

            row.IncomeLedgerName =
                row.ServiceName;

            changed =
                true;
        }

        if
        (
            changed
        )
        {
            await context.SaveChangesAsync();
        }
    }
}