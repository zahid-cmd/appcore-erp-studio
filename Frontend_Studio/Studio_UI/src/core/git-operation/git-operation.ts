//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';


//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    CommandCenterComponent
}
from '../../shared/components/utilities/command-center/command-center';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../shared/components/controls/control-tabs/control-tabs';

import
{
    PageCanvasComponent
}
from '../../shared/components/layout/page-canvas/page-canvas';


//===============================================================
// Dialog Components
//===============================================================

import
{
    ConfirmDialogComponent
}
from '../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ProgressDialogComponent
}
from '../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    GitMessageModalComponent
}
from '../../shared/components/utilities/git-message-modal/git-message-modal';


//===============================================================
// Utilities
//===============================================================

import
{
    ToastService
}
from '../../shared/components/utilities/toast/toast.service';

import
{
    ConfirmDialogService
}
from '../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ProgressDialogService
}
from '../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    GitMessageModalService
}
from '../../shared/components/utilities/git-message-modal/git-message-modal.service';

import
{
    ToastComponent
}
from '../../shared/components/utilities/toast/toast';


//===============================================================
// Models & Services
//===============================================================

import
{
    SourceControl
}
from '../../features/infrastructure-control/code-management/models/source-control.model';

import
{
    SourceControlService,

    GitStatusDto,

    GitOperationResultDto
}
from '../../features/infrastructure-control/code-management/services/source-control.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'git-operation',

    standalone:
        true,

    imports:
    [
        CommonModule,


        //=======================================================
        // Layout
        //=======================================================

        PageHeaderComponent,

        PageToolbarComponent,

        CommandCenterComponent,

        ControlTabsComponent,

        PageCanvasComponent,


        //=======================================================
        // Dialog Components
        //=======================================================

        ConfirmDialogComponent,

        ProgressDialogComponent,

        ToastComponent,

        GitMessageModalComponent
    ],

    templateUrl:
        './git-operation.html',

    styleUrls:
    [
        './git-operation.css'
    ]
})


