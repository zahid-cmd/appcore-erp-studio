//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InfrastructureControl.ApplicationConfiguration;

using AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// DashboardsController
//===============================================================

[ApiController]

[Route("api/infrastructure-control/application-configuration/dashboards")]

public class DashboardsController
    : ControllerBase
{
    //===========================================================
    // Repository
    //===========================================================

    private readonly IDashboardsRepository _repository;


    //===========================================================
    // Constructor
    //===========================================================

    public DashboardsController
    (
        IDashboardsRepository repository
    )
    {
        _repository =
            repository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<IActionResult> GetAll()
    {
        var entities =
            await _repository
                .GetAllAsync();


        return Ok(
            entities
        );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<IActionResult> GetById
    (
        long id
    )
    {
        var entity =
            await _repository
                .GetByIdAsync(
                    id
                );


        if
        (
            entity is null
        )
        {
            return NotFound();
        }


        return Ok(
            entity
        );
    }


    //===========================================================
    // Get Active
    //===========================================================

    [HttpGet("active")]

    public async Task<IActionResult> GetActive()
    {
        var entity =
            await _repository
                .GetActiveAsync();


        if
        (
            entity is null
        )
        {
            return NotFound();
        }


        return Ok(
            entity
        );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task<IActionResult> GetDefaults()
    {
        var defaults =
            await _repository
                .GetDefaultsAsync();


        return Ok(
            defaults
        );
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<IActionResult> Create
    (
        [FromBody]
        CreateDashboardsDto dto
    )
    {
        var entity =
            new Dashboards
            {
                Name =
                    dto.Name,

                DashboardKey =
                    dto.DashboardKey,

                DashboardType =
                    dto.DashboardType,

                RoleProfileId =
                    dto.RoleProfileId,

                Status =
                    dto.Status,

                Remarks =
                    dto.Remarks
            };


        var id =
            await _repository
                .CreateAsync(
                    entity
                );


        return Ok(
            id
        );
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut("{id:long}")]

    public async Task<IActionResult> Update
    (
        long id,

        [FromBody]
        UpdateDashboardsDto dto
    )
    {
        if
        (
            id != dto.Id
        )
        {
            return BadRequest();
        }


        var entity =
            await _repository
                .GetByIdAsync(
                    id
                );


        if
        (
            entity is null
        )
        {
            return NotFound();
        }


        entity.Name =
            dto.Name;


        entity.DashboardKey =
            dto.DashboardKey;


        entity.DashboardType =
            dto.DashboardType;


        entity.RoleProfileId =
            dto.RoleProfileId;


        entity.Status =
            dto.Status;


        entity.Remarks =
            dto.Remarks;


        await _repository
            .UpdateAsync(
                entity
            );


        return NoContent();
    }


    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete
    (
        long id
    )
    {
        var entity =
            await _repository
                .GetByIdAsync(
                    id
                );


        if
        (
            entity is null
        )
        {
            return NotFound();
        }


        await _repository
            .DeleteAsync(
                id
            );


        return NoContent();
    }


    //===========================================================
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> Restore()
    {
        var restored =
            await _repository
                .RestoreAsync();


        if
        (
            !restored
        )
        {
            return NotFound();
        }


        return NoContent();
    }


    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<IActionResult> GetHistory()
    {
        var history =
            await _repository
                .GetHistoryAsync();


        return Ok(
            history
        );
    }


    //===========================================================
    // Get Entity History
    //===========================================================

    [HttpGet("{id:long}/history")]

    public async Task<IActionResult> GetEntityHistory
    (
        long id
    )
    {
        var history =
            await _repository
                .GetEntityHistoryAsync(
                    id
                );


        return Ok(
            history
        );
    }
}