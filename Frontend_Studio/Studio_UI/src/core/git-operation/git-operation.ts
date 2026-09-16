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

    SourceControlHistoryDto,

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
    // Repository History
    //===========================================================

    recentActivities:
        SourceControlHistoryDto[] =
        [];


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

                        this.loadHistory();


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


                        this.recentActivities =
                            [];


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


                        this.cdr.detectChanges();
                    }
            });
    }


    //===========================================================
    // Load History
    //===========================================================

    private loadHistory():
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
            .getEntityHistory(
                this.sourceControlId
            )
            .subscribe(
            {
                next:
                    history =>
                    {
                        this.recentActivities =
                            history as SourceControlHistoryDto[];


                        this.cdr.detectChanges();
                    },


                error:
                    error =>
                    {
                        console.error(
                            'Repository History Error',

                            error
                        );


                        this.recentActivities =
                            [];


                        this.cdr.detectChanges();
                    }
            });
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


            default:

                console.warn(
                    'Unknown Git Operation:',

                    operationId
                );

                break;
        }
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


                        this.operationFailed(
                            error,

                            'Synchronization Failed',

                            'Failed to synchronize repository.'
                        );
                    }
            });
    }


    //===========================================================
    // Refresh Status
    //===========================================================

    private refreshStatus():
        void
    {
        this.confirmDialog.open(
            'Refresh Repository Status',

            'Are you sure you want to refresh the current repository status and activity information?',

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
        this.isOperating =
            true;


        this.currentOperation =
            'refresh';


        this.loadGitStatus();

        this.loadHistory();


        this.isOperating =
            false;


        this.currentOperation =
            '';


        this.toast.success(
            'Refresh Completed',

            'Repository status and activity information refreshed.'
        );


        this.cdr.detectChanges();
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

            return;
        }


        this.toast.success(
            title,

            result.message
            ||
            fallback
        );


        this.reloadRepositoryData();
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
    // Modified File Count
    //===========================================================

    get modifiedFileCount():
        number
    {
        return this.modifiedFiles.length;
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