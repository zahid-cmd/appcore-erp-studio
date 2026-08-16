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