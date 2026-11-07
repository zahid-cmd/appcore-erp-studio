//===============================================================
// Start a rollback (switch the server back to a kept release)
//===============================================================

namespace AppCore.Application.InfrastructureControl.CodeManagement;

public class StartRollbackDto
{
    // Server Management public id
    public Guid ServerPublicId { get; set; }

    // R-0003
    public string Release { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;
}
