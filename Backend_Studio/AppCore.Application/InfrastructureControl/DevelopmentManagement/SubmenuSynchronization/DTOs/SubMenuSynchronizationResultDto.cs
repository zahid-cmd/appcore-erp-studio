//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;

//===============================================================
// Submenu Synchronization Result DTO
//===============================================================

public class SubmenuSynchronizationResultDto
{
    //===========================================================
    // Success
    //===========================================================

    public bool Success { get; set; }

    //===========================================================
    // Message
    //===========================================================

    public string Message { get; set; } = string.Empty;

    //===========================================================
    // Synchronized Date
    //===========================================================

    public DateTime? SynchronizedDate { get; set; }

    //===========================================================
    // Total Operations
    //===========================================================

    public int TotalOperations { get; set; }

    //===========================================================
    // Successful Operations
    //===========================================================

    public int SuccessfulOperations { get; set; }

    //===========================================================
    // Failed Operations
    //===========================================================

    public int FailedOperations { get; set; }
}