//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Platform.ProjectBuilderInterfaces;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Backend Rebuild Controller
//===============================================================

[ApiController]

[Route(
    "api/infrastructure-control/development-management/backend-rebuild"
)]

public class BackendRebuildController
    : ControllerBase
{


    //===========================================================
    // Fields
    //===========================================================

    private readonly IBackendProjectBuilder
        _backendProjectBuilder;



    //===========================================================
    // Constructor
    //===========================================================

    public BackendRebuildController
    (
        IBackendProjectBuilder backendProjectBuilder
    )
    {
        _backendProjectBuilder =
            backendProjectBuilder;
    }



    //===========================================================
    // Rebuild Backend Project
    //===========================================================

    [HttpPost("rebuild")]

    public async Task<ActionResult>
        Rebuild()
    {
        try
        {
            await _backendProjectBuilder
                .RebuildAsync();


            return NoContent();
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

}