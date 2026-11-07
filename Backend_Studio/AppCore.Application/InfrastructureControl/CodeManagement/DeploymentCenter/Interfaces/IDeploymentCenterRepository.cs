//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.CodeManagement;


//===============================================================
// IDeploymentCenterRepository
//
// Deployment / rollback records. The work itself is done by the
// API (DeploymentRunner) and the server's Deploy Agent.
//===============================================================

public interface IDeploymentCenterRepository
{
    Task<IReadOnlyList<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.DeploymentCenter>>
        GetAllAsync(long? serverManagementId);

    Task<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.DeploymentCenter?>
        GetByIdAsync(long id);

    Task<long?>
        GetIdByPublicIdAsync(Guid publicId);

    // R-0001, R-0002 ... (one sequence for all servers)
    Task<string>
        GetNextReleaseAsync();

    Task<long>
        CreateAsync(global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.DeploymentCenter entity);

    // progress / result (no history row)
    Task
        SaveProgressAsync(global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.DeploymentCenter entity);

    // jobs left "Running" when the API stopped -> Failed
    Task<int>
        CloseInterruptedAsync();
}
