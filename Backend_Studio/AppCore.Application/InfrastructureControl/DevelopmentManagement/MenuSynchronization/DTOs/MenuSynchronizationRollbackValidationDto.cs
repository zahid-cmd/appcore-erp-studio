//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.DTOs;


//===============================================================
// Menu Synchronization Rollback Validation DTO
//===============================================================

public class MenuSynchronizationRollbackValidationDto
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