//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.ServiceOperations;
using AppCore.Api.Controllers.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.ServiceOperations;


//===============================================================
// Service Operations, the workshop (hand-written pages : NEVER run
// Code Sync for them; tables made by ServiceOperations_Workshop_
// Engine.sql)
//
// Base : api/service-operations
//
//   service-setup/workshop-configuration
//       GET ''                       the whole page
//       POST bays                    PUT / DELETE bays/{publicId}
//       POST bays/generate           "Bay n" ... in one go
//       POST technicians             PUT / DELETE technicians/{publicId}
//       POST checklist               PUT / DELETE checklist/{publicId}
//       PUT  switches
//       GET  history
//   workshop-management/job-cards
//       GET ''                       the list (heads)
//       GET lookups                  the lists of the form
//       GET parts                    spare parts with price and stock
//       GET bikes?find=              finding the bike
//       GET history
//       GET {publicId}               POST ''   PUT {publicId}
//       PUT {publicId}/assignment    Job Card Assignment
//       PUT {publicId}/status
//       POST {publicId}/work         a technician starts
//       PUT  {publicId}/work/{id}/stop
//       DELETE {publicId}/work/{id}
//       DELETE {publicId}            PUT restore
//   workshop-management/service-estimates   (ServiceEstimatesController.cs)
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

public abstract class WsControllerBase
    : HrAttendanceControllerBase
{
    private readonly IActivityHistoryRepository _history;

    private readonly IEffectiveAccessRepository _pageAccess;

    protected WsControllerBase(
        IActivityHistoryRepository history,
        IEffectiveAccessRepository effectiveAccess,
        ILogger logger)
        : base(effectiveAccess, logger)
    {
        _history = history;
        _pageAccess = effectiveAccess;
    }

    // The user has the page action on this page
    protected Task<bool> Can(string activity) => _pageAccess.HasActivityAsync(UserId, PageRoute, activity);

    // The user has the page action on another page (a desk page)
    protected Task<bool> CanOn(string pageRoute, string activity) => _pageAccess.HasActivityAsync(UserId, pageRoute, activity);

    protected const int Conflict409 = StatusCodes.Status409Conflict;

    protected Task<IActionResult> History(string entity) =>
        Run(async () => Ok(await _history.GetListHistoryAsync("Service Operations", entity)), "The history could not be loaded.");

    // Runs a change and answers 204
    protected Task<IActionResult> Change(string activity, Func<long, Task> action, string failure)
    {
        long userId = UserId;

        return Guarded(
            new[] { activity },
            async () =>
            {
                await action(userId);

                return NoContent();
            },
            failure,
            Conflict409);
    }

    // Runs a change and answers what was saved
    protected Task<IActionResult> Save<T>(string activity, Func<long, Task<T>> action, string failure)
    {
        long userId = UserId;

        return Guarded(new[] { activity }, async () => Ok(await action(userId)), failure, Conflict409);
    }
}


//===============================================================
// Service Setup > Workshop Configuration
//===============================================================

