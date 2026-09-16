import
{
    Component,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    SidebarService
}
from '../../../../core/sidebar/sidebar.service';

@Component(
{
    selector: 'app-topbar-header',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './topbar-header.html',

    styleUrls:
    [
        './topbar-header.css'
    ]
})

export class TopbarHeaderComponent
{
    //===========================================================
    // Dependencies
    //===========================================================

    private readonly sidebarService =
        inject(SidebarService);


    //===========================================================
    // Toggle Sidebar
    //===========================================================

    toggleSidebar():
        void
    {
        this.sidebarService.toggleSidebar();
    }
}