//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;


//===============================================================
// Code Synchronization DTO
//===============================================================

public class CodeSynchronizationDto
{

    //===========================================================
    // Primary Key
    //===========================================================

    public long Id { get; set; }



    //===========================================================
    // Submenu Synchronization Reference
    //===========================================================

    public long SubmenuSynchronizationId { get; set; }



    //===========================================================
    // Navigation
    //===========================================================

    public long ModuleId { get; set; }

    public string ModuleCode { get; set; } = string.Empty;

    public string ModuleName { get; set; } = string.Empty;


    public long MenuId { get; set; }

    public string MenuCode { get; set; } = string.Empty;

    public string MenuName { get; set; } = string.Empty;


    public long SubmenuId { get; set; }

    public string SubmenuCode { get; set; } = string.Empty;

    public string SubmenuName { get; set; } = string.Empty;



    //===========================================================
    // Synchronization Type
    //===========================================================

    public string SynchronizationType { get; set; } = string.Empty;



    //===========================================================
    // Code Synchronization
    //===========================================================

    public string Status { get; set; } = "Ready";



    //===========================================================
    // Backend Build Status
    //===========================================================
    //
    // Used by Backend Code Synchronization Engine.
    //
    // Possible values:
    //
    // Successful
    // Failed
    // Pending
    // N/A
    //
    //===========================================================

    public string BuildStatus { get; set; } = "N/A";



    //===========================================================
    // Backend Database Registration Status
    //===========================================================
    //
    // Used by Backend Registration Engine.
    //
    // Possible values:
    //
    // Successful
    // Failed
    // Pending
    // N/A
    //
    // Backend records only.
    //
    //===========================================================

    public string DbStatus { get; set; } = "N/A";



    //===========================================================
    // Migration Status
    //===========================================================
    //
    // Used by Migration Engine.
    //
    // Possible values:
    //
    // Ready
    // Created
    // Failed
    // N/A
    //
    // Backend records only.
    //
    //===========================================================

    public string MigrationStatus { get; set; } = "N/A";



    //===========================================================
    // Migration Created
    //===========================================================
    //
    // Used by Frontend to determine whether the migration
    // action should display Create Migration or Remove Migration.
    //
    //===========================================================

    public bool MigrationCreated
    {
        get
        {
            return string.Equals
            (
                MigrationStatus,

                "Created",

                StringComparison.OrdinalIgnoreCase
            );
        }
    }



    //===========================================================
    // Database Created
    //===========================================================
    //
    // Represents whether the physical database table has been
    // created from the generated migration.
    //
    // Backend records only.
    //
    //===========================================================

    public bool DatabaseCreated { get; set; }



    //===========================================================
    // Configuration
    //===========================================================

    public string? Remarks { get; set; }



    //===========================================================
    // Last Code Synchronization
    //===========================================================

    public long? LastSynchronizedBy { get; set; }

    public DateTime? LastSynchronizedDate { get; set; }

    public string LastSynchronizationResult { get; set; } = string.Empty;



    //===========================================================
    // Status
    //===========================================================

    public bool IsActive { get; set; } = true;



    //===========================================================
    // Audit
    //===========================================================

    public DateTime CreatedDate { get; set; }

}