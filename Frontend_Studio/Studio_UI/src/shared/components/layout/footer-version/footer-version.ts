//===============================================================
// Imports
//===============================================================

import
{
    Component,
    inject
}
from '@angular/core';

import
{
    SidebarService
}
from '../../../../core/sidebar/sidebar.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector: 'app-footer-version',

    standalone: true,

    templateUrl:
        './footer-version.html',

    styleUrl:
        './footer-version.css'
})

//===============================================================
// Footer Version Component
//===============================================================

export class FooterVersionComponent
{
    //===========================================================
    // Dependencies
    //===========================================================

    private readonly sidebarService =
        inject(SidebarService);

    //===========================================================
    // Properties
    //===========================================================

    version =
        'Version 1.0.0';

    //===========================================================
    // Toggle Sidebar
    //===========================================================

    toggleSidebar():
        void
    {
        this.sidebarService.toggleSidebar();
    }
}