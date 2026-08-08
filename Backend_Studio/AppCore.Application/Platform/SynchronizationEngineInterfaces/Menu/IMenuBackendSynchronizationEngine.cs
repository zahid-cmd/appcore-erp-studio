//===============================================================
// Namespaces
//===============================================================

using System.Threading.Tasks;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.MenuBackendSynchronizationEngine.Interfaces;


//===============================================================
// Menu Backend Synchronization Engine Interface
//===============================================================

public interface IMenuBackendSynchronizationEngine
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