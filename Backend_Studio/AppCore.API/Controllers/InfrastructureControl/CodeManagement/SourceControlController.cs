//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InfrastructureControl.CodeManagement;

using AppCore.Domain.Entities.InfrastructureControl.CodeManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.CodeManagement;


//===============================================================
// SourceControlController
//===============================================================

[ApiController]

[Route("api/infrastructure-control/code-management/source-control")]

public class SourceControlController
    : ControllerBase
{
    //===========================================================
    // Repository
    //===========================================================

    private readonly ISourceControlRepository
        _repository;



    //===========================================================
    // Constructor
    //===========================================================

    public SourceControlController
    (
        ISourceControlRepository repository
    )
    {
        _repository =
            repository;
    }



    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<IActionResult>
        GetAll()
    {
        try
        {
            var entities =
                await _repository
                    .GetAllAsync();


            return Ok(
                entities
            );
        }
        catch
        (
            Exception ex
        )
        {
            return StatusCode(
                500,
                new
                {
                    message =
                        "Failed to load Source Control repositories.",

                    detail =
                        ex.Message
                }
            );
        }
    }



    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<IActionResult>
        GetById
    (
        long id
    )
    {
        try
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
                return NotFound(
                    new
                    {
                        message =
                            "Source Control repository not found."
                    }
                );
            }


            return Ok(
                entity
            );
        }
        catch
        (
            Exception ex
        )
        {
            return StatusCode(
                500,
                new
                {
                    message =
                        "Failed to load Source Control repository.",

                    detail =
                        ex.Message
                }
            );
        }
    }



    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<IActionResult>
        Create
    (
        [FromBody]
        CreateSourceControlDto dto
    )
    {
        try
        {
            if
            (
                dto is null
            )
            {
                return BadRequest(
                    new
                    {
                        message =
                            "Source Control data is required."
                    }
                );
            }


            var entity =
                new SourceControl
                {
                    RepositoryCode =
                        dto.RepositoryCode,

                    RepositoryName =
                        dto.RepositoryName,

                    GitRemoteUrl =
                        dto.GitRemoteUrl,

                    DefaultBranch =
                        dto.DefaultBranch,

                    RepositoryPath =
                        dto.RepositoryPath,

                    Remarks =
                        dto.Remarks,

                    IsActive =
                        dto.IsActive
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
        catch
        (
            Exception ex
        )
        {
            return StatusCode(
                500,
                new
                {
                    message =
                        "Failed to create Source Control repository.",

                    detail =
                        ex.Message
                }
            );
        }
    }



    //===========================================================
    // Update
    //===========================================================

    [HttpPut("{id:long}")]

    public async Task<IActionResult>
        Update
    (
        long id,

        [FromBody]
        UpdateSourceControlDto dto
    )
    {
        try
        {
            if
            (
                dto is null
            )
            {
                return BadRequest(
                    new
                    {
                        message =
                            "Source Control data is required."
                    }
                );
            }


            if
            (
                id != dto.SourceControlId
            )
            {
                return BadRequest(
                    new
                    {
                        message =
                            "Repository identifier does not match."
                    }
                );
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
                return NotFound(
                    new
                    {
                        message =
                            "Source Control repository not found."
                    }
                );
            }


            entity.RepositoryCode =
                dto.RepositoryCode;


            entity.RepositoryName =
                dto.RepositoryName;


            entity.GitRemoteUrl =
                dto.GitRemoteUrl;


            entity.DefaultBranch =
                dto.DefaultBranch;


            entity.RepositoryPath =
                dto.RepositoryPath;


            entity.Remarks =
                dto.Remarks;


            entity.IsActive =
                dto.IsActive;


            await _repository
                .UpdateAsync(
                    entity
                );


            return NoContent();
        }
        catch
        (
            Exception ex
        )
        {
            return StatusCode(
                500,
                new
                {
                    message =
                        "Failed to update Source Control repository.",

                    detail =
                        ex.Message
                }
            );
        }
    }



    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult>
        Delete
    (
        long id
    )
    {
        try
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
                return NotFound(
                    new
                    {
                        message =
                            "Source Control repository not found."
                    }
                );
            }


            await _repository
                .DeleteAsync(
                    id
                );


            return NoContent();
        }
        catch
        (
            Exception ex
        )
        {
            return StatusCode(
                500,
                new
                {
                    message =
                        "Failed to delete Source Control repository.",

                    detail =
                        ex.Message
                }
            );
        }
    }



    //===========================================================
    // Restore
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult>
        Restore()
    {
        try
        {
            await _repository
                .RestoreAsync();


            return NoContent();
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return NotFound(
                new
                {
                    message =
                        ex.Message
                }
            );
        }
        catch
        (
            Exception ex
        )
        {
            return StatusCode(
                500,
                new
                {
                    message =
                        "Failed to restore Source Control repository.",

                    detail =
                        ex.Message
                }
            );
        }
    }



    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<IActionResult>
        GetHistory()
    {
        try
        {
            var history =
                await _repository
                    .GetHistoryAsync();


            return Ok(
                history
            );
        }
        catch
        (
            Exception ex
        )
        {
            return StatusCode(
                500,
                new
                {
                    message =
                        "Failed to load Source Control history.",

                    detail =
                        ex.Message
                }
            );
        }
    }



    //===========================================================
    // Get Entity History
    //===========================================================

    [HttpGet("{id:long}/history")]

    public async Task<IActionResult>
        GetEntityHistory
    (
        long id
    )
    {
        try
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
                return NotFound(
                    new
                    {
                        message =
                            "Source Control repository not found."
                    }
                );
            }


            var history =
                await _repository
                    .GetEntityHistoryAsync(
                        id
                    );


            return Ok(
                history
            );
        }
        catch
        (
            Exception ex
        )
        {
            return StatusCode(
                500,
                new
                {
                    message =
                        "Failed to load repository history.",

                    detail =
                        ex.Message
                }
            );
        }
    }



    //===========================================================
    // Get Git Status
    //===========================================================

    [HttpGet("{id:long}/status")]

    public async Task<IActionResult>
        GetStatus
    (
        long id
    )
    {
        try
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
                return NotFound(
                    new
                    {
                        message =
                            "Source Control repository not found."
                    }
                );
            }


            var status =
                await _repository
                    .GetStatusAsync(
                        id
                    );


            return Ok(
                status
            );
        }
        catch
        (
            Exception ex
        )
        {
            return StatusCode(
                500,
                new
                {
                    message =
                        "Failed to read Git repository status.",

                    detail =
                        ex.Message
                }
            );
        }
    }



    //===========================================================
    // Pull Latest
    //===========================================================

    [HttpPost("{id:long}/pull")]

    public async Task<IActionResult>
        Pull
    (
        long id
    )
    {
        try
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
                return NotFound(
                    new
                    {
                        message =
                            "Source Control repository not found."
                    }
                );
            }


            var result =
                await _repository
                    .PullAsync(
                        id
                    );


            if
            (
                !result.Success
            )
            {
                return BadRequest(
                    result
                );
            }


            return Ok(
                result
            );
        }
        catch
        (
            Exception ex
        )
        {
            return StatusCode(
                500,
                new
                {
                    success =
                        false,

                    message =
                        "Git Pull operation failed.",

                    output =
                        ex.Message
                }
            );
        }
    }



    //===========================================================
    // Commit Changes
    //===========================================================

    [HttpPost("{id:long}/commit")]

    public async Task<IActionResult>
        Commit
    (
        long id,

        [FromBody]
        GitCommitDto dto
    )
    {
        try
        {
            if
            (
                dto is null
            )
            {
                return BadRequest(
                    new
                    {
                        success =
                            false,

                        message =
                            "Commit data is required."
                    }
                );
            }


            if
            (
                string.IsNullOrWhiteSpace(
                    dto.Message
                )
            )
            {
                return BadRequest(
                    new
                    {
                        success =
                            false,

                        message =
                            "Commit message is required."
                    }
                );
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
                return NotFound(
                    new
                    {
                        success =
                            false,

                        message =
                            "Source Control repository not found."
                    }
                );
            }


            var result =
                await _repository
                    .CommitAsync(
                        id,

                        dto
                    );


            if
            (
                !result.Success
            )
            {
                return BadRequest(
                    result
                );
            }


            return Ok(
                result
            );
        }
        catch
        (
            Exception ex
        )
        {
            return StatusCode(
                500,
                new
                {
                    success =
                        false,

                    message =
                        "Git Commit operation failed.",

                    output =
                        ex.Message
                }
            );
        }
    }



    //===========================================================
    // Push Changes
    //===========================================================

    [HttpPost("{id:long}/push")]

    public async Task<IActionResult>
        Push
    (
        long id
    )
    {
        try
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
                return NotFound(
                    new
                    {
                        message =
                            "Source Control repository not found."
                    }
                );
            }


            var result =
                await _repository
                    .PushAsync(
                        id
                    );


            if
            (
                !result.Success
            )
            {
                return BadRequest(
                    result
                );
            }


            return Ok(
                result
            );
        }
        catch
        (
            Exception ex
        )
        {
            return StatusCode(
                500,
                new
                {
                    success =
                        false,

                    message =
                        "Git Push operation failed.",

                    output =
                        ex.Message
                }
            );
        }
    }



    //===========================================================
    // Full Repository Synchronization
    //===========================================================

    [HttpPost("{id:long}/sync")]

    public async Task<IActionResult>
        Sync
    (
        long id,

        [FromBody]
        GitCommitDto dto
    )
    {
        try
        {
            if
            (
                dto is null
            )
            {
                return BadRequest(
                    new
                    {
                        success =
                            false,

                        message =
                            "Synchronization data is required."
                    }
                );
            }


            if
            (
                string.IsNullOrWhiteSpace(
                    dto.Message
                )
            )
            {
                return BadRequest(
                    new
                    {
                        success =
                            false,

                        message =
                            "Synchronization message is required."
                    }
                );
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
                return NotFound(
                    new
                    {
                        success =
                            false,

                        message =
                            "Source Control repository not found."
                    }
                );
            }


            var result =
                await _repository
                    .SyncAsync(
                        id,

                        dto
                    );


            if
            (
                !result.Success
            )
            {
                return BadRequest(
                    result
                );
            }


            return Ok(
                result
            );
        }
        catch
        (
            Exception ex
        )
        {
            return StatusCode(
                500,
                new
                {
                    success =
                        false,

                    message =
                        "Full repository synchronization failed.",

                    output =
                        ex.Message
                }
            );
        }
    }
}
