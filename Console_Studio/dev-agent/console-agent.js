//===============================================================
// AppCore Console Dev Agent  (development PC only)
// --------------------------------------------------------------
// Lets the Console footer (localhost:4300) stop, build and start
// the Console API without typing commands : click "API online"
// in the footer -> Build & Restart API / Restart API.
// Same idea as the ERP's Backend_Studio\dev-agent.
//
//   start   : start-console.cmd (keep the window open)
//   listens : http://127.0.0.1:4299  (this PC only)
//   API     : ..\Console_Backend\AppCore.Console.API
//             (dotnet build, dotnet run --no-build)
//
// Safety
//   - bound to 127.0.0.1 : other PCs cannot reach it
//   - only the Console dev UI origin is accepted (localhost:4300)
//   - every call needs the X-AppCore-Dev header, so other web
//     sites cannot fire it from a browser
//   - it only runs the fixed dotnet / taskkill / ng commands
//     below; nothing from the request is ever run
//
// --all  (start-console.cmd : the whole day in one double-click)
//   builds + starts the API, starts the Console UI (4300) and the
//   website (4400) when they are not running yet, opens Chrome.
// Closing this window stops everything it started.
//===============================================================

'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = 4299;
const HOST = '127.0.0.1';
const API_DIR = path.resolve(__dirname, '..', 'Console_Backend', 'AppCore.Console.API');
const API_EXE = 'AppCore.Console.API.exe';
const ALLOWED_ORIGINS = ['http://localhost:4300', 'http://127.0.0.1:4300'];
const MAX_LOG = 400;
// the screens started by --all (each skipped when its port answers)
const UIS =
[
    { label: 'console', name: 'Console UI', dir: path.resolve(__dirname, '..', 'Console_Frontend', 'Console_UI'), port: 4300 },
    { label: 'site', name: 'Website', dir: path.resolve(__dirname, '..', 'Website', 'AppCore_Site'), port: 4400 }
];
const START_ALL = process.argv.includes('--all');

if (!fs.existsSync(path.join(API_DIR, 'AppCore.Console.API.csproj')))
{
    console.error('AppCore.Console.API.csproj not found in ' + API_DIR);
    process.exit(1);
}

//---------------------------------------------------------------
// State
//---------------------------------------------------------------

const state =
{
    // idle | stopping | building | starting | running | failed | stopped
    state: 'idle',
    action: '',            // build-restart | restart
    step: 'Waiting',
    startedAt: null,
    finishedAt: null,
    buildMs: null,
    errors: [],            // { file, line, code, message }
    errorCount: 0,
    warningCount: 0,
    oldVersionRestarted: false,
    jobId: 0,
    apiPid: null
};

let apiChild = null;
const uiChildren = [];     // ng serve processes started here
const uiStates = {};       // label -> off | starting | running | external | stopped | missing
let busy = false;
const log = [];

function addLog(line)
{
    log.push(line);

    if (log.length > MAX_LOG)
    {
        log.splice(0, log.length - MAX_LOG);
    }
}

function set(patch)
{
    Object.assign(state, patch);
}

function stamp()
{
    return new Date().toLocaleTimeString('en-GB');
}

//---------------------------------------------------------------
// Commands (fixed, nothing from the request)
//---------------------------------------------------------------

function run(command, args, onLine)
{
    return new Promise(resolve =>
    {
        const child =
            spawn(command, args, { cwd: API_DIR, windowsHide: true });

        const feed = chunk =>
        {
            for (const line of chunk.toString().split(/\r?\n/))
            {
                if (line.trim())
                {
                    onLine?.(line);
                }
            }
        };

        child.stdout.on('data', feed);
        child.stderr.on('data', feed);
        child.on('error', () => resolve(-1));
        child.on('close', code => resolve(code ?? -1));
    });
}

async function stopApi()
{
    if (apiChild && apiChild.pid)
    {
        await run('taskkill', ['/PID', String(apiChild.pid), '/T', '/F']);
    }

    // also the API started from VS Code / cmd (dotnet run)
    await run('taskkill', ['/IM', API_EXE, '/T', '/F']);

    apiChild = null;

    set({ apiPid: null });

    await new Promise(r => setTimeout(r, 800));
}

