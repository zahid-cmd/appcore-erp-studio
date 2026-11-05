//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Domain.Common;
using AppCore.Infrastructure.CodeMaster;
using ServiceEnquiriesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceEnquiries;
using ServiceEnquiryLinesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceEnquiryLines;
using ServiceVehiclesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceVehicles;
using ServiceVehicleSchedulesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceVehicleSchedules;
using EnquiryContactsEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquiryContacts;
using EnquirySetupsEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.EnquirySetups;
using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;
using CustomerProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.CustomerProfiles;
using ServicePolicyEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServicePolicy;
using ServicePolicyScheduleEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServicePolicySchedule;
using ScheduledServicesEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ScheduledServices;


//===============================================================
// Namespace (as registered by Code Synchronization)
//===============================================================

namespace AppCore.Infrastructure.Configurations.EnquiryManagement.EnquiryProfiles;


//===============================================================
// Service Enquiries Repository : sold bikes (our outlet)
//
// Two sides of service enquiries :
//   • outside customers : enquiries typed in / from the website
//   • bikes sold from our outlet : ServiceVehicles. Saving a
//     motor bike sale (Sales Invoices - MB) calls
//     CreateScheduleForSaleAsync; bikes sold before the ERP are
//     added by hand. Each bike gets one schedule row per service
//     position of its brand's Service Policy :
//         due = sale date + the position's days
//         last day = due + grace days
//     After a service is taken the next ones are counted again
//     from that day. A due date changed by hand is kept.
//   • LeadDays (7) before a service is due, a Service Enquiry is
//     raised (Source "Scheduled", unassigned, the service on its
//     line) — or the service goes on the mobile's open service
//     enquiry. Run by every list read (RaiseDueSchedulesAsync).
//   • A free service past the warranty (policy years) is shown
//     "Out of warranty" and raises nothing.
//===============================================================

public partial class ServiceEnquiriesRepository
{
    // Days before a due date when the enquiry is raised
    // Days before the due date (switch CFG-MOD-010-0026 : ON = its
    // value, default 7; OFF = raised on the due date). Loaded by
    // LoadLeadDaysAsync before it is used.
    private int? _leadDays;

    private int LeadDays => _leadDays ?? 7;

    private async Task LoadLeadDaysAsync()
    {
        _leadDays =
            await EnquirySwitches.NumberAsync(_context, EnquirySwitches.ServiceLeadDays, 7, 0, 60) ?? 0;
    }

    private const string VehicleHistoryEntity = "ServiceVehicles";

    private const long SystemUserId = 0;

    private DbSet<ServiceVehiclesEntity> Vehicles =>
        _context.Set<ServiceVehiclesEntity>();

    private DbSet<ServiceVehicleSchedulesEntity> Schedules =>
        _context.Set<ServiceVehicleSchedulesEntity>();



    //===========================================================
    // Policy → schedule rows
    //===========================================================

    private sealed record PolicyPlan
    (
        ServicePolicyEntity Policy,
        List<ServicePolicyScheduleEntity> Positions,
        Dictionary<int, ScheduledServicesEntity> Priced
    );


    // The brand's live Service Policy (null = none)
    private async Task<PolicyPlan?> PolicyOfBrandAsync
    (
        long brandId
    )
    {
        ServicePolicyEntity? policy =
            await _context.Set<ServicePolicyEntity>().AsNoTracking()
                .Where(x => x.BrandManagementId == brandId && !x.IsDeleted && x.IsActive)
                .OrderByDescending(x => x.ServicePolicyId)
                .FirstOrDefaultAsync();

        if (policy == null)
        {
            return null;
        }

        List<ServicePolicyScheduleEntity> positions =
            await _context.Set<ServicePolicyScheduleEntity>().AsNoTracking()
                .Where(x => x.ServicePolicyId == policy.ServicePolicyId)
                .OrderBy(x => x.SequenceNo)
                .ToListAsync();

        Dictionary<int, ScheduledServicesEntity> priced =
            (await _context.Set<ScheduledServicesEntity>().AsNoTracking()
                .Where(x => x.ServicePolicyId == policy.ServicePolicyId && !x.IsDeleted)
                .ToListAsync())
            .GroupBy(x => x.SequenceNo)
            .ToDictionary(g => g.Key, g => g.First());

        return new PolicyPlan(policy, positions, priced);
    }


    private static List<ServiceVehicleSchedulesEntity> BuildRows
    (
        PolicyPlan plan,
        long userId
    )
    {
        return plan.Positions
            .Select(p => new ServiceVehicleSchedulesEntity
            {
                SequenceNo = p.SequenceNo,
                ServiceType = string.Equals(p.ServiceType, "Paid", StringComparison.OrdinalIgnoreCase) ? "Paid" : "Free",
                ServiceName =
                    plan.Priced.TryGetValue(p.SequenceNo, out ScheduledServicesEntity? s) && !string.IsNullOrWhiteSpace(s.ServiceName)
                        ? Cut(s.ServiceName, 150)
                        : Cut(p.ServiceName, 150),
                ScheduledServiceId = plan.Priced.TryGetValue(p.SequenceNo, out ScheduledServicesEntity? t) ? t.ScheduledServiceId : null,
                IntervalDays = p.IntervalDays,
                IntervalKm = p.IntervalKm,
                GraceDays = p.GraceDays,
                Status = "Upcoming",
                EnquiryNo = string.Empty,
                TakenDocType = string.Empty,
                TakenDocNo = string.Empty,
                Note = string.Empty,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            })
            .ToList();
    }


    // Due dates / km : from the sale, then from each taken service
    private static void Recalculate
    (
        ServiceVehiclesEntity vehicle,
        IEnumerable<ServiceVehicleSchedulesEntity> rows
    )
    {
        DateOnly anchorDate = vehicle.SaleDate;

        int anchorDays = 0;

        int anchorKm = 0;

        int anchorIntervalKm = 0;

        foreach (ServiceVehicleSchedulesEntity row in rows.OrderBy(x => x.SequenceNo))
        {
            if (row.Status == "Taken" && row.TakenDate.HasValue)
            {
                anchorDate = row.TakenDate.Value;

                anchorDays = row.IntervalDays;

                if (row.TakenKm.HasValue)
                {
                    anchorKm = row.TakenKm.Value;

                    anchorIntervalKm = row.IntervalKm;
                }

                continue;
            }

            if (!row.DueDateEdited)
            {
                row.DueDate = anchorDate.AddDays(Math.Max(0, row.IntervalDays - anchorDays));
            }

            row.LastDate = row.DueDate.AddDays(Math.Max(0, row.GraceDays));

            row.DueKm =
                row.IntervalKm > 0
                    ? anchorKm + Math.Max(0, row.IntervalKm - anchorIntervalKm)
                    : 0;
        }
    }


