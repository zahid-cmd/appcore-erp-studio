//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;


//===============================================================
// Backend Code Synchronization Result
//===============================================================

public class BackendCodeSynchronizationResultDto
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
    // Build Status
    //===========================================================

    public string BuildStatus { get; set; } = string.Empty;


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