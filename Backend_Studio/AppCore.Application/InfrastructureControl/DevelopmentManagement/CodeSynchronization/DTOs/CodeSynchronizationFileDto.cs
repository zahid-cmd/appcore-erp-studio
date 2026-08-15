//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;


//===============================================================
// Code Synchronization File DTO
//===============================================================

public class CodeSynchronizationFileDto
{

    //===========================================================
    // File Name
    //===========================================================

    public string FileName { get; set; } = string.Empty;



    //===========================================================
    // File Status
    //===========================================================

    public string Status { get; set; } = "Clean";



    //===========================================================
    // Last Modified
    //===========================================================

    public DateTime? LastModified { get; set; }

}