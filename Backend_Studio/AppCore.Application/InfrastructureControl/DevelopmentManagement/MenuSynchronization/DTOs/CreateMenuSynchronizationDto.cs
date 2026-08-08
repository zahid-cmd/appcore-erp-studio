//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.MenuSynchronization.DTOs;

//===============================================================
// Create Menu Synchronization DTO
//===============================================================

public class CreateMenuSynchronizationDto
{
//===========================================================
// Navigation
//===========================================================

    public long ModuleId { get; set; }

    public string ModuleCode { get; set; } = string.Empty;

    public string ModuleName { get; set; } = string.Empty;

    public long MenuId { get; set; }

    public string MenuCode { get; set; } = string.Empty;

    public string MenuName { get; set; } = string.Empty;

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
// Frontend Menu Structure
//===========================================================

    public string FrontendMenuFolder { get; set; } = string.Empty;

    public string FrontendModelsFolder { get; set; } = string.Empty;

    public string FrontendServicesFolder { get; set; } = string.Empty;

    public string FrontendPagesFolder { get; set; } = string.Empty;

    public string FrontendFormFolder { get; set; } = string.Empty;

    public string FrontendListFolder { get; set; } = string.Empty;

    public string FrontendRoutesFolder { get; set; } = string.Empty;

//===========================================================
// Frontend Route Ownership
//===========================================================

//===========================================================
// Menu Synchronization Route File
//===========================================================

    public string FrontendMenuRouteFile { get; set; } = string.Empty;

//===========================================================
// Module Synchronization Route File
//===========================================================

    public string FrontendModuleRouteFile { get; set; } = string.Empty;

//===========================================================
// Application Route File
//===========================================================

    public string FrontendApplicationRouteFile { get; set; } = string.Empty;

//===========================================================
// Backend Target Location
//===========================================================

    public string BackendSolution { get; set; } = string.Empty;

    public string BackendApplicationProject { get; set; } = string.Empty;

    public string BackendDomainProject { get; set; } = string.Empty;

    public string BackendInfrastructureProject { get; set; } = string.Empty;

    //===========================================================
    // Backend Menu Structure
    //===========================================================

    public string BackendControllerFolder { get; set; } = string.Empty;

    public string BackendApplicationFolder { get; set; } = string.Empty;

    public string BackendDomainFolder { get; set; } = string.Empty;

    public string BackendRepositoryFolder { get; set; } = string.Empty;

    public string BackendConfigurationFolder { get; set; } = string.Empty;

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
}