//===============================================================
// Server Management
//
// A live server the Deployment Center deploys to. The server
// runs the AppCore Deploy Agent (Deploy_Agent folder); the API
// talks to it at http://{HostAddress}:{AgentPort} with the
// AgentToken (stored encrypted, never sent to the browser).
//===============================================================

namespace AppCore.Domain.Entities.InfrastructureControl.CodeManagement;

public class ServerManagement
{
    public long Id { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    // SRV-0001 (given by the server)
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    //===========================================================
    // Connection
    //===========================================================

    // Tailscale address or machine name, e.g. 100.117.11.97
    public string HostAddress { get; set; } = string.Empty;

    public int AgentPort { get; set; } = 5099;

    // encrypted by the API ("v1:..."); '' = not set
    public string AgentToken { get; set; } = string.Empty;

    // the address users open, e.g. http://100.117.11.97:8080
    public string AppUrl { get; set; } = string.Empty;

    // Production / Staging
    public string Environment { get; set; } = "Production";

    //===========================================================
    // Last "Test Connection"
    //===========================================================

    public DateTime? LastCheckedDate { get; set; }

    // Online / Offline / Token rejected / Not configured
    public string LastCheckStatus { get; set; } = string.Empty;

    public string LastCheckMessage { get; set; } = string.Empty;

    public string AgentVersion { get; set; } = string.Empty;

    public string CurrentRelease { get; set; } = string.Empty;

    //===========================================================
    // Status / Audit
    //===========================================================

    public bool Status { get; set; } = true;

    public string Remarks { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public bool IsDeleted { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
