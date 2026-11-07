//===============================================================
// Server Management Defaults (next code)
//===============================================================

namespace AppCore.Application.InfrastructureControl.CodeManagement;

public class ServerManagementDefaultsDto
{
    public string Code { get; set; } = string.Empty;

    public int AgentPort { get; set; } = 5099;

    public string[] Environments { get; set; } = { "Production", "Staging" };
}
