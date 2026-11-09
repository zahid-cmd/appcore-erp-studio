//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Api.Extensions;

using AppCore.Application.InfrastructureControl.CodeManagement;

using AppCore.Domain.Entities.InfrastructureControl.CodeManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.InfrastructureControl.CodeManagement;


//===============================================================
// Deployment Center
//
//   GET    /                             deployments (?server=publicId)
//   GET    /defaults                     servers to choose from
//   GET    /capabilities                 can this copy deploy?
//   GET    /draft-defaults?server=       next release, commit, notes
//   GET    /preflight                    git check before Deploy
//   GET    /{publicId}                   one deployment (with log)
//   GET    /{publicId}/progress          live progress (polled)
//   POST   /                             new draft      -> { PublicId }
//   PUT    /{publicId}                   edit a draft
//   DELETE /{publicId}                   delete a draft
//   POST   /{publicId}/deploy            run a draft
//   GET    /servers/{publicId}/releases  releases kept on a server
//   POST   /rollback                     start          -> { PublicId }
//
// A deployment is prepared first (Draft), then run from its
// record. Only a copy of the API next to the source code (the
// development PC) can deploy; on a live server the Deployment
// Center is read-only (list, records, logs). The work runs in DeploymentRunner (this PC builds, the
// server's Deploy Agent installs).
//===============================================================

[ApiController]

[Route("api/infrastructure-control/code-management/deployment-center")]

