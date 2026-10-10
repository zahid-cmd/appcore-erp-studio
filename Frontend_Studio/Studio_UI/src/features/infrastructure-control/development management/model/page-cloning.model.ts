//===============================================================
// Page Cloning Model
//===============================================================

export interface PageCloning
{
    //===========================================================
    // Identity
    //===========================================================

    id: number;


    //===========================================================
    // Source Submenu
    //===========================================================

    cloneFromId: number;
    cloneFromCode: string;
    cloneFromName: string;


    //===========================================================
    // Target Submenu
    //===========================================================

    cloneToId: number;
    cloneToCode: string;
    cloneToName: string;


    //===========================================================
    // Cloning Configuration
    //===========================================================

    cloningType: string;
    numberOfFiles: number;
    operation: string;
    status: string;
    remarks: string | null;


    //===========================================================
    // Cloning Result
    //===========================================================

    lastClonedBy: number | null;
    lastClonedDate: Date | null;
    lastCloningResult: string;


    //===========================================================
    // Record Status
    //===========================================================

    isActive: boolean;
    isDeleted: boolean;


    //===========================================================
    // Audit Information
    //===========================================================

    createdBy: number;
    createdDate: Date;
    modifiedBy: number | null;
    modifiedDate: Date | null;
    deletedBy: number | null;
    deletedDate: Date | null;
}


//===============================================================
// Page Cloning Source File
//===============================================================

export interface PageCloningSourceFile
{
    //===========================================================
    // File Identity
    //===========================================================

    id: number;
    category: string;
    fileType: string;
    fileName: string;


    //===========================================================
    // File Location
    //===========================================================

    location: string;
    path: string;


    //===========================================================
    // File Analysis
    //===========================================================

    exists: boolean;
    action: string;
}


//===============================================================
// Model Field Operation
//===============================================================

export type ModelFieldOperation =
    | 'Keep'
    | 'Modify'
    | 'Add'
    | 'Exclude';


//===============================================================
// Page Cloning Model Field
//===============================================================

export interface PageCloningModelField
{
    //===========================================================
    // Source Field
    //===========================================================

    inputModel: string;
    sourceField?: string;


    //===========================================================
    // Target Field Definition
    //===========================================================

    name: string;
    type: string;
    category: string;
    required: boolean;


    //===========================================================
    // Transformation Operation
    //===========================================================

    operation?: ModelFieldOperation;


    //===========================================================
    // Optional Field Metadata
    //===========================================================

    description?: string;
    defaultValue?: string | number | boolean | null;
}


//===============================================================
// Target Model Field
//===============================================================

export interface TargetModelField
    extends PageCloningModelField
{
    //===========================================================
    // Source Mapping
    //===========================================================

    sourceField: string;


    //===========================================================
    // Transformation Operation
    //===========================================================

    operation: ModelFieldOperation;
}


//===============================================================
// Page Cloning Transformation Configuration
//===============================================================

export interface PageCloningTransformation
{
    //===========================================================
    // Source and Target
    //===========================================================

    sourceSubmenuId: number;
    targetSubmenuId: number;


    //===========================================================
    // Model Field Mappings
    //===========================================================

    modelFields: TargetModelField[];


    //===========================================================
    // Transformation Options
    //===========================================================

    renameIdentifiers: boolean;
    updateRoutes: boolean;
    updateApiReferences: boolean;
    updateModelReferences: boolean;
    preserveTargetFilePaths: boolean;
}


//===============================================================
// Page Cloning Source Analysis
//===============================================================

export interface PageCloningSourceAnalysis
{
    //===========================================================
    // Source Submenu
    //===========================================================

    submenuId: number;
    submenuCode: string;
    submenuName: string;


    //===========================================================
    // Analyzed Files
    //===========================================================

    files: PageCloningSourceFile[];


    //===========================================================
    // Analyzed Model Fields
    //===========================================================

    modelFields: PageCloningModelField[];
}