// file(12,5): error CS1002: ; expected [C:\...\X.csproj]
const ERROR_LINE =
    /^(.*?)\((\d+),\d+\): (error|warning) ([A-Z]+\d+): (.*?)(?: \[[^\]]*\])?$/;

async function buildApi()
{
    const errors = new Map();
    const warnings = new Set();

    const started = Date.now();

    const code =
        await run('dotnet', ['build', '--nologo', '-clp:NoSummary'], line =>
        {
            const m = ERROR_LINE.exec(line.trim());

            if (!m)
            {
                if (/error/i.test(line))
                {
                    console.log('  ' + line);
                }

                return;
            }

            const key = m[1] + ':' + m[2] + ':' + m[4];

            if (m[3] === 'error')
            {
                if (!errors.has(key))
                {
                    errors.set(key,
                    {
                        file: path.basename(m[1]),
                        path: m[1],
                        line: Number(m[2]),
                        code: m[4],
                        message: m[5]
                    });

                    console.log('  ' + line.trim());
                }
            }
            else
            {
                warnings.add(key);
            }
        });

    const list = Array.from(errors.values());

    set(
    {
        buildMs: Date.now() - started,
        errors: list.slice(0, 50),
        errorCount: list.length,
        warningCount: warnings.size
    });

    return code === 0 && list.length === 0;
}

// EF Core writes several "dbug" lines for every query (connection
// created / opened / disposed). On a remote database that is
// thousands of lines a minute : the window can't keep up and the
// API waits for it, so every page gets slow. Only warnings and
// errors from EF Core here (settings files are not touched).
function apiEnv()
{
    return {
        ...process.env,
        'Logging__LogLevel__Microsoft.EntityFrameworkCore': 'Warning',
        'Logging__Console__LogLevel__Microsoft.EntityFrameworkCore': 'Warning',
        'Logging__LogLevel__Microsoft.AspNetCore': 'Warning',
        'Logging__Console__LogLevel__Microsoft.AspNetCore': 'Warning'
    };
}

function startApi()
{
    return new Promise(resolve =>
    {
        let ready = false;

        const child =
            spawn('dotnet', ['run', '--no-build'], { cwd: API_DIR, windowsHide: true, env: apiEnv() });

        apiChild = child;

        set({ apiPid: child.pid });

        const feed = chunk =>
        {
            for (const line of chunk.toString().split(/\r?\n/))
            {
                if (!line.trim())
                {
                    continue;
                }

                process.stdout.write('[api] ' + line + '\n');

                addLog(line);

                if (!ready && /Now listening on|Application started/i.test(line))
                {
                    ready = true;

                    resolve(true);
                }
            }
        };

        child.stdout.on('data', feed);
        child.stderr.on('data', feed);

        child.on('error', () =>
        {
            if (!ready)
            {
                resolve(false);
            }
        });

        child.on('close', code =>
        {
            if (apiChild === child)
            {
                apiChild = null;

                set({ apiPid: null });

                if (!busy)
                {
                    set({ state: 'stopped', step: 'The API stopped (exit code ' + code + ')' });
                }
            }

            if (!ready)
            {
                resolve(false);
            }
        });

        // a slow start still counts after 90 seconds of silence
        setTimeout(() =>
        {
            if (!ready)
            {
                resolve(apiChild === child);
            }
        }, 90000);
    });
}

//---------------------------------------------------------------
// Jobs
//---------------------------------------------------------------

async function job(action)
{
    busy = true;

    set(
    {
        action,
        jobId: state.jobId + 1,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        oldVersionRestarted: false,
        errors: action === 'build-restart' ? [] : state.errors,
        errorCount: action === 'build-restart' ? 0 : state.errorCount
    });

    try
    {
        console.log('\n[' + stamp() + '] ' + (action === 'build-restart' ? 'Build & Restart' : 'Restart') + ' asked from the Console');

        set({ state: 'stopping', step: 'Stopping the API' });

        await stopApi();

        let built = true;

        if (action === 'build-restart')
        {
            set({ state: 'building', step: 'Building (dotnet build)' });

            console.log('[' + stamp() + '] dotnet build ...');

            built = await buildApi();

            console.log('[' + stamp() + '] build ' + (built ? 'succeeded' : 'FAILED (' + state.errorCount + ' errors)')
                + ' in ' + Math.round(state.buildMs / 1000) + ' s');
        }

        // On a failed build the last good API is still in bin : it is
        // started again, so the ERP keeps working.
        set({ state: 'starting', step: built ? 'Starting the API' : 'Build failed : starting the last good version' });

        console.log('[' + stamp() + '] dotnet run --no-build ...');

        const started = await startApi();

        if (!built)
        {
            set({ state: 'failed', step: 'Build failed', oldVersionRestarted: started });
        }
        else if (started)
        {
            set({ state: 'running', step: 'The API is running' });
        }
        else
        {
            set({ state: 'failed', step: 'The API did not start : see the agent window' });
        }
    }
    catch (e)
    {
        set({ state: 'failed', step: 'Agent error : ' + (e?.message ?? e) });
    }
    finally
    {
        set({ finishedAt: new Date().toISOString() });

        busy = false;
    }
}

