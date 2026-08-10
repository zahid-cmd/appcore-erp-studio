//===============================================================
// Module Synchronization Rollback Validation DTO
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.DTOs;


//===============================================================
// Module Synchronization Rollback Validation
//===============================================================

public class ModuleSynchronizationRollbackValidationDto
{
    //===========================================================
    // Rollback Permission
    //===========================================================

    public bool CanRollback
    {
        get;
        set;
    }


    //===========================================================
    // Validation Message
    //===========================================================

    public string Message
    {
        get;
        set;
    } = string.Empty;
}