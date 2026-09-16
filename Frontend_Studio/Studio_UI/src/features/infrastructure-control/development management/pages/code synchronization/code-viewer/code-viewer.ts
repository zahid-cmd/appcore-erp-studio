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
        'Clean' | 'Modified' | 'Restored';

    lastModified:
        string | Date | null;

    canInitialize?:
        boolean;

    canRestore?:
        boolean;
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
    // Initialize All State
    //
    // This is set ONLY after the confirmation dialog is confirmed.
    //===========================================================

    initializing:
        boolean =
        false;



    //===========================================================
    // Initializing File
    //
    // This is set ONLY after the confirmation dialog is confirmed.
    //===========================================================

    initializingFileName:
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
    // Initialize All
    //===========================================================

    @Output()
    initializeRequested =
        new EventEmitter<void>();



    //===========================================================
    // Initialize Single File
    //===========================================================

    @Output()
    initializeFileRequested =
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
    // Initial Stage Files
    //
    // Clean represents the current initial stage.
    //===========================================================

    get initialStageFiles():
        CodeViewerFile[]
    {
        return this.files.filter
        (
            file =>
                file.status ===
                'Clean'
        );
    }



    //===========================================================
    // Restored Files
    //===========================================================

    get restoredFiles():
        CodeViewerFile[]
    {
        return this.files.filter
        (
            file =>
                file.status ===
                'Restored'
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
    // Can Initialize Any File
    //===========================================================

    get canInitializeAnyFile():
        boolean
    {
        return this.files.some
        (
            file =>
                this.canInitializeFile(
                    file
                )
        );
    }



    //===========================================================
    // Can Restore Any File
    //===========================================================

    get canRestoreAnyFile():
        boolean
    {
        return this.files.some
        (
            file =>
                this.canRestoreFile(
                    file
                )
        );
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
    // Initial Stage Count
    //===========================================================

    get initialStageCount():
        number
    {
        return this.initialStageFiles.length;
    }



    //===========================================================
    // Restored Count
    //===========================================================

    get restoredCount():
        number
    {
        return this.restoredFiles.length;
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
    // Check File Can Initialize
    //
    // Initialize uses the concrete baseline file created by
    // the Code Synchronization Engine.
    //===========================================================

    canInitializeFile
    (
        file:
            CodeViewerFile
    ):
        boolean
    {
        return file.canInitialize ===
               true;
    }



    //===========================================================
    // Check File Can Restore
    //
    // Restore uses the latest restore point saved for the
    // synchronization/submenu.
    //===========================================================

    canRestoreFile
    (
        file:
            CodeViewerFile
    ):
        boolean
    {
        return file.canRestore ===
               true;
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
    // Check File Is Initializing
    //===========================================================

    isInitializingFile
    (
        file:
            CodeViewerFile
    ):
        boolean
    {
        return this.initializingFileName ===
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
            ||
            this.initializing
            ||
            this.initializingFileName !== null
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
            ||
            this.initializing
            ||
            this.initializingFileName !== null
        )
        {
            return;
        }


        if
        (
            !this.canRestoreAnyFile
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
            ||
            this.initializing
            ||
            this.initializingFileName !== null
        )
        {
            return;
        }


        if
        (
            !this.canRestoreAnyFile
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
            ||
            this.initializing
            ||
            this.initializingFileName !== null
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
            ||
            this.initializing
            ||
            this.initializingFileName !== null
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
    // Request Initialize All
    //
    // IMPORTANT:
    //
    // Do NOT set initializing here.
    //
    // This only opens the confirmation dialog through the parent.
    //===========================================================

    initializeAll():
        void
    {
        if
        (
            this.restoring
            ||
            this.restoringFileName !== null
            ||
            this.initializing
            ||
            this.initializingFileName !== null
        )
        {
            return;
        }


        if
        (
            !this.canInitializeAnyFile
        )
        {
            return;
        }


        this.initializeRequested.emit();
    }



    //===========================================================
    // Begin Initialize All
    //
    // IMPORTANT:
    //
    // Call this ONLY after the confirmation dialog is confirmed.
    //===========================================================

    beginInitialize():
        void
    {
        if
        (
            this.restoring
            ||
            this.restoringFileName !== null
            ||
            this.initializing
            ||
            this.initializingFileName !== null
        )
        {
            return;
        }


        if
        (
            !this.canInitializeAnyFile
        )
        {
            return;
        }


        this.initializing =
            true;
    }



    //===========================================================
    // Request Initialize Single File
    //
    // IMPORTANT:
    //
    // Do NOT set initializingFileName here.
    //
    // This only opens the confirmation dialog through the parent.
    //===========================================================

    initializeFile
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
            ||
            this.initializing
            ||
            this.initializingFileName !== null
        )
        {
            return;
        }


        if
        (
            !this.canInitializeFile(
                file
            )
        )
        {
            return;
        }


        this.initializeFileRequested.emit(
            file
        );
    }



    //===========================================================
    // Begin Initialize Single File
    //
    // IMPORTANT:
    //
    // Call this ONLY after the confirmation dialog is confirmed.
    //===========================================================

    beginFileInitialize
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
            ||
            this.initializing
            ||
            this.initializingFileName !== null
        )
        {
            return;
        }


        if
        (
            !this.canInitializeFile(
                file
            )
        )
        {
            return;
        }


        this.initializingFileName =
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
    // Initialize All Completed
    //===========================================================

    completeInitialize():
        void
    {
        this.initializing =
            false;


        this.initializingFileName =
            null;
    }



    //===========================================================
    // Initialize All Failed
    //===========================================================

    initializeFailed():
        void
    {
        this.initializing =
            false;


        this.initializingFileName =
            null;
    }



    //===========================================================
    // Single File Initialize Completed
    //===========================================================

    completeFileInitialize():
        void
    {
        this.initializingFileName =
            null;
    }



    //===========================================================
    // Single File Initialize Failed
    //===========================================================

    fileInitializeFailed():
        void
    {
        this.initializingFileName =
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