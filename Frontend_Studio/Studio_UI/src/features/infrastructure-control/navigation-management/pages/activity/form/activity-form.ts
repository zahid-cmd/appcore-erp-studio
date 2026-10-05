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

import
{
    FormsModule
}
from '@angular/forms';

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

//===============================================================
// Models & Services
//===============================================================

import
{
    MasterActivity,
    MasterActivityDefaults,
    CreateMasterActivity,
    UpdateMasterActivity
}
from '../../../models/master-activity.model';

import
{
    MasterActivityService
}
from '../../../services/master-activity.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-navigation-activity-form',
    standalone:true,
    imports:
    [
        CommonModule,
        FormsModule,
        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        PageCanvasComponent,
        FormGridComponent,
        FormSectionComponent,
        TextboxComponent,
        TextareaComponent,
        DropdownComponent,
        ToastComponent,
        ConfirmDialogComponent
    ],
    templateUrl:'./activity-form.html',
    styleUrls:
    [
        './activity-form.css'
    ]
})

//===============================================================
// Master Activity Form Component
//===============================================================

export class NavigationActivityFormComponent
implements OnInit
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly masterActivityService =
        inject(MasterActivityService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Mode
    //===========================================================

    mode:
        'add' | 'edit' | 'view' = 'add';

    activityId =
        0;

    //===========================================================
    // Page Header
    //===========================================================

    pageTitle =
        'Master Activity';

    //===========================================================
    // Entity
    //===========================================================

    entityName =
        'Master Activity';

    //===========================================================
    // Tab Title
    //===========================================================

    get tabTitle(): string
    {
        switch (this.mode)
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
    // Status Dropdown
    //===========================================================

    statuses =
    [
        {
            value:true,
            text:'Active'
        },
        {
            value:false,
            text:'Inactive'
        }
    ];

    //===========================================================
    // Activity Model
    //===========================================================

    activity: MasterActivity =
    {
        id:0,
        code:'',
        name:'',
        displayOrder:1,
        remarks:'',
        isActive:true
    };

    //===========================================================
    // Form State
    //===========================================================

    private originalActivity =
        '';

    hasChanges =
        false;

    //===========================================================
    // Track Form Changes
    //===========================================================

    checkForChanges():
        void
    {
        this.hasChanges =
            JSON.stringify(this.activity)
            !==
            this.originalActivity;
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeMode();
    }

    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode():
        void
    {
        const id =
            Number(
                this.route.snapshot.paramMap.get('id')
            );

        const url =
            this.router.url.toLowerCase();

        //=======================================================
        // View Mode
        //=======================================================

        if (url.includes('/view/'))
        {
            this.mode =
                'view';
        }

        //=======================================================
        // Edit Mode
        //=======================================================

        else if (url.includes('/edit/'))
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
        // Edit / View
        //=======================================================

        if (id > 0)
        {
            this.activityId =
                id;

            this.loadActivity();

            return;
        }

        //=======================================================
        // Add
        //=======================================================

        this.activity =
        {
            id:0,
            code:'',
            name:'',
            displayOrder:1,
            remarks:'',
            isActive:true
        };

        this.originalActivity =
            JSON.stringify(this.activity);

        this.hasChanges =
            false;

        this.loadDefaults();
    }

    //===========================================================
    // Load Activity
    //===========================================================

    private loadActivity():
        void
    {
        this.masterActivityService
            .getById(this.activityId)
            .subscribe(
            {
                next:(response) =>
                {
                    this.activity =
                    {
                        id:response.id,
                        code:response.code,
                        name:response.name,
                        displayOrder:response.displayOrder,
                        remarks:response.remarks,
                        isActive:response.isActive
                    };

                    this.originalActivity =
                        JSON.stringify(this.activity);

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(error);

                    this.toast.error(
                        'Error',
                        'Failed to load master activity.'
                    );

                    this.onBackToList();
                }
            });
    }

    //===========================================================
    // Load Defaults
    //===========================================================

    private loadDefaults():
        void
    {
        this.masterActivityService
            .getDefaults()
            .subscribe(
            {
                next:(defaults:MasterActivityDefaults) =>
                {
                    console.log(
                        'Master Activity Defaults:',
                        defaults
                    );

                    this.activity.code =
                        defaults.code;

                    this.activity.displayOrder =
                        defaults.displayOrder;

                    this.activity.isActive =
                        defaults.isActive;

                    this.originalActivity =
                        JSON.stringify(this.activity);

                    this.hasChanges =
                        false;

                    this.cdr.detectChanges();
                },

                error:(error) =>
                {
                    console.error(
                        'Failed to load master activity defaults.',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Unable to load default values.'
                    );
                }
            });
    }

    //===========================================================
    // Status Changed
    //===========================================================

    onStatusChange(
        value:boolean
    ):
        void
    {
        this.activity.isActive =
            value;

        this.checkForChanges();
    }

    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        if (!this.activity.name.trim())
        {
            this.toast.warning(
                'Validation',
                'Activity name is required.'
            );

            return;
        }

        //=======================================================
        // Create
        //=======================================================

        if (this.mode === 'add')
        {
            const model:CreateMasterActivity =
            {
                name:
                    this.activity.name,

                displayOrder:
                    this.activity.displayOrder,

                remarks:
                    this.activity.remarks,

                isActive:
                    this.activity.isActive
            };

            this.masterActivityService
                .create(model)
                .subscribe(
                {
                    next:() =>
                    {
                        this.originalActivity =
                            JSON.stringify(this.activity);

                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Success',
                            'Master activity created successfully.'
                        );

                        this.onBackToList();
                    },

                    error:(error) =>
                    {
                        console.error(error);

                        const message =
                            error?.error
                            ??
                            'Failed to create master activity.';

                        this.toast.error(
                            'Validation',
                            message
                        );
                    }
                });

            return;
        }

        //=======================================================
        // Update
        //=======================================================

        const model:UpdateMasterActivity =
        {
            id:
                this.activity.id,

            name:
                this.activity.name,

            displayOrder:
                this.activity.displayOrder,

            remarks:
                this.activity.remarks,

            isActive:
                this.activity.isActive
        };

        this.masterActivityService
            .update(model)
            .subscribe(
            {
                next:() =>
                {
                    this.originalActivity =
                        JSON.stringify(this.activity);

                    this.hasChanges =
                        false;

                    this.toast.success(
                        'Success',
                        'Master activity updated successfully.'
                    );

                    this.onBackToList();
                },

                error:(error) =>
                {
                    console.error(error);

                    const message =
                        error?.error
                        ??
                        'Failed to update master activity.';

                    this.toast.error(
                        'Validation',
                        message
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
        // Edit Mode
        //=======================================================

        if (this.mode === 'edit')
        {
            this.activity.name =
                '';

            this.activity.remarks =
                '';

            this.activity.isActive =
                true;

            this.checkForChanges();

            return;
        }

        //=======================================================
        // Add Mode
        //=======================================================

        const currentCode =
            this.activity.code;

        const currentDisplayOrder =
            this.activity.displayOrder;

        this.activity =
        {
            id:0,
            code:currentCode,
            name:'',
            displayOrder:currentDisplayOrder,
            remarks:'',
            isActive:true
        };

        this.originalActivity =
            JSON.stringify(this.activity);

        this.hasChanges =
            false;

        this.loadDefaults();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Back To List
    //===========================================================

    onBackToList():
        void
    {
        const route =
            '/infrastructure-control/navigation-management/navigation-activities';

        if (!this.hasChanges)
        {
            this.router.navigate(
                [route]
            );

            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () =>
            {
                this.router.navigate(
                    [route]
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
    // Close Form
    //===========================================================

    close():
        void
    {
        this.onBackToList();
    }

    //===========================================================
    // Refresh Form
    //===========================================================

    refresh():
        void
    {
        //=======================================================
        // Edit / View Mode
        //=======================================================

        if
        (
            this.mode === 'edit'
            ||
            this.mode === 'view'
        )
        {
            this.loadActivity();

            return;
        }

        //=======================================================
        // Add Mode
        //=======================================================

        this.loadDefaults();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Value Changed
    //===========================================================

    onValueChange():
        void
    {
        this.checkForChanges();
    }
}
