//===============================================================
// Namespaces
//===============================================================

using System.Threading.Tasks;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.FrontendSynchronizationEngine.Interfaces;


//===============================================================
// Frontend Synchronization Engine
//===============================================================

public interface IFrontendSynchronizationEngine
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