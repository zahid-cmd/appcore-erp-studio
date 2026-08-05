//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Module Synchronization Controller
//===============================================================

[ApiController]
[Route("api/infrastructure-control/development-management/module-synchronization")]
public class ModuleSynchronizationController : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IModuleSynchronizationRepository _repository;

    private readonly IActivityHistoryRepository _activityHistoryRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public ModuleSynchronizationController
    (
        IModuleSynchronizationRepository repository,
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
    public async Task<ActionResult<ModuleSynchronizationDefaultsDto>> GetDefaults
    (
        [FromQuery] string type
    )
    {
        return Ok(
            await _repository.GetDefaultsAsync(type)
        );
    }


    //===========================================================
    // Analyze Module
    //===========================================================

    [HttpGet("analyze/{moduleId:long}")]
    public async Task<ActionResult<ModuleSynchronizationDto>> Analyze
    (
        long moduleId,

        [FromQuery] string type
    )
    {
        var result =
            await _repository.AnalyzeAsync(
                moduleId,
                type
            );

        if (result == null)
        {
            return NotFound();
        }

        return Ok(result);
    }


    //===========================================================
    // Sync
    //===========================================================

    [HttpPost("{id:long}/sync")]
    public async Task<ActionResult> Sync
    (
        long id
    )
    {
        var synchronized =
            await _repository.SynchronizeAsync(id);

        if (!synchronized)
        {
            return NotFound();
        }

        return NoContent();
    }

    //===========================================================
    // Rollback
    //===========================================================

    [HttpPost("{id:long}/rollback")]
    public async Task<ActionResult> Rollback
    (
        long id
    )
    {
        var rolledBack =
            await _repository.RollbackAsync
            (
                id
            );

        if (!rolledBack)
        {
            return NotFound();
        }

        return NoContent();
    }
    
    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]
    public async Task<ActionResult<List<ModuleSynchronizationDto>>> GetAll
    (
        [FromQuery] string type
    )
    {
        return Ok(
            await _repository.GetAllAsync(type)
        );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ModuleSynchronizationDto>> GetById
    (
        long id
    )
    {
        var synchronization =
            await _repository.GetByIdAsync(id);

        if (synchronization == null)
        {
            return NotFound();
        }

        return Ok(synchronization);
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]
    public async Task<ActionResult<long>> Create
    (
        CreateModuleSynchronizationDto dto
    )
    {
        var id =
            await _repository.CreateAsync(dto);

        return Ok(id);
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut("{id:long}")]
    public async Task<ActionResult> Update
    (
        long id,

        UpdateModuleSynchronizationDto dto
    )
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
    public async Task<ActionResult> Delete
    (
        long id
    )
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
    // Restore
    //===========================================================

    [HttpPut("restore")]
    public async Task<ActionResult> Restore
    (
        [FromQuery] string type
    )
    {
        var restored =
            await _repository.RestoreAsync(type);

        if (!restored)
        {
            return NotFound(
                $"No deleted {type} module synchronization configuration found.");
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
                    "Infrastructure Control",
                    "Module Synchronization"
                );

        return Ok(history);
    }


    //===========================================================
    // Get Module Synchronization History
    //===========================================================

    [HttpGet("{id:long}/history")]
    public async Task<ActionResult<List<ActivityHistoryDto>>> GetEntityHistory
    (
        long id
    )
    {
        var history =
            await _activityHistoryRepository
                .GetHistoryAsync(
                    "Infrastructure Control",
                    "Module Synchronization",
                    id
                );

        return Ok(history);
    }
}