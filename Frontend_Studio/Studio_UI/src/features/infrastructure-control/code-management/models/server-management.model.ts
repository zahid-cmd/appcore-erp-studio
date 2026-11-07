/* ============================================================
   Server Management
   ------------------------------------------------------------
   A live server the Deployment Center deploys to. It runs the
   AppCore Deploy Agent; the API talks to it at
   http://{hostAddress}:{agentPort} with the agent token.
   The token is never sent back : hasAgentToken says if one is
   saved.
============================================================ */

export const SERVER_ENVIRONMENTS:
    string[] =
    [
        'Production',
        'Staging'
    ];

export interface ServerManagement
{
    id: number;

    // The id used in links and API calls (uuid v7)
    publicId?: string;

    // SRV-0001 (given by the server)
    code: string;

    name: string;

    // Tailscale address or machine name (100.117.11.97)
    hostAddress: string;

    agentPort: number;

    hasAgentToken: boolean;

    // the address users open (http://100.117.11.97:8080)
    appUrl: string;

    environment: string;

    lastCheckedDate: string | null;

    // Online / Offline / Token rejected / Not configured
    lastCheckStatus: string;

    lastCheckMessage: string;

    agentVersion: string;

    currentRelease: string;

    status: boolean;

    remarks: string;
}


/* ============================================================
   Create / Update
   ------------------------------------------------------------
   agentToken : plain text from the form (the API encrypts it).
   On update, empty = keep the saved token.
============================================================ */

export interface CreateServerManagement
{
    name: string;

    hostAddress: string;

    agentPort: number;

    agentToken: string;

    appUrl: string;

    environment: string;

    status: boolean;

    remarks: string;
}

export interface UpdateServerManagement
    extends CreateServerManagement
{
    id: number;
}


/* ============================================================
   Defaults
============================================================ */

export interface ServerManagementDefaults
{
    code: string;

    agentPort: number;

    environments: string[];
}


/* ============================================================
   Test Connection result (agent health)
============================================================ */

export interface ServerConnectionTest
{
    status: string;

    success: boolean;

    message: string;

    checkedDate: string;

    responseMs: number;

    agentVersion: string;

    machine: string;

    diskFreeGb: number | null;

    baseFolder: string;

    serviceName: string;

    serviceStatus: string;

    appUrls: string;

    currentRelease: string;

    keepReleases: number;

    backupBeforeDeploy: boolean;

    pgDumpFound: boolean;

    busy: boolean;
}
