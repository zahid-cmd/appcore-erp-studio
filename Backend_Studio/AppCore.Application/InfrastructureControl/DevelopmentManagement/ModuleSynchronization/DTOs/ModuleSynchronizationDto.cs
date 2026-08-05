//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.ModuleSynchronization.DTOs;

//===============================================================
// Module Synchronization DTO
//===============================================================

public class ModuleSynchronizationDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long Id { get; set; }

    //===========================================================
    // Navigation
    //===========================================================

    public long ModuleId { get; set; }

    public string ModuleCode { get; set; } = string.Empty;

    public string ModuleName { get; set; } = string.Empty;

    //===========================================================
    // Synchronization Type
    //===========================================================

    public string SynchronizationType { get; set; } = string.Empty;

    //===========================================================
    // Frontend Target Location
    //===========================================================

    public string FrontendSolution { get; set; } = string.Empty;

    public string FrontendProject { get; set; } = string.Empty;

    public string FrontendSourceFolder { get; set; } = string.Empty;

    public string FrontendFeatureFolder { get; set; } = string.Empty;

    //===========================================================
    // Frontend Standard Module Structure
    //===========================================================

    public string FrontendModuleFolder { get; set; } = string.Empty;

    public string FrontendModelFolder { get; set; } = string.Empty;

    public string FrontendPagesFolder { get; set; } = string.Empty;

    public string FrontendRoutesFolder { get; set; } = string.Empty;

    public string FrontendServicesFolder { get; set; } = string.Empty;

    public string FrontendModuleRouteFile { get; set; } = string.Empty;

    //===========================================================
    // Frontend Application Registration
    //===========================================================

    public string FrontendApplicationRouteFile { get; set; } = string.Empty;

    public string FrontendRoutePath { get; set; } = string.Empty;

    //===========================================================
    // Backend Target Location
    //===========================================================

    public string BackendSolution { get; set; } = string.Empty;

    public string BackendApiProject { get; set; } = string.Empty;

    public string BackendApplicationProject { get; set; } = string.Empty;

    public string BackendDomainProject { get; set; } = string.Empty;

    public string BackendInfrastructureProject { get; set; } = string.Empty;

    //===========================================================
    // Backend Standard Module Structure
    //===========================================================

    public string BackendControllerFolder { get; set; } = string.Empty;

    public string BackendApplicationFolder { get; set; } = string.Empty;

    public string BackendInterfaceFolder { get; set; } = string.Empty;

    public string BackendEntityFolder { get; set; } = string.Empty;

    public string BackendRepositoryFolder { get; set; } = string.Empty;

    public string BackendConfigurationFolder { get; set; } = string.Empty;

    //===========================================================
    // Backend Application Registration
    //===========================================================

    public string DependencyInjectionFile { get; set; } = string.Empty;

    public string DbContextFile { get; set; } = string.Empty;

    //===========================================================
    // Synchronization
    //===========================================================

    public string Status { get; set; } = "Pending";

    //===========================================================
    // Configuration
    //===========================================================

    public string? Remarks { get; set; }

    //===========================================================
    // Last Synchronization
    //===========================================================

    public long? LastSynchronizedBy { get; set; }

    public DateTime? LastSynchronizedDate { get; set; }

    public string LastSynchronizationResult { get; set; } = string.Empty;

    //===========================================================
    // Status
    //===========================================================

    public bool IsActive { get; set; } = true;

    //===========================================================
    // Audit
    //===========================================================

    public DateTime CreatedDate { get; set; }
}