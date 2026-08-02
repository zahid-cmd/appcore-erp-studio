//===============================================================
// Imports
//===============================================================

import
{
    Component,
    Input,
    Output,
    EventEmitter
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    FormsModule
}
from '@angular/forms';

import
{
    TextboxComponent
}
from '../../controls/textbox/textbox';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-synchronization-workspace-frontend',

    standalone:
        true,

    imports:
    [
        CommonModule,

        FormsModule,

        TextboxComponent
    ],

    templateUrl:
        './synchronization-workspace-frontend.html',

    styleUrl:
        './synchronization-workspace-frontend.css'
})


//===============================================================
// Synchronization Workspace Frontend Component
//===============================================================

export class SynchronizationWorkspaceFrontendComponent
{
    //===========================================================
    // Readonly States
    //===========================================================

    @Input()

    targetLocationReadonly =
        false;

    @Input()

    standardStructureReadonly =
        false;

    @Input()

    applicationRegistrationReadonly =
        false;

    //===========================================================
    // Target Location
    //===========================================================

    @Input()

    frontendSolution =
        '';

    @Input()

    projectName =
        '';

    @Input()

    sourceFolder =
        '';

    @Input()

    featureFolder =
        '';

    //===========================================================
    // Standard Module Structure
    //===========================================================

    @Input()

    moduleFolder =
        '';

    @Input()

    modelFolder =
        '';

    @Input()

    pagesFolder =
        '';

    @Input()

    routesFolder =
        '';

    @Input()

    servicesFolder =
        '';

    //===========================================================
    // Application Registration
    //===========================================================

    @Input()

    routeFile =
        '';

    @Input()

    applicationRouteFile =
        '';

    @Input()

    routePath =
        '';

    //===========================================================
    // Value Changed
    //===========================================================

    @Output()

    frontendSolutionChange =
        new EventEmitter<string | number>();

    @Output()

    projectNameChange =
        new EventEmitter<string | number>();

    @Output()

    sourceFolderChange =
        new EventEmitter<string | number>();

    @Output()

    featureFolderChange =
        new EventEmitter<string | number>();


    @Output()

    moduleFolderChange =
        new EventEmitter<string | number>();

    @Output()

    modelFolderChange =
        new EventEmitter<string | number>();

    @Output()

    pagesFolderChange =
        new EventEmitter<string | number>();

    @Output()

    routesFolderChange =
        new EventEmitter<string | number>();

    @Output()

    servicesFolderChange =
        new EventEmitter<string | number>();


    @Output()

    routeFileChange =
        new EventEmitter<string | number>();

    @Output()

    applicationRouteFileChange =
        new EventEmitter<string | number>();

    @Output()

    routePathChange =
        new EventEmitter<string | number>();
}