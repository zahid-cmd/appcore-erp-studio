namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.ProjectSynchronization.DTOs;

public class MenuDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;


    //===========================================================
    // Synchronization Status
    //===========================================================

    public bool FrontendExists { get; set; }

    public bool BackendExists { get; set; }
}