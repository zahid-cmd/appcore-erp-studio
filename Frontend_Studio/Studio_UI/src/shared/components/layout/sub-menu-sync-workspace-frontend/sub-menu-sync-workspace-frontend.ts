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
    selector:'app-submenu-sync-workspace-frontend',

    standalone:true,

    imports:
    [
        CommonModule,

        TextboxComponent
    ],

    templateUrl:'./sub-menu-sync-workspace-frontend.html',

    styleUrl:'./sub-menu-sync-workspace-frontend.css'
})

export class SubMenuSyncWorkspaceFrontendComponent
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


    @Input()
    menuFolder:string = '';



    /* ===========================================================
       SUBMENU LOCATION
    =========================================================== */

    @Input()
    submenuLocationReadonly:boolean = false;


    @Input()
    submenuFolder:string = '';


    @Input()
    formFolder:string = '';


    @Input()
    listFolder:string = '';



    /* ===========================================================
       SUBMENU CORE FILES
    =========================================================== */

    @Input()
    coreFilesReadonly:boolean = false;


    @Input()
    submenuModelFile:string = '';


    @Input()
    submenuServiceFile:string = '';


    @Input()
    submenuRouteFile:string = '';



    /* ===========================================================
       SUBMENU PAGE FILES
    =========================================================== */

    @Input()
    pageFilesReadonly:boolean = false;


    @Input()
    submenuFormTsFile:string = '';


    @Input()
    submenuFormHtmlFile:string = '';


    @Input()
    submenuFormCssFile:string = '';


    @Input()
    submenuListTsFile:string = '';


    @Input()
    submenuListHtmlFile:string = '';


    @Input()
    submenuListCssFile:string = '';



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


    @Output()
    menuFolderChange =
        new EventEmitter<string>();



    /* ===========================================================
       SUBMENU LOCATION
    =========================================================== */

    @Output()
    submenuFolderChange =
        new EventEmitter<string>();


    @Output()
    formFolderChange =
        new EventEmitter<string>();


    @Output()
    listFolderChange =
        new EventEmitter<string>();



    /* ===========================================================
       SUBMENU CORE FILES
    =========================================================== */

    @Output()
    submenuModelFileChange =
        new EventEmitter<string>();


    @Output()
    submenuServiceFileChange =
        new EventEmitter<string>();


    @Output()
    submenuRouteFileChange =
        new EventEmitter<string>();



    /* ===========================================================
       SUBMENU PAGE FILES
    =========================================================== */

    @Output()
    submenuFormTsFileChange =
        new EventEmitter<string>();


    @Output()
    submenuFormHtmlFileChange =
        new EventEmitter<string>();


    @Output()
    submenuFormCssFileChange =
        new EventEmitter<string>();


    @Output()
    submenuListTsFileChange =
        new EventEmitter<string>();


    @Output()
    submenuListHtmlFileChange =
        new EventEmitter<string>();


    @Output()
    submenuListCssFileChange =
        new EventEmitter<string>();



    /* ===========================================================
       ACTIONS
    =========================================================== */

    @Output()
    targetLocationEditClick =
        new EventEmitter<void>();


    @Output()
    submenuLocationEditClick =
        new EventEmitter<void>();


    @Output()
    coreFilesEditClick =
        new EventEmitter<void>();


    @Output()
    pageFilesEditClick =
        new EventEmitter<void>();



    /* ===========================================================
       TARGET LOCATION
    =========================================================== */

    emitFrontendSolution(
        value:string | number
    ):
        void
    {
        this.frontendSolutionChange.emit(
            value.toString()
        );
    }


    emitProject(
        value:string | number
    ):
        void
    {
        this.projectChange.emit(
            value.toString()
        );
    }


    emitSourceFolder(
        value:string | number
    ):
        void
    {
        this.sourceFolderChange.emit(
            value.toString()
        );
    }


    emitFeatureFolder(
        value:string | number
    ):
        void
    {
        this.featureFolderChange.emit(
            value.toString()
        );
    }


    emitMenuFolder(
        value:string | number
    ):
        void
    {
        this.menuFolderChange.emit(
            value.toString()
        );
    }



    /* ===========================================================
       SUBMENU LOCATION
    =========================================================== */

    emitSubmenuFolder(
        value:string | number
    ):
        void
    {
        this.submenuFolderChange.emit(
            value.toString()
        );
    }


    emitFormFolder(
        value:string | number
    ):
        void
    {
        this.formFolderChange.emit(
            value.toString()
        );
    }


    emitListFolder(
        value:string | number
    ):
        void
    {
        this.listFolderChange.emit(
            value.toString()
        );
    }



    /* ===========================================================
       SUBMENU CORE FILES
    =========================================================== */

    emitSubmenuModelFile(
        value:string | number
    ):
        void
    {
        this.submenuModelFileChange.emit(
            value.toString()
        );
    }


    emitSubmenuServiceFile(
        value:string | number
    ):
        void
    {
        this.submenuServiceFileChange.emit(
            value.toString()
        );
    }


    emitSubmenuRouteFile(
        value:string | number
    ):
        void
    {
        this.submenuRouteFileChange.emit(
            value.toString()
        );
    }



    /* ===========================================================
       SUBMENU PAGE FILES
    =========================================================== */

    emitSubmenuFormTsFile(
        value:string | number
    ):
        void
    {
        this.submenuFormTsFileChange.emit(
            value.toString()
        );
    }


    emitSubmenuFormHtmlFile(
        value:string | number
    ):
        void
    {
        this.submenuFormHtmlFileChange.emit(
            value.toString()
        );
    }


    emitSubmenuFormCssFile(
        value:string | number
    ):
        void
    {
        this.submenuFormCssFileChange.emit(
            value.toString()
        );
    }


    emitSubmenuListTsFile(
        value:string | number
    ):
        void
    {
        this.submenuListTsFileChange.emit(
            value.toString()
        );
    }


    emitSubmenuListHtmlFile(
        value:string | number
    ):
        void
    {
        this.submenuListHtmlFileChange.emit(
            value.toString()
        );
    }


    emitSubmenuListCssFile(
        value:string | number
    ):
        void
    {
        this.submenuListCssFileChange.emit(
            value.toString()
        );
    }



    /* ===========================================================
       EDITING
    =========================================================== */

    onTargetLocationEdit():
        void
    {
        this.targetLocationEditClick.emit();
    }


    onSubmenuLocationEdit():
        void
    {
        this.submenuLocationEditClick.emit();
    }


    onCoreFilesEdit():
        void
    {
        this.coreFilesEditClick.emit();
    }


    onPageFilesEdit():
        void
    {
        this.pageFilesEditClick.emit();
    }

}