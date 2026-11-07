//===============================================================
// Start a deployment
//===============================================================

namespace AppCore.Application.InfrastructureControl.CodeManagement;

public class StartDeploymentDto
{
    // Server Management public id
    public Guid ServerPublicId { get; set; }

    public string Remarks { get; set; } = string.Empty;
}
