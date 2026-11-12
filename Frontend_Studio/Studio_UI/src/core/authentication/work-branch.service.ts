//===============================================================
// Working Branch Service (owner 2026-11-13 03:28)
// --------------------------------------------------------------
// A user assigned to several branches works, on each operational
// page, in a branch that runs the page's business line :
//
//   Motor Bikes  pages (bike sales, bookings, deliveries, bike
//                purchase / receiving / stock, Sales Center
//                offers)                -> a Motor Bikes showroom
//   Spare Parts  pages (parts sales / purchase / receiving /
//                stock, Service Center offers) -> a service center
//   Accessories  pages (accessory sales / purchase / receiving /
//                stock, Accessory Shop offers) -> an accessory shop
//
// The choice per line : the branch the user picked before on this
// device (localStorage, per user and line), else the branch that
// fits the line best (a service center for Spare Parts, not an
// accessory shop that also sells parts), the login branch first
// among equals. With two or more
// the top-bar Branch chip opens a list of them.
//
// Every API call made from a line page carries X-Work-Branch
// (authentication interceptor); the server checks the user is
// assigned to it (WorkBranchMiddleware) and the page's server
// checks the business line. Other pages keep the login branch.
//
// The branches (and the lines each runs today) come from the
// Switch Branch list : GET api/platform/branch-switch/my-branches.
// Branch switching OFF (Branch Assignment setting) = login branch
// only.
//===============================================================

import
{
    Injectable,
    computed,
    effect,
    inject,
    signal
}
from '@angular/core';

import
{
    NavigationEnd,
    Router
}
from '@angular/router';

import
{
    filter
}
from 'rxjs';

import
{
    AuthenticationStorageService
}
from './authentication-storage.service';

import
{
    BranchSwitchService,
    SwitchBranchOption
}
from './branch-switch.service';


export type WorkLine =
    'Motor Bikes' | 'Spare Parts' | 'Accessories';


// Short labels for the top bar
export const WORK_LINE_LABEL: Record<WorkLine, string> =
{
    'Motor Bikes':'Showroom',
    'Spare Parts':'Service Center',
    'Accessories':'Accessory Shop'
};


