//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.SecurityPermission.UserManagement;

using AppCore.Domain.Entities.SecurityPermission.UserManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.SecurityPermission.UserManagement;


//===============================================================
// SpecialAssignmentController
//===============================================================

[ApiController]

[Route("api/security-permission/user-management/special-assignment")]

public class SpecialAssignmentController
    : ControllerBase
{
    //===========================================================
    // Repository
    //===========================================================

    private readonly ISpecialAssignmentRepository
        _repository;


    //===========================================================
    // Constructor
    //===========================================================

    public SpecialAssignmentController
    (
        ISpecialAssignmentRepository repository
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
        CreateSpecialAssignmentDto dto
    )
    {
        var entity =
            new SpecialAssignment
            {
                UserProfileId =
                    dto.UserProfileId,

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                Details =
                    new List<SpecialAssignmentDetail>()
            };


        //=======================================================
        // Details
        //=======================================================

        foreach
        (
            var dtoDetail
            in
            dto.Details
        )
        {
            var detail =
                new SpecialAssignmentDetail
                {
                    ModuleId =
                        dtoDetail.ModuleId,

                    MenuId =
                        dtoDetail.MenuId,

                    SubMenuId =
                        dtoDetail.SubMenuId,

                    IsActive =
                        dtoDetail.IsActive,

                    IsDeleted =
                        false,

                    SpecialAssignmentPermissions =
                        new List<SpecialAssignmentPermission>()
                };


            //===================================================
            // Permissions
            //===================================================

            foreach
            (
                var dtoPermission
                in
                dtoDetail.Permissions
            )
            {
                var permission =
                    new SpecialAssignmentPermission
                    {
                        MasterActivityId =
                            dtoPermission.MasterActivityId,

                        NavigationActivityId =
                            dtoPermission.NavigationActivityId,

                        IsActive =
                            dtoPermission.IsActive,

                        IsDeleted =
                            false
                    };


                detail
                    .SpecialAssignmentPermissions
                    .Add(
                        permission
                    );
            }


            entity
                .Details
                .Add(
                    detail
                );
        }


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

    // The row comes from the link's Public Id; an id in the body
    // is ignored
    [HttpPut("{publicId:guid}")]

    public async Task<IActionResult> Update
    (
        Guid publicId,

        [FromBody]
        UpdateSpecialAssignmentDto dto
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

        dto.SpecialAssignmentId =
            id;

        if
        (
            id !=
            dto.SpecialAssignmentId
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


        //=======================================================
        // Master
        //=======================================================

        entity.UserProfileId =
            dto.UserProfileId;


        entity.IsActive =
            dto.IsActive;


        //=======================================================
        // Details
        //=======================================================

        entity.Details =
            new List<SpecialAssignmentDetail>();


        foreach
        (
            var dtoDetail
            in
            dto.Details
        )
        {
            var detail =
                new SpecialAssignmentDetail
                {
                    SpecialAssignmentDetailId =
                        dtoDetail.SpecialAssignmentDetailId,

                    SpecialAssignmentId =
                        entity.SpecialAssignmentId,

                    ModuleId =
                        dtoDetail.ModuleId,

                    MenuId =
                        dtoDetail.MenuId,

                    SubMenuId =
                        dtoDetail.SubMenuId,

                    IsActive =
                        dtoDetail.IsActive,

                    IsDeleted =
                        false,

                    SpecialAssignmentPermissions =
                        new List<SpecialAssignmentPermission>()
                };


            //===================================================
            // Permissions
            //===================================================

            foreach
            (
                var dtoPermission
                in
                dtoDetail.Permissions
            )
            {
                var permission =
                    new SpecialAssignmentPermission
                    {
                        SpecialAssignmentPermissionId =
                            dtoPermission.SpecialAssignmentPermissionId,

                        SpecialAssignmentDetailId =
                            detail.SpecialAssignmentDetailId,

                        MasterActivityId =
                            dtoPermission.MasterActivityId,

                        NavigationActivityId =
                            dtoPermission.NavigationActivityId,

                        IsActive =
                            dtoPermission.IsActive,

                        IsDeleted =
                            false
                    };


                detail
                    .SpecialAssignmentPermissions
                    .Add(
                        permission
                    );
            }


            entity
                .Details
                .Add(
                    detail
                );
        }


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
    // Restore Last Deleted
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult> RestoreLastDeleted()
    {
        bool restored =
            await _repository
                .RestoreLastDeletedAsync();


        if
        (
            !restored
        )
        {
            return NotFound(
                "There are no deleted special assignments available to restore."
            );
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