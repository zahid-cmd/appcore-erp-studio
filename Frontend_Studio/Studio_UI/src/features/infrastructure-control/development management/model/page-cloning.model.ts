//===============================================================
// Page Cloning Model
//===============================================================

export interface PageCloning
{
    id:number;

    cloneFromId:number;
    cloneFromCode:string;
    cloneFromName:string;

    cloneToId:number;
    cloneToCode:string;
    cloneToName:string;

    cloningType:string;

    numberOfFiles:number;

    operation:string;

    status:string;

    remarks:string | null;

    lastClonedBy:number | null;
    lastClonedDate:Date | null;
    lastCloningResult:string;

    isActive:boolean;

    createdBy:number;
    createdDate:Date;

    modifiedBy:number | null;
    modifiedDate:Date | null;

    deletedBy:number | null;
    deletedDate:Date | null;

    isDeleted:boolean;
}


//===============================================================
// Page Cloning Source File
//===============================================================

export interface PageCloningSourceFile
{
    id:number;

    category:string;

    fileType:string;

    fileName:string;

    location:string;

    path:string;

    exists:boolean;

    action:string;
}


//===============================================================
// Page Cloning Model Field
//===============================================================

export interface PageCloningModelField
{
    name:string;

    type:string;

    category:string;

    required:boolean;
}


//===============================================================
// Page Cloning Source Analysis
//===============================================================

export interface PageCloningSourceAnalysis
{
    submenuId:number;

    submenuCode:string;

    submenuName:string;

    files:PageCloningSourceFile[];

    modelFields:PageCloningModelField[];
}