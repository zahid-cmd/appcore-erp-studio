//===============================================================
// Namespaces
//===============================================================

using System.Threading.Tasks;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.Interfaces;

//===============================================================
// Menu Synchronization Engine Interface
//===============================================================

public interface IMenuSynchronizationEngine
{
    //===========================================================
    // Synchronize
    //===========================================================

    Task<MenuSynchronizationResultDto> SynchronizeAsync
    (
        long synchronizationId
    );

    //===========================================================
    // Rollback
    //===========================================================

    Task<MenuSynchronizationResultDto> RollbackAsync
    (
        long synchronizationId
    );
}