export class GitOperation
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(
            ActivatedRoute
        );


    private readonly router =
        inject(
            Router
        );


    private readonly sourcecontrolservice =
        inject(
            SourceControlService
        );


    private readonly toast =
        inject(
            ToastService
        );


    private readonly confirmDialog =
        inject(
            ConfirmDialogService
        );


    private readonly progressDialog =
        inject(
            ProgressDialogService
        );


    private readonly gitMessageModal =
        inject(
            GitMessageModalService
        );


    private readonly cdr =
        inject(
            ChangeDetectorRef
        );


    //===========================================================
    // Selected Repository
    //===========================================================

    sourceControlId:
        number =
        0;


    repository:
        SourceControl | null =
        null;


    //===========================================================
    // Git Status
    //===========================================================

    gitStatus:
        GitStatusDto | null =
        null;


    //===========================================================
    // Merge State
    //===========================================================

    mergeConflicts:
        string[] =
        [];


    isMergeActive:
        boolean =
        false;


    isCheckingMerge:
        boolean =
        false;


    //===========================================================
    // Page State
    //===========================================================

    isLoading:
        boolean =
        false;


    isOperating:
        boolean =
        false;


    currentOperation:
        string =
        '';


    //===========================================================
    // Page Header
    //===========================================================

    pageTitle:
        string =
        'Repository Command Center';


    //===========================================================
    // Selected Tab
    //===========================================================

    selectedTab:
        string =
        'workspace';


    //===========================================================
    // Tabs
    //===========================================================

    get tabs():
        ControlTab[]
    {
        return [
            {
                id:
                    'workspace',

                label:
                    'Repository Workspace'
            }
        ];
    }


    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.initializePage();
    }


    //===========================================================
    // Initialize Page
    //===========================================================

    private initializePage():
        void
    {
        this.sourceControlId =
            this.resolveEntityId();


        if
        (
            this.sourceControlId <= 0
        )
        {
            this.toast.error(
                'Error',

                'Invalid Source Control repository.'
            );

            this.goBack();

            return;
        }


        this.loadRepository();
    }


    //===========================================================
    // Resolve Entity Id
    //===========================================================

    private resolveEntityId():
        number
    {
        let currentRoute:
            ActivatedRoute | null =
            this.route;


        while
        (
            currentRoute
        )
        {
            const id =
                Number(
                    currentRoute.snapshot.paramMap.get('id')
                );


            if
            (
                id > 0
            )
            {
                return id;
            }


            currentRoute =
                currentRoute.parent;
        }


        return 0;
    }


    //===========================================================
    // Load Repository
    //===========================================================

    private loadRepository():
        void
    {
        if
        (
            this.sourceControlId <= 0
        )
        {
            return;
        }


        this.isLoading =
            true;


        this.sourcecontrolservice
            .getById(
                this.sourceControlId
            )
            .subscribe(
            {
                next:
                    repository =>
                    {
                        this.repository =
                            repository;


                        this.isLoading =
                            false;


                        this.loadGitStatus();


                        this.cdr.detectChanges();
                    },


                error:
                    error =>
                    {
                        console.error(
                            'Load Repository Error',

                            error
                        );


                        this.repository =
                            null;


                        this.gitStatus =
                            null;


                        this.mergeConflicts =
                            [];


                        this.isMergeActive =
                            false;


                        this.isLoading =
                            false;


                        this.toast.error(
                            'Error',

                            'Failed to load repository.'
                        );


                        this.goBack();
                    }
            });
    }


    //===========================================================
    // Load Git Status
    //===========================================================

    private loadGitStatus():
        void
    {
        if
        (
            this.sourceControlId <= 0
        )
        {
            return;
        }


        this.sourcecontrolservice
            .getStatus(
                this.sourceControlId
            )
            .subscribe(
            {
                next:
                    status =>
                    {
                        this.gitStatus =
                            status;


                        this.loadMergeConflicts();


                        this.cdr.detectChanges();
                    },


                error:
                    error =>
                    {
                        console.error(
                            'Git Status Error',

                            error
                        );


                        this.gitStatus =
                            null;


                        this.mergeConflicts =
                            [];


                        this.isMergeActive =
                            false;


                        this.cdr.detectChanges();
                    }
            });
    }


    //===========================================================
    // Load Merge Conflicts
    //===========================================================

    private loadMergeConflicts():
        void
    {
        if
        (
            this.sourceControlId <= 0
        )
        {
            return;
        }


        this.isCheckingMerge =
            true;


        this.sourcecontrolservice
            .getMergeConflicts(
                this.sourceControlId
            )
            .subscribe(
            {
                next:
                    result =>
                    {
                        this.applyMergeConflictResult(
                            result
                        );


                        this.isCheckingMerge =
                            false;


                        this.cdr.detectChanges();
                    },


                error:
                    error =>
                    {
                        console.error(
                            'Git Merge Conflict Check Error',

                            error
                        );


                        this.mergeConflicts =
                            [];


                        this.isMergeActive =
                            false;


                        this.isCheckingMerge =
                            false;


                        this.cdr.detectChanges();
                    }
            });
    }


    //===========================================================
    // Apply Merge Conflict Result
    //===========================================================

    private applyMergeConflictResult
    (
        result:
            GitOperationResultDto
    ):
        void
    {
        const output =
            result?.output
            ||
            '';

        const message =
            result?.message
            ||
            '';

        this.mergeConflicts =
            this.extractMergeConflicts(
                output
            );

        const normalizedMessage =
            message
                .trim()
                .toLowerCase();

        /*
         * IMPORTANT:
         * The backend GetMergeConflicts endpoint returns the
         * unresolved file names directly from:
         *
         *     git diff --name-only --diff-filter=U
         *
         * Therefore Output can contain:
         *
         *     Promo_Image_2_Light.png
         *
         * rather than a `UU` status prefix.
         *
         * The merge state itself is also reported by the backend
         * Message. The UI therefore uses BOTH signals:
         *
         * 1. unresolved conflict files;
         * 2. an explicit Git merge-in-progress message.
         *
         * This is important immediately after Full Repository
         * Synchronization is blocked by an already-active merge.
         */
        const mergeIsReportedAsActive =
            normalizedMessage.includes(
                'git merge is currently in progress'
            )
            ||
            normalizedMessage.includes(
                'git merge is in progress'
            )
            ||
            normalizedMessage.includes(
                'merge is currently in progress'
            )
            ||
            normalizedMessage.includes(
                'merge is in progress'
            );

        /*
         * IMPORTANT:
         * A synchronization conflict can reach this method before
         * the repository reload has completed. If the backend has
         * already confirmed that a Git merge is active, the resolver
         * section must remain open while the unresolved file list
         * is being refreshed.
         *
         * This prevents the UI from showing:
         *
         *     Merge Status: No Active Merge
         *
         * while the backend is simultaneously reporting:
         *
         *     Git merge is currently in progress.
         */
        this.isMergeActive =
            mergeIsReportedAsActive
            ||
            this.mergeConflicts.length > 0;
    }




    //===========================================================
    // Extract Merge Conflicts
    //===========================================================

    private extractMergeConflicts
    (
        output:
            string
    ):
        string[]
    {
        if
        (
            !output
        )
        {
            return [];
        }

        const lines =
            output
                .split(/\r?\n/)
                .map(
                    line =>
                        line.trim()
                )
                .filter(
                    line =>
                        !!line
                );

        /*
         * Support both:
         *
         * 1. `git status --short` conflict output:
         *      UU path/to/file
         *
         * 2. The current backend merge-state output:
         *      path/to/file
         *
         * The backend currently uses:
         *
         *      git diff --name-only --diff-filter=U
         *
         * so unresolved conflict files are returned without
         * a two-character status prefix.
         */
        const statusConflicts =
            lines.filter(
                line =>
                    line.startsWith(
                        'UU '
                    )
                    ||
                    line.startsWith(
                        'AA '
                    )
                    ||
                    line.startsWith(
                        'DD '
                    )
                    ||
                    line.startsWith(
                        'AU '
                    )
                    ||
                    line.startsWith(
                        'UA '
                    )
                    ||
                    line.startsWith(
                        'DU '
                    )
                    ||
                    line.startsWith(
                        'UD '
                    )
            );

        if
        (
            statusConflicts.length > 0
        )
        {
            return statusConflicts.map(
                line =>
                    line.substring(
                        3
                    ).trim()
            );
        }

        /*
         * With `git diff --name-only --diff-filter=U`, every
         * non-empty output line is an unresolved conflict path.
         */
        return lines;
    }



    //===========================================================
    // Operation
    //===========================================================

    onOperation
    (
        operationId:
            string
    ):
        void
    {
        if
        (
            this.sourceControlId <= 0
        )
        {
            this.toast.error(
                'Error',

                'Invalid Source Control repository.'
            );

            return;
        }


        if
        (
            this.isOperating
        )
        {
            return;
        }


        switch
        (
            operationId
        )
        {
            case 'refresh':

                this.refreshStatus();

                break;


            case 'pull':

                this.pullLatest();

                break;


            case 'commit':

                this.commitChanges();

                break;


            case 'push':

                this.pushChanges();

                break;


            case 'sync':

                this.synchronizeRepository();

                break;


            case 'continue-merge':

                this.continueMerge();

                break;


            case 'abort-merge':

                this.abortMerge();

                break;


            case 'reset-to-remote':

                this.resetToRemote();

                break;


            default:

                console.warn(
                    'Unknown Git Operation:',

                    operationId
                );

                break;
        }
    }


    //===========================================================
    // Header Page Refresh
    //
    // IMPORTANT:
    // This is NOT a Git operation.
    //
    // It does not:
    // - open confirmation
    // - open progress dialog
    // - call Git status
    // - show operation toast
    //
    // It simply reloads the current page.
    //===========================================================

    refreshPage():
        void
    {
        window.location.reload();
    }


    //===========================================================
    // Pull Latest
    //===========================================================

    private pullLatest():
        void
    {
        this.confirmDialog.open(
            'Pull Latest Changes',

            'Are you sure you want to pull the latest changes from the remote repository?',

            () =>
            {
                this.executePull();
            },

            'Pull',

            'Cancel',

            'primary'
        );
    }


    //===========================================================
    // Execute Pull
    //===========================================================

    private executePull():
        void
    {
        this.isOperating =
            true;


        this.currentOperation =
            'pull';


        this.progressDialog.show(
            'Pull Latest Changes',

            'Preparing to pull the latest repository changes...'
        );


        this.progressDialog.update(
            25,

            'Connecting to the remote repository...'
        );


        this.sourcecontrolservice
            .pull(
                this.sourceControlId
            )
            .subscribe(
            {
                next:
                    result =>
                    {
                        this.progressDialog.update(
                            100,

                            'Pull operation completed.'
                        );


                        this.progressDialog.close();


                        this.operationCompleted(
                            result,

                            'Pull Completed',

                            'Latest repository changes have been pulled.'
                        );
                    },


                error:
                    error =>
                    {
                        this.progressDialog.close();


                        this.operationFailed(
                            error,

                            'Pull Failed',

                            'Failed to pull latest repository changes.'
                        );
                    }
            });
    }


    //===========================================================
    // Commit Changes
    //===========================================================

    private commitChanges():
        void
    {
        this.confirmDialog.open(
            'Commit Changes',

            'Are you sure you want to continue with the repository commit operation?',

            () =>
            {
                this.openCommitMessage();
            },

            'Continue',

            'Cancel',

            'primary'
        );
    }


    //===========================================================
    // Open Commit Message
    //===========================================================

    private openCommitMessage():
        void
    {
        this.gitMessageModal.openCommit(
            (
                message:
                    string
            ) =>
            {
                const commitMessage =
                    message.trim();


                if
                (
                    !commitMessage
                )
                {
                    this.toast.error(
                        'Commit Failed',

                        'Commit message is required.'
                    );

                    return;
                }


                this.executeCommit(
                    commitMessage
                );
            }
        );
    }


    //===========================================================
    // Execute Commit
    //===========================================================

    private executeCommit
    (
        message:
            string
    ):
        void
    {
        this.isOperating =
            true;


        this.currentOperation =
            'commit';


        this.progressDialog.show(
            'Commit Changes',

            'Preparing repository changes for commit...'
        );


        this.progressDialog.update(
            25,

            'Creating repository commit...'
        );


        this.sourcecontrolservice
            .commit(
                this.sourceControlId,

                message
            )
            .subscribe(
            {
                next:
                    result =>
                    {
                        this.progressDialog.update(
                            100,

                            'Commit operation completed.'
                        );


                        this.progressDialog.close();


                        this.operationCompleted(
                            result,

                            'Commit Completed',

                            'Repository changes have been committed.'
                        );
                    },


                error:
                    error =>
                    {
                        this.progressDialog.close();


                        this.operationFailed(
                            error,

                            'Commit Failed',

                            'Failed to commit repository changes.'
                        );
                    }
            });
    }


    //===========================================================
    // Push Changes
    //===========================================================

    private pushChanges():
        void
    {
        this.confirmDialog.open(
            'Push Changes',

            'Are you sure you want to push the current repository changes to the remote repository?',

            () =>
            {
                this.executePush();
            },

            'Push',

            'Cancel',

            'primary'
        );
    }


    //===========================================================
    // Execute Push
    //===========================================================

    private executePush():
        void
    {
        this.isOperating =
            true;


        this.currentOperation =
            'push';


        this.progressDialog.show(
            'Push Changes',

            'Preparing to push repository changes...'
        );


        this.progressDialog.update(
            25,

            'Connecting to the remote repository...'
        );


        this.sourcecontrolservice
            .push(
                this.sourceControlId
            )
            .subscribe(
            {
                next:
                    result =>
                    {
                        this.progressDialog.update(
                            100,

                            'Push operation completed.'
                        );


                        this.progressDialog.close();


                        this.operationCompleted(
                            result,

                            'Push Completed',

                            'Repository changes have been pushed.'
                        );
                    },


                error:
                    error =>
                    {
                        this.progressDialog.close();


                        this.operationFailed(
                            error,

                            'Push Failed',

                            'Failed to push repository changes.'
                        );
                    }
            });
    }


    //===========================================================
    // Full Repository Synchronization
    //===========================================================

    private synchronizeRepository():
        void
    {
        this.confirmDialog.open(
            'Full Repository Synchronization',

            'Are you sure you want to continue with the full repository synchronization?',

            () =>
            {
                this.openSynchronizationMessage();
            },

            'Continue',

            'Cancel',

            'primary'
        );
    }


    //===========================================================
    // Open Synchronization Message
    //===========================================================

    private openSynchronizationMessage():
        void
    {
        this.gitMessageModal.openSync(
            (
                message:
                    string
            ) =>
            {
                const syncMessage =
                    message.trim();


                if
                (
                    !syncMessage
                )
                {
                    this.toast.error(
                        'Synchronization Failed',

                        'Commit message is required.'
                    );

                    return;
                }


                this.executeSynchronization(
                    syncMessage
                );
            }
        );
    }


    //===========================================================
    // Execute Synchronization
    //===========================================================

    private executeSynchronization
    (
        message:
            string
    ):
        void
    {
        this.isOperating =
            true;


        this.currentOperation =
            'sync';


        this.progressDialog.show(
            'Full Repository Synchronization',

            'Preparing full repository synchronization...'
        );


        this.progressDialog.update(
            25,

            'Synchronizing repository changes...'
        );


        this.sourcecontrolservice
            .sync(
                this.sourceControlId,

                message
            )
            .subscribe(
            {
                next:
                    result =>
                    {
                        /*
                         * IMPORTANT:
                         * A Git merge conflict is an expected intermediate
                         * synchronization state. It is not a final
                         * synchronization failure.
                         *
                         * Return the user to the existing conflict
                         * resolution state and show a warning toast.
                         */
                        if
                        (
                            this.isSynchronizationConflict(
                                result
                            )
                        )
                        {
                            this.progressDialog.update(
                                100,

                                'Synchronization paused. Merge conflict detected.'
                            );


                            this.progressDialog.close();


                            this.isOperating =
                                false;


                            this.currentOperation =
                                '';


                            this.toast.warning(
                                'Synchronization Paused',

                                'Remote changes could not be integrated automatically. A merge conflict was detected. Please resolve the conflict and choose Continue Merge or Abort Merge.'
                            );


                            /*
                             * Mark the merge as active immediately.
                             *
                             * The synchronization API has already confirmed
                             * that Git is paused in a merge. Do not wait for
                             * the repository page reload before opening the
                             * resolver section.
                             *
                             * Refresh Git status next. loadGitStatus()
                             * will also refresh the unresolved merge files.
                             */
                            this.isMergeActive =
                                true;


                            this.loadGitStatus();


                            this.cdr.detectChanges();


                            return;
                        }


                        this.progressDialog.update(
                            100,

                            'Repository synchronization completed.'
                        );


                        this.progressDialog.close();


                        this.operationCompleted(
                            result,

                            'Synchronization Completed',

                            'Repository synchronization completed successfully.'
                        );
                    },


                error:
                    error =>
                    {
                        this.progressDialog.close();


                        /*
                         * IMPORTANT:
                         * Angular HttpClient places an unsuccessful API
                         * response in the error callback. Git merge conflicts
                         * are therefore not guaranteed to arrive through
                         * the normal `next` callback.
                         *
                         * A binary merge conflict such as:
                         *
                         *   Cannot merge binary files:
                         *   HEAD vs origin/main
                         *
                         * is an expected synchronization pause, not a
                         * completed synchronization failure.
                         */
                        if
                        (
                            this.isSynchronizationConflictError(
                                error
                            )
                        )
                        {
                            this.isOperating =
                                false;


                            this.currentOperation =
                                '';


                            this.toast.warning(
                                'Synchronization Paused',

                                'Remote changes could not be integrated automatically because a Git merge conflict was detected. Resolve the conflict, then choose Continue Merge or Abort Merge.'
                            );


                            /*
                             * Mark the merge as active immediately.
                             *
                             * The synchronization API has already confirmed
                             * that Git is paused in a merge. Do not wait for
                             * the repository page reload before opening the
                             * resolver section.
                             *
                             * Refresh Git status next. loadGitStatus()
                             * will also refresh the unresolved merge files.
                             */
                            this.isMergeActive =
                                true;


                            this.loadGitStatus();


                            this.cdr.detectChanges();


                            return;
                        }


                        this.operationFailed(
                            error,

                            'Synchronization Failed',

                            'Failed to synchronize repository.'
                        );
                    }
            });
    }


    //===========================================================
    // Is Synchronization Conflict Error
    //===========================================================
    //
    // Angular HttpClient sends HTTP 4xx/5xx responses through the
    // `error` callback. The backend can still provide a GitOperation
    // result containing the actual Git merge-conflict message.
    //
    // This method inspects the common HttpErrorResponse shapes
    // without changing the service contract.
    //
    //===========================================================

    private isSynchronizationConflictError
    (
        error:
            any
    ):
        boolean
    {
        if
        (
            !error
        )
        {
            return false;
        }


        const candidates =
            [
                error?.message,

                error?.error?.message,

                error?.error?.output,

                error?.error?.error,

                error?.error?.details,

                error?.error?.title
            ]
                .filter(
                    value =>
                        typeof value ===
                        'string'
                )
                .join(
                    '\n'
                )
                .toLowerCase();


        return (
            candidates.includes(
                'cannot merge binary files'
            )
            ||
            candidates.includes(
                'merge conflict'
            )
            ||
            candidates.includes(
                'unresolved conflict'
            )
            ||
            candidates.includes(
                'could not be integrated'
            )
            ||
            candidates.includes(
                'automatic merge failed'
            )
            ||
            candidates.includes(
                'git merge is currently in progress'
            )
            ||
            candidates.includes(
                'git merge is in progress'
            )
            ||
            candidates.includes(
                'synchronization was blocked because a git merge'
            )
            ||
            candidates.includes(
                'synchronization blocked because a git merge'
            )
        );
    }


    //===========================================================
    // Is Synchronization Conflict
    //===========================================================
    //
    // Full Repository Synchronization can stop at the remote
    // integration stage because Git detected a merge conflict.
    //
    // That result is intentionally handled differently from a
    // normal Git/API failure:
    //
    // - show a warning toast;
    // - reload the repository state;
    // - return to the existing conflict-resolution UI.
    //
    //===========================================================

    private isSynchronizationConflict
    (
        result:
            GitOperationResultDto
    ):
        boolean
    {
        if
        (
            !result
        )
        {
            return false;
        }


        const message =
            (
                result.message
                ||
                ''
            )
                .trim()
                .toLowerCase();


        const output =
            (
                result.output
                ||
                ''
            )
                .trim()
                .toLowerCase();


        return (
            message.includes(
                'synchronization conflict'
            )
            ||
            message.includes(
                'could not be integrated'
            )
            ||
            message.includes(
                'merge conflict'
            )
            ||
            message.includes(
                'git merge is currently in progress'
            )
            ||
            message.includes(
                'git merge is in progress'
            )
            ||
            message.includes(
                'synchronization was blocked because a git merge'
            )
            ||
            message.includes(
                'synchronization blocked because a git merge'
            )
            ||
            output.includes(
                'cannot merge binary files'
            )
            ||
            output.includes(
                'merge conflict'
            )
        );
    }


    //===========================================================
    // Get Merge Conflicts
    //===========================================================

    private getMergeConflicts():
        void
    {
        if
        (
            this.sourceControlId <= 0
        )
        {
            return;
        }


        this.isOperating =
            true;


        this.currentOperation =
            'merge-conflicts';


        this.progressDialog.show(
            'Resolve Merge Conflicts',

            'Checking the repository for unresolved merge conflicts...'
        );


        this.progressDialog.update(
            25,

            'Reading repository merge state...'
        );


        this.sourcecontrolservice
            .getMergeConflicts(
                this.sourceControlId
            )
            .subscribe(
            {
                next:
                    result =>
                    {
                        this.applyMergeConflictResult(
                            result
                        );


                        this.progressDialog.update(
                            100,

                            'Merge conflict check completed.'
                        );


                        this.progressDialog.close();


                        this.isOperating =
                            false;


                        this.currentOperation =
                            '';


                        if
                        (
                            this.isMergeActive
                        )
                        {
                            this.toast.error(
                                'Merge Conflicts',

                                `${this.mergeConflicts.length} unresolved merge conflict(s) found.`
                            );
                        }
                        else
                        {
                            this.toast.success(
                                'Merge Status',

                                'No unresolved merge conflicts were found.'
                            );
                        }


                        this.cdr.detectChanges();
                    },


                error:
                    error =>
                    {
                        this.progressDialog.close();


                        this.operationFailed(
                            error,

                            'Merge Conflict Check Failed',

                            'Failed to check repository merge conflicts.'
                        );
                    }
            });
    }


    //===========================================================
    // Resolve Merge Conflict
    //===========================================================

    resolveMergeConflict
    (
        filePath:
            string,
        resolution:
            'LOCAL'
            |
            'REMOTE'
    ):
        void
    {
        if
        (
            this.sourceControlId <= 0
        )
        {
            this.toast.error(
                'Resolve Merge Conflict',

                'Invalid Source Control repository.'
            );

            return;
        }


        if
        (
            !filePath
            ||
            !filePath.trim()
        )
        {
            this.toast.error(
                'Resolve Merge Conflict',

                'A valid conflict file is required.'
            );

            return;
        }


        if
        (
            !this.isMergeActive
        )
        {
            this.toast.error(
                'Resolve Merge Conflict',

                'There is no active merge requiring conflict resolution.'
            );

            return;
        }


        const normalizedPath =
            filePath.trim();


        const resolutionLabel =
            resolution ===
            'LOCAL'
                ? 'Keep Local'
                : 'Keep Remote';


        this.confirmDialog.open(
            resolutionLabel,
            `Are you sure you want to ${resolutionLabel.toLowerCase()} for '${normalizedPath}'? The selected version will replace the current conflicted file and the file will be staged as resolved.`,

            () =>
            {
                this.executeResolveMergeConflict(
                    normalizedPath,
                    resolution
                );
            },

            resolutionLabel,

            'Cancel',

            resolution ===
            'LOCAL'
                ? 'primary'
                : 'danger'
        );
    }



    //===========================================================
    // Execute Resolve Merge Conflict
    //===========================================================

    private executeResolveMergeConflict
    (
        filePath:
            string,
        resolution:
            'LOCAL'
            |
            'REMOTE'
    ):
        void
    {
        this.isOperating =
            true;


        this.currentOperation =
            resolution ===
            'LOCAL'
                ? 'resolve-local'
                : 'resolve-remote';


        this.progressDialog.show(
            'Resolve Merge Conflict',

            resolution ===
            'LOCAL'
                ? 'Keeping the local version of the conflicted file...'
                : 'Keeping the remote version of the conflicted file...'
        );


        this.progressDialog.update(
            25,

            'Applying the selected conflict resolution...'
        );


        this.sourcecontrolservice
            .resolveMergeConflict(
                this.sourceControlId,

                filePath,

                resolution
            )
            .subscribe(
            {
                next:
                    result =>
                    {
                        this.progressDialog.update(
                            100,

                            'Merge conflict resolution completed.'
                        );


                        this.progressDialog.close();


                        if
                        (
                            !result
                            ||
                            result.success !== true
                        )
                        {
                            this.isOperating =
                                false;


                            this.currentOperation =
                                '';


                            this.toast.error(
                                'Resolve Merge Conflict Failed',

                                result?.message
                                ||
                                'Failed to resolve the selected merge conflict.'
                            );


                            this.reloadRepositoryData();


                            this.cdr.detectChanges();


                            return;
                        }


                        this.toast.success(
                            'Conflict Resolved',

                            result.message
                            ||
                            `${filePath} was resolved using ${resolution === 'LOCAL' ? 'the local' : 'the remote'} version.`
                        );


                        /*
                         * Reload the repository state immediately after
                         * resolving the selected file.
                         *
                         * The backend stages the selected file, so the
                         * unresolved conflict list must be refreshed before
                         * Continue Merge is used.
                         */
                        this.reloadRepositoryData();


                        this.isOperating =
                            false;


                        this.currentOperation =
                            '';


                        this.cdr.detectChanges();
                    },


                error:
                    error =>
                    {
                        this.progressDialog.close();


                        this.operationFailed(
                            error,

                            'Resolve Merge Conflict Failed',

                            'Failed to resolve the selected merge conflict.'
                        );
                    }
            });
    }



    //===========================================================
    // Keep Local Version
    //===========================================================

    keepLocalConflict
    (
        filePath:
            string
    ):
        void
    {
        this.resolveMergeConflict(
            filePath,

            'LOCAL'
        );
    }



    //===========================================================
    // Keep Remote Version
    //===========================================================

    keepRemoteConflict
    (
        filePath:
            string
    ):
        void
    {
        this.resolveMergeConflict(
            filePath,

            'REMOTE'
        );
    }



    //===========================================================
    // Continue Merge
    //===========================================================

    private continueMerge():
        void
    {
        if
        (
            !this.isMergeActive
        )
        {
            this.toast.error(
                'Continue Merge',

                'There is no active merge requiring continuation.'
            );

            return;
        }


        this.confirmDialog.open(
            'Continue Merge',

            'Have all merge conflicts been resolved? The resolved changes will be staged, the merge will be completed, and the synchronization will continue.',

            () =>
            {
                this.executeContinueMerge();
            },

            'Continue Merge',

            'Cancel',

            'primary'
        );
    }


    //===========================================================
    // Execute Continue Merge
    //===========================================================

    private executeContinueMerge():
        void
    {
        this.isOperating =
            true;


        this.currentOperation =
            'continue-merge';


        this.progressDialog.show(
            'Continue Merge',

            'Preparing to complete the resolved merge...'
        );


        this.progressDialog.update(
            25,

            'Checking resolved merge files...'
        );


        this.sourcecontrolservice
            .continueMerge(
                this.sourceControlId
            )
            .subscribe(
            {
                next:
                    result =>
                    {
                        this.progressDialog.update(
                            100,

                            'Merge completed and synchronization continued.'
                        );


                        this.progressDialog.close();


                        /*
                         * Clear the merge UI immediately after a
                         * successful merge completion.
                         */
                        this.mergeConflicts =
                            [];

                        this.isMergeActive =
                            false;


                        this.operationCompleted(
                            result,

                            'Merge Completed',

                            'The merge was completed and repository synchronization continued.'
                        );
                    },


                error:
                    error =>
                    {
                        this.progressDialog.close();


                        this.operationFailed(
                            error,

                            'Continue Merge Failed',

                            'Failed to continue the repository merge.'
                        );
                    }
            });
    }


    //===========================================================
    // Abort Merge
    //===========================================================

    private abortMerge():
        void
    {
        if
        (
            !this.isMergeActive
        )
        {
            this.toast.error(
                'Abort Merge',

                'There is no active merge to abort.'
            );

            return;
        }


        this.confirmDialog.open(
            'Abort Merge',

            'Are you sure you want to abort the active merge? The repository will be returned to the state before the merge started.',

            () =>
            {
                this.executeAbortMerge();
            },

            'Abort Merge',

            'Cancel',

            'danger'
        );
    }


    //===========================================================
    // Execute Abort Merge
    //===========================================================

    private executeAbortMerge():
        void
    {
        this.isOperating =
            true;


        this.currentOperation =
            'abort-merge';


        this.progressDialog.show(
            'Abort Merge',

            'Aborting the active repository merge...'
        );


        this.progressDialog.update(
            50,

            'Restoring repository merge state...'
        );


        this.sourcecontrolservice
            .abortMerge(
                this.sourceControlId
            )
            .subscribe(
            {
                next:
                    result =>
                    {
                        this.progressDialog.update(
                            100,

                            'Merge has been aborted.'
                        );


                        this.progressDialog.close();


                        /*
                         * Clear the merge UI immediately.
                         *
                         * This prevents the previous merge state
                         * from remaining visible while repository
                         * status is being reloaded.
                         */
                        this.mergeConflicts =
                            [];

                        this.isMergeActive =
                            false;


                        this.operationCompleted(
                            result,

                            'Merge Aborted',

                            'The active merge has been aborted.'
                        );
                    },


                error:
                    error =>
                    {
                        this.progressDialog.close();


                        this.operationFailed(
                            error,

                            'Abort Merge Failed',

                            'Failed to abort the active repository merge.'
                        );
                    }
            });
    }


    //===========================================================
    // Reset To Remote
    //===========================================================

    private resetToRemote():
        void
    {
        this.confirmDialog.open(
            'Reset Repository To Remote',

            'This will discard local repository changes and reset the repository to the current remote branch. This action cannot be undone. Do you want to continue?',

            () =>
            {
                this.executeResetToRemote();
            },

            'Reset To Remote',

            'Cancel',

            'danger'
        );
    }


    //===========================================================
    // Execute Reset To Remote
    //===========================================================

    private executeResetToRemote():
        void
    {
        this.isOperating =
            true;


        this.currentOperation =
            'reset-to-remote';


        this.progressDialog.show(
            'Reset Repository To Remote',

            'Preparing to reset the local repository to the remote branch...'
        );


        this.progressDialog.update(
            25,

            'Fetching the latest remote repository state...'
        );


        this.sourcecontrolservice
            .resetToRemote(
                this.sourceControlId
            )
            .subscribe(
            {
                next:
                    result =>
                    {
                        this.progressDialog.update(
                            100,

                            'Repository reset completed.'
                        );


                        this.progressDialog.close();


                        this.operationCompleted(
                            result,

                            'Reset Completed',

                            'The local repository has been reset to the remote branch.'
                        );
                    },


                error:
                    error =>
                    {
                        this.progressDialog.close();


                        this.operationFailed(
                            error,

                            'Reset Failed',

                            'Failed to reset the repository to the remote branch.'
                        );
                    }
            });
    }


    //===========================================================
    // Refresh Status
    //
    // This is the ACTION-CARD refresh.
    //
    // Unlike refreshPage(), this DOES:
    // - confirmation
    // - progress dialog
    // - Git status request
    // - success/error toast
    //===========================================================

    private refreshStatus():
        void
    {
        this.confirmDialog.open(
            'Refresh Repository Status',

            'Are you sure you want to refresh the current repository status?',

            () =>
            {
                this.executeRefreshStatus();
            },

            'Refresh',

            'Cancel',

            'primary'
        );
    }


    //===========================================================
    // Execute Refresh Status
    //===========================================================

    private executeRefreshStatus():
        void
    {
        if
        (
            this.sourceControlId <= 0
        )
        {
            return;
        }


        this.isOperating =
            true;


        this.currentOperation =
            'refresh';


        this.progressDialog.show(
            'Refresh Repository Status',

            'Preparing to refresh repository status...'
        );


        this.progressDialog.update(
            25,

            'Checking repository working tree...'
        );


        this.sourcecontrolservice
            .getStatus(
                this.sourceControlId
            )
            .subscribe(
            {
                next:
                    status =>
                    {
                        this.gitStatus =
                            status;


                        this.loadMergeConflicts();


                        this.cdr.detectChanges();


                        this.progressDialog.update(
                            100,

                            'Repository status refreshed.'
                        );


                        this.progressDialog.close();


                        this.isOperating =
                            false;


                        this.currentOperation =
                            '';


                        this.toast.success(
                            'Refresh Completed',

                            'Repository status refreshed successfully.'
                        );


                        this.cdr.detectChanges();
                    },


                error:
                    error =>
                    {
                        console.error(
                            'Refresh Repository Status Error',

                            error
                        );


                        this.progressDialog.close();


                        this.operationFailed(
                            error,

                            'Refresh Failed',

                            'Failed to refresh repository status.'
                        );
                    }
            });
    }


    //===========================================================
    // Operation Completed
    //===========================================================

    private operationCompleted
    (
        result:
            GitOperationResultDto,

        title:
            string,

        fallback:
            string
    ):
        void
    {
        this.isOperating =
            false;


        this.currentOperation =
            '';


        if
        (
            !result
            ||
            result.success !== true
        )
        {
            this.toast.error(
                title.replace(
                    'Completed',
                    'Failed'
                ),

                result?.message
                ||
                fallback
                ||
                'Git operation failed.'
            );


            this.reloadRepositoryData();


            this.cdr.detectChanges();


            return;
        }


        this.toast.success(
            title,

            result.message
            ||
            fallback
        );


        this.reloadRepositoryData();


        this.cdr.detectChanges();
    }


    //===========================================================
    // Operation Failed
    //===========================================================

    private operationFailed
    (
        error:
            any,

        title:
            string,

        fallback:
            string
    ):
        void
    {
        console.error(
            title,

            error
        );


        this.isOperating =
            false;


        this.currentOperation =
            '';


        this.toast.error(
            title,

            this.getErrorMessage(
                error,

                fallback
            )
        );


        this.cdr.detectChanges();
    }


    //===========================================================
    // Reload Repository Data
    //===========================================================

    private reloadRepositoryData():
        void
    {
        this.loadRepository();
    }


    //===========================================================
    // Tab Change
    //===========================================================

    onTabChange
    (
        tabId:
            string
    ):
        void
    {
        this.selectedTab =
            tabId;
    }


    //===========================================================
    // Go Back
    //===========================================================

    goBack():
        void
    {
        void this.router.navigate(
        [
            '/infrastructure-control',

            'code-management',

            'source-control',

            'list'
        ]);
    }


    //===========================================================
    // Close
    //===========================================================

    close():
        void
    {
        this.goBack();
    }


    //===========================================================
    // Refresh
    //
    // Kept for compatibility with existing callers.
    //
    // This represents the repository-status refresh action,
    // not the Command Center page reload.
    //===========================================================

    refresh():
        void
    {
        if
        (
            this.isOperating
        )
        {
            return;
        }


        this.refreshStatus();
    }


    //===========================================================
    // Repository Code
    //===========================================================

    get repositoryCode():
        string
    {
        return (
            this.repository?.repositoryCode
            ||
            '--'
        );
    }


    //===========================================================
    // Repository Name
    //===========================================================

    get repositoryName():
        string
    {
        return (
            this.repository?.repositoryName
            ||
            '--'
        );
    }


    //===========================================================
    // Git Remote URL
    //===========================================================

    get gitRemoteUrl():
        string
    {
        return (
            this.repository?.gitRemoteUrl
            ||
            '--'
        );
    }


    //===========================================================
    // Default Branch
    //===========================================================

    get defaultBranch():
        string
    {
        return (
            this.repository?.defaultBranch
            ||
            '--'
        );
    }


    //===========================================================
    // Repository Path
    //===========================================================

    get repositoryPath():
        string
    {
        return (
            this.repository?.repositoryPath
            ||
            '--'
        );
    }


    //===========================================================
    // Repository Status
    //===========================================================

    get repositoryStatus():
        string
    {
        if
        (
            !this.repository
        )
        {
            return '--';
        }


        return this.repository.isActive
            ? 'Active'
            : 'Inactive';
    }


    //===========================================================
    // Connection Status
    //===========================================================

    get connectionStatus():
        string
    {
        if
        (
            !this.gitStatus
        )
        {
            return '--';
        }


        return 'Connected';
    }


    //===========================================================
    // Workspace Status
    //===========================================================

    get workspaceStatus():
        string
    {
        if
        (
            !this.gitStatus
        )
        {
            return '--';
        }


        return this.gitStatus.isClean
            ? 'Clean'
            : 'Changes';
    }


    //===========================================================
    // Remote Status
    //===========================================================

    get remoteStatus():
        string
    {
        if
        (
            !this.repository
        )
        {
            return '--';
        }


        return this.gitRemoteUrl !== '--'
            ? 'Configured'
            : 'Not Configured';
    }


    //===========================================================
    // Branch
    //===========================================================

    get currentBranch():
        string
    {
        return (
            this.gitStatus?.branch
            ||
            this.defaultBranch
        );
    }


    //===========================================================
    // Last Commit Hash
    //===========================================================

    get lastCommitHash():
        string
    {
        return (
            this.gitStatus?.lastCommitHash
            ||
            '--'
        );
    }


    //===========================================================
    // Last Commit Message
    //===========================================================

    get lastCommitMessage():
        string
    {
        return (
            this.gitStatus?.lastCommitMessage
            ||
            '--'
        );
    }


    //===========================================================
    // Last Commit Date
    //===========================================================

    get lastCommitDate():
        string
    {
        return (
            this.gitStatus?.lastCommitDate
            ||
            '--'
        );
    }


    //===========================================================
    // Modified Files
    //===========================================================

    get modifiedFiles():
        string[]
    {
        return (
            this.gitStatus?.modifiedFiles
            ||
            []
        );
    }


    //===========================================================
    // Modified Count
    //
    // Backend status parser returns:
    //
    // [MODIFIED] ...
    //
    //===========================================================

    get modifiedCount():
        number
    {
        return this.modifiedFiles
            .filter(
                file =>
                    file.startsWith(
                        '[MODIFIED] '
                    )
            )
            .length;
    }


    //===========================================================
    // Deleted Count
    //
    // Backend status parser returns:
    //
    // [DELETED] ...
    //
    //===========================================================

    get deletedCount():
        number
    {
        return this.modifiedFiles
            .filter(
                file =>
                    file.startsWith(
                        '[DELETED] '
                    )
            )
            .length;
    }


    //===========================================================
    // Untracked Count
    //
    // Backend status parser returns:
    //
    // [UNTRACKED] ...
    //
    //===========================================================

    get untrackedCount():
        number
    {
        return this.modifiedFiles
            .filter(
                file =>
                    file.startsWith(
                        '[UNTRACKED] '
                    )
            )
            .length;
    }


    //===========================================================
    // Submodule Count
    //
    // Backend status parser returns:
    //
    // [SUBMODULE] ...
    //
    // This is important for entries such as:
    //
    // modified: Master_ERP (untracked content)
    //
    //===========================================================

    get submoduleCount():
        number
    {
        return this.modifiedFiles
            .filter(
                file =>
                    file.startsWith(
                        '[SUBMODULE] '
                    )
            )
            .length;
    }


    //===========================================================
    // Total Changes
    //===========================================================

    get totalChanges():
        number
    {
        return (
            this.modifiedCount
            +
            this.deletedCount
            +
            this.untrackedCount
            +
            this.submoduleCount
        );
    }


    //===========================================================
    // Modified File Count
    //
    // Kept for compatibility with existing template/code.
    //===========================================================

    get modifiedFileCount():
        number
    {
        return this.modifiedCount;
    }


    //===========================================================
    // Has Changes
    //===========================================================

    get hasChanges():
        boolean
    {
        if
        (
            !this.gitStatus
        )
        {
            return false;
        }


        return !this.gitStatus.isClean;
    }


    //===========================================================
    // Has Merge Conflicts
    //===========================================================

    get hasMergeConflicts():
        boolean
    {
        return (
            this.isMergeActive
            &&
            this.mergeConflicts.length > 0
        );
    }


    //===========================================================
    // Merge Conflict Count
    //===========================================================

    get mergeConflictCount():
        number
    {
        return this.mergeConflicts.length;
    }


    //===========================================================
    // Get Error Message
    //===========================================================

    private getErrorMessage
    (
        error:
            any,

        fallback:
            string
    ):
        string
    {
        return (
            error?.error?.message
            ||
            error?.error?.title
            ||
            error?.message
            ||
            fallback
        );
    }


    //===========================================================
    // Change Detection
    //===========================================================

    detectChanges():
        void
    {
        this.cdr.detectChanges();
    }

}