// The business line of a page, from its address ('' = none).
// Only the operational modules; settings pages keep the login
// branch.
export function workLineOf(path: string): WorkLine | null
{
    const p = (path || '').split('?')[0].split('#')[0].toLowerCase();

    if (!/^\/(sales-operations|procurement|inventory-management)\//.test(p))
    {
        return null;
    }

    if (/(spare-parts|lubricant|-sp(\/|$)|promotional-offers-service-center)/.test(p))
    {
        return 'Spare Parts';
    }

    if (/(accessor|-ac(\/|$)|promotional-offers-accessory-shop)/.test(p))
    {
        return 'Accessories';
    }

    if (/(motor-bike|-mb(\/|$)|promotional-offers-sales-center|booking-management|bike-deliver)/.test(p))
    {
        return 'Motor Bikes';
    }

    return null;
}


// v2 (2026-11-13 03:43) : "u:<id>" = picked by the user, "a:<id>"
// = chosen automatically (recomputed; the old v1 picks are dropped)
const KEY_PREFIX =
    'appcore_work_branch_v2';


function parseStored(raw: string | null): { id:number; user:boolean }
{
    const text = (raw ?? '').trim();

    const m = /^([ua]):(\d+)$/.exec(text);

    return m
        ? { id:Number(m[2]) || 0, user:m[1] === 'u' }
        : { id:0, user:false };
}


// How well a branch fits a line (higher = the branch made for it) :
// a service center (Spare Parts + Services) before an accessory
// shop that also sells parts; a dedicated branch before a mixed one
// The wing tells the branch's kind first (2026-11-13 03:56 : a
// service center and an accessory shop may run the very same lines,
// e.g. Spare Parts + Accessories + Services) : Service Center wing
// for Spare Parts, Accessory Shop wing for Accessories, Sales Center
// / Showroom wing for Motor Bikes.
// By WING CODE (owner 2026-11-13 04:07) : WNG-<company>-01 Sales
// Center (showrooms), -02 Service Center, -03 Accessory Shop

// The wing number of a branch (owner 2026-11-13 04:17 : every branch
// sits under its dedicated wing, and the codes say which) : the wing
// code WNG-<company>-<wing>, else the branch code
// BRN-<company>-<wing>-<n>. 01 Sales Center, 02 Service Center, 03
// Accessory Shop. No wing names are used.
const WING_NO_OF_LINE: Record<WorkLine, number> =
{
    'Motor Bikes':1,
    'Spare Parts':2,
    'Accessories':3
};

function wingNoOf(b: { wingCode?:string; branchCode?:string }): number
{
    const wing = (b.wingCode || '').trim().split('-');

    if (wing.length >= 3 && /^\d+$/.test(wing[2]))
    {
        return Number(wing[2]);
    }

    const branch = (b.branchCode || '').trim().split('-');

    return branch.length >= 4 && /^\d+$/.test(branch[2]) ? Number(branch[2]) : 0;
}

function inWingOf(line: WorkLine, b: { wingCode?:string; branchCode?:string }): boolean
{
    return wingNoOf(b) === WING_NO_OF_LINE[line];
}


function lineFit(line: WorkLine, lines: string[], wingCode: string, branchCode: string): number
{
    const wingBonus =
        inWingOf(line, { wingCode, branchCode }) ? 10 : 0;

    const others =
        lines.filter(x => x !== line && !(line === 'Spare Parts' && x === 'Services')).length;

    const serviceBonus =
        line === 'Spare Parts' && lines.includes('Services') ? 3 : 0;

    return wingBonus + serviceBonus - others;
}


// The stored working branch of a page address for a user (0 =
// none). Used by the authentication interceptor without the
// service (no HttpClient loop).
export function storedWorkBranchId(path: string, userId: number): number
{
    const line = workLineOf(path);

    if (!line || !userId)
    {
        return 0;
    }

    try
    {
        return parseStored(localStorage.getItem(`${KEY_PREFIX}_${userId}_${line.replace(/\s+/g, '')}`)).id;
    }
    catch
    {
        return 0;
    }
}


@Injectable(
{
    providedIn:'root'
})
export class WorkBranchService
{
    private readonly router =
        inject(Router);

    private readonly storage =
        inject(AuthenticationStorageService);

    private readonly branchSwitch =
        inject(BranchSwitchService);


    //===========================================================
    // State
    //===========================================================

    // The current page's address
    readonly url =
        signal<string>(typeof window !== 'undefined' ? window.location.pathname : '');

    // The current page's business line (null = not a line page)
    readonly line =
        computed<WorkLine | null>(() => workLineOf(this.url()));

    // The user's branches of the page's wing (owner 2026-11-13
    // 04:05) : Motor Bikes pages -> every branch of the Sales Center
    // wing, Spare Parts pages -> the Service Center wing, Accessories
    // pages -> the Accessory Shop wing. When no branch of the user is
    // in that wing, the branches that run the line today.
    readonly lineBranches =
        computed<SwitchBranchOption[]>(
            () =>
            {
                const line = this.line();

                const mine = this.branchSwitch.myBranches();

                if (!line || !mine)
                {
                    return [];
                }

                const ofWing =
                    mine.branches.filter(b => inWingOf(line, b));

                return ofWing.length > 0
                    ? ofWing
                    : mine.branches.filter(b => b.businessLines.includes(line));
            });

    // Branch switching ON (Branch Assignment setting)
    readonly switchAllowed =
        computed(() => this.branchSwitch.myBranches()?.switchAllowed !== false);

    // The working branch of the current line page
    readonly current =
        computed<SwitchBranchOption | null>(
            () =>
            {
                const line = this.line();

                const list = this.lineBranches();

                if (!line || list.length === 0)
                {
                    return null;
                }

                const id = this.pick(line, list);

                return list.find(b => b.branchId === id) ?? null;
            });

    // The list opens only with two or more branches of the line
    readonly canPick =
        computed(() => this.switchAllowed() && this.lineBranches().length > 1);


    private started = false;


    constructor()
    {
        // A stale / missing pick : once the branches are known the
        // stored pick is fixed; a line page already loaded with
        // another branch reloads once
        effect(
            () =>
            {
                const line = this.line();

                const list = this.lineBranches();

                if (!line || list.length === 0)
                {
                    return;
                }

                const want = this.pick(line, list);

                const sent = this.storedId(line);

                // No branch of the line may be used (switching OFF and
                // the login branch does not run it) : forget the pick
                if (want === 0 && sent > 0)
                {
                    this.clear(line);

                    window.location.reload();

                    return;
                }

                if (want > 0 && sent !== want)
                {
                    this.store(line, want, false);

                    // The page's first calls went with the old
                    // branch : load it again with the right one
                    if (sent > 0 || want !== this.loginBranchId)
                    {
                        window.location.reload();
                    }
                }
            });
    }


    // Called once by the top bar
    start(): void
    {
        if (this.started)
        {
            return;
        }

        this.started = true;

        this.branchSwitch.load();

        this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe(() => this.url.set(window.location.pathname));
    }


    //===========================================================
    // For the interceptor / pages
    //===========================================================

    // The branch id the current line page works in (0 = none : the
    // login branch applies). Read straight from storage so the
    // page's first calls carry it even before the list loads.
    workBranchIdFor(path: string): number
    {
        const line = workLineOf(path);

        if (!line)
        {
            return 0;
        }

        return this.storedId(line);
    }

    // For pages that send their branch themselves (purchase
    // orders, purchases, receiving, stock) : the working branch
    // of the current page, else the login branch
    branchIdOr(loginBranchId: number): number
    {
        const id = this.workBranchIdFor(window.location.pathname);

        return id > 0 ? id : loginBranchId;
    }

    branchNameOr(loginBranchName: string): string
    {
        const id = this.workBranchIdFor(window.location.pathname);

        if (id <= 0)
        {
            return loginBranchName;
        }

        const row = this.branchSwitch.myBranches()?.branches.find(b => b.branchId === id);

        return row?.branchName || loginBranchName;
    }


    //===========================================================
    // The top-bar list : pick a branch of the line (the page
    // reloads in it)
    //===========================================================

    choose(branchId: number): void
    {
        const line = this.line();

        if (!line || !this.lineBranches().some(b => b.branchId === branchId))
        {
            return;
        }

        if (this.storedId(line) === branchId && this.storedByUser(line))
        {
            return;
        }

        const reload = this.storedId(line) !== branchId;

        this.store(line, branchId, true);

        if (!reload)
        {
            return;
        }

        window.location.reload();
    }


    //===========================================================
    // Helpers
    //===========================================================

    private get loginBranchId(): number
    {
        return Number(this.storage.getUser()?.branchId ?? 0);
    }

    private get userId(): number
    {
        return Number((this.storage.getUser() as any)?.userProfileId ?? 0);
    }

    private key(line: WorkLine): string
    {
        return `${KEY_PREFIX}_${this.userId}_${line.replace(/\s+/g, '')}`;
    }

    // The user's own pick (top bar), else the branch that fits the
    // line best (service center for Spare Parts ...), the login
    // branch first among equals; switching OFF = login branch only
    private pick(line: WorkLine, list: SwitchBranchOption[]): number
    {
        const login = this.loginBranchId;

        if (!this.switchAllowed())
        {
            return list.some(b => b.branchId === login) ? login : 0;
        }

        const stored = this.storedId(line);

        if (stored > 0 && this.storedByUser(line) && list.some(b => b.branchId === stored))
        {
            return stored;
        }

        const ranked =
            [...list].sort(
                (a, b) =>
                    lineFit(line, b.businessLines, b.wingCode, b.branchCode) - lineFit(line, a.businessLines, a.wingCode, a.branchCode)
                    || (b.branchId === login ? 1 : 0) - (a.branchId === login ? 1 : 0)
                    || a.branchName.localeCompare(b.branchName));

        return ranked[0]?.branchId ?? 0;
    }

    private storedId(line: WorkLine): number
    {
        try
        {
            return parseStored(localStorage.getItem(this.key(line))).id;
        }
        catch
        {
            return 0;
        }
    }

    private clear(line: WorkLine): void
    {
        try
        {
            localStorage.removeItem(this.key(line));
        }
        catch
        {
            // nothing stored
        }
    }

    private storedByUser(line: WorkLine): boolean
    {
        try
        {
            return parseStored(localStorage.getItem(this.key(line))).user;
        }
        catch
        {
            return false;
        }
    }

    private store(line: WorkLine, branchId: number, byUser: boolean): void
    {
        try
        {
            localStorage.setItem(this.key(line), `${byUser ? 'u' : 'a'}:${branchId}`);
        }
        catch
        {
            // storage blocked : the login branch applies
        }
    }
}