[ApiController]
[Route("api/service-operations/service-setup/workshop-configuration")]
public class WorkshopConfigurationController
    : WsControllerBase
{
    private readonly IWorkshopSetupRepository _repository;

    public WorkshopConfigurationController(IWorkshopSetupRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<WorkshopConfigurationController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/service-operations/%/workshop-configuration";

    protected override string PageName => "Workshop Configuration";

    [HttpGet]
    public Task<IActionResult> Get() =>
        Run(async () => Ok(await _repository.GetSetupAsync()), "The workshop configuration could not be loaded.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("Workshop");

    // Bays

    [HttpPost("bays")]
    public Task<IActionResult> CreateBay([FromBody] WorkshopBayDto? dto) =>
        Save("Add", userId => _repository.SaveBayAsync(null, dto ?? new WorkshopBayDto(), userId), "The bay could not be saved.");

    // "Bay n" ... for a service center, all or nothing
    [HttpPost("bays/generate")]
    public Task<IActionResult> CreateBays([FromBody] WorkshopBaysCreateDto? dto) =>
        Save("Add", userId => _repository.CreateBaysAsync(dto ?? new WorkshopBaysCreateDto(), userId), "The bays could not be created.");

    [HttpPut("bays/{publicId:guid}")]
    public Task<IActionResult> UpdateBay(Guid publicId, [FromBody] WorkshopBayDto? dto) =>
        Save("Update", userId => _repository.SaveBayAsync(publicId, dto ?? new WorkshopBayDto(), userId), "The bay could not be updated.");

    [HttpDelete("bays/{publicId:guid}")]
    public Task<IActionResult> DeleteBay(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteBayAsync(publicId, userId), "The bay could not be deleted.");

    // Technicians

    [HttpPost("technicians")]
    public Task<IActionResult> CreateTechnician([FromBody] WorkshopTechnicianDto? dto) =>
        Save("Add", userId => _repository.SaveTechnicianAsync(null, dto ?? new WorkshopTechnicianDto(), userId), "The technician could not be saved.");

    [HttpPut("technicians/{publicId:guid}")]
    public Task<IActionResult> UpdateTechnician(Guid publicId, [FromBody] WorkshopTechnicianDto? dto) =>
        Save("Update", userId => _repository.SaveTechnicianAsync(publicId, dto ?? new WorkshopTechnicianDto(), userId), "The technician could not be updated.");

    [HttpDelete("technicians/{publicId:guid}")]
    public Task<IActionResult> DeleteTechnician(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteTechnicianAsync(publicId, userId), "The technician could not be deleted.");

    // Check-in checklist

    [HttpPost("checklist")]
    public Task<IActionResult> CreateChecklistItem([FromBody] WorkshopChecklistItemDto? dto) =>
        Save("Add", userId => _repository.SaveChecklistItemAsync(null, dto ?? new WorkshopChecklistItemDto(), userId), "The checklist item could not be saved.");

    [HttpPut("checklist/{publicId:guid}")]
    public Task<IActionResult> UpdateChecklistItem(Guid publicId, [FromBody] WorkshopChecklistItemDto? dto) =>
        Save("Update", userId => _repository.SaveChecklistItemAsync(publicId, dto ?? new WorkshopChecklistItemDto(), userId), "The checklist item could not be updated.");

    [HttpDelete("checklist/{publicId:guid}")]
    public Task<IActionResult> DeleteChecklistItem(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteChecklistItemAsync(publicId, userId), "The checklist item could not be deleted.");

    // Switches

    [HttpPut("switches")]
    public Task<IActionResult> SaveSwitches([FromBody] WorkshopSwitchesDto? dto) =>
        Change("Update", userId => _repository.SaveSwitchesAsync(dto ?? new WorkshopSwitchesDto(), userId), "The workshop switches could not be saved.");
}


//===============================================================
// Workshop Management > Job Cards
//===============================================================

[ApiController]
[Route("api/service-operations/workshop-management/job-cards")]
public class JobCardsController
    : WsControllerBase
{
    private readonly IJobCardsRepository _repository;

    public JobCardsController(IJobCardsRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<JobCardsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/service-operations/%/job-cards";

    protected override string PageName => "Job Cards";

    [HttpGet]
    public Task<IActionResult> GetAll() =>
        Run(async () => Ok(await _repository.GetAllAsync()), "Job cards could not be loaded.");

    [HttpGet("lookups")]
    public Task<IActionResult> GetLookups() =>
        Run(
            async () =>
            {
                JobCardLookupsDto lookups = await _repository.GetLookupsAsync();

                lookups.Access =
                    new JobCardAccessDto
                    {
                        CanOpen = await MayAsync("Add"),
                        CanEditOpen = await MayAsync("Update"),
                        CanAssign = await MayAsync(JobCardStageRules.AssignActivity),
                        CanWork = await MayAsync(JobCardStageRules.WorkActivity)
                    };

                return Ok(lookups);
            },
            "The job card lists could not be loaded.");

    // A stage is a page action of Job Cards, or the Add / Update of
    // its desk page (Job Card Opening, Job Card Assignment)
    private async Task<bool> MayAsync(string activity) =>
        activity switch
        {
            "Add" => await Can("Add") || await CanOn(JobCardStageRules.OpeningRoute, "Add"),
            "Update" => await Can("Update") || await CanOn(JobCardStageRules.OpeningRoute, "Update"),
            JobCardStageRules.AssignActivity =>
                await Can(activity)
                || await CanOn(JobCardStageRules.AssignmentRoute, "Update")
                || await CanOn(JobCardStageRules.AssignmentRoute, "Add"),
            _ => await Can(activity)
        };

    // Runs a change of a stage and answers what was saved
    private Task<IActionResult> Stage<T>(string activity, Func<long, Task<T>> action, string failure)
    {
        long userId = UserId;

        return Run(
            async () =>
                await MayAsync(activity)
                    ? Ok(await action(userId))
                    : Fail(StatusCodes.Status403Forbidden, $"You do not have the \"{activity}\" permission on {PageName}."),
            failure,
            Conflict409);
    }

    // A stage is a page action : the activities the change needs
    // depend on the status of the card (any one is enough)
    private Task<IActionResult> Staged<T>(Guid publicId, Func<string, string[]> need, Func<long, Task<T>> action, string failure)
    {
        long userId = UserId;

        return Run(
            async () =>
            {
                string status = await _repository.GetStatusAsync(publicId);

                string[] activities = need(status);

                bool allowed = false;

                foreach (string activity in activities)
                {
                    if (await MayAsync(activity))
                    {
                        allowed = true;
                        break;
                    }
                }

                if (!allowed)
                {
                    return Fail(StatusCodes.Status403Forbidden, $"The job card is {status} : you do not have the \"{string.Join("\" or \"", activities)}\" permission on {PageName}.");
                }

                return Ok(await action(userId));
            },
            failure,
            Conflict409);
    }

    [HttpGet("parts")]
    public Task<IActionResult> GetParts([FromQuery] long? branchId) =>
        Run(async () => Ok(await _repository.GetPartsAsync(branchId)), "The parts could not be loaded.");

    [HttpGet("bikes")]
    public Task<IActionResult> FindBikes([FromQuery] string? find) =>
        Run(async () => Ok(await _repository.FindBikesAsync(find)), "The bikes could not be searched.");

    // New Job page : a bike we do not sell joins the workshop's list
    [HttpPost("service-bikes")]
    public Task<IActionResult> AddServiceBike([FromBody] SaveServiceBikeDto? dto) =>
        Stage("Add", userId => _repository.AddServiceBikeAsync(dto ?? new SaveServiceBikeDto(), userId), "The bike could not be added.");

    // A new job card filled from an estimate (nothing is saved)
    [HttpGet("from-estimate/{estimatePublicId:guid}")]
    public Task<IActionResult> GetFromEstimate(Guid estimatePublicId) =>
        Run(async () => Ok(await _repository.GetFromEstimateAsync(estimatePublicId)), "The estimate could not be read.");

    [HttpGet("history")]
    public Task<IActionResult> GetHistory() => History("JobCards");

    [HttpGet("{publicId:guid}")]
    public Task<IActionResult> Get(Guid publicId) =>
        Run(async () => Ok(await _repository.GetAsync(publicId)), "The job card could not be loaded.");

    [HttpPost]
    public Task<IActionResult> Create([FromBody] SaveJobCardDto? dto) =>
        Stage("Add", userId => _repository.SaveAsync(null, dto ?? new SaveJobCardDto(), userId), "The job card could not be saved.");

    [HttpPut("{publicId:guid}")]
    public Task<IActionResult> Update(Guid publicId, [FromBody] SaveJobCardDto? dto) =>
        Staged(publicId, JobCardStageRules.ToEdit, userId => _repository.SaveAsync(publicId, dto ?? new SaveJobCardDto(), userId), "The job card could not be updated.");

    [HttpPut("{publicId:guid}/assignment")]
    public Task<IActionResult> Assign(Guid publicId, [FromBody] AssignJobCardDto? dto) =>
        Stage(JobCardStageRules.AssignActivity, userId => _repository.AssignAsync(publicId, dto ?? new AssignJobCardDto(), userId), "The job card could not be assigned.");

    [HttpPut("{publicId:guid}/status")]
    public Task<IActionResult> ChangeStatus(Guid publicId, [FromBody] JobCardStatusChangeDto? dto) =>
        Staged(publicId, status => JobCardStageRules.ToChangeStatus(status, (dto?.Status ?? string.Empty).Trim()), userId => _repository.ChangeStatusAsync(publicId, dto ?? new JobCardStatusChangeDto(), userId), "The status could not be changed.");

    [HttpPost("{publicId:guid}/work")]
    public Task<IActionResult> StartWork(Guid publicId, [FromBody] StartJobCardWorkDto? dto) =>
        Save(JobCardStageRules.WorkActivity, userId => _repository.StartWorkAsync(publicId, dto ?? new StartJobCardWorkDto(), userId), "The work could not be started.");

    [HttpPut("{publicId:guid}/work/{workEntryId:long}/stop")]
    public Task<IActionResult> StopWork(Guid publicId, long workEntryId) =>
        Save(JobCardStageRules.WorkActivity, userId => _repository.StopWorkAsync(publicId, workEntryId, userId), "The work could not be stopped.");

    [HttpDelete("{publicId:guid}/work/{workEntryId:long}")]
    public Task<IActionResult> DeleteWork(Guid publicId, long workEntryId) =>
        Save(JobCardStageRules.WorkActivity, userId => _repository.DeleteWorkAsync(publicId, workEntryId, userId), "The work entry could not be removed.");

    [HttpDelete("{publicId:guid}")]
    public Task<IActionResult> Delete(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteAsync(publicId, userId), "The job card could not be deleted.");

    [HttpPut("restore")]
    public Task<IActionResult> Restore()
    {
        long userId = UserId;

        return Guarded(
            new[] { "Restore" },
            async () =>
            {
                string? no = await _repository.RestoreAsync(userId);

                return no == null
                    ? Fail(StatusCodes.Status404NotFound, "There is no deleted job card to restore.")
                    : Ok(new { Code = no, message = $"{no} restored." });
            },
            "The job card could not be restored.",
            Conflict409);
    }
}
