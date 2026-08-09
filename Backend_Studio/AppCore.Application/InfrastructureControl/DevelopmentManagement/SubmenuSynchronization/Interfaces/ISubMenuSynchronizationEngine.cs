//===============================================================
// Namespaces
//===============================================================

using System.Threading.Tasks;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.Interfaces;

//===============================================================
// Submenu Synchronization Engine Interface
//===============================================================

public interface ISubmenuSynchronizationEngine
{
    //===========================================================
    // Synchronize
    //===========================================================

    Task<SubmenuSynchronizationResultDto> SynchronizeAsync
    (
        long synchronizationId
    );

    //===========================================================
    // Rollback
    //===========================================================

    Task<SubmenuSynchronizationResultDto> RollbackAsync
    (
        long synchronizationId
    );
}