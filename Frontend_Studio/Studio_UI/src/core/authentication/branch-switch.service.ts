//===============================================================
// Branch Switch Service (user menu › Switch Branch, 2026-11-07)
// --------------------------------------------------------------
// A user assigned to two or more active branches (Branch
// Assignment) moves the session to another of them without
// logging out :
//
//   GET  api/platform/branch-switch/my-branches
//   POST api/platform/branch-switch  { branchId }  → new token
//
// After a switch the app reloads on the Dashboard, so no open
// page keeps the old branch's warehouses, defaults or counts.
//
// Other tabs : a "remember me" login lives in localStorage and is
// shared by every tab. A switch writes BRANCH_SWITCH_KEY; every
// other tab whose branch no longer matches the stored login shows
// a notice and reloads. (A login without "remember me" lives in
// sessionStorage, one per tab : the other tabs keep their own
// branch and need nothing.)
//===============================================================

import
{
    Injectable,
    NgZone,
    computed,
    inject,
    signal
}
from '@angular/core';

import
{
    HttpClient
}
from '@angular/common/http';

import
{
    Observable,
    map,
    tap
}
from 'rxjs';

import
{
    environment
}
from '../../environments/environment';

import
{
    AuthenticationStorageService
}
from './authentication-storage.service';

import
{
    LoginResponse
}
from './authentication.model';


// One branch the user may work in
export interface SwitchBranchOption
{
    branchId:number;
    branchCode:string;
    branchName:string;
    wingName:string;
    businessLines:string[];
    isCurrent:boolean;
}


export interface MyBranches
{
    currentBranchId:number;
    switchAllowed:boolean;
    canSwitch:boolean;
    message:string;
    branches:SwitchBranchOption[];
}


// localStorage key written on every switch (other tabs listen)
export const BRANCH_SWITCH_KEY =
    'appcore_branch_switched';


const pick =
    (item: any, name: string): any =>
        item?.[name] ?? item?.[name.charAt(0).toUpperCase() + name.slice(1)];


@Injectable(
{
    providedIn:'root'
})
export class BranchSwitchService
{
    private readonly http =
        inject(HttpClient);

    private readonly storage =
        inject(AuthenticationStorageService);

    private readonly zone =
        inject(NgZone);

    private readonly apiUrl =
        `${environment.apiUrl}/platform/branch-switch`;


    //===========================================================
    // State
    //===========================================================

    // The branch this tab started with
    private readonly loadedBranchId =
        Number(this.storage.getUser()?.branchId ?? 0);

    readonly myBranches =
        signal<MyBranches | null>(null);

    // The clickable chip shows only when true
    readonly canSwitch =
        computed(() => !!this.myBranches()?.canSwitch);

    // Why the branches could not be loaded ('' = fine)
    readonly loadError =
        signal<string>('');

    // The menu item : can switch, or the check failed (the pop-up
    // then says why instead of the item silently missing)
    readonly showMenuItem =
        computed(() => this.canSwitch() || this.loadError() !== '');

    // The pop-up
    readonly dialogOpen =
        signal<boolean>(false);

    // Another tab switched : "Branch changed to … reloading"
    readonly otherTabNotice =
        signal<string>('');

    private listening = false;

    private loading = false;


    constructor()
    {
        this.listenToOtherTabs();
    }


    //===========================================================
    // Load the user's branches (once per page load; again when
    // the pop-up opens)
    //===========================================================

    load
    (
        force: boolean = false
    ):
        void
    {
        if (this.loading || (!force && this.myBranches()))
        {
            return;
        }

        if (!this.storage.getToken())
        {
            return;
        }

        this.loading = true;

        this.loadError.set('');

        this.http
            .get<any>(`${this.apiUrl}/my-branches`)
            .pipe(
                map(r => this.readMyBranches(r)))
            .subscribe(
            {
                next:(value: MyBranches): void =>
                {
                    this.myBranches.set(value);

                    this.loading = false;
                },

                error:(error: any): void =>
                {
                    this.loading = false;

                    this.loadError.set(
                        error?.status === 404
                            ? 'Branch switching is not available on the server yet (rebuild and restart the backend).'
                            : error?.error?.message
                                ?? `Your branches could not be loaded (${error?.status ?? 'no answer'}).`);
                }
            });
    }


    open(): void
    {
        this.dialogOpen.set(true);

        this.load(true);
    }


    close(): void
    {
        this.dialogOpen.set(false);
    }


    //===========================================================
    // Switch : new token → stored login → tell the other tabs
    // (the caller reloads)
    //===========================================================

    switchTo
    (
        branchId: number
    ):
        Observable<LoginResponse>
    {
        return this.http
            .post<LoginResponse>(this.apiUrl, { branchId })
            .pipe(
                tap(
                    response =>
                    {
                        this.storage.replaceBranchSession(response);

                        const branch =
                            response.branches?.find(x => x.branchId === branchId);

                        try
                        {
                            localStorage.setItem(
                                BRANCH_SWITCH_KEY,
                                JSON.stringify(
                                {
                                    branchId,
                                    branchName:branch?.branchName ?? '',
                                    at:Date.now()
                                }));
                        }
                        catch
                        {
                            // Storage full / blocked : the other tabs
                            // find out on their next server call
                        }
                    }));
    }


    // A fresh start on the Dashboard (nothing of the old branch
    // stays in memory)
    reloadToDashboard(): void
    {
        window.location.assign('/dashboard');
    }


    //===========================================================
    // Other tabs
    //===========================================================

    private listenToOtherTabs(): void
    {
        if (this.listening || typeof window === 'undefined')
        {
            return;
        }

        this.listening = true;

        window.addEventListener(
            'storage',
            (event: StorageEvent): void =>
            {
                if (event.key !== BRANCH_SWITCH_KEY || !event.newValue)
                {
                    return;
                }

                // Only when this tab's login really changed branch
                // (a sessionStorage login keeps its own branch)
                const nowBranchId =
                    Number(this.storage.getUser()?.branchId ?? 0);

                if (!nowBranchId || nowBranchId === this.loadedBranchId)
                {
                    return;
                }

                let name = '';

                try
                {
                    name = String(JSON.parse(event.newValue)?.branchName ?? '');
                }
                catch
                {
                    name = '';
                }

                this.zone.run(
                    () =>
                        this.otherTabNotice.set(
                            name
                                ? `Branch changed to ${name} in another tab.`
                                : 'The branch was changed in another tab.'));

                setTimeout(
                    () => window.location.reload(),
                    2500);
            });
    }


    //===========================================================
    // Reader (PascalCase or camelCase)
    //===========================================================

    private readMyBranches
    (
        r: any
    ):
        MyBranches
    {
        return {
            currentBranchId:Number(pick(r, 'currentBranchId') ?? 0),
            switchAllowed:pick(r, 'switchAllowed') !== false,
            canSwitch:!!pick(r, 'canSwitch'),
            message:String(pick(r, 'message') ?? ''),
            branches:
                ((pick(r, 'branches') ?? []) as any[])
                    .map(
                        b =>
                        ({
                            branchId:Number(pick(b, 'branchId') ?? 0),
                            branchCode:String(pick(b, 'branchCode') ?? ''),
                            branchName:String(pick(b, 'branchName') ?? ''),
                            wingName:String(pick(b, 'wingName') ?? ''),
                            businessLines:((pick(b, 'businessLines') ?? []) as any[]).map(x => String(x)),
                            isCurrent:!!pick(b, 'isCurrent')
                        }))
        };
    }
}
