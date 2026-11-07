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
    BranchSwitchDialogComponent
}
from '../shared/components/layout/branch-switch/branch-switch-dialog';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector: 'app-root',

    standalone: true,

    imports:
    [
        RouterOutlet,

        // Switch Branch pop-up + the other-tab notice (2026-11-07)
        BranchSwitchDialogComponent
    ],

    templateUrl:
        './app.html',

    styleUrl:
        './app.css'
})

//===============================================================
// App Component
//===============================================================

export class App
{
}