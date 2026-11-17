//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using AppCore.Application.Common.ActivityHistory.Interfaces;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.ServiceOperations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.ServiceOperations;


//===============================================================
// Service Operations, observations and diagnoses (hand-written :
// NEVER run Code Sync; tables made by ServiceOperations_Diagnosis_
// Engine.sql)
//
//   api/service-operations/service-setup/workshop-configuration/diagnosis
//       GET ''                       both lists (Workshop Configuration)
//       POST observations            PUT / DELETE observations/{publicId}
//       POST diagnoses               PUT / DELETE diagnoses/{publicId}
//   api/service-operations/workshop-management/service-estimates
//       GET observation-lists        the active lists of the estimate
//       POST observations            a new one typed on the estimate
//       POST diagnoses               (page action Add Observation)
//
// Errors : { message } with 400 / 403 / 404 / 409 / 500
//===============================================================

[ApiController]
[Route("api/service-operations/service-setup/workshop-configuration/diagnosis")]
public class WorkshopDiagnosisController
    : WsControllerBase
{
    private readonly IWorkshopDiagnosisRepository _repository;

    public WorkshopDiagnosisController(IWorkshopDiagnosisRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<WorkshopDiagnosisController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
    }

    protected override string PageRoute => "/service-operations/%/workshop-configuration";

    protected override string PageName => "Workshop Configuration";

    [HttpGet]
    public Task<IActionResult> Get() =>
        Run(async () => Ok(await _repository.GetSetupAsync()), "The observations and diagnoses could not be loaded.");

    [HttpPost("observations")]
    public Task<IActionResult> CreateObservation([FromBody] WorkshopObservationDto? dto) =>
        Save("Add", userId => _repository.SaveObservationAsync(null, dto ?? new WorkshopObservationDto(), userId), "The observation could not be saved.");

    [HttpPut("observations/{publicId:guid}")]
    public Task<IActionResult> UpdateObservation(Guid publicId, [FromBody] WorkshopObservationDto? dto) =>
        Save("Update", userId => _repository.SaveObservationAsync(publicId, dto ?? new WorkshopObservationDto(), userId), "The observation could not be updated.");

    [HttpDelete("observations/{publicId:guid}")]
    public Task<IActionResult> DeleteObservation(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteObservationAsync(publicId, userId), "The observation could not be deleted.");

    [HttpPost("diagnoses")]
    public Task<IActionResult> CreateDiagnosis([FromBody] WorkshopDiagnosisDto? dto) =>
        Save("Add", userId => _repository.SaveDiagnosisAsync(null, dto ?? new WorkshopDiagnosisDto(), userId), "The diagnosis could not be saved.");

    [HttpPut("diagnoses/{publicId:guid}")]
    public Task<IActionResult> UpdateDiagnosis(Guid publicId, [FromBody] WorkshopDiagnosisDto? dto) =>
        Save("Update", userId => _repository.SaveDiagnosisAsync(publicId, dto ?? new WorkshopDiagnosisDto(), userId), "The diagnosis could not be updated.");

    [HttpDelete("diagnoses/{publicId:guid}")]
    public Task<IActionResult> DeleteDiagnosis(Guid publicId) =>
        Change("Delete", userId => _repository.DeleteDiagnosisAsync(publicId, userId), "The diagnosis could not be deleted.");
}


//===============================================================
// The estimate form : the active lists, and a new observation or
// diagnosis typed there (page action Add Observation on Service
// Estimates)
//===============================================================

[ApiController]
[Route("api/service-operations/workshop-management/service-estimates")]
public class ServiceEstimateObservationsController
    : WsControllerBase
{
    private const string AddActivity = "Add Observation";

    private readonly IWorkshopDiagnosisRepository _repository;

    private readonly IEffectiveAccessRepository _access;

    public ServiceEstimateObservationsController(IWorkshopDiagnosisRepository repository, IActivityHistoryRepository history, IEffectiveAccessRepository effectiveAccess, ILogger<ServiceEstimateObservationsController> logger)
        : base(history, effectiveAccess, logger)
    {
        _repository = repository;
        _access = effectiveAccess;
    }

    protected override string PageRoute => "/service-operations/%/service-estimates";

    protected override string PageName => "Service Estimates";

    [HttpGet("observation-lists")]
    public Task<IActionResult> GetLists() =>
        Run(async () => Ok(await _repository.GetListsAsync(await _access.HasActivityAsync(UserId, PageRoute, AddActivity))), "The observations could not be loaded.");

    [HttpPost("observations")]
    public Task<IActionResult> AddObservation([FromBody] QuickObservationDto? dto) =>
        Save(AddActivity, userId => _repository.QuickObservationAsync(dto ?? new QuickObservationDto(), userId), "The observation could not be added.");

    [HttpPost("diagnoses")]
    public Task<IActionResult> AddDiagnosis([FromBody] QuickObservationDto? dto) =>
        Save(AddActivity, userId => _repository.QuickDiagnosisAsync(dto ?? new QuickObservationDto(), userId), "The diagnosis could not be added.");
}
