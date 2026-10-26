//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.Settings.GeneralSettings;


//===============================================================
// Business Configuration Controller
//
// Extra grants (per branch)
//   GET    /                       all live grants
//   GET    /{id}
//   POST   /                       grant          (400 on errors)
//   PUT    /                       update         (400 / 404)
//   DELETE /{id}                   revoke         (404)
//   PUT    /restore                restore latest (404 / 409)
//
// Wing core business
//   GET    /wing-lines
//   PUT    /wing-lines             save one wing  (400 / 404)
//
// Today's view
//   GET    /branch-overview        all four lines of every branch
//   GET    /allowed-warehouses?businessLine=Spare%20Parts
//
//   GET    /history
//===============================================================

[ApiController]

[Route("api/settings/general-settings/business-configuration")]

public class BusinessConfigurationController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IBusinessConfigurationRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public BusinessConfigurationController(
        IBusinessConfigurationRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===========================================================
    // Get All Grants
    //===========================================================

    [HttpGet]

    public async Task<ActionResult<List<BusinessConfigurationDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync());
    }


    //===========================================================
    // Wing Core Business
    //===========================================================

    [HttpGet("wing-lines")]

    public async Task<ActionResult<List<WingBusinessLinesDto>>> GetWingLines()
    {
        return Ok(
            await _repository.GetWingLinesAsync());
    }


    [HttpPut("wing-lines")]

    public async Task<IActionResult> UpdateWingLines(
        UpdateWingBusinessLinesDto dto)
    {
           long userId = this.CurrentUserId();

        try
        {
            await _repository.UpdateWingLinesAsync(
                dto,
                userId);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Branch Overview
    //===========================================================

    [HttpGet("branch-overview")]

    public async Task<ActionResult<List<BranchBusinessLinesDto>>> GetBranchOverview()
    {
        return Ok(
            await _repository.GetBranchOverviewAsync());
    }


    //===========================================================
    // Allowed Warehouses
    //===========================================================

    [HttpGet("allowed-warehouses")]

    public async Task<ActionResult<List<AllowedWarehouseDto>>> GetAllowedWarehouses(
        [FromQuery] string? businessLine)
    {
        try
        {
            return Ok(
                await _repository.GetAllowedWarehousesAsync(
                    businessLine));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "General Settings",
                "BusinessConfiguration"));
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<BusinessConfigurationDto>> GetById(
        long id)
    {
        BusinessConfigurationDto? grant =
            await _repository.GetByIdAsync(id);

        if (grant == null)
        {
            return NotFound();
        }

        return Ok(grant);
    }


    //===========================================================
    // Create (grant)
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateBusinessConfigurationDto dto)
    {
           long userId = this.CurrentUserId();

        try
        {
            return Ok(
                await _repository.CreateAsync(
                    dto,
                    userId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateBusinessConfigurationDto dto)
    {
           long userId = this.CurrentUserId();

        try
        {
            await _repository.UpdateAsync(
                dto,
                userId);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }


    //===========================================================
    // Delete = Revoke
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
           long userId = this.CurrentUserId();

        try
        {
            await _repository.DeleteAsync(
                id,
                userId);

            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }


    //===========================================================
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
           long userId = this.CurrentUserId();

        try
        {
            bool restored =
                await _repository.RestoreAsync(
                    userId);

            if (!restored)
            {
                return NotFound(
                    "There are no revoked business grants available to restore.");
            }

            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }
}