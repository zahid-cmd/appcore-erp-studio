//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.HumanResourceManangement.HrReports;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Controllers.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.HumanResourceManangement.HrReports;


//===============================================================
// HR Reports Controller (hand-written page : NEVER run Code Sync
// for it; read only)
//
//   api/human-resource-manangement/hr-reports/staff-payroll-reports
//     GET lookups                                  branches, departments, years
//     GET staff-list?branchId=&departmentId=&status=
//     GET leave-balance?year=&branchId=
//     GET salary-register?year=&branchId=&postedOnly=
//
// Errors : { message } with 400 / 403 / 404 / 500
//===============================================================

[ApiController]
[Route("api/human-resource-manangement/hr-reports/staff-payroll-reports")]
public class HrReportsController
    : HrAttendanceControllerBase
{
    private readonly IHrReportsRepository _repository;

    public HrReportsController(
        IHrReportsRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<HrReportsController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/staff-payroll-reports";

    protected override string PageName => "Staff & Payroll Reports";

    [HttpGet("lookups")]
    public Task<IActionResult> GetLookups() =>
        Run(async () => Ok(await _repository.GetLookupsAsync()), "The report filters could not be loaded.");

    // The reports show salaries : View on the page is needed
    [HttpGet("staff-list")]
    public Task<IActionResult> GetStaffList([FromQuery] long branchId = 0, [FromQuery] long departmentId = 0, [FromQuery] string? status = null) =>
        Guarded(
            new[] { "View" },
            async () => Ok(await _repository.GetStaffListAsync(branchId, departmentId, status ?? "all")),
            "The staff list could not be loaded.");

    [HttpGet("leave-balance")]
    public Task<IActionResult> GetLeaveBalance([FromQuery] int year = 0, [FromQuery] long branchId = 0) =>
        Guarded(
            new[] { "View" },
            async () => Ok(await _repository.GetLeaveBalanceAsync(year, branchId)),
            "The leave balance could not be loaded.");

    [HttpGet("salary-register")]
    public Task<IActionResult> GetSalaryRegister([FromQuery] int year = 0, [FromQuery] long branchId = 0, [FromQuery] bool postedOnly = false) =>
        Guarded(
            new[] { "View" },
            async () => Ok(await _repository.GetSalaryRegisterAsync(year, branchId, postedOnly)),
            "The salary register could not be loaded.");
}
