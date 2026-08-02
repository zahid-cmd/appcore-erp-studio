//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.ProjectSynchronization.DTOs;


//===============================================================
// Update DTO
//===============================================================

public class UpdateProjectSynchronizationDto
{
    //===========================================================
    // Identity
    //===========================================================

    public long Id { get; set; }


    //===========================================================
    // Synchronization Level
    //===========================================================

    public string SynchronizationLevel { get; set; } = string.Empty;


    //===========================================================
    // Navigation References
    //===========================================================

    public long? ModuleId { get; set; }

    public long? MenuId { get; set; }

    public long? SubmenuId { get; set; }


    //===========================================================
    // Synchronization Information
    //===========================================================

    public string SynchronizationTarget { get; set; } = string.Empty;


    //===========================================================
    // Frontend Configuration
    //===========================================================

    public string FrontendSolution { get; set; } = string.Empty;

    public string FrontendProject { get; set; } = string.Empty;

    public string FrontendSourceFolder { get; set; } = string.Empty;

    public string FrontendFeatureFolder { get; set; } = string.Empty;

    public string FrontendModuleFolder { get; set; } = string.Empty;

    public string FrontendModelFolder { get; set; } = string.Empty;

    public string FrontendPagesFolder { get; set; } = string.Empty;

    public string FrontendRoutesFolder { get; set; } = string.Empty;

    public string FrontendServicesFolder { get; set; } = string.Empty;


    //===========================================================
    // Frontend Application Registration
    //===========================================================

    public string FrontendModuleRouteFile { get; set; } = string.Empty;

    public string FrontendParentRouteFile { get; set; } = string.Empty;

    public string FrontendRoutePath { get; set; } = string.Empty;


    //===========================================================
    // Backend Configuration
    //===========================================================

    public string BackendApiProject { get; set; } = string.Empty;

    public string BackendApplicationProject { get; set; } = string.Empty;

    public string BackendDomainProject { get; set; } = string.Empty;

    public string BackendInfrastructureProject { get; set; } = string.Empty;

    public string BackendControllerFolder { get; set; } = string.Empty;

    public string BackendDtoFolder { get; set; } = string.Empty;

    public string BackendInterfaceFolder { get; set; } = string.Empty;

    public string BackendEntityFolder { get; set; } = string.Empty;

    public string BackendRepositoryFolder { get; set; } = string.Empty;

    public string BackendConfigurationFolder { get; set; } = string.Empty;


    //===========================================================
    // Backend Registration & Database
    //===========================================================

    public string BackendDependencyInjectionFile { get; set; } = string.Empty;

    public string BackendDbContextFile { get; set; } = string.Empty;

    public string BackendProgramFile { get; set; } = string.Empty;

    public string BackendMigrationFolder { get; set; } = string.Empty;

    public string DatabaseProvider { get; set; } = string.Empty;


    //===========================================================
    // Additional Information
    //===========================================================

    public string Remarks { get; set; } = string.Empty;
}