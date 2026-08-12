//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.Interfaces;


//===============================================================
// Code Synchronization Engine Result
//===============================================================

public class CodeSynchronizationEngineResult
{
    //===========================================================
    // Success
    //===========================================================

    public bool Success { get; set; }


    //===========================================================
    // Message
    //===========================================================

    public string Message { get; set; } = string.Empty;
}


//===============================================================
// Code Synchronization Engine
//===============================================================

public interface ICodeSynchronizationEngine
{
    //===========================================================
    // Synchronize
    //===========================================================

    Task<CodeSynchronizationEngineResult> SynchronizeAsync
    (
        long id
    );


    //===========================================================
    // Rollback
    //===========================================================

    Task<CodeSynchronizationEngineResult> RollbackAsync
    (
        long id
    );
}