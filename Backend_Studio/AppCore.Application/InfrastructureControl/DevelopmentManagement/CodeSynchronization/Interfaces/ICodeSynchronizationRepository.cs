//=============================================================== 
// Namespaces 
//=============================================================== 

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs; 

using AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs; 


//=============================================================== 
// Namespace 
//=============================================================== 

namespace AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement; 


//=============================================================== 
// Code Synchronization Repository Interface 
//=============================================================== 

public interface ICodeSynchronizationRepository 
{ 

    //=========================================================== 
    // Get All 
    //=========================================================== 

    Task<List<CodeSynchronizationDto>> 
        GetAllAsync 
        ( 
            string synchronizationType 
        ); 


    //=========================================================== 
    // Get By Id 
    //=========================================================== 

    Task<CodeSynchronizationDto?> 
        GetByIdAsync 
        ( 
            long id 
        ); 


    //=========================================================== 
    // Get Generated Files 
    //=========================================================== 

    Task<List<CodeSynchronizationFileDto>> 
        GetFilesAsync 
        ( 
            long id 
        ); 


    //=========================================================== 
    // Restore File 
    //=========================================================== 
    // 
    // Restores the generated file to the latest restore point 
    // saved for this Code Synchronization record. 
    // 
    // The FileName identifies which generated file under the 
    // Code Synchronization record is being restored. 
    // 
    // This is separate from Code Synchronization Rollback. 
    // 
    //=========================================================== 

    Task<bool> 
        RestoreFileAsync 
        ( 
            long id, 

            string fileName 
        ); 


    //=========================================================== 
    // Restore All Modified Files 
    //=========================================================== 
    // 
    // Restores all generated files belonging to this Code 
    // Synchronization record to their latest restore points. 
    // 
    // This does not perform Code Synchronization Rollback. 
    // 
    //=========================================================== 

    Task<bool> 
        RestoreAllFilesAsync 
        ( 
            long id 
        ); 


    //=========================================================== 
    // Initialize File 
    //=========================================================== 
    // 
    // Returns the generated file to its initial synchronized 
    // state using the concrete baseline file created by the 
    // Code Synchronization Engine. 
    // 
    // The FileName identifies which generated file under the 
    // Code Synchronization record is being initialized. 
    // 
    // This is separate from Restore. 
    // 
    // Restore: 
    //     Latest saved restore point. 
    // 
    // Initialize: 
    //     Original baseline created by Code Synchronization. 
    // 
    //=========================================================== 

    Task<bool> 
        InitializeFileAsync 
        ( 
            long id, 

            string fileName 
        ); 


    //=========================================================== 
    // Initialize All Files 
    //=========================================================== 
    // 
    // Returns all generated files belonging to this Code 
    // Synchronization record to their initial synchronized 
    // state using their concrete baseline files. 
    // 
    // This does not perform Code Synchronization Rollback. 
    // 
    //=========================================================== 

    Task<bool> 
        InitializeAllFilesAsync 
        ( 
            long id 
        ); 


    //=========================================================== 
    // Synchronize Code 
    //=========================================================== 

    Task<bool> 
        SynchronizeAsync 
        ( 
            long id 
        ); 


    //=========================================================== 
    // Rollback Code Synchronization 
    //=========================================================== 

    Task<bool> 
        RollbackAsync 
        ( 
            long id 
        ); 


    //=========================================================== 
    // Get List History 
    //=========================================================== 

    Task<List<CodeSynchronizationDto>> 
        GetHistoryAsync(); 


    //=========================================================== 
    // Create From Submenu Synchronization 
    //=========================================================== 

    Task<long> 
        CreateFromSubmenuSynchronizationAsync 
        ( 
            long submenuSynchronizationId 
        ); 


    //=========================================================== 
    // Get Submenu Synchronization For Registration 
    //=========================================================== 
    // 
    // Loads the complete Submenu Synchronization record required 
    // by the Backend Registration Engine. 
    // 
    // Registration is a separate operation from Code 
    // Synchronization. 
    // 
    //=========================================================== 

    Task<SubmenuSynchronizationDto?> 
        GetSubmenuSynchronizationForRegistrationAsync 
        ( 
            long id 
        ); 


    //=========================================================== 
    // Update Backend Registration Status 
    //=========================================================== 
    // 
    // Updates the Code Synchronization database status after 
    // Backend Database Registration has completed. 
    // 
    // Registration failure is represented by "Failed". 
    // 
    //=========================================================== 

    Task<bool> 
        UpdateBackendRegistrationStatusAsync 
        ( 
            long id, 

            bool successful, 

            string message 
        ); 


    //=========================================================== 
    // Update Backend Deregistration Status 
    //=========================================================== 
    // 
    // Updates the Code Synchronization database status after 
    // successful Backend Database Deregistration. 
    // 
    // Deregistration does NOT mean registration failed. 
    // 
    // The generated backend code remains synchronized. 
    // 
    // Therefore: 
    // 
    //     Code Status: 
    //         Synchronized 
    // 
    //     Database Status: 
    //         Pending 
    // 
    // This makes the Register action available again. 
    // 
    //=========================================================== 

    Task<bool> 
        UpdateBackendDeregistrationStatusAsync 
        ( 
            long id, 

            string message 
        ); 


    //=========================================================== 
    // Update Migration Status 
    //=========================================================== 
    // 
    // Updates the Code Synchronization migration status after 
    // Migration Creation has completed. 
    // 
    // Successful creation: 
    // 
    //     Migration Status: 
    //         Created 
    // 
    // Failed creation: 
    // 
    //     Migration Status: 
    //         Failed 
    // 
    // The frontend derives MigrationCreated from MigrationStatus. 
    // 
    // Migration state does NOT modify DatabaseCreated. 
    // 
    //=========================================================== 

    Task<bool> 
        UpdateMigrationStatusAsync 
        ( 
            long id, 

            bool successful, 

            string message 
        ); 


    //=========================================================== 
    // Update Migration Removal Status 
    //=========================================================== 
    // 
    // Updates the Code Synchronization migration status after 
    // successful Migration Removal. 
    // 
    // Removal does NOT affect: 
    // 
    //     Code Synchronization Status 
    // 
    //     Backend Registration Status 
    // 
    // After successful removal: 
    // 
    //     Migration Status: 
    //         Ready 
    // 
    // This makes the Create Migration action available again. 
    // 
    //=========================================================== 

    Task<bool> 
        UpdateMigrationRemovalStatusAsync 
        ( 
            long id, 

            string message 
        ); 


    //=========================================================== 
    // Update Database Status 
    //=========================================================== 
    // 
    // Updates the Code Synchronization database state after 
    // the actual database creation or removal operation has 
    // completed successfully. 
    // 
    // Database state is completely independent from Migration 
    // state. 
    // 
    // Successful database creation: 
    // 
    //     DatabaseCreated: 
    //         true 
    // 
    // Successful database removal: 
    // 
    //     DatabaseCreated: 
    //         false 
    // 
    // Migration creation/removal must never update this state. 
    // 
    //=========================================================== 

    Task<bool> 
        UpdateDatabaseStatusAsync 
        ( 
            long id, 

            bool successful, 

            string message 
        ); 

}