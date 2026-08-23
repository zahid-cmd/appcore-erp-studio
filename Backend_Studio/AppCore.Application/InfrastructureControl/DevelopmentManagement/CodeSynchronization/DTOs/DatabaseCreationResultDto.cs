//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;


//===============================================================
// Database Creation Result DTO
//===============================================================

public class DatabaseCreationResultDto
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