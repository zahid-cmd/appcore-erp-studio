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
    MotorBikeSpecifications,
    MotorBikeSpecificationItem,
    MotorBikeSpecificationsDefaults,
    MotorBikeSpecificationModelOption,
    CreateMotorBikeSpecifications,
    UpdateMotorBikeSpecifications,
    FUEL_ELECTRIC
}
from '../../../models/motor-bike-specifications.model';
import
{
    MotorBikeSpecificationsService
}
from '../../../services/motor-bike-specifications.service';


//===============================================================
// Fixed fallbacks (the server sends the same lists in Defaults)
//===============================================================

const FALLBACK_SECTIONS:
    string[] =
[
    'Engine / Motor',
    'Transmission',
    'Chassis & Suspension',
    'Brakes & Wheels',
    'Dimensions & Capacity',
    'Electricals',
    'Features'
];

const FALLBACK_FUELS:
    string[] =
    ['Petrol', 'Octane', 'Electric', 'Hybrid', 'Diesel', 'CNG'];

const BODY_TYPES:
    string[] =
    ['MOTOR CYCLE (LARGE)', 'MOTOR CYCLE (MEDIUM)', 'MOTOR CYCLE (SMALL)'];

const FALLBACK_CLASSES:
    string[] =
    ['MOTOR CYCLE', 'SCOOTER', 'MOPED'];


// The number boxes are edited as text
type NumberField =
    'cc' | 'watts' | 'cylinders' | 'seats' | 'unladen' | 'laden'
    | 'rpm' | 'wheelbase' | 'length' | 'width' | 'height' | 'tyres' | 'axles';

type NumberTexts =
    Record<NumberField, string>;


// 149.5 -> '149.5' ; 0 -> ''
function numberText
(
    value:
        number,
    keepZero:
        boolean = false
):
    string
{
    const n =
        Number(value || 0);

    return n === 0 && !keepZero
        ? ''
        : String(n);
}


function toNumber
(
    value:
        string
):
    number
{
    const n =
        Number(String(value ?? '').replace(/,/g, '').trim());

    return Number.isFinite(n)
        ? n
        : 0;
}


//===============================================================
// Component
//===============================================================
@Component(
{
    selector:'motor-bike-specifications-form',
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
    templateUrl:'./motor-bike-specifications-form.html',
    styleUrls:
    [
        './motor-bike-specifications-form.css'
    ]
})


//===============================================================
// Motor Bike Specifications Form
//
// Tab 1 : Specification, two pages (Next / Back on the toolbar)
//         page 1 : Bike Model, Engine / Motor, Body & Maker,
//                  Website & Remarks
//         page 2 : Size & Tyres (weights, dimensions, tyres, axles)
// Tab 2 : Technical Specifications (sections › label / value).
// Tab 1 holds what BRTA Form-17 asks for the model.
//===============================================================

export class MotorBikeSpecificationsForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly specificationsService =
        inject(MotorBikeSpecificationsService);

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
        string =
        '';

    pageTitle:
        string =
        'Motor Bike Specifications';

    entityName:
        string =
        'Specification';

    selectedTab:
        string =
        'general';

    // Specification tab : page 1 (registration data) / 2 (size & tyres)
    formPage:
        1 | 2 =
        1;

    get showPager():
        boolean
    {
        return this.selectedTab === 'general';
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

    get tabs():
        ControlTab[]
    {
        return [
            {
                id:'general',
                label:this.tabTitle
            },
            {
                id:'technical',
                label:'Technical Specifications'
            }
        ];
    }

    get tabTitle():
        string
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
    // Fixed Lists
    //===========================================================

    statusItems:
        any[] =
    [
        { label:'Active', value:true },
        { label:'Inactive', value:false }
    ];

    websiteItems:
        any[] =
    [
        { label:'Yes : show on the website', value:true },
        { label:'No : hidden', value:false }
    ];


    //===========================================================
    // Lookups (from Defaults)
    //===========================================================

    private defaults:
        MotorBikeSpecificationsDefaults | null =
        null;

    sections:
        string[] =
        FALLBACK_SECTIONS;

    fuelItems:
        any[] =
        FALLBACK_FUELS.map(x => ({ label:x, value:x }));

    vehicleClassItems:
        any[] =
        FALLBACK_CLASSES.map(x => ({ label:x, value:x }));

    // BRTA "Type of body" wording (owner 2026-11-07 19:28)
    bodyTypeItems:
        any[] =
        BODY_TYPES.map(x => ({ label:x, value:x }));


    brandItems:
        any[] =
        [];

    // Narrows the model picker (not saved)
    brandFilterId:
        number | null =
        null;

    // Models without a live specification (+ this one's own)
    modelItems:
        any[] =
        [];

    // Models that have a specification (not this one)
    copyItems:
        any[] =
        [];

    // Changing the key re-creates a picker
    modelPickerKeys:
        number[] =
        [0];

    copyPickerKeys:
        number[] =
        [0];


    //===========================================================
    // Entity
    //===========================================================

    entity:
        MotorBikeSpecifications =
        this.emptyEntity();

    numbers:
        NumberTexts =
        this.emptyNumbers();

    selectedSection:
        string =
        FALLBACK_SECTIONS[0];


    //===========================================================
    // Form State
    //===========================================================

    private originalEntity:
        string =
        '';

    hasChanges:
        boolean =
        false;

    isSaving:
        boolean =
        false;


    //===========================================================
    // Progress Dialog Settings
    //===========================================================

    private readonly MIN_PROGRESS_MS:
        number =
        3000;

    private readonly PROGRESS_TICK_MS:
        number =
        100;

    private readonly PROGRESS_CEILING:
        number =
        90;

    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;

    private progressTimer?:
        number;

    private progressValue:
        number =
        0;


    //===========================================================
    // Initialize / Destroy
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/')
                ? 'view'
                : url.includes('/edit/')
                    ? 'edit'
                    : 'add';

        const id =
            this.resolveEntityId();

        if (id)
        {
            this.entityId =
                id;

            this.loadDefaults();

            this.loadEntity();

            return;
        }

        this.initializeEntity();
    }


    ngOnDestroy():
        void
    {
        this.clearProgressTimer();

        if (this.isSaving)
        {
            this.progressDialog.close();
        }
    }


    private resolveEntityId():
        string
    {
        let currentRoute:
            ActivatedRoute | null =
            this.route;

        while (currentRoute)
        {
            const id =
                (currentRoute.snapshot.paramMap.get('id') ?? '').trim();

            if (id)
            {
                return id;
            }

            currentRoute =
                currentRoute.parent;
        }

        return '';
    }


    private emptyEntity():
        MotorBikeSpecifications
    {
        return {
            MotorBikeSpecificationId:0,
            SpecificationCode:'',
            BikeModelId:null,
            ModelCode:'',
            ModelName:'',
            BrandManagementId:0,
            BrandName:'',
            EngineCc:0,
            MotorPowerWatts:0,
            FuelType:FUEL_ELECTRIC,
            Cylinders:1,
            VehicleClass:'MOTOR CYCLE',
            BodyType:'',
            SeatingCapacity:2,
            UnladenWeightKg:0,
            LadenWeightKg:0,
            Maker:'',
            CountryOfOrigin:'',
            HorsePower:'',
            Rpm:0,
            WheelBaseMm:0,
            LengthMm:0,
            WidthMm:0,
            HeightMm:0,
            TyreCount:2,
            FrontTyreSize:'',
            RearTyreSize:'',
            AxleCount:1,
            Items:this.suggestedItems(),
            ShowOnWebsite:true,
            Remarks:'',
            Status:true
        };
    }


    private emptyNumbers():
        NumberTexts
    {
        return {
            cc:'',
            watts:'',
            cylinders:'1',
            seats:'2',
            unladen:'',
            laden:'',
            rpm:'',
            wheelbase:'',
            length:'',
            width:'',
            height:'',
            tyres:'2',
            axles:'1'
        };
    }


    // A fresh copy of the suggested labels (values empty)
    private suggestedItems():
        MotorBikeSpecificationItem[]
    {
        return (this.defaults?.SuggestedItems ?? [])
            .map(
                x =>
                ({
                    Section:x.Section,
                    LineNo:x.LineNo,
                    Label:x.Label,
                    Value:''
                })
            );
    }


    private initializeEntity():
        void
    {
        this.entity =
            this.emptyEntity();

        if (this.defaults)
        {
            this.entity.SpecificationCode =
                this.defaults.Code;
        }

        this.syncNumbers();

        this.brandFilterId =
            null;

        this.formPage =
            1;

        this.selectedSection =
            this.sections[0];

        this.rebuildLookups();

        this.setInitialFormState();

        if (!this.defaults)
        {
            this.loadDefaults();
        }
    }


    //===========================================================
    // Load Defaults (code, lists, suggested rows, models)
    //===========================================================

    private loadDefaults():
        void
    {
        this.specificationsService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    defaults:
                        MotorBikeSpecificationsDefaults
                ): void =>
                {
                    this.defaults =
                        defaults;

                    this.applyLists(defaults);

                    if (this.mode === 'add')
                    {
                        this.entity.SpecificationCode =
                            defaults.Code ?? '';

                        // Suggested labels, unless rows were typed
                        if (!this.entity.Items.some(x => x.Value.trim()))
                        {
                            this.entity.Items =
                                this.suggestedItems();
                        }

                        this.rebuildLookups();

                        // The code and suggestions are not user changes
                        this.setInitialFormState();

                        return;
                    }

                    this.rebuildLookups();

                    // Edit : the suggested labels come back (empty values)
                    if (this.entityLoaded && !this.hasChanges)
                    {
                        this.addMissingSuggestions();

                        this.setInitialFormState();

                        return;
                    }

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Load Specification Defaults Error', error);

                    this.toast.error(
                        'Error',
                        'Failed to load the bike models and lists.'
                    );
                }
            });
    }


    private applyLists
    (
        defaults:
            MotorBikeSpecificationsDefaults
    ):
        void
    {
        if (defaults.Sections?.length)
        {
            this.sections =
                defaults.Sections;

            if (!this.sections.includes(this.selectedSection))
            {
                this.selectedSection =
                    this.sections[0];
            }
        }

        const items =
            (values: string[], fallback: string[]): any[] =>
                (values?.length ? values : fallback).map(x => ({ label:x, value:x }));

        this.fuelItems =
            items(defaults.FuelTypes, FALLBACK_FUELS);

        this.vehicleClassItems =
            items(defaults.VehicleClasses, FALLBACK_CLASSES);

    }


    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.specificationsService
            .getById(this.entityId)
            .subscribe
            ({
                next:
                (
                    specification:
                        MotorBikeSpecifications
                ): void =>
                {
                    this.entity =
                        specification;

                    this.entityLoaded =
                        true;

                    this.addMissingSuggestions();

                    this.syncNumbers();

                    this.rebuildLookups();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Load Specification Error', error);

                    this.toast.error(
                        'Error',
                        'Failed to load the specification.'
                    );

                    this.hasChanges =
                        false;

                    this.onBackToList();
                }
            });
    }


    // Edit : saved rows are only the filled ones, so the suggested
    // labels not used yet are added back with empty values (not
    // saved unless filled). View shows the saved rows only.
    private entityLoaded:
        boolean =
        false;

    private addMissingSuggestions():
        void
    {
        if (this.mode !== 'edit' || !this.defaults)
        {
            return;
        }

        const items =
            [...this.entity.Items];

        for (const suggestion of this.defaults.SuggestedItems)
        {
            const exists =
                items.some(
                    x =>
                        x.Section === suggestion.Section
                        &&
                        x.Label.trim().toLowerCase() === suggestion.Label.toLowerCase()
                );

            if (exists)
            {
                continue;
            }

            const next =
                items
                    .filter(x => x.Section === suggestion.Section)
                    .reduce((max, x) => Math.max(max, x.LineNo), 0) + 1;

            items.push(
                {
                    Section:suggestion.Section,
                    LineNo:next,
                    Label:suggestion.Label,
                    Value:''
                });
        }

        this.entity.Items =
            items;
    }


    private syncNumbers():
        void
    {
        this.numbers =
        {
            cc:numberText(this.entity.EngineCc),
            // Motor power in W (printed as kW on BRTA "KW(EV)")
            watts:numberText(this.entity.MotorPowerWatts),
            cylinders:numberText(this.entity.Cylinders),
            seats:numberText(this.entity.SeatingCapacity),
            unladen:numberText(this.entity.UnladenWeightKg),
            laden:numberText(this.entity.LadenWeightKg),
            rpm:numberText(this.entity.Rpm),
            wheelbase:numberText(this.entity.WheelBaseMm),
            length:numberText(this.entity.LengthMm),
            width:numberText(this.entity.WidthMm),
            height:numberText(this.entity.HeightMm),
            tyres:numberText(this.entity.TyreCount),
            axles:numberText(this.entity.AxleCount)
        };
    }


    //===========================================================
    // Lookups
    //
    // Brands  : those with bike models (filter for the picker).
    // Models  : active, no live specification (+ this one's own).
    // Copy    : models that have a specification (not this one).
    // Saved values outside the fixed lists stay selectable.
    //===========================================================

    private rebuildLookups():
        void
    {
        const defaults =
            this.defaults;

        this.keepSavedValue('vehicleClassItems', this.entity.VehicleClass);

        this.keepSavedValue('bodyTypeItems', this.entity.BodyType);


        if (!defaults)
        {
            return;
        }

        this.brandItems =
        [
            { label:'All brands', value:null },

            ...defaults.Brands
                .map(
                    x =>
                    ({
                        label:x.Status ? x.BrandName : `${x.BrandName} (Inactive)`,
                        value:x.BrandManagementId
                    })
                )
        ];

        const ownModel =
            Number(this.entity.BikeModelId ?? 0);

        const ownPublicId =
            this.entity.PublicId ?? '';

        this.modelItems =
            defaults.Models
                .filter(
                    x =>
                        x.BikeModelId === ownModel
                        ||
                        (
                            x.Status
                            &&
                            !x.SpecificationPublicId
                            &&
                            (!this.brandFilterId || x.BrandManagementId === this.brandFilterId)
                        )
                )
                .map(
                    x =>
                    ({
                        label:this.modelLabel(x),
                        value:x.BikeModelId
                    })
                );

        this.copyItems =
            defaults.Models
                .filter(
                    x =>
                        !!x.SpecificationPublicId
                        &&
                        x.SpecificationPublicId !== ownPublicId
                        &&
                        x.BikeModelId !== ownModel
                )
                .map(
                    x =>
                    ({
                        label:`${this.modelLabel(x)}  ·  ${x.SpecificationCode}`,
                        value:x.BikeModelId
                    })
                );
    }


    private modelLabel
    (
        x:
            MotorBikeSpecificationModelOption
    ):
        string
    {
        const brand =
            x.BrandName ? ` (${x.BrandName})` : '';

        return x.Status
            ? `${x.ModelName}${brand}`
            : `${x.ModelName}${brand} - Inactive`;
    }


    private keepSavedValue
    (
        field:
            'vehicleClassItems' | 'bodyTypeItems',
        value:
            string
    ):
        void
    {
        if (value && !this[field].some(x => x.value === value))
        {
            this[field] =
                [...this[field], { label:value, value }];
        }
    }


    get makerPlaceholder():
        string
    {
        return Number(this.entity.BrandManagementId) > 0
            ? 'Not set : add Maker\'s Name on Brand Management'
            : 'Loads with the brand';
    }


    get modelPlaceholder():
        string
    {
        return this.modelItems.length > 0
            ? 'Select bike model...'
            : 'Every model has a specification';
    }


    get copyPlaceholder():
        string
    {
        return this.copyItems.length > 0
            ? 'Copy another model\'s specification...'
            : 'No other specifications yet';
    }


    get modelText():
        string
    {
        const code =
            this.entity.ModelCode ? ` (${this.entity.ModelCode})` : '';

        return `${this.entity.ModelName ?? ''}${code}`;
    }


    get isElectric():
        boolean
    {
        return this.entity.FuelType === FUEL_ELECTRIC;
    }


    // Form-17 item 29 : "Horse power / Battery capacity"
    // BRTA item "Horse power" (left blank for electric bikes;
    // their power goes in "KW(EV)" = Motor Power)
    get horsePowerLabel():
        string
    {
        return 'Horse Power';
    }


    get horsePowerPlaceholder():
        string
    {
        return this.isElectric
            ? 'Leave blank for electric (BRTA)'
            : 'e.g. 14.5 PS @ 8500 rpm';
    }


    //===========================================================
    // Brand filter / Bike model
    //===========================================================

    onBrandFilterChange
    (
        value:
            any
    ):
        void
    {
        this.brandFilterId =
            Number(value) > 0 ? Number(value) : null;

        const models =
            this.defaults?.Models ?? [];

        if (this.brandFilterId)
        {
            const brandId =
                this.brandFilterId;

            // A picked model of another brand is taken off
            const picked =
                models.find(x => x.BikeModelId === Number(this.entity.BikeModelId ?? 0));

            if (picked && picked.BrandManagementId !== brandId)
            {
                this.entity.BikeModelId = null;
                this.entity.ModelCode = '';
                this.entity.ModelName = '';

                this.modelPickerKeys =
                    [this.modelPickerKeys[0] + 1];
            }

            // Maker's Name loads with the brand
            const ofBrand =
                models.find(x => x.BrandManagementId === brandId);

            this.entity.BrandManagementId =
                brandId;

            this.entity.BrandName =
                ofBrand?.BrandName ?? '';

            this.entity.Maker =
                ofBrand?.MakerName ?? '';
        }

        this.rebuildLookups();

        this.onValueChange();
    }


    onModelChange
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(value ?? 0);

        const model =
            this.defaults?.Models.find(x => x.BikeModelId === id);

        this.entity.BikeModelId =
            model ? model.BikeModelId : null;

        this.entity.ModelCode =
            model?.ModelCode ?? '';

        this.entity.ModelName =
            model?.ModelName ?? '';

        this.entity.BrandManagementId =
            model?.BrandManagementId ?? 0;

        this.entity.BrandName =
            model?.BrandName ?? '';

        // The maker is the brand's Maker's Name (Brand Management)
        this.entity.Maker =
            model?.MakerName ?? '';

        this.rebuildLookups();

        this.onValueChange();
    }


    //===========================================================
    // Copy from another model's specification
    //===========================================================

    onCopyFrom
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(value ?? 0);

        const source =
            this.defaults?.Models.find(x => x.BikeModelId === id);

        this.copyPickerKeys =
            [this.copyPickerKeys[0] + 1];

        this.cdr.detectChanges();

        if (!source?.SpecificationPublicId)
        {
            return;
        }

        this.confirmDialog.open(
            'Copy Specification',
            `Replace the registration data and technical rows with those of ${source.ModelName} (${source.SpecificationCode})?`,
            (): void =>
            {
                setTimeout(
                    () =>
                        this.copyFrom(source)
                );
            },
            'Copy',
            'Cancel',
            'primary'
        );
    }


    private copyFrom
    (
        source:
            MotorBikeSpecificationModelOption
    ):
        void
    {
        this.specificationsService
            .getById(source.SpecificationPublicId)
            .subscribe
            ({
                next:
                (
                    copy:
                        MotorBikeSpecifications
                ): void =>
                {
                    this.entity =
                    {
                        ...this.entity,

                        EngineCc:copy.EngineCc,
                        MotorPowerWatts:copy.MotorPowerWatts,
                        FuelType:copy.FuelType,
                        Cylinders:copy.Cylinders,
                        VehicleClass:copy.VehicleClass,
                        BodyType:copy.BodyType,
                        SeatingCapacity:copy.SeatingCapacity,
                        UnladenWeightKg:copy.UnladenWeightKg,
                        LadenWeightKg:copy.LadenWeightKg,
                        CountryOfOrigin:copy.CountryOfOrigin,
                        HorsePower:copy.HorsePower,
                        Rpm:copy.Rpm,
                        WheelBaseMm:copy.WheelBaseMm,
                        LengthMm:copy.LengthMm,
                        WidthMm:copy.WidthMm,
                        HeightMm:copy.HeightMm,
                        TyreCount:copy.TyreCount,
                        FrontTyreSize:copy.FrontTyreSize,
                        RearTyreSize:copy.RearTyreSize,
                        AxleCount:copy.AxleCount,
                        Items:copy.Items.map(x => ({ ...x }))
                    };

                    this.syncNumbers();

                    this.rebuildLookups();

                    this.onValueChange();

                    this.toast.success(
                        'Copied',
                        `Specification of ${source.ModelName} copied. Check the values, then save.`
                    );
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Copy Specification Error', error);

                    this.toast.error(
                        'Error',
                        'Failed to load the specification to copy.'
                    );
                }
            });
    }


    //===========================================================
    // Registration Data
    //===========================================================

    onFuelChange():
        void
    {
        if (this.isElectric)
        {
            this.numbers.cc =
                '';
        }

        if (!this.numbers.cylinders)
        {
            this.numbers.cylinders =
                '1';
        }

        this.applyNumbers();

        this.onValueChange();
    }


    onNumber
    (
        field:
            NumberField,
        value:
            string | number
    ):
        void
    {
        const decimal =
            field === 'cc' || field === 'unladen' || field === 'laden';

        const places =
            2;

        let text =
            String(value ?? '').replace(decimal ? /[^\d.]/g : /\D/g, '');

        if (decimal)
        {
            const dot =
                text.indexOf('.');

            if (dot >= 0)
            {
                text =
                    text.slice(0, dot + 1) + text.slice(dot + 1).replace(/\./g, '').slice(0, places);
            }
        }

        this.numbers =
        {
            ...this.numbers,
            [field]:text
        };

        this.applyNumbers();

        this.onValueChange();
    }


    private applyNumbers():
        void
    {
        this.entity.EngineCc =
            this.isElectric ? 0 : toNumber(this.numbers.cc);

        this.entity.MotorPowerWatts =
            this.isElectric ? Math.trunc(toNumber(this.numbers.watts)) : 0;

        // Electric : No. of Motors
        this.entity.Cylinders =
            Math.trunc(toNumber(this.numbers.cylinders));

        this.entity.SeatingCapacity =
            Math.trunc(toNumber(this.numbers.seats));

        this.entity.UnladenWeightKg =
            toNumber(this.numbers.unladen);

        this.entity.LadenWeightKg =
            toNumber(this.numbers.laden);

        const whole =
            (text: string): number =>
                Math.trunc(toNumber(text));

        this.entity.Rpm =
            whole(this.numbers.rpm);

        this.entity.WheelBaseMm =
            whole(this.numbers.wheelbase);

        this.entity.LengthMm =
            whole(this.numbers.length);

        this.entity.WidthMm =
            whole(this.numbers.width);

        this.entity.HeightMm =
            whole(this.numbers.height);

        this.entity.TyreCount =
            whole(this.numbers.tyres);

        this.entity.AxleCount =
            whole(this.numbers.axles);
    }


    //===========================================================
    // Technical rows
    //===========================================================

    selectSection
    (
        section:
            string
    ):
        void
    {
        this.selectedSection =
            section;

        this.cdr.detectChanges();
    }


    get sectionRows():
        MotorBikeSpecificationItem[]
    {
        return this.entity.Items
            .filter(x => x.Section === this.selectedSection)
            .sort((a, b) => a.LineNo - b.LineNo);
    }


    // '4 / 9' : filled rows / all rows of the section
    sectionCount
    (
        section:
            string
    ):
        string
    {
        const rows =
            this.entity.Items.filter(x => x.Section === section);

        const filled =
            rows.filter(x => x.Label.trim() && x.Value.trim()).length;

        return this.isViewMode
            ? String(filled)
            : `${filled} / ${rows.length}`;
    }


    get filledRows():
        number
    {
        return this.entity.Items.filter(x => x.Label.trim() && x.Value.trim()).length;
    }


    addRow():
        void
    {
        const next =
            this.sectionRows.reduce((max, x) => Math.max(max, x.LineNo), 0) + 1;

        this.entity.Items =
        [
            ...this.entity.Items,
            {
                Section:this.selectedSection,
                LineNo:next,
                Label:'',
                Value:''
            }
        ];

        this.onValueChange();
    }


    onRowInput
    (
        row:
            MotorBikeSpecificationItem,
        field:
            'Label' | 'Value',
        event:
            Event
    ):
        void
    {
        row[field] =
            (event.target as HTMLInputElement).value;

        this.onValueChange();
    }


    moveRow
    (
        row:
            MotorBikeSpecificationItem,
        step:
            number
    ):
        void
    {
        const rows =
            this.sectionRows;

        const index =
            rows.indexOf(row);

        const other =
            rows[index + step];

        if (index < 0 || !other)
        {
            return;
        }

        const lineNo =
            row.LineNo;

        row.LineNo =
            other.LineNo;

        other.LineNo =
            lineNo;

        this.entity.Items =
            [...this.entity.Items];

        this.onValueChange();
    }


    removeRow
    (
        row:
            MotorBikeSpecificationItem
    ):
        void
    {
        if (this.isViewMode)
        {
            return;
        }

        this.entity.Items =
            this.entity.Items.filter(x => x !== row);

        this.onValueChange();
    }


    //===========================================================
    // Form State
    //===========================================================

    private snapshot():
        string
    {
        return JSON.stringify({ entity:this.entity, numbers:this.numbers });
    }


    private setInitialFormState():
        void
    {
        this.originalEntity =
            this.snapshot();

        this.hasChanges =
            false;

        this.cdr.detectChanges();
    }


    checkForChanges():
        void
    {
        this.hasChanges =
            this.snapshot() !== this.originalEntity;
    }


    onValueChange():
        void
    {
        this.checkForChanges();

        this.cdr.detectChanges();
    }


    onTabChange
    (
        tabId:
            string
    ):
        void
    {
        this.selectedTab =
            tabId || 'general';

        this.cdr.detectChanges();
    }


    //===========================================================
    // Progress Dialog (Animated)
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
                        Math.round(this.progressValue)
                    );
                },
                this.PROGRESS_TICK_MS
            );

        this.cdr.detectChanges();
    }


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
        if (this.progressTimer)
        {
            clearInterval(this.progressTimer);

            this.progressTimer =
                undefined;
        }
    }


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


    private errorMessage
    (
        error:
            unknown,
        fallback:
            string
    ):
        string
    {
        const body =
            (error as any)?.error;

        if (typeof body === 'string' && body.trim())
        {
            return body;
        }

        return body?.message ?? body?.title ?? fallback;
    }


    //===========================================================
    // Save
    //===========================================================

    onSave():
        void
    {
        if (this.isViewMode || this.isSaving)
        {
            return;
        }

        this.applyNumbers();

        const e =
            this.entity;

        const fail =
            (message: string, tab: string = 'general'): void =>
            {
                // 'size' = the Specification tab, page 2
                this.selectedTab =
                    tab === 'size' ? 'general' : tab;

                if (tab !== 'technical')
                {
                    this.formPage =
                        tab === 'size' ? 2 : 1;
                }

                this.toast.error('Validation', message);

                this.cdr.detectChanges();
            };

        if (!(Number(e.BikeModelId) > 0))
        {
            fail('Bike Model is required.');
            return;
        }

        if (this.isElectric)
        {
            if (!(e.MotorPowerWatts >= 1 && e.MotorPowerWatts <= 100000))
            {
                fail('An electric bike needs its Motor Power in W (1 - 100,000, e.g. 350 or 2000).');
                return;
            }

            if (!(e.Cylinders >= 1 && e.Cylinders <= 4))
            {
                fail('No. of Motors must be between 1 and 4.');
                return;
            }
        }
        else
        {
            if (!(e.EngineCc > 0 && e.EngineCc <= 5000))
            {
                fail('Engine CC is required (more than 0, up to 5,000).');
                return;
            }

            if (!(e.Cylinders >= 1 && e.Cylinders <= 12))
            {
                fail('Cylinders must be between 1 and 12.');
                return;
            }
        }

        if (!e.VehicleClass?.trim())
        {
            fail('Vehicle Class is required.');
            return;
        }

        if (!e.BodyType?.trim())
        {
            fail('Body Type is required.');
            return;
        }

        if (!(e.SeatingCapacity >= 1 && e.SeatingCapacity <= 9))
        {
            fail('Seating Capacity must be between 1 and 9.');
            return;
        }

        if (!e.Maker?.trim())
        {
            fail(`Brand ${e.BrandName || ''} has no Maker's Name. Set it on Brand Management first.`);
            return;
        }

        if (!e.CountryOfOrigin?.trim())
        {
            fail('Country of Origin is required.');
            return;
        }

        if (e.Rpm < 0 || e.Rpm > 30000)
        {
            fail('RPM must be between 0 and 30,000.');
            return;
        }

        if (e.UnladenWeightKg > 0 && e.LadenWeightKg > 0 && e.LadenWeightKg < e.UnladenWeightKg)
        {
            fail('Laden Weight cannot be less than Unladen Weight.', 'size');
            return;
        }

        if (!(e.UnladenWeightKg > 0))
        {
            fail('Unladen Weight is required.', 'size');
            return;
        }

        if (!(e.LadenWeightKg > 0))
        {
            fail('Laden Weight is required.', 'size');
            return;
        }

        if (!(e.WheelBaseMm > 0))
        {
            fail('Wheel Base is required.', 'size');
            return;
        }

        if (!e.FrontTyreSize?.trim() || !e.RearTyreSize?.trim())
        {
            fail('Front and Rear Tyre Size are required.', 'size');
            return;
        }

        if ([e.WheelBaseMm, e.LengthMm, e.WidthMm, e.HeightMm].some(x => x < 0 || x > 20000))
        {
            fail('Wheel base and dimensions must be between 0 and 20,000 mm.', 'size');
            return;
        }

        if (!(e.TyreCount >= 1 && e.TyreCount <= 10))
        {
            fail('No. of Tyres must be between 1 and 10.', 'size');
            return;
        }

        if (!(e.AxleCount >= 1 && e.AxleCount <= 5))
        {
            fail('No. of Axles must be between 1 and 5.', 'size');
            return;
        }

        // Rows : filled only, in section order
        const order =
            (section: string): number =>
            {
                const index =
                    this.sections.indexOf(section);

                return index < 0 ? this.sections.length : index;
            };

        const rows =
            e.Items
                .filter(x => x.Label.trim() && x.Value.trim())
                .sort((a, b) => order(a.Section) - order(b.Section) || a.LineNo - b.LineNo);

        const seen =
            new Set<string>();

        for (const row of rows)
        {
            const key =
                `${row.Section}|${row.Label.trim().toLowerCase()}`;

            if (seen.has(key))
            {
                this.selectedSection =
                    row.Section;

                fail(`'${row.Label.trim()}' is listed twice under ${row.Section}.`, 'technical');
                return;
            }

            seen.add(key);
        }

        const model:
            CreateMotorBikeSpecifications =
        {
            BikeModelId:
                Number(e.BikeModelId),
            EngineCc:
                e.EngineCc,
            MotorPowerWatts:
                e.MotorPowerWatts,
            FuelType:
                e.FuelType,
            Cylinders:
                e.Cylinders,
            VehicleClass:
                e.VehicleClass.trim(),
            BodyType:
                e.BodyType.trim(),
            SeatingCapacity:
                e.SeatingCapacity,
            UnladenWeightKg:
                e.UnladenWeightKg,
            LadenWeightKg:
                e.LadenWeightKg,
            Maker:
                e.Maker.trim(),
            CountryOfOrigin:
                e.CountryOfOrigin.trim().toUpperCase(),
            HorsePower:
                (e.HorsePower?.trim() ?? '').toUpperCase(),
            Rpm:
                e.Rpm,
            WheelBaseMm:
                e.WheelBaseMm,
            LengthMm:
                e.LengthMm,
            WidthMm:
                e.WidthMm,
            HeightMm:
                e.HeightMm,
            TyreCount:
                e.TyreCount,
            FrontTyreSize:
                (e.FrontTyreSize?.trim() ?? '').toUpperCase(),
            RearTyreSize:
                (e.RearTyreSize?.trim() ?? '').toUpperCase(),
            AxleCount:
                e.AxleCount,
            Items:
                rows.map(
                    x =>
                    ({
                        Section:x.Section,
                        Label:x.Label.trim(),
                        Value:x.Value.trim()
                    })
                ),
            ShowOnWebsite:
                e.ShowOnWebsite,
            Remarks:
                e.Remarks?.trim() ?? '',
            Status:
                e.Status
        };

        if (this.mode === 'add')
        {
            this.saveCreate(model);
            return;
        }

        this.saveUpdate(
            {
                ...model,
                MotorBikeSpecificationId:e.MotorBikeSpecificationId
            }
        );
    }


    private saveCreate
    (
        model:
            CreateMotorBikeSpecifications
    ):
        void
    {
        this.startProgress(
            'Saving Specification',
            'Please wait while the motor bike specification is being saved...'
        );

        this.withMinimumDuration(
            this.specificationsService.create(model)
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(
                        'Specification saved.',
                        () =>
                        {
                            this.setInitialFormState();

                            this.toast.success(
                                'Success',
                                'Motor bike specification created successfully.'
                            );

                            this.onBackToList();
                        }
                    );
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Create Specification Error', error);

                    this.failProgress(
                        () =>
                            this.toast.error(
                                'Validation',
                                this.errorMessage(error, 'Failed to create the specification.')
                            )
                    );
                }
            });
    }


    private saveUpdate
    (
        model:
            UpdateMotorBikeSpecifications
    ):
        void
    {
        this.startProgress(
            'Updating Specification',
            'Please wait while the motor bike specification is being updated...'
        );

        this.withMinimumDuration(
            this.specificationsService.update(
                this.entityId,
                model
            )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(
                        'Specification updated.',
                        () =>
                        {
                            this.setInitialFormState();

                            this.toast.success(
                                'Success',
                                'Motor bike specification updated successfully.'
                            );

                            this.onBackToList();
                        }
                    );
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Update Specification Error', error);

                    this.failProgress(
                        () =>
                            this.toast.error(
                                'Validation',
                                this.errorMessage(error, 'Failed to update the specification.')
                            )
                    );
                }
            });
    }


    //===========================================================
    // Clear / Back
    //===========================================================

    onClear():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (this.mode === 'edit')
        {
            this.loadEntity();
            return;
        }

        this.initializeEntity();
    }


    onBackToList():
        void
    {
        const go =
            (): void =>
            {
                void this.router.navigate(
                    ['/settings', 'product-settings', 'motor-bike-specifications', 'list']
                );
            };

        if (!this.hasChanges)
        {
            go();
            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            go,
            'Leave',
            'Stay',
            'primary'
        );
    }


    get saveButtonText():
        string
    {
        return this.mode === 'edit'
            ? 'Update'
            : 'Save';
    }


    get isViewMode():
        boolean
    {
        return this.mode === 'view';
    }
}
