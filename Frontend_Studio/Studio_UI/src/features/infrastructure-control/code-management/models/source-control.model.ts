/* ============================================================
   Source Control
============================================================ */

export interface SourceControl
{
    sourceControlId:
        number;

    repositoryCode:
        string;

    repositoryName:
        string;

    gitRemoteUrl:
        string;

    defaultBranch:
        string;

    repositoryPath:
        string;

    remarks:
        string | null;

    isActive:
        boolean;

    isDeleted:
        boolean;

    deletedBy:
        number | null;

    deletedDate:
        string | null;

    createdBy:
        number;

    createdDate:
        string;

    modifiedBy:
        number | null;

    modifiedDate:
        string | null;
}



/* ============================================================
   Create Source Control
============================================================ */

export interface CreateSourceControl
{
    repositoryCode:
        string;

    repositoryName:
        string;

    gitRemoteUrl:
        string;

    defaultBranch:
        string;

    repositoryPath:
        string;

    remarks:
        string | null;

    isActive:
        boolean;
}



/* ============================================================
   Update Source Control
============================================================ */

export interface UpdateSourceControl
{
    sourceControlId:
        number;

    repositoryCode:
        string;

    repositoryName:
        string;

    gitRemoteUrl:
        string;

    defaultBranch:
        string;

    repositoryPath:
        string;

    remarks:
        string | null;

    isActive:
        boolean;
}



/* ============================================================
   Source Control Defaults
============================================================ */

export interface SourceControlDefaults
{
    code:
        string;
}