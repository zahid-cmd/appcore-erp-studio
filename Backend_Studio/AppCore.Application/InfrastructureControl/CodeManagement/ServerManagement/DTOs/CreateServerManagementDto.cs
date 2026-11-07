//===============================================================
// Create Server Management
//===============================================================

namespace AppCore.Application.InfrastructureControl.CodeManagement;

public class CreateServerManagementDto
{
    public string Name { get; set; } = string.Empty;

    public string HostAddress { get; set; } = string.Empty;

    public int AgentPort { get; set; } = 5099;

    // plain text from the form; the API encrypts it
    public string? AgentToken { get; set; }

    public string AppUrl { get; set; } = string.Empty;

    public string Environment { get; set; } = "Production";

    public bool Status { get; set; } = true;

    public string Remarks { get; set; } = string.Empty;
}
