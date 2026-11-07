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
// Server Management
//
//   GET    /                    all servers
//   GET    /defaults            next code, default port
//   GET    /{publicId}          one server
//   POST   /                    add      -> { Id, PublicId }
//   PUT    /{publicId}          update   (empty token = keep)
//   POST   /{publicId}/test     Test Connection (agent health)
//   DELETE /{publicId}          delete
//   PUT    /restore             restore the last deleted
//   GET    /history             all history
//   GET    /{publicId}/history  one server's history
//
// The agent token is encrypted before it is saved and never
// returned to the browser.
//===============================================================

[ApiController]
[Route("api/infrastructure-control/code-management/server-management")]
public class ServerManagementController
    : ControllerBase
{
    private readonly IServerManagementRepository _repository;

    private readonly IConfiguration _configuration;

    public ServerManagementController
    (
        IServerManagementRepository repository,
        IConfiguration configuration
    )
    {
        _repository = repository;
        _configuration = configuration;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var entities = await _repository.GetAllAsync();

        return Ok(entities.Select(ToDto).ToList());
    }


    //===========================================================
    // Defaults
    //===========================================================

    [HttpGet("defaults")]
    public async Task<IActionResult> GetDefaults()
    {
        return Ok(new ServerManagementDefaultsDto
        {
            Code = await _repository.GetNextCodeAsync()
        });
    }


    //===========================================================
    // Get By Public Id
    //===========================================================

    [HttpGet("{publicId:guid}")]
    public async Task<IActionResult> GetById(Guid publicId)
    {
        var entity = await FindAsync(publicId);

        return entity is null
            ? NotFound()
            : Ok(ToDto(entity));
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateServerManagementDto dto)
    {
        var problem = await ValidateAsync(dto, 0);

        if (problem is not null)
        {
            return BadRequest(new { message = problem });
        }

        var entity = new ServerManagement
        {
            Name = dto.Name.Trim(),
            HostAddress = dto.HostAddress.Trim(),
            AgentPort = dto.AgentPort,
            AgentToken = AgentTokenProtector.Protect((dto.AgentToken ?? string.Empty).Trim(), _configuration),
            AppUrl = NormalizeUrl(dto.AppUrl),
            Environment = NormalizeEnvironment(dto.Environment),
            Status = dto.Status,
            Remarks = (dto.Remarks ?? string.Empty).Trim()
        };

        var id = await _repository.CreateAsync(entity);

        return Ok(new { Id = id, PublicId = entity.PublicId });
    }


    //===========================================================
    // Update (empty token = keep the saved one)
    //===========================================================

    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(Guid publicId, [FromBody] UpdateServerManagementDto dto)
    {
        var entity = await FindAsync(publicId);

        if (entity is null)
        {
            return NotFound();
        }

        // The server decides which row : never the body
        dto.Id = entity.Id;

        var problem = await ValidateAsync(dto, entity.Id);

        if (problem is not null)
        {
            return BadRequest(new { message = problem });
        }

        entity.Name = dto.Name.Trim();
        entity.HostAddress = dto.HostAddress.Trim();
        entity.AgentPort = dto.AgentPort;
        entity.AppUrl = NormalizeUrl(dto.AppUrl);
        entity.Environment = NormalizeEnvironment(dto.Environment);
        entity.Status = dto.Status;
        entity.Remarks = (dto.Remarks ?? string.Empty).Trim();

        if (!string.IsNullOrWhiteSpace(dto.AgentToken))
        {
            entity.AgentToken = AgentTokenProtector.Protect(dto.AgentToken.Trim(), _configuration);
        }

        await _repository.UpdateAsync(entity);

        return NoContent();
    }


    //===========================================================
    // Test Connection
    //===========================================================

    [HttpPost("{publicId:guid}/test")]
    public async Task<IActionResult> TestConnection(Guid publicId)
    {
        var entity = await FindAsync(publicId);

        if (entity is null)
        {
            return NotFound();
        }

        ServerConnectionTestDto result;

        var token = AgentTokenProtector.Unprotect(entity.AgentToken, _configuration);

        if (string.IsNullOrEmpty(token))
        {
            result = new ServerConnectionTestDto
            {
                CheckedDate = DateTime.UtcNow,
                Status = "Not configured",
                Message = token is null
                    ? "The saved agent token cannot be read (the API secret key changed). Enter the token again and save."
                    : "No agent token saved. Enter the token from the server's agent settings and save."
            };
        }
        else
        {
            result = await new DeployAgentClient(entity.HostAddress, entity.AgentPort, token).TestAsync();
        }

        await _repository.SaveCheckResultAsync(entity.Id, result);

        return Ok(result);
    }


    //===========================================================
    // Delete / Restore
    //===========================================================

    [HttpDelete("{publicId:guid}")]
    public async Task<IActionResult> Delete(Guid publicId)
    {
        var entity = await FindAsync(publicId);

        if (entity is null)
        {
            return NotFound();
        }

        await _repository.DeleteAsync(entity.Id);

        return NoContent();
    }

    [HttpPut("restore")]
    public async Task<IActionResult> RestoreLastDeleted()
    {
        return await _repository.RestoreLastDeletedAsync()
            ? NoContent()
            : NotFound(new { message = "There is no deleted server to restore." });
    }


    //===========================================================
    // History
    //===========================================================

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        return Ok(await _repository.GetHistoryAsync());
    }

    [HttpGet("{publicId:guid}/history")]
    public async Task<IActionResult> GetEntityHistory(Guid publicId)
    {
        long? id = await _repository.GetIdByPublicIdAsync(publicId);

        return id is null
            ? NotFound()
            : Ok(await _repository.GetEntityHistoryAsync(id.Value));
    }


    //===========================================================
    // Helpers
    //===========================================================

    private async Task<ServerManagement?> FindAsync(Guid publicId)
    {
        long? id = await _repository.GetIdByPublicIdAsync(publicId);

        return id is null
            ? null
            : await _repository.GetByIdAsync(id.Value);
    }

    private async Task<string?> ValidateAsync(CreateServerManagementDto dto, long exceptId)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return "Name is required.";
        }

        var host = (dto.HostAddress ?? string.Empty).Trim();

        if (host.Length == 0)
        {
            return "Host address is required (the server's Tailscale address, e.g. 100.117.11.97).";
        }

        if (host.Contains("://") || host.Contains('/') || host.Contains(' '))
        {
            return "Host address is only the address or machine name, without http:// or a port.";
        }

        if (dto.AgentPort is < 1 or > 65535)
        {
            return "Agent port must be between 1 and 65535.";
        }

        var url = (dto.AppUrl ?? string.Empty).Trim();

        if (url.Length > 0 && !Uri.TryCreate(url, UriKind.Absolute, out _))
        {
            return "App URL must be a full address, e.g. http://100.117.11.97:8080";
        }

        var duplicate = await _repository.FindDuplicateHostAsync(host, dto.AgentPort, exceptId);

        return duplicate is null
            ? null
            : $"{host}:{dto.AgentPort} is already used by {duplicate}.";
    }

    private static string NormalizeUrl(string? url) =>
        (url ?? string.Empty).Trim().TrimEnd('/');

    private static string NormalizeEnvironment(string? environment) =>
        string.Equals(environment?.Trim(), "Staging", StringComparison.OrdinalIgnoreCase)
            ? "Staging"
            : "Production";

    private static ServerManagementDto ToDto(ServerManagement x) => new()
    {
        Id = x.Id,
        PublicId = x.PublicId,
        Code = x.Code,
        Name = x.Name,
        HostAddress = x.HostAddress,
        AgentPort = x.AgentPort,
        HasAgentToken = !string.IsNullOrEmpty(x.AgentToken),
        AppUrl = x.AppUrl,
        Environment = x.Environment,
        LastCheckedDate = x.LastCheckedDate,
        LastCheckStatus = x.LastCheckStatus,
        LastCheckMessage = x.LastCheckMessage,
        AgentVersion = x.AgentVersion,
        CurrentRelease = x.CurrentRelease,
        Status = x.Status,
        Remarks = x.Remarks
    };
}
