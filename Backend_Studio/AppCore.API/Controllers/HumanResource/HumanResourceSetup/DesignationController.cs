//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.HumanResource.HumanResourceSetup.Designation.DTOs;
using AppCore.Application.HumanResource.HumanResourceSetup.Designation.Interfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.HumanResource.HumanResourceSetup;


//===============================================================
// Designation Controller
//===============================================================

[ApiController]
[Route("api/human-resource/human-resource-setup/designation")]
public class DesignationController : ControllerBase
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly IDesignationRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;



    //===========================================================
    // Constructor
    //===========================================================

    public DesignationController
    (
        IDesignationRepository repository,
        IActivityHistoryRepository activityHistoryRepository
    )
    {
        _repository =
            repository;

        _activityHistoryRepository =
            activityHistoryRepository;
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]
    public async Task<ActionResult<DesignationDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync()
        );
    }



    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]
    public async Task<ActionResult<List<DesignationDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync()
        );
    }



    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]
    public async Task<ActionResult<DesignationDto>> GetById(
        long id)
    {
        var designation =
            await _repository.GetByIdAsync(id);

        if (designation == null)
        {
            return NotFound();
        }

        return Ok(designation);
    }



    //===========================================================
    // Create
    //===========================================================

    [HttpPost]
    public async Task<ActionResult<long>> Create(
        CreateDesignationDto dto)
    {
        var id =
            await _repository.CreateAsync(dto);

        return Ok(id);
    }



    //===========================================================
    // Update
    //===========================================================

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update(
        long id,
        UpdateDesignationDto dto)
    {
        if (id != dto.Id)
        {
            return BadRequest();
        }

        var updated =
            await _repository.UpdateAsync(dto);

        if (!updated)
        {
            return NotFound();
        }

        return NoContent();
    }



    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]
    public async Task<ActionResult> Delete(
        long id)
    {
        var deleted =
            await _repository.DeleteAsync(id);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }



    //===========================================================
    // Get List History
    //===========================================================

    [HttpGet("history")]
    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        var history =
            await _activityHistoryRepository
                .GetListHistoryAsync(
                    "Human Resource",
                    "Designation"
                );

        return Ok(history);
    }



    //===========================================================
    // Get Designation History
    //===========================================================

    [HttpGet("{id:long}/history")]
    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory(
        long id)
    {
        var history =
            await _activityHistoryRepository
                .GetHistoryAsync(
                    "Human Resource",
                    "Designation",
                    id
                );

        return Ok(history);
    }
}