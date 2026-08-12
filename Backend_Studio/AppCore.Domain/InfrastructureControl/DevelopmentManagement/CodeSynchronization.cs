//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Namespaces
//===============================================================

using AppCore.Domain.Common;


//===============================================================
// Code Synchronization
//===============================================================

public class CodeSynchronization : BaseEntity
{

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
    // Code Synchronization Status
    //===========================================================

    public string Status { get; set; } = "Ready";


    //===========================================================
    // Last Code Synchronization
    //===========================================================

    public long? LastSynchronizedBy { get; set; }

    public DateTime? LastSynchronizedDate { get; set; }

    public string LastSynchronizationResult { get; set; } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    public string? Remarks { get; set; }

}