//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;

using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;

using Microsoft.AspNetCore.Mvc;


//===============================================================
// Page Cloning Controller
//===============================================================

namespace AppCore.API.Controllers.InfrastructureControl.DevelopmentManagement;

[ApiController]
[Route("api/infrastructure-control/development-management/page-cloning")]
public class PageCloningController :
    ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IPageCloningRepository _repository;


    //===========================================================
    // Constructor
    //===========================================================

    public PageCloningController
    (
        IPageCloningRepository repository
    )
    {
        _repository = repository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PageCloningDto>>> GetAll()
    {
        var records =
            await _repository.GetAllAsync();

        var result =
            records.Select
            (
                x =>
                    MapToDto(x)
            );

        return Ok(result);
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]
    public async Task<ActionResult<PageCloningDto>> GetById
    (
        long id
    )
    {
        var record =
            await _repository.GetByIdAsync
            (
                id
            );

        if
        (
            record == null
        )
        {
            return NotFound();
        }

        return Ok
        (
            MapToDto(record)
        );
    }


    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<PageCloningDto>>> GetHistory()
    {
        var records =
            await _repository.GetHistoryAsync();

        var result =
            records.Select
            (
                x =>
                    MapToDto(x)
            );

        return Ok(result);
    }


    //===========================================================
    // Get Entity History
    //===========================================================

    [HttpGet("{id:long}/history")]
    public async Task<ActionResult<IEnumerable<PageCloningDto>>> GetEntityHistory
    (
        long id
    )
    {
        var records =
            await _repository.GetHistoryAsync();

        var result =
            records
                .Where
                (
                    x =>
                        x.Id == id
                )
                .Select
                (
                    x =>
                        MapToDto(x)
                );

        return Ok(result);
    }


    //===========================================================
    // Analyze Source
    //===========================================================

    [HttpGet("analyze-source/{submenuId:long}")]
    public async Task<ActionResult<PageCloningSourceAnalysisDto>> AnalyzeSource
    (
        long submenuId
    )
    {
        if
        (
            submenuId <= 0
        )
        {
            return BadRequest
            (
                "Source page is required."
            );
        }

        try
        {
            var result =
                await _repository.AnalyzeSourceAsync
                (
                    submenuId
                );

            return Ok
            (
                result
            );
        }
        catch
        (
            InvalidOperationException exception
        )
        {
            return BadRequest
            (
                exception.Message
            );
        }
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]
    public async Task<ActionResult<long>> Create
    (
        CreatePageCloningDto dto
    )
    {
        var pageCloning =
            new PageCloning
            {
                CloneFromId =
                    dto.CloneFromId,

                CloneFromCode =
                    dto.CloneFromCode,

                CloneFromName =
                    dto.CloneFromName,

                CloneToId =
                    dto.CloneToId,

                CloneToCode =
                    dto.CloneToCode,

                CloneToName =
                    dto.CloneToName,

                CloningType =
                    dto.CloningType,

                NumberOfFiles =
                    dto.NumberOfFiles,

                Operation =
                    dto.Operation,

                Status =
                    "Pending",

                Remarks =
                    dto.Remarks,

                LastClonedBy =
                    null,

                LastClonedDate =
                    null,

                LastCloningResult =
                    string.Empty,

                IsActive =
                    dto.IsActive,

                CreatedBy =
                    dto.CreatedBy,

                CreatedDate =
                    DateTime.UtcNow,

                ModifiedBy =
                    null,

                ModifiedDate =
                    null,

                DeletedBy =
                    null,

                DeletedDate =
                    null,

                IsDeleted =
                    false
            };

        var id =
            await _repository.CreateAsync
            (
                pageCloning
            );

        return Ok(id);
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update
    (
        long id,

        UpdatePageCloningDto dto
    )
    {
        var pageCloning =
            await _repository.GetByIdAsync
            (
                id
            );

        if
        (
            pageCloning == null
        )
        {
            return NotFound();
        }


        //=======================================================
        // Clone From
        //=======================================================

        pageCloning.CloneFromId =
            dto.CloneFromId;

        pageCloning.CloneFromCode =
            dto.CloneFromCode;

        pageCloning.CloneFromName =
            dto.CloneFromName;


        //=======================================================
        // Clone To
        //=======================================================

        pageCloning.CloneToId =
            dto.CloneToId;

        pageCloning.CloneToCode =
            dto.CloneToCode;

        pageCloning.CloneToName =
            dto.CloneToName;


        //=======================================================
        // Clone Type
        //=======================================================

        pageCloning.CloningType =
            dto.CloningType;


        //=======================================================
        // Files
        //=======================================================

        pageCloning.NumberOfFiles =
            dto.NumberOfFiles;


        //=======================================================
        // Operation
        //=======================================================

        pageCloning.Operation =
            dto.Operation;


        //=======================================================
        // Status
        //=======================================================

        pageCloning.Status =
            dto.Status;


        //=======================================================
        // Configuration
        //=======================================================

        pageCloning.Remarks =
            dto.Remarks;


        //=======================================================
        // Active Status
        //=======================================================

        pageCloning.IsActive =
            dto.IsActive;


        //=======================================================
        // Audit
        //=======================================================

        pageCloning.ModifiedBy =
            dto.ModifiedBy;

        pageCloning.ModifiedDate =
            DateTime.UtcNow;


        await _repository.UpdateAsync
        (
            pageCloning
        );

        return NoContent();
    }


    //===========================================================
    // Clone
    //===========================================================

    [HttpPost("{id:long}/clone")]
    public async Task<IActionResult> Clone
    (
        long id
    )
    {
        var pageCloning =
            await _repository.GetByIdAsync
            (
                id
            );

        if
        (
            pageCloning == null
        )
        {
            return NotFound();
        }

        await _repository.CloneAsync
        (
            id
        );

        return NoContent();
    }


    //===========================================================
    // Generate Package
    //===========================================================

    [HttpPost("{id:long}/generate")]
    public async Task<IActionResult> GeneratePackage
    (
        long id
    )
    {
        var pageCloning =
            await _repository.GetByIdAsync
            (
                id
            );

        if
        (
            pageCloning == null
        )
        {
            return NotFound();
        }

        await _repository.GeneratePackageAsync
        (
            id
        );

        return NoContent();
    }


    //===========================================================
    // Restore Generated Package
    //===========================================================

    [HttpPost("{id:long}/restore-package")]
    public async Task<IActionResult> RestorePackage
    (
        long id
    )
    {
        var pageCloning =
            await _repository.GetByIdAsync
            (
                id
            );

        if
        (
            pageCloning == null
        )
        {
            return NotFound();
        }

        await _repository.RestorePackageAsync
        (
            id
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
        var pageCloning =
            await _repository.GetByIdAsync
            (
                id
            );

        if
        (
            pageCloning == null
        )
        {
            return NotFound();
        }

        await _repository.DeleteAsync
        (
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
        await _repository.RestoreAsync();

        return NoContent();
    }


    //===========================================================
    // Map To DTO
    //===========================================================

    private static PageCloningDto MapToDto
    (
        PageCloning pageCloning
    )
    {
        return new PageCloningDto
        {
            Id =
                pageCloning.Id,

            CloneFromId =
                pageCloning.CloneFromId,

            CloneFromCode =
                pageCloning.CloneFromCode,

            CloneFromName =
                pageCloning.CloneFromName,

            CloneToId =
                pageCloning.CloneToId,

            CloneToCode =
                pageCloning.CloneToCode,

            CloneToName =
                pageCloning.CloneToName,

            CloningType =
                pageCloning.CloningType,

            NumberOfFiles =
                pageCloning.NumberOfFiles,

            Operation =
                pageCloning.Operation,

            Status =
                pageCloning.Status,

            Remarks =
                pageCloning.Remarks,

            LastClonedBy =
                pageCloning.LastClonedBy,

            LastClonedDate =
                pageCloning.LastClonedDate,

            LastCloningResult =
                pageCloning.LastCloningResult,

            IsActive =
                pageCloning.IsActive,

            CreatedBy =
                pageCloning.CreatedBy,

            CreatedDate =
                pageCloning.CreatedDate,

            ModifiedBy =
                pageCloning.ModifiedBy,

            ModifiedDate =
                pageCloning.ModifiedDate,

            DeletedBy =
                pageCloning.DeletedBy,

            DeletedDate =
                pageCloning.DeletedDate,

            IsDeleted =
                pageCloning.IsDeleted
        };
    }
}