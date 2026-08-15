//===============================================================
// Imports
//===============================================================

import
{
    Component,
    EventEmitter,
    Input,
    Output
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';


//===============================================================
// Code Viewer File
//===============================================================

export interface CodeViewerFile
{
    fileName:
        string;

    status:
        'Clean' | 'Modified';

    lastModified:
        string | Date | null;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-code-viewer',

    standalone:true,

    imports:
    [
        CommonModule
    ],

    templateUrl:'./code-viewer.html',

    styleUrl:'./code-viewer.css'
})


//===============================================================
// Code Viewer Component
//===============================================================

export class CodeViewerComponent
{

    //===========================================================
    // Visibility
    //===========================================================

    @Input()
    opened:
        boolean =
        false;



    //===========================================================
    // Synchronization Type
    //===========================================================

    @Input()
    synchronizationType:
        'Frontend' | 'Backend' =
        'Frontend';



    //===========================================================
    // Generated Files
    //===========================================================

    @Input()
    files:
        CodeViewerFile[] =
        [];



    //===========================================================
    // Restore All State
    //
    // This is set ONLY after the confirmation dialog is confirmed.
    //===========================================================

    restoring:
        boolean =
        false;



    //===========================================================
    // Restoring File
    //
    // This is set ONLY after the confirmation dialog is confirmed.
    //===========================================================

    restoringFileName:
        string | null =
        null;



    //===========================================================
    // Events
    //===========================================================

    @Output()
    closed =
        new EventEmitter<void>();



    //===========================================================
    // Restore All
    //===========================================================

    @Output()
    restoreRequested =
        new EventEmitter<void>();



    //===========================================================
    // Restore Single File
    //===========================================================

    @Output()
    restoreFileRequested =
        new EventEmitter<CodeViewerFile>();



    //===========================================================
    // Modified Files
    //===========================================================

    get modifiedFiles():
        CodeViewerFile[]
    {
        return this.files.filter
        (
            file =>
                file.status ===
                'Modified'
        );
    }



    //===========================================================
    // Has Modified Files
    //===========================================================

    get hasModifiedFiles():
        boolean
    {
        return this.modifiedFiles.length >
               0;
    }



    //===========================================================
    // File Count
    //===========================================================

    get fileCount():
        number
    {
        return this.files.length;
    }



    //===========================================================
    // Modified Count
    //===========================================================

    get modifiedCount():
        number
    {
        return this.modifiedFiles.length;
    }



    //===========================================================
    // Header Title
    //===========================================================

    get title():
        string
    {
        return this.synchronizationType ===
               'Backend'

            ?

            'Backend Code Synchronization'

            :

            'Frontend Code Synchronization';
    }



    //===========================================================
    // Get Serial Number
    //===========================================================

    getSerialNumber
    (
        index:
            number
    ):
        number
    {
        return index + 1;
    }



    //===========================================================
    // Check File Can Restore
    //===========================================================

    canRestoreFile
    (
        file:
            CodeViewerFile
    ):
        boolean
    {
        return file.status ===
               'Modified';
    }



    //===========================================================
    // Check File Is Restoring
    //===========================================================

    isRestoringFile
    (
        file:
            CodeViewerFile
    ):
        boolean
    {
        return this.restoringFileName ===
               file.fileName;
    }



    //===========================================================
    // Close
    //===========================================================

    close():
        void
    {
        if
        (
            this.restoring
            ||
            this.restoringFileName !== null
        )
        {
            return;
        }


        this.closed.emit();
    }



    //===========================================================
    // Cancel
    //===========================================================

    cancel():
        void
    {
        this.close();
    }



    //===========================================================
    // Request Restore All
    //
    // IMPORTANT:
    //
    // Do NOT set restoring here.
    //
    // This method only opens the confirmation dialog through
    // the parent component.
    //===========================================================

    restore():
        void
    {
        if
        (
            this.restoring
            ||
            this.restoringFileName !== null
        )
        {
            return;
        }


        if
        (
            !this.hasModifiedFiles
        )
        {
            return;
        }


        this.restoreRequested.emit();
    }



    //===========================================================
    // Begin Restore All
    //
    // IMPORTANT:
    //
    // Call this ONLY after the confirmation dialog is confirmed.
    //===========================================================

    beginRestore():
        void
    {
        if
        (
            this.restoring
            ||
            this.restoringFileName !== null
        )
        {
            return;
        }


        if
        (
            !this.hasModifiedFiles
        )
        {
            return;
        }


        this.restoring =
            true;
    }



    //===========================================================
    // Request Restore Single File
    //
    // IMPORTANT:
    //
    // Do NOT set restoringFileName here.
    //
    // This only opens the confirmation dialog through the parent.
    //===========================================================

    restoreFile
    (
        file:
            CodeViewerFile
    ):
        void
    {
        if
        (
            this.restoring
            ||
            this.restoringFileName !== null
        )
        {
            return;
        }


        if
        (
            !this.canRestoreFile(
                file
            )
        )
        {
            return;
        }


        this.restoreFileRequested.emit(
            file
        );
    }



    //===========================================================
    // Begin Restore Single File
    //
    // IMPORTANT:
    //
    // Call this ONLY after the confirmation dialog is confirmed.
    //===========================================================

    beginFileRestore
    (
        file:
            CodeViewerFile
    ):
        void
    {
        if
        (
            this.restoring
            ||
            this.restoringFileName !== null
        )
        {
            return;
        }


        if
        (
            !this.canRestoreFile(
                file
            )
        )
        {
            return;
        }


        this.restoringFileName =
            file.fileName;
    }



    //===========================================================
    // Restore All Completed
    //===========================================================

    completeRestore():
        void
    {
        this.restoring =
            false;


        this.restoringFileName =
            null;
    }



    //===========================================================
    // Restore All Failed
    //===========================================================

    restoreFailed():
        void
    {
        this.restoring =
            false;


        this.restoringFileName =
            null;
    }



    //===========================================================
    // Single File Restore Completed
    //===========================================================

    completeFileRestore():
        void
    {
        this.restoringFileName =
            null;
    }



    //===========================================================
    // Single File Restore Failed
    //===========================================================

    fileRestoreFailed():
        void
    {
        this.restoringFileName =
            null;
    }



    //===========================================================
    // Format Last Modified
    //===========================================================

    formatLastModified
    (
        value:
            string | Date | null
    ):
        string
    {
        if
        (
            !value
        )
        {
            return '--';
        }


        const date =
            value instanceof Date
                ?
                value
                :
                new Date(value);


        if
        (
            Number.isNaN
            (
                date.getTime()
            )
        )
        {
            return '--';
        }


        return date.toLocaleString();
    }

}