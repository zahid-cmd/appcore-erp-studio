//===============================================================
// Version History Controller  (2026-11-09)
//
//   GET /api/platform/versions
//
// Every successful deployment with a version, newest first, with
// its "What's new" lines. Login required (global fallback
// policy); read only. The footer version opens this list.
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InfrastructureControl.CodeManagement;

namespace AppCore.Api.Controllers.Platform;

[ApiController]
[Route("api/platform/versions")]
public class VersionsController : ControllerBase
{
    private readonly IDeploymentCenterRepository _repository;

    public VersionsController
    (
        IDeploymentCenterRepository repository
    )
    {
        _repository =
            repository;
    }

    [HttpGet]
    public async Task<ActionResult<List<AppVersionDto>>> Get()
    {
        var rows =
            await _repository.GetVersionHistoryAsync();

        // one entry per version (the same version can go to more
        // than one server)
        return Ok(rows
            .GroupBy(x => x.Version)
            .Select(g => g.First())
            .Select(x => new AppVersionDto
            {
                Version = x.Version,
                Release = x.Code,
                ChangeType = x.ChangeType,
                Date = x.FinishedDate ?? x.StartedDate,
                WhatsNew = (x.WhatsNew ?? string.Empty)
                    .Split('\n', StringSplitOptions.RemoveEmptyEntries)
                    .Select(line => line.Trim().TrimStart('-', '*').Trim())
                    .Where(line => line.Length > 0)
                    .ToList()
            })
            .ToList());
    }
}
