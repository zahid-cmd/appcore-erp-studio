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
    selector:'app-module-sync-workspace-backend',

    standalone:true,

    imports:
    [
        CommonModule,

        TextboxComponent,
    ],

    templateUrl:'./module-sync-workspace-backend.html',

    styleUrl:'./module-sync-workspace-backend.css'
})

export class ModuleSyncWorkspaceBackendComponent
{

    /* ===========================================================
       TARGET LOCATION
    =========================================================== */

    @Input()

    targetLocationReadonly:boolean = false;

    @Input()

    backendSolution:string = '';

    @Input()

    backendApiProject:string = '';

    @Input()

    backendApplicationProject:string = '';

    @Input()

    backendDomainProject:string = '';

    @Input()

    backendInfrastructureProject:string = '';


    /* ===========================================================
    STANDARD STRUCTURE
    =========================================================== */

    @Input()

    standardStructureReadonly:boolean = false;

    @Input()

    backendControllerFolder:string = '';

    @Input()

    backendApplicationFolder:string = '';

    @Input()
    backendEntityFolder = '';

    @Input()

    backendRepositoryFolder:string = '';

    @Input()

    backendConfigurationFolder:string = '';

    /* ===========================================================
       APPLICATION REGISTRATION
    =========================================================== */

    @Input()

    applicationRegistrationReadonly:boolean = false;

    @Input()

    dependencyInjectionFile:string = '';

    @Input()

    dbContextFile:string = '';


    /* ===========================================================
       TARGET LOCATION
    =========================================================== */

    @Output()

    backendSolutionChange =
        new EventEmitter<string>();

    @Output()

    backendApiProjectChange =
        new EventEmitter<string>();

    @Output()

    backendApplicationProjectChange =
        new EventEmitter<string>();

    @Output()

    backendDomainProjectChange =
        new EventEmitter<string>();

    @Output()

    backendInfrastructureProjectChange =
        new EventEmitter<string>();


    /* ===========================================================
    STANDARD STRUCTURE
    =========================================================== */

    @Output()

    backendControllerFolderChange =
        new EventEmitter<string>();

    @Output()

    backendApplicationFolderChange =
        new EventEmitter<string>();

    @Output()
    backendEntityFolderChange =
        new EventEmitter<string>();

    @Output()

    backendRepositoryFolderChange =
        new EventEmitter<string>();

    @Output()

    backendConfigurationFolderChange =
        new EventEmitter<string>();

    /* ===========================================================
       APPLICATION REGISTRATION
    =========================================================== */

    @Output()

    dependencyInjectionFileChange =
        new EventEmitter<string>();

    @Output()

    dbContextFileChange =
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

    emitBackendSolution(value:string | number):void
    {
        this.backendSolutionChange.emit(value.toString());
    }

    emitBackendApiProject(value:string | number):void
    {
        this.backendApiProjectChange.emit(value.toString());
    }

    emitBackendApplicationProject(value:string | number):void
    {
        this.backendApplicationProjectChange.emit(value.toString());
    }

    emitBackendDomainProject(value:string | number):void
    {
        this.backendDomainProjectChange.emit(value.toString());
    }

    emitBackendInfrastructureProject(value:string | number):void
    {
        this.backendInfrastructureProjectChange.emit(value.toString());
    }


    /* ===========================================================
    STANDARD STRUCTURE
    =========================================================== */

    emitBackendControllerFolder(value:string | number):void
    {
        this.backendControllerFolderChange.emit(
            value.toString()
        );
    }

    emitBackendApplicationFolder(value:string | number):void
    {
        this.backendApplicationFolderChange.emit(
            value.toString()
        );
    }

    emitBackendDomainFolder(value:string | number):void
    {
        this.backendEntityFolderChange.emit(
            value.toString()
        );
    }

    emitBackendRepositoryFolder(value:string | number):void
    {
        this.backendRepositoryFolderChange.emit(
            value.toString()
        );
    }

    emitBackendConfigurationFolder(value:string | number):void
    {
        this.backendConfigurationFolderChange.emit(
            value.toString()
        );
    }


    /* ===========================================================
       APPLICATION REGISTRATION
    =========================================================== */

    emitDependencyInjectionFile(value:string | number):void
    {
        this.dependencyInjectionFileChange.emit(value.toString());
    }

    emitDbContextFile(value:string | number):void
    {
        this.dbContextFileChange.emit(value.toString());
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