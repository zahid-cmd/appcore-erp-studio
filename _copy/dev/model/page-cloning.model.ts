//===========================================================
// Page Cloning
//===========================================================

export interface PageCloning
{
    PageCloningId:
        number;


    //===========================================================
    // Clone From (Source Submenu)
    //===========================================================

    CloneFromId:
        number;

    CloneFromCode:
        string;

    CloneFromName:
        string;


    //===========================================================
    // Clone To (Target Submenu)
    //===========================================================

    CloneToId:
        number;

    CloneToCode:
        string;

    CloneToName:
        string;


    //===========================================================
    // Blueprint
    //===========================================================

    EntityName:
        string;

    BlueprintJson:
        string;


    //===========================================================
    // Clone Run (server owned)
    //===========================================================

    NumberOfFiles:
        number;

    RunStatus:
        string;

    LastRunDate:
        string | null;

    BuildOutput:
        string;


    //===========================================================
    // Configuration
    //===========================================================

    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



//===========================================================
// Create Page Cloning
//===========================================================

export interface CreatePageCloning
{
    CloneFromId:
        number;

    CloneFromCode:
        string;

    CloneFromName:
        string;

    CloneToId:
        number;

    CloneToCode:
        string;

    CloneToName:
        string;

    EntityName:
        string;

    BlueprintJson:
        string;

    Remarks:
        string;

    IsActive:
        boolean;
}



//===========================================================
// Update Page Cloning
//===========================================================

export interface UpdatePageCloning
{
    PageCloningId:
        number;

    CloneFromId:
        number;

    CloneFromCode:
        string;

    CloneFromName:
        string;

    CloneToId:
        number;

    CloneToCode:
        string;

    CloneToName:
        string;

    EntityName:
        string;

    BlueprintJson:
        string;

    Remarks:
        string;

    IsActive:
        boolean;
}



//===========================================================
// Page Cloning Defaults
//===========================================================

export interface PageCloningDefaults
{
    NumberOfFiles:
        number;

    RunStatus:
        string;
}



//===========================================================
// Engine: File Change
//===========================================================

export interface PageCloningFileChange
{
    LogicalKey:
        string;

    Path:
        string;

    Before:
        string;

    After:
        string;

    EditedSinceBaseline:
        boolean;
}



//===========================================================
// Engine: Preview
//===========================================================

export interface PageCloningPreview
{
    PageCloningId:
        number;

    Files:
        PageCloningFileChange[];

    Warnings:
        string[];
}



//===========================================================
// Engine: Result
//===========================================================

export interface PageCloningResult
{
    Success:
        boolean;

    Messages:
        string[];

    BuildOutput:
        string;

    RunStatus:
        string;
}



//===========================================================
// Engine: Source Analysis
//===========================================================

export interface AnalysisFile
{
    Key:
        string;

    Path:
        string;

    Exists:
        boolean;
}

export interface AnalysisField
{
    Name:
        string;

    CsType:
        string;

    TsType:
        string;

    MaxLength:
        number | null;

    Required:
        boolean;

    Unique:
        boolean;

    Category:
        string;
}

export interface AnalysisParent
{
    ForeignKey:
        string;

    ParentEntity:
        string;
}

export interface EntityAnalysis
{
    SourceName:
        string;

    Entity:
        string;

    Table:
        string;

    Namespace:
        string;

    PrimaryKey:
        string;

    Files:
        AnalysisFile[];

    Fields:
        AnalysisField[];

    Parents:
        AnalysisParent[];

    ChildEntities:
        string[];

    CodeMethod:
        string;

    CodeFormat:
        string;

    Hints:
        string[];

    Errors:
        string[];
}