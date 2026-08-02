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
        'app-synchronization-workspace-backend',

    standalone:
        true,

    imports:
    [
        CommonModule,

        FormsModule,

        TextboxComponent
    ],

    templateUrl:
        './synchronization-workspace-backend.html',

    styleUrl:
        './synchronization-workspace-backend.css'
})


//===============================================================
// Backend Workspace Component
//===============================================================

export class SynchronizationWorkspaceBackendComponent
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
    // Backend Projects
    //===========================================================

    @Input()

    apiProject =
        '';

    @Input()

    applicationProject =
        '';

    @Input()

    domainProject =
        '';

    @Input()

    infrastructureProject =
        '';

    //===========================================================
    // Standard Folder Structure
    //===========================================================

    @Input()

    controllerFolder =
        '';

    @Input()

    dtoFolder =
        '';

    @Input()

    interfaceFolder =
        '';

    @Input()

    entityFolder =
        '';

    @Input()

    repositoryFolder =
        '';

    @Input()

    configurationFolder =
        '';

    //===========================================================
    // Registration & Database
    //===========================================================

    @Input()

    dependencyInjection =
        '';

    @Input()

    dbContext =
        '';

    @Input()

    programRegistration =
        '';

    @Input()

    migrationFolder =
        '';

    @Input()

    databaseProvider =
        '';

    //===========================================================
    // Value Changed
    //===========================================================

    @Output()

    apiProjectChange =
        new EventEmitter<string | number>();

    @Output()

    applicationProjectChange =
        new EventEmitter<string | number>();

    @Output()

    domainProjectChange =
        new EventEmitter<string | number>();

    @Output()

    infrastructureProjectChange =
        new EventEmitter<string | number>();


    @Output()

    controllerFolderChange =
        new EventEmitter<string | number>();

    @Output()

    dtoFolderChange =
        new EventEmitter<string | number>();

    @Output()

    interfaceFolderChange =
        new EventEmitter<string | number>();

    @Output()

    entityFolderChange =
        new EventEmitter<string | number>();

    @Output()

    repositoryFolderChange =
        new EventEmitter<string | number>();

    @Output()

    configurationFolderChange =
        new EventEmitter<string | number>();


    @Output()

    dependencyInjectionChange =
        new EventEmitter<string | number>();

    @Output()

    dbContextChange =
        new EventEmitter<string | number>();

    @Output()

    programRegistrationChange =
        new EventEmitter<string | number>();

    @Output()

    migrationFolderChange =
        new EventEmitter<string | number>();

    @Output()

    databaseProviderChange =
        new EventEmitter<string | number>();
}