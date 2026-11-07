//===============================================================
// Server Management DTOs (what the browser sees)
//
// The agent token is NEVER sent back: HasAgentToken tells the
// page whether one is saved.
//===============================================================

namespace AppCore.Application.InfrastructureControl.CodeManagement;

public class ServerManagementDto
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string HostAddress { get; set; } = string.Empty;

    public int AgentPort { get; set; }

    public bool HasAgentToken { get; set; }

    public string AppUrl { get; set; } = string.Empty;

    public string Environment { get; set; } = "Production";

    public DateTime? LastCheckedDate { get; set; }

    public string LastCheckStatus { get; set; } = string.Empty;

    public string LastCheckMessage { get; set; } = string.Empty;

    public string AgentVersion { get; set; } = string.Empty;

    public string CurrentRelease { get; set; } = string.Empty;

    public bool Status { get; set; }

    public string Remarks { get; set; } = string.Empty;
}


//===============================================================
// Test Connection result (agent /agent/health)
//===============================================================

public class ServerConnectionTestDto
{
    // Online / Offline / Token rejected / Not configured
    public string Status { get; set; } = string.Empty;

    public bool Success { get; set; }

    public string Message { get; set; } = string.Empty;

    public DateTime CheckedDate { get; set; }

    public int ResponseMs { get; set; }

    public string AgentVersion { get; set; } = string.Empty;

    public string Machine { get; set; } = string.Empty;

    public double? DiskFreeGb { get; set; }

    public string BaseFolder { get; set; } = string.Empty;

    public string ServiceName { get; set; } = string.Empty;

    public string ServiceStatus { get; set; } = string.Empty;

    public string AppUrls { get; set; } = string.Empty;

    public string CurrentRelease { get; set; } = string.Empty;

    public int KeepReleases { get; set; }

    public bool BackupBeforeDeploy { get; set; }

    public bool PgDumpFound { get; set; }

    public bool Busy { get; set; }
}
