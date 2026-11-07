//===============================================================
// Deployment Center Models
//
// A deployment (or rollback) to a server of Server Management.
// The API builds on this PC; the server's Deploy Agent backs up
// the database, installs the release and checks the live site.
//===============================================================


// Running / Succeeded / Failed / Rolled back
export type DeployStatus =
    'Running' | 'Succeeded' | 'Failed' | 'Rolled back';


export interface DeploymentCenter
{
    id: number;

    publicId: string;

    // R-0001
    code: string;

    name: string;

    serverManagementId: number;

    serverName: string;

    // Deploy / Rollback
    kind: string;

    deployStatus: string;

    step: string;

    percent: number;

    branch: string;

    commitHash: string;

    commitMessage: string;

    backupFile: string;

    previousRelease: string;

    packageMb: number;

    startedDate?: string | null;

    finishedDate?: string | null;

    durationSeconds: number;

    performedByName: string;

    remarks: string;

    // detail only
    log?: string | null;
}


// Live progress (polled every second while a job runs)
export interface DeploymentProgress
{
    publicId: string;

    code: string;

    kind: string;

    deployStatus: string;

    step: string;

    percent: number;

    finished: boolean;

    elapsedSeconds: number;

    log: string[];
}


// Git check before Deploy
export interface DeploymentPreflight
{
    ready: boolean;

    repositoryPath: string;

    branch: string;

    commitHash: string;

    commitMessage: string;

    ahead: number;

    behind: number;

    localChanges: number;

    nextRelease: string;

    runningPublicId?: string | null;

    problems: string[];
}


// A server to deploy to
export interface DeploymentServerOption
{
    publicId: string;

    code: string;

    name: string;

    environment: string;

    appUrl: string;

    lastCheckStatus: string;

    currentRelease: string;
}


// A release kept on a server
export interface ServerRelease
{
    release: string;

    commit: string;

    deployedBy: string;

    createdAt: string;

    isCurrent: boolean;
}


export interface StartDeployment
{
    serverPublicId: string;

    remarks: string;
}


export interface StartRollback
{
    serverPublicId: string;

    release: string;

    remarks: string;
}


export interface StartedJob
{
    id: number;

    publicId: string;

    code: string;
}
