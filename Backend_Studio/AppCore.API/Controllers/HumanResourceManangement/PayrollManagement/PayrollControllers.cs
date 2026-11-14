//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.HumanResourceManangement.PayrollManagement;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Controllers.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.HumanResourceManangement.PayrollManagement;


//===============================================================
// Payroll Management controllers (hand-written pages : NEVER run
// Code Sync for them; tables made by
// HumanResource_Phase3_Engine.sql)
//
//   api/human-resource-manangement/payroll-management/
//     salary-advances
//       GET ''   GET defaults   GET history   GET {publicId}
//       POST ''  PUT {publicId} DELETE {publicId}  PUT restore
//     salary-sheets
//       GET ''   GET defaults   GET history   GET {publicId}
//       POST ''                     generate (Add)
//       PUT  {publicId}             typed amounts (Update)
//       PUT  {publicId}/recalculate (Update)
//       PUT  {publicId}/approve     {publicId}/return-to-draft
//       PUT  {publicId}/post        {publicId}/unpost   (Approve)
//       PUT  {publicId}/pay         (Update)
//       DELETE {publicId}           PUT restore
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/human-resource-manangement/payroll-management/salary-advances")]
public class SalaryAdvancesController
    : HrAttendanceControllerBase
{
    private readonly ISalaryAdvancesRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    public SalaryAdvancesController(
        ISalaryAdvancesRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SalaryAdvancesController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/salary-advances";

    protected override string PageName => "Salary Advances";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetListAsync()), "Salary advances could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetDefaultsAsync()), "The salary advance lists could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Human Resource", "HrSalaryAdvances")), "The salary advance history could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The salary advance could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] SalaryAdvanceDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add" },
            async () => Ok(await _repository.CreateAsync(dto ?? new SalaryAdvanceDto(), userId)),
            "The salary advance could not be saved.");
    }

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] SalaryAdvanceDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Update" },
            async () =>
            {
                await _repository.UpdateAsync(publicId, dto ?? new SalaryAdvanceDto(), userId);
                return NoContent();
            },
            "The salary advance could not be updated.");
    }

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Delete" },
            async () =>
            {
                await _repository.DeleteAsync(publicId, userId);
                return NoContent();
            },
            "The salary advance could not be deleted.",
            StatusCodes.Status409Conflict);
    }

    [HttpPut("restore")]
    public Task<IActionResult> Restore()
    {
        long userId = UserId;

        return Guarded(
            new[] { "Restore" },
            async () =>
            {
                string? code = await _repository.RestoreAsync(userId);

                return code == null
                    ? Fail(StatusCodes.Status404NotFound, "There is no deleted salary advance to restore.")
                    : Ok(new { Code = code, message = $"{code} restored." });
            },
            "The salary advance could not be restored.",
            StatusCodes.Status409Conflict);
    }
}


