//===============================================================
// Backend Rebuild Controller
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Infrastructure.Platform.BackendRebuildEngine;


//===============================================================
// Controller
//===============================================================

namespace AppCore.API.Controllers.InfrastructureControl.RebuildEngine;

[ApiController]

[Route(
    "api/infrastructure-control/development-management/backend-rebuild"
)]

public sealed class BackendRebuildController
    : ControllerBase
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly IBackendRebuildEngine _engine;


    //===========================================================
    // Constructor
    //===========================================================

    public BackendRebuildController(
        IBackendRebuildEngine engine)
    {
        _engine = engine;
    }


    //===========================================================
    // Rebuild
    //===========================================================

    [HttpPost("rebuild")]

    public async Task<IActionResult> Rebuild(
        CancellationToken cancellationToken)
    {
        try
        {
            await _engine.RebuildAsync(
                cancellationToken
            );


            return Ok(
                new
                {
                    success = true,

                    message =
                        "Backend rebuild completed successfully."
                }
            );
        }
        catch (OperationCanceledException)
        {
            return StatusCode(
                StatusCodes.Status499ClientClosedRequest,

                new
                {
                    success = false,

                    message =
                        "Backend rebuild was cancelled."
                }
            );
        }
        catch (Exception ex)
        {
            return StatusCode(
                StatusCodes.Status500InternalServerError,

                new
                {
                    success = false,

                    message =
                        ex.Message
                }
            );
        }
    }

}