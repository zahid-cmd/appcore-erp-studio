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

    // Draft : edit / delete (false = not a draft)
    Task<bool>
        UpdateDraftAsync(global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.DeploymentCenter entity);

    Task<bool>
        DeleteDraftAsync(long id);

    // Draft -> Running (history row)
    Task
        StartAsync(global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.DeploymentCenter entity);

    // the last successful deployment on a server (null = none)
    Task<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.DeploymentCenter?>
        GetLastSucceededAsync(long serverManagementId);

    // progress / result (no history row)
    Task
        SaveProgressAsync(global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.DeploymentCenter entity);

    // jobs left "Running" when the API stopped -> Failed
    Task<int>
        CloseInterruptedAsync();

    // the newest version given on a server ('' = none yet)
    Task<string>
        GetLastVersionAsync(long serverManagementId);

    // successful deployments with a version, newest first
    Task<IReadOnlyList<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.DeploymentCenter>>
        GetVersionHistoryAsync();
}
