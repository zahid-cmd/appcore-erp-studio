//===============================================================
// Topbar Context
// --------------------------------------------------------------
// Branch chip : from the stored login (branch chosen at login);
//               opens Switch Branch when the user may switch.
//               On a Motor Bikes / Spare Parts / Accessories page
//               (2026-11-13) it shows the page's working branch
//               (Showroom / Service Center / Accessory Shop) and,
//               with two or more, lists them : a pick reloads the
//               page in that branch (WorkBranchService).
// FY chip     : GET api/platform/shell/context
// (The company logo moved to the topbar header.)
//===============================================================

import
{
    Component,
    OnInit,
    computed,
    inject,
    signal
}
from '@angular/core';

import
{
    AuthenticationStorageService
}
from '../../../../core/authentication/authentication-storage.service';

import
{
    ShellService
}
from '../../../../core/shell/shell.service';

import
{
    BranchSwitchService
}
from '../../../../core/authentication/branch-switch.service';

import
{
    WORK_LINE_LABEL,
    WorkBranchService
}
from '../../../../core/authentication/work-branch.service';



@Component(
{
    selector:
        'app-topbar-context',

    standalone:
        true,

    imports:
    [
    ],

    templateUrl:
        './topbar-context.html',

    styleUrls:
    [
        './topbar-context.css'
    ]
})
export class TopbarContextComponent
implements
    OnInit
{

    //===========================================================
    // Dependencies
    //===========================================================

    private readonly authenticationStorageService =
        inject(AuthenticationStorageService);

    private readonly shellService =
        inject(ShellService);

    readonly branchSwitch =
        inject(BranchSwitchService);

    // Line pages : the branch of the page's business line
    readonly workBranch =
        inject(WorkBranchService);

    // The working-branch list is open
    readonly workMenuOpen =
        signal<boolean>(false);

    // "Showroom" / "Service Center" / "Accessory Shop"
    readonly workLabel =
        computed(
            () =>
            {
                const line = this.workBranch.line();

                return line ? WORK_LINE_LABEL[line] : '';
            });


    //===========================================================
    // State
    //===========================================================

    readonly branchName =
        signal<string>('');

    readonly context =
        this.shellService.context;

    readonly financialYearTitle =
        computed(
            () =>
            {
                const row =
                    this.context();

                if
                (
                    !row
                )
                {
                    return '';
                }

                const parts =
                [
                    row.financialYearName
                    ||
                    row.financialYearCode
                    ||
                    '',

                    row.financialYearCode
                    &&
                    row.financialYearName
                    ? `(${row.financialYearCode})`
                    : '',

                    row.yearStatus
                    ? `· ${row.yearStatus}`
                    : '',

                    row.today
                    ? `· Today ${row.today}`
                    : ''
                ];

                return 'Financial year: ' +
                    parts
                        .filter(
                            x =>
                                x.length > 0
                        )
                        .join(' ');
            }
        );


    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnInit():
        void
    {
        const user =
            this.authenticationStorageService
                .getUser();

        this.branchName.set(
            (
                user?.branchName
                ||
                user?.branchCode
                ||
                ''
            )
            .trim()
        );

        this.shellService.loadContext();

        this.workBranch.start();
    }


    //===========================================================
    // Working branch chip (line pages) : open the list / pick
    //===========================================================

    onWorkClick():
        void
    {
        if (this.workBranch.canPick())
        {
            this.workMenuOpen.update(x => !x);
        }
    }

    onWorkPick
    (
        branchId: number
    ):
        void
    {
        this.workMenuOpen.set(false);

        this.workBranch.choose(branchId);
    }

    onWorkClose():
        void
    {
        this.workMenuOpen.set(false);
    }



    //===========================================================
    // Branch chip click : Switch Branch
    //===========================================================

    onBranchClick():
        void
    {
        if (this.branchSwitch.canSwitch())
        {
            this.branchSwitch.open();
        }
    }
}