    private string StatusTextOf
    (
        ServiceVehiclesEntity vehicle,
        ServiceVehicleSchedulesEntity row,
        IReadOnlyDictionary<long, (bool Deleted, bool Lost, bool Converted)> enquiries,
        DateOnly today
    )
    {
        switch (row.Status)
        {
            case "Taken":
                return "Taken";

            case "Skipped":
                return "Skipped";

            case "Enquired":
                if (row.ServiceEnquiryId.HasValue && enquiries.TryGetValue(row.ServiceEnquiryId.Value, out var e))
                {
                    if (e.Deleted) return "Enquiry deleted";

                    if (e.Converted) return "Taken";

                    if (e.Lost) return "Declined";
                }

                return "Enquired";
        }

        if (row.ServiceType == "Free" && OutOfWarranty(vehicle, row, today))
        {
            return "Out of warranty";
        }

        if (today < row.DueDate.AddDays(-LeadDays))
        {
            return "Upcoming";
        }

        return today <= row.LastDate ? "Due" : "Missed";
    }


    // A free service must be taken within the warranty (years / km)
    private static bool OutOfWarranty
    (
        ServiceVehiclesEntity vehicle,
        ServiceVehicleSchedulesEntity row,
        DateOnly today
    )
    {
        if (vehicle.WarrantyUntil.HasValue && (today > vehicle.WarrantyUntil.Value || row.DueDate > vehicle.WarrantyUntil.Value))
        {
            return true;
        }

        return vehicle.WarrantyKm > 0 && vehicle.LastKm.HasValue && vehicle.LastKm.Value > vehicle.WarrantyKm;
    }



    //===========================================================
    // READ
    //===========================================================

    private async Task<List<ServiceVehicleDto>> ToVehicleDtosAsync
    (
        List<ServiceVehiclesEntity> vehicles
    )
    {
        await LoadLeadDaysAsync();

        List<long> ids =
            vehicles.Select(x => x.ServiceVehicleId).ToList();

        List<ServiceVehicleSchedulesEntity> rows =
            await Schedules.AsNoTracking()
                .Where(x => ids.Contains(x.ServiceVehicleId))
                .OrderBy(x => x.SequenceNo)
                .ToListAsync();

        List<long> enquiryIds =
            rows.Where(x => x.ServiceEnquiryId.HasValue).Select(x => x.ServiceEnquiryId!.Value).Distinct().ToList();

        HashSet<long> lostStatusIds =
            (await Setups.AsNoTracking()
                .Where(x => x.SetupType == "Status" && x.Stage == "Lost")
                .Select(x => x.EnquirySetupId)
                .ToListAsync())
            .ToHashSet();

        Dictionary<long, (bool Deleted, bool Lost, bool Converted)> enquiries =
            (await Enquiries.AsNoTracking()
                .Where(x => enquiryIds.Contains(x.ServiceEnquiryId))
                .Select(x => new { x.ServiceEnquiryId, x.IsDeleted, x.StatusId, x.IsConverted })
                .ToListAsync())
            .ToDictionary(x => x.ServiceEnquiryId, x => (x.IsDeleted, lostStatusIds.Contains(x.StatusId), x.IsConverted));

        List<long> pricedIds =
            rows.Where(x => x.ScheduledServiceId.HasValue).Select(x => x.ScheduledServiceId!.Value).Distinct().ToList();

        Dictionary<long, ScheduledServicesEntity> priced =
            await _context.Set<ScheduledServicesEntity>().AsNoTracking()
                .Where(x => pricedIds.Contains(x.ScheduledServiceId))
                .ToDictionaryAsync(x => x.ScheduledServiceId);

        List<long> customerIds =
            vehicles.Where(x => x.CustomerId.HasValue).Select(x => x.CustomerId!.Value).Distinct().ToList();

        Dictionary<long, string> customerCodes =
            await _context.Set<CustomerProfilesEntity>().AsNoTracking()
                .Where(x => customerIds.Contains(x.CustomerId))
                .ToDictionaryAsync(x => x.CustomerId, x => x.CustomerCode);

        ILookup<long, ServiceVehicleSchedulesEntity> byVehicle =
            rows.ToLookup(x => x.ServiceVehicleId);

        DateOnly today = Today();

        List<ServiceVehicleDto> list = new();

        foreach (ServiceVehiclesEntity v in vehicles)
        {
            List<ServiceVehicleScheduleDto> schedules =
                byVehicle[v.ServiceVehicleId]
                    .Select(r =>
                    {
                        priced.TryGetValue(r.ScheduledServiceId ?? 0, out ScheduledServicesEntity? s);

                        return new ServiceVehicleScheduleDto
                        {
                            ServiceVehicleScheduleId = r.ServiceVehicleScheduleId,
                            SequenceNo = r.SequenceNo,
                            ServiceType = r.ServiceType,
                            ServiceName = r.ServiceName,
                            ScheduledServiceId = r.ScheduledServiceId,
                            ServiceCode = s?.ServiceCode ?? string.Empty,
                            CustomerCharge = s?.CustomerCharge ?? 0,
                            IntervalDays = r.IntervalDays,
                            IntervalKm = r.IntervalKm,
                            GraceDays = r.GraceDays,
                            DueDate = r.DueDate,
                            DueKm = r.DueKm,
                            LastDate = r.LastDate,
                            DueDateEdited = r.DueDateEdited,
                            Status = r.Status,
                            StatusText = (v.IsActive || r.Status == "Taken" || r.Status == "Skipped") ? StatusTextOf(v, r, enquiries, today) : "Stopped",
                            ServiceEnquiryId = r.ServiceEnquiryId,
                            EnquiryNo = r.EnquiryNo,
                            TakenDate = r.TakenDate,
                            TakenKm = r.TakenKm,
                            TakenDocType = r.TakenDocType,
                            TakenDocNo = r.TakenDocNo,
                            Note = r.Note
                        };
                    })
                    .ToList();

            ServiceVehicleScheduleDto? next =
                schedules.FirstOrDefault(x => x.StatusText is "Due" or "Enquired" or "Upcoming");

            list.Add(new ServiceVehicleDto
            {
                ServiceVehicleId = v.ServiceVehicleId,
                ChassisNo = v.ChassisNo,
                EngineNo = v.EngineNo,
                RegistrationNo = v.RegistrationNo,
                ModelId = v.ModelId,
                ModelName = v.ModelName,
                BrandManagementId = v.BrandManagementId,
                BrandName = v.BrandName,
                ColorName = v.ColorName,
                ServicePolicyId = v.ServicePolicyId,
                PolicyCode = v.PolicyCode,
                WarrantyYears = v.WarrantyYears,
                WarrantyKm = v.WarrantyKm,
                WarrantyUntil = v.WarrantyUntil,
                InWarranty =
                    v.WarrantyUntil.HasValue
                    && today <= v.WarrantyUntil.Value
                    && !(v.WarrantyKm > 0 && v.LastKm.HasValue && v.LastKm.Value > v.WarrantyKm),
                SaleDate = v.SaleDate,
                SaleSource = v.SaleSource,
                SaleDocType = v.SaleDocType,
                SaleDocId = v.SaleDocId,
                SaleDocNo = v.SaleDocNo,
                CustomerId = v.CustomerId,
                CustomerCode = v.CustomerId.HasValue && customerCodes.TryGetValue(v.CustomerId.Value, out string? code) ? code : string.Empty,
                CustomerName = v.CustomerName,
                Mobile = v.Mobile,
                BranchId = v.BranchId,
                BranchName = v.BranchName,
                LastKm = v.LastKm,
                Remarks = v.Remarks,
                IsActive = v.IsActive,
                TakenCount = schedules.Count(x => x.StatusText == "Taken"),
                TotalCount = schedules.Count,
                NextServiceName = next?.ServiceName ?? string.Empty,
                NextDueDate = next?.DueDate,
                NextStatusText =
                    !v.IsActive ? "Stopped"
                    : next?.StatusText
                    ?? (schedules.Count == 0 ? "No schedule" : "Completed"),
                NextEnquiryNo = next?.EnquiryNo ?? string.Empty,
                Schedules = schedules,
                CreatedDate = v.CreatedDate,
                ModifiedDate = v.ModifiedDate
            });
        }

        return list;
    }