//---------------------------------------------------------------
// UI (ng serve) and browser : only with --all
//---------------------------------------------------------------

// localhost may be 127.0.0.1 or ::1 (ng serve uses either)
async function portOpen(port)
{
    return await portOpenOn('127.0.0.1', port)
        ||
        await portOpenOn('::1', port);
}

function portOpenOn(host, port)
{
    return new Promise(resolve =>
    {
        const socket =
            require('net').connect({ host, port });

        socket.setTimeout(800);
        socket.once('connect', () => { socket.destroy(); resolve(true); });
        socket.once('timeout', () => { socket.destroy(); resolve(false); });
        socket.once('error', () => resolve(false));
    });
}

// Google Chrome when it is installed (owner 2026-11-11), else the
// Windows default browser
function chromePath()
{
    const places =
    [
        process.env['ProgramFiles'],
        process.env['ProgramFiles(x86)'],
        process.env['LOCALAPPDATA']
    ];

    for (const base of places)
    {
        if (!base)
        {
            continue;
        }

        const exe =
            path.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe');

        if (fs.existsSync(exe))
        {
            return exe;
        }
    }

    return null;
}

function openBrowser(urls)
{
    const chrome =
        chromePath();

    if (chrome)
    {
        spawn(chrome, urls, { detached: true, stdio: 'ignore' }).unref();

        return;
    }

    for (const url of urls)
    {
        spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    }
}

// stops whatever listens on this port (only the screen ports 4300 /
// 4400 are ever passed here)
async function freePort(port)
{
    const pids = new Set();

    await new Promise(resolve =>
    {
        const c = spawn('netstat', ['-ano'], { windowsHide: true });
        let out = '';

        c.stdout.on('data', d => out += d);
        c.on('error', () => resolve());
        c.on('close', () =>
        {
            for (const line of out.split(/\r?\n/))
            {
                const p = line.trim().split(/\s+/);

                if (p.length >= 5 && /LISTEN/i.test(p[3]) && p[1].endsWith(':' + port) && /^\d+$/.test(p[4]) && p[4] !== '0')
                {
                    pids.add(p[4]);
                }
            }

            resolve();
        });
    });

    for (const pid of pids)
    {
        await run('taskkill', ['/PID', pid, '/T', '/F']);
    }

    await new Promise(r => setTimeout(r, 1500));
}

