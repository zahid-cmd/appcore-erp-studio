//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.HumanResourceManangement.HumanResourceSetup;
using AppCore.Application.HumanResourceManangement.HumanResourceSetup.Department.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Department Controller
//===============================================================

[ApiController]

[Route("api/human-resource-manangement/human-resource-setup/department")]

public class DepartmentController : ControllerBase
{
    //===============================================================
    // Fields
    //===============================================================

    private readonly IDepartmentRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===============================================================
    // Constructor
    //===============================================================

    public DepartmentController(
        IDepartmentRepository repository,
        IActivityHistoryRepository activityHistoryRepository)
    {
        _repository = repository;

        _activityHistoryRepository = activityHistoryRepository;
    }


    //===============================================================
    // Get All
    //===============================================================

    [HttpGet]

    public async Task<ActionResult<List<DepartmentDto>>> GetAll()
    {
        List<DepartmentDto> departments =
            await _repository.GetAllAsync();

        return Ok(departments);
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

    public async Task<ActionResult<DepartmentDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync());
    }


    //===============================================================
    // Get By Id
    //===============================================================

    [HttpGet("{id:long}")]

    public async Task<ActionResult<DepartmentDto>> GetById(
        long id)
    {
        DepartmentDto? department =
            await _repository.GetByIdAsync(id);

        if (department == null)
        {
            return NotFound();
        }

        return Ok(department);
    }


    //===============================================================
    // Create
    //===============================================================

    [HttpPost]

    public async Task<ActionResult<long>> Create(
        CreateDepartmentDto dto)
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
        UpdateDepartmentDto dto)
    {
        if (!await _repository.ExistsAsync(
                dto.DepartmentId))
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
        // Verify Department Exists
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
                "There are no deleted departments available to restore.");
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
                "Department"));
    }
}