    public async Task<List<ServiceVehicleDto>> GetVehiclesAsync()
    {
        await RaiseDueSchedulesAsync();

        List<ServiceVehiclesEntity> vehicles =
            await Vehicles.AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.SaleDate)
                .ThenByDescending(x => x.ServiceVehicleId)
                .ToListAsync();

        return await ToVehicleDtosAsync(vehicles);
    }


    public async Task<ServiceVehicleDto?> GetVehicleByIdAsync
    (
        long id
    )
    {
        ServiceVehiclesEntity? vehicle =
            await Vehicles.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ServiceVehicleId == id && !x.IsDeleted);

        return vehicle == null
            ? null
            : (await ToVehicleDtosAsync(new List<ServiceVehiclesEntity> { vehicle })).FirstOrDefault();
    }


    public async Task<List<ServiceVehicleScheduleDto>> PreviewScheduleAsync
    (
        long modelId,
        DateOnly saleDate
    )
    {
        await LoadLeadDaysAsync();

        var (_, brandId, brand) =
            await RequireModelAsync(modelId, null);

        PolicyPlan plan =
            await RequirePolicyAsync(brandId, brand);

        ServiceVehiclesEntity vehicle =
            NewVehicleShell(plan, saleDate);

        List<ServiceVehicleSchedulesEntity> rows =
            BuildRows(plan, SystemUserId);

        Recalculate(vehicle, rows);

        DateOnly today = Today();

        Dictionary<long, (bool, bool, bool)> none = new();

        return rows
            .Select(r =>
            {
                plan.Priced.TryGetValue(r.SequenceNo, out ScheduledServicesEntity? s);

                return new ServiceVehicleScheduleDto
                {
                    SequenceNo = r.SequenceNo,
                    ServiceType = r.ServiceType,
                    ServiceName = r.ServiceName,
                    ScheduledServiceId = r.ScheduledServiceId,
                    ServiceCode = s?.ServiceCode ?? string.Empty,
                    CustomerCharge = s?.CustomerCharge ?? 0,
                    IntervalDays = r.IntervalDays,
                    IntervalKm = r.IntervalKm,
                    GraceDays = r.GraceDays,
                    DueDate = r.DueDate,
                    DueKm = r.DueKm,
                    LastDate = r.LastDate,
                    Status = r.Status,
                    StatusText = StatusTextOf(vehicle, r, none, today)
                };
            })
            .ToList();
    }



    //===========================================================
    // Checks shared by Add / Update / the sales hook
    //===========================================================

    private async Task<PolicyPlan> RequirePolicyAsync
    (
        long? brandId,
        string brand
    )
    {
        PolicyPlan? plan =
            brandId.HasValue ? await PolicyOfBrandAsync(brandId.Value) : null;

        if (plan == null)
        {
            throw new InvalidOperationException(
                $"{(brand.Length > 0 ? brand : "This model's brand")} has no active Service Policy. Set it up in Service Settings › Service Policy first.");
        }

        if (plan.Positions.Count == 0)
        {
            throw new InvalidOperationException($"The Service Policy {plan.Policy.PolicyCode} has no service schedule.");
        }

        return plan;
    }


    private static ServiceVehiclesEntity NewVehicleShell
    (
        PolicyPlan plan,
        DateOnly saleDate
    )
    {
        return new ServiceVehiclesEntity
        {
            SaleDate = saleDate,
            ServicePolicyId = plan.Policy.ServicePolicyId,
            PolicyCode = plan.Policy.PolicyCode,
            WarrantyYears = plan.Policy.WarrantyYears,
            WarrantyKm = plan.Policy.WarrantyKm,
            WarrantyUntil = plan.Policy.WarrantyYears > 0 ? saleDate.AddYears(plan.Policy.WarrantyYears) : null
        };
    }


    private static void ApplyPolicy
    (
        ServiceVehiclesEntity vehicle,
        PolicyPlan? plan
    )
    {
        vehicle.ServicePolicyId = plan?.Policy.ServicePolicyId;
        vehicle.PolicyCode = plan?.Policy.PolicyCode ?? string.Empty;
        vehicle.WarrantyYears = plan?.Policy.WarrantyYears ?? 0;
        vehicle.WarrantyKm = plan?.Policy.WarrantyKm ?? 0;
        vehicle.WarrantyUntil =
            plan != null && plan.Policy.WarrantyYears > 0
                ? vehicle.SaleDate.AddYears(plan.Policy.WarrantyYears)
                : null;
    }


    private async Task<BranchesEntity> RequireBranchAsync
    (
        long branchId
    )
    {
        return await _context.Set<BranchesEntity>().AsNoTracking()
                   .FirstOrDefaultAsync(x => x.BranchId == branchId)
               ?? throw new InvalidOperationException("No branch : log in to a branch first.");
    }


    private async Task<long?> CustomerOfMobileAsync
    (
        string mobile
    )
    {
        return await _context.Set<CustomerProfilesEntity>().AsNoTracking()
            .Where(x => !x.IsDeleted && (x.Phone1 == mobile || x.Phone2 == mobile))
            .OrderByDescending(x => x.Phone1 == mobile)
            .Select(x => (long?)x.CustomerId)
            .FirstOrDefaultAsync();
    }


    private async Task EnsureChassisFreeAsync
    (
        string chassis,
        long exceptId
    )
    {
        bool taken =
            await Vehicles.AsNoTracking()
                .AnyAsync(x => !x.IsDeleted && x.ChassisNo == chassis && x.ServiceVehicleId != exceptId);

        if (taken)
        {
            throw new InvalidOperationException($"Chassis {chassis} is already on the sold bikes list.");
        }
    }


    private void AddVehicleHistory
    (
        ServiceVehiclesEntity vehicle,
        string activityType,
        string title,
        string description,
        long userId,
        string userName = "System"
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = VehicleHistoryEntity,
                EntityId = vehicle.ServiceVehicleId,
                ActivityType = activityType,
                ActivityTitle = $"Sold Bike {title}",
                ActivityDescription = Cut(description, 500),
                PerformedBy = userId,
                PerformedByName = userName,
                PerformedDate = DateTime.UtcNow
            });
    }


    private static string DescribeVehicle(ServiceVehiclesEntity x, string verb) =>
        $"{x.ModelName} chassis {x.ChassisNo} ({x.CustomerName} - {x.Mobile}, sold {x.SaleDate:dd-MMM-yyyy}) {verb}.";



    //===========================================================
    // Row edits from the form (matched by SequenceNo)
    //===========================================================

    private static void ApplyRowEdits
    (
        ServiceVehiclesEntity vehicle,
        List<ServiceVehicleSchedulesEntity> rows,
        List<SaveServiceVehicleScheduleDto> edits,
        long userId
    )
    {
        DateOnly today = Today();

        foreach (SaveServiceVehicleScheduleDto edit in edits ?? new())
        {
            ServiceVehicleSchedulesEntity? row =
                rows.FirstOrDefault(x => x.SequenceNo == edit.SequenceNo);

            if (row == null)
            {
                continue;
            }

            // Taken through a job card / invoice : not changed here
            if (row.Status == "Taken" && row.TakenDocNo.Length > 0)
            {
                continue;
            }

            string note = Cut(Squeeze(edit.Note), 200);

            bool changed = note != row.Note;

            row.Note = note;

            if (edit.TakenDate.HasValue)
            {
                if (edit.TakenDate.Value > today)
                {
                    throw new InvalidOperationException($"{row.ServiceName} : the taken date cannot be in the future.");
                }

                if (edit.TakenDate.Value < vehicle.SaleDate)
                {
                    throw new InvalidOperationException($"{row.ServiceName} : the taken date cannot be before the sale date.");
                }

                if (edit.TakenKm.HasValue && (edit.TakenKm < 0 || edit.TakenKm > 1_000_000))
                {
                    throw new InvalidOperationException($"{row.ServiceName} : the km must be 0 – 1,000,000.");
                }

                changed |= row.Status != "Taken" || row.TakenDate != edit.TakenDate || row.TakenKm != edit.TakenKm;

                row.Status = "Taken";
                row.TakenDate = edit.TakenDate;
                row.TakenKm = edit.TakenKm;
                row.TakenDocType = string.Empty;
                row.TakenDocNo = string.Empty;
            }
            else if (edit.Skipped)
            {
                changed |= row.Status != "Skipped";

                row.Status = "Skipped";
                row.TakenDate = null;
                row.TakenKm = null;
            }
            else if (row.Status is "Taken" or "Skipped")
            {
                // Cleared : back to waiting (or to its enquiry)
                row.Status = row.ServiceEnquiryId.HasValue ? "Enquired" : "Upcoming";
                row.TakenDate = null;
                row.TakenKm = null;

                changed = true;
            }

            if (row.Status is "Upcoming" or "Enquired")
            {
                if (edit.DueDateEdited && edit.DueDate.HasValue)
                {
                    if (edit.DueDate.Value < vehicle.SaleDate)
                    {
                        throw new InvalidOperationException($"{row.ServiceName} : the due date cannot be before the sale date.");
                    }

                    changed |= !row.DueDateEdited || row.DueDate != edit.DueDate.Value;

                    row.DueDateEdited = true;
                    row.DueDate = edit.DueDate.Value;
                }
                else if (row.DueDateEdited)
                {
                    row.DueDateEdited = false;

                    changed = true;
                }
            }

            if (changed)
            {
                row.ModifiedBy = userId;
                row.ModifiedDate = DateTime.UtcNow;
            }
        }

        // Taken dates must follow the order of the services
        DateOnly? previous = null;

        foreach (ServiceVehicleSchedulesEntity row in rows.Where(x => x.Status == "Taken" && x.TakenDate.HasValue).OrderBy(x => x.SequenceNo))
        {
            if (previous.HasValue && row.TakenDate!.Value < previous.Value)
            {
                throw new InvalidOperationException($"{row.ServiceName} is taken before the service ahead of it. Check the taken dates.");
            }

            previous = row.TakenDate;
        }

        // Latest km known
        int? km =
            rows.Where(x => x.Status == "Taken" && x.TakenKm.HasValue)
                .OrderByDescending(x => x.SequenceNo)
                .Select(x => x.TakenKm)
                .FirstOrDefault();

        if (km.HasValue && (!vehicle.LastKm.HasValue || km.Value > vehicle.LastKm.Value))
        {
            vehicle.LastKm = km;
        }

        Recalculate(vehicle, rows);
    }



    //===========================================================
    // ADD (sold before the ERP) / UPDATE
    //===========================================================

    private sealed record VehicleInput
    (
        string Chassis,
        string Engine,
        string Registration,
        string Color,
        string Mobile,
        string Name,
        int? LastKm,
        string Remarks
    );


    private static VehicleInput CleanVehicle
    (
        SaveServiceVehicleDto dto
    )
    {
        string chassis = CleanPlate(dto.ChassisNo, 50).Replace(" ", string.Empty);

        if (chassis.Length < 5)
        {
            throw new InvalidOperationException("Enter the Chassis No (at least 5 characters).");
        }

        string mobile = CleanPhone(dto.Mobile);

        if (mobile.StartsWith("880") && mobile.Length == 13)
        {
            mobile = mobile[2..];
        }

        if (!IsValidMobile(mobile))
        {
            throw new InvalidOperationException("Enter the customer's Mobile (11 digits starting with 01).");
        }

        string name = Cut(Squeeze(dto.CustomerName), 150);

        if (name.Length < 2)
        {
            throw new InvalidOperationException("Customer Name is required.");
        }

        if (dto.LastKm.HasValue && (dto.LastKm < 0 || dto.LastKm > 1_000_000))
        {
            throw new InvalidOperationException("Last KM must be 0 – 1,000,000.");
        }

        return new VehicleInput(
            chassis,
            CleanPlate(dto.EngineNo, 50).Replace(" ", string.Empty),
            CleanPlate(dto.RegistrationNo, 30),
            Cut(Squeeze(dto.ColorName), 50),
            mobile,
            name,
            dto.LastKm,
            Cut(Squeeze(dto.Remarks), 500));
    }


    private static void CheckSaleDate
    (
        DateOnly? saleDate
    )
    {
        if (!saleDate.HasValue)
        {
            throw new InvalidOperationException("Sale Date is required.");
        }

        if (saleDate.Value > Today())
        {
            throw new InvalidOperationException("Sale Date cannot be in the future.");
        }

        if (saleDate.Value < Today().AddYears(-20))
        {
            throw new InvalidOperationException("Sale Date is more than 20 years ago.");
        }
    }


    public async Task<long> CreateVehicleAsync
    (
        SaveServiceVehicleDto dto,
        long userId
    )
    {
        VehicleInput input = CleanVehicle(dto);

        CheckSaleDate(dto.SaleDate);

        BranchesEntity branch = await RequireBranchAsync(dto.BranchId);

        (string modelName, long? brandId, string brand) =
            await RequireModelAsync(dto.ModelId, null);

        PolicyPlan plan = await RequirePolicyAsync(brandId, brand);

        await EnsureChassisFreeAsync(input.Chassis, 0);

        ServiceVehiclesEntity vehicle = NewVehicleShell(plan, dto.SaleDate!.Value);

        vehicle.ChassisNo = input.Chassis;
        vehicle.EngineNo = input.Engine;
        vehicle.RegistrationNo = input.Registration;
        vehicle.ModelId = dto.ModelId;
        vehicle.ModelName = modelName;
        vehicle.BrandManagementId = brandId!.Value;
        vehicle.BrandName = brand;
        vehicle.ColorName = input.Color;
        vehicle.SaleSource = "Manual";
        vehicle.SaleDocType = string.Empty;
        vehicle.SaleDocNo = string.Empty;
        vehicle.CustomerId = await CustomerOfMobileAsync(input.Mobile);
        vehicle.CustomerName = input.Name;
        vehicle.Mobile = input.Mobile;
        vehicle.BranchId = branch.BranchId;
        vehicle.BranchName = branch.BranchName;
        vehicle.LastKm = input.LastKm;
        vehicle.Remarks = input.Remarks;
        vehicle.IsActive = dto.IsActive;
        vehicle.CreatedBy = userId;
        vehicle.CreatedDate = DateTime.UtcNow;

        List<ServiceVehicleSchedulesEntity> rows = BuildRows(plan, userId);

        Recalculate(vehicle, rows);

        ApplyRowEdits(vehicle, rows, dto.Schedules, userId);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        Vehicles.Add(vehicle);

        await _context.SaveChangesAsync();

        foreach (ServiceVehicleSchedulesEntity row in rows)
        {
            row.ServiceVehicleId = vehicle.ServiceVehicleId;

            Schedules.Add(row);
        }

        AddVehicleHistory(vehicle, "Create", "Added", DescribeVehicle(vehicle, $"added by hand with {rows.Count} scheduled services"), userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return vehicle.ServiceVehicleId;
    }


    public async Task UpdateVehicleAsync
    (
        SaveServiceVehicleDto dto,
        long userId
    )
    {
        ServiceVehiclesEntity vehicle =
            await Vehicles.FirstOrDefaultAsync(x => x.ServiceVehicleId == dto.ServiceVehicleId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Sold bike not found. It may have been deleted.");

        VehicleInput input = CleanVehicle(dto);

        List<ServiceVehicleSchedulesEntity> rows =
            await Schedules.Where(x => x.ServiceVehicleId == vehicle.ServiceVehicleId).OrderBy(x => x.SequenceNo).ToListAsync();

        bool fromSale = vehicle.SaleSource == "Sale";

        // Chassis / model / sale date come from the invoice
        if (!fromSale)
        {
            await EnsureChassisFreeAsync(input.Chassis, vehicle.ServiceVehicleId);

            vehicle.ChassisNo = input.Chassis;

            CheckSaleDate(dto.SaleDate);

            bool started = rows.Any(x => x.Status == "Enquired" || (x.Status == "Taken" && x.TakenDocNo.Length > 0));

            if (dto.ModelId != vehicle.ModelId)
            {
                if (started)
                {
                    throw new InvalidOperationException("The model cannot change : a service of this bike is already enquired or taken.");
                }

                (string modelName, long? brandId, string brand) = await RequireModelAsync(dto.ModelId, vehicle.ModelId);

                PolicyPlan plan = await RequirePolicyAsync(brandId, brand);

                vehicle.ModelId = dto.ModelId;
                vehicle.ModelName = modelName;
                vehicle.BrandManagementId = brandId!.Value;
                vehicle.BrandName = brand;
                vehicle.SaleDate = dto.SaleDate!.Value;

                ApplyPolicy(vehicle, plan);

                Schedules.RemoveRange(rows);

                rows = BuildRows(plan, userId);

                foreach (ServiceVehicleSchedulesEntity row in rows)
                {
                    row.ServiceVehicleId = vehicle.ServiceVehicleId;

                    Schedules.Add(row);
                }
            }
            else if (dto.SaleDate!.Value != vehicle.SaleDate)
            {
                vehicle.SaleDate = dto.SaleDate.Value;

                vehicle.WarrantyUntil = vehicle.WarrantyYears > 0 ? vehicle.SaleDate.AddYears(vehicle.WarrantyYears) : null;
            }
        }

        vehicle.EngineNo = input.Engine;
        vehicle.RegistrationNo = input.Registration;
        vehicle.ColorName = input.Color;
        vehicle.Mobile = input.Mobile;
        vehicle.CustomerName = input.Name;
        vehicle.CustomerId ??= await CustomerOfMobileAsync(input.Mobile);
        vehicle.LastKm = input.LastKm;
        vehicle.Remarks = input.Remarks;
        vehicle.IsActive = dto.IsActive;
        vehicle.ModifiedBy = userId;
        vehicle.ModifiedDate = DateTime.UtcNow;

        Recalculate(vehicle, rows);

        ApplyRowEdits(vehicle, rows, dto.Schedules, userId);

        await _context.SaveChangesAsync();

        AddVehicleHistory(vehicle, "Update", "Updated", DescribeVehicle(vehicle, "updated"), userId);

        await _context.SaveChangesAsync();
    }



    //===========================================================
    // DELETE / RESTORE (bikes added by hand only)
    //===========================================================

    public async Task DeleteVehicleAsync
    (
        long id,
        long userId
    )
    {
        ServiceVehiclesEntity vehicle =
            await Vehicles.FirstOrDefaultAsync(x => x.ServiceVehicleId == id && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Sold bike not found. It may have been deleted already.");

        if (vehicle.SaleSource == "Sale")
        {
            throw new InvalidOperationException(
                $"Chassis {vehicle.ChassisNo} comes from {vehicle.SaleDocType} {vehicle.SaleDocNo}. Set it inactive to stop the reminders, or return the sale.");
        }

        vehicle.IsDeleted = true;
        vehicle.DeletedBy = userId;
        vehicle.DeletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddVehicleHistory(vehicle, "Delete", "Deleted", DescribeVehicle(vehicle, "deleted"), userId);

        await _context.SaveChangesAsync();
    }


    public async Task<bool> RestoreVehicleAsync
    (
        long userId
    )
    {
        ServiceVehiclesEntity? vehicle =
            await Vehicles.Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.ServiceVehicleId)
                .FirstOrDefaultAsync();

        if (vehicle == null)
        {
            return false;
        }

        await EnsureChassisFreeAsync(vehicle.ChassisNo, vehicle.ServiceVehicleId);

        vehicle.IsDeleted = false;
        vehicle.DeletedBy = null;
        vehicle.DeletedDate = null;
        vehicle.ModifiedBy = userId;
        vehicle.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddVehicleHistory(vehicle, "Restore", "Restored", DescribeVehicle(vehicle, "restored"), userId);

        await _context.SaveChangesAsync();

        return true;
    }



    //===========================================================
    // SALES HOOK (Sales Invoices - MB / Sales Returns - MB)
    //===========================================================

    public async Task<long> CreateScheduleForSaleAsync
    (
        SoldBikeInput input
    )
    {
        string chassis = CleanPlate(input.ChassisNo, 50).Replace(" ", string.Empty);

        if (chassis.Length == 0)
        {
            throw new InvalidOperationException("The sold bike has no chassis no.");
        }

        string mobile = CleanPhone(input.Mobile);

        BranchesEntity branch = await RequireBranchAsync(input.BranchId);

        (string modelName, long? brandId, string brand) =
            await RequireModelAsync(input.ModelId, input.ModelId);

        // No policy : the bike is listed, without a schedule
        PolicyPlan? plan =
            brandId.HasValue ? await PolicyOfBrandAsync(brandId.Value) : null;

        ServiceVehiclesEntity? vehicle =
            await Vehicles.FirstOrDefaultAsync(x => !x.IsDeleted && x.ChassisNo == chassis);

        bool isNew = vehicle == null;

        vehicle ??= new ServiceVehiclesEntity
        {
            ChassisNo = chassis,
            CreatedBy = input.UserId,
            CreatedDate = DateTime.UtcNow
        };

        vehicle.EngineNo = CleanPlate(input.EngineNo, 50).Replace(" ", string.Empty);
        vehicle.RegistrationNo = CleanPlate(input.RegistrationNo, 30);
        vehicle.ModelId = input.ModelId;
        vehicle.ModelName = modelName;
        vehicle.BrandManagementId = brandId ?? 0;
        vehicle.BrandName = brand;
        vehicle.ColorName = Cut(Squeeze(input.ColorName), 50);
        vehicle.SaleDate = input.SaleDate;
        vehicle.SaleSource = "Sale";
        vehicle.SaleDocType = Cut(input.SaleDocType, 30);
        vehicle.SaleDocId = input.SaleDocId;
        vehicle.SaleDocNo = Cut(input.SaleDocNo, 40);
        vehicle.CustomerId = input.CustomerId ?? (IsValidMobile(mobile) ? await CustomerOfMobileAsync(mobile) : null);
        vehicle.CustomerName = Cut(Squeeze(input.CustomerName), 150);
        vehicle.Mobile = mobile;
        vehicle.BranchId = branch.BranchId;
        vehicle.BranchName = branch.BranchName;
        vehicle.IsActive = true;
        vehicle.Remarks = plan == null ? $"{brand} has no Service Policy : no schedule." : vehicle.Remarks ?? string.Empty;

        if (!isNew)
        {
            vehicle.ModifiedBy = input.UserId;
            vehicle.ModifiedDate = DateTime.UtcNow;
        }

        ApplyPolicy(vehicle, plan);

        if (isNew)
        {
            Vehicles.Add(vehicle);
        }

        await _context.SaveChangesAsync();

        // The schedule : services not yet enquired / taken are made again
        List<ServiceVehicleSchedulesEntity> rows =
            await Schedules.Where(x => x.ServiceVehicleId == vehicle.ServiceVehicleId).ToListAsync();

        Schedules.RemoveRange(rows.Where(x => x.Status == "Upcoming"));

        HashSet<int> kept =
            rows.Where(x => x.Status != "Upcoming").Select(x => x.SequenceNo).ToHashSet();

        List<ServiceVehicleSchedulesEntity> all =
            rows.Where(x => x.Status != "Upcoming").ToList();

        if (plan != null)
        {
            foreach (ServiceVehicleSchedulesEntity row in BuildRows(plan, input.UserId).Where(x => !kept.Contains(x.SequenceNo)))
            {
                row.ServiceVehicleId = vehicle.ServiceVehicleId;

                Schedules.Add(row);

                all.Add(row);
            }
        }

        Recalculate(vehicle, all);

        AddVehicleHistory(
            vehicle,
            isNew ? "Create" : "Update",
            "Sold",
            DescribeVehicle(vehicle, $"sold on {vehicle.SaleDocType} {vehicle.SaleDocNo}; {all.Count} scheduled services"),
            input.UserId);

        await _context.SaveChangesAsync();

        return vehicle.ServiceVehicleId;
    }


    public async Task VoidScheduleForSaleAsync
    (
        string saleDocType,
        long saleDocId,
        long userId
    )
    {
        List<ServiceVehiclesEntity> vehicles =
            await Vehicles
                .Where(x => !x.IsDeleted && x.SaleSource == "Sale" && x.SaleDocType == saleDocType && x.SaleDocId == saleDocId)
                .ToListAsync();

        foreach (ServiceVehiclesEntity vehicle in vehicles)
        {
            vehicle.IsActive = false;
            vehicle.Remarks = Cut($"Sale returned {Today():dd-MMM-yyyy}. {vehicle.Remarks}".Trim(), 500);
            vehicle.ModifiedBy = userId;
            vehicle.ModifiedDate = DateTime.UtcNow;

            AddVehicleHistory(vehicle, "Update", "Stopped", DescribeVehicle(vehicle, "stopped : the sale was returned"), userId);
        }

        await _context.SaveChangesAsync();
    }



    //===========================================================
    // DUE → SERVICE ENQUIRY
    //
    // For each active sold bike : its first service still waiting
    // (Upcoming) whose due date is within LeadDays and whose last
    // day has not passed, unless the bike already has an enquiry
    // raised and still open. Free services past the warranty are
    // left alone.
    // The mobile's open Service enquiry gets the service as a line
    // (no new number); otherwise a new enquiry.
    //===========================================================

    // One run at a time (two list reads must not raise the same
    // service twice) : a session advisory lock on one connection
    private const int RaiseLockKey = 4503;

    public async Task<int> RaiseDueSchedulesAsync()
    {
        await _context.Database.OpenConnectionAsync();

        try
        {
            bool mine =
                await _context.Database
                    .SqlQueryRaw<bool>("SELECT pg_try_advisory_lock({0}, 1) AS \"Value\"", RaiseLockKey)
                    .SingleAsync();

            if (!mine)
            {
                return 0;
            }

            try
            {
                return await RaiseDueCoreAsync();
            }
            finally
            {
                await _context.Database
                    .SqlQueryRaw<bool>("SELECT pg_advisory_unlock({0}, 1) AS \"Value\"", RaiseLockKey)
                    .SingleAsync();
            }
        }
        finally
        {
            await _context.Database.CloseConnectionAsync();
        }
    }


    private async Task<int> RaiseDueCoreAsync()
    {
        await LoadLeadDaysAsync();

        DateOnly today = Today();

        DateOnly horizon = today.AddDays(LeadDays);

        var candidates =
            await (
                from r in Schedules.AsNoTracking()
                join v in Vehicles.AsNoTracking() on r.ServiceVehicleId equals v.ServiceVehicleId
                where r.Status == "Upcoming"
                      && r.DueDate <= horizon
                      && r.LastDate >= today
                      && v.IsActive && !v.IsDeleted
                select new { r.ServiceVehicleScheduleId, r.ServiceVehicleId, r.SequenceNo })
            .ToListAsync();

        if (candidates.Count == 0)
        {
            return 0;
        }

        List<EnquirySetupsEntity> setups =
            await Setups.AsNoTracking().Where(x => !x.IsDeleted).ToListAsync();

        HashSet<long> openStatusIds =
            setups.Where(x => x.SetupType == "Status" && x.Stage == "Open").Select(x => x.EnquirySetupId).ToHashSet();

        EnquirySetupsEntity? source =
            setups.FirstOrDefault(x => x.SetupType == "Source" && x.IsActive && x.Name.ToLower() == "scheduled")
            ?? setups.FirstOrDefault(x => x.SetupType == "Source" && x.IsActive && x.IsDefault)
            ?? setups.FirstOrDefault(x => x.SetupType == "Source" && x.IsActive);

        EnquirySetupsEntity? status =
            setups.FirstOrDefault(x => x.SetupType == "Status" && x.Stage == "Open" && x.IsActive && x.IsDefault)
            ?? setups.Where(x => x.SetupType == "Status" && x.Stage == "Open" && x.IsActive).OrderBy(x => x.DisplayOrder).FirstOrDefault();

        if (source == null || status == null)
        {
            // Enquiry Setup not ready : nothing raised
            return 0;
        }

        EnquirySetupsEntity? method =
            setups.FirstOrDefault(x => x.SetupType == "FollowUpMethod" && x.IsActive && x.IsDefault);

        int raised = 0;

        foreach (var group in candidates.GroupBy(x => x.ServiceVehicleId))
        {
            ServiceVehiclesEntity? vehicle =
                await Vehicles.FirstOrDefaultAsync(x => x.ServiceVehicleId == group.Key);

            if (vehicle == null || !IsValidMobile(vehicle.Mobile))
            {
                continue;
            }

            // Already one raised and still open : wait for it
            List<long> raisedIds =
                await Schedules.AsNoTracking()
                    .Where(x => x.ServiceVehicleId == vehicle.ServiceVehicleId && x.Status == "Enquired" && x.ServiceEnquiryId.HasValue)
                    .Select(x => x.ServiceEnquiryId!.Value)
                    .ToListAsync();

            bool waiting =
                raisedIds.Count > 0
                && await Enquiries.AsNoTracking()
                    .AnyAsync(x => raisedIds.Contains(x.ServiceEnquiryId) && !x.IsDeleted && !x.IsConverted && openStatusIds.Contains(x.StatusId));

            if (waiting)
            {
                continue;
            }

            List<long> rowIds =
                group.Select(x => x.ServiceVehicleScheduleId).ToList();

            ServiceVehicleSchedulesEntity? row =
                (await Schedules.Where(x => rowIds.Contains(x.ServiceVehicleScheduleId)).ToListAsync())
                    .OrderBy(x => x.SequenceNo)
                    .FirstOrDefault(x => !(x.ServiceType == "Free" && OutOfWarranty(vehicle, x, today)));

            if (row == null)
            {
                continue;
            }

            try
            {
                await RaiseOneAsync(vehicle, row, source, status, method, openStatusIds, today);

                raised++;
            }
            catch (Exception)
            {
                // One bike must not stop the others (or the list)
                _context.ChangeTracker.Clear();
            }
        }

        return raised;
    }


    private async Task RaiseOneAsync
    (
        ServiceVehiclesEntity vehicle,
        ServiceVehicleSchedulesEntity row,
        EnquirySetupsEntity source,
        EnquirySetupsEntity status,
        EnquirySetupsEntity? method,
        HashSet<long> openStatusIds,
        DateOnly today
    )
    {
        ScheduledServicesEntity? priced =
            row.ScheduledServiceId.HasValue
                ? await _context.Set<ScheduledServicesEntity>().AsNoTracking()
                    .FirstOrDefaultAsync(x => x.ScheduledServiceId == row.ScheduledServiceId.Value)
                : null;

        decimal rate = priced != null && priced.IsConfigured ? priced.CustomerCharge : 0;

        string window = $"due {row.DueDate:dd-MMM-yyyy}, last day {row.LastDate:dd-MMM-yyyy}";

        ServiceEnquiryLinesEntity line =
            new()
            {
                LineType = "Service",
                ItemKind = priced != null && priced.IsConfigured && priced.IsActive ? "Scheduled" : "Other",
                ItemId = priced != null && priced.IsConfigured && priced.IsActive ? priced.ScheduledServiceId : null,
                ItemCode = Cut(priced?.ServiceCode ?? string.Empty, 50),
                ItemName = row.ServiceName,
                Quantity = 1,
                Rate = rate,
                Amount = rate,
                Note = Cut(window, 200)
            };

        string note =
            $"[Scheduled {today:dd-MMM-yyyy}] {row.ServiceName} {window} ({vehicle.ModelName}, chassis {vehicle.ChassisNo}).";

        DateOnly preferred = row.DueDate < today ? today : row.DueDate;

        // The mobile's open service enquiry
        ServiceEnquiriesEntity? open =
            await Enquiries
                .Where(x => x.EnquirerMobile == vehicle.Mobile && x.EnquiryType == "Service" && !x.IsDeleted && !x.IsConverted && openStatusIds.Contains(x.StatusId))
                .OrderByDescending(x => x.EnquiryDate)
                .ThenByDescending(x => x.ServiceEnquiryId)
                .FirstOrDefaultAsync();

        if (open != null)
        {
            int next =
                await Lines.Where(x => x.ServiceEnquiryId == open.ServiceEnquiryId).Select(x => (int?)x.LineNo).MaxAsync() ?? 0;

            if (next < MaxLines)
            {
                line.LineNo = next + 1;

                line.ServiceEnquiryId = open.ServiceEnquiryId;

                Lines.Add(line);

                open.EstimatedTotal += line.Amount;
            }

            string remarks = string.IsNullOrWhiteSpace(open.Remarks) ? note : $"{open.Remarks.TrimEnd()} {note}";

            open.Remarks = remarks.Length <= 500 ? remarks : remarks[^500..];

            open.NextFollowUpDate = today;

            open.ServiceVehicleScheduleId ??= row.ServiceVehicleScheduleId;

            open.PreferredDate ??= preferred;

            open.ModifiedBy = SystemUserId;

            open.ModifiedDate = DateTime.UtcNow;

            row.Status = "Enquired";
            row.ServiceEnquiryId = open.ServiceEnquiryId;
            row.EnquiryNo = open.EnquiryNo;
            row.ModifiedBy = SystemUserId;
            row.ModifiedDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            AddHistory(open, "Update", "Scheduled service added", note, SystemUserId);

            await _context.SaveChangesAsync();

            return;
        }

        int year = today.Year;

        int month = today.Month;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        await _context.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_xact_lock({0}, {1})",
            LockKey,
            year * 100 + month);

        int sequence = await GetNextSequenceAsync(year, month);

        EnquiryContactsEntity contact =
            await SaveContactAsync(vehicle.Mobile, vehicle.CustomerName, string.Empty, string.Empty, null, SystemUserId);

        ServiceEnquiriesEntity entity =
            new()
            {
                EnquiryNo = CodeGenerator.GenerateEnquiryNo(EnquiryNoType, year, month, sequence),
                EnquiryYear = year,
                EnquiryMonth = month,
                SequenceNo = sequence,
                EnquiryDate = today,
                BranchId = vehicle.BranchId,
                BranchName = vehicle.BranchName,
                EnquiryType = "Service",
                SourceId = source.EnquirySetupId,
                StatusId = status.EnquirySetupId,
                ExecutiveUserId = 0,
                ExecutiveName = string.Empty,
                EnquiryContactId = contact.EnquiryContactId,
                EnquirerMobile = vehicle.Mobile,
                EnquirerName = vehicle.CustomerName,
                ModelId = vehicle.ModelId,
                ModelName = vehicle.ModelName,
                BrandManagementId = vehicle.BrandManagementId,
                BrandName = vehicle.BrandName,
                RegistrationNo = vehicle.RegistrationNo,
                ChassisNo = vehicle.ChassisNo,
                KmReading = vehicle.LastKm,
                Complaint = string.Empty,
                PreferredDate = preferred,
                PreferredSlot = string.Empty,
                PickupDrop = false,
                EstimatedTotal = line.Amount,
                NextFollowUpDate = today,
                FollowUpMethodId = method?.EnquirySetupId,
                LastFollowUpNote = string.Empty,
                Remarks = Cut($"Scheduled service of a bike sold {vehicle.SaleDate:dd-MMM-yyyy}{(vehicle.SaleDocNo.Length > 0 ? " (" + vehicle.SaleDocNo + ")" : string.Empty)} : {row.ServiceName}, {window}.", 500),
                FromWebsite = false,
                ServiceVehicleScheduleId = row.ServiceVehicleScheduleId,
                ConvertedDocType = string.Empty,
                ConvertedDocNo = string.Empty,
                CreatedBy = SystemUserId,
                CreatedDate = DateTime.UtcNow
            };

        Enquiries.Add(entity);

        await _context.SaveChangesAsync();

        line.LineNo = 1;

        line.ServiceEnquiryId = entity.ServiceEnquiryId;

        Lines.Add(line);

        row.Status = "Enquired";
        row.ServiceEnquiryId = entity.ServiceEnquiryId;
        row.EnquiryNo = entity.EnquiryNo;
        row.ModifiedBy = SystemUserId;
        row.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity, "Create", "Raised by the service schedule", Describe(entity, "raised by the service schedule") + " " + note, SystemUserId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }
}
