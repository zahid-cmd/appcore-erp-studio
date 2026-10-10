
 //===============================================================
 // Namespaces
 //===============================================================

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;
using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;

using Microsoft.AspNetCore.Mvc;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;


//===============================================================
// Page Cloning Controller
//===============================================================

namespace AppCore.API.Controllers.InfrastructureControl.DevelopmentManagement;

[ApiController]
[Route("api/infrastructure-control/development-management/page-cloning")]
public class PageCloningController : ControllerBase
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
            records.Select(MapToDto);

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
            await _repository.GetByIdAsync(id);

        if (record == null)
        {
            return NotFound();
        }

        return Ok(MapToDto(record));
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
            records.Select(MapToDto);

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
        if (id <= 0)
        {
            return BadRequest("A valid page cloning record ID is required.");
        }

        var records =
            await _repository.GetHistoryAsync();

        var result =
            records
                .Where(x => x.Id == id)
                .Select(MapToDto);

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
        if (submenuId <= 0)
        {
            return BadRequest("Source page is required.");
        }

        try
        {
            var result =
                await _repository.AnalyzeSourceAsync(submenuId);

            return Ok(result);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(exception.Message);
        }
    }


    //===========================================================
    // Analyze Target
    //===========================================================

    [HttpGet("analyze-target/{submenuId:long}")]
    public async Task<ActionResult<PageCloningSourceAnalysisDto>> AnalyzeTarget
    (
        long submenuId
    )
    {
        if (submenuId <= 0)
        {
            return BadRequest("Target page is required.");
        }

        try
        {
            var result =
                await _repository.AnalyzeTargetAsync(submenuId);

            return Ok(result);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(exception.Message);
        }
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]
    public async Task<ActionResult<long>> Create
    (
        [FromBody] CreatePageCloningDto dto
    )
    {
        //=======================================================
        // Validate Request
        //=======================================================

        if (dto == null)
        {
            return BadRequest(
                "Page cloning configuration is required.");
        }

        if (dto.CloneFromId <= 0)
        {
            return BadRequest(
                "A valid source page is required.");
        }

        if (dto.CloneToId <= 0)
        {
            return BadRequest(
                "A valid target page is required.");
        }

        if (dto.CloneFromId == dto.CloneToId)
        {
            return BadRequest(
                "Source and target pages must be different.");
        }

        //=======================================================
        // Prepare Entity
        //=======================================================

        var pageCloning = new PageCloning
        {
            CloneFromId = dto.CloneFromId,
            CloneFromCode = dto.CloneFromCode,
            CloneFromName = dto.CloneFromName,

            CloneToId = dto.CloneToId,
            CloneToCode = dto.CloneToCode,
            CloneToName = dto.CloneToName,

            CloningType = dto.CloningType,
            NumberOfFiles = dto.NumberOfFiles,
            Operation = dto.Operation,

            Status = "Pending",
            Remarks = dto.Remarks,

            LastClonedBy = null,
            LastClonedDate = null,
            LastCloningResult = string.Empty,

            IsActive = dto.IsActive,

            CreatedBy = dto.CreatedBy,
            CreatedDate = DateTime.UtcNow,

            ModifiedBy = null,
            ModifiedDate = null,

            DeletedBy = null,
            DeletedDate = null,

            IsDeleted = false
        };

        //=======================================================
        // Save Record
        //=======================================================

        var id =
            await _repository.CreateAsync(pageCloning);

        //=======================================================
        // Return Created Record
        //=======================================================

        return Ok(id);
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update
    (
        long id,
        [FromBody] UpdatePageCloningDto dto
    )
    {
        //=======================================================
        // Validate Request
        //=======================================================

        if (dto == null)
        {
            return BadRequest(
                "Page cloning configuration is required.");
        }

        if (dto.CloneFromId <= 0 || dto.CloneToId <= 0)
        {
            return BadRequest(
                "Valid source and target pages are required.");
        }

        if (dto.CloneFromId == dto.CloneToId)
        {
            return BadRequest(
                "Source and target pages must be different.");
        }

        //=======================================================
        // Load Existing Record
        //=======================================================

        var pageCloning =
            await _repository.GetByIdAsync(id);

        if (pageCloning == null)
        {
            return NotFound();
        }

        //=======================================================
        // Clone From
        //=======================================================

        pageCloning.CloneFromId = dto.CloneFromId;
        pageCloning.CloneFromCode = dto.CloneFromCode;
        pageCloning.CloneFromName = dto.CloneFromName;

        //=======================================================
        // Clone To
        //=======================================================

        pageCloning.CloneToId = dto.CloneToId;
        pageCloning.CloneToCode = dto.CloneToCode;
        pageCloning.CloneToName = dto.CloneToName;

        //=======================================================
        // Clone Type
        //=======================================================

        pageCloning.CloningType = dto.CloningType;

        //=======================================================
        // Files
        //=======================================================

        pageCloning.NumberOfFiles = dto.NumberOfFiles;

        //=======================================================
        // Operation
        //=======================================================

        pageCloning.Operation = dto.Operation;

        //=======================================================
        // Status
        //=======================================================
        // Status is controlled by the cloning workflow.
        // Do not allow an ordinary edit request to mark a
        // cloning operation as completed.

        //=======================================================
        // Configuration
        //=======================================================

        pageCloning.Remarks = dto.Remarks;

        //=======================================================
        // Active Status
        //=======================================================

        pageCloning.IsActive = dto.IsActive;

        //=======================================================
        // Audit
        //=======================================================

        pageCloning.ModifiedBy = dto.ModifiedBy;
        pageCloning.ModifiedDate = DateTime.UtcNow;

        //=======================================================
        // Save Changes
        //=======================================================

        await _repository.UpdateAsync(pageCloning);

        return NoContent();
    }


    //===========================================================
    // Clone
    //===========================================================

    [HttpPost("{id:long}/clone")]
    public async Task<IActionResult> Clone
    (
        long id,
        [FromBody] PageCloningDto? configuration
    )
    {
        //=======================================================
        // Validate Cloning Record ID
        //=======================================================

        if (id <= 0)
        {
            return BadRequest(
                "A valid page cloning record ID is required.");
        }

        //=======================================================
        // Load Saved Cloning Record
        //=======================================================

        var pageCloning =
            await _repository.GetByIdAsync(id);

        if (pageCloning == null)
        {
            return NotFound(
                "Page cloning configuration was not found.");
        }

        //=======================================================
        // Validate Transformation Configuration
        //=======================================================

        if (configuration != null)
        {
            if (
                configuration.CloneFromId > 0 &&
                configuration.CloneFromId != pageCloning.CloneFromId
            )
            {
                return BadRequest(
                    "The submitted source does not match the saved configuration.");
            }

            if (
                configuration.CloneToId > 0 &&
                configuration.CloneToId != pageCloning.CloneToId
            )
            {
                return BadRequest(
                    "The submitted target does not match the saved configuration.");
            }

            //===================================================
            // Validate Model Field Collection
            //===================================================

            if (configuration.ModelFields == null)
            {
                return BadRequest(
                    "Model field configuration must be supplied as a collection. " +
                    "Use an empty collection when no field operations are selected.");
            }

            var allowedOperations =
                new HashSet<string>(
                    StringComparer.OrdinalIgnoreCase)
                {
                    "Keep",
                    "Modify",
                    "Add",
                    "Exclude"
                };

            var configuredFieldKeys =
                new HashSet<string>(
                    StringComparer.OrdinalIgnoreCase);

            foreach (var field in configuration.ModelFields)
            {
                //===============================================
                // Validate Field Entry
                //===============================================

                if (field == null)
                {
                    return BadRequest(
                        "Model field configuration contains a null entry.");
                }

                if (string.IsNullOrWhiteSpace(field.Name))
                {
                    return BadRequest(
                        "Every configured model field must have a name.");
                }

                //===============================================
                // Validate Operation
                //===============================================

                var operation =
                    field.Operation?.Trim() ?? string.Empty;

                if (!allowedOperations.Contains(operation))
                {
                    return BadRequest(
                        $"Unsupported model field operation: '{field.Operation}'.");
                }

                //===============================================
                // Validate Added Field Type
                //===============================================

                if (
                    string.Equals(
                        operation,
                        "Add",
                        StringComparison.OrdinalIgnoreCase) &&
                    string.IsNullOrWhiteSpace(field.Type)
                )
                {
                    return BadRequest(
                        $"A type is required for added field '{field.Name}'.");
                }

                //===============================================
                // Validate Source Field Configuration
                //===============================================

                if (
                    !string.Equals(
                        operation,
                        "Add",
                        StringComparison.OrdinalIgnoreCase)
                )
                {
                    var sourceField =
                        string.IsNullOrWhiteSpace(field.SourceField)
                            ? field.Name.Trim()
                            : field.SourceField.Trim();

                    var fieldKey =
                        $"{field.InputModel?.Trim()}|{sourceField}";

                    if (!configuredFieldKeys.Add(fieldKey))
                    {
                        return BadRequest(
                            $"Duplicate configuration found for source field '{sourceField}'.");
                    }
                }
            }
        }

        //=======================================================
        // Execute Clone
        //=======================================================

        try
        {
            await _repository.CloneAsync(
                id,
                configuration);

            //===================================================
            // Read Updated Status
            //===================================================

            var updatedRecord =
                await _repository.GetByIdAsync(id);

            return Ok(new
            {
                Id = id,
                Status = updatedRecord?.Status ?? "Unknown",
                Message = updatedRecord?.LastCloningResult
                    ?? "Cloning operation finished."
            });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new
            {
                Id = id,
                Status = "Failed",
                Message = exception.Message
            });
        }
        catch (System.IO.IOException exception)
        {
            return StatusCode(
                500,
                new
                {
                    Id = id,
                    Status = "Failed",
                    Message = "A file operation failed during cloning.",
                    Detail = exception.Message
                });
        }
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
        //=======================================================
        // Validate Record
        //=======================================================

        var pageCloning =
            await _repository.GetByIdAsync(id);

        if (pageCloning == null)
        {
            return NotFound();
        }

        //=======================================================
        // Generate Package
        //=======================================================

        try
        {
            await _repository.GeneratePackageAsync(id);

            return NoContent();
        }
        catch (NotSupportedException exception)
        {
            return StatusCode(
                501,
                new
                {
                    Message = exception.Message
                });
        }
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
        //=======================================================
        // Validate Record
        //=======================================================

        var pageCloning =
            await _repository.GetByIdAsync(id);

        if (pageCloning == null)
        {
            return NotFound();
        }

        //=======================================================
        // Restore Package
        //=======================================================

        try
        {
            await _repository.RestorePackageAsync(id);

            return NoContent();
        }
        catch (NotSupportedException exception)
        {
            return StatusCode(
                501,
                new
                {
                    Message = exception.Message
                });
        }
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
            await _repository.GetByIdAsync(id);

        if (pageCloning == null)
        {
            return NotFound();
        }

        await _repository.DeleteAsync(id);

        return NoContent();
    }


    //===========================================================
    // Restore Deleted Records
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
            Id = pageCloning.Id,

            CloneFromId = pageCloning.CloneFromId,
            CloneFromCode = pageCloning.CloneFromCode,
            CloneFromName = pageCloning.CloneFromName,

            CloneToId = pageCloning.CloneToId,
            CloneToCode = pageCloning.CloneToCode,
            CloneToName = pageCloning.CloneToName,

            CloningType = pageCloning.CloningType,
            NumberOfFiles = pageCloning.NumberOfFiles,
            Operation = pageCloning.Operation,

            Status = pageCloning.Status,
            Remarks = pageCloning.Remarks,

            LastClonedBy = pageCloning.LastClonedBy,
            LastClonedDate = pageCloning.LastClonedDate,
            LastCloningResult = pageCloning.LastCloningResult,

            IsActive = pageCloning.IsActive,

            CreatedBy = pageCloning.CreatedBy,
            CreatedDate = pageCloning.CreatedDate,

            ModifiedBy = pageCloning.ModifiedBy,
            ModifiedDate = pageCloning.ModifiedDate,

            DeletedBy = pageCloning.DeletedBy,
            DeletedDate = pageCloning.DeletedDate,

            IsDeleted = pageCloning.IsDeleted
        };
    }
}