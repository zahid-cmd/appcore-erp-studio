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

import
{
    SearchDropdownComponent
}
from '../../controls/search-dropdown/search-dropdown';


/* ===============================================================
   COMPONENT
=============================================================== */

@Component(
{
    selector:'app-sync-workspace-frontend',

    standalone:true,

    imports:
    [
        CommonModule,

        TextboxComponent,

        SearchDropdownComponent
    ],

    templateUrl:'./sync-workspace-frontend.html',

    styleUrl:'./sync-workspace-frontend.css'
})

export class SyncWorkspaceFrontendComponent
{     /* ===========================================================
       MODULE SELECTION
    =========================================================== */

    @Input()

    modules:any[] = [];

    @Input()

    moduleId:number = 0;

    @Input()

    moduleReadonly:boolean = false;

    @Input()

    analyzeDisabled:boolean = false;


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
       STANDARD MODULE STRUCTURE
    =========================================================== */

    @Input()

    standardStructureReadonly:boolean = false;

    @Input()

    moduleFolder:string = '';

    @Input()

    modelFolder:string = '';

    @Input()

    pagesFolder:string = '';

    @Input()

    servicesFolder:string = '';


    /* ===========================================================
       APPLICATION REGISTRATION
    =========================================================== */

    @Input()

    applicationRegistrationReadonly:boolean = false;

    @Input()

    routesFolder:string = '';

    @Input()

    moduleRouteFile:string = '';

    @Input()

    applicationRouteFile:string = '';

    @Input()

    routePath:string = '';

    /* ===========================================================
       MODULE SELECTION
    =========================================================== */

    @Output()

    moduleIdChange =
        new EventEmitter<number>();


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
       STANDARD MODULE STRUCTURE
    =========================================================== */

    @Output()

    moduleFolderChange =
        new EventEmitter<string>();

    @Output()

    modelFolderChange =
        new EventEmitter<string>();

    @Output()

    pagesFolderChange =
        new EventEmitter<string>();

    @Output()

    servicesFolderChange =
        new EventEmitter<string>();


    /* ===========================================================
       APPLICATION REGISTRATION
    =========================================================== */

    @Output()

    routesFolderChange =
        new EventEmitter<string>();

    @Output()

    moduleRouteFileChange =
        new EventEmitter<string>();

    @Output()

    applicationRouteFileChange =
        new EventEmitter<string>();

    @Output()

    routePathChange =
        new EventEmitter<string>();

    /* ===========================================================
       ACTIONS
    =========================================================== */

    @Output()

    analyzeClick =
        new EventEmitter<void>();

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
    STANDARD MODULE STRUCTURE
    =========================================================== */

    emitModuleFolder(value:string | number):void
    {
        this.moduleFolderChange.emit(value.toString());
    }

    emitModelFolder(value:string | number):void
    {
        this.modelFolderChange.emit(value.toString());
    }

    emitPagesFolder(value:string | number):void
    {
        this.pagesFolderChange.emit(value.toString());
    }

    emitServicesFolder(value:string | number):void
    {
        this.servicesFolderChange.emit(value.toString());
    }


    /* ===========================================================
    APPLICATION REGISTRATION
    =========================================================== */

    emitRoutesFolder(value:string | number):void
    {
        this.routesFolderChange.emit(value.toString());
    }

    emitModuleRouteFile(value:string | number):void
    {
        this.moduleRouteFileChange.emit(value.toString());
    }

    emitApplicationRouteFile(value:string | number):void
    {
        this.applicationRouteFileChange.emit(value.toString());
    }

    emitRoutePath(value:string | number):void
    {
        this.routePathChange.emit(value.toString());
    }

    /* ===========================================================
    EDITING
    =========================================================== */

    onTargetLocationEdit():
        void
    {
        this.targetLocationEditClick.emit();
    }

    onStandardStructureEdit():
        void
    {
        this.standardStructureEditClick.emit();
    }

    onApplicationRegistrationEdit():
        void
    {
        this.applicationRegistrationEditClick.emit();
    }

    /* ===========================================================
       MODULE
    =========================================================== */

    onModuleChange
    (
        value:number
    ):
        void
    {
        this.moduleId =
            value;

        this.moduleIdChange.emit(
            value
        );
    }


    /* ===========================================================
       ANALYZE
    =========================================================== */

    analyze():
        void
    {
        this.analyzeClick.emit();
    }
}
