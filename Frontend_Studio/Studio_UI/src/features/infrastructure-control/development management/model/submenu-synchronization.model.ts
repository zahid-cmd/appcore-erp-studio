//===============================================================
// Submenu Synchronization Model
//===============================================================

export interface SubmenuSynchronization
{
    //===========================================================
    // Primary Key
    //===========================================================

    id:number;


    //===========================================================
    // Navigation
    //===========================================================

    moduleId:number;

    moduleCode:string;

    moduleName:string;


    menuId:number;

    menuCode:string;

    menuName:string;


    submenuId:number;

    submenuCode:string;

    submenuName:string;


    //===========================================================
    // Synchronization Type
    //===========================================================

    synchronizationType:string;


    //===========================================================
    // Frontend Target Location
    //===========================================================

    frontendSolution:string;

    frontendProject:string;

    frontendSourceFolder:string;

    frontendFeatureFolder:string;

    frontendMenuFolder:string;


    //===========================================================
    // Frontend Submenu Location
    //===========================================================

    frontendSubmenuFolder:string;

    frontendFormFolder:string;

    frontendListFolder:string;


    //===========================================================
    // Frontend Submenu Core Files
    //===========================================================

    frontendSubmenuModelFile:string;

    frontendSubmenuServiceFile:string;

    frontendSubmenuRouteFile:string;


    //===========================================================
    // Frontend Submenu Page Files
    //===========================================================

    frontendSubmenuFormTsFile:string;

    frontendSubmenuFormHtmlFile:string;

    frontendSubmenuFormCssFile:string;

    frontendSubmenuListTsFile:string;

    frontendSubmenuListHtmlFile:string;

    frontendSubmenuListCssFile:string;


    //===========================================================
    // Backend Target Location
    //===========================================================

    backendSolution:string;

    backendApplicationProject:string;

    backendDomainProject:string;

    backendInfrastructureProject:string;


    //===========================================================
    // Backend API
    //===========================================================

    backendControllerFile:string;


    //===========================================================
    // Backend Application
    //===========================================================

    backendApplicationSubMenuFolder:string;

    backendApplicationDtosFolder:string;

    backendApplicationInterfacesFolder:string;


    backendSubMenuDtoFile:string;

    backendCreateSubMenuDtoFile:string;

    backendUpdateSubMenuDtoFile:string;

    backendSubMenuDefaultsDtoFile:string;

    backendSubMenuRepositoryInterfaceFile:string;


    //===========================================================
    // Backend Domain
    //===========================================================

    backendSubMenuEntityFile:string;


    //===========================================================
    // Backend Infrastructure
    //===========================================================

    backendSubMenuConfigurationFile:string;

    backendSubMenuRepositoryFile:string;


    //===========================================================
    // Synchronization
    //===========================================================

    status:string;


    //===========================================================
    // Configuration
    //===========================================================

    remarks:string | null;


    //===========================================================
    // Last Synchronization
    //===========================================================

    lastSynchronizedBy:number | null;

    lastSynchronizedDate:Date | null;

    lastSynchronizationResult:string;


    //===========================================================
    // Status
    //===========================================================

    isActive:boolean;


    //===========================================================
    // Audit
    //===========================================================

    createdBy:number;

    createdDate:Date;

    modifiedBy:number | null;

    modifiedDate:Date | null;

    deletedBy:number | null;

    deletedDate:Date | null;

    isDeleted:boolean;
}