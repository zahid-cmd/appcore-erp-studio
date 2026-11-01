//===============================================================
// Topbar Context
// --------------------------------------------------------------
// Branch chip : from the stored login (branch chosen at login)
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
    }

}
