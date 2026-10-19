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
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    Observable,
    defer,
    timer,
    throwError
}
from 'rxjs';

import
{
    catchError,
    delayWhen,
    switchMap
}
from 'rxjs/operators';

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

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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
    CustomizedService,
    CreateCustomizedService,
    UpdateCustomizedService,
    CustomizedServicesDefaults,
    CustomizedServiceSubCategoryOption
}
from '../../../models/customized-services.model';

import
{
    CustomizedServicesService
}
from '../../../services/customized-services.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'customized-services-form',

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
        SearchDropdownComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./customized-services-form.html',

    styleUrls:
    [
        './customized-services-form.css'
    ]
})

//===============================================================
// Customized Service Form
//===============================================================

export class CustomizedServicesForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly customizedServicesService =
        inject(CustomizedServicesService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Progress Configuration
    //===========================================================

    private readonly minimumSaveDurationMs:
        number =
        5000;

    private readonly progressCeiling:
        number =
        90;

    private readonly progressEaseFactor:
        number =
        0.05;

    private readonly progressIntervalMs:
        number =
        100;

    private readonly progressCompleteHoldMs:
        number =
        600;

    //===========================================================
    // Progress State
    //===========================================================

    private progressTimer:
        ReturnType<typeof setInterval> | null =
        null;

    private progressValue:
        number =
        0;

    isSaving:
        boolean =
        false;

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
        'Customized Services';

    entityName:
        string =
        'Customized Services';

    //===========================================================
    // Tabs
    //===========================================================

    selectedTab:
        string =
        'general';

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
    // Dropdown Items
    //===========================================================

    subCategoryItems:
        any[]
        =
        [];

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
    // Customized Service sub categories (from the defaults call)
    //===========================================================

    private subCategories:
        CustomizedServiceSubCategoryOption[]
        =
        [];

    // Sub category as saved (edit / view)
    private savedSubCategoryId:
        number =
        0;

    //===========================================================
    // Entity
    //===========================================================

    entity:
        CustomizedService
        =
        this.createEmptyEntity();

    // Typed text for the numbers ("45", "650.00")
    standardMinutesText:
        string =
        '';

    serviceChargeText:
        string =
        '';

    //===========================================================
    // Form State
    //===========================================================

    private originalEntity:
        string =
        '';

    hasChanges:
        boolean =
        false;

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.initializeMode();

        this.loadDefaults();
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
    // Create Empty Entity
    //===========================================================

    private createEmptyEntity():
        CustomizedService
    {
        return {
            CustomizedServiceId:0,
            ServiceCode:'',
            ServiceSubCategoryId:0,
            ServiceName:'',
            StandardMinutes:0,
            ServiceCharge:0,
            IncomeLedgerCode:'',
            IncomeLedgerName:'',
            Remarks:'',
            IsActive:true
        };
    }

    //===========================================================
    // Initialize Mode
    //===========================================================

    private initializeMode():
        void
    {
        const url =
            this.router.url.toLowerCase();

        if
        (
            url.includes('/view/')
        )
        {
            this.mode =
                'view';
        }
        else if
        (
            url.includes('/edit/')
        )
        {
            this.mode =
                'edit';
        }
        else
        {
            this.mode =
                'add';
        }

        const id =
            this.resolveEntityId();

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
    // Initialize Entity (Add mode)
    //===========================================================

    private initializeEntity():
        void
    {
        this.entity =
            this.createEmptyEntity();

        this.syncNumberTexts();

        this.applySubCategory();

        this.setInitialFormState();
    }

    //===========================================================
    // Load Defaults (Customized Service sub categories + next codes)
    //===========================================================

    private loadDefaults():
        void
    {
        this.customizedServicesService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        CustomizedServicesDefaults
                ):
                    void =>
                {
                    this.subCategories =
                        response.SubCategories ?? [];

                    this.buildSubCategoryItems();

                    const touched =
                        this.hasChanges;

                    this.applySubCategory();

                    if
                    (
                        this.isAddMode
                        &&
                        !touched
                    )
                    {
                        this.setInitialFormState();

                        return;
                    }

                    this.checkForChanges();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Customized Services Defaults Error',
                        error
                    );

                    this.subCategoryItems =
                        [];

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load Customized Services sub categories.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Build Sub Category Items
    //
    // Add : usable Customized Service sub categories only.
    // Edit / View : the row's own sub category only (locked).
    //===========================================================

    private buildSubCategoryItems():
        void
    {
        this.subCategoryItems =
            this.subCategories
                .filter(
                    item =>
                        this.isAddMode
                            ? !item.Message
                            : Number(item.ServiceSubCategoryId) ===
                              Number(this.savedSubCategoryId || this.entity.ServiceSubCategoryId)
                )
                .map(
                    item =>
                    ({
                        label:
                            `${item.SubCategoryCode} - ${item.SubCategoryName}`,

                        value:
                            Number(item.ServiceSubCategoryId)
                    })
                );

        if
        (
            this.isAddMode
            &&
            this.subCategories.length > 0
            &&
            this.subCategoryItems.length === 0
        )
        {
            this.toast.info(
                'No Customized Services Sub Category',
                this.subCategories[0].Message
                ||
                'No Customized Services sub category can take new services.'
            );
        }

        this.cdr.detectChanges();
    }

    //===========================================================
    // Selected Sub Category
    //===========================================================

    get selectedSubCategory():
        CustomizedServiceSubCategoryOption | undefined
    {
        return this.subCategories.find(
            item =>
                Number(item.ServiceSubCategoryId) ===
                Number(this.entity.ServiceSubCategoryId)
        );
    }

    //===========================================================
    // Sub Category Change
    //===========================================================

    onSubCategoryChange
    (
        value?:
            any
    ):
        void
    {
        if
        (
            value !== undefined
        )
        {
            this.entity.ServiceSubCategoryId =
                Number(this.unwrapValue(value) ?? 0);
        }

        this.applySubCategory();

        this.checkForChanges();

        this.cdr.detectChanges();
    }

    // A dropdown may emit the value or the whole { label, value } item
    private unwrapValue
    (
        value:
            any
    ):
        any
    {
        return value !== null
            &&
            typeof value === 'object'
            &&
            'value' in value
                ? value.value
                : value;
    }

    //===========================================================
    // Apply Sub Category
    //
    // Add mode : code previews from the selected sub category.
    // Saved codes never change.
    //===========================================================

    private applySubCategory():
        void
    {
        const option =
            this.selectedSubCategory;

        if
        (
            this.isAddMode
        )
        {
            this.entity.ServiceCode =
                option?.NextServiceCode ?? '';

            this.entity.IncomeLedgerCode =
                option?.NextIncomeLedgerCode ?? '';
        }

        this.refreshLedgerName();
    }

    //===========================================================
    // Service Name (typed) : the income ledger has the same name
    //===========================================================

    private refreshLedgerName():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        this.entity.IncomeLedgerName =
            (this.entity.ServiceName ?? '')
                .replace(/\s+/g, ' ')
                .trim();
    }

    onServiceNameChange():
        void
    {
        this.refreshLedgerName();

        this.onValueChange();
    }

    //===========================================================
    // Numbers (typed as text)
    //===========================================================

    private syncNumberTexts():
        void
    {
        this.standardMinutesText =
            this.entity.StandardMinutes > 0
                ? String(this.entity.StandardMinutes)
                : '';

        this.serviceChargeText =
            this.entity.ServiceCharge > 0
                ? Number(this.entity.ServiceCharge).toFixed(2)
                : '';
    }

    onStandardMinutesChange
    (
        value:
            any
    ):
        void
    {
        this.standardMinutesText =
            String(value ?? '');

        const text =
            this.standardMinutesText.trim();

        this.entity.StandardMinutes =
            !text
                ? 0
                : /^\d+$/.test(text)
                    ? Number(text)
                    : -1;

        this.onValueChange();
    }

    onServiceChargeChange
    (
        value:
            any
    ):
        void
    {
        this.serviceChargeText =
            String(value ?? '');

        const text =
            this.serviceChargeText
                .replace(/,/g, '')
                .trim();

        this.entity.ServiceCharge =
            !text
                ? 0
                : /^\d+(\.\d{0,2})?$/.test(text)
                    ? Number(text)
                    : -1;

        this.onValueChange();
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
        this.customizedServicesService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        CustomizedService
                ): void =>
                {
                    this.entity =
                    {
                        CustomizedServiceId:
                            response.CustomizedServiceId,

                        ServiceCode:
                            response.ServiceCode,

                        ServiceSubCategoryId:
                            Number(response.ServiceSubCategoryId ?? 0),

                        ServiceName:
                            response.ServiceName,

                        StandardMinutes:
                            Number(response.StandardMinutes ?? 0),

                        ServiceCharge:
                            Number(response.ServiceCharge ?? 0),

                        IncomeLedgerCode:
                            response.IncomeLedgerCode,

                        IncomeLedgerName:
                            response.IncomeLedgerName,

                        Remarks:
                            response.Remarks,

                        IsActive:
                            response.IsActive
                    };

                    this.savedSubCategoryId =
                        this.entity.ServiceSubCategoryId;

                    this.syncNumberTexts();

                    this.buildSubCategoryItems();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Customized Service Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Customized Service.'
                    );

                    this.hasChanges =
                        false;

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
    // Save
    //===========================================================

    onSave():
        void
    {
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

        const option =
            this.selectedSubCategory;

        const checks:
            {
                failed:
                    boolean;
                message:
                    string;
            }[] =
        [
            {
                failed:
                    !(Number(this.entity.ServiceSubCategoryId) > 0),
                message:
                    'Service Sub Category is required.'
            },
            {
                failed:
                    this.isAddMode
                    &&
                    !!option?.Message,
                message:
                    option?.Message ?? ''
            },
            {
                failed:
                    !this.entity.ServiceName?.trim(),
                message:
                    'Service Name is required.'
            },
            {
                failed:
                    !(this.entity.StandardMinutes >= 1 && this.entity.StandardMinutes <= 1440),
                message:
                    'Standard Time must be a whole number of minutes between 1 and 1440.'
            },
            {
                failed:
                    !(this.entity.ServiceCharge > 0),
                message:
                    'Service Charge must be an amount more than 0 (e.g. 650 or 650.50).'
            },
            {
                failed:
                    !this.entity.ServiceCode?.trim(),
                message:
                    'Service Code could not be prepared. Select the Service Sub Category again.'
            }
        ];

        const failed =
            checks.find(
                check =>
                    check.failed
            );

        if
        (
            failed
        )
        {
            this.toast.error(
                'Validation',
                failed.message
            );

            return;
        }

        if
        (
            this.isAddMode
        )
        {
            this.saveCreate();

            return;
        }

        this.saveUpdate();
    }

    //===========================================================
    // Build Payload
    //===========================================================

    private buildPayload():
        CreateCustomizedService
    {
        return {
            ServiceCode:
                this.entity.ServiceCode.trim(),

            ServiceSubCategoryId:
                Number(this.entity.ServiceSubCategoryId),

            ServiceName:
                this.entity.ServiceName.trim(),

            StandardMinutes:
                this.entity.StandardMinutes,

            ServiceCharge:
                this.entity.ServiceCharge,

            IncomeLedgerCode:
                this.entity.IncomeLedgerCode,

            IncomeLedgerName:
                this.entity.IncomeLedgerName,

            Remarks:
                this.entity.Remarks?.trim()
                ??
                '',

            IsActive:
                this.entity.IsActive
        };
    }

    //===========================================================
    // Create
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateCustomizedService =
            this.buildPayload();

        this.isSaving =
            true;

        this.startProgress(
            'Saving Customized Service',
            'Creating customized service and its income ledger...'
        );

        this.withMinimumDuration(
            this.customizedServicesService.create(
                model
            ),
            this.minimumSaveDurationMs
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Customized Service saved successfully.',
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.originalEntity =
                            JSON.stringify(
                                this.entity
                            );

                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Success',
                            'Customized Service created successfully.'
                        );

                        this.cdr.detectChanges();

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
                    'Create Customized Service Error',
                    error
                );

                this.failProgress(
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to create Customized Service.'
                            )
                        );

                        this.cdr.detectChanges();
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
            UpdateCustomizedService =
        {
            CustomizedServiceId:
                this.entity.CustomizedServiceId,

            ...this.buildPayload()
        };

        this.isSaving =
            true;

        this.startProgress(
            'Updating Customized Service',
            'Updating customized service and its income ledger...'
        );

        this.withMinimumDuration(
            this.customizedServicesService.update(
                model
            ),
            this.minimumSaveDurationMs
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Customized Service updated successfully.',
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.originalEntity =
                            JSON.stringify(
                                this.entity
                            );

                        this.hasChanges =
                            false;

                        this.toast.success(
                            'Success',
                            'Customized Service updated successfully.'
                        );

                        this.cdr.detectChanges();

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
                    'Update Customized Service Error',
                    error
                );

                this.failProgress(
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.toast.error(
                            'Validation',
                            this.extractErrorMessage(
                                error,
                                'Failed to update Customized Service.'
                            )
                        );

                        this.cdr.detectChanges();
                    }
                );
            }
        });
    }

    //===========================================================
    // Progress : Start
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
        this.clearProgressTimer();

        this.progressValue =
            0;

        this.progressDialog.show(
            title,
            message,
            false
        );

        this.progressDialog.update(
            0,
            message
        );

        this.progressTimer =
            setInterval
            (
                ():
                    void =>
                {
                    const step =
                        Math.max(
                            0.4,
                            (
                                this.progressCeiling -
                                this.progressValue
                            )
                            *
                            this.progressEaseFactor
                        );

                    this.progressValue =
                        Math.min(
                            this.progressCeiling,
                            this.progressValue + step
                        );

                    this.progressDialog.update(
                        Math.round(
                            this.progressValue
                        )
                    );
                },
                this.progressIntervalMs
            );

        this.cdr.detectChanges();
    }

    //===========================================================
    // Progress : Complete
    //===========================================================

    private completeProgress
    (
        message:
            string,
        callback:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressValue =
            100;

        this.progressDialog.update(
            100,
            message
        );

        setTimeout
        (
            ():
                void =>
            {
                this.progressDialog.close();

                callback();
            },
            this.progressCompleteHoldMs
        );
    }

    //===========================================================
    // Progress : Fail
    //===========================================================

    private failProgress
    (
        callback:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.close();

        callback();
    }

    //===========================================================
    // Progress : Clear Timer
    //===========================================================

    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer !== null
        )
        {
            clearInterval(
                this.progressTimer
            );

            this.progressTimer =
                null;
        }
    }

    //===========================================================
    // Minimum Duration Wrapper
    //===========================================================

    private withMinimumDuration<T>
    (
        source:
            Observable<T>,
        minimumMs:
            number
    ):
        Observable<T>
    {
        return defer
        (
            ():
                Observable<T> =>
            {
                const startedAt =
                    Date.now();

                const remaining =
                    ():
                        number =>
                        Math.max(
                            0,
                            minimumMs -
                            (
                                Date.now() -
                                startedAt
                            )
                        );

                return source.pipe
                (
                    delayWhen
                    (
                        () =>
                            timer(
                                remaining()
                            )
                    ),

                    catchError
                    (
                        error =>
                            timer(
                                remaining()
                            )
                            .pipe
                            (
                                switchMap
                                (
                                    () =>
                                        throwError(
                                            () => error
                                        )
                                )
                            )
                    )
                );
            }
        );
    }

    //===========================================================
    // Extract Error Message
    //===========================================================

    private extractErrorMessage
    (
        error:
            unknown,
        fallback:
            string
    ):
        string
    {
        if
        (
            error instanceof HttpErrorResponse
        )
        {
            if
            (
                typeof error.error === 'string'
                &&
                error.error.trim()
            )
            {
                return error.error;
            }

            if
            (
                error.error?.message
            )
            {
                return error.error.message;
            }

            if
            (
                error.error?.title
            )
            {
                return error.error.title;
            }
        }

        return fallback;
    }

    //===========================================================
    // Clear
    //===========================================================

    onClear():
        void
    {
        if
        (
            this.isSaving
        )
        {
            return;
        }

        if
        (
            this.isEditMode
        )
        {
            this.loadEntity();

            return;
        }

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
            this.isSaving
        )
        {
            return;
        }

        if
        (
            !this.hasChanges
        )
        {
            void this.router.navigate(
                [
                    'list'
                ],
                {
                    relativeTo:
                        this.route.parent
                }
            );

            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () =>
            {
                void this.router.navigate(
                    [
                        'list'
                    ],
                    {
                        relativeTo:
                            this.route.parent
                    }
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
        return this.isEditMode
            ? 'Update'
            : 'Save';
    }

    //===========================================================
    // Mode Helpers
    //===========================================================

    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }

    get isEditMode():
        boolean
    {
        return this.mode === 'edit';
    }

    get isAddMode():
        boolean
    {
        return this.mode === 'add';
    }

    // Service Sub Category is locked once saved
    get isSubCategoryLocked():
        boolean
    {
        return !this.isAddMode;
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