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
    of,
    timer,
    throwError
}
from 'rxjs';

import
{
    catchError,
    delayWhen,
    map,
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

import
{
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';

import
{
    ImageHubComponent
}
from '../../../../../../shared/components/controls/image-hub/image-hub';

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
    Customer,
    CreateCustomer,
    UpdateCustomer,
    CustomerType,
    CustomerProfilesDefaults,
    CustomerLocationOption
}
from '../../../models/customer-profiles.model';

import
{
    CustomerProfilesService
}
from '../../../services/customer-profiles.service';

//===============================================================
// Date Helpers (plain dates "YYYY-MM-DD", no time zone)
//===============================================================

// "1990-05-17" -> local Date, '' / invalid -> null
function isoToDate
(
    value:
        string
):
    Date | null
{
    const match =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            (value ?? '').trim()
        );

    if
    (
        !match
    )
    {
        return null;
    }

    const date =
        new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3])
        );

    return isNaN(date.getTime())
        ? null
        : date;
}

// local Date from app-datepicker -> "1990-05-17", else ''
function dateToIso
(
    value:
        Date | null | undefined
):
    string
{
    if
    (
        !(value instanceof Date)
        ||
        isNaN(value.getTime())
    )
    {
        return '';
    }

    return [
        value.getFullYear(),
        String(value.getMonth() + 1).padStart(2, '0'),
        String(value.getDate()).padStart(2, '0')
    ].join('-');
}

//===============================================================
// One tab's draft (add mode : Inbound and Outside are separate)
//===============================================================

interface CustomerDraft
{
    entity:
        Customer;

    creditLimitText:
        string;

    dateOfBirthValue:
        Date | null;

    photoFile:
        File | null;

    photoPreview:
        string;

    localPreviewUrl:
        string;

    permanentEdited:
        boolean;

    registrationEdited:
        boolean;
}

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'customer-profiles-form',

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
        DatepickerComponent,
        ImageHubComponent,

        //=======================================================
        // Utilities
        //=======================================================

        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./customer-profiles-form.html',

    styleUrls:
    [
        './customer-profiles-form.css'
    ]
})

//===============================================================
// Customer Profiles Form
//===============================================================

