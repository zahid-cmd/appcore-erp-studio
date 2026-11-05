//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InfrastructureControl.DashboardComponents;

using AppCore.Domain.Entities.InfrastructureControl.DashboardComponents;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.DashboardComponents;


//===============================================================
// RoleBasedDBComponentsController
//===============================================================

[ApiController]

[Route("api/infrastructure-control/dashboard-components/role-based-dashboard-components")]

public class RoleBasedDBComponentsController
    : ControllerBase
{
    //===========================================================
    // Repository
    //===========================================================

    private readonly IRoleBasedDBComponentsRepository _repository;


    //===========================================================
    // Constructor
    //===========================================================

    public RoleBasedDBComponentsController
    (
        IRoleBasedDBComponentsRepository repository
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
    // Create
    //===========================================================

    [HttpPost]

    public async Task<IActionResult> Create
    (
        [FromBody]
        CreateRoleBasedDBComponentsDto dto
    )
    {
        var entity =
            new RoleBasedDBComponents
            {
                Name =
                    dto.Name,

                TabName =
                    dto.TabName,

                Icon =
                    dto.Icon,

                FolderName =
                    dto.FolderName,

                FeatureFolder =
                    dto.FeatureFolder,

                FeatureSubFolder =
                    dto.FeatureSubFolder,

                ComponentPath =
                    dto.ComponentPath,

                RegistrationFilePath =
                    dto.RegistrationFilePath,

                HtmlFilePath =
                    dto.HtmlFilePath,

                TsFilePath =
                    dto.TsFilePath,

                CssFilePath =
                    dto.CssFilePath,

                DisplayOrder =
                    dto.DisplayOrder,

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
        UpdateRoleBasedDBComponentsDto dto
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


        entity.TabName =
            dto.TabName;


        entity.Icon =
            dto.Icon;


        entity.FolderName =
            dto.FolderName;


        entity.FeatureFolder =
            dto.FeatureFolder;


        entity.FeatureSubFolder =
            dto.FeatureSubFolder;


        entity.ComponentPath =
            dto.ComponentPath;


        entity.RegistrationFilePath =
            dto.RegistrationFilePath;


        entity.HtmlFilePath =
            dto.HtmlFilePath;


        entity.TsFilePath =
            dto.TsFilePath;


        entity.CssFilePath =
            dto.CssFilePath;


        entity.DisplayOrder =
            dto.DisplayOrder;


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