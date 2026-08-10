//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization.DTOs;


//===============================================================
// Update Submenu Synchronization DTO
//===============================================================

public class UpdateSubmenuSynchronizationDto
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


    public long MenuId { get; set; }

    public string MenuCode { get; set; } = string.Empty;

    public string MenuName { get; set; } = string.Empty;


    public long SubmenuId { get; set; }

    public string SubmenuCode { get; set; } = string.Empty;

    public string SubmenuName { get; set; } = string.Empty;


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

    public string FrontendMenuFolder { get; set; } = string.Empty;


    //===========================================================
    // Frontend Menu Route
    //===========================================================

    public string FrontendMenuRouteFile { get; set; } = string.Empty;


    //===========================================================
    // Frontend Submenu Location
    //===========================================================

    public string FrontendSubmenuFolder { get; set; } = string.Empty;

    public string FrontendFormFolder { get; set; } = string.Empty;

    public string FrontendListFolder { get; set; } = string.Empty;


    //===========================================================
    // Frontend Submenu Core Files
    //===========================================================

    public string FrontendSubmenuModelFile { get; set; } = string.Empty;

    public string FrontendSubmenuServiceFile { get; set; } = string.Empty;

    public string FrontendSubmenuRouteFile { get; set; } = string.Empty;


    //===========================================================
    // Frontend Submenu Page Files
    //===========================================================

    public string FrontendSubmenuFormTsFile { get; set; } = string.Empty;

    public string FrontendSubmenuFormHtmlFile { get; set; } = string.Empty;

    public string FrontendSubmenuFormCssFile { get; set; } = string.Empty;


    public string FrontendSubmenuListTsFile { get; set; } = string.Empty;

    public string FrontendSubmenuListHtmlFile { get; set; } = string.Empty;

    public string FrontendSubmenuListCssFile { get; set; } = string.Empty;


    //===========================================================
    // Backend Target Location
    //===========================================================

    public string BackendSolution { get; set; } = string.Empty;

    public string BackendApplicationProject { get; set; } = string.Empty;

    public string BackendDomainProject { get; set; } = string.Empty;

    public string BackendInfrastructureProject { get; set; } = string.Empty;


    //===========================================================
    // Backend API
    //===========================================================

    public string BackendControllerFile { get; set; } = string.Empty;


    //===========================================================
    // Backend Application
    //===========================================================

    public string BackendApplicationSubMenuFolder { get; set; } = string.Empty;

    public string BackendApplicationDtosFolder { get; set; } = string.Empty;

    public string BackendApplicationInterfacesFolder { get; set; } = string.Empty;


    public string BackendSubMenuDtoFile { get; set; } = string.Empty;

    public string BackendCreateSubMenuDtoFile { get; set; } = string.Empty;

    public string BackendUpdateSubMenuDtoFile { get; set; } = string.Empty;

    public string BackendSubMenuDefaultsDtoFile { get; set; } = string.Empty;

    public string BackendSubMenuRepositoryInterfaceFile { get; set; } = string.Empty;


    //===========================================================
    // Backend Domain
    //===========================================================

    public string BackendSubMenuEntityFile { get; set; } = string.Empty;


    //===========================================================
    // Backend Infrastructure
    //===========================================================

    public string BackendSubMenuConfigurationFile { get; set; } = string.Empty;

    public string BackendSubMenuRepositoryFile { get; set; } = string.Empty;


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