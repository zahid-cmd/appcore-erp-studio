//===============================================================
// Dev Agent (development PC only)
// --------------------------------------------------------------
// Talks to Backend_Studio\dev-agent\dev-agent.js on
// http://127.0.0.1:4199 : Build & Restart / Restart the API from
// the footer. Only used in the development build, on localhost,
// by developer users (the footer checks all three).
//
// fetch (not HttpClient) : the auth interceptor must not send
// the login token to the agent.
//===============================================================

import
{
    Injectable
}
from '@angular/core';

import
{
    environment
}
from '../../environments/environment';


export type DevAgentState =
    'idle' | 'stopping' | 'building' | 'starting' | 'running' | 'failed' | 'stopped';

export interface DevAgentError
{
    file: string;

    path: string;

    line: number;

    code: string;

    message: string;
}

export interface DevAgentStatus
{
    state: DevAgentState;

    action: '' | 'build-restart' | 'restart';

    step: string;

    startedAt: string | null;

    finishedAt: string | null;

    buildMs: number | null;

    errors: DevAgentError[];

    errorCount: number;

    warningCount: number;

    oldVersionRestarted: boolean;

    jobId: number;

    busy: boolean;

    running: boolean;
}


const AGENT_URL =
    'http://127.0.0.1:4199';

const HEADERS =
{
    'X-AppCore-Dev': '1'
};


@Injectable(
{
    providedIn: 'root'
})
export class DevAgentService
{
    // Development build opened on this PC
    readonly available =
        !environment.production
        &&
        typeof window !== 'undefined'
        &&
        ['localhost', '127.0.0.1'].includes(window.location.hostname);

    async status(): Promise<DevAgentStatus | null>
    {
        try
        {
            const response =
                await fetch(
                    `${AGENT_URL}/status`,
                    {
                        headers: HEADERS,
                        cache: 'no-store',
                        signal: AbortSignal.timeout(2500)
                    }
                );

            return response.ok
                ? await response.json() as DevAgentStatus
                : null;
        }
        catch
        {
            // agent not running
            return null;
        }
    }

    // 'build-restart' | 'restart' : true when the agent took the job
    async start(action: 'build-restart' | 'restart'): Promise<{ ok: boolean; jobId: number; error: string }>
    {
        try
        {
            const response =
                await fetch(
                    `${AGENT_URL}/${action}`,
                    {
                        method: 'POST',
                        headers: HEADERS,
                        signal: AbortSignal.timeout(4000)
                    }
                );

            const body =
                await response.json().catch(() => ({}));

            return response.status === 202
                ? { ok: true, jobId: Number(body?.jobId ?? 0), error: '' }
                : { ok: false, jobId: 0, error: String(body?.error ?? 'The agent refused the job') };
        }
        catch
        {
            return { ok: false, jobId: 0, error: 'The dev agent is not running' };
        }
    }

    // The API answers its health check (used before the UI reload)
    async apiHealthy(): Promise<boolean>
    {
        try
        {
            const response =
                await fetch(
                    `${environment.apiUrl}/platform/health`,
                    {
                        cache: 'no-store',
                        signal: AbortSignal.timeout(3000)
                    }
                );

            return response.ok;
        }
        catch
        {
            return false;
        }
    }
}
