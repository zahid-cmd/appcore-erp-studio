//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;


//===============================================================
// Database Removal Result DTO
//===============================================================

public class DatabaseRemovalResultDto
{

    //===========================================================
    // Properties
    //===========================================================

    public bool
        Succeeded
        {
            get;
            set;
        }


    public string
        Message
        {
            get;
            set;
        } = string.Empty;

}