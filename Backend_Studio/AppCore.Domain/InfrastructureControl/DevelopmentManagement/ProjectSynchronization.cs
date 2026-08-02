//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Entity
//===============================================================

public class ProjectSynchronization
{
    //===========================================================
    // Identity
    //===========================================================

    public long Id { get; set; }


    //===========================================================
    // Synchronization
    //===========================================================

    public string SynchronizationLevel { get; set; } = string.Empty;

    public long? ModuleId { get; set; }

    public long? MenuId { get; set; }

    public long? SubmenuId { get; set; }

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

    public string BackendDependencyInjectionFile { get; set; } = string.Empty;

    public string BackendDbContextFile { get; set; } = string.Empty;

    public string BackendProgramFile { get; set; } = string.Empty;

    public string BackendMigrationFolder { get; set; } = string.Empty;

    public string DatabaseProvider { get; set; } = string.Empty;


    //===========================================================
    // Synchronization Status
    //===========================================================

    public string FrontendStatus { get; set; } = "Pending";

    public string BackendStatus { get; set; } = "Pending";

    public string Remarks { get; set; } = string.Empty;


    //===========================================================
    // Last Synchronization
    //===========================================================

    public long? LastSynchronizedBy { get; set; }

    public DateTime? LastSynchronizedDate { get; set; }


    //===========================================================
    // Audit
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public bool IsDeleted { get; set; }
}