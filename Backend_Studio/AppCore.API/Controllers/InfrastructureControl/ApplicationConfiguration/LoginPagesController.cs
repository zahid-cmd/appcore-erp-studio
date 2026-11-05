//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InfrastructureControl.ApplicationConfiguration;

using AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// LoginPagesController
//===============================================================

[ApiController]

[Route("api/infrastructure-control/application-configuration/login-pages")]

public class LoginPagesController
    : ControllerBase
{
    //===========================================================
    // Repository
    //===========================================================

    private readonly ILoginPagesRepository _repository;


    //===========================================================
    // Constructor
    //===========================================================

    public LoginPagesController
    (
        ILoginPagesRepository repository
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

    [HttpGet("{publicId:guid}")]

    public async Task<IActionResult> GetById
    (
        Guid publicId
    )
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

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

    [AllowAnonymous]
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
        CreateLoginPagesDto dto
    )
    {
        var entity =
            new LoginPages
            {
                Name =
                    dto.Name,

                PageKey =
                    dto.PageKey,

                Title =
                    dto.Title,

                Subtitle =
                    dto.Subtitle,

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

    [HttpPut("{publicId:guid}")]

    public async Task<IActionResult> Update
    (
        Guid publicId,

        [FromBody]
        UpdateLoginPagesDto dto
    )
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

        // The row comes from the link's Public Id
        dto.Id =
            id;


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


        entity.PageKey =
            dto.PageKey;


        entity.Title =
            dto.Title;


        entity.Subtitle =
            dto.Subtitle;


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

    [HttpDelete("{publicId:guid}")]

    public async Task<IActionResult> Delete
    (
        Guid publicId
    )
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

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

    [HttpGet("{publicId:guid}/history")]

    public async Task<IActionResult> GetEntityHistory
    (
        Guid publicId
    )
    {
        long? foundId =
            await _repository.GetIdByPublicIdAsync(publicId);

        if (foundId == null)
        {
            return NotFound();
        }

        long id =
            foundId.Value;

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