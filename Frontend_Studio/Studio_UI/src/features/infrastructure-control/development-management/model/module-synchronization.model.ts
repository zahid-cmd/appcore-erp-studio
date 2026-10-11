//===============================================================
// Module Synchronization Model
//===============================================================

export interface ModuleSynchronization
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
    // Frontend Standard Module Structure
    //===========================================================

    frontendModuleFolder: string;

    frontendRoutesFolder: string;

    //===========================================================
    // Frontend Application Registration
    //===========================================================

    frontendModuleRouteFile: string;

    frontendApplicationRouteFile: string;

    //===========================================================
    // Backend Target Location
    //===========================================================

    backendSolution: string;

    backendApiProject: string;

    backendApplicationProject: string;

    backendDomainProject: string;

    backendInfrastructureProject: string;

    //===========================================================
    // Backend Standard Module Structure
    //===========================================================

    backendControllerFolder: string;

    backendApplicationFolder: string;

    backendInterfaceFolder: string;

    backendEntityFolder: string;

    backendRepositoryFolder: string;

    backendConfigurationFolder: string;

    //===========================================================
    // Backend Application Registration
    //===========================================================

    dependencyInjectionFile: string;

    dbContextFile: string;

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