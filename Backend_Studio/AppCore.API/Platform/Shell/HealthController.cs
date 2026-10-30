//===============================================================
// Health Controller
//
// Public (no login) : the app footer checks it every 30 seconds
// to show Server online / offline and the response time.
// Returns only status flags, nothing about the server itself.
//
//   200 { status: "ok",       database: true  }
//   503 { status: "degraded", database: false }   API up, database not
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using AppCore.Infrastructure.Persistence;


namespace AppCore.Api.Controllers.Platform;


[ApiController]
[Route("api/platform/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _context;


    public HealthController
    (
        AppDbContext context
    )
    {
        _context =
            context;
    }


    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        bool database;

        try
        {
            using CancellationTokenSource timeout =
                new CancellationTokenSource(
                    TimeSpan.FromSeconds(3));

            database =
                await _context.Database.CanConnectAsync(
                    timeout.Token);
        }
        catch
        {
            database = false;
        }

        object body =
            new
            {
                status = database ? "ok" : "degraded",
                database,
                serverTimeUtc = DateTime.UtcNow
            };

        return database
            ? Ok(body)
            : StatusCode(503, body);
    }
}