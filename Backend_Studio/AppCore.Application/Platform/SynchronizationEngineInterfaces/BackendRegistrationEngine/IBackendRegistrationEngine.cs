//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.SynchronizationEngineInterfaces.BackendRegistrationEngine;


//===============================================================
// Backend Registration Engine Interface
//===============================================================
//
// Responsibility:
//
//     RegisterAsync
//         Registers generated backend code in:
//             1. AppDbContext.cs
//             2. DependencyInjection.cs
//
//     RollbackAsync
//         Removes generated backend registration from:
//             1. AppDbContext.cs
//             2. DependencyInjection.cs
//
// This interface does NOT own:
//
//     - EF Core migration creation
//     - EF Core migration removal
//     - Database update
//     - Database table creation
//     - Database table removal
//     - Database rollback
//
// Database schema synchronization is handled by the separate
// Backend Database Synchronization Engine.
//
//===============================================================

public interface IBackendRegistrationEngine
{

    //===========================================================
    // Register Backend Code
    //===========================================================
    //
    // Registers the generated backend entity and repository into
    // the real backend infrastructure source files.
    //
    // Responsible only for:
    //
    //     AppDbContext.cs
    //     DependencyInjection.cs
    //
    //===========================================================

    Task<BackendRegistrationResultDto>
        RegisterAsync
    (
        SubmenuSynchronizationDto synchronization
    );



    //===========================================================
    // Remove Backend Registration
    //===========================================================
    //
    // Removes the generated backend entity registration and
    // repository registration from the real backend source files.
    //
    // Responsible only for:
    //
    //     AppDbContext.cs
    //     DependencyInjection.cs
    //
    // Database table removal is NOT performed here.
    //
    //===========================================================

    Task<BackendRegistrationResultDto>
        RollbackAsync
    (
        SubmenuSynchronizationDto synchronization
    );

}