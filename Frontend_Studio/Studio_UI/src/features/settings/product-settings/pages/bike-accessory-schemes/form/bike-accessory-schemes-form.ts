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
import
{
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';
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
    BikeAccessorySchemes,
    BikeAccessorySchemeItem,
    BikeAccessorySchemeModel,
    BikeAccessorySchemesDefaults,
    BikeAccessorySchemeAccessoryOption,
    CreateBikeAccessorySchemes,
    UpdateBikeAccessorySchemes,
    SCHEME_KINDS,
    SCHEME_SOURCES
}
from '../../../models/bike-accessory-schemes.model';
import
{
    BikeAccessorySchemesService
}
from '../../../services/bike-accessory-schemes.service';
import
{
    ACCESSORY_USE_FOR_SALE
}
from '../../../models/accessories.model';


//===============================================================
// Dates : 'yyyy-MM-dd' <-> Date (local, no time zone shifts)
//===============================================================

function toDay
(
    value:
        Date
):
    string
{
    const pad =
        (n: number): string =>
            String(n).padStart(2, '0');

    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function fromDay
(
    value:
        string | null | undefined
):
    Date
{
    const parts =
        String(value ?? '').slice(0, 10).split('-').map(x => Number(x));

    return parts.length === 3 && parts.every(x => x > 0)
        ? new Date(parts[0], parts[1] - 1, parts[2])
        : new Date();
}

function addDays
(
    value:
        string,
    days:
        number
):
    string
{
    const date =
        fromDay(value);

    date.setDate(date.getDate() + days);

    return toDay(date);
}


//===============================================================
// Component
//===============================================================
@Component(
{
    selector:'bike-accessory-schemes-form',
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
        //=======================================================
        // Utilities
        //=======================================================
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./bike-accessory-schemes-form.html',
    styleUrls:
    [
        './bike-accessory-schemes-form.css'
    ]
})


//===============================================================
// Bike Accessory Schemes Form
//
// Scheme Information : code, name, kind, source
// Bikes              : brand + the models (chips)
// Accessories        : the items given per bike (qty 1–99)
// Validity & Status  : From (To only for Promotional), status
//===============================================================

export class BikeAccessorySchemesForm
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly schemesService =
        inject(BikeAccessorySchemesService);

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
        'Bike Accessory Schemes';

    entityName:
        string =
        'Scheme';

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

    kindItems:
        any[] =
        SCHEME_KINDS.map(x => ({ label:x, value:x }));

    sourceItems:
        any[] =
        SCHEME_SOURCES.map(x => ({ label:x, value:x }));


    //===========================================================
    // Lookups (from Defaults)
    //===========================================================

    private defaults:
        BikeAccessorySchemesDefaults | null =
        null;

    brandItems:
        any[] =
        [];

    // Models of the brand not yet picked
    modelPickItems:
        any[] =
        [];

    // Accessories of the source not yet picked
    accessoryPickItems:
        any[] =
        [];

    // Changing the key re-creates a picker (back to empty)
    modelPickerKeys:
        number[] =
        [0];

    accessoryPickerKeys:
        number[] =
        [0];


    //===========================================================
    // Entity
    //===========================================================

    entity:
        BikeAccessorySchemes =
        this.emptyEntity();

    // The datepickers need a Date
    validFromDate:
        Date =
        new Date();

    validToDate:
        Date =
        new Date();


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
        BikeAccessorySchemes
    {
        return {
            BikeAccessorySchemeId:0,
            SchemeCode:'',
            SchemeName:'',
            SchemeKind:'Additional',
            SchemeSource:'Supplier',
            BrandManagementId:null,
            BrandName:'',
            ValidFrom:toDay(new Date()),
            ValidTo:null,
            Models:[],
            Items:[],
            Remarks:'',
            Status:true
        };
    }


    private initializeEntity():
        void
    {
        this.entity =
            this.emptyEntity();

        if (this.defaults)
        {
            this.entity.SchemeCode =
                this.defaults.Code;
        }

        this.syncDates();

        this.rebuildLookups();

        this.setInitialFormState();

        if (!this.defaults)
        {
            this.loadDefaults();
        }
    }


    //===========================================================
    // Load Defaults (code, brands, models, accessories)
    //===========================================================

    private loadDefaults():
        void
    {
        this.schemesService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    defaults:
                        BikeAccessorySchemesDefaults
                ): void =>
                {
                    this.defaults =
                        defaults;

                    if (this.mode === 'add')
                    {
                        this.entity.SchemeCode =
                            defaults.Code ?? '';

                        this.rebuildLookups();

                        // The generated code is not a user change
                        this.setInitialFormState();

                        return;
                    }

                    this.rebuildLookups();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Load Scheme Defaults Error', error);

                    this.toast.error(
                        'Error',
                        'Failed to load the brands, models and accessories.'
                    );
                }
            });
    }


    //===========================================================
    // Load Entity
    //===========================================================

    private loadEntity():
        void
    {
        this.schemesService
            .getById(this.entityId)
            .subscribe
            ({
                next:
                (
                    scheme:
                        BikeAccessorySchemes
                ): void =>
                {
                    this.entity =
                        scheme;

                    this.syncDates();

                    this.rebuildLookups();

                    this.setInitialFormState();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Load Scheme Error', error);

                    this.toast.error(
                        'Error',
                        'Failed to load the scheme.'
                    );

                    this.hasChanges =
                        false;

                    this.onBackToList();
                }
            });
    }


    private syncDates():
        void
    {
        this.validFromDate =
            fromDay(this.entity.ValidFrom);

        this.validToDate =
            fromDay(this.entity.ValidTo ?? this.entity.ValidFrom);
    }


    //===========================================================
    // Lookups for the pickers
    //
    // Brands : active ones, plus the scheme's own brand.
    // Models : active models of the brand not yet picked.
    // Items  : Supplier → Additional / Promotional Accessories;
    //          Company   → For Sale accessories; active only.
    //===========================================================

    private rebuildLookups():
        void
    {
        const defaults =
            this.defaults;

        if (!defaults)
        {
            return;
        }

        const ownBrand =
            Number(this.entity.BrandManagementId ?? 0);

        this.brandItems =
            defaults.Brands
                .filter(x => x.Status || x.BrandManagementId === ownBrand)
                .map(
                    x =>
                    ({
                        label:x.Status ? x.BrandName : `${x.BrandName} (Inactive)`,
                        value:x.BrandManagementId
                    })
                );

        const pickedModels =
            new Set(this.entity.Models.map(x => x.BikeModelId));

        this.modelPickItems =
            defaults.Models
                .filter(
                    x =>
                        x.BrandManagementId === ownBrand
                        &&
                        x.Status
                        &&
                        !pickedModels.has(x.BikeModelId)
                )
                .map(
                    x =>
                    ({
                        label:x.ModelName,
                        value:x.BikeModelId
                    })
                );

        const pickedItems =
            new Set(this.entity.Items.map(x => x.AccessoryId));

        this.accessoryPickItems =
            defaults.Accessories
                .filter(
                    x =>
                        x.IsActive
                        &&
                        this.fitsSource(x.AccessoryUse)
                        &&
                        !pickedItems.has(x.AccessoryId)
                )
                .map(
                    x =>
                    ({
                        label:`${x.AccessoryName}  ·  ${x.ProductCode}`,
                        value:x.AccessoryId
                    })
                );
    }


    // The accessory use a scheme takes :
    //   Company  → For Sale
    //   Supplier → Additional Accessories (Additional type) or
    //              Promotional Accessories (Promotional type)
    get wantedUse():
        string
    {
        if (this.entity.SchemeSource === 'Company')
        {
            return ACCESSORY_USE_FOR_SALE;
        }

        return this.isPromotional
            ? 'Promotional Accessories'
            : 'Additional Accessories';
    }


    private fitsSource
    (
        use:
            string
    ):
        boolean
    {
        return use === this.wantedUse;
    }


    get modelPlaceholder():
        string
    {
        if (!(Number(this.entity.BrandManagementId) > 0))
        {
            return 'Select the brand first';
        }

        return this.modelPickItems.length > 0
            ? 'Add a bike model...'
            : 'All models added';
    }


    get accessoryPlaceholder():
        string
    {
        if (this.accessoryPickItems.length > 0)
        {
            return 'Add an accessory...';
        }

        return `No more ${this.wantedUse} items`;
    }


    get sourceHint():
        string
    {
        return this.entity.SchemeSource === 'Company'
            ? 'Company : For Sale accessories, given at cost.'
            : `Supplier : ${this.wantedUse} only, zero cost.`;
    }


    get isPromotional():
        boolean
    {
        return this.entity.SchemeKind === 'Promotional';
    }


    //===========================================================
    // Accessory Type / Source / Brand
    //===========================================================

    onKindChange():
        void
    {
        this.dropUnfitItems();

        if (this.isPromotional)
        {
            if (!this.entity.ValidTo)
            {
                this.entity.ValidTo =
                    addDays(this.entity.ValidFrom, 30);
            }
        }
        else
        {
            this.entity.ValidTo =
                null;
        }

        this.syncDates();

        this.rebuildLookups();

        this.onValueChange();
    }


    onSourceChange():
        void
    {
        this.dropUnfitItems();

        this.rebuildLookups();

        this.onValueChange();
    }


    // Takes off the accessories that do not suit the type and source
    private dropUnfitItems():
        void
    {
        const before =
            this.entity.Items.length;

        const defaults =
            this.defaults;

        if (defaults)
        {
            this.entity.Items =
                this.entity.Items.filter(
                    x =>
                        this.fitsSource(
                            defaults.Accessories.find(a => a.AccessoryId === x.AccessoryId)?.AccessoryUse
                            ?? x.AccessoryUse
                        )
                );
        }

        const removed =
            before - this.entity.Items.length;

        if (removed > 0)
        {
            this.toast.info(
                'Accessories Removed',
                `${removed} accessor${removed === 1 ? 'y does' : 'ies do'} not suit a ${this.entity.SchemeKind} / ${this.entity.SchemeSource} scheme.`
            );
        }
    }


    onBrandChange():
        void
    {
        const brandId =
            Number(this.entity.BrandManagementId ?? 0);

        const defaults =
            this.defaults;

        const before =
            this.entity.Models.length;

        if (defaults)
        {
            this.entity.Models =
                this.entity.Models.filter(
                    m =>
                        defaults.Models.find(x => x.BikeModelId === m.BikeModelId)?.BrandManagementId === brandId
                );

            this.entity.BrandName =
                defaults.Brands.find(x => x.BrandManagementId === brandId)?.BrandName ?? '';
        }

        if (this.entity.Models.length < before)
        {
            this.toast.info(
                'Models Removed',
                'Models of the previous brand were taken off.'
            );
        }

        this.rebuildLookups();

        this.onValueChange();
    }


    //===========================================================
    // Models (chips)
    //===========================================================

    onAddModel
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

        if (model && !this.entity.Models.some(x => x.BikeModelId === id))
        {
            const row:
                BikeAccessorySchemeModel =
            {
                BikeModelId:model.BikeModelId,
                ModelCode:model.ModelCode,
                ModelName:model.ModelName
            };

            this.entity.Models =
                [...this.entity.Models, row];
        }

        this.modelPickerKeys =
            [this.modelPickerKeys[0] + 1];

        this.rebuildLookups();

        this.onValueChange();
    }


    addAllModels():
        void
    {
        const brandId =
            Number(this.entity.BrandManagementId ?? 0);

        const picked =
            new Set(this.entity.Models.map(x => x.BikeModelId));

        const rows =
            (this.defaults?.Models ?? [])
                .filter(x => x.BrandManagementId === brandId && x.Status && !picked.has(x.BikeModelId))
                .map(
                    x =>
                    ({
                        BikeModelId:x.BikeModelId,
                        ModelCode:x.ModelCode,
                        ModelName:x.ModelName
                    })
                );

        this.entity.Models =
            [...this.entity.Models, ...rows];

        this.rebuildLookups();

        this.onValueChange();
    }


    removeModel
    (
        model:
            BikeAccessorySchemeModel
    ):
        void
    {
        if (this.isViewMode)
        {
            return;
        }

        this.entity.Models =
            this.entity.Models.filter(x => x.BikeModelId !== model.BikeModelId);

        this.rebuildLookups();

        this.onValueChange();
    }


    //===========================================================
    // Accessories (rows with quantity per bike)
    //===========================================================

    onAddAccessory
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(value ?? 0);

        const option:
            BikeAccessorySchemeAccessoryOption | undefined =
            this.defaults?.Accessories.find(x => x.AccessoryId === id);

        if (option && !this.entity.Items.some(x => x.AccessoryId === id))
        {
            const row:
                BikeAccessorySchemeItem =
            {
                AccessoryId:option.AccessoryId,
                ProductCode:option.ProductCode,
                AccessoryName:option.AccessoryName,
                AccessoryUse:option.AccessoryUse,
                QuantityPerBike:1
            };

            this.entity.Items =
                [...this.entity.Items, row];
        }

        this.accessoryPickerKeys =
            [this.accessoryPickerKeys[0] + 1];

        this.rebuildLookups();

        this.onValueChange();
    }


    onQuantityInput
    (
        item:
            BikeAccessorySchemeItem,
        event:
            Event
    ):
        void
    {
        const input =
            event.target as HTMLInputElement;

        const digits =
            input.value.replace(/\D/g, '').slice(0, 2);

        input.value =
            digits;

        item.QuantityPerBike =
            digits ? Number(digits) : 0;

        this.onValueChange();
    }


    onQuantityBlur
    (
        item:
            BikeAccessorySchemeItem,
        event:
            Event
    ):
        void
    {
        if (item.QuantityPerBike < 1)
        {
            item.QuantityPerBike =
                1;

            (event.target as HTMLInputElement).value =
                '1';

            this.onValueChange();
        }
    }


    removeItem
    (
        item:
            BikeAccessorySchemeItem
    ):
        void
    {
        if (this.isViewMode)
        {
            return;
        }

        this.entity.Items =
            this.entity.Items.filter(x => x.AccessoryId !== item.AccessoryId);

        this.rebuildLookups();

        this.onValueChange();
    }


    get totalPieces():
        number
    {
        return this.entity.Items.reduce((sum, x) => sum + (Number(x.QuantityPerBike) || 0), 0);
    }


    //===========================================================
    // Dates
    //===========================================================

    onValidFromChange
    (
        value:
            Date
    ):
        void
    {
        this.entity.ValidFrom =
            toDay(value);

        if (this.isPromotional && this.entity.ValidTo && this.entity.ValidTo < this.entity.ValidFrom)
        {
            this.entity.ValidTo =
                this.entity.ValidFrom;
        }

        this.syncDates();

        this.onValueChange();
    }


    onValidToChange
    (
        value:
            Date
    ):
        void
    {
        this.entity.ValidTo =
            toDay(value);

        this.syncDates();

        this.onValueChange();
    }


    //===========================================================
    // Form State
    //===========================================================

    private setInitialFormState():
        void
    {
        this.originalEntity =
            JSON.stringify(this.entity);

        this.hasChanges =
            false;

        this.cdr.detectChanges();
    }


    checkForChanges():
        void
    {
        this.hasChanges =
            JSON.stringify(this.entity) !== this.originalEntity;
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
            tabId;
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

        const fail =
            (message: string): void =>
                this.toast.error('Validation', message);

        if (!this.entity.SchemeName?.trim())
        {
            fail('Scheme Name is required.');
            return;
        }

        if (!(Number(this.entity.BrandManagementId) > 0))
        {
            fail('Brand is required.');
            return;
        }

        if (this.entity.Models.length === 0)
        {
            fail('Add at least one bike model.');
            return;
        }

        if (this.entity.Items.length === 0)
        {
            fail('Add at least one accessory.');
            return;
        }

        if (this.entity.Items.some(x => !(x.QuantityPerBike >= 1 && x.QuantityPerBike <= 99)))
        {
            fail('Quantity per bike must be between 1 and 99.');
            return;
        }

        if (!this.entity.ValidFrom)
        {
            fail('Valid From is required.');
            return;
        }

        if (this.isPromotional)
        {
            if (!this.entity.ValidTo)
            {
                fail('A Promotional scheme needs a Valid To date.');
                return;
            }

            if (this.entity.ValidTo < this.entity.ValidFrom)
            {
                fail('Valid To cannot be before Valid From.');
                return;
            }
        }

        const model:
            CreateBikeAccessorySchemes =
        {
            SchemeName:
                this.entity.SchemeName.trim(),
            SchemeKind:
                this.entity.SchemeKind,
            SchemeSource:
                this.entity.SchemeSource,
            BrandManagementId:
                Number(this.entity.BrandManagementId ?? 0),
            ValidFrom:
                this.entity.ValidFrom,
            ValidTo:
                this.isPromotional ? this.entity.ValidTo : null,
            BikeModelIds:
                this.entity.Models.map(x => x.BikeModelId),
            Items:
                this.entity.Items.map(
                    x =>
                    ({
                        AccessoryId:x.AccessoryId,
                        QuantityPerBike:Number(x.QuantityPerBike)
                    })
                ),
            Remarks:
                this.entity.Remarks?.trim() ?? '',
            Status:
                this.entity.Status
        };

        if (this.mode === 'add')
        {
            this.saveCreate(model);
            return;
        }

        this.saveUpdate(
            {
                ...model,
                BikeAccessorySchemeId:this.entity.BikeAccessorySchemeId
            }
        );
    }


    private saveCreate
    (
        model:
            CreateBikeAccessorySchemes
    ):
        void
    {
        this.startProgress(
            'Saving Scheme',
            'Please wait while the bike accessory scheme is being saved...'
        );

        this.withMinimumDuration(
            this.schemesService.create(model)
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(
                        'Scheme saved.',
                        () =>
                        {
                            this.setInitialFormState();

                            this.toast.success(
                                'Success',
                                'Bike accessory scheme created successfully.'
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
                    console.error('Create Scheme Error', error);

                    this.failProgress(
                        () =>
                            this.toast.error(
                                'Validation',
                                this.errorMessage(error, 'Failed to create the scheme.')
                            )
                    );
                }
            });
    }


    private saveUpdate
    (
        model:
            UpdateBikeAccessorySchemes
    ):
        void
    {
        this.startProgress(
            'Updating Scheme',
            'Please wait while the bike accessory scheme is being updated...'
        );

        this.withMinimumDuration(
            this.schemesService.update(
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
                        'Scheme updated.',
                        () =>
                        {
                            this.setInitialFormState();

                            this.toast.success(
                                'Success',
                                'Bike accessory scheme updated successfully.'
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
                    console.error('Update Scheme Error', error);

                    this.failProgress(
                        () =>
                            this.toast.error(
                                'Validation',
                                this.errorMessage(error, 'Failed to update the scheme.')
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
                    ['/settings', 'product-settings', 'bike-accessory-schemes', 'list']
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
