//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
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


import
{
    FormsModule
}
from '@angular/forms';


import
{
    Observable,
    defer,
    timer,
    throwError,
    delayWhen,
    catchError,
    switchMap
}
from 'rxjs';


//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';


import
{
    PageToolbarComponent
}
from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';


import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';


import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';


import
{
    PageCanvasComponent
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';


import
{
    FormGridComponent
}
from '../../../../../../shared/components/layout/form-grid/form-grid';


import
{
    FormSectionComponent
}
from '../../../../../../shared/components/layout/form-section/form-section';


//===============================================================
// Form Controls
//===============================================================

import
{
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';


import
{
    TextareaComponent
}
from '../../../../../../shared/components/controls/textarea/textarea';


import
{
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';


//===============================================================
// Utilities
//===============================================================

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';


import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';


import
{
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';


import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';


import
{
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';


import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';


//===============================================================
// Models & Services
//===============================================================

import
{
    AccountClass,
    CreateAccountClass,
    UpdateAccountClass,
    AccountClassDefaults
}
from '../../../models/account-class.model';


import
{
    AccountClassService
}
from '../../../services/account-class.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'account-class-form',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,

        //=======================================================
        // Layout
        //=======================================================

        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        ControlTabsComponent,
        PageCanvasComponent,
        FormGridComponent,
        FormSectionComponent,

        //=======================================================
        // Form Controls
        //=======================================================

        TextboxComponent,
        TextareaComponent,
        DropdownComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./account-class-form.html',

    styleUrls:
    [
        './account-class-form.css'
    ]
})


//===============================================================
// Account Class Form
//===============================================================

export class AccountClassForm
implements OnInit, OnDestroy
{


    //===========================================================
    // Dependency Injection
    //===========================================================


    private readonly route =
        inject(ActivatedRoute);


    private readonly router =
        inject(Router);


    private readonly accountClassService =
        inject(AccountClassService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly progressDialog =
        inject(ProgressDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly cdr =
        inject(ChangeDetectorRef);


    //===========================================================
    // Mode
    //===========================================================


    mode:
        'add' | 'edit' | 'view' =

        'add';


    entityId:
        number =

        0;


    //===========================================================
    // Page Header
    //===========================================================


    pageTitle:
        string =

        'Account Class';


    entityName:
        string =

        'Account Class';


    //===========================================================
    // Selected Tab
    //===========================================================


    selectedTab:
        string =

        'general';


    //===========================================================
    // Tabs
    //===========================================================


    get tabs():
        ControlTab[]
    {
        return [
            {
                id:'general',
                label:this.tabTitle
            }
        ];
    }


    //===========================================================
    // Tab Title
    //===========================================================


    get tabTitle():
        string
    {
        switch
        (
            this.mode
        )
        {
            case 'add':

                return `Add ${this.entityName}`;


            case 'edit':

                return `Update ${this.entityName}`;


            case 'view':

                return `View ${this.entityName}`;


            default:

                return this.entityName;
        }
    }


    //===========================================================
    // Class Type Items
    //===========================================================


    classTypeItems:
        any[]
    =

    [
        {
            label:'Account Class',
            value:'Account Class'
        },

        {
            label:'Inventory Class',
            value:'Inventory Class'
        }
    ];


    //===========================================================
    // Mode Items
    //===========================================================


    modeItems:
        any[]
    =

    [
        {
            label:'Debit',
            value:'Debit'
        },

        {
            label:'Credit',
            value:'Credit'
        }
    ];


    //===========================================================
    // Manual Group Creation Items
    //===========================================================


    manualGroupCreationItems:
        any[]
    =

    [
        {
            label:'Yes',
            value:true
        },

        {
            label:'No',
            value:false
        }
    ];


    //===========================================================
    // Status Items
    //===========================================================


    statusItems:
        any[]
    =

    [
        {
            label:'Active',
            value:true
        },

        {
            label:'Inactive',
            value:false
        }
    ];


    //===========================================================
    // Entity
    //===========================================================


    entity:
        AccountClass
    =

    {
        AccountClassId:0,

        ClassType:'Account Class',

        ClassCode:'',

        ClassName:'',

        Mode:'Debit',

        ClassPrefix:'ACC',

        AllowManualGroupCreation:false,

        Remarks:'',

        IsActive:true
    };


    //===========================================================
    // Form State
    //===========================================================


    private originalEntity:
        string =

        '';


    hasChanges:
        boolean =

        false;


    // Prevents double submit while Save / Update is running
    isSaving:
        boolean =

        false;


    //===========================================================
    // Progress Dialog Settings
    //===========================================================


    // Minimum time the dialog stays open
    private readonly MIN_PROGRESS_MS:
        number =

        5000;


    // Animation tick
    private readonly PROGRESS_TICK_MS:
        number =

        100;


    // Highest % reached before the server answers
    private readonly PROGRESS_CEILING:
        number =

        90;


    // How long 100% is shown before closing
    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =

        600;


    private progressTimer?:
        number;


    private progressValue:
        number =

        0;


    //===========================================================
    // Initialize
    //===========================================================


    ngOnInit():
        void
    {
        this.initializeMode();
    }


    //===========================================================
    // Destroy
    //===========================================================


    ngOnDestroy():
        void
    {
        this.clearProgressTimer();


        if
        (
            this.isSaving
        )
        {
            this.progressDialog.close();
        }
    }


    //===========================================================
    // Initialize Mode
    //===========================================================


    private initializeMode():
        void
    {
        const url =
            this.router.url.toLowerCase();


        //=======================================================
        // View Mode
        //=======================================================

        if
        (
            url.includes('/view/')
        )
        {
            this.mode =
                'view';
        }


        //=======================================================
        // Edit Mode
        //=======================================================

        else if
        (
            url.includes('/edit/')
        )
        {
            this.mode =
                'edit';
        }


        //=======================================================
        // Add Mode
        //=======================================================

        else
        {
            this.mode =
                'add';
        }


        //=======================================================
        // Resolve Entity Id
        //=======================================================

        const id =
            this.resolveEntityId();


        //=======================================================
        // Existing Entity
        //=======================================================

        if
        (
            id > 0
        )
        {
            this.entityId =
                id;

            this.loadEntity();

            return;
        }


        //=======================================================
        // New Entity
        //=======================================================

        this.initializeEntity();
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
    // Initialize Entity
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
        {
            AccountClassId:0,

            ClassType:'Account Class',

            ClassCode:'',

            ClassName:'',

            Mode:'Debit',

            ClassPrefix:'ACC',

            AllowManualGroupCreation:true,

            Remarks:'',

            IsActive:true
        };


        this.updateClassPrefix();


        this.generateDefaults();
    }


    //===========================================================
    // Generate Defaults
    //===========================================================


    private generateDefaults():
        void
    {
        //=======================================================
        // Existing Record
        //=======================================================

        if
        (
            this.entityId > 0
        )
        {
            return;
        }


        //=======================================================
        // Generate Code From Class Type
        //=======================================================

        this.generateNextCode();
    }


    //===========================================================
    // Generate Next Code
    //===========================================================

    private generateNextCode():
        void
    {
        this.updateClassPrefix();

        const classType =
            this.entity.ClassType;

        this.accountClassService
            .getNextCode(
                classType
            )
            .subscribe
            ({
                next:
                (
                    code:
                        string
                ): void =>
                {
                    if
                    (
                        !code?.trim()
                    )
                    {
                        console.error(
                            'Generate Account Class Code Error',
                            'Empty code returned from server.'
                        );

                        this.toast.error(
                            'Error',
                            'Failed to generate Account Class code.'
                        );

                        return;
                    }

                    this.entity.ClassCode =
                        code.trim();

                    this.entity.IsActive =
                        true;

                    this.setInitialFormState();
                },

                error:
                (
                    codeError:
                        unknown
                ): void =>
                {
                    console.error(
                        'Generate Account Class Code Error',
                        codeError
                    );

                    this.toast.error(
                        'Error',
                        'Failed to generate Account Class code.'
                    );
                }
            });
    }


    //===========================================================
    // Update Class Prefix
    //===========================================================


    updateClassPrefix():
        void
    {
        this.entity.ClassPrefix =
            this.entity.ClassType === 'Inventory Class'
                ?
                    'INV'
                :
                    'ACC';
    }


    //===========================================================
    // Class Type Change
    //===========================================================


    onClassTypeChange():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }


        this.updateClassPrefix();


        this.entity.ClassCode =
            '';


        this.generateNextCode();


        this.checkForChanges();

        this.cdr.detectChanges();
    }


    //===========================================================
    // Set Initial Form State
    //===========================================================


    private setInitialFormState():
        void
    {
        this.originalEntity =
            JSON.stringify(
                this.entity
            );

        this.hasChanges =
            false;

        this.cdr.detectChanges();
    }


    //===========================================================
    // Load Entity
    //===========================================================


    private loadEntity():
        void
    {
        this.accountClassService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        any
                ): void =>
                {
                    this.entity =
                    {
                        AccountClassId:
                            Number(
                                response?.AccountClassId
                                ??
                                response?.accountClassId
                                ??
                                0
                            ),

                        ClassType:
                            response?.ClassType
                            ??
                            response?.classType
                            ??
                            'Account Class',

                        ClassCode:
                            response?.ClassCode
                            ??
                            response?.classCode
                            ??
                            '',

                        ClassName:
                            response?.ClassName
                            ??
                            response?.className
                            ??
                            '',

                        Mode:
                            response?.Mode
                            ??
                            response?.mode
                            ??
                            'Debit',

                        ClassPrefix:
                            response?.ClassPrefix
                            ??
                            response?.classPrefix
                            ??
                            '',

                        AllowManualGroupCreation:
                            Boolean(
                                response?.AllowManualGroupCreation
                                ??
                                response?.allowManualGroupCreation
                                ??
                                false
                            ),

                        Remarks:
                            response?.Remarks
                            ??
                            response?.remarks
                            ??
                            '',

                        IsActive:
                            Boolean(
                                response?.IsActive
                                ??
                                response?.isActive
                                ??
                                true
                            )
                    };


                    this.updateClassPrefix();


                    this.originalEntity =
                        JSON.stringify(
                            this.entity
                        );

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Account Class Error',
                        error
                    );


                    this.toast.error(
                        'Error',
                        'Failed to load Account Class.'
                    );


                    this.onBackToList();
                }
            });
    }


    //===========================================================
    // Track Changes
    //===========================================================


    checkForChanges():
        void
    {
        this.hasChanges =
            JSON.stringify(
                this.entity
            )
            !==
            this.originalEntity;
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
    // Progress Dialog (Animated)
    //
    // The bar eases from 0% toward 90% while the request runs,
    // then jumps to 100% on success before closing.
    //===========================================================


    private startProgress
    (
        title:
            string,

        message:
            string
    ):
        void
    {
        this.isSaving =
            true;


        this.progressValue =
            0;


        // Determinate : we drive the percentage ourselves
        this.progressDialog.show(
            title,

            message,

            false
        );


        this.clearProgressTimer();


        this.progressTimer =
            window.setInterval(
                () =>
                {
                    // Ease-out : big steps first, smaller near the ceiling
                    const step =
                        Math.max(
                            0.4,
                            (this.PROGRESS_CEILING - this.progressValue) * 0.05
                        );


                    this.progressValue =
                        Math.min(
                            this.PROGRESS_CEILING,
                            this.progressValue + step
                        );


                    this.progressDialog.update(
                        Math.round(
                            this.progressValue
                        )
                    );
                },

                this.PROGRESS_TICK_MS
            );


        this.cdr.detectChanges();
    }


    //-----------------------------------------------------------
    // Success : show 100%, pause briefly, then close
    //-----------------------------------------------------------


    private completeProgress
    (
        message:
            string,

        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();


        this.progressDialog.update(
            100,

            message
        );


        window.setTimeout(
            () =>
            {
                this.progressDialog.close();


                this.isSaving =
                    false;


                this.cdr.detectChanges();


                done();
            },

            this.PROGRESS_COMPLETE_HOLD_MS
        );
    }


    //-----------------------------------------------------------
    // Error : close immediately, then report
    //-----------------------------------------------------------


    private failProgress
    (
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();


        this.progressDialog.close();


        this.isSaving =
            false;


        this.cdr.detectChanges();


        done();
    }


    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer
        )
        {
            clearInterval(
                this.progressTimer
            );


            this.progressTimer =
                undefined;
        }
    }


    //===========================================================
    // Minimum Progress Duration
    //
    // Keeps the progress dialog visible for at least
    // MIN_PROGRESS_MS, on both success and error.
    //===========================================================


    private withMinimumDuration<T>
    (
        source$:
            Observable<T>
    ):
        Observable<T>
    {
        return defer(
            () =>
            {
                const startedAt:
                    number =
                    Date.now();


                const remaining =
                    (): number =>
                        Math.max(
                            0,
                            this.MIN_PROGRESS_MS - (Date.now() - startedAt)
                        );


                return source$.pipe(

                    delayWhen(
                        () =>
                            timer(remaining())
                    ),

                    catchError(
                        error =>
                            timer(remaining()).pipe(
                                switchMap(
                                    () =>
                                        throwError(() => error)
                                )
                            )
                    )
                );
            }
        );
    }


    //===========================================================
    // Save
    //===========================================================


    onSave():
        void
    {
        //=======================================================
        // View Mode / Already Saving
        //=======================================================

        if
        (
            this.isViewMode
            ||
            this.isSaving
        )
        {
            return;
        }


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            !this.entity.ClassType?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Class Type is required.'
            );

            return;
        }


        if
        (
            !this.entity.ClassCode?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Class Code is required.'
            );

            return;
        }


        if
        (
            !this.entity.ClassName?.trim()
        )
        {
            this.toast.error(
                'Validation',
                'Class Name is required.'
            );

            return;
        }


        //=======================================================
        // Add
        //=======================================================

        if
        (
            this.mode === 'add'
        )
        {
            this.saveCreate();

            return;
        }


        //=======================================================
        // Update
        //=======================================================

        this.saveUpdate();
    }


    //===========================================================
    // Create
    //===========================================================


    private saveCreate():
        void
    {
        const model:
            CreateAccountClass =

        {
            ClassType:
                this.entity.ClassType,

            ClassCode:
                this.entity.ClassCode.trim(),

            ClassName:
                this.entity.ClassName.trim(),

            Mode:
                this.entity.Mode,

            ClassPrefix:
                this.entity.ClassPrefix,

            AllowManualGroupCreation:
                this.entity.AllowManualGroupCreation,

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };


        this.startProgress(
            'Saving Account Class',

            'Please wait while the account class is being saved...'
        );


        this.withMinimumDuration(
            this.accountClassService.create(
                model
            )
        )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'Account class saved.',

                        () =>
                        {
                            this.setInitialFormState();


                            this.toast.success(
                                'Success',
                                'Account Class created successfully.'
                            );


                            this.onBackToList();
                        }
                    );
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Create Account Class Error',
                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to create Account Class.';


                            this.toast.error(
                                'Validation',
                                message
                            );
                        }
                    );
                }
            });
    }


    //===========================================================
    // Update
    //===========================================================


    private saveUpdate():
        void
    {
        const model:
            UpdateAccountClass =

        {
            AccountClassId:
                this.entity.AccountClassId,

            ClassType:
                this.entity.ClassType,

            ClassCode:
                this.entity.ClassCode.trim(),

            ClassName:
                this.entity.ClassName.trim(),

            Mode:
                this.entity.Mode,

            ClassPrefix:
                this.entity.ClassPrefix,

            AllowManualGroupCreation:
                this.entity.AllowManualGroupCreation,

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };


        this.startProgress(
            'Updating Account Class',

            'Please wait while the account class is being updated...'
        );


        this.withMinimumDuration(
            this.accountClassService.update(
                model
            )
        )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'Account class updated.',

                        () =>
                        {
                            this.setInitialFormState();


                            this.toast.success(
                                'Success',
                                'Account Class updated successfully.'
                            );


                            this.onBackToList();
                        }
                    );
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Update Account Class Error',
                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            const message =
                                (error as any)?.error
                                ??
                                'Failed to update Account Class.';


                            this.toast.error(
                                'Validation',
                                message
                            );
                        }
                    );
                }
            });
    }


    //===========================================================
    // Clear
    //===========================================================


    onClear():
        void
    {
        //=======================================================
        // Saving In Progress
        //=======================================================

        if
        (
            this.isSaving
        )
        {
            return;
        }


        //=======================================================
        // Edit Mode
        //=======================================================

        if
        (
            this.mode === 'edit'
        )
        {
            this.loadEntity();

            return;
        }


        //=======================================================
        // Add Mode
        //=======================================================

        this.initializeEntity();

        this.cdr.detectChanges();
    }


    //===========================================================
    // Back To List
    //===========================================================


    onBackToList():
        void
    {
        if
        (
            !this.hasChanges
        )
        {
            void this.router.navigate
            (
                [
                    '/settings',
                    'account-settings',
                    'account-class',
                    'list'
                ]
            );

            return;
        }


        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',

            () =>
            {
                void this.router.navigate
                (
                    [
                        '/settings',
                        'account-settings',
                        'account-class',
                        'list'
                    ]
                );
            },

            'Leave',
            'Stay',
            'primary'
        );
    }


    //===========================================================
    // Save Button Text
    //===========================================================


    get saveButtonText():
        string
    {
        return this.mode === 'edit'
            ? 'Update'
            : 'Save';
    }


    //===========================================================
    // View Mode
    //===========================================================


    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }


    //===========================================================
    // Edit Mode
    //===========================================================


    get isEditMode():
        boolean
    {
        return this.mode === 'edit';
    }


    //===========================================================
    // Add Mode
    //===========================================================


    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }


    //===========================================================
    // Close
    //===========================================================


    close():
        void
    {
        this.onBackToList();
    }


    //===========================================================
    // Refresh
    //===========================================================


    refresh():
        void
    {
        if
        (
            this.mode === 'edit'
            ||
            this.mode === 'view'
        )
        {
            this.loadEntity();

            return;
        }


        this.initializeEntity();

        this.cdr.detectChanges();
    }


    //===========================================================
    // Value Changed
    //===========================================================


    onValueChange():
        void
    {
        this.checkForChanges();

        this.cdr.detectChanges();
    }


}