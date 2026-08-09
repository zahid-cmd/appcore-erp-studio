//===============================================================
// Namespaces
//===============================================================

using System.Threading.Tasks;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.SubmenuBackendSynchronizationEngine.Interfaces;

//===============================================================
// Submenu Backend Synchronization Engine Interface
//===============================================================

public interface ISubmenuBackendSynchronizationEngine
{
    //===========================================================
    // Synchronize
    //===========================================================

    Task<SubmenuSynchronizationResultDto> SynchronizeAsync
    (
        SubmenuSynchronizationDto synchronization
    );

    //===========================================================
    // Rollback
    //===========================================================

    Task<SubmenuSynchronizationResultDto> RollbackAsync
    (
        SubmenuSynchronizationDto synchronization
    );
}