async function startUi(ui)
{
    const url = 'http://localhost:' + ui.port;

    if (!fs.existsSync(path.join(ui.dir, 'package.json')))
    {
        uiStates[ui.label] = 'missing';

        console.log('[' + stamp() + '] ' + ui.name + ' folder not found : ' + ui.dir);

        return false;
    }

    // an older copy (e.g. started by the old start file) may still
    // hold the port and show old screens : stop it, start fresh
    if (await portOpen(ui.port))
    {
        console.log('[' + stamp() + '] ' + ui.name + ' : an older copy holds port ' + ui.port + ', stopping it ...');

        await freePort(ui.port);

        if (await portOpen(ui.port))
        {
            uiStates[ui.label] = 'external';

            console.log('[' + stamp() + '] ' + ui.name + ' : could not stop it, using it as it is (' + url + ')');

            return true;
        }
    }

    // first time on this PC : npm install
    if (!fs.existsSync(path.join(ui.dir, 'node_modules')))
    {
        console.log('[' + stamp() + '] ' + ui.name + ' : npm install (first time, a few minutes) ...');

        await new Promise(resolve =>
        {
            const c = spawn('cmd', ['/c', 'npm', 'install'], { cwd: ui.dir, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
            c.on('close', () => resolve());
            c.on('error', () => resolve());
        });
    }

    uiStates[ui.label] = 'starting';

    console.log('[' + stamp() + '] ' + ui.name + ' : ng serve --port ' + ui.port + ' ...');

    const tail = [];
    const prefix = ('[' + ui.label + ']').padEnd(10);

    return new Promise(resolve =>
    {
        let ready = false;

        // NG_CLI_ANALYTICS : ng never stops to ask a question
        const child =
            spawn(
                'cmd',
                ['/c', 'npx', 'ng', 'serve', '--port', String(ui.port)],
                {
                    cwd: ui.dir,
                    windowsHide: true,
                    stdio: ['ignore', 'pipe', 'pipe'],
                    env: { ...process.env, NG_CLI_ANALYTICS: 'false', NG_FORCE_TTY: 'false' }
                });

        uiChildren.push(child);

        const feed = chunk =>
        {
            for (const line of chunk.toString().split(/\r?\n/))
            {
                if (!line.trim())
                {
                    continue;
                }

                process.stdout.write(prefix + line + '\n');

                tail.push(line);

                if (tail.length > 15)
                {
                    tail.shift();
                }

                if (!ready && /Local:|compiled successfully|bundle generation complete/i.test(line))
                {
                    ready = true;

                    uiStates[ui.label] = 'running';

                    resolve(true);
                }
            }
        };

        child.stdout.on('data', feed);
        child.stderr.on('data', feed);

        child.on('close', async code =>
        {
            const i = uiChildren.indexOf(child);

            if (i >= 0)
            {
                uiChildren.splice(i, 1);
            }

            uiStates[ui.label] = 'stopped';

            console.log('\n[' + stamp() + '] ' + ui.name + ' (ng serve) stopped (exit code ' + code + '). Its last lines :');

            for (const line of tail)
            {
                console.log('      ' + line);
            }

            if (!ready)
            {
                if (await portOpen(ui.port))
                {
                    uiStates[ui.label] = 'external';

                    resolve(true);

                    return;
                }

                resolve(false);
            }
        });

        // the first compile can be slow
        setTimeout(() => { if (!ready) { resolve(uiChildren.includes(child)); } }, 240000);
    });
}

async function startAll()
{
    console.log('Starting the day : Console API build + run, Console UI, website, browser\n');

    // API and screens side by side (the API job runs in the background)
    void job('build-restart');

    const up =
        await Promise.all(UIS.map(ui => startUi(ui)));

    for (let i = 0; i < 300 && (busy || state.jobId === 0); i++)
    {
        await new Promise(r => setTimeout(r, 1000));
    }

    const urls = [];

    for (let i = 0; i < UIS.length; i++)
    {
        if (up[i] || await portOpen(UIS[i].port))
        {
            urls.push('http://localhost:' + UIS[i].port);
        }
    }

    if (urls.length)
    {
        openBrowser(urls);
    }

    console.log('\n[' + stamp() + '] Ready : API ' + state.state + ', '
        + UIS.map(ui => ui.name + ' ' + (uiStates[ui.label] ?? 'off')).join(', ')
        + (urls.length ? ' -> ' + urls.join('  ') : '') + '\n');

    console.log('Console : http://localhost:4300    Website : http://localhost:4400');
    console.log('Build & Restart the API : click "API online" in the Console footer.\n');
}



//---------------------------------------------------------------
// Deploy to live (Console page "Deployments")
// --------------------------------------------------------------
// Builds the website + Console UI (production) and the Console
// API (dotnet publish), zips them and sends the package to the
// Deploy Agent on the live server (skyhost, over Tailscale). The
// agent backs up AppCore_Control, installs the release, switches
// the service AppCoreConsole and goes back on its own if the new
// release does not answer.
//
// The agent's address and token are kept in deploy.json next to
// this file (this PC only, never in the browser or in git).
//---------------------------------------------------------------

const ROOT_DIR = path.resolve(__dirname, '..');
const DEPLOY_FILE = path.join(__dirname, 'deploy.json');
const HISTORY_FILE = path.join(__dirname, 'deploy-history.json');
const HISTORY_KEEP = 200;
const PUBLISH_DIR = path.join(ROOT_DIR, 'publish', 'console-release');
const ZIP_FILE = path.join(ROOT_DIR, 'publish', 'console-release.zip');
const SITE_DIR = path.join(ROOT_DIR, 'Website', 'AppCore_Site');
const CONSOLE_UI_DIR = path.join(ROOT_DIR, 'Console_Frontend', 'Console_UI');

const deploy =
{
    busy: false,
    id: '',
    kind: '',               // Deploy | Switch back
    by: '',
    phase: 'idle',          // idle | building | uploading | deploying | succeeded | failed | rolledback
    step: '',
    percent: 0,
    release: '',
    startedAt: null,
    finishedAt: null,
    log: [],
    agentJob: null
};

// every finished run (deploy or switch back) with its log, newest
// first, in deploy-history.json next to this file (this PC only)
function readHistory()
{
    try
    {
        const list = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));

        return Array.isArray(list) ? list : [];
    }
    catch
    {
        return [];
    }
}

