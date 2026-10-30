//===============================================================
// Topbar Header
// --------------------------------------------------------------
// Logo block (same width as the sidebar) and the sidebar
// toggle. The only sidebar toggle in the shell.
//
// Company logo: the active company from Settings › General
//               Settings › Company (same rule as printing:
//               first active company, else the first one).
//               No logo uploaded → the company name.
//===============================================================

import
{
    Component,
    OnInit,
    inject,
    signal
}
from '@angular/core';

import
{
    toSignal
}
from '@angular/core/rxjs-interop';

import
{
    SidebarService
}
from '../../../../core/sidebar/sidebar.service';

import
{
    CompanyService
}
from '../../../../features/settings/general-settings/services/company.service';


@Component(
{
    selector:
        'app-topbar-header',

    standalone:
        true,

    imports:
    [
    ],

    templateUrl:
        './topbar-header.html',

    styleUrls:
    [
        './topbar-header.css'
    ]
})
export class TopbarHeaderComponent
implements
    OnInit
{

    //===========================================================
    // Dependencies
    //===========================================================

    private readonly sidebarService =
        inject(SidebarService);

    private readonly companyService =
        inject(CompanyService);


    //===========================================================
    // State
    //===========================================================

    readonly isCollapsed =
        toSignal(
            this.sidebarService.sidebarCollapsed$,
            {
                initialValue:
                    false
            }
        );

    readonly companyName =
        signal<string>('');

    readonly companyLogoUrl =
        signal<string>('');


    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnInit():
        void
    {
        this.loadCompany();
    }


    //===========================================================
    // Toggle Sidebar
    //===========================================================

    toggleSidebar():
        void
    {
        this.sidebarService.toggleSidebar();
    }


    //===========================================================
    // Company Logo
    //===========================================================

    private loadCompany():
        void
    {
        this.companyService
            .getAll()
            .subscribe(
            {
                next:
                    companies =>
                    {
                        const company =
                            companies.find(
                                x =>
                                    x.IsActive
                            )
                            ??
                            companies[0]
                            ??
                            null;

                        if
                        (
                            !company
                        )
                        {
                            return;
                        }

                        this.companyName.set(
                            (
                                company.CompanyShortName
                                ||
                                company.CompanyName
                                ||
                                ''
                            )
                            .trim()
                        );

                        this.companyLogoUrl.set(
                            this.toLogoUrl(
                                company.CompanyLogoPath
                            )
                        );
                    },

                error:
                    () =>
                    {
                        // No access or no company: nothing shown.
                    }
            });
    }


    onLogoError():
        void
    {
        // File missing on the server: show the name instead.
        this.companyLogoUrl.set(
            ''
        );
    }


    private toLogoUrl
    (
        path:
            string | null | undefined
    ):
        string
    {
        const trimmed =
            (path ?? '').trim();

        if
        (
            !trimmed
        )
        {
            return '';
        }

        if
        (
            /^(https?:|data:|blob:)/i.test(
                trimmed
            )
        )
        {
            return trimmed;
        }

        const base =
            this.companyService.getApiBaseUrl();

        return trimmed.startsWith('/')
            ? `${base}${trimmed}`
            : `${base}/${trimmed}`;
    }

}
