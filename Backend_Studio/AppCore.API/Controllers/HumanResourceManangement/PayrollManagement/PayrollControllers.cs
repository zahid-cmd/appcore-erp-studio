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
