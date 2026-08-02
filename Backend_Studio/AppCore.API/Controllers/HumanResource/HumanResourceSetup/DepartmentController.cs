//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Contracts.Persistence.HumanResource.HumanResourceSetup;
using AppCore.Application.HumanResource.HumanResourceSetup.Department.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.HumanResource.HumanResourceSetup;


//===============================================================
// Department Controller
//===============================================================

[ApiController]
[Route("api/human-resource/human-resource-setup/department")]
public class DepartmentController : ControllerBase
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly IDepartmentRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;



    //===========================================================
    // Constructor
    //===========================================================

    public DepartmentController
    (
        IDepartmentRepository repository,
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
    public async Task<ActionResult<DepartmentDefaultsDto>> GetDefaults()
    {
        return Ok(
            await _repository.GetDefaultsAsync()
        );
    }



    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]
    public async Task<ActionResult<List<DepartmentDto>>> GetAll()
    {
        return Ok(
            await _repository.GetAllAsync()
        );
    }



    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]
    public async Task<ActionResult<DepartmentDto>> GetById(
        long id)
    {
        var department =
            await _repository.GetByIdAsync(id);

        if (department == null)
        {
            return NotFound();
        }

        return Ok(department);
    }



    //===========================================================
    // Create
    //===========================================================

    [HttpPost]
    public async Task<ActionResult<long>> Create(
        CreateDepartmentDto dto)
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
        UpdateDepartmentDto dto)
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
                    "Department"
                );

        return Ok(history);
    }



    //===========================================================
    // Get Department History
    //===========================================================

    [HttpGet("{id:long}/history")]
    public async Task<ActionResult<List<ActivityHistoryDto>>> GetHistory(
        long id)
    {
        var history =
            await _activityHistoryRepository
                .GetHistoryAsync(
                    "Human Resource",
                    "Department",
                    id
                );

        return Ok(history);
    }

}