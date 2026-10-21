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
    Supplier,
    CreateSupplier,
    UpdateSupplier,
    SupplierProfilesDefaults,
    SupplierBrandOption
}
from '../../../models/supplier-profiles.model';

import
{
    SupplierProfilesService
}
from '../../../services/supplier-profiles.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'supplier-profiles-form',

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

    templateUrl:'./supplier-profiles-form.html',

    styleUrls:
    [
        './supplier-profiles-form.css'
    ]
})

//===============================================================
// Supplier Profiles Form
//===============================================================

export class SupplierProfilesForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly supplierProfilesService =
        inject(SupplierProfilesService);

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
        2000;

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
    // Page Header / Tabs
    //===========================================================

    pageTitle:
        string =
        'Supplier Profiles';

    entityName:
        string =
        'Supplier';

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

    supplierTypeItems:
        any[]
        =
        [];

    brandItems:
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
    // Defaults (next codes, ledger sub group, types, brands)
    //===========================================================

    private defaults:
        SupplierProfilesDefaults | null =
        null;

    private brands:
        SupplierBrandOption[] =
        [];

    // Saved brand (kept in the list even when inactive)
    private savedBrandId:
        number | null =
        null;

    //===========================================================
    // Entity
    //===========================================================

    entity:
        Supplier
        =
        this.createEmptyEntity();

    // Typed text of the credit days ("0")
    creditDaysText:
        string =
        '0';

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

    private createEmptyEntity
    (
        type:
            string = ''
    ):
        Supplier
    {
        return {
            SupplierId:0,
            SupplierCode:'',
            SupplierType:type,
            SupplierName:'',
            DisplayName:'',
            BrandManagementId:null,
            ContactPerson:'',
            Phone1:'',
            Phone2:'',
            Email:'',
            Address:'',
            TradeLicenseNo:'',
            BinNo:'',
            TinNo:'',
            PayableLedgerCode:'',
            PayableLedgerName:'',
            CreditDays:0,
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
    //
    // ?type=Local Vendor from a type tab of the list
    //===========================================================

    private initializeEntity():
        void
    {
        const type =
            String(
                this.route.snapshot.queryParamMap.get('type')
                ??
                ''
            );

        this.entity =
            this.createEmptyEntity(
                type
            );

        this.savedBrandId =
            null;

        this.creditDaysText =
            '0';

        this.applyCodePreview();

        this.buildBrandItems();

        this.setInitialFormState();
    }

    //===========================================================
    // Load Defaults
    //===========================================================

    private loadDefaults():
        void
    {
        this.supplierProfilesService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        SupplierProfilesDefaults
                ):
                    void =>
                {
                    this.defaults =
                        response;

                    this.brands =
                        response.Brands ?? [];

                    this.supplierTypeItems =
                        (response.SupplierTypes ?? []).map(
                            type =>
                            ({
                                label:
                                    type,

                                value:
                                    type
                            })
                        );

                    this.buildBrandItems();

                    if
                    (
                        response.PayableSubGroupMessage
                    )
                    {
                        this.toast.error(
                            'Payable Sub Group',
                            response.PayableSubGroupMessage
                        );
                    }

                    const touched =
                        this.hasChanges;

                    this.applyCodePreview();

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
                        'Load Supplier Profiles Defaults Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load supplier defaults.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    // Add : next code and ledger code (saved values never change)
    private applyCodePreview():
        void
    {
        if
        (
            this.isAddMode
        )
        {
            this.entity.SupplierCode =
                this.defaults?.NextSupplierCode ?? '';

            this.entity.PayableLedgerCode =
                this.defaults?.NextLedgerCode ?? '';
        }

        this.refreshDisplayName();
    }

    //===========================================================
    // Brands (active ones; the saved one kept even if inactive)
    //===========================================================

    private buildBrandItems():
        void
    {
        this.brandItems =
            this.brands
                .filter
                (
                    item =>
                        item.IsActive
                        ||
                        Number(item.BrandManagementId) ===
                        Number(this.savedBrandId)
                )
                .map
                (
                    item =>
                    ({
                        label:
                            item.IsActive
                                ? item.BrandName
                                : `${item.BrandName} (inactive)`,

                        value:
                            Number(item.BrandManagementId)
                    })
                );

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

    onSupplierTypeChange
    (
        value?:
            any
    ):
        void
    {
        this.entity.SupplierType =
            String(this.unwrapValue(value) ?? '');

        this.onValueChange();
    }

    onBrandChange
    (
        value?:
            any
    ):
        void
    {
        const id =
            Number(this.unwrapValue(value) ?? 0);

        this.entity.BrandManagementId =
            id > 0
                ? id
                : null;

        this.refreshDisplayName();

        this.onValueChange();
    }

    //===========================================================
    // Display Name : "<SUPPLIER NAME> - <BRAND> - <PHONE 1>"
    // (brand part only when a brand is selected)
    //===========================================================

    private cleanText
    (
        value:
            string
    ):
        string
    {
        return (value ?? '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private get selectedBrandName():
        string
    {
        return this.brands.find(
            item =>
                Number(item.BrandManagementId) ===
                Number(this.entity.BrandManagementId)
        )?.BrandName ?? '';
    }

    private refreshDisplayName():
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        const name =
            this.cleanText(
                this.entity.SupplierName
            );

        const brand =
            this.cleanText(
                this.selectedBrandName
            ).toUpperCase();

        this.entity.DisplayName =
            !name
                ? ''
                : [name, brand, this.entity.Phone1]
                    .filter(part => !!part)
                    .join(' - ');

        this.entity.PayableLedgerName =
            this.entity.DisplayName;
    }

    //===========================================================
    // CAPITAL LETTERS (Supplier Name, Contact Person, Address,
    // Trade License No) as they are typed
    //===========================================================

    onUpperCaseChange
    (
        field:
            'SupplierName' | 'ContactPerson' | 'Address' | 'TradeLicenseNo'
    ):
        void
    {
        const upper =
            (this.entity[field] ?? '').toUpperCase();

        if
        (
            upper !==
            this.entity[field]
        )
        {
            this.cdr.detectChanges();

            this.entity[field] =
                upper;
        }

        if
        (
            field === 'SupplierName'
        )
        {
            this.refreshDisplayName();
        }

        this.onValueChange();
    }

    //===========================================================
    // Digits-only inputs (phones, BIN, TIN, credit days)
    //===========================================================

    private digitsOnly
    (
        value:
            any,
        maxLength:
            number
    ):
        string
    {
        return String(value ?? '')
            .replace(/[^0-9]/g, '')
            .slice(0, maxLength);
    }

    onDigitsChange
    (
        field:
            'Phone1' | 'Phone2' | 'BinNo' | 'TinNo',
        value:
            any
    ):
        void
    {
        const max =
            field === 'BinNo'
                ? 13
                : field === 'TinNo'
                    ? 12
                    : 11;

        this.entity[field] =
            String(value ?? '');

        this.cdr.detectChanges();

        // set again so the box drops what was refused
        this.entity[field] =
            this.digitsOnly(value, max);

        if
        (
            field === 'Phone1'
        )
        {
            this.refreshDisplayName();
        }

        this.onValueChange();
    }

    onCreditDaysChange
    (
        value:
            any
    ):
        void
    {
        this.creditDaysText =
            String(value ?? '');

        this.cdr.detectChanges();

        this.creditDaysText =
            this.digitsOnly(value, 3);

        this.entity.CreditDays =
            this.creditDaysText
                ? Number(this.creditDaysText)
                : -1;

        this.onValueChange();
    }

    //===========================================================
    // Warnings ('' when fine)
    //===========================================================

    private phoneProblem
    (
        phone:
            string,
        label:
            string,
        required:
            boolean
    ):
        string
    {
        const value =
            phone ?? '';

        if
        (
            !value
        )
        {
            return required
                ? `${label} is required.`
                : '';
        }

        if
        (
            value.length < 11
        )
        {
            return `${label} must be 11 digits (${value.length} entered).`;
        }

        if
        (
            !value.startsWith('01')
        )
        {
            return `${label} must start with 01 (e.g. 01711223344).`;
        }

        return '';
    }

    get phone1Warning():
        string
    {
        return this.entity.Phone1
            ? this.phoneProblem(this.entity.Phone1, 'Phone 1', true)
            : '';
    }

    get phone2Warning():
        string
    {
        return this.phoneProblem(this.entity.Phone2, 'Phone 2', false);
    }

    get binWarning():
        string
    {
        const bin =
            this.entity.BinNo ?? '';

        return bin
            &&
            (bin.length < 9 || bin.length > 13)
                ? `BIN must be 9 to 13 digits (${bin.length} entered).`
                : '';
    }

    get tinWarning():
        string
    {
        const tin =
            this.entity.TinNo ?? '';

        return tin
            &&
            tin.length !== 12
                ? `TIN must be 12 digits (${tin.length} entered).`
                : '';
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
        this.supplierProfilesService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        Supplier
                ): void =>
                {
                    const { BrandName, ...supplier } =
                        response;

                    this.entity =
                        supplier;

                    this.savedBrandId =
                        this.entity.BrandManagementId;

                    this.creditDaysText =
                        String(this.entity.CreditDays ?? 0);

                    this.buildBrandItems();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Supplier Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Supplier.'
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
        // Validation (the server checks the same again)
        //=======================================================

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
                    !this.entity.SupplierType,
                message:
                    'Supplier Type is required.'
            },
            {
                failed:
                    !this.cleanText(this.entity.SupplierName),
                message:
                    'Supplier Name is required.'
            },
            {
                failed:
                    !!this.phoneProblem(this.entity.Phone1, 'Phone 1', true),
                message:
                    this.phoneProblem(this.entity.Phone1, 'Phone 1', true)
            },
            {
                failed:
                    !!this.phone2Warning,
                message:
                    this.phone2Warning
            },
            {
                failed:
                    !!this.entity.Phone2
                    &&
                    this.entity.Phone2 === this.entity.Phone1,
                message:
                    'Phone 2 cannot be the same as Phone 1.'
            },
            {
                failed:
                    !!this.entity.Email?.trim()
                    &&
                    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.entity.Email.trim()),
                message:
                    'Email is not valid.'
            },
            {
                failed:
                    !this.cleanText(this.entity.Address),
                message:
                    'Address is required.'
            },
            {
                failed:
                    !!this.binWarning,
                message:
                    this.binWarning
            },
            {
                failed:
                    !!this.tinWarning,
                message:
                    this.tinWarning
            },
            {
                failed:
                    !this.creditDaysText,
                message:
                    'Credit Days is required (0 = pay on purchase).'
            },
            {
                failed:
                    this.entity.CreditDays < 0
                    ||
                    this.entity.CreditDays > 365,
                message:
                    'Credit Days must be between 0 and 365.'
            },
            {
                failed:
                    !!this.defaults?.PayableSubGroupMessage,
                message:
                    this.defaults?.PayableSubGroupMessage ?? ''
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
        CreateSupplier
    {
        return {
            SupplierCode:
                this.entity.SupplierCode,

            SupplierType:
                this.entity.SupplierType,

            SupplierName:
                this.cleanText(this.entity.SupplierName),

            DisplayName:
                this.entity.DisplayName,

            BrandManagementId:
                this.entity.BrandManagementId,

            ContactPerson:
                this.cleanText(this.entity.ContactPerson),

            Phone1:
                this.entity.Phone1,

            Phone2:
                this.entity.Phone2,

            Email:
                this.entity.Email?.trim() ?? '',

            Address:
                this.entity.Address?.trim() ?? '',

            TradeLicenseNo:
                this.cleanText(this.entity.TradeLicenseNo),

            BinNo:
                this.entity.BinNo,

            TinNo:
                this.entity.TinNo,

            PayableLedgerCode:
                this.entity.PayableLedgerCode,

            PayableLedgerName:
                this.entity.PayableLedgerName,

            CreditDays:
                this.entity.CreditDays,

            Remarks:
                this.entity.Remarks?.trim() ?? '',

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
            CreateSupplier =
            this.buildPayload();

        this.isSaving =
            true;

        this.startProgress(
            'Saving Supplier',
            'Creating the supplier and its payable ledger...'
        );

        this.withMinimumDuration(
            this.supplierProfilesService.create(
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
                    'Supplier saved successfully.',
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'Supplier created successfully.'
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
                    'Create Supplier Error',
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
                                'Failed to create Supplier.'
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
            UpdateSupplier =
        {
            SupplierId:
                this.entity.SupplierId,

            ...this.buildPayload()
        };

        this.isSaving =
            true;

        this.startProgress(
            'Updating Supplier',
            'Updating the supplier and its payable ledger...'
        );

        this.withMinimumDuration(
            this.supplierProfilesService.update(
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
                    'Supplier updated successfully.',
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.setInitialFormState();

                        this.toast.success(
                            'Success',
                            'Supplier updated successfully.'
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
                    'Update Supplier Error',
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
                                'Failed to update Supplier.'
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