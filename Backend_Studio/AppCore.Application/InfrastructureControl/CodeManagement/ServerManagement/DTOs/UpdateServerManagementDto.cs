//===============================================================
// Update Server Management
//
// AgentToken empty / null = keep the saved token.
//===============================================================

namespace AppCore.Application.InfrastructureControl.CodeManagement;

public class UpdateServerManagementDto
    : CreateServerManagementDto
{
    public long Id { get; set; }
}
