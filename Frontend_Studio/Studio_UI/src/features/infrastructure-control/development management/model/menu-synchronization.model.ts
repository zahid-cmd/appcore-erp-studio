//===============================================================
// Menu Synchronization Model
//===============================================================
export interface MenuSynchronization
{
    id: number;

    moduleId: number;
    moduleCode: string;
    moduleName: string;

    menuId: number;
    menuCode: string;
    menuName: string;

    synchronizationType: string;

    frontendSolution: string;
    frontendProject: string;
    frontendSourceFolder: string;
    frontendFeatureFolder: string;

    frontendMenuFolder: string;
    frontendModelsFolder: string;
    frontendServicesFolder: string;
    frontendPagesFolder: string;
    frontendFormFolder: string;
    frontendListFolder: string;
    frontendRoutesFolder: string;

    frontendMenuRouteFile: string;
    frontendModuleRouteFile: string;
    frontendApplicationRouteFile: string;

    backendSolution: string;
    backendApplicationProject: string;
    backendDomainProject: string;
    backendInfrastructureProject: string;

    backendControllerFolder: string;
    backendApplicationFolder: string;
    backendDomainFolder: string;
    backendRepositoryFolder: string;
    backendConfigurationFolder: string;

    status: string;

    remarks: string | null;

    lastSynchronizedBy: number | null;
    lastSynchronizedDate: Date | null;
    lastSynchronizationResult: string;

    isActive: boolean;

    createdBy: number;
    createdDate: Date;
    modifiedBy: number | null;
    modifiedDate: Date | null;
    deletedBy: number | null;
    deletedDate: Date | null;
    isDeleted: boolean;
}