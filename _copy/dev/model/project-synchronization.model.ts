//===============================================================
// Project Synchronization
//===============================================================

export interface ProjectSynchronization
{
    id:number;

    synchronizationLevel:
        'module'
        | 'menu'
        | 'submenu';


    moduleId:number | null;
    moduleCode:string;
    moduleName:string;


    menuId:number | null;
    menuCode:string;
    menuName:string;


    submenuId:number | null;
    submenuCode:string;
    submenuName:string;


    synchronizationTarget:string;


    //===========================================================
    // Frontend Configuration
    //===========================================================

    frontendSolution:string;

    frontendProject:string;

    frontendSourceFolder:string;

    frontendFeatureFolder:string;

    frontendModuleFolder:string;

    frontendModelFolder:string;

    frontendPagesFolder:string;

    frontendRoutesFolder:string;

    frontendServicesFolder:string;


    //===========================================================
    // Frontend Application Registration
    //===========================================================

    frontendModuleRouteFile:string;

    frontendParentRouteFile:string;

    frontendRoutePath:string;



    //===========================================================
    // Backend Configuration
    //===========================================================

    backendApiProject:string;

    backendApplicationProject:string;

    backendDomainProject:string;

    backendInfrastructureProject:string;


    backendControllerFolder:string;

    backendDtoFolder:string;

    backendInterfaceFolder:string;

    backendEntityFolder:string;

    backendRepositoryFolder:string;

    backendConfigurationFolder:string;


    backendDependencyInjectionFile:string;

    backendDbContextFile:string;

    backendProgramFile:string;

    backendMigrationFolder:string;

    databaseProvider:string;



    //===========================================================
    // Status
    //===========================================================

    frontendStatus:string;

    backendStatus:string;


    remarks:string;



    //===========================================================
    // Last Synchronization
    //===========================================================

    lastSynchronizedBy:number | null;

    lastSynchronizedDate:string | null;



    //===========================================================
    // Audit
    //===========================================================

    createdBy:number;

    createdDate:string;

    modifiedBy:number | null;

    modifiedDate:string | null;

    deletedBy:number | null;

    deletedDate:string | null;

    isDeleted:boolean;
}



//===============================================================
// Create Project Synchronization
//===============================================================

export interface CreateProjectSynchronization
{
    synchronizationLevel:
        'module'
        | 'menu'
        | 'submenu';


    moduleId:number | null;

    menuId:number | null;

    submenuId:number | null;


    synchronizationTarget:string;



    //===========================================================
    // Frontend Configuration
    //===========================================================

    frontendSolution:string;

    frontendProject:string;

    frontendSourceFolder:string;

    frontendFeatureFolder:string;

    frontendModuleFolder:string;

    frontendModelFolder:string;

    frontendPagesFolder:string;

    frontendRoutesFolder:string;

    frontendServicesFolder:string;



    //===========================================================
    // Frontend Application Registration
    //===========================================================

    frontendModuleRouteFile:string;

    frontendParentRouteFile:string;

    frontendRoutePath:string;



    //===========================================================
    // Backend Configuration
    //===========================================================

    backendApiProject:string;

    backendApplicationProject:string;

    backendDomainProject:string;

    backendInfrastructureProject:string;


    backendControllerFolder:string;

    backendDtoFolder:string;

    backendInterfaceFolder:string;

    backendEntityFolder:string;

    backendRepositoryFolder:string;

    backendConfigurationFolder:string;


    backendDependencyInjectionFile:string;

    backendDbContextFile:string;

    backendProgramFile:string;

    backendMigrationFolder:string;

    databaseProvider:string;


    remarks:string;
}



//===============================================================
// Update Project Synchronization
//===============================================================

export interface UpdateProjectSynchronization
{
    id:number;


    synchronizationLevel:
        'module'
        | 'menu'
        | 'submenu';


    moduleId:number | null;

    menuId:number | null;

    submenuId:number | null;


    synchronizationTarget:string;



    //===========================================================
    // Frontend Configuration
    //===========================================================

    frontendSolution:string;

    frontendProject:string;

    frontendSourceFolder:string;

    frontendFeatureFolder:string;

    frontendModuleFolder:string;

    frontendModelFolder:string;

    frontendPagesFolder:string;

    frontendRoutesFolder:string;

    frontendServicesFolder:string;



    //===========================================================
    // Frontend Application Registration
    //===========================================================

    frontendModuleRouteFile:string;

    frontendParentRouteFile:string;

    frontendRoutePath:string;



    //===========================================================
    // Backend Configuration
    //===========================================================

    backendApiProject:string;

    backendApplicationProject:string;

    backendDomainProject:string;

    backendInfrastructureProject:string;


    backendControllerFolder:string;

    backendDtoFolder:string;

    backendInterfaceFolder:string;

    backendEntityFolder:string;

    backendRepositoryFolder:string;

    backendConfigurationFolder:string;


    backendDependencyInjectionFile:string;

    backendDbContextFile:string;

    backendProgramFile:string;

    backendMigrationFolder:string;

    databaseProvider:string;


    remarks:string;
}



//===============================================================
// Project Synchronization Defaults
//===============================================================

export interface ProjectSynchronizationDefaults
{
    frontendStatus:string;

    backendStatus:string;
}



//===============================================================
// Lookup Models
//===============================================================

export interface Module
{
    id:number;

    code:string;

    name:string;
}


export interface Menu
{
    id:number;

    code:string;

    name:string;
}


export interface Submenu
{
    id:number;

    code:string;

    name:string;
}



//===============================================================
// Activity History
//===============================================================

export interface ActivityHistory
{
    id:number;

    module:string;

    entityName:string;

    entityId:number;

    activityType:string;

    activityTitle:string;

    activityDescription:string | null;

    performedBy:number;

    performedByName:string;

    performedDate:string;
}