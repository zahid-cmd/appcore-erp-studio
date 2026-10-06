//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.HumanResourceManangement.HumanResourceSetup;
using AppCore.Application.HumanResourceManangement.HumanResourceSetup.Designation.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Designation Controller
//===============================================================

[ApiController]

[Route("api/human-resource-manangement/human-resource-setup/designation")]

public class DesignationController : ControllerBase
{
    //===============================================================
    // Fields
    //===============================================================

    private readonly IDesignationRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===============================================================
    // Constructor
    //===============================================================

    public DesignationController(
        IDesignationRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===============================================================
    // Get All
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<List<DesignationDto>>> GetAll()
    {
        List<DesignationDto> designations =
            await _repository.GetAllAsync();

        return Ok(designations);
    }


    //===============================================================
    // Get Next Code
    //===============================================================

    [HttpGet("next-code")]

    public async Task<ActionResult<string>> GetNextCode()
    {
        return Ok(
            await _repository.GetNextCodeAsync());
    }


    //===============================================================
    // Get Defaults
    //===============================================================

    [HttpGet("defaults")]

    public async Task<ActionResult<DesignationDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<DesignationDto>> GetById(
        long id)
    {
        DesignationDto? designation =
            await _repository.GetByIdAsync(id);

        if (designation == null)
        {
            return NotFound();
        }

        return Ok(designation);
    }


    //===============================================================
    // Create
    //===============================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateDesignationDto dto)
    {
        long userId = 1;

        long id =
            await _repository.CreateAsync(
                dto,
                userId);

        return Ok(id);
    }


    //===============================================================
    // Update
    //===============================================================

    [HttpPut]

    public async Task<IActionResult> Update(
        UpdateDesignationDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.DesignationId))
        {
            return NotFound();
        }

        long userId = 1;

        await _repository.UpdateAsync(
            dto,
            userId);

        return NoContent();
    }


    //===============================================================
    // Delete
    //===============================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete(
        long id)
    {
        //===========================================================
        // Verify Designation Exists
        //===========================================================

        if (!await _repository.ExistsAsync(id))
        {
            return NotFound();
        }


        //===========================================================
        // Current User
        //===========================================================

        long userId = 1;


        //===========================================================
        // Delete
        //===========================================================

        try
        {
            await _repository.DeleteAsync(
                id,
                userId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return Conflict(ex.Message);
        }


        //===========================================================
        // Delete Successful
        //===========================================================

        return NoContent();
    }


    //===============================================================
    // Restore
    //===============================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
        long userId = 1;

        bool restored =
            await _repository.RestoreAsync(
                userId);

        if (!restored)
        {
            return NotFound(
                "There are no deleted designations available to restore.");
        }

        return NoContent();
    }


    //===============================================================
    // Get History
    //===============================================================

    [HttpGet("history")]

    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory()
    {
        return Ok(
            await _activityHistoryRepository.GetListHistoryAsync(
                "Human Resource Setup",
                "Designation"));
    }
}