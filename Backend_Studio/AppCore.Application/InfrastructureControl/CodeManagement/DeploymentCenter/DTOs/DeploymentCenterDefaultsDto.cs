//===============================================================
// Deployment Center defaults : the servers to choose from
//===============================================================

namespace AppCore.Application.InfrastructureControl.CodeManagement;

public class DeploymentServerOptionDto
{
    public Guid PublicId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Environment { get; set; } = string.Empty;

    public string AppUrl { get; set; } = string.Empty;

    public string LastCheckStatus { get; set; } = string.Empty;

    public string CurrentRelease { get; set; } = string.Empty;
}
