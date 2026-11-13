//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.HumanResourceManangement.HumanResourceSetup;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Api.Controllers.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Weekly Holiday Controller (hand-written page : NEVER run Code
// Sync for it; table made by
// HumanResource_WeeklyHoliday_Engine.sql)
//
// The Weekly Holidays tab of the Holidays page : one record. The
// permissions are those of the Holidays page.
//
//   GET ''   the weekly holiday
//   PUT ''   change it (Add or Update on Holidays)
//
// Errors : { message } with 400 / 403 / 500
//===============================================================

[ApiController]
[Route("api/human-resource-manangement/human-resource-setup/weekly-holiday")]
public class WeeklyHolidayController
    : HrAttendanceControllerBase
{
    private readonly IWeeklyHolidayRepository _repository;

    public WeeklyHolidayController(
        IWeeklyHolidayRepository repository,
        IEffectiveAccessRepository effectiveAccess,
        ILogger<WeeklyHolidayController> logger)
        : base(effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/human-resource-manangement/%/holidays";

    protected override string PageName => "Holidays";

    [HttpGet]
    public Task<IActionResult> Get() =>
        Run(async () => Ok(await _repository.GetAsync()), "The weekly holiday could not be loaded.");

    [HttpPut]
    public Task<IActionResult> Save([FromBody] WeeklyHolidayDto? dto)
    {
        long userId = UserId;

        return Guarded(
            new[] { "Add", "Update" },
            async () => Ok(await _repository.SaveAsync(dto ?? new WeeklyHolidayDto(), userId)),
            "The weekly holiday could not be saved.");
    }
}