function saveRun()
{
    try
    {
        const list = readHistory().filter(x => x.id !== deploy.id);

        list.unshift({
            id: deploy.id, kind: deploy.kind, release: deploy.release, by: deploy.by,
            phase: deploy.phase, step: deploy.step,
            startedAt: deploy.startedAt, finishedAt: deploy.finishedAt,
            log: deploy.log.slice()
        });

        fs.writeFileSync(HISTORY_FILE, JSON.stringify(list.slice(0, HISTORY_KEEP), null, 1));
    }
    catch (e)
    {
        console.log('[deploy] could not save the history : ' + (e?.message ?? e));
    }
}

function newRunId()
{
    const d = new Date();
    const p = n => String(n).padStart(2, '0');

    return 'D' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}

function deployLog(line)
{
    const text = stamp() + '  ' + line;

    deploy.log.push(text);

    if (deploy.log.length > 300)
    {
        deploy.log.splice(0, deploy.log.length - 300);
    }

    console.log('[deploy] ' + line);
}

function readDeploySettings()
{
    try
    {
        const d = JSON.parse(fs.readFileSync(DEPLOY_FILE, 'utf8'));

        return { agentUrl: String(d.agentUrl || '').replace(/\/+$/, ''), token: String(d.token || '') };
    }
    catch
    {
        return { agentUrl: 'http://100.117.11.97:5099', token: '' };
    }
}

async function agentCall(method, url, body)
{
    const cfg = readDeploySettings();

    if (!cfg.token)
    {
        throw new Error('The Deploy Agent token is not set (Deployments page : Server connection).');
    }

    const headers = { 'X-Agent-Token': cfg.token };
    let payload = body;

    if (body && !(body instanceof FormData))
    {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }

    let r;

    try
    {
        r = await fetch(cfg.agentUrl + url, { method, headers, body: payload, signal: AbortSignal.timeout(body instanceof FormData ? 600000 : 15000) });
    }
    catch (e)
    {
        throw new Error('The live server (' + cfg.agentUrl + ') did not answer. Is Tailscale on? (' + (e?.cause?.code || e?.message || e) + ')');
    }

    const text = await r.text();
    let data = null;

    try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }

    if (!r.ok)
    {
        throw new Error((data && data.message) || ('The Deploy Agent answered ' + r.status));
    }

    return data;
}

// run a fixed command, lines to the deploy log; resolves the exit code
function runIn(cwd, command, args)
{
    return new Promise(resolve =>
    {
        const child = spawn(command, args, { cwd, windowsHide: true, env: { ...process.env, NG_CLI_ANALYTICS: 'false' } });

        const feed = chunk =>
        {
            for (const line of chunk.toString().split(/\r?\n/))
            {
                if (line.trim())
                {
                    process.stdout.write('[deploy]   ' + line + '\n');

                    if (/error|warning|failed/i.test(line))
                    {
                        deployLog('  ' + line.trim().slice(0, 300));
                    }
                }
            }
        };

        child.stdout.on('data', feed);
        child.stderr.on('data', feed);
        child.on('error', () => resolve(-1));
        child.on('close', code => resolve(code ?? -1));
    });
}

function setDeploy(patch)
{
    Object.assign(deploy, patch);

    if (patch.step)
    {
        deployLog(patch.step);
    }
}

async function buildUi(dir, name, percent)
{
    setDeploy({ phase: 'building', step: 'Building the ' + name + ' (production)', percent });

    if (!fs.existsSync(path.join(dir, 'node_modules')))
    {
        if (await runIn(dir, 'cmd', ['/c', 'npm', 'install']) !== 0)
        {
            throw new Error('npm install failed for the ' + name + '.');
        }
    }

    if (await runIn(dir, 'cmd', ['/c', 'npx', 'ng', 'build', '--configuration', 'production']) !== 0)
    {
        throw new Error('The ' + name + ' did not build : see the lines above.');
    }
}

function distFolder(dir)
{
    const dist = path.join(dir, 'dist');
    const app = fs.readdirSync(dist).find(n => fs.existsSync(path.join(dist, n, 'browser', 'index.html')));

    if (!app)
    {
        throw new Error('No build output (dist\\*\\browser\\index.html) in ' + dir);
    }

    return path.join(dist, app, 'browser');
}

async function nextRelease()
{
    const list = await agentCall('GET', '/agent/releases?app=console');
    let max = 0;

    for (const r of list || [])
    {
        const m = /^R-(\d+)$/.exec(r.release || '');

        if (m)
        {
            max = Math.max(max, Number(m[1]));
        }
    }

    return 'R-' + String(max + 1).padStart(4, '0');
}

async function gitCommit()
{
    return new Promise(resolve =>
    {
        const c = spawn('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT_DIR, windowsHide: true });
        let out = '';
        c.stdout.on('data', d => out += d);
        c.on('error', () => resolve(''));
        c.on('close', () => resolve(out.trim()));
    });
}

async function deployJob(by)
{
    deploy.busy = true;

    Object.assign(deploy, { id: newRunId(), kind: 'Deploy', by: by || 'Console', phase: 'building', step: '', percent: 0, release: '', startedAt: new Date().toISOString(), finishedAt: null, log: [], agentJob: null });

    try
    {
        deployLog('Deploy to live asked from the Console' + (by ? ' by ' + by : ''));

        // the live server must answer before we spend minutes building
        setDeploy({ step: 'Checking the live server', percent: 2 });

        const health = await agentCall('GET', '/agent/health?app=console');

        if (health.busy)
        {
            throw new Error('The live server is busy with another deployment.');
        }

        const release = await nextRelease();

        setDeploy({ release });

        await buildUi(SITE_DIR, 'website', 5);
        await buildUi(CONSOLE_UI_DIR, 'Console screens', 25);

        setDeploy({ step: 'Publishing the Console API (dotnet publish)', percent: 45 });

        fs.rmSync(PUBLISH_DIR, { recursive: true, force: true });

        if (await runIn(API_DIR, 'dotnet', ['publish', '-c', 'Release', '-o', PUBLISH_DIR, '--nologo']) !== 0)
        {
            throw new Error('dotnet publish failed : see the lines above.');
        }

        // this PC's settings never go to the server (the server keeps its own)
        for (const f of fs.readdirSync(PUBLISH_DIR))
        {
            if (/^appsettings.*\.json$/i.test(f))
            {
                fs.rmSync(path.join(PUBLISH_DIR, f), { force: true });
            }
        }

        setDeploy({ step: 'Adding the website and the Console screens', percent: 60 });

        fs.cpSync(distFolder(SITE_DIR), path.join(PUBLISH_DIR, 'wwwroot', 'site'), { recursive: true });
        fs.cpSync(distFolder(CONSOLE_UI_DIR), path.join(PUBLISH_DIR, 'wwwroot', 'console'), { recursive: true });

        setDeploy({ step: 'Packing ' + release, percent: 65 });

        fs.rmSync(ZIP_FILE, { force: true });

        const zipped =
            await runIn(ROOT_DIR, 'powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${PUBLISH_DIR}\\*' -DestinationPath '${ZIP_FILE}' -Force`]);

        if (zipped !== 0 || !fs.existsSync(ZIP_FILE))
        {
            throw new Error('Could not make the package (Compress-Archive).');
        }

        const mb = (fs.statSync(ZIP_FILE).size / 1024 / 1024).toFixed(1);

        setDeploy({ phase: 'uploading', step: 'Sending ' + release + ' to the live server (' + mb + ' MB)', percent: 70 });

        const form = new FormData();
        form.append('app', 'console');
        form.append('release', release);
        form.append('commit', await gitCommit());
        form.append('by', by || 'Console');
        form.append('package', new Blob([fs.readFileSync(ZIP_FILE)]), release + '.zip');

        const started = await agentCall('POST', '/agent/deployments', form);

        await followAgentJob(started.jobId, 75);
    }
    catch (e)
    {
        setDeploy({ phase: 'failed', step: 'Failed : ' + (e?.message ?? e) });
    }
    finally
    {
        deploy.busy = false;
        deploy.finishedAt = new Date().toISOString();

        saveRun();
    }
}

// mirror the server's job (backup, switch, health check) here
async function followAgentJob(jobId, from)
{
    setDeploy({ phase: 'deploying', step: 'Installing on the live server' });

    let seen = 0;

    for (let i = 0; i < 900; i++)
    {
        await new Promise(r => setTimeout(r, 2000));

        let job;

        try
        {
            job = await agentCall('GET', '/agent/jobs/' + jobId);
        }
        catch
        {
            continue;
        }

        deploy.agentJob = job;
        deploy.percent = Math.max(deploy.percent, from + Math.round((job.percent || 0) * (100 - from) / 100));

        for (const line of (job.log || []).slice(seen))
        {
            deployLog('server  ' + line.replace(/^\d\d:\d\d:\d\d\s+/, ''));
        }

        seen = (job.log || []).length;

        if (job.status !== 'running')
        {
            deploy.phase = job.status === 'succeeded' ? 'succeeded' : job.status === 'rolledback' ? 'rolledback' : 'failed';
            deploy.step = job.step;
            deploy.percent = 100;

            return;
        }

        deploy.step = job.step;
    }

    throw new Error('The live server did not finish within 30 minutes : check it.');
}

async function rollbackJob(release, by)
{
    deploy.busy = true;

    Object.assign(deploy, { id: newRunId(), kind: 'Switch back', by: by || 'Console', phase: 'deploying', step: '', percent: 0, release, startedAt: new Date().toISOString(), finishedAt: null, log: [], agentJob: null });

    try
    {
        setDeploy({ step: 'Switching the live Console back to ' + release, percent: 5 });

        const started = await agentCall('POST', '/agent/rollback', { release, by: by || 'Console', app: 'console' });

        await followAgentJob(started.jobId, 5);
    }
    catch (e)
    {
        setDeploy({ phase: 'failed', step: 'Failed : ' + (e?.message ?? e) });
    }
    finally
    {
        deploy.busy = false;
        deploy.finishedAt = new Date().toISOString();

        saveRun();
    }
}

function readBody(req)
{
    return new Promise(resolve =>
    {
        let data = '';

        req.on('data', c =>
        {
            data += c;

            if (data.length > 20000)
            {
                req.destroy();
            }
        });

        req.on('end', () =>
        {
            try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
        });
    });
}

async function handleDeploy(req, res, origin, url)
{
    if (req.method === 'GET' && url === '/deploy/status')
    {
        return send(res, origin, 200, deploy);
    }

    // list : no logs; one run : with its log
    if (req.method === 'GET' && url === '/deploy/history')
    {
        return send(res, origin, 200, readHistory().map(({ log, ...rest }) => ({ ...rest, lines: (log || []).length })));
    }

    if (req.method === 'GET' && url.startsWith('/deploy/history/'))
    {
        const id = decodeURIComponent(url.slice('/deploy/history/'.length));
        const run = id === deploy.id ? { ...deploy } : readHistory().find(x => x.id === id);

        return run ? send(res, origin, 200, run) : send(res, origin, 404, { error: 'This deployment is not in the history.' });
    }

    if (req.method === 'GET' && url === '/deploy/settings')
    {
        const cfg = readDeploySettings();

        return send(res, origin, 200, { agentUrl: cfg.agentUrl, hasToken: !!cfg.token });
    }

    if (req.method === 'POST' && url === '/deploy/settings')
    {
        const body = await readBody(req);
        const cfg = readDeploySettings();
        const agentUrl = String(body.agentUrl || cfg.agentUrl).trim().replace(/\/+$/, '');

        if (!/^https?:\/\/[\w.\-]+(:\d+)?$/.test(agentUrl))
        {
            return send(res, origin, 400, { error: 'The address must look like http://100.117.11.97:5099' });
        }

        const token = String(body.token || '').trim() || cfg.token;

        fs.writeFileSync(DEPLOY_FILE, JSON.stringify({ agentUrl, token }, null, 2));

        return send(res, origin, 200, { agentUrl, hasToken: !!token });
    }

    if (req.method === 'GET' && url === '/deploy/server')
    {
        try
        {
            const [health, releases] = await Promise.all([
                agentCall('GET', '/agent/health?app=console'),
                agentCall('GET', '/agent/releases?app=console')
            ]);

            return send(res, origin, 200, { health, releases });
        }
        catch (e)
        {
            return send(res, origin, 502, { error: e?.message ?? String(e) });
        }
    }

    if (req.method === 'POST' && (url === '/deploy/start' || url === '/deploy/rollback'))
    {
        if (deploy.busy)
        {
            return send(res, origin, 409, { error: 'A deployment is already running.' });
        }

        const body = await readBody(req);
        const by = String(body.by || '').slice(0, 60);

        if (url === '/deploy/rollback')
        {
            const release = String(body.release || '');

            if (!/^R-\d{4,}$/.test(release))
            {
                return send(res, origin, 400, { error: 'Choose a release.' });
            }

            void rollbackJob(release, by);
        }
        else
        {
            void deployJob(by);
        }

        return send(res, origin, 202, { accepted: true });
    }

    return send(res, origin, 404, { error: 'Not found' });
}


//---------------------------------------------------------------
// HTTP
//---------------------------------------------------------------

function send(res, origin, status, body)
{
    const headers =
    {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Vary': 'Origin'
    };

    if (ALLOWED_ORIGINS.includes(origin))
    {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Headers'] = 'X-AppCore-Dev, Content-Type';
        headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
        headers['Access-Control-Allow-Private-Network'] = 'true';
    }

    res.writeHead(status, headers);
    res.end(body === undefined ? '' : JSON.stringify(body));
}

const server =
    http.createServer((req, res) =>
    {
        const origin = req.headers.origin ?? '';

        if (origin && !ALLOWED_ORIGINS.includes(origin))
        {
            return send(res, origin, 403, { error: 'Origin not allowed' });
        }

        if (req.method === 'OPTIONS')
        {
            return send(res, origin, 204);
        }

        if (req.headers['x-appcore-dev'] !== '1')
        {
            return send(res, origin, 403, { error: 'Missing header' });
        }

        const url = (req.url ?? '').split('?')[0];

        if (url.startsWith('/deploy/'))
        {
            void handleDeploy(req, res, origin, url);

            return;
        }

        if (req.method === 'GET' && url === '/status')
        {
            return send(res, origin, 200, { ...state, busy, running: !!apiChild, uiStates });
        }

        if (req.method === 'GET' && url === '/log')
        {
            return send(res, origin, 200, { lines: log.slice(-200) });
        }

        if (req.method === 'POST' && (url === '/build-restart' || url === '/restart'))
        {
            if (busy)
            {
                return send(res, origin, 409, { error: 'A job is already running', ...state });
            }

            void job(url.substring(1));

            return send(res, origin, 202, { accepted: true, jobId: state.jobId });
        }

        return send(res, origin, 404, { error: 'Not found' });
    });

server.on('error', e =>
{
    if (e.code === 'EADDRINUSE')
    {
        console.error('Port ' + PORT + ' is in use : the dev agent is probably already running.');
    }
    else
    {
        console.error(e);
    }

    process.exit(1);
});

server.listen(PORT, HOST, () =>
{
    console.log('AppCore Console Dev Agent on http://' + HOST + ':' + PORT);
    console.log('API folder : ' + API_DIR);
    console.log('Use "API online" in the Console footer to build / restart the API.');
    console.log('Keep this window open. Closing it stops the API' + (START_ALL ? ' and the screens' : '') + ' it started.\n');

    if (START_ALL)
    {
        void startAll();
    }
});

// closing the window : stop the API we started
function shutdown()
{
    for (const child of [apiChild, ...uiChildren])
    {
        if (child && child.pid)
        {
            spawn('taskkill', ['/PID', String(child.pid), '/T', '/F']);
        }
    }

    setTimeout(() => process.exit(0), 300);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);
