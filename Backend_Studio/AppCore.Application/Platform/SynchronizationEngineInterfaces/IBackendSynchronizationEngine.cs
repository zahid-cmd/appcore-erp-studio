//===============================================================
// Namespaces
//===============================================================

using System.Threading.Tasks;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.BackendSynchronizationEngine.Interfaces;

//===============================================================
// Backend Synchronization Engine Interface
//===============================================================

public interface IBackendSynchronizationEngine
{
    //===========================================================
    // Synchronize
    //===========================================================

    Task<ModuleSynchronizationResultDto> SynchronizeAsync
    (
        ModuleSynchronizationDto synchronization
    );

    //===========================================================
    // Rollback
    //===========================================================

    Task<ModuleSynchronizationResultDto> RollbackAsync
    (
        ModuleSynchronizationDto synchronization
    );
}