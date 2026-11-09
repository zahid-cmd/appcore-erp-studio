//===============================================================
// Deployment Center Models
//
// A deployment (or rollback) to a server of Server Management.
// The API builds on this PC; the server's Deploy Agent backs up
// the database, installs the release and checks the live site.
//===============================================================


// Draft / Running / Succeeded / Failed / Rolled back
export type DeployStatus =
    'Draft' | 'Running' | 'Succeeded' | 'Failed' | 'Rolled back';


export interface DeploymentCenter
{
    id: number;

    publicId: string;

    // R-0001
    code: string;

    name: string;

    serverManagementId: number;

    serverName: string;

    serverPublicId?: string | null;

    // Deploy / Rollback
    kind: string;

    deployStatus: string;

    step: string;

    percent: number;

    branch: string;

    commitHash: string;

    commitMessage: string;

    // what is in the release (one change per line)
    releaseNotes: string;

    // 1.4.2 ('' = before versions / not deployed yet)
    version: string;

    // Fix / Feature / Major
    changeType: string;

    // lines users see after the update
    whatsNew: string;

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


// New deployment : what the next release would contain
export interface DeploymentDraftDefaults
{
    nextRelease: string;

    branch: string;

    commitHash: string;

    commitMessage: string;

    ahead: number;

    behind: number;

    localChanges: number;

    lastRelease: string;

    lastCommit: string;

    releaseNotes: string;

    newCommits: number;

    // version : last on the server and the three choices
    lastVersion: string;

    nextFix: string;

    nextFeature: string;

    nextMajor: string;

    analysis: DeploymentAnalysis;

    problems: string[];
}


// Save a draft (New / Edit)
export interface SaveDeploymentDraft
{
    serverPublicId: string;

    name: string;

    releaseNotes: string;

    remarks: string;

    // Fix / Feature / Major
    changeType: string;

    whatsNew: string;

    // Edit : take the latest pushed commit
    updateCommit: boolean;
}


// what changed since the last deployment (Analyse changes)
export interface DeploymentAnalysis
{
    commits: string[];

    areas: DeploymentChangeArea[];

    databaseScripts: string[];

    filesChanged: number;

    whatsNewDraft: string;
}

export interface DeploymentChangeArea
{
    name: string;

    // Screen / Server
    side: string;

    files: number;
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


// Can this copy of the app deploy? (only the development PC)
export interface DeploymentCapabilities
{
    canDeploy: boolean;

    reason: string;

    machine: string;
}