export class CustomerProfilesForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly customerProfilesService =
        inject(CustomerProfilesService);

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
    // Page Header
    //===========================================================

    pageTitle:
        string =
        'Customer Profiles';

    //===========================================================
    // Customer Type Tabs
    //
    // Add  : both tabs; the list opens the form on its tab.
    // Edit : an Outside customer may switch to Inbound
    //        (conversion); an Inbound customer stays Inbound.
    // View : the saved type only.
    //===========================================================

    selectedTab:
        string =
        'inbound';

    // Type as saved (edit / view)
    private savedType:
        CustomerType =
        'Inbound';

    get tabs():
        ControlTab[]
    {
        const inbound:
            ControlTab =
        {
            id:'inbound',
            label:'Inbound Customer'
        };

        const outside:
            ControlTab =
        {
            id:'outside',
            label:'Outside Customer'
        };

        if
        (
            this.isAddMode
        )
        {
            return [inbound, outside];
        }

        if
        (
            this.isEditMode
            &&
            this.savedType === 'Outside'
        )
        {
            return [outside, inbound];
        }

        return this.savedType === 'Outside'
            ? [outside]
            : [inbound];
    }

    get isInbound():
        boolean
    {
        return this.entity.CustomerType === 'Inbound';
    }

    //===========================================================
    // Inbound Form Pages
    //
    // Inbound customers have 8 sections on two pages of 4
    // (Next / Back in the page toolbar). Outside customers keep
    // the single page of 4 sections.
    //===========================================================

    formPage:
        1 | 2 =
        1;

    get showPager():
        boolean
    {
        return this.isInbound;
    }

    nextPage():
        void
    {
        this.formPage =
            2;

        this.cdr.detectChanges();
    }

    previousPage():
        void
    {
        this.formPage =
            1;

        this.cdr.detectChanges();
    }

    // Edit of an Outside customer switched to Inbound
    get isConverting():
        boolean
    {
        return this.isEditMode
            &&
            this.savedType === 'Outside'
            &&
            this.entity.CustomerType === 'Inbound';
    }

    onTabChange
    (
        tabId:
            string
    ):
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        const type:
            CustomerType =
            tabId === 'outside'
                ? 'Outside'
                : 'Inbound';

        if
        (
            this.isEditMode
            &&
            this.savedType === 'Inbound'
            &&
            type === 'Outside'
        )
        {
            this.selectedTab =
                'inbound';

            return;
        }

        //=======================================================
        // Add : Inbound and Outside are two separate drafts.
        // What is typed on one tab never shows on the other;
        // coming back to a tab shows its own draft again.
        //=======================================================

        if
        (
            this.isAddMode
            &&
            type !== this.entity.CustomerType
        )
        {
            this.switchDraft(
                type
            );

            this.selectedTab =
                tabId;

            this.formPage =
                1;

            this.applyCodePreview();

            this.onValueChange();

            return;
        }

        // Edit : Outside -> Inbound is a conversion of the same
        // customer, so its data is kept
        this.selectedTab =
            tabId;

        this.entity.CustomerType =
            type;

        this.formPage =
            1;

        this.applyCodePreview();

        this.onValueChange();
    }

    //===========================================================
    // Separate drafts per Customer Type (add mode)
    //===========================================================

    private drafts:
        Partial<Record<CustomerType, CustomerDraft>> =
        {};

    private switchDraft
    (
        type:
            CustomerType
    ):
        void
    {
        // keep what was typed on the current tab
        this.drafts[this.entity.CustomerType] =
        {
            entity:
                { ...this.entity },

            creditLimitText:
                this.creditLimitText,

            dateOfBirthValue:
                this.dateOfBirthValue,

            photoFile:
                this.photoFile,

            photoPreview:
                this.photoPreview,

            localPreviewUrl:
                this.localPreviewUrl,

            permanentEdited:
                this.permanentEdited,

            registrationEdited:
                this.registrationEdited
        };

        const draft =
            this.drafts[type];

        if
        (
            draft
        )
        {
            this.entity =
                { ...draft.entity };

            this.creditLimitText =
                draft.creditLimitText;

            this.dateOfBirthValue =
                draft.dateOfBirthValue;

            this.photoFile =
                draft.photoFile;

            this.photoPreview =
                draft.photoPreview;

            this.localPreviewUrl =
                draft.localPreviewUrl;

            this.permanentEdited =
                draft.permanentEdited;

            this.registrationEdited =
                draft.registrationEdited;

            return;
        }

        // first visit of this tab : a blank form of that type
        this.entity =
            this.createEmptyEntity(
                type
            );

        this.syncHelpers();

        this.resetAddressFollow();

        // the other draft's photo preview URL stays alive in its
        // draft; this tab starts without a photo
        this.photoFile =
            null;

        this.photoRemoved =
            false;

        this.photoPreview =
            '';

        this.localPreviewUrl =
            '';
    }

    // Drop both drafts (new form, clear, saved)
    private clearDrafts():
        void
    {
        for
        (
            const draft
            of Object.values(this.drafts)
        )
        {
            if
            (
                draft?.localPreviewUrl
                &&
                draft.localPreviewUrl !== this.localPreviewUrl
            )
            {
                URL.revokeObjectURL(
                    draft.localPreviewUrl
                );
            }
        }

        this.drafts =
            {};
    }

    //===========================================================
    // Dropdown Items
    //===========================================================

    locationItems:
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
    // Defaults (next codes, ledger sub group, locations)
    //===========================================================

    private defaults:
        CustomerProfilesDefaults | null =
        null;

    private locations:
        CustomerLocationOption[] =
        [];

    // Saved location (kept in the list even when inactive)
    private savedLocationId:
        number | null =
        null;

    //===========================================================
    // Entity
    //===========================================================

    entity:
        Customer
        =
        this.createEmptyEntity();

    // Typed text of the credit limit ("5000.00")
    creditLimitText:
        string =
        '';

    // Date of Birth for the datepicker
    dateOfBirthValue:
        Date | null =
        null;

    //===========================================================
    // Customer Photo
    //
    // photoFile    : newly picked file, uploaded after save
    // photoRemoved : the saved photo should be deleted on save
    // photoPreview : what the Image Hub shows
    //===========================================================

    private readonly PHOTO_TYPES:
        string[] =
        ['image/jpeg', 'image/png'];

    private readonly PHOTO_MAX_BYTES:
        number =
        2 * 1024 * 1024;

    photoFile:
        File | null =
        null;

    photoRemoved:
        boolean =
        false;

    photoPreview:
        string =
        '';

    private localPreviewUrl:
        string =
        '';

    private photoError:
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

        this.clearDrafts();

        this.releaseLocalPreview();

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
            CustomerType = 'Inbound'
    ):
        Customer
    {
        return {
            CustomerId:0,
            CustomerType:type,
            CustomerCode:'',
            PreviousCode:'',
            CustomerName:'',
            DisplayName:'',
            FatherName:'',
            MotherName:'',
            DateOfBirth:'',
            PhotoPath:'',
            Phone1:'',
            Phone2:'',
            Email:'',
            NidNo:'',
            DrivingLicenseNo:'',
            PresentAddress:'',
            PermanentAddress:'',
            RegistrationAddress:'',
            LocationId:null,
            ReceivableLedgerCode:'',
            ReceivableLedgerName:'',
            CreditLimit:0,
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

    // ?type=Outside from the list's Add (default Inbound)
    private resolveAddType():
        CustomerType
    {
        const type =
            String(
                this.route.snapshot.queryParamMap.get('type')
                ??
                ''
            ).toLowerCase();

        return type === 'outside'
            ? 'Outside'
            : 'Inbound';
    }

    //===========================================================
    // Initialize Entity (Add mode)
    //===========================================================

    // type : the tab to start on (Clear keeps the current tab)
    private initializeEntity
    (
        startType?:
            CustomerType
    ):
        void
    {
        const type =
            startType
            ??
            this.resolveAddType();

        this.clearDrafts();

        this.entity =
            this.createEmptyEntity(
                type
            );

        this.savedType =
            type;

        this.selectedTab =
            type === 'Outside'
                ? 'outside'
                : 'inbound';

        this.savedLocationId =
            null;

        this.formPage =
            1;

        this.syncHelpers();

        this.resetAddressFollow();

        this.applyCodePreview();

        this.resetPhotoState(
            ''
        );

        this.buildLocationItems();

        this.setInitialFormState();
    }

    //===========================================================
    // Load Defaults
    //===========================================================

    private loadDefaults():
        void
    {
        this.customerProfilesService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        CustomerProfilesDefaults
                ):
                    void =>
                {
                    this.defaults =
                        response;

                    this.locations =
                        response.Locations ?? [];

                    this.buildLocationItems();

                    if
                    (
                        response.ReceivableSubGroupMessage
                    )
                    {
                        this.toast.error(
                            'Receivable Sub Group',
                            response.ReceivableSubGroupMessage
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
                        'Load Customer Profiles Defaults Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        this.extractErrorMessage(
                            error,
                            'Failed to load customer defaults.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Code / Ledger Preview
    //
    // Add : next CIB / COS code and next ledger code.
    // Converting (Outside -> Inbound) : the next CIB code; the
    // ledger stays. Otherwise the saved values never change.
    //===========================================================

    private savedCode:
        string =
        '';

    private applyCodePreview():
        void
    {
        if
        (
            this.isAddMode
        )
        {
            this.entity.CustomerCode =
                this.isInbound
                    ? this.defaults?.NextInboundCode ?? ''
                    : this.defaults?.NextOutsideCode ?? '';

            this.entity.ReceivableLedgerCode =
                this.defaults?.NextLedgerCode ?? '';
        }
        else if
        (
            this.isEditMode
        )
        {
            if
            (
                this.isConverting
            )
            {
                this.entity.CustomerCode =
                    this.defaults?.NextInboundCode ?? '';

                this.entity.PreviousCode =
                    this.savedCode;
            }
            else if
            (
                this.savedType === 'Outside'
            )
            {
                this.entity.CustomerCode =
                    this.savedCode;

                this.entity.PreviousCode =
                    '';
            }
        }

        this.refreshDisplayName();
    }

    //===========================================================
    // Locations (active ones; the saved one kept even if inactive)
    //===========================================================

    private buildLocationItems():
        void
    {
        this.locationItems =
            this.locations
                .filter
                (
                    item =>
                        item.IsActive
                        ||
                        Number(item.LocationId) ===
                        Number(this.savedLocationId)
                )
                .map
                (
                    item =>
                    ({
                        label:
                            item.IsActive
                                ? item.DisplayName
                                : `${item.DisplayName} (inactive)`,

                        value:
                            Number(item.LocationId)
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

    onLocationChange
    (
        value?:
            any
    ):
        void
    {
        const id =
            Number(this.unwrapValue(value) ?? 0);

        this.entity.LocationId =
            id > 0
                ? id
                : null;

        this.onValueChange();
    }

    //===========================================================
    // Display Name : "<Customer Name> - <Phone 1>"
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
                this.entity.CustomerName
            );

        this.entity.DisplayName =
            name && this.entity.Phone1
                ? `${name} - ${this.entity.Phone1}`
                : name;

        this.entity.ReceivableLedgerName =
            this.entity.DisplayName;
    }

    //===========================================================
    // CAPITAL LETTERS
    //
    // Customer Name, Father's / Mother's Name and the three
    // addresses are kept in capital letters as they are typed
    // (Inbound and Outside). The Display Name and the ledger name
    // follow the Customer Name.
    //===========================================================

    private toUpper
    (
        value:
            string
    ):
        string
    {
        return (value ?? '').toUpperCase();
    }

    onUpperCaseChange
    (
        field:
            'FatherName' | 'MotherName' | 'PresentAddress' | 'PermanentAddress' | 'RegistrationAddress'
    ):
        void
    {
        const upper =
            this.toUpper(
                this.entity[field]
            );

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
            field === 'PresentAddress'
        )
        {
            this.followPresentAddress();
        }
        else if
        (
            field === 'PermanentAddress'
            ||
            field === 'RegistrationAddress'
        )
        {
            this.markAddressEdited(
                field
            );
        }

        this.onValueChange();
    }

    //===========================================================
    // Address Follow
    //
    // Typing the Present Address fills the Permanent and the
    // Registration Address with the same text. Both stay
    // editable : once the user types something different in one,
    // that one stops following. Clearing it, or making it equal
    // to the Present Address again, makes it follow again.
    //===========================================================

    private permanentEdited:
        boolean =
        false;

    private registrationEdited:
        boolean =
        false;

    private followPresentAddress():
        void
    {
        const present =
            this.entity.PresentAddress ?? '';

        if
        (
            !this.permanentEdited
        )
        {
            this.entity.PermanentAddress =
                present;
        }

        if
        (
            !this.registrationEdited
        )
        {
            this.entity.RegistrationAddress =
                present;
        }
    }

    private markAddressEdited
    (
        field:
            'PermanentAddress' | 'RegistrationAddress'
    ):
        void
    {
        const value =
            this.entity[field] ?? '';

        const edited =
            value.trim() !== ''
            &&
            value !== (this.entity.PresentAddress ?? '');

        if
        (
            field === 'PermanentAddress'
        )
        {
            this.permanentEdited =
                edited;
        }
        else
        {
            this.registrationEdited =
                edited;
        }
    }

    // New customer : both follow. Saved customer : an address that
    // differs from the Present Address is kept as the user's own.
    private resetAddressFollow():
        void
    {
        const present =
            this.entity.PresentAddress ?? '';

        this.permanentEdited =
            !!this.entity.PermanentAddress
            &&
            this.entity.PermanentAddress !== present;

        this.registrationEdited =
            !!this.entity.RegistrationAddress
            &&
            this.entity.RegistrationAddress !== present;
    }

    onCustomerNameChange():
        void
    {
        const upper =
            this.toUpper(
                this.entity.CustomerName
            );

        if
        (
            upper !==
            this.entity.CustomerName
        )
        {
            this.cdr.detectChanges();

            this.entity.CustomerName =
                upper;
        }

        this.refreshDisplayName();

        this.onValueChange();
    }

    //===========================================================
    // Digits-only inputs (phones, NID)
    //
    // Anything that is not a digit is dropped as it is typed, and
    // the length is capped.
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

    onPhone1Change
    (
        value:
            any
    ):
        void
    {
        this.entity.Phone1 =
            String(value ?? '');

        this.cdr.detectChanges();

        // set again so the box drops what was refused
        this.entity.Phone1 =
            this.digitsOnly(value, 11);

        this.refreshDisplayName();

        this.onValueChange();
    }

    onPhone2Change
    (
        value:
            any
    ):
        void
    {
        this.entity.Phone2 =
            String(value ?? '');

        this.cdr.detectChanges();

        this.entity.Phone2 =
            this.digitsOnly(value, 11);

        this.onValueChange();
    }

    onNidChange
    (
        value:
            any
    ):
        void
    {
        this.entity.NidNo =
            String(value ?? '');

        this.cdr.detectChanges();

        this.entity.NidNo =
            this.digitsOnly(value, 17);

        this.onValueChange();
    }

    //===========================================================
    // Phone Warnings ('' when fine)
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

    // Shown under the box once something is typed
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

    get nidWarning():
        string
    {
        const nid =
            this.entity.NidNo ?? '';

        return nid
            &&
            ![10, 13, 17].includes(nid.length)
                ? `NID No must be 10, 13 or 17 digits (${nid.length} entered).`
                : '';
    }

    //===========================================================
    // Credit Limit (typed as text) / Date of Birth
    //===========================================================

    private syncHelpers():
        void
    {
        // Always shown, 0.00 by default (0 = cash only)
        this.creditLimitText =
            Number(this.entity.CreditLimit ?? 0).toFixed(2);

        this.dateOfBirthValue =
            isoToDate(
                this.entity.DateOfBirth
            );
    }

    onCreditLimitChange
    (
        value:
            any
    ):
        void
    {
        this.creditLimitText =
            String(value ?? '');

        const text =
            this.creditLimitText
                .replace(/,/g, '')
                .trim();

        // Required : empty is invalid (-1), 0 = cash only
        this.entity.CreditLimit =
            /^\d+(\.\d{0,2})?$/.test(text)
                ? Number(text)
                : -1;

        this.onValueChange();
    }

    onDateOfBirthChange
    (
        value:
            Date | null
    ):
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        this.entity.DateOfBirth =
            dateToIso(
                value
            );

        this.onValueChange();
    }

    //===========================================================
    // Customer Photo : Picked / Removed (Image Hub)
    //===========================================================

    onPhotoChange
    (
        file:
            File | null
    ):
        void
    {
        if
        (
            this.isViewMode
        )
        {
            return;
        }

        if
        (
            !file
        )
        {
            this.releaseLocalPreview();

            this.photoFile =
                null;

            // Only a saved photo needs deleting on the server
            this.photoRemoved =
                !!this.entity.PhotoPath;

            this.photoPreview =
                '';

            this.onValueChange();

            return;
        }

        if
        (
            !this.PHOTO_TYPES.includes(
                file.type
            )
        )
        {
            this.toast.error(
                'Validation',
                'Customer Photo must be a JPG or PNG file.'
            );

            this.cdr.detectChanges();

            return;
        }

        if
        (
            file.size >
            this.PHOTO_MAX_BYTES
        )
        {
            this.toast.error(
                'Validation',
                'Customer Photo cannot be larger than 2 MB.'
            );

            this.cdr.detectChanges();

            return;
        }

        this.releaseLocalPreview();

        this.localPreviewUrl =
            URL.createObjectURL(
                file
            );

        this.photoFile =
            file;

        this.photoRemoved =
            false;

        this.photoPreview =
            this.localPreviewUrl;

        this.onValueChange();
    }

    private resetPhotoState
    (
        savedPath:
            string
    ):
        void
    {
        this.releaseLocalPreview();

        this.photoFile =
            null;

        this.photoRemoved =
            false;

        this.photoPreview =
            this.customerProfilesService.getImageUrl(
                savedPath
            );
    }

    private releaseLocalPreview():
        void
    {
        if
        (
            this.localPreviewUrl
        )
        {
            URL.revokeObjectURL(
                this.localPreviewUrl
            );

            this.localPreviewUrl =
                '';
        }
    }

    //===========================================================
    // Customer Photo : Save After The Customer Is Saved
    //
    // New file -> upload. Removed -> delete. Otherwise nothing.
    // Emits false when the photo step failed; the customer itself
    // is already saved, so that never fails the save.
    //===========================================================

    private savePhoto
    (
        customerId:
            number
    ):
        Observable<boolean>
    {
        let step:
            Observable<unknown> =
            of(undefined);

        if
        (
            this.photoFile
            &&
            customerId > 0
        )
        {
            step =
                this.customerProfilesService.uploadPhoto(
                    customerId,
                    this.photoFile
                );
        }
        else if
        (
            this.photoRemoved
            &&
            customerId > 0
        )
        {
            step =
                this.customerProfilesService.deletePhoto(
                    customerId
                );
        }

        return step.pipe(
            map(
                (): boolean =>
                    true
            ),

            catchError(
                error =>
                {
                    console.error(
                        'Customer Photo Error',
                        error
                    );

                    this.photoError =
                        this.extractErrorMessage(
                            error,
                            'The photo could not be saved.'
                        );

                    return of(
                        false
                    );
                }
            )
        );
    }

    private notifySaved
    (
        verb:
            string,
        photoSaved:
            boolean
    ):
        void
    {
        if
        (
            photoSaved
        )
        {
            this.toast.success(
                'Success',
                `Customer ${verb} successfully.`
            );

            return;
        }

        this.toast.error(
            'Customer Photo Not Saved',
            `The customer was ${verb}, but the photo could not be saved. ${this.photoError}`
        );
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
        this.customerProfilesService
            .getById(
                this.entityId
            )
            .subscribe
            ({
                next:
                (
                    response:
                        Customer
                ): void =>
                {
                    const { LocationName, ...customer } =
                        response;

                    this.entity =
                        customer;

                    this.savedType =
                        this.entity.CustomerType;

                    this.savedCode =
                        this.entity.CustomerCode;

                    this.selectedTab =
                        this.savedType === 'Outside'
                            ? 'outside'
                            : 'inbound';

                    this.savedLocationId =
                        this.entity.LocationId;

                    this.formPage =
                        1;

                    this.syncHelpers();

                    this.resetAddressFollow();

                    this.resetPhotoState(
                        this.entity.PhotoPath
                    );

                    this.buildLocationItems();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error(
                        'Load Customer Error',
                        error
                    );

                    this.toast.error(
                        'Error',
                        'Failed to load Customer.'
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
            this.originalEntity
            ||
            this.photoFile !== null
            ||
            this.photoRemoved;
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

        const inbound =
            this.isInbound;

        // page : where the field is on the Inbound form (1 or 2)
        const checks:
            {
                failed:
                    boolean;
                message:
                    string;
                page?:
                    1 | 2;
            }[] =
        [
            {
                failed:
                    !this.cleanText(this.entity.CustomerName),
                message:
                    'Customer Name is required.'
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
                    inbound
                    &&
                    !this.entity.NidNo,
                message:
                    'NID No is required for Inbound customers.',
                page:
                    2
            },
            {
                failed:
                    inbound
                    &&
                    !!this.nidWarning,
                message:
                    this.nidWarning,
                page:
                    2
            },
            {
                failed:
                    inbound
                    &&
                    !this.cleanText(this.entity.PresentAddress),
                message:
                    'Present Address is required for Inbound customers.',
                page:
                    2
            },
            {
                failed:
                    !this.creditLimitText.trim(),
                message:
                    'Credit Limit is required (0 = cash only).',
                page:
                    2
            },
            {
                failed:
                    this.entity.CreditLimit < 0,
                message:
                    'Credit Limit must be an amount of 0 or more (e.g. 0, 5000 or 5000.50).',
                page:
                    2
            },
            {
                failed:
                    !!this.defaults?.ReceivableSubGroupMessage,
                message:
                    this.defaults?.ReceivableSubGroupMessage ?? ''
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
            // Show the page that holds the field (Inbound)
            if
            (
                inbound
            )
            {
                this.formPage =
                    failed.page ?? 1;

                this.cdr.detectChanges();
            }

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

        if
        (
            this.isConverting
        )
        {
            this.confirmDialog.open(
                'Convert to Inbound Customer',
                `${this.cleanText(this.entity.CustomerName)} will become an Inbound customer with a new CIB code. ` +
                `The old code ${this.savedCode} is kept as Previous Code and the ledger stays the same. Continue?`,
                () =>
                {
                    setTimeout(
                        () =>
                            this.saveUpdate()
                    );
                },
                'Convert',
                'Cancel',
                'primary'
            );

            return;
        }

        this.saveUpdate();
    }

    //===========================================================
    // Build Payload
    //===========================================================

    private buildPayload():
        CreateCustomer
    {
        const inbound =
            this.isInbound;

        return {
            CustomerType:
                this.entity.CustomerType,

            CustomerCode:
                this.entity.CustomerCode,

            PreviousCode:
                this.entity.PreviousCode,

            CustomerName:
                this.cleanText(this.entity.CustomerName),

            DisplayName:
                this.entity.DisplayName,

            FatherName:
                inbound ? this.cleanText(this.entity.FatherName) : '',

            MotherName:
                inbound ? this.cleanText(this.entity.MotherName) : '',

            DateOfBirth:
                inbound ? this.entity.DateOfBirth : '',

            PhotoPath:
                this.entity.PhotoPath,

            Phone1:
                this.entity.Phone1,

            Phone2:
                this.entity.Phone2,

            Email:
                this.entity.Email?.trim() ?? '',

            NidNo:
                inbound ? this.entity.NidNo : '',

            DrivingLicenseNo:
                inbound ? this.cleanText(this.entity.DrivingLicenseNo) : '',

            PresentAddress:
                this.entity.PresentAddress?.trim() ?? '',

            PermanentAddress:
                inbound ? this.entity.PermanentAddress?.trim() ?? '' : '',

            RegistrationAddress:
                inbound ? this.entity.RegistrationAddress?.trim() ?? '' : '',

            LocationId:
                this.entity.LocationId,

            ReceivableLedgerCode:
                this.entity.ReceivableLedgerCode,

            ReceivableLedgerName:
                this.entity.ReceivableLedgerName,

            CreditLimit:
                this.entity.CreditLimit,

            Remarks:
                this.entity.Remarks?.trim() ?? '',

            IsActive:
                this.entity.IsActive
        };
    }

    //===========================================================
    // Create (then upload the photo to the new customer)
    //===========================================================

    private saveCreate():
        void
    {
        const model:
            CreateCustomer =
            this.buildPayload();

        this.isSaving =
            true;

        this.startProgress(
            'Saving Customer',
            'Creating the customer and its receivable ledger...'
        );

        this.withMinimumDuration(
            this.customerProfilesService
                .create(
                    model
                )
                .pipe(
                    switchMap(
                        (id: number) =>
                            this.savePhoto(
                                Number(id)
                            )
                    )
                ),
            this.minimumSaveDurationMs
        )
        .subscribe
        ({
            next:
            (
                photoSaved:
                    boolean
            ):
                void =>
            {
                this.completeProgress(
                    'Customer saved successfully.',
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.resetPhotoState(
                            ''
                        );

                        this.setInitialFormState();

                        this.notifySaved(
                            'created',
                            photoSaved
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
                    'Create Customer Error',
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
                                'Failed to create Customer.'
                            )
                        );

                        this.cdr.detectChanges();
                    }
                );
            }
        });
    }

    //===========================================================
    // Update (then upload / delete the photo)
    //===========================================================

    private saveUpdate():
        void
    {
        const converting =
            this.isConverting;

        const model:
            UpdateCustomer =
        {
            CustomerId:
                this.entity.CustomerId,

            ...this.buildPayload()
        };

        this.isSaving =
            true;

        this.startProgress(
            converting
                ? 'Converting Customer'
                : 'Updating Customer',
            converting
                ? 'Converting the customer to Inbound...'
                : 'Updating the customer and its receivable ledger...'
        );

        this.withMinimumDuration(
            this.customerProfilesService
                .update(
                    model
                )
                .pipe(
                    switchMap(
                        () =>
                            this.savePhoto(
                                this.entity.CustomerId
                            )
                    )
                ),
            this.minimumSaveDurationMs
        )
        .subscribe
        ({
            next:
            (
                photoSaved:
                    boolean
            ):
                void =>
            {
                this.completeProgress(
                    'Customer updated successfully.',
                    ():
                        void =>
                    {
                        this.isSaving =
                            false;

                        this.resetPhotoState(
                            ''
                        );

                        this.setInitialFormState();

                        this.notifySaved(
                            converting
                                ? 'converted to Inbound'
                                : 'updated',
                            photoSaved
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
                    'Update Customer Error',
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
                                'Failed to update Customer.'
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

        // Clear : a blank form on the current tab; both drafts go
        this.initializeEntity(
            this.entity.CustomerType
        );

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