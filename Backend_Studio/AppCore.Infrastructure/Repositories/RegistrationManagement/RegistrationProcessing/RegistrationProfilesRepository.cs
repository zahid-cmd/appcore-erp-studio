//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.RegistrationManagement.RegistrationControl;
using AppCore.Application.RegistrationManagement.RegistrationProcessing;
using AppCore.Domain.Entities.RegistrationManagement.RegistrationControl;
using AppCore.Domain.Entities.RegistrationManagement.RegistrationProcessing;
using AppCore.Infrastructure.Persistence;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.RegistrationManagement.RegistrationProcessing;


//===============================================================
// Registration Profiles repository (read; RegistrationOnSale_
// Engine.sql). Days in status / overdue from the Stage Timings'
// Expected Days.
//===============================================================

public class RegistrationProfilesRepository
    : IRegistrationProfilesRepository
{
    private readonly AppDbContext _context;


    public RegistrationProfilesRepository(
        AppDbContext context)
    {
        _context = context;
    }


    private static string DateText(DateOnly? date) =>
        date.HasValue
            ? date.Value.ToString("yyyy-MM-dd")
            : string.Empty;


    public async Task<RegistrationProfilesListDto>
        GetListAsync
        (
            long branchId
        )
    {
        IQueryable<RegistrationProfiles> query =
            _context.Set<RegistrationProfiles>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted);

        if (branchId > 0)
        {
            query = query.Where(x => x.BranchId == branchId);
        }

        List<RegistrationProfiles> rows =
            await query
                .OrderByDescending(x => x.ProfileDate)
                .ThenByDescending(x => x.RegistrationProfileId)
                .ToListAsync();

        List<RegistrationStageTimings> stages =
            await _context.Set<RegistrationStageTimings>()
                .AsNoTracking()
                .OrderBy(x => x.StageOrder)
                .ToListAsync();

        Dictionary<string, int?> expected =
            stages
                .GroupBy(x => x.StageKey, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First().ExpectedDays, StringComparer.OrdinalIgnoreCase);

        List<long> branchIds =
            rows.Select(x => x.BranchId).Distinct().ToList();

        Dictionary<long, string> branches =
            await _context.Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName);

        DateOnly today =
            DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));

        RegistrationProfilesListDto result =
            new()
            {
                Stages =
                    stages
                        .Select
                        (
                            x =>
                                new RegistrationProfileStageDto
                                {
                                    StageKey = x.StageKey,
                                    StageName = x.StageName,
                                    ExpectedDays = x.ExpectedDays,
                                    ColorCode = x.ColorCode ?? string.Empty
                                }
                        )
                        .ToList()
            };

        foreach (RegistrationProfiles x in rows)
        {
            int days =
                x.StatusDate.HasValue
                    ? Math.Max(0, today.DayNumber - x.StatusDate.Value.DayNumber)
                    : 0;

            int? limit =
                expected.GetValueOrDefault(x.Status);

            bool open =
                x.Status != RegistrationStages.Delivered
                && x.Status != RegistrationStages.Cancelled;

            result.Rows.Add(
                new RegistrationProfileRowDto
                {
                    RegistrationProfileId = x.RegistrationProfileId,
                    PublicId = x.PublicId,
                    ProfileNo = x.ProfileNo,
                    ProfileDate = DateText(x.ProfileDate),
                    BranchId = x.BranchId,
                    BranchName = branches.GetValueOrDefault(x.BranchId, string.Empty),
                    SalesInvoiceNo = x.SalesInvoiceNo,
                    SalesInvoiceDate = DateText(x.SalesInvoiceDate),
                    CustomerFileNo = x.CustomerFileNo,
                    CustomerCode = x.CustomerCode,
                    CustomerName = x.CustomerName,
                    CustomerPhone = x.CustomerPhone,
                    SalesmanName = x.SalesmanName,
                    ModelName = x.ModelName,
                    ChassisNo = x.ChassisNo,
                    EngineNo = x.EngineNo,
                    ColorName = x.ColorName,
                    VehiclePower = x.VehiclePower,
                    RegistrationTypeName = x.RegistrationTypeName,
                    RegistrationPlan = x.RegistrationPlan,
                    RegistrationMode = x.RegistrationMode,
                    ValidityYears = x.ValidityYears,
                    Amount = x.Amount,
                    CollectedAmount = x.CollectedAmount,
                    BrtaFees = x.BrtaFees,
                    SubmissionCharges = x.SubmissionCharges,
                    BrtaTips = x.BrtaTips,
                    RegistrationCommission = x.RegistrationCommission,
                    TotalCost = x.BrtaFees + x.SubmissionCharges + x.BrtaTips + x.RegistrationCommission,
                    Surplus = x.Surplus,
                    Status = x.Status,
                    StatusDate = DateText(x.StatusDate),
                    DaysInStatus = days,
                    Overdue = open && limit.HasValue && limit.Value > 0 && days > limit.Value,
                    CancelReason = x.CancelReason,
                    CreatedDate = x.CreatedDate.ToString("yyyy-MM-ddTHH:mm:ss")
                });
        }

        return result;
    }
}
