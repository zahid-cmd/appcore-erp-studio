//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.CodeManagement;


//===============================================================
// IServerManagementRepository
//===============================================================

public interface IServerManagementRepository
{
    Task<IReadOnlyList<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement>>
        GetAllAsync();

    Task<global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement?>
        GetByIdAsync(long id);

    // SRV-0001, SRV-0002 ...
    Task<string>
        GetNextCodeAsync();

    // another live server with the same host + port (null = none)
    Task<string?>
        FindDuplicateHostAsync(string hostAddress, int agentPort, long exceptId);

    Task<long>
        CreateAsync(global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement entity);

    Task
        UpdateAsync(global::AppCore.Domain.Entities.InfrastructureControl.CodeManagement.ServerManagement entity);

    // result of "Test Connection" (no history row)
    Task
        SaveCheckResultAsync(long id, ServerConnectionTestDto result);

    Task
        DeleteAsync(long id);

    Task
        RestoreAsync(long id);

    // the most recently deleted server (false = none)
    Task<bool>
        RestoreLastDeletedAsync();

    Task<IReadOnlyList<ActivityHistoryDto>>
        GetHistoryAsync();

    Task<IReadOnlyList<ActivityHistoryDto>>
        GetEntityHistoryAsync(long id);

    Task<long?>
        GetIdByPublicIdAsync(Guid publicId);
}
