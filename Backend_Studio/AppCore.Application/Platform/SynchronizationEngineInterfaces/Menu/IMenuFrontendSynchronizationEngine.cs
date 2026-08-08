//===============================================================
// Namespaces
//===============================================================

using System.Threading.Tasks;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.MenuFrontendSynchronizationEngine.Interfaces;

//===============================================================
// Menu Frontend Synchronization Engine Interface
//===============================================================

public interface IMenuFrontendSynchronizationEngine
{
    //===========================================================
    // Synchronize
    //===========================================================

    Task<MenuSynchronizationResultDto> SynchronizeAsync
    (
        MenuSynchronizationDto synchronization
    );

    //===========================================================
    // Rollback
    //===========================================================

    Task<MenuSynchronizationResultDto> RollbackAsync
    (
        MenuSynchronizationDto synchronization
    );
}