//===============================================================
// Footer Version
// --------------------------------------------------------------
// Version badge at the left of the app footer. Its block is as
// wide as the sidebar. (The sidebar toggle now lives only in
// the top bar.)
//===============================================================

import
{
    Component,
    inject
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


//===============================================================
// Application Version
// --------------------------------------------------------------
// Change it here when a new version is released.
//===============================================================

export const APPCORE_VERSION =
    'v1.0.0';


@Component(
{
    selector:
        'app-footer-version',

    standalone:
        true,

    templateUrl:
        './footer-version.html',

    styleUrl:
        './footer-version.css'
})
export class FooterVersionComponent
{

    //===========================================================
    // Dependencies
    //===========================================================

    private readonly sidebarService =
        inject(SidebarService);


    //===========================================================
    // State
    //===========================================================

    readonly version =
        APPCORE_VERSION;

    readonly isCollapsed =
        toSignal(
            this.sidebarService.sidebarCollapsed$,
            {
                initialValue:
                    false
            }
        );

}