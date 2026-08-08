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

@Component
({
    selector:'app-menu-sync-workspace-backend',

    standalone:true,

    imports:
    [
        CommonModule,

        TextboxComponent,
    ],

    templateUrl:'./menu-sync-workspace-backend.html',

    styleUrl:'./menu-sync-workspace-backend.css'
})


export class MenuSyncWorkspaceBackendComponent
{



/* ===========================================================
TARGET LOCATION
=========================================================== */


@Input()
targetLocationReadonly:boolean = false;


@Input()
backendSolution:string = '';


@Input()
backendApplicationProject:string = '';


@Input()
backendDomainProject:string = '';


@Input()
backendInfrastructureProject:string = '';





/* ===========================================================
BACKEND STRUCTURE
=========================================================== */


@Input()
standardStructureReadonly:boolean = false;



@Input()
backendControllerFolder:string = '';



@Input()
backendApplicationFolder:string = '';



@Input()
backendDomainFolder:string = '';



@Input()
backendRepositoryFolder:string = '';



@Input()
backendConfigurationFolder:string = '';






/* ===========================================================
TARGET LOCATION OUTPUT
=========================================================== */


@Output()
backendSolutionChange =
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
BACKEND STRUCTURE OUTPUT
=========================================================== */


@Output()
backendControllerFolderChange =
new EventEmitter<string>();



@Output()
backendApplicationFolderChange =
new EventEmitter<string>();



@Output()
backendDomainFolderChange =
new EventEmitter<string>();



@Output()
backendRepositoryFolderChange =
new EventEmitter<string>();



@Output()
backendConfigurationFolderChange =
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






/* ===========================================================
TARGET LOCATION
=========================================================== */


emitBackendSolution
(
    value:string | number
):void
{
    this.backendSolutionChange.emit
    (
        value.toString()
    );
}



emitBackendApplicationProject
(
    value:string | number
):void
{
    this.backendApplicationProjectChange.emit
    (
        value.toString()
    );
}



emitBackendDomainProject
(
    value:string | number
):void
{
    this.backendDomainProjectChange.emit
    (
        value.toString()
    );
}



emitBackendInfrastructureProject
(
    value:string | number
):void
{
    this.backendInfrastructureProjectChange.emit
    (
        value.toString()
    );
}






/* ===========================================================
BACKEND STRUCTURE
=========================================================== */


emitBackendControllerFolder
(
    value:string | number
):void
{
    this.backendControllerFolderChange.emit
    (
        value.toString()
    );
}



emitBackendApplicationFolder
(
    value:string | number
):void
{
    this.backendApplicationFolderChange.emit
    (
        value.toString()
    );
}



emitBackendDomainFolder
(
    value:string | number
):void
{
    this.backendDomainFolderChange.emit
    (
        value.toString()
    );
}



emitBackendRepositoryFolder
(
    value:string | number
):void
{
    this.backendRepositoryFolderChange.emit
    (
        value.toString()
    );
}



emitBackendConfigurationFolder
(
    value:string | number
):void
{
    this.backendConfigurationFolderChange.emit
    (
        value.toString()
    );
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



}