//===============================================================
// AppCore Dev Agent  (development PC only)
// --------------------------------------------------------------
// Lets the ERP footer (localhost:4100, developer users) stop,
// build and start the API without typing commands.
//
//   start   : double-click start-dev-agent.cmd (keep the window)
//   listens : http://127.0.0.1:4199  (this PC only)
//   API     : ..\AppCore.API  (dotnet build, dotnet run --no-build)
//
// Safety
//   - bound to 127.0.0.1 : other PCs cannot reach it
//   - only the ERP dev UI origin is accepted (localhost:4100)
//   - every call needs the X-AppCore-Dev header, so other web
//     sites cannot fire it from a browser
//   - it only runs the fixed dotnet / taskkill commands below;
//     nothing from the request is ever run
//
// The API output is shown in this window (as dotnet run did).
// Closing this window stops the API it started.
//
// --all  (start-appcore.cmd : the whole day in one double-click)
//   builds + starts the API, starts the UI (ng serve, port 4100)
//   when it is not already running, and opens the browser.
//===============================================================

'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = 4199;
const HOST = '127.0.0.1';
const API_DIR = path.resolve(__dirname, '..', 'AppCore.API');
const API_EXE = 'AppCore.API.exe';
const ALLOWED_ORIGINS = ['http://localhost:4100', 'http://127.0.0.1:4100'];
const MAX_LOG = 400;
const UI_DIR = path.resolve(__dirname, '..', '..', 'Frontend_Studio', 'Studio_UI');
const UI_PORT = 4100;
const UI_URL = 'http://localhost:' + UI_PORT;
const START_ALL = process.argv.includes('--all');

if (!fs.existsSync(path.join(API_DIR, 'AppCore.API.csproj')))
{
    console.error('AppCore.API.csproj not found in ' + API_DIR);
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
let uiChild = null;
let uiState = 'off';
const uiTail = [];         // last ng serve lines (why it stopped)       // off | starting | running | external | stopped | missing
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
        console.log('\n[' + stamp() + '] ' + (action === 'build-restart' ? 'Build & Restart' : 'Restart') + ' asked from the ERP');

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

function openBrowser()
{
    const chrome =
        chromePath();

    if (chrome)
    {
        spawn(chrome, [UI_URL], { detached: true, stdio: 'ignore' }).unref();

        return;
    }

    spawn('cmd', ['/c', 'start', '', UI_URL], { detached: true, stdio: 'ignore' }).unref();
}

async function startUi()
{
    if (!fs.existsSync(path.join(UI_DIR, 'package.json')))
    {
        uiState = 'missing';

        console.log('[' + stamp() + '] UI folder not found : ' + UI_DIR + ' (start ng serve yourself)');

        return false;
    }

    if (await portOpen(UI_PORT))
    {
        uiState = 'external';

        console.log('[' + stamp() + '] UI already running on ' + UI_URL);

        return true;
    }

    uiState = 'starting';

    console.log('[' + stamp() + '] ng serve (' + UI_DIR + ') ...');

    return new Promise(resolve =>
    {
        let ready = false;

        // NG_CLI_ANALYTICS / CI : ng never stops to ask a question
        // (nobody can answer it here and it quits)
        const child =
            spawn(
                'cmd',
                ['/c', 'npx', 'ng', 'serve', '--port', String(UI_PORT)],
                {
                    cwd: UI_DIR,
                    windowsHide: true,
                    stdio: ['ignore', 'pipe', 'pipe'],
                    env: { ...process.env, NG_CLI_ANALYTICS: 'false', NG_FORCE_TTY: 'false' }
                });

        uiChild = child;

        const feed = chunk =>
        {
            for (const line of chunk.toString().split(/\r?\n/))
            {
                if (!line.trim())
                {
                    continue;
                }

                process.stdout.write('[ui]  ' + line + '\n');

                uiTail.push(line);

                if (uiTail.length > 15)
                {
                    uiTail.shift();
                }

                if (!ready && /Local:|compiled successfully|bundle generation complete/i.test(line))
                {
                    ready = true;

                    uiState = 'running';

                    resolve(true);
                }
            }
        };

        child.stdout.on('data', feed);
        child.stderr.on('data', feed);

        child.on('close', async code =>
        {
            if (uiChild === child)
            {
                uiChild = null;

                uiState = 'stopped';

                console.log('\n[' + stamp() + '] the UI (ng serve) stopped (exit code ' + code + '). Its last lines :');

                for (const line of uiTail)
                {
                    console.log('      ' + line);
                }

                console.log('');
            }

            if (!ready)
            {
                // another ng serve (VS Code, a second window) already
                // serves the port : use it
                if (await portOpen(UI_PORT))
                {
                    uiState = 'external';

                    console.log('[' + stamp() + '] UI already running on ' + UI_URL + ' : using it');

                    resolve(true);

                    return;
                }

                resolve(false);
            }
        });

        // the first compile can be slow
        setTimeout(() => { if (!ready) { resolve(uiChild === child); } }, 180000);
    });
}

async function startAll()
{
    console.log('Starting the day : API build + run, UI, browser\n');

    // API and UI side by side (the API job runs in the background)
    void job('build-restart');

    const uiUp =
        await startUi();

    // wait for the API job to end (max 5 minutes)
    for (let i = 0; i < 300 && (busy || state.jobId === 0); i++)
    {
        await new Promise(r => setTimeout(r, 1000));
    }

    // the browser opens whenever the UI answers (also when ng serve
    // was started elsewhere)
    const uiAnswers =
        uiUp || await portOpen(UI_PORT);

    if (uiAnswers)
    {
        openBrowser();
    }

    console.log('\n[' + stamp() + '] Ready : API ' + state.state + ', UI ' + uiState
        + (uiAnswers ? ' -> ' + UI_URL + ' (opened in Chrome)' : '') + '\n');

    if (!uiAnswers)
    {
        console.log('The UI did not start, so the browser was not opened. The [ui] lines above say why.');
        console.log('Start it by hand : cd /d "' + UI_DIR + '" && npx ng serve --port ' + UI_PORT + '\n');
    }
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

        if (req.method === 'GET' && url === '/status')
        {
            return send(res, origin, 200, { ...state, busy, running: !!apiChild, uiState });
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
    console.log('AppCore Dev Agent on http://' + HOST + ':' + PORT);
    console.log('API folder : ' + API_DIR);
    console.log('Use "Server online" in the ERP footer to build / restart the API.');
    console.log('Keep this window open. Closing it stops the API' + (START_ALL ? ' and the UI' : '') + ' it started.\n');

    if (START_ALL)
    {
        void startAll();
    }
});

// closing the window : stop the API we started
function shutdown()
{
    for (const child of [apiChild, uiChild])
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