[ApiController]
[Route("api/human-resource-manangement/payroll-management/salary-sheets")]
public class SalarySheetsController
    : HrAttendanceControllerBase
{
    private readonly ISalarySheetsRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;

    public SalarySheetsController(
        ISalarySheetsRepository repository,
        IActivityHistoryRepository activityHistoryRepository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<SalarySheetsController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
        _activityHistoryRepository = activityHistoryRepository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/salary-sheets";

    protected override string PageName => "Salary Sheets";

    // A workflow step : NoContent when it went through
    private Task<IActionResult> Step(string[] activities, Func<long, Task> work, string failure)
    {
        long userId = UserId;

        return Guarded(
            activities,
            async () =>
            {
                await work(userId);
                return NoContent();
            },
            failure,
            StatusCodes.Status409Conflict);
    }

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetListAsync()), "Salary sheets could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetDefaultsAsync()), "The salary sheet lists could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() =>
        Run(async () => Ok(await _activityHistoryRepository.GetListHistoryAsync("Human Resource", "HrSalarySheets")), "The salary sheet history could not be loaded.");

    // ?branchId=&year=&month= : advances not paid out by the month end
    [HttpGet("unpaid-advances")]
    public Task<IActionResult> GetUnpaidAdvances([FromQuery] long branchId, [FromQuery] int year, [FromQuery] int month) =>
        Run(async () => Ok(await _repository.GetUnpaidAdvancesAsync(branchId, year, month)), "The unpaid advances could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The salary sheet could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Generate([FromBody] GenerateSalarySheetDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add" },
            async () => Ok(await _repository.GenerateAsync(dto ?? new GenerateSalarySheetDto(), userId)),
            "The salary sheet could not be generated.");
    }

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Save(Guid publicId, [FromBody] SaveSalarySheetDto? dto) =>
        Step(new[] { "Update" }, userId => _repository.SaveAsync(publicId, dto ?? new SaveSalarySheetDto(), userId), "The salary sheet could not be saved.");

    [HttpPut("{publicId:guid}/recalculate")]
    public Task<IActionResult> Recalculate(Guid publicId) =>
        Step(new[] { "Update" }, userId => _repository.RecalculateAsync(publicId, userId), "The salary sheet could not be recalculated.");

    [HttpPut("{publicId:guid}/approve")]
    public Task<IActionResult> Approve(Guid publicId) =>
        Step(new[] { "Approve" }, userId => _repository.ApproveAsync(publicId, userId), "The salary sheet could not be approved.");

    [HttpPut("{publicId:guid}/return-to-draft")]
    public Task<IActionResult> ReturnToDraft(Guid publicId) =>
        Step(new[] { "Approve" }, userId => _repository.ReturnToDraftAsync(publicId, userId), "The salary sheet could not be returned to Draft.");

    [HttpPut("{publicId:guid}/post")]
    public Task<IActionResult> Post(Guid publicId) =>
        Step(new[] { "Approve" }, userId => _repository.PostAsync(publicId, userId), "The salary sheet could not be posted.");

    [HttpPut("{publicId:guid}/unpost")]
    public Task<IActionResult> Unpost(Guid publicId, [FromBody] SalarySheetReasonDto? dto) =>
        Step(new[] { "Approve" }, userId => _repository.UnpostAsync(publicId, dto ?? new SalarySheetReasonDto(), userId), "The salary sheet could not be unposted.");

    [HttpPut("{publicId:guid}/pay")]
    public Task<IActionResult> Pay(Guid publicId, [FromBody] PaySalaryDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Update" },
            async () => Ok(new { Changed = await _repository.PayAsync(publicId, dto ?? new PaySalaryDto(), userId) }),
            "The salary could not be marked paid.",
            StatusCodes.Status409Conflict);
    }

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId) =>
        Step(new[] { "Delete" }, userId => _repository.DeleteAsync(publicId, userId), "The salary sheet could not be deleted.");

    [HttpPut("restore")]
    public Task<IActionResult> Restore()
    {
        long userId = UserId;

        return Guarded(
            new[] { "Restore" },
            async () =>
            {
                string? code = await _repository.RestoreAsync(userId);

                return code == null
                    ? Fail(StatusCodes.Status404NotFound, "There is no deleted salary sheet to restore.")
                    : Ok(new { Code = code, message = $"{code} restored as a Draft." });
            },
            "The salary sheet could not be restored.",
            StatusCodes.Status409Conflict);
    }
}


//===============================================================
// Overtime Sheets : the overtime of the posted salary sheets.
// Read only : a sheet is there when its salary sheet is posted.
//===============================================================

[ApiController]
[Route("api/human-resource-manangement/payroll-management/overtime-sheets")]
public class OvertimeSheetsController
    : HrAttendanceControllerBase
{
    private readonly ISalarySheetsRepository _repository;

    public OvertimeSheetsController(
        ISalarySheetsRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<OvertimeSheetsController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/overtime-sheets";

    protected override string PageName => "Overtime Sheets";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetOvertimeSheetsAsync()), "Overtime sheets could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetOvertimeSheetAsync(publicId)), "The overtime sheet could not be loaded.");
}


