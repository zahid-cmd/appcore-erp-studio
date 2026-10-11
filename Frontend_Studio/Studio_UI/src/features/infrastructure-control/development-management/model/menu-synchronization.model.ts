//===============================================================
// Menu Synchronization Model
//===============================================================

export interface MenuSynchronization
{
    //===========================================================
    // Primary Key
    //===========================================================

    id: number;


    //===========================================================
    // Navigation
    //===========================================================

    moduleId: number;

    moduleCode: string;

    moduleName: string;


    menuId: number;

    menuCode: string;

    menuName: string;


    //===========================================================
    // Synchronization Type
    //===========================================================

    synchronizationType: string;


    //===========================================================
    // Frontend Target Location
    //===========================================================

    frontendSolution: string;

    frontendProject: string;

    frontendSourceFolder: string;

    frontendFeatureFolder: string;


    //===========================================================
    // Frontend Menu Structure
    //===========================================================

    frontendMenuFolder: string;

    frontendModelsFolder: string;

    frontendServicesFolder: string;

    frontendPagesFolder: string;

    frontendRoutesFolder: string;


    //===========================================================
    // Frontend Application Registration
    //===========================================================

    frontendMenuRouteFile: string;

    frontendModuleRouteFile: string;

    frontendApplicationRouteFile: string;


    //===========================================================
    // Backend Target Location
    //===========================================================

    backendSolution: string;

    backendApplicationProject: string;

    backendDomainProject: string;

    backendInfrastructureProject: string;


    //===========================================================
    // Backend Standard Menu Structure
    //===========================================================

    backendControllerFolder: string;

    backendApplicationFolder: string;

    backendDomainFolder: string;

    backendRepositoryFolder: string;

    backendConfigurationFolder: string;


    //===========================================================
    // Synchronization
    //===========================================================

    status: string;


    //===========================================================
    // Configuration
    //===========================================================

    remarks: string | null;


    //===========================================================
    // Last Synchronization
    //===========================================================

    lastSynchronizedBy: number | null;

    lastSynchronizedDate: Date | null;

    lastSynchronizationResult: string;


    //===========================================================
    // Status
    //===========================================================

    isActive: boolean;


    //===========================================================
    // Audit
    //===========================================================

    createdBy: number;

    createdDate: Date;

    modifiedBy: number | null;

    modifiedDate: Date | null;

    deletedBy: number | null;

    deletedDate: Date | null;

    isDeleted: boolean;
}