/* ===============================================================
   IMPORTS
=============================================================== */

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
    TextboxComponent
}
from '../../controls/textbox/textbox';

/* ===============================================================
   COMPONENT
=============================================================== */

@Component(
{
    selector:'app-menu-sync-workspace-frontend',

    standalone:true,

    imports:
    [
        CommonModule,

        TextboxComponent,
    ],

    templateUrl:'./menu-sync-workspace-frontend.html',

    styleUrl:'./menu-sync-workspace-frontend.css'
})

export class MenuSyncWorkspaceFrontendComponent
{
    /* ===========================================================
    TARGET LOCATION
    =========================================================== */

    @Input()
    targetLocationReadonly:boolean = false;

    @Input()
    frontendSolution:string = '';

    @Input()
    project:string = '';

    @Input()
    sourceFolder:string = '';

    @Input()
    featureFolder:string = '';

    /* ===========================================================
    MODULE STRUCTURE
    =========================================================== */

    @Input()
    standardStructureReadonly:boolean = false;

    @Input()
    menuFolder:string = '';

    @Input()
    modelsFolder:string = '';

    @Input()
    servicesFolder:string = '';

    @Input()
    pagesFolder:string = '';

    @Input()
    routesFolder:string = '';

    /* ===========================================================
    APPLICATION REGISTRATION
    =========================================================== */

    @Input()
    applicationRegistrationReadonly:boolean = false;

    @Input()
    menuRouteFile:string = '';

    @Input()
    moduleRouteFile:string = '';

    /* ===========================================================
    TARGET LOCATION
    =========================================================== */

    @Output()
    frontendSolutionChange =
        new EventEmitter<string>();

    @Output()
    projectChange =
        new EventEmitter<string>();

    @Output()
    sourceFolderChange =
        new EventEmitter<string>();

    @Output()
    featureFolderChange =
        new EventEmitter<string>();

    /* ===========================================================
    MODULE STRUCTURE
    =========================================================== */

    @Output()
    menuFolderChange =
        new EventEmitter<string>();

    @Output()
    modelsFolderChange =
        new EventEmitter<string>();

    @Output()
    servicesFolderChange =
        new EventEmitter<string>();

    @Output()
    pagesFolderChange =
        new EventEmitter<string>();

    @Output()
    routesFolderChange =
        new EventEmitter<string>();

    /* ===========================================================
    APPLICATION REGISTRATION
    =========================================================== */

    @Output()
    menuRouteFileChange =
        new EventEmitter<string>();

    @Output()
    moduleRouteFileChange =
        new EventEmitter<string>();

    /* ===========================================================
    ACTIONS
    =========================================================== */

    @Output()
    targetLocationEditClick =
        new EventEmitter<void>();

    @Output()
    standardStructureEditClick =
        new EventEmitter<void>();

    @Output()
    applicationRegistrationEditClick =
        new EventEmitter<void>();

    /* ===========================================================
    TARGET LOCATION
    =========================================================== */

    emitFrontendSolution(value:string | number):void
    {
        this.frontendSolutionChange.emit(value.toString());
    }

    emitProject(value:string | number):void
    {
        this.projectChange.emit(value.toString());
    }

    emitSourceFolder(value:string | number):void
    {
        this.sourceFolderChange.emit(value.toString());
    }

    emitFeatureFolder(value:string | number):void
    {
        this.featureFolderChange.emit(value.toString());
    }

    /* ===========================================================
    MODULE STRUCTURE
    =========================================================== */

    emitMenuFolder(value:string | number):void
    {
        this.menuFolderChange.emit(value.toString());
    }

    emitModelsFolder(value:string | number):void
    {
        this.modelsFolderChange.emit(value.toString());
    }

    emitServicesFolder(value:string | number):void
    {
        this.servicesFolderChange.emit(value.toString());
    }

    emitPagesFolder(value:string | number):void
    {
        this.pagesFolderChange.emit(value.toString());
    }

    emitRoutesFolder(value:string | number):void
    {
        this.routesFolderChange.emit(value.toString());
    }

    /* ===========================================================
    APPLICATION REGISTRATION
    =========================================================== */

    emitMenuRouteFile(value:string | number):void
    {
        this.menuRouteFileChange.emit(value.toString());
    }

    emitModuleRouteFile(value:string | number):void
    {
        this.moduleRouteFileChange.emit(value.toString());
    }

    /* ===========================================================
    EDITING
    =========================================================== */

    onTargetLocationEdit():void
    {
        this.targetLocationEditClick.emit();
    }

    onStandardStructureEdit():void
    {
        this.standardStructureEditClick.emit();
    }

    onApplicationRegistrationEdit():void
    {
        this.applicationRegistrationEditClick.emit();
    }
}