//===============================================================
// Console Dev Agent (development PC only)
// --------------------------------------------------------------
// Talks to Console_Studio\dev-agent\console-agent.js on
// http://127.0.0.1:4299 : Build & Restart / Restart the Console
// API from the footer. Only in the development build on
// localhost (the live Console never shows it).
//
// fetch (not HttpClient) : the login token is never sent to the
// agent.
//===============================================================

import { Injectable, signal } from '@angular/core';

import { environment } from '../environments/environment';

export type AgentState = 'idle' | 'stopping' | 'building' | 'starting' | 'running' | 'failed' | 'stopped';

export interface AgentError
{
    file: string;
    path: string;
    line: number;
    code: string;
    message: string;
}

export interface AgentStatus
{
    state: AgentState;
    action: '' | 'build-restart' | 'restart';
    step: string;
    startedAt: string | null;
    finishedAt: string | null;
    buildMs: number | null;
    errors: AgentError[];
    errorCount: number;
    warningCount: number;
    oldVersionRestarted: boolean;
    jobId: number;
    busy: boolean;
    running: boolean;
}

const AGENT = 'http://127.0.0.1:4299';

export interface DeployState
{
    busy: boolean;
    id: string;
    kind: '' | 'Deploy' | 'Switch back';
    by: string;
    phase: 'idle' | 'building' | 'uploading' | 'deploying' | 'succeeded' | 'failed' | 'rolledback';
    step: string;
    percent: number;
    release: string;
    startedAt: string | null;
    finishedAt: string | null;
    log: string[];
}

// one finished run in the history (dev-agent\deploy-history.json)
export interface DeployRun
{
    id: string;
    kind: 'Deploy' | 'Switch back';
    release: string;
    by: string;
    phase: DeployState['phase'];
    step: string;
    startedAt: string | null;
    finishedAt: string | null;
    lines?: number;
    log?: string[];
}

export interface LiveServer
{
    health:
    {
        agentVersion: string;
        machine: string;
        serverTime: string;
        diskFreeGb: number | null;
        serviceName: string;
        serviceStatus: string;
        appUrls: string;
        currentRelease: string;
        busy: boolean;
    };
    releases: { release: string; commit: string; deployedBy: string; createdAt: string; isCurrent: boolean }[];
}

@Injectable({ providedIn: 'root' })
export class DevAgentService
{
    // development build opened on this PC
    readonly enabled =
        !environment.production
        && ['localhost', '127.0.0.1'].includes(location.hostname);

    readonly status = signal<AgentStatus | null>(null);

    // null = not asked yet, false = agent not running
    readonly reachable = signal<boolean | null>(null);

    async refresh(): Promise<AgentStatus | null>
    {
        try
        {
            const r = await fetch(`${AGENT}/status`, { headers: { 'X-AppCore-Dev': '1' }, cache: 'no-store', signal: AbortSignal.timeout(3000) });

            if (!r.ok)
            {
                throw new Error();
            }

            const s = await r.json() as AgentStatus;

            this.status.set(s);
            this.reachable.set(true);

            return s;
        }
        catch
        {
            this.reachable.set(false);

            return null;
        }
    }

    //-----------------------------------------------------------
    // Deployments (Console page) : the agent builds, packs and sends
    // the release to the Deploy Agent on the live server
    //-----------------------------------------------------------

    async call<T>(method: 'GET' | 'POST', url: string, body?: unknown): Promise<T>
    {
        let r: Response;

        try
        {
            r = await fetch(`${AGENT}${url}`,
            {
                method,
                headers: body === undefined ? { 'X-AppCore-Dev': '1' } : { 'X-AppCore-Dev': '1', 'Content-Type': 'application/json' },
                body: body === undefined ? undefined : JSON.stringify(body),
                cache: 'no-store',
                signal: AbortSignal.timeout(30000)
            });
        }
        catch
        {
            this.reachable.set(false);

            throw new Error('The Console agent is not running : start the Console with start-console.cmd.');
        }

        const data = await r.json().catch(() => ({}));

        if (!r.ok)
        {
            throw new Error(data?.error || data?.message || `The agent answered ${r.status}`);
        }

        return data as T;
    }

    async start(action: 'build-restart' | 'restart'): Promise<boolean>
    {
        try
        {
            const r = await fetch(`${AGENT}/${action}`, { method: 'POST', headers: { 'X-AppCore-Dev': '1' }, signal: AbortSignal.timeout(5000) });

            return r.ok || r.status === 409;
        }
        catch
        {
            this.reachable.set(false);

            return false;
        }
    }
}