public class DeploymentCenterController
    : ControllerBase
{
    private readonly IDeploymentCenterRepository _repository;

    private readonly IServerManagementRepository _servers;

    private readonly ISourceControlRepository _sourceControl;

    private readonly IServiceScopeFactory _scopes;

    private readonly IConfiguration _configuration;

    public DeploymentCenterController
    (
        IDeploymentCenterRepository repository,
        IServerManagementRepository servers,
        ISourceControlRepository sourceControl,
        IServiceScopeFactory scopes,
        IConfiguration configuration
    )
    {
        _repository = repository;
        _servers = servers;
        _sourceControl = sourceControl;
        _scopes = scopes;
        _configuration = configuration;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? server)
    {
        await DeploymentRunner.CleanUpOnceAsync(_repository);

        long? serverId = null;

        if (server is not null)
        {
            serverId = await _servers.GetIdByPublicIdAsync(server.Value);

            if (serverId is null)
            {
                return Ok(Array.Empty<DeploymentCenterDto>());
            }
        }

        var rows = await _repository.GetAllAsync(serverId);

        var servers = (await _servers.GetAllAsync())
            .ToDictionary(x => x.Id, x => x.PublicId);

        return Ok(rows
            .Select(x =>
            {
                var dto = ToDto(x, withLog: false);

                dto.ServerPublicId = servers.TryGetValue(x.ServerManagementId, out var id) ? id : null;

                return dto;
            })
            .ToList());
    }


    //===========================================================
    // Defaults : servers
    //===========================================================

    [HttpGet("defaults")]
    public async Task<IActionResult> GetDefaults()
    {
        var servers = await _servers.GetAllAsync();

        return Ok(servers
            .Where(x => x.Status && x.IsActive && !x.IsDeleted)
            .OrderBy(x => x.Code)
            .Select(x => new DeploymentServerOptionDto
            {
                PublicId = x.PublicId,
                Code = x.Code,
                Name = x.Name,
                Environment = x.Environment,
                AppUrl = x.AppUrl,
                LastCheckStatus = x.LastCheckStatus,
                CurrentRelease = x.CurrentRelease
            })
            .ToList());
    }


    //===========================================================
    // Pre-flight
    //===========================================================

    [HttpGet("preflight")]
    public async Task<IActionResult> Preflight()
    {
        var source = await SourceAsync();

        if (source is null)
        {
            return Ok(new DeploymentPreflightDto
            {
                Problems = { "No active repository in Source Control. Add one first." }
            });
        }

        var result = await DeploymentRunner.PreflightAsync(source.Value.Path, source.Value.Branch, fetch: true);

        result.NextRelease = await _repository.GetNextReleaseAsync();

        return Ok(result);
    }


    //===========================================================
    // Capabilities : can this copy of the API deploy?
    //===========================================================

    [HttpGet("capabilities")]
    public async Task<IActionResult> GetCapabilities()
    {
        var reason = await NotHereAsync();

        return Ok(new
        {
            CanDeploy = reason is null,
            Reason = reason ?? string.Empty,
            Machine = Environment.MachineName
        });
    }

    // null = this copy can build and deploy; else why not
    private async Task<string?> NotHereAsync()
    {
        var source = await SourceAsync();

        if (source is null)
        {
            return "No active repository in Source Control.";
        }

        var api = Path.Combine(source.Value.Path, "Backend_Studio", "AppCore.API", "AppCore.API.csproj");

        if (!Directory.Exists(source.Value.Path) || !System.IO.File.Exists(api))
        {
            return $"Deployments are made from the development PC (the source code is not on {Environment.MachineName}). This page is read-only here.";
        }

        return null;
    }


    //===========================================================
    // Draft defaults : what the next release would contain
    //===========================================================

    [HttpGet("draft-defaults")]
    public async Task<IActionResult> GetDraftDefaults([FromQuery] Guid? server)
    {
        var result = new DeploymentDraftDefaultsDto
        {
            NextRelease = await _repository.GetNextReleaseAsync()
        };

        var source = await SourceAsync();

        if (source is null)
        {
            result.Problems.Add("No active repository in Source Control. Add one first.");
            return Ok(result);
        }

        var check = await DeploymentRunner.PreflightAsync(source.Value.Path, source.Value.Branch, fetch: true);

        result.Branch = check.Branch;
        result.CommitHash = check.CommitHash;
        result.CommitMessage = check.CommitMessage;
        result.Ahead = check.Ahead;
        result.Behind = check.Behind;
        result.LocalChanges = check.LocalChanges;
        result.Problems = check.Problems
            .Where(p => !p.StartsWith("A deployment or rollback is running"))
            .ToList();

        long? serverId = server is null ? null : await _servers.GetIdByPublicIdAsync(server.Value);

        var last = serverId is null ? null : await _repository.GetLastSucceededAsync(serverId.Value);

        result.LastRelease = last?.Code ?? string.Empty;
        result.LastCommit = last?.CommitHash ?? string.Empty;

        var (notes, count) = await DeploymentRunner.ReleaseNotesAsync(source.Value.Path, source.Value.Branch, result.LastCommit);

        result.ReleaseNotes = notes;
        result.NewCommits = count;

        // version choices + what changed
        result.LastVersion = serverId is null ? string.Empty : await _repository.GetLastVersionAsync(serverId.Value);
        result.NextFix = DeploymentRunner.NextVersion(result.LastVersion, "Fix");
        result.NextFeature = DeploymentRunner.NextVersion(result.LastVersion, "Feature");
        result.NextMajor = DeploymentRunner.NextVersion(result.LastVersion, "Major");
        result.Analysis = await DeploymentRunner.AnalyseAsync(source.Value.Path, source.Value.Branch, result.LastCommit);

        return Ok(result);
    }


    //===========================================================
    // Analyse changes : since the last successful deployment on
    // the server (the "Analyse changes" button)
    //===========================================================

    [HttpGet("analyse")]
    public async Task<IActionResult> Analyse([FromQuery] Guid? server)
    {
        var source = await SourceAsync();

        if (source is null)
        {
            return BadRequest(new { message = "No active repository in Source Control. Add one first." });
        }

        // fetch first, so origin/<branch> is up to date
        await DeploymentRunner.PreflightAsync(source.Value.Path, source.Value.Branch, fetch: true);

        long? serverId = server is null ? null : await _servers.GetIdByPublicIdAsync(server.Value);

        var last = serverId is null ? null : await _repository.GetLastSucceededAsync(serverId.Value);

        return Ok(await DeploymentRunner.AnalyseAsync(source.Value.Path, source.Value.Branch, last?.CommitHash ?? string.Empty));
    }


    //===========================================================
    // Get By Public Id (with log)
    //===========================================================

    [HttpGet("{publicId:guid}")]
    public async Task<IActionResult> GetById(Guid publicId)
    {
        var entity = await FindAsync(publicId);

        if (entity is null)
        {
            return NotFound();
        }

        var dto = ToDto(entity, withLog: true);

        var server = await _servers.GetByIdAsync(entity.ServerManagementId);

        dto.ServerPublicId = server?.PublicId;

        // a running job: the live log is newer than the saved one
        var live = DeploymentRunner.GetLive(entity.Id, 3000);

        if (live is not null)
        {
            dto.DeployStatus = live.DeployStatus;
            dto.Step = live.Step;
            dto.Percent = live.Percent;
            dto.Log = string.Join("\n", live.Log);
        }

        return Ok(dto);
    }


    //===========================================================
    // Progress
    //===========================================================

    [HttpGet("{publicId:guid}/progress")]
    public async Task<IActionResult> GetProgress(Guid publicId, [FromQuery] int lines = 200)
    {
        long? id = await _repository.GetIdByPublicIdAsync(publicId);

        if (id is null)
        {
            return NotFound();
        }

        var live = DeploymentRunner.GetLive(id.Value, Math.Clamp(lines, 10, 3000));

        if (live is not null)
        {
            return Ok(live);
        }

        // not in memory (API restarted / old job): from the record
        var entity = await _repository.GetByIdAsync(id.Value);

        if (entity is null)
        {
            return NotFound();
        }

        var all = (entity.Log ?? string.Empty).Split('\n');

        return Ok(new DeploymentProgressDto
        {
            PublicId = entity.PublicId,
            Code = entity.Code,
            Kind = entity.Kind,
            DeployStatus = entity.DeployStatus,
            Step = entity.Step,
            Percent = entity.Percent,
            Finished = entity.DeployStatus != "Running",
            ElapsedSeconds = entity.DurationSeconds,
            Log = all.Skip(Math.Max(0, all.Length - lines)).ToList()
        });
    }


    //===========================================================
    // New draft
    //===========================================================

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveDeploymentDraftDto dto)
    {
        var notHere = await NotHereAsync();

        if (notHere is not null)
        {
            return BadRequest(new { message = notHere });
        }

        var server = await ServerOnlyAsync(dto.ServerPublicId);

        if (server is null)
        {
            return BadRequest(new { message = "Choose a server (Server Management)." });
        }

        var source = await SourceAsync();

        if (source is null)
        {
            return BadRequest(new { message = "No active repository in Source Control. Add one first." });
        }

        var check = await DeploymentRunner.PreflightAsync(source.Value.Path, source.Value.Branch, fetch: false);

        var record = new DeploymentCenter
        {
            Code = await _repository.GetNextReleaseAsync(),
            Kind = "Deploy",
            DeployStatus = "Draft",
            Step = "Draft : not deployed yet",
            ServerManagementId = server.Id,
            ServerName = server.Name,
            Branch = source.Value.Branch,
            CommitHash = check.CommitHash,
            CommitMessage = check.CommitMessage,
            ReleaseNotes = (dto.ReleaseNotes ?? string.Empty).Trim(),
            ChangeType = dto.ChangeType ?? "Feature",
            WhatsNew = (dto.WhatsNew ?? string.Empty).Trim(),
            Remarks = (dto.Remarks ?? string.Empty).Trim(),
            PerformedByName = UserName()
        };

        record.Name = string.IsNullOrWhiteSpace(dto.Name)
            ? $"{record.Code}: {check.CommitMessage}"
            : dto.Name.Trim();

        await _repository.CreateAsync(record);

        return Ok(new { record.Id, record.PublicId, record.Code });
    }


    //===========================================================
    // Edit a draft
    //===========================================================

    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(Guid publicId, [FromBody] SaveDeploymentDraftDto dto)
    {
        var notHere = await NotHereAsync();

        if (notHere is not null)
        {
            return BadRequest(new { message = notHere });
        }

        var entity = await FindAsync(publicId);

        if (entity is null)
        {
            return NotFound();
        }

        if (entity.DeployStatus != "Draft")
        {
            return BadRequest(new { message = $"{entity.Code} is {entity.DeployStatus}: only a draft can be changed." });
        }

        var server = await ServerOnlyAsync(dto.ServerPublicId);

        if (server is null)
        {
            return BadRequest(new { message = "Choose a server (Server Management)." });
        }

        entity.ServerManagementId = server.Id;
        entity.ServerName = server.Name;
        entity.Name = string.IsNullOrWhiteSpace(dto.Name) ? entity.Name : dto.Name.Trim();
        entity.ReleaseNotes = (dto.ReleaseNotes ?? string.Empty).Trim();
        entity.ChangeType = dto.ChangeType ?? "Feature";
        entity.WhatsNew = (dto.WhatsNew ?? string.Empty).Trim();
        entity.Remarks = (dto.Remarks ?? string.Empty).Trim();

        if (dto.UpdateCommit)
        {
            var source = await SourceAsync();

            if (source is not null)
            {
                var check = await DeploymentRunner.PreflightAsync(source.Value.Path, source.Value.Branch, fetch: true);

                entity.Branch = source.Value.Branch;
                entity.CommitHash = check.CommitHash;
                entity.CommitMessage = check.CommitMessage;
            }
        }

        return await _repository.UpdateDraftAsync(entity)
            ? NoContent()
            : BadRequest(new { message = "Only a draft can be changed." });
    }


    //===========================================================
    // Delete a draft
    //===========================================================

    [HttpDelete("{publicId:guid}")]
    public async Task<IActionResult> Delete(Guid publicId)
    {
        var notHere = await NotHereAsync();

        if (notHere is not null)
        {
            return BadRequest(new { message = notHere });
        }

        long? id = await _repository.GetIdByPublicIdAsync(publicId);

        if (id is null)
        {
            return NotFound();
        }

        return await _repository.DeleteDraftAsync(id.Value)
            ? NoContent()
            : BadRequest(new { message = "Only a draft can be deleted. Deployed records stay as history." });
    }


    //===========================================================
    // Deploy a draft
    //===========================================================

    [HttpPost("{publicId:guid}/deploy")]
    public async Task<IActionResult> Deploy(Guid publicId)
    {
        var notHere = await NotHereAsync();

        if (notHere is not null)
        {
            return BadRequest(new { message = notHere });
        }

        await DeploymentRunner.CleanUpOnceAsync(_repository);

        var entity = await FindAsync(publicId);

        if (entity is null)
        {
            return NotFound();
        }

        if (entity.DeployStatus != "Draft")
        {
            return BadRequest(new { message = $"{entity.Code} is {entity.DeployStatus}. Make a new deployment to deploy again." });
        }

        var server = await _servers.GetByIdAsync(entity.ServerManagementId);

        if (server is null || server.IsDeleted)
        {
            return BadRequest(new { message = "The server of this draft no longer exists. Edit the draft and choose a server." });
        }

        var (checkedServer, token, problem) = await ServerAsync(server.PublicId);

        if (problem is not null)
        {
            return BadRequest(new { message = problem });
        }

        var source = await SourceAsync();

        if (source is null)
        {
            return BadRequest(new { message = "No active repository in Source Control. Add one first." });
        }

        // the version is fixed now : last successful version on
        // this server + the change type of the draft
        var lastVersion = await _repository.GetLastVersionAsync(entity.ServerManagementId);

        entity.Version = DeploymentRunner.NextVersion(lastVersion, entity.ChangeType);

        var (record, error) = await DeploymentRunner.StartDeploymentAsync(
            _scopes,
            _repository,
            entity,
            checkedServer!,
            token!,
            source.Value.Path,
            source.Value.Branch,
            UserName());

        return record is null
            ? Conflict(new { message = error })
            : Ok(new { record.Id, record.PublicId, record.Code });
    }


    //===========================================================
    // Releases on a server
    //===========================================================

    [HttpGet("servers/{serverPublicId:guid}/releases")]
    public async Task<IActionResult> GetReleases(Guid serverPublicId)
    {
        var (server, token, problem) = await ServerAsync(serverPublicId);

        if (problem is not null)
        {
            return BadRequest(new { message = problem });
        }

        try
        {
            var client = new DeployAgentClient(server!.HostAddress, server.AgentPort, token!);

            var (ok, statusCode, body) = await client.GetAsync("/agent/releases", TimeSpan.FromSeconds(30));

            if (!ok)
            {
                return BadRequest(new { message = $"The server answered {statusCode}: {DeployAgentClient.MessageOf(body) ?? body}" });
            }

            var releases =
                System.Text.Json.JsonSerializer.Deserialize<List<ServerReleaseDto>>(
                    ReleasesArray(body),
                    new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web))
                ?? new List<ServerReleaseDto>();

            return Ok(releases.OrderByDescending(x => x.Release).ToList());
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Cannot reach {server!.Name}: {ex.Message}" });
        }
    }


    //===========================================================
    // Rollback
    //===========================================================

    [HttpPost("rollback")]
    public async Task<IActionResult> Rollback([FromBody] StartRollbackDto dto)
    {
        var notHere = await NotHereAsync();

        if (notHere is not null)
        {
            return BadRequest(new { message = notHere });
        }

        await DeploymentRunner.CleanUpOnceAsync(_repository);

        var release = (dto.Release ?? string.Empty).Trim();

        if (!System.Text.RegularExpressions.Regex.IsMatch(release, @"^R-\d{4,}$"))
        {
            return BadRequest(new { message = "Choose a release (R-0001 ...)." });
        }

        var (server, token, problem) = await ServerAsync(dto.ServerPublicId);

        if (problem is not null)
        {
            return BadRequest(new { message = problem });
        }

        var (record, error) = await DeploymentRunner.StartRollbackAsync(
            _scopes,
            _repository,
            server!,
            token!,
            release,
            UserName(),
            (dto.Remarks ?? string.Empty).Trim());

        return record is null
            ? Conflict(new { message = error })
            : Ok(new { record.Id, record.PublicId, record.Code });
    }


    //===========================================================
    // Helpers
    //===========================================================

    private async Task<DeploymentCenter?> FindAsync(Guid publicId)
    {
        long? id = await _repository.GetIdByPublicIdAsync(publicId);

        return id is null
            ? null
            : await _repository.GetByIdAsync(id.Value);
    }

    private async Task<ServerManagement?> ServerOnlyAsync(Guid publicId)
    {
        long? id = await _servers.GetIdByPublicIdAsync(publicId);

        var server = id is null ? null : await _servers.GetByIdAsync(id.Value);

        return server is null || server.IsDeleted ? null : server;
    }

    private async Task<(ServerManagement? Server, string? Token, string? Problem)> ServerAsync(Guid publicId)
    {
        long? id = await _servers.GetIdByPublicIdAsync(publicId);

        var server = id is null ? null : await _servers.GetByIdAsync(id.Value);

        if (server is null || server.IsDeleted)
        {
            return (null, null, "Choose a server (Server Management).");
        }

        if (!server.Status)
        {
            return (null, null, $"{server.Name} is inactive in Server Management.");
        }

        var token = AgentTokenProtector.Unprotect(server.AgentToken, _configuration);

        if (string.IsNullOrEmpty(token))
        {
            return (null, null, $"{server.Name} has no readable agent token. Open it in Server Management, enter the token and save.");
        }

        return (server, token, null);
    }

    private async Task<(string Path, string Branch)?> SourceAsync()
    {
        var all = await _sourceControl.GetAllAsync();

        var source = all
            .Where(x => x.IsActive && !x.IsDeleted && !string.IsNullOrWhiteSpace(x.RepositoryPath))
            .OrderBy(x => x.SourceControlId)
            .FirstOrDefault();

        if (source is null)
        {
            return null;
        }

        var branch = string.IsNullOrWhiteSpace(source.DefaultBranch) ? "main" : source.DefaultBranch.Trim();

        return (source.RepositoryPath.Trim(), branch);
    }

    private string UserName()
    {
        try
        {
            var name = this.CurrentUserName();

            return string.IsNullOrWhiteSpace(name) ? "System" : name;
        }
        catch
        {
            return "System";
        }
    }

    // the agent may answer [ ... ] or { "releases": [ ... ] }
    private static string ReleasesArray(string body)
    {
        using var doc = System.Text.Json.JsonDocument.Parse(body);

        if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            return body;
        }

        return doc.RootElement.TryGetProperty("releases", out var list)
            ? list.GetRawText()
            : "[]";
    }

    private static DeploymentCenterDto ToDto(DeploymentCenter x, bool withLog) => new()
    {
        Id = x.Id,
        PublicId = x.PublicId,
        Code = x.Code,
        Name = x.Name,
        ServerManagementId = x.ServerManagementId,
        ServerName = x.ServerName,
        Kind = x.Kind,
        DeployStatus = x.DeployStatus,
        Step = x.Step,
        Percent = x.Percent,
        Branch = x.Branch,
        CommitHash = x.CommitHash,
        CommitMessage = x.CommitMessage,
        ReleaseNotes = x.ReleaseNotes,
        Version = x.Version,
        ChangeType = x.ChangeType,
        WhatsNew = x.WhatsNew,
        BackupFile = x.BackupFile,
        PreviousRelease = x.PreviousRelease,
        PackageMb = x.PackageMb,
        StartedDate = x.StartedDate,
        FinishedDate = x.FinishedDate,
        DurationSeconds = x.DurationSeconds,
        PerformedByName = x.PerformedByName,
        Remarks = x.Remarks,
        Log = withLog ? x.Log : null
    };
}
