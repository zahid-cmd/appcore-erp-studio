using AppCore.Infrastructure.Platform.FrontendRebuildEngine;

using Microsoft.AspNetCore.Mvc;

namespace AppCore.API.Controllers.InfrastructureControl.RebuildEngine;

[ApiController]
[Route("api/infrastructure-control/rebuild-engine/frontend")]
public sealed class FrontendRebuildController : ControllerBase
{
    private readonly IFrontendRebuildEngine _frontendRebuildEngine;

    public FrontendRebuildController(
        IFrontendRebuildEngine frontendRebuildEngine)
    {
        _frontendRebuildEngine = frontendRebuildEngine;
    }

    [HttpPost("rebuild")]
    public async Task<IActionResult> Rebuild(
        CancellationToken cancellationToken)
    {
        await _frontendRebuildEngine.RebuildAsync(
            cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Frontend rebuild completed successfully."
        });
    }
}