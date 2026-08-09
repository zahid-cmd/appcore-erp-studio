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
    TextboxComponent
}
from '../../controls/textbox/textbox';


//===============================================================
// Component
//===============================================================

@Component
({
    selector:'app-submenu-sync-workspace-backend',

    standalone:true,

    imports:
    [
        CommonModule,

        TextboxComponent
    ],

    templateUrl:'./sub-menu-sync-workspace-backend.html',

    styleUrl:'./sub-menu-sync-workspace-backend.css'
})

export class SubMenuSyncWorkspaceBackendComponent
{

    //===========================================================
    // Target Location
    //===========================================================

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


    //===========================================================
    // Backend API
    //===========================================================

    @Input()
    backendApiReadonly:boolean = false;


    @Input()
    backendControllerFile:string = '';


    //===========================================================
    // Backend Application
    //===========================================================

    @Input()
    backendApplicationReadonly:boolean = false;


    @Input()
    backendApplicationSubMenuFolder:string = '';


    @Input()
    backendApplicationDtosFolder:string = '';


    @Input()
    backendApplicationInterfacesFolder:string = '';


    @Input()
    backendSubMenuDtoFile:string = '';


    @Input()
    backendCreateSubMenuDtoFile:string = '';


    @Input()
    backendUpdateSubMenuDtoFile:string = '';


    @Input()
    backendSubMenuDefaultsDtoFile:string = '';


    @Input()
    backendSubMenuRepositoryInterfaceFile:string = '';


    //===========================================================
    // Backend Domain & Infrastructure
    //===========================================================

    @Input()
    backendDomainInfrastructureReadonly:boolean = false;


    @Input()
    backendSubMenuEntityFile:string = '';


    @Input()
    backendSubMenuConfigurationFile:string = '';


    @Input()
    backendSubMenuRepositoryFile:string = '';


    //===========================================================
    // Target Location Outputs
    //===========================================================

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


    //===========================================================
    // Backend API Outputs
    //===========================================================

    @Output()
    backendControllerFileChange =
        new EventEmitter<string>();


    //===========================================================
    // Backend Application Outputs
    //===========================================================

    @Output()
    backendApplicationSubMenuFolderChange =
        new EventEmitter<string>();


    @Output()
    backendApplicationDtosFolderChange =
        new EventEmitter<string>();


    @Output()
    backendApplicationInterfacesFolderChange =
        new EventEmitter<string>();


    @Output()
    backendSubMenuDtoFileChange =
        new EventEmitter<string>();


    @Output()
    backendCreateSubMenuDtoFileChange =
        new EventEmitter<string>();


    @Output()
    backendUpdateSubMenuDtoFileChange =
        new EventEmitter<string>();


    @Output()
    backendSubMenuDefaultsDtoFileChange =
        new EventEmitter<string>();


    @Output()
    backendSubMenuRepositoryInterfaceFileChange =
        new EventEmitter<string>();


    //===========================================================
    // Backend Domain & Infrastructure Outputs
    //===========================================================

    @Output()
    backendSubMenuEntityFileChange =
        new EventEmitter<string>();


    @Output()
    backendSubMenuConfigurationFileChange =
        new EventEmitter<string>();


    @Output()
    backendSubMenuRepositoryFileChange =
        new EventEmitter<string>();


    //===========================================================
    // Actions
    //===========================================================

    @Output()
    targetLocationEditClick =
        new EventEmitter<void>();


    @Output()
    backendApiEditClick =
        new EventEmitter<void>();


    @Output()
    backendApplicationEditClick =
        new EventEmitter<void>();


    @Output()
    backendDomainInfrastructureEditClick =
        new EventEmitter<void>();


    //===========================================================
    // Target Location
    //===========================================================

    emitBackendSolution
    (
        value:string | number
    ):
        void
    {
        this.backendSolutionChange.emit(
            value.toString()
        );
    }


    emitBackendApplicationProject
    (
        value:string | number
    ):
        void
    {
        this.backendApplicationProjectChange.emit(
            value.toString()
        );
    }


    emitBackendDomainProject
    (
        value:string | number
    ):
        void
    {
        this.backendDomainProjectChange.emit(
            value.toString()
        );
    }


    emitBackendInfrastructureProject
    (
        value:string | number
    ):
        void
    {
        this.backendInfrastructureProjectChange.emit(
            value.toString()
        );
    }


    //===========================================================
    // Backend API
    //===========================================================

    emitBackendControllerFile
    (
        value:string | number
    ):
        void
    {
        this.backendControllerFileChange.emit(
            value.toString()
        );
    }


    //===========================================================
    // Backend Application
    //===========================================================

    emitBackendApplicationSubMenuFolder
    (
        value:string | number
    ):
        void
    {
        this.backendApplicationSubMenuFolderChange.emit(
            value.toString()
        );
    }


    emitBackendApplicationDtosFolder
    (
        value:string | number
    ):
        void
    {
        this.backendApplicationDtosFolderChange.emit(
            value.toString()
        );
    }


    emitBackendApplicationInterfacesFolder
    (
        value:string | number
    ):
        void
    {
        this.backendApplicationInterfacesFolderChange.emit(
            value.toString()
        );
    }


    emitBackendSubMenuDtoFile
    (
        value:string | number
    ):
        void
    {
        this.backendSubMenuDtoFileChange.emit(
            value.toString()
        );
    }


    emitBackendCreateSubMenuDtoFile
    (
        value:string | number
    ):
        void
    {
        this.backendCreateSubMenuDtoFileChange.emit(
            value.toString()
        );
    }


    emitBackendUpdateSubMenuDtoFile
    (
        value:string | number
    ):
        void
    {
        this.backendUpdateSubMenuDtoFileChange.emit(
            value.toString()
        );
    }


    emitBackendSubMenuDefaultsDtoFile
    (
        value:string | number
    ):
        void
    {
        this.backendSubMenuDefaultsDtoFileChange.emit(
            value.toString()
        );
    }


    emitBackendSubMenuRepositoryInterfaceFile
    (
        value:string | number
    ):
        void
    {
        this.backendSubMenuRepositoryInterfaceFileChange.emit(
            value.toString()
        );
    }


    //===========================================================
    // Backend Domain & Infrastructure
    //===========================================================

    emitBackendSubMenuEntityFile
    (
        value:string | number
    ):
        void
    {
        this.backendSubMenuEntityFileChange.emit(
            value.toString()
        );
    }


    emitBackendSubMenuConfigurationFile
    (
        value:string | number
    ):
        void
    {
        this.backendSubMenuConfigurationFileChange.emit(
            value.toString()
        );
    }


    emitBackendSubMenuRepositoryFile
    (
        value:string | number
    ):
        void
    {
        this.backendSubMenuRepositoryFileChange.emit(
            value.toString()
        );
    }


    //===========================================================
    // Editing
    //===========================================================

    onTargetLocationEdit():
        void
    {
        this.targetLocationEditClick.emit();
    }


    onBackendApiEdit():
        void
    {
        this.backendApiEditClick.emit();
    }


    onBackendApplicationEdit():
        void
    {
        this.backendApplicationEditClick.emit();
    }


    onBackendDomainInfrastructureEdit():
        void
    {
        this.backendDomainInfrastructureEditClick.emit();
    }

}