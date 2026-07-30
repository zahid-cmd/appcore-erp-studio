//===============================================================
// Imports
//===============================================================

import
{
    Component
}
from '@angular/core';

import
{
    RouterOutlet
}
from '@angular/router';

import
{
    TopbarComponent
}
from '../topbar/topbar';

import
{
    SidebarComponent
}
from '../../features/infrastructure-control/navigation-management/sidebar/sidebar';

import
{
    FooterComponent
}
from '../footer/footer';

import
{
    BreadcrumbComponent
}
from '../../shared/components/layout/breadcrumb/breadcrumb';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector: 'app-layout',

    standalone: true,

    imports:
    [
        RouterOutlet,
        TopbarComponent,
        SidebarComponent,
        FooterComponent,
        BreadcrumbComponent
    ],

    templateUrl:
        './layout.html',

    styleUrls:
    [
        './layout.css'
    ]
})

//===============================================================
// Layout Component
//===============================================================

export class LayoutComponent
{
    //===========================================================
    // Properties
    //===========================================================

    isSidebarCollapsed =
        false;

    //===========================================================
    // Toggle Sidebar
    //===========================================================

    toggleSidebar():
        void
    {
        this.isSidebarCollapsed =
            !this.isSidebarCollapsed;
    }
}