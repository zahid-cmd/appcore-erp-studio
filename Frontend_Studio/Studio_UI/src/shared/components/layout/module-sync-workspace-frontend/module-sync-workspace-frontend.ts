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
    selector:'app-module-sync-workspace-frontend',

    standalone:true,

    imports:
    [
        CommonModule,

        TextboxComponent,
    ],

    templateUrl:'./module-sync-workspace-frontend.html',

    styleUrl:'./module-sync-workspace-frontend.css'
})

export class ModuleSyncWorkspaceFrontendComponent
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
    moduleFolder:string = '';

    @Input()
    routesFolder:string = '';

    /* ===========================================================
       APPLICATION REGISTRATION
    =========================================================== */

    @Input()
    applicationRegistrationReadonly:boolean = false;

    @Input()
    moduleRouteFile:string = '';

    @Input()
    applicationRouteFile:string = '';

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
    moduleFolderChange =
        new EventEmitter<string>();

    @Output()
    routesFolderChange =
        new EventEmitter<string>();

    /* ===========================================================
       APPLICATION REGISTRATION
    =========================================================== */

    @Output()
    moduleRouteFileChange =
        new EventEmitter<string>();

    @Output()
    applicationRouteFileChange =
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

    emitModuleFolder(value:string | number):void
    {
        this.moduleFolderChange.emit(value.toString());
    }

    emitRoutesFolder(value:string | number):void
    {
        this.routesFolderChange.emit(value.toString());
    }

    /* ===========================================================
       APPLICATION REGISTRATION
    =========================================================== */

    emitModuleRouteFile(value:string | number):void
    {
        this.moduleRouteFileChange.emit(value.toString());
    }

    emitApplicationRouteFile(value:string | number):void
    {
        this.applicationRouteFileChange.emit(value.toString());
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