//===============================================================
// Payments of Human Resource : one page, two menus.
//
//   .../payroll-management/payroll-payments   Salary, Overtime
//   .../provident-fund/pf-payments            PF Settlement, PF Loan
//
//   GET  ''                    the payments
//   GET  sources?type=         what can still be paid
//   GET  dues?type=&sourceId=  the employees of a source
//   GET  {publicId}            one payment
//   POST ''                    pays (writes the Payment Voucher)
//   PUT  {publicId}/cancel     cancels (the voucher too)
//===============================================================

public abstract class HrPaymentsControllerBase
    : HrAttendanceControllerBase
{
    private readonly IHrPaymentsRepository _repository;

    protected HrPaymentsControllerBase(
        IHrPaymentsRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
    }

    // "payroll" / "pf"
    protected abstract string Group { get; }

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetListAsync(Group)), "The payments could not be loaded.");

    [HttpGet("sources")]
    public Task<IActionResult> GetSources([FromQuery] string type) =>
        Run(async () => Ok(await _repository.GetSourcesAsync(Group, type)), "What can be paid could not be loaded.");

    [HttpGet("dues")]
    public Task<IActionResult> GetDues([FromQuery] string type, [FromQuery] long sourceId) =>
        Run(async () => Ok(await _repository.GetDuesAsync(Group, type, sourceId)), "What is due could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(Group, publicId)), "The payment could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] CreateHrPaymentDto dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add" },
            async () => Ok(await _repository.CreateAsync(Group, dto, userId)),
            "The payment could not be saved.",
            StatusCodes.Status409Conflict);
    }

    [HttpPut("{publicId:guid}/cancel")]
    public Task<IActionResult> Cancel(Guid publicId, [FromBody] CancelHrPaymentDto dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Delete", "Update" },
            async () =>
            {
                await _repository.CancelAsync(Group, publicId, dto, userId);

                return NoContent();
            },
            "The payment could not be cancelled.",
            StatusCodes.Status409Conflict);
    }
}


[ApiController]
[Route("api/human-resource-manangement/payroll-management/payroll-payments")]
public class PayrollPaymentsController
    : HrPaymentsControllerBase
{
    public PayrollPaymentsController(
        IHrPaymentsRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PayrollPaymentsController> logger)
        : base(repository, effectiveAccess, logger)
    {
    }

    protected override string Group => "payroll";

    protected override string PageRoute => "/human-resource-manangement/%/payroll-payments";

    protected override string PageName => "Payroll Payments";
}


[ApiController]
[Route("api/human-resource-manangement/provident-fund/pf-payments")]
public class PfPaymentsController
    : HrPaymentsControllerBase
{
    public PfPaymentsController(
        IHrPaymentsRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<PfPaymentsController> logger)
        : base(repository, effectiveAccess, logger)
    {
    }

    protected override string Group => "pf";

    protected override string PageRoute => "/human-resource-manangement/%/pf-payments";

    protected override string PageName => "PF Payments";
}


//===============================================================
// Leave Encashments
//   GET ''  defaults  balance?employeeId=&year=  {publicId}
//   POST ''   DELETE {publicId}
//   PUT {publicId}/approve   {publicId}/reject   (Approve)
//===============================================================

[ApiController]
[Route("api/human-resource-manangement/payroll-management/leave-encashments")]
public class LeaveEncashmentsController
    : HrAttendanceControllerBase
{
    private readonly ILeaveEncashmentsRepository _repository;

    public LeaveEncashmentsController(
        ILeaveEncashmentsRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<LeaveEncashmentsController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/leave-encashments";

    protected override string PageName => "Leave Encashments";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetListAsync()), "Leave encashments could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetDefaultsAsync()), "The leave encashment lists could not be loaded.");

    [HttpGet("balance")]
    public Task<IActionResult> GetBalance([FromQuery] long employeeId, [FromQuery] int year) =>
        Run(async () => Ok(await _repository.GetBalanceAsync(employeeId, year)), "The leave balance could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The leave encashment could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] LeaveEncashmentDto dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add" },
            async () => Ok(await _repository.CreateAsync(dto, userId)),
            "The leave encashment could not be saved.",
            StatusCodes.Status409Conflict);
    }

    [HttpPut("{publicId:guid}/approve")]
    public Task<IActionResult> Approve(Guid publicId)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Approve" },
            async () =>
            {
                await _repository.ApproveAsync(publicId, userId);

                return NoContent();
            },
            "The leave encashment could not be approved.",
            StatusCodes.Status409Conflict);
    }

    [HttpPut("{publicId:guid}/reject")]
    public Task<IActionResult> Reject(Guid publicId, [FromBody] SalarySheetReasonDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Approve" },
            async () =>
            {
                await _repository.RejectAsync(publicId, dto ?? new SalarySheetReasonDto(), userId);

                return NoContent();
            },
            "The leave encashment could not be rejected.",
            StatusCodes.Status409Conflict);
    }

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Delete" },
            async () =>
            {
                await _repository.DeleteAsync(publicId, userId);

                return NoContent();
            },
            "The leave encashment could not be deleted.",
            StatusCodes.Status409Conflict);
    }
}


//===============================================================
// Festival Bonus
//   GET ''  defaults  {publicId}
//   POST ''                     generate
//   PUT  {publicId}             the amounts (Draft)
//   PUT  {publicId}/post        PUT {publicId}/unpost
//   DELETE {publicId}           (Draft)
//===============================================================

[ApiController]
[Route("api/human-resource-manangement/payroll-management/festival-bonus")]
public class BonusSheetsController
    : HrAttendanceControllerBase
{
    private readonly IBonusSheetsRepository _repository;

    public BonusSheetsController(
        IBonusSheetsRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<BonusSheetsController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/festival-bonus";

    protected override string PageName => "Festival Bonus";

    private Task<IActionResult> Step(string[] activities, Func<long, Task> work, string failure)
    {
        long userId = UserId;

        return Guarded(
            activities,
            async () =>
            {
                await work(userId);

                return NoContent();
            },
            failure,
            StatusCodes.Status409Conflict);
    }

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetListAsync()), "Bonus sheets could not be loaded.");

    [HttpGet("defaults")]
    public Task<IActionResult> GetDefaults() =>
        Run(async () => Ok(await _repository.GetDefaultsAsync()), "The bonus sheet lists could not be loaded.");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The bonus sheet could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Generate([FromBody] GenerateBonusSheetDto dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add" },
            async () => Ok(await _repository.GenerateAsync(dto, userId)),
            "The bonus sheet could not be generated.",
            StatusCodes.Status409Conflict);
    }

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Save(Guid publicId, [FromBody] SaveBonusSheetDto dto) =>
        Step(new[] { "Update", "Add" }, userId => _repository.SaveAsync(publicId, dto, userId), "The bonus sheet could not be saved.");

    [HttpPut("{publicId:guid}/post")]
    public Task<IActionResult> Post(Guid publicId) =>
        Step(new[] { "Update", "Add" }, userId => _repository.PostAsync(publicId, userId), "The bonus sheet could not be posted.");

    [HttpPut("{publicId:guid}/unpost")]
    public Task<IActionResult> Unpost(Guid publicId, [FromBody] SalarySheetReasonDto dto) =>
        Step(new[] { "Update", "Delete" }, userId => _repository.UnpostAsync(publicId, dto, userId), "The bonus sheet could not be unposted.");

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId) =>
        Step(new[] { "Delete" }, userId => _repository.DeleteAsync(publicId, userId), "The bonus sheet could not be deleted.");
}
