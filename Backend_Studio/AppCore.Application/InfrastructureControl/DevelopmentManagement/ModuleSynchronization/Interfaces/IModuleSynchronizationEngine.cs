//===============================================================
// Namespaces
//===============================================================

using System.Threading.Tasks;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.Interfaces;

//===============================================================
// Module Synchronization Engine Interface
//===============================================================

public interface IModuleSynchronizationEngine
{
    //===========================================================
    // Synchronize
    //===========================================================

    Task<ModuleSynchronizationResultDto> SynchronizeAsync
    (
        long synchronizationId
    );

    //===========================================================
    // Rollback
    //===========================================================

    Task<ModuleSynchronizationResultDto> RollbackAsync
    (
        long synchronizationId
    );
}