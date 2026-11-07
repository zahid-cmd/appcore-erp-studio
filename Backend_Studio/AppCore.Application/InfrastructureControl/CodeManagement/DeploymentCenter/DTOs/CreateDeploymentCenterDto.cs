//===============================================================
// Save a deployment draft (New / Edit)
//===============================================================

namespace AppCore.Application.InfrastructureControl.CodeManagement;

public class SaveDeploymentDraftDto
{
    // Server Management public id
    public Guid ServerPublicId { get; set; }

    // short title, e.g. "Deployment Center popup"
    public string Name { get; set; } = string.Empty;

    public string ReleaseNotes { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // Edit : take the latest pushed commit
    public bool UpdateCommit { get; set; }
}
