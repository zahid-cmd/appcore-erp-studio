//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.ProjectSynchronization.DTOs;

//===============================================================
// DTO
//===============================================================

public class ProjectSynchronizationDefaultsDto
{
    //===========================================================
    // Frontend
    //===========================================================

    public string FrontendStatus { get; set; } = "Pending";

    //===========================================================
    // Backend
    //===========================================================

    public string BackendStatus { get; set; } = "Pending";
}