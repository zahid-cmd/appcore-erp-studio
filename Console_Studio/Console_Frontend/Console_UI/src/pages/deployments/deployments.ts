//===============================================================
// Operations > Deployments
// --------------------------------------------------------------
// A list of every run (Deploy to live / Switch back), newest first.
// A row opens its details and full log inside the same page.
//
// One click sends the Console + website to the live server :
// the Console agent on this PC (Console_Studio\dev-agent) builds
// the website and the Console (production) and the API (dotnet
// publish), packs them and hands the package to the Deploy Agent
// on skyhost. The server backs up AppCore_Control, installs the
// release, restarts AppCoreConsole and goes back to the previous
// release by itself if the new one does not answer.
// The history is kept on this PC (dev-agent\deploy-history.json);
// releases found on the server from before the history show
// without a log. Only from the development PC (the agent runs there).
//===============================================================

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { DeployRun, DeployState, DevAgentService, LiveServer, ServerSecurityInfo } from '../../core/dev-agent.service';
import { PageCanvas } from '../../ui/page-canvas';
import { PageHeader } from '../../ui/page-header';
import { Pagination, pageSlice } from '../../ui/pagination';
import { SelectBox, SelectOption } from '../../ui/select-box';
import { ToastService } from '../../ui/toast';

interface Row extends DeployRun
{
    running: boolean;
    noLog: boolean;
}

@Component({
    selector: 'ac-deployments',
    imports: [FormsModule, DatePipe, PageHeader, PageCanvas, Pagination, SelectBox],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ac-page', '(document:keydown.escape)': 'onEscape()' },
    styles: [`
        .dp-note { margin: 16px; padding: 14px 16px; border-radius: 12px; background: var(--ac-hover); color: var(--ac-text-2); font-size: 13px; line-height: 1.6; }
        .dp-rel { font-family: var(--ac-mono-font); font-weight: 700; }
        .dp-live { margin-left: 8px; padding: 2px 8px; border-radius: 999px; background: var(--ac-green-soft); color: var(--ac-green); font-family: inherit; font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; }
        .dp-kind { display: inline-flex; align-items: center; gap: 7px; }
        .dp-kind i { color: var(--ac-faint); }
        .st { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; white-space: nowrap; }
        .st-ok { background: var(--ac-green-soft); color: var(--ac-green); }
        .st-bad { background: var(--ac-red-soft); color: var(--ac-red); }
        .st-warn { background: var(--ac-amber-soft); color: var(--ac-amber); }
        .st-run { background: var(--ac-accent-soft); color: var(--ac-accent); }

        /* details */
        .dt-bar { display: flex; flex: 1; flex-wrap: wrap; align-items: center; gap: 12px; min-width: 0; }
        .dt-title { display: flex; align-items: center; gap: 10px; color: var(--ac-text); font-size: 15px; font-weight: 800; }
        .dt { display: flex; flex: 1; flex-direction: column; gap: 14px; min-height: 0; padding: 16px; }
        .dt-facts { display: grid; flex: none; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
        .dt-fact { padding: 10px 12px; border: 1px solid var(--ac-border-2); border-radius: 12px; }
        .dt-fact span { display: block; color: var(--ac-muted); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
        .dt-fact b { display: block; margin-top: 3px; color: var(--ac-text); font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }
        .dt-step { display: flex; flex: none; align-items: center; gap: 10px; color: var(--ac-text); font-weight: 700; }
        .dt-step.good { color: var(--ac-green); }
        .dt-step.bad { color: var(--ac-red); }
        .dt-step.warn { color: var(--ac-amber); }
        .dt-prog { flex: none; height: 8px; border-radius: 999px; background: var(--ac-hover); overflow: hidden; }
        .dt-prog span { display: block; height: 100%; border-radius: 999px; background: var(--ac-brand); transition: width 0.4s; }
        .dt-log { flex: 1; min-height: 160px; margin: 0; padding: 12px 14px; border-radius: 12px; background: #111317; color: #c9cbd1; font-family: var(--ac-mono-font); font-size: 11.5px; line-height: 1.6; overflow: auto; white-space: pre-wrap; }
        .dt-dim { color: #6f737c; }
        .dt-sum { padding: 10px 16px; color: var(--ac-muted); font-size: 12.5px; }

        /* server pop-up */
        .sv-kv { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px 16px; font-size: 13px; }
        .sv-kv span { color: var(--ac-muted); }
        .sv-kv b { color: var(--ac-text); font-weight: 600; overflow-wrap: anywhere; }
        .sv-err { color: var(--ac-red); font-size: 13px; }
        .cf { display: flex; gap: 12px; padding: 14px 16px; border-radius: 12px; background: var(--ac-amber-soft); color: var(--ac-amber); font-weight: 600; line-height: 1.5; }
        .cf i { margin-top: 3px; }

        /* server security pop-up */
        .sec { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; }
        .sec-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
        .sec-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .sec-btns .ac-btn { justify-content: center; }
        .sec-list { max-height: 84px; margin: 0; padding: 8px 10px; border: 1px solid var(--ac-border-2); border-radius: 10px; font-family: var(--ac-mono-font); font-size: 11px; line-height: 1.6; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; }
        .sec-log { flex: none; min-height: 0; max-height: 120px; }
        .sec-note { color: var(--ac-muted); font-size: 12px; line-height: 1.5; }
        @media (max-width: 900px) { .sec { grid-template-columns: minmax(0, 1fr); } }
        @media (max-width: 1100px) { .dt-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    `],
    template: `
        <ac-page-header icon="fas fa-rocket" eyebrow="Operations" title="Deployments"
            subtitle="Send the Console and the website to the live server in one click">
            <ng-container pageHeaderRight>
            @if (agent.enabled)
            {
                @if (selected())
                {
                    <button class="ac-btn" type="button" (click)="closeRun()" title="Back to the list (Esc)"><i class="fas fa-arrow-left"></i> Back to list</button>
                }
                <button class="ac-btn" type="button" (click)="serverOpen.set(true)"><i class="fas fa-server"></i> Live server</button>
                @if (isOwner)
                {
                <button class="ac-btn" type="button" (click)="openSecurity()"><i class="fas fa-shield-halved"></i> Server security</button>
                }
                @if (mayDeploy)
                {
                <button class="ac-btn ac-btn-primary" type="button" [disabled]="busy() || !server()" (click)="confirming.set(true)"
                    [title]="server() ? '' : 'The live server is not connected : open Live server'"><i class="fas fa-rocket"></i> Deploy to live</button>
                }
            }
            </ng-container>
        </ac-page-header>

        <ac-page-canvas>
            <ng-container canvasToolbar>
                @if (agent.enabled)
                {
                    @if (selected(); as r)
                    {
                    <button class="ac-btn" type="button" (click)="closeRun()" title="Back to the list (Esc)"><i class="fas fa-arrow-left"></i> All deployments</button>
                    <div class="dt-bar">
                        <span class="dt-title">
                            <i class="fas" [class.fa-rocket]="r.kind === 'Deploy'" [class.fa-rotate-left]="r.kind !== 'Deploy'"></i>
                            {{ r.kind }}{{ r.release ? ' : ' + r.release : '' }}
                            @if (isLive(r)) { <span class="dp-live">LIVE</span> }
                        </span>
                        <span [class]="'st ' + statusClass(r)">{{ statusText(r) }}</span>
                    </div>
                    @if (mayDeploy && canSwitchBack(r))
                    {
                        <button class="ac-btn" type="button" [disabled]="busy()" (click)="switchingBack.set(r.release)" title="Make this release live again"><i class="fas fa-rotate-left"></i> Switch back to {{ r.release }}</button>
                    }
                }
                    @else
                    {
                    <div class="ac-search">
                        <i class="fas fa-magnifying-glass"></i>
                        <input class="ac-input" placeholder="Release, step or person" [ngModel]="search()" (ngModelChange)="search.set($event); page.set(1)">
                    </div>
                    <ac-select-box style="width:170px" [options]="statusOptions" [value]="status()" (valueChange)="status.set($any($event)); page.set(1)" />
                    <ac-select-box style="width:160px" [options]="kindOptions" [value]="kind()" (valueChange)="kind.set($any($event)); page.set(1)" />
                    <button class="ac-btn ac-btn-icon" type="button" title="Reload" (click)="reload()"><i class="fas fa-rotate" [class.fa-spin]="loading()"></i></button>
                }
                }
            </ng-container>

            @if (!agent.enabled)
            {
                <div class="dp-note">
                    Deployments run from the development PC : open the Console there (<b>start-console.cmd</b>, http://localhost:4300) and use this page.
                    The live Console cannot build itself.
                </div>
            }
            @else if (selected(); as r)
            {
                <!-- ============ one run ============ -->
                <div class="dt">
                    <div class="dt-facts">
                        <div class="dt-fact"><span>Started</span><b>{{ r.startedAt ? (r.startedAt | date: 'd MMM y, HH:mm:ss') : '-' }}</b></div>
                        <div class="dt-fact"><span>Finished</span><b>{{ r.running ? 'running' : r.finishedAt ? (r.finishedAt | date: 'HH:mm:ss') : '-' }}</b></div>
                        <div class="dt-fact"><span>Took</span><b>{{ took(r) }}</b></div>
                        <div class="dt-fact"><span>By</span><b>{{ r.by || '-' }}</b></div>
                        <div class="dt-fact"><span>Release</span><b class="ac-mono">{{ r.release || 'not packed yet' }}</b></div>
                    </div>

                    <div class="dt-step" [class.good]="r.phase === 'succeeded'" [class.bad]="r.phase === 'failed'" [class.warn]="r.phase === 'rolledback'">
                        @if (r.running) { <i class="fas fa-spinner fa-spin"></i> }
                        @else if (r.phase === 'succeeded') { <i class="fas fa-circle-check"></i> }
                        @else if (r.phase === 'rolledback') { <i class="fas fa-rotate-left"></i> }
                        @else { <i class="fas fa-circle-xmark"></i> }
                        <span>{{ r.step || statusText(r) }}</span>
                    </div>

                    @if (r.running) { <div class="dt-prog"><span [style.width.%]="state()?.percent ?? 0"></span></div> }

                    <!-- always the black log panel; a note in grey when there is no log -->
                    <pre class="dt-log ac-scroll">@if (r.noLog || runLoading() || !logText()) {<span class="dt-dim">{{ placeholder(r) }}</span>} @else {<span>{{ logText() }}</span>}</pre>
                </div>
            }
            @else
            {
                <!-- ============ the list ============ -->

                @if (serverError())
                {
                    <div class="ac-error" style="margin:12px">Live server : {{ serverError() }} <a href="" (click)="$event.preventDefault(); serverOpen.set(true)">Open Live server</a></div>
                }

                <table class="ac-table">
                    <thead><tr><th>Release</th><th>Type</th><th>Status</th><th>Started</th><th>Took</th><th>By</th><th>Last step</th></tr></thead>
                    <tbody>
                        @for (r of pageRows(); track r.id)
                        {
                            <tr class="ac-click" (click)="openRun(r)">
                                <td><span class="dp-rel">{{ r.release || '-' }}</span>@if (isLive(r)) { <span class="dp-live">LIVE</span> }</td>
                                <td><span class="dp-kind"><i class="fas" [class.fa-rocket]="r.kind === 'Deploy'" [class.fa-rotate-left]="r.kind !== 'Deploy'"></i>{{ r.kind }}</span></td>
                                <td><span [class]="'st ' + statusClass(r)">@if (r.running) { <i class="fas fa-spinner fa-spin"></i> }{{ statusText(r) }}</span></td>
                                <td>{{ r.startedAt ? (r.startedAt | date: 'd MMM y, HH:mm') : '-' }}</td>
                                <td>{{ took(r) }}</td>
                                <td>{{ r.by || '-' }}</td>
                                <td class="ac-sub" style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ r.noLog ? 'On the server (before the history)' : r.step }}</td>
                            </tr>
                        }
                    </tbody>
                </table>

                @if (!pageRows().length)
                {
                    <div class="ac-empty-fill">
                        <span class="ac-empty-icon"><i class="fas" [class.fa-spinner]="loading()" [class.fa-spin]="loading()" [class.fa-rocket]="!loading()"></i></span>
                        <b>{{ loading() ? 'Loading deployments' : rows().length ? 'No match' : 'No deployments yet' }}</b>
                        <span>{{ loading() ? 'One moment...' : rows().length ? 'No deployment matches the search or filter.' : 'Send the first release with Deploy to live.' }}</span>
                    </div>
                }

            }

            <ng-container canvasFooter>
                @if (agent.enabled)
                {
                    @if (selected(); as r)
                    {
                        <div class="dt-sum">{{ r.noLog ? 'No log' : (selectedLog().length + ' log lines') }} : run {{ r.id }}</div>
                    }
                    @else
                    {
                    <ac-pagination noun="deployments" [total]="filtered().length" [page]="page()" [size]="size()"
                    (pageChange)="page.set($event)" (sizeChange)="size.set($event); page.set(1)" />
                    }
                }
            </ng-container>
        </ac-page-canvas>

        <!-- ============ confirm deploy ============ -->
        @if (confirming())
        {
            <div class="ac-backdrop">
                <div class="ac-modal" style="max-width:520px">
                    <div class="ac-modal-head">
                        <i class="fas fa-rocket"></i>
                        <h3>Deploy to live</h3>
                        <button class="ac-icon-btn" type="button" (click)="confirming.set(false)"><i class="fas fa-xmark"></i></button>
                    </div>
                    <div class="ac-modal-body">
                        <p class="ac-sub" style="line-height:1.6">Builds the website and the Console from this PC, backs up AppCore_Control on the server, installs the new release and checks it. If it does not start, the server goes back to the previous release by itself.</p>
                        <div class="cf"><i class="fas fa-triangle-exclamation"></i><span>The live website and Console restart for about 15 seconds.</span></div>
                    </div>
                    <div class="ac-modal-foot">
                        <button class="ac-btn" type="button" (click)="confirming.set(false)">Cancel</button>
                        <button class="ac-btn ac-btn-primary" type="button" (click)="deployNow()"><i class="fas fa-check"></i> Yes, deploy now</button>
                    </div>
                </div>
            </div>
        }

        <!-- ============ confirm switch back ============ -->
        @if (switchingBack(); as release)
        {
            <div class="ac-backdrop">
                <div class="ac-modal" style="max-width:520px">
                    <div class="ac-modal-head">
                        <i class="fas fa-rotate-left"></i>
                        <h3>Switch back to {{ release }}</h3>
                        <button class="ac-icon-btn" type="button" (click)="switchingBack.set(null)"><i class="fas fa-xmark"></i></button>
                    </div>
                    <div class="ac-modal-body">
                        <p class="ac-sub" style="line-height:1.6">Makes the older release <b>{{ release }}</b> live again. The files of that release are used as they were; the database is not changed back.</p>
                        <div class="cf"><i class="fas fa-triangle-exclamation"></i><span>Everyone on the live website and Console gets this older version at once (a restart of about 15 seconds).</span></div>
                    </div>
                    <div class="ac-modal-foot">
                        <button class="ac-btn" type="button" (click)="switchingBack.set(null)">Cancel</button>
                        <button class="ac-btn ac-btn-primary" type="button" (click)="rollback(release)"><i class="fas fa-check"></i> Yes, switch back</button>
                    </div>
                </div>
            </div>
        }

        <!-- ============ server security (Owner) ============ -->
        @if (secOpen())
        {
            <div class="ac-backdrop">
                <div class="ac-modal" style="max-width:880px">
                    <div class="ac-modal-head">
                        <i class="fas fa-shield-halved"></i>
                        <h3>Server security</h3>
                        <button class="ac-icon-btn" type="button" (click)="closeSecurity()"><i class="fas fa-xmark"></i></button>
                    </div>
                    <div class="ac-modal-body">
                        @if (secAsk(); as ask)
                        {
                            <p class="ac-sub" style="line-height:1.6"><b>{{ ask.title }}</b></p>
                            <div class="cf"><i class="fas fa-triangle-exclamation"></i><span>{{ ask.text }}</span></div>
                        }
                        @else if (sec(); as sc)
                        {
                            <div class="sec">
                                <div class="sec-col">
                                    <span class="ac-section-label">Services and folders</span>
                                    <div class="sv-kv">
                                        @for (sv of sc.services; track sv.name)
                                        {
                                            <span>{{ sv.name }}</span><b>{{ sv.account }}</b>
                                        }
                                        <span>{{ sc.folder }}</span><b>{{ sc.foldersLocked === null ? 'not known' : sc.foldersLocked ? 'closed to other Windows users' : 'open (as installed)' }}</b>
                                    </div>
                                    @if (!sc.scriptFound) { <p class="sv-err">secure-services.cmd is not on the server : install the Deploy Agent again.</p> }
                                    <div class="sec-btns">
                                        <button class="ac-btn" type="button" [disabled]="secBusy() || !sc.scriptFound" (click)="askStep('console')">1. Console account</button>
                                        <button class="ac-btn" type="button" [disabled]="secBusy() || !sc.scriptFound" (click)="askStep('erp')">2. ERP account</button>
                                        <button class="ac-btn" type="button" [disabled]="secBusy() || !sc.scriptFound" (click)="askStep('lock')">3. Lock folders</button>
                                        <button class="ac-btn" type="button" [disabled]="secBusy() || !sc.scriptFound" (click)="askStep('back')"><i class="fas fa-rotate-left"></i> Put everything back</button>
                                    </div>
                                    <p class="sec-note">One step at a time, at a quiet hour. After each step sign in to the live site and try it.</p>
                                </div>
                                <div class="sec-col">
                                    <span class="ac-section-label">ERP : work with no company</span>
                                    @if (!sc.noCompany.fileFound)
                                    {
                                        <p class="sec-note">The live ERP has not written its list yet. It starts with the next ERP deployment.</p>
                                    }
                                    <div class="sv-kv">
                                        <span>In use</span><b>{{ sc.noCompany.inUse || 'not known' }}{{ sc.noCompany.setByAgent ? ' (set here : ' + sc.noCompany.setByAgent + ')' : '' }}</b>
                                        <span>Clean days</span><b>{{ sc.noCompany.cleanDays ?? '-' }} of {{ sc.noCompany.needDays }}</b>
                                        <span>Asked, last 7 days</span><b>{{ sc.noCompany.last7Days }}</b>
                                        <span>By itself</span><b>{{ sc.noCompany.auto ? 'yes : Refuse after ' + sc.noCompany.needDays + ' clean days, at ' + sc.noCompany.autoHour + ':00 server time' : 'no' }}</b>
                                    </div>
                                    @if (sc.noCompany.note) { <p class="sec-note">{{ sc.noCompany.note }}</p> }
                                    @if (sc.noCompany.callers.length)
                                    {
                                        <pre class="sec-list ac-scroll">{{ callersText(sc) }}</pre>
                                    }
                                    <div class="sec-btns">
                                        <button class="ac-btn" type="button" [disabled]="secBusy()" (click)="askMode('Refuse')">Refuse from now</button>
                                        <button class="ac-btn" type="button" [disabled]="secBusy()" (click)="askMode('Warn')">Back to Warn</button>
                                        @if (!sc.noCompany.auto)
                                        {
                                            <button class="ac-btn" type="button" [disabled]="secBusy()" (click)="askMode('Auto')" style="grid-column:1 / -1">Let the agent switch by itself</button>
                                        }
                                    </div>
                                </div>
                            </div>
                            @if (sc.lastJob; as job)
                            {
                                <div class="dt-step" [class.good]="job.status === 'succeeded'" [class.bad]="job.status === 'failed'" [class.warn]="job.status === 'rolledback'">
                                    @if (job.status === 'running') { <i class="fas fa-spinner fa-spin"></i> }
                                    <span>{{ job.kind === 'security' ? 'Step ' + job.release : 'NoCompany ' + job.release }} : {{ job.step }}</span>
                                </div>
                                <pre class="dt-log sec-log ac-scroll">{{ job.log.join('\n') }}</pre>
                            }
                        }
                        @else if (secError()) { <p class="sv-err">{{ secError() }}</p> }
                        @else { <p class="ac-sub">Asking the server ...</p> }
                    </div>
                    <div class="ac-modal-foot">
                        @if (secAsk(); as ask)
                        {
                            <span style="flex:1"></span>
                            <button class="ac-btn" type="button" (click)="secAsk.set(null)">Cancel</button>
                            <button class="ac-btn ac-btn-primary" type="button" (click)="runSecurity(ask)"><i class="fas fa-check"></i> Yes, do it</button>
                        }
                        @else
                        {
                            <button class="ac-btn" type="button" (click)="loadSecurity()"><i class="fas fa-rotate"></i> Refresh</button>
                            <span style="flex:1"></span>
                            <button class="ac-btn" type="button" (click)="closeSecurity()">Close</button>
                        }
                    </div>
                </div>
            </div>
        }

        <!-- ============ live server ============ -->
        @if (serverOpen())
        {
            <div class="ac-backdrop">
                <div class="ac-modal" style="max-width:560px">
                    <div class="ac-modal-head">
                        <i class="fas fa-server"></i>
                        <h3>Live server</h3>
                        <button class="ac-icon-btn" type="button" (click)="serverOpen.set(false)"><i class="fas fa-xmark"></i></button>
                    </div>
                    <div class="ac-modal-body">
                        <span class="ac-section-label">Status</span>
                        @if (server(); as sv)
                        {
                            <div class="sv-kv">
                                <span>Server</span><b>{{ sv.health.machine }}</b>
                                <span>Service</span><b>{{ sv.health.serviceName }} : {{ sv.health.serviceStatus }}</b>
                                <span>Live release</span><b>{{ sv.health.currentRelease || 'manual install (no release yet)' }}</b>
                                <span>Releases kept</span><b>{{ sv.releases.length }}</b>
                                <span>Disk free</span><b>{{ sv.health.diskFreeGb ?? '?' }} GB</b>
                                <span>Agent</span><b>v{{ sv.health.agentVersion }}</b>
                            </div>
                        }
                        @else if (serverError()) { <p class="sv-err">{{ serverError() }}</p> }
                        @else { <p class="ac-sub">Asking the server ...</p> }

                        <span class="ac-section-label">Connection</span>
                        <div class="ac-field">
                            <label>Deploy Agent address (Tailscale)</label>
                            <input class="ac-input" [(ngModel)]="agentUrl" placeholder="http://100.117.11.97:5099">
                        </div>
                        <div class="ac-field">
                            <label>Agent token {{ hasToken() ? '(saved : leave empty to keep)' : '' }}</label>
                            <input class="ac-input" type="password" [(ngModel)]="token" autocomplete="off" placeholder="the Agent:Token of the server">
                        </div>
                        <p class="ac-hint">Kept on this PC only (Console_Studio\\dev-agent\\deploy.json). Same token as the ERP's Server Management.</p>
                    </div>
                    <div class="ac-modal-foot">
                        <button class="ac-btn" type="button" (click)="loadServer()"><i class="fas fa-rotate"></i> Refresh</button>
                        <span style="flex:1"></span>
                        <button class="ac-btn" type="button" (click)="serverOpen.set(false)">Close</button>
                        @if (mayDeploy)
                        {
                        <button class="ac-btn ac-btn-primary" type="button" (click)="saveConnection()"><i class="fas fa-floppy-disk"></i> Save</button>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class DeploymentsPage implements OnInit
{
    readonly agent = inject(DevAgentService);
    private readonly auth = inject(AuthService);
    private readonly toast = inject(ToastService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    // ?run=<id> : the open run is in the address, so the browser's
    // Back button returns to the list too
    readonly run = input<string>();

    readonly statusOptions: SelectOption[] =
    [
        { value: '', label: 'All statuses', icon: 'fas fa-layer-group' },
        { value: 'running', label: 'Running' },
        { value: 'succeeded', label: 'Succeeded' },
        { value: 'rolledback', label: 'Rolled back' },
        { value: 'failed', label: 'Failed' }
    ];

    readonly kindOptions: SelectOption[] =
    [
        { value: '', label: 'All types', icon: 'fas fa-layer-group' },
        { value: 'Deploy', label: 'Deploy' },
        { value: 'Switch back', label: 'Switch back' }
    ];

    // the release "Switch back" was pressed on : asked before it runs
    readonly switchingBack = signal<string | null>(null);

    // Owner and Developer only (the dev agent checks it again)
    get mayDeploy(): boolean
    {
        return this.auth.hasRole('OWNER', 'DEVELOPER');
    }

    // Server security : the Owner only (the dev agent checks it again)
    get isOwner(): boolean
    {
        return this.auth.hasRole('OWNER');
    }

    readonly secOpen = signal(false);
    readonly sec = signal<ServerSecurityInfo | null>(null);
    readonly secError = signal<string | null>(null);
    readonly secAsk = signal<{ title: string; text: string; url: string; body: Record<string, string> } | null>(null);

    private secTimer: ReturnType<typeof setInterval> | null = null;

    // a step is running on the server, or a deployment here
    readonly secBusy = computed(() => this.busy() || this.sec()?.busy === true || this.sec()?.lastJob?.status === 'running');

    readonly state = signal<DeployState | null>(null);
    readonly history = signal<DeployRun[]>([]);
    readonly server = signal<LiveServer | null>(null);
    readonly serverError = signal<string | null>(null);
    readonly busy = signal(false);
    readonly loading = signal(false);
    readonly confirming = signal(false);
    readonly serverOpen = signal(false);
    readonly hasToken = signal(false);

    readonly search = signal('');
    readonly status = signal('');
    readonly kind = signal('');
    readonly page = signal(1);
    readonly size = signal(20);

    // the open run (details inside the page)
    readonly openId = signal<string | null>(null);
    readonly openLog = signal<string[]>([]);
    readonly runLoading = signal(false);

    agentUrl = '';
    token = '';

    private timer: ReturnType<typeof setInterval> | null = null;

    // history + the run going on now + server releases from before the history
    readonly rows = computed<Row[]>(() =>
    {
        const st = this.state();
        const list: Row[] = this.history().map(h => ({ ...h, running: false, noLog: false }));

        if (st && st.busy && st.id && !list.some(x => x.id === st.id))
        {
            list.unshift({ id: st.id, kind: st.kind || 'Deploy', release: st.release, by: st.by, phase: st.phase, step: st.step, startedAt: st.startedAt, finishedAt: null, running: true, noLog: false });
        }

        const known = new Set(list.filter(x => x.kind === 'Deploy').map(x => x.release));

        for (const r of this.server()?.releases ?? [])
        {
            if (!known.has(r.release))
            {
                list.push({ id: 'server-' + r.release, kind: 'Deploy', release: r.release, by: r.deployedBy, phase: 'succeeded', step: '', startedAt: r.createdAt, finishedAt: null, running: false, noLog: true });
            }
        }

        return list.sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''));
    });

    readonly filtered = computed(() =>
    {
        const q = this.search().trim().toLowerCase();
        const s = this.status();
        const k = this.kind();

        return this.rows().filter(r =>
            (!s || (s === 'running' ? r.running : !r.running && r.phase === s))
            && (!k || r.kind === k)
            && (!q || [r.release, r.by, r.step, r.id].some(x => (x ?? '').toLowerCase().includes(q))));
    });

    readonly pageRows = computed(() => pageSlice(this.filtered(), this.page(), this.size()));

    readonly selected = computed(() =>
    {
        const id = this.openId();

        return id ? this.rows().find(r => r.id === id) ?? null : null;
    });

    // the running run's log comes live from the status
    readonly selectedLog = computed(() =>
    {
        const r = this.selected();
        const st = this.state();

        return r?.running && st?.id === r.id ? st.log : this.openLog();
    });

    readonly logText = computed(() => this.selectedLog().join('\n'));

    // the newest succeeded run of the live release carries the LIVE mark
    private readonly liveRowId = computed(() =>
    {
        const current = this.server()?.health.currentRelease;

        return current ? this.rows().find(r => r.release === current && !r.running && r.phase === 'succeeded')?.id ?? null : null;
    });

    constructor()
    {
        inject(DestroyRef).onDestroy(() => { this.stopPolling(); this.stopSecurity(); });

        effect(() =>
        {
            const id = this.run() || null;

            untracked(() => void this.showRun(id));
        });
    }

    onEscape(): void
    {
        if (this.selected() && !this.confirming() && !this.serverOpen() && !this.secOpen())
        {
            this.closeRun();
        }
    }

    async ngOnInit(): Promise<void>
    {
        if (!this.agent.enabled)
        {
            return;
        }

        this.loading.set(true);

        try
        {
            const cfg = await this.agent.call<{ agentUrl: string; hasToken: boolean }>('GET', '/deploy/settings');

            this.agentUrl = cfg.agentUrl;
            this.hasToken.set(cfg.hasToken);
        }
        catch (e)
        {
            this.serverError.set((e as Error).message);
            this.loading.set(false);
            return;
        }

        await Promise.all([this.loadState(), this.loadHistory(), this.loadServer()]);

        this.loading.set(false);

        if (this.busy())
        {
            const id = this.state()?.id;

            if (id && !this.run())
            {
                void this.router.navigate([], { relativeTo: this.route, queryParams: { run: id }, replaceUrl: true });
            }

            this.startPolling();
        }
    }

    async reload(): Promise<void>
    {
        this.loading.set(true);

        await Promise.all([this.loadState(), this.loadHistory(), this.loadServer()]);

        this.loading.set(false);
    }

    openRun(r: Row): void
    {
        void this.router.navigate([], { relativeTo: this.route, queryParams: { run: r.id } });
    }

    closeRun(): void
    {
        void this.router.navigate([], { relativeTo: this.route, queryParams: { run: null } });
    }

    private async showRun(id: string | null): Promise<void>
    {
        this.openId.set(id);
        this.openLog.set([]);

        const st = this.state();

        if (!id || id.startsWith('server-') || (st?.busy && st.id === id))
        {
            return;
        }

        this.runLoading.set(true);

        try
        {
            const run = await this.agent.call<DeployRun>('GET', '/deploy/history/' + encodeURIComponent(id));

            if (this.openId() === id)
            {
                this.openLog.set(run.log ?? []);
            }
        }
        catch (e)
        {
            if (this.openId() === id)
            {
                this.toast.error((e as Error).message);
            }
        }
        finally
        {
            this.runLoading.set(false);
        }
    }

    // the grey note shown in the log panel when there is no log to show
    placeholder(r: Row): string
    {
        const when = r.startedAt ? new Date(r.startedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

        if (r.noLog)
        {
            return [
                `${r.release} : deployed ${when}${r.by ? ' by ' + r.by : ''}.`,
                '',
                'The log of this release was not kept : it went live before this PC',
                'started keeping the deployment history (every run from now on keeps its log).',
                '',
                this.isLive(r) ? `${r.release} is the live release.` : `The server still has ${r.release} : Switch back makes it live again.`
            ].join('\n');
        }

        if (this.runLoading())
        {
            return 'Loading the log ...';
        }

        return r.running ? 'Starting ...' : 'This run has no log lines.';
    }

    isLive(r: Row): boolean
    {
        return r.id === this.liveRowId();
    }

    canSwitchBack(r: Row): boolean
    {
        const sv = this.server();

        return !!sv && !r.running && r.phase === 'succeeded' && !!r.release
            && r.release !== sv.health.currentRelease
            && sv.releases.some(x => x.release === r.release);
    }

    statusText(r: Row): string
    {
        if (r.running)
        {
            return 'Running';
        }

        return r.phase === 'succeeded' ? (r.kind === 'Deploy' ? 'Deployed' : 'Switched back')
            : r.phase === 'rolledback' ? 'Rolled back'
            : r.phase === 'failed' ? 'Failed'
            : 'Stopped';
    }

    statusClass(r: Row): string
    {
        return r.running ? 'st-run' : r.phase === 'succeeded' ? 'st-ok' : r.phase === 'rolledback' ? 'st-warn' : 'st-bad';
    }

    took(r: Row): string
    {
        if (!r.startedAt || (!r.finishedAt && !r.running))
        {
            return '-';
        }

        const end = r.finishedAt ? new Date(r.finishedAt).getTime() : Date.now();
        const sec = Math.max(0, Math.round((end - new Date(r.startedAt).getTime()) / 1000));

        return sec < 60 ? `${sec} s` : `${Math.floor(sec / 60)} min ${sec % 60} s`;
    }

    async loadServer(): Promise<void>
    {
        this.serverError.set(null);

        try
        {
            this.server.set(await this.agent.call<LiveServer>('GET', '/deploy/server'));
        }
        catch (e)
        {
            this.server.set(null);
            this.serverError.set((e as Error).message);
        }
    }

    //-----------------------------------------------------------
    // Server security
    //-----------------------------------------------------------

    async openSecurity(): Promise<void>
    {
        this.secAsk.set(null);
        this.secOpen.set(true);

        await this.loadSecurity();

        if (this.secBusy())
        {
            this.watchSecurity();
        }
    }

    closeSecurity(): void
    {
        this.secOpen.set(false);
        this.secAsk.set(null);
        this.stopSecurity();
    }

    async loadSecurity(): Promise<void>
    {
        try
        {
            this.sec.set(await this.agent.call<ServerSecurityInfo>('GET', '/deploy/security'));
            this.secError.set(null);
        }
        catch (e)
        {
            // while a service restarts the last answer stays on screen
            if (!this.sec())
            {
                this.secError.set((e as Error).message);
            }
        }
    }

    callersText(sc: ServerSecurityInfo): string
    {
        return sc.noCompany.callers
            .map(c => `${String(c.last).slice(0, 16).replace('T', ' ')} UTC  x${c.count}  ${c.caller}`)
            .join('\n');
    }

    askStep(step: 'console' | 'erp' | 'lock' | 'back'): void
    {
        const text: Record<string, [string, string]> =
        {
            console: ['Run the live Console under its own Windows account?', 'The live Console and website restart (up to a minute). If the Console does not answer afterwards, the step is undone by itself.'],
            erp: ['Run the live ERP under its own Windows account?', 'The live ERP restarts for every client (up to a minute). If it does not answer afterwards, the step is undone by itself.'],
            lock: ['Close the AppCore folders to other Windows users?', 'Both live services restart. If one does not answer afterwards, the folders are opened again by itself. Do the two account steps first.'],
            back: ['Put everything back as it was installed?', 'Both live services restart and run as LocalSystem again; the folders are open as before.']
        };

        this.secAsk.set({ title: text[step][0], text: text[step][1], url: '/deploy/security', body: { step } });
    }

    askMode(mode: 'Refuse' | 'Warn' | 'Auto'): void
    {
        const asked = this.sec()?.noCompany.last7Days ?? 0;

        const text: Record<string, [string, string]> =
        {
            Refuse: ['Refuse work with no company from now?', (asked ? `In the last 7 days ${asked} piece(s) of code asked with no company : they will get an error. ` : '') + 'The live ERP restarts for every client (about 15 seconds). If it does not answer, the setting is put back by itself.'],
            Warn: ['Go back to Warn?', 'The live ERP restarts for every client (about 15 seconds). The agent will not switch to Refuse by itself again until you ask.'],
            Auto: ['Let the agent switch to Refuse by itself?', 'Nothing restarts now. After the clean days, at the quiet hour of the server, the agent sets Refuse and restarts the ERP.']
        };

        this.secAsk.set({ title: text[mode][0], text: text[mode][1], url: '/deploy/no-company', body: { mode } });
    }

    async runSecurity(ask: { url: string; body: Record<string, string> }): Promise<void>
    {
        this.secAsk.set(null);

        try
        {
            await this.agent.call('POST', ask.url, ask.body);

            await this.loadSecurity();

            this.watchSecurity();
        }
        catch (e)
        {
            this.toast.error((e as Error).message);
        }
    }

    private watchSecurity(): void
    {
        this.stopSecurity();

        this.secTimer = setInterval(async () =>
        {
            await this.loadSecurity();

            if (!this.secBusy())
            {
                this.stopSecurity();

                const job = this.sec()?.lastJob;

                if (job?.status === 'succeeded') { this.toast.success(job.step); }
                else if (job) { this.toast.error(job.step); }
            }
        }, 2500);
    }

    private stopSecurity(): void
    {
        if (this.secTimer)
        {
            clearInterval(this.secTimer);
            this.secTimer = null;
        }
    }

    async saveConnection(): Promise<void>
    {
        try
        {
            const r = await this.agent.call<{ agentUrl: string; hasToken: boolean }>('POST', '/deploy/settings', { agentUrl: this.agentUrl, token: this.token });

            this.agentUrl = r.agentUrl;
            this.token = '';
            this.hasToken.set(r.hasToken);
            this.toast.success('Server connection saved.');

            await this.loadServer();
        }
        catch (e)
        {
            this.toast.error((e as Error).message);
        }
    }

    async deployNow(): Promise<void>
    {
        this.confirming.set(false);

        await this.begin('/deploy/start', {});
    }

    async rollback(release: string): Promise<void>
    {
        this.switchingBack.set(null);

        await this.begin('/deploy/rollback', { release });
    }

    private async begin(url: string, body: Record<string, string>): Promise<void>
    {
        try
        {
            await this.agent.call('POST', url, { ...body, by: this.auth.user()?.FullName ?? '' });

            this.busy.set(true);

            await this.loadState();

            // open the new run straight away
            const id = this.state()?.id;

            if (id)
            {
                await this.router.navigate([], { relativeTo: this.route, queryParams: { run: id } });
            }

            this.startPolling();
        }
        catch (e)
        {
            this.toast.error((e as Error).message);
        }
    }

    private async loadHistory(): Promise<void>
    {
        try
        {
            this.history.set(await this.agent.call<DeployRun[]>('GET', '/deploy/history'));
        }
        catch
        {
            // an older agent without the history : the list shows the server's releases
        }
    }

    private async loadState(): Promise<void>
    {
        try
        {
            const st = await this.agent.call<DeployState>('GET', '/deploy/status');

            this.state.set(st);
            this.busy.set(st.busy);
        }
        catch
        {
            // agent gone : keep the last state
        }
    }

    private startPolling(): void
    {
        this.stopPolling();

        this.timer = setInterval(async () =>
        {
            await this.loadState();

            if (!this.busy())
            {
                this.stopPolling();

                const st = this.state();

                if (st?.phase === 'succeeded') { this.toast.success(st.kind === 'Switch back' ? `${st.release} is live again.` : 'The new release is live.'); }
                else if (st?.phase === 'rolledback') { this.toast.error('The new release did not start : the previous one is live again.'); }
                else if (st?.phase === 'failed') { this.toast.error('The deployment failed : see the log.'); }

                // keep the finished run open with its full log
                if (st && this.openId() === st.id)
                {
                    this.openLog.set(st.log.slice());
                }

                await Promise.all([this.loadHistory(), this.loadServer()]);
            }
        }, 1500);
    }

    private stopPolling(): void
    {
        if (this.timer)
        {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}
