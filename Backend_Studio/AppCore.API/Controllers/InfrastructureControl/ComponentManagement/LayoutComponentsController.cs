//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InfrastructureControl.ComponentManagement;

using AppCore.Domain.Entities.InfrastructureControl.ComponentManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.ComponentManagement;


//===============================================================
// LayoutComponentsController
//===============================================================

[ApiController]

[Route("api/infrastructure-control/component-management/layout-components")]

public class LayoutComponentsController
    : ControllerBase
{
    //===========================================================
    // Repository
    //===========================================================

    private readonly ILayoutComponentsRepository _repository;


    //===========================================================
    // Constructor
    //===========================================================

    public LayoutComponentsController
    (
        ILayoutComponentsRepository repository
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
    // Create
    //===========================================================

    [HttpPost]

    public async Task<IActionResult> Create
    (
        [FromBody]
        CreateLayoutComponentsDto dto
    )
    {
        var entity =
            new LayoutComponents
            {
                Code =
                    dto.Code,

                Name =
                    dto.Name,

                TabName =
                    dto.TabName,

                ComponentKey =
                    dto.ComponentKey,

                DisplayOrder =
                    dto.DisplayOrder,

                Icon =
                    dto.Icon,

                ComponentPath =
                    dto.ComponentPath,

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
        UpdateLayoutComponentsDto dto
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


        entity.TabName =
            dto.TabName;


        entity.ComponentKey =
            dto.ComponentKey;


        entity.DisplayOrder =
            dto.DisplayOrder;


        entity.Icon =
            dto.Icon;


        entity.ComponentPath =
            dto.ComponentPath;


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
        try
        {
            await _repository
                .RestoreAsync();


            return NoContent();
        }
        catch
        (
            InvalidOperationException
        )
        {
            return NotFound();
        }
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