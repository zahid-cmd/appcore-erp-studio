//===============================================================
// Promotional Offers - Sales Center / Service Center / Accessory
// Shop : form (shared; each page's wrapper gives its config).
// Hand-written : NEVER run Code Sync for these pages.
//
// Operational page layout (like Purchase Order / Sales Invoice) :
// header (ribbon : Offer No + status) and one body, 50 / 50 :
//   Left  (sales page width) : Offer Information (name, type,
//           brand, funded by, period, branches), Benefit (Free
//           Service / Prizes only), Add Coverage (Offer Coverage,
//           the item with "All ..." first, Discount Type +
//           Discount; Add / Update in its header), Terms
//   Right : the Coverage table (double-click a row to edit it,
//           X removes it)
// Owner 2026-11-13 00:26 : one coverage kind per offer (Models OR
// Motor Bikes : locked after the first row); "All Models" adds
// one row per model (each can then be edited / removed) instead
// of a single All row.
// Owner 2026-11-13 :
//   * the discount is entered per coverage row only (no offer-
//     wide discount any more);
//   * Sales Center coverage = Models / Motor Bikes;
//   * leaving items out = removing their rows (All expands);
//   * the discount ledger is not shown : the offer's own ledger
//     is created on save (server).
// A Draft is fully editable; an Active offer only its name, end
// date, branches and terms. View of a Draft shows Activate.
// After every action the page goes back to the list.
//===============================================================


//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    OnInit,
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
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    PROMOTIONAL_OFFER_PAGE,
    PromotionalOfferCoverage
}
from '../promotional-offer.config';

import
{
    PromotionalOffer,
    PromotionalOfferDefaults,
    PromotionalOfferOption,
    PromotionalTargetType,
    SavePromotionalOffer
}
from '../promotional-offer.model';

import
{
    PromotionalOfferService
}
from '../promotional-offer.service';


//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../../shared/components/layout/page-header/page-header';

import
{
    CommandCenterComponent
}
from '../../../../../shared/components/utilities/command-center/command-center';

import
{
    TextboxComponent
}
from '../../../../../shared/components/controls/textbox/textbox';


import
{
    DropdownComponent
}
from '../../../../../shared/components/controls/dropdown/dropdown';

import
{
    SearchDropdownComponent
}
from '../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    DatepickerComponent
}
from '../../../../../shared/components/controls/datepicker/datepicker';

import
{
    CheckboxComponent
}
from '../../../../../shared/components/utilities/checkbox/checkbox';

import
{
    OrbitLoaderComponent
}
from '../../../../../shared/components/utilities/orbit-loader/orbit-loader';

import
{
    ConfirmDialogComponent
}
from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ConfirmDialogService
}
from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ProgressDialogComponent
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    ProgressRunner
}
from '../../../../../shared/components/utilities/progress-dialog/progress-runner';

import
{
    ToastService
}
from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../shared/components/utilities/toast/toast';


//===============================================================
// Types and constants
//===============================================================

interface Item
{
    label:string;
    value:any;
}

// A coverage row (numbers typed as text)
interface CoverageRow
{
    // The Offer Coverage choice it was entered under (Models /
    // Motor Bikes ...)
    Cover:PromotionalTargetType;
    // All (everything of the brand) / Category / SubCategory /
    // Product
    TargetType:PromotionalTargetType;
    TargetId:number | null;
    TargetName:string;
    DiscountType:string;
    DiscountText:string;
    IsExcluded:boolean;
}

interface PrizeRow
{
    PrizeName:string;
    PrizeKind:string;
    ValueText:string;
    QuantityText:string;
    GivenQuantity:number;
}

const DISCOUNT_TYPES =
    ['Fixed Discount', 'Parts Discount', 'Direct Discount', 'Service Campaign'];

// Service Center (owner 2026-11-13 01:56) : free service and / or
// a parts discount in one offer
const SERVICE_CAMPAIGN =
    'Service Campaign';

const PRIZE_TYPES =
    ['Scratch Card', 'SMS Offer'];

const FREE_SERVICE =
    'Free Service';

// The "All ..." item of the item dropdown
const ALL_VALUE =
    0;

// Service Campaign product types (the category type) : row
// TargetType 'ProductType', TargetId 1 / 2
const PRODUCT_TYPES: { id:number; name:string; row:string }[] =
[
    { id:1, name:'Spare Parts', row:'Spare Part' },
    { id:2, name:'Lubricants', row:'Lubricant' }
];


//===============================================================
// Date helpers ("yyyy-MM-dd" <-> local Date)
//===============================================================

function isoToDate(value: string | null | undefined): Date | null
{
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec((value ?? '').trim());

    if (!match)
    {
        return null;
    }

    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

    return isNaN(date.getTime()) ? null : date;
}

function dateToIso(value: Date | null | undefined): string
{
    if (!(value instanceof Date) || isNaN(value.getTime()))
    {
        return '';
    }

    const month = String(value.getMonth() + 1).padStart(2, '0');

    const day = String(value.getDate()).padStart(2, '0');

    return `${value.getFullYear()}-${month}-${day}`;
}

function parseNumber(text: string | number | null | undefined): number
{
    const value = Number(String(text ?? '').replace(/,/g, '').trim());

    return isFinite(value) ? value : 0;
}

function money(value: number): string
{
    return value.toLocaleString('en-US', { maximumFractionDigits:2 });
}


@Component(
{
    selector:'promotional-offer-form',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        TextboxComponent,
        DropdownComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        CheckboxComponent,
        OrbitLoaderComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ToastComponent
    ],

    templateUrl:'./promotional-offer-form.html',

    styleUrl:'./promotional-offer-form.css'
})

export class PromotionalOfferForm
    implements OnInit
{
    readonly page =
        inject(PROMOTIONAL_OFFER_PAGE);

    private readonly service =
        inject(PromotionalOfferService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly toast =
        inject(ToastService);

    private readonly confirm =
        inject(ConfirmDialogService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );


    //===========================================================
    // Mode and state
    //===========================================================

    mode: 'add' | 'edit' | 'view' = 'add';

    private publicId = '';

    loading = true;

    loadError = '';

    defaults: PromotionalOfferDefaults | null = null;

    // The saved offer (edit / view)
    saved: PromotionalOffer | null = null;

    private original = '';


    //===========================================================
    // The offer (form values)
    //===========================================================

    offerName = '';

    offerType = '';

    brandId: number | null = null;

    fundedBy = 'Company';

    startDate: Date | null = null;

    endDate: Date | null = null;

    // 'all' = every branch of the page's business line
    branchScope: 'all' | 'selected' = 'all';

    branchIds: number[] = [];

    freeServiceText = '1';

    claimDaysText = '0';

    // Service Campaign : free service on / off
    freeServiceOn = true;

    // Service Campaign (owner 2026-11-13 02:15) : two screens in
    // one canvas, 1 = Bikes (eligible models + free service),
    // 2 = Parts (parts discount rows); Next / Back on the right
    scStep: 1 | 2 = 1;

    terms = '';

    coverage: CoverageRow[] = [];

    prizes: PrizeRow[] = [];


    //===========================================================
    // Dropdown items (stable arrays : built once / on change)
    //===========================================================

    offerTypeItems: Item[] = [];

    brandItems: Item[] = [];

    readonly fundedByItems: Item[] =
    [
        { label:'Company (own cost)', value:'Company' },
        { label:'Distributor (reimbursable)', value:'Distributor' }
    ];

    readonly discountTypeItems: Item[] =
    [
        { label:'Amount (Tk per unit)', value:'Amount' },
        { label:'Percent (%)', value:'Percent' }
    ];

    branchScopeItems: Item[] = [];

    readonly prizeKindItems: Item[] =
    [
        { label:'Cash', value:'Cash' },
        { label:'Item', value:'Item' },
        { label:'Service', value:'Service' }
    ];

    // The page's coverage levels (config) : parent = models / sub
    // categories, child = motor bikes / parts / accessories
    coverages: PromotionalOfferCoverage[] = [];

    // Brand-filtered options of both levels
    private parentOptions: PromotionalOfferOption[] = [];

    private childOptions: PromotionalOfferOption[] = [];

    // Service Campaign : categories (parts), bike models
    private categoryOptions: PromotionalOfferOption[] = [];

    private bikeModelOptions: PromotionalOfferOption[] = [];

    scCategoryItems: Item[] = [];

    scSubItems: Item[] = [];

    scPartItems: Item[] = [];

    eligModelItems: Item[] = [];

    // Product Type (Spare Parts / Lubricants) above Category; Spare
    // Parts first (lubricants are rarely discounted)
    scTypeId = 1;

    readonly scTypeItems: Item[] = PRODUCT_TYPES.map(x => ({ label:x.name, value:x.id }));

    scCategoryId: number | null = ALL_VALUE;

    scSubId: number | null = ALL_VALUE;

    scPartId: number | null = ALL_VALUE;

    eligModelId: number | null = null;

    // Model dropdown : "All Models" first
    modelItems: Item[] = [];

    // Motor Bike dropdown : "All Motor Bikes" first, then the bikes
    // of the chosen model (all bikes when All Models)
    bikeItems: Item[] = [];

    get parentLevel(): PromotionalOfferCoverage
    {
        return this.coverages.find(x => x.type === 'SubCategory')
            ?? { type:'SubCategory', plural:'Models', singular:'Model' };
    }

    get childLevel(): PromotionalOfferCoverage
    {
        return this.coverages.find(x => x.type === 'Product')
            ?? { type:'Product', plural:'Motor Bikes', singular:'Motor Bike' };
    }

    // Free Service covers models only (no bike dropdown)
    get hasChildLevel(): boolean
    {
        return !this.isFreeService;
    }


    //===========================================================
    // Add Coverage card (the row being entered / edited)
    //===========================================================

    // ALL_VALUE = "All Models"; null = nothing chosen
    pickModelId: number | null = null;

    // ALL_VALUE = "All Motor Bikes" of the model
    pickBikeId: number | null = ALL_VALUE;

    pickDiscountType = 'Amount';

    pickDiscountText = '';

    // Exception : the picked model / bike is left out of the offer
    pickExcluded = false;

    // Model rows opened to show their bikes (model ids)
    expandedModels = new Set<number>();

    // Row open in the card (double-click); -1 = adding
    editingIndex = -1;

    get isEditingLine(): boolean
    {
        return this.editingIndex >= 0;
    }

    // Model ids covered as a whole (model rows)
    private get coveredModelIds(): Set<number>
    {
        return new Set(
            this.coverage
                .filter((r, i) => i !== this.editingIndex && r.TargetType === 'SubCategory' && r.TargetId != null)
                .map(r => Number(r.TargetId)));
    }

    // Every model (brand applied) is on the offer as a whole : both
    // dropdowns show "All" and are locked until a row is removed
    get allItemsAdded(): boolean
    {
        if (this.parentOptions.length === 0)
        {
            return false;
        }

        const covered = this.coveredModelIds;

        return this.parentOptions.every(x => covered.has(x.Id));
    }

    // The dropdowns are locked (not while a row is being edited)
    get itemLocked(): boolean
    {
        if (this.isServiceCampaign)
        {
            return false;
        }

        return this.allItemsAdded && !this.isEditingLine && !this.pickExcluded;
    }


    //===========================================================
    // Mode helpers
    //===========================================================

    get isAddMode(): boolean
    {
        return this.mode === 'add';
    }

    get isEditMode(): boolean
    {
        return this.mode === 'edit';
    }

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    get status(): string
    {
        return this.saved?.Status ?? 'Draft';
    }

    // New or Draft : everything
    get canEditAll(): boolean
    {
        return !this.isViewMode && this.status === 'Draft' && !this.progress.busy;
    }

    // Draft or Active : name, end date, branches, terms
    get canEditBasic(): boolean
    {
        return !this.isViewMode && (this.status === 'Draft' || this.status === 'Active') && !this.progress.busy;
    }

    get saveButtonText(): string
    {
        return this.isEditMode ? 'Update' : 'Save';
    }

    get saveButtonIcon(): string
    {
        return this.isEditMode ? 'fas fa-pen-to-square' : 'fas fa-floppy-disk';
    }


    //===========================================================
    // Offer type helpers
    //===========================================================

    get isDiscount(): boolean
    {
        return DISCOUNT_TYPES.includes(this.offerType);
    }

    get hasPrizes(): boolean
    {
        return PRIZE_TYPES.includes(this.offerType);
    }

    get isFreeService(): boolean
    {
        return this.offerType === FREE_SERVICE;
    }

    // Free Service / prizes : the left Benefit card
    get hasBenefitCard(): boolean
    {
        return this.hasPrizes || this.isFreeService;
    }


    //===========================================================
    // Display values
    //===========================================================

    get offerNoDisplay(): string
    {
        return this.saved?.OfferNo || '';
    }

    get offerNoPlaceholder(): string
    {
        return this.defaults?.NextOfferNo
            ? `${this.defaults.NextOfferNo} (on save)`
            : 'Auto generated';
    }

    get statusDisplay(): string
    {
        if (!this.saved)
        {
            return 'Draft (new)';
        }

        const phase = this.saved.Status === 'Active' && this.saved.Phase ? ` · ${this.saved.Phase}` : '';

        return `${this.saved.Status}${phase}`;
    }

    get lineBranches(): PromotionalOfferOption[]
    {
        return this.defaults?.Branches ?? [];
    }

    get branchChoice(): boolean
    {
        return this.lineBranches.length > 1;
    }

    get lineText(): string
    {
        return this.defaults?.BusinessLine || 'this business';
    }

    get singleBranchDisplay(): string
    {
        return this.lineBranches.length === 1
            ? this.lineBranches[0].Name
            : `No branch runs ${this.lineText} today`;
    }

    get coverageCount(): string
    {
        const covered = this.coverage.filter(r => !r.IsExcluded).length;

        const excluded = this.coverage.length - covered;

        return `${covered} ${covered === 1 ? 'row' : 'rows'}${excluded ? ` · ${excluded} exception${excluded === 1 ? '' : 's'}` : ''}`;
    }

    // The note under the Add Coverage fields
    get coverageHint(): string
    {
        const parent = this.parentLevel;

        const child = this.childLevel;

        if (this.isServiceCampaign)
        {
            return this.pickExcluded
                ? 'Exception : pick what to leave out of the parts discount'
                : `Part, else sub category, else category; all "All" = All ${this.scTypeName}`;
        }

        if (this.pickExcluded)
        {
            return this.hasChildLevel
                ? `Exception : pick a ${parent.singular.toLowerCase()} (whole ${parent.singular.toLowerCase()}) or one of its ${child.plural.toLowerCase()} to leave it out of the offer. It stays on the table in red.`
                : `Exception : pick a ${parent.singular.toLowerCase()} to leave it out of the offer. It stays on the table in red.`;
        }

        if (this.itemLocked)
        {
            return `All ${parent.plural} are on the offer (locked). Remove a row to leave one out, or double-click one to change its discount.`;
        }

        if (!this.hasChildLevel)
        {
            return `Choose a ${parent.singular.toLowerCase()} or All ${parent.plural} (one row each).`;
        }

        return `${parent.singular} + All ${child.plural} covers the whole ${parent.singular.toLowerCase()}; pick one ${child.singular.toLowerCase()} for a row of its own. All ${parent.plural} + All ${child.plural} adds one row per ${parent.singular.toLowerCase()}.`;
    }


    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit(): void
    {
        const url = this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/')
                ? 'view'
                : url.includes('/edit/')
                    ? 'edit'
                    : 'add';

        this.publicId = this.route.snapshot.paramMap.get('id') ?? '';

        this.loadDefaults();
    }

    private loadDefaults(): void
    {
        this.loading = true;

        this.loadError = '';

        this.service
            .getDefaults(this.page.apiPath)
            .subscribe
            ({
                next:
                    defaults =>
                    {
                        this.defaults = defaults;

                        this.offerTypeItems = defaults.OfferTypes.map(x => ({ label:x, value:x }));

                        this.brandItems =
                        [
                            { label:'All Brands (company offer)', value:null },
                            ...defaults.Brands.map(b => ({ label:b.Name, value:b.Id }))
                        ];

                        this.branchScopeItems =
                        [
                            { label:`All ${defaults.BusinessLine} branches (${defaults.Branches.length})`, value:'all' },
                            { label:'Selected branches', value:'selected' }
                        ];

                        if (this.isAddMode)
                        {
                            this.resetEntity();

                            this.loading = false;

                            this.cdr.detectChanges();

                            return;
                        }

                        this.loadEntity();
                    },
                error:
                    error =>
                    {
                        this.loading = false;

                        this.loadError = this.errorText(error, 'The offer settings could not be loaded.');

                        this.toast.error('Load Failed', this.loadError);

                        this.cdr.detectChanges();
                    }
            });
    }

    private loadEntity(): void
    {
        this.loading = true;

        this.service
            .get(this.page.apiPath, this.publicId)
            .subscribe
            ({
                next:
                    offer =>
                    {
                        this.saved = offer;

                        if (this.isEditMode && offer.Status !== 'Draft' && offer.Status !== 'Active')
                        {
                            this.mode = 'view';

                            this.toast.info('View Only', `${offer.OfferNo} is ${offer.Status.toLowerCase()} : it can only be viewed.`);
                        }

                        this.fill(offer);

                        this.loading = false;

                        this.cdr.detectChanges();
                    },
                error:
                    error =>
                    {
                        this.loading = false;

                        this.loadError = this.errorText(error, 'The offer could not be loaded.');

                        this.toast.error('Load Failed', this.loadError);

                        this.cdr.detectChanges();
                    }
            });
    }

    private resetEntity(): void
    {
        const today = isoToDate(this.defaults?.Today) ?? new Date();

        this.offerName = '';
        this.offerType = this.defaults?.OfferTypes[0] ?? '';
        this.brandId = null;
        this.fundedBy = 'Company';
        this.startDate = today;
        this.endDate = today;
        this.branchScope = 'all';
        this.branchIds = [];
        this.freeServiceText = '1';
        this.claimDaysText = '0';
        this.freeServiceOn = true;
        this.scStep = 1;
        this.scTypeId = 1;
        this.terms = '';
        this.coverage = [];
        this.prizes = [];

        if (this.hasPrizes)
        {
            this.addPrize();
        }

        this.buildChoices();

        this.resetPick();

        this.original = this.snapshot();
    }

    private fill(offer: PromotionalOffer): void
    {
        this.offerName = offer.OfferName;
        this.offerType = offer.OfferType;
        this.brandId = offer.BrandManagementId;
        this.fundedBy = offer.FundedBy || 'Company';
        this.startDate = isoToDate(offer.StartDate);
        this.endDate = isoToDate(offer.EndDate);
        this.branchScope = offer.AllBranches ? 'all' : 'selected';
        this.branchIds = [...offer.BranchIds];
        this.freeServiceText = String(offer.FreeServiceCount || 1);
        this.claimDaysText = String(offer.ClaimDays || 0);
        // Service Campaign : always one free service per bike
        this.freeServiceOn = true;
        this.scStep = 1;
        this.terms = offer.Terms;

        // An older Service Center draft (Free Service / Parts
        // Discount) opens as a Service Campaign : its models become
        // eligible models
        const legacyFree = this.page.channel === 'ServiceCenter' && offer.Status === 'Draft' && offer.OfferType === 'Free Service';

        if (this.page.channel === 'ServiceCenter' && offer.Status === 'Draft' && (legacyFree || offer.OfferType === 'Parts Discount'))
        {
            this.offerType = SERVICE_CAMPAIGN;

            this.freeServiceOn = legacyFree;
        }

        if (this.offerType && !this.offerTypeItems.some(x => x.value === this.offerType))
        {
            this.offerTypeItems = [...this.offerTypeItems, { label:this.offerType, value:this.offerType }];
        }

        this.buildChoices();

        const first = (this.coverages[0]?.type ?? 'SubCategory') as PromotionalTargetType;

        this.coverage =
            offer.Targets.map
            (
                t =>
                {
                    // Older offers : a row without its own discount
                    // takes the offer's
                    const own = !!t.DiscountType;

                    if (t.TargetType === 'Model' || (legacyFree && t.TargetType === 'SubCategory'))
                    {
                        return {
                            Cover:'Model' as PromotionalTargetType,
                            TargetType:'Model' as PromotionalTargetType,
                            TargetId:t.TargetId,
                            TargetName:t.TargetName,
                            DiscountType:'',
                            DiscountText:'',
                            IsExcluded:t.IsExcluded
                        };
                    }

                    return {
                        Cover:t.TargetType === 'All' ? first : t.TargetType,
                        TargetType:t.TargetType,
                        TargetId:t.TargetType === 'All' ? null : t.TargetId,
                        TargetName:t.TargetType === 'All' ? '' : t.TargetName,
                        DiscountType:t.IsExcluded || !this.isDiscount ? '' : (own ? t.DiscountType : offer.DiscountType || 'Amount'),
                        DiscountText:
                            t.IsExcluded || !this.isDiscount
                                ? ''
                                : String((own ? t.DiscountValue : offer.DiscountValue) ?? ''),
                        IsExcluded:t.IsExcluded
                    };
                }
            );

        this.prizes =
            offer.Prizes.map
            (
                p =>
                ({
                    PrizeName:p.PrizeName,
                    PrizeKind:p.PrizeKind || 'Cash',
                    ValueText:p.PrizeValue ? String(p.PrizeValue) : '',
                    QuantityText:p.Quantity ? String(p.Quantity) : '',
                    GivenQuantity:p.GivenQuantity
                })
            );

        this.resetPick();

        this.original = this.snapshot();
    }


    //===========================================================
    // Choices : both levels filtered by the brand
    //===========================================================

    private ofBrand(rows: PromotionalOfferOption[]): PromotionalOfferOption[]
    {
        return this.brandId
            ? rows.filter(x => x.BrandId == null || x.BrandId === this.brandId)
            : rows;
    }

    private buildChoices(): void
    {
        this.coverages =
            this.isFreeService
                ? [{ type:'SubCategory', plural:'Models', singular:'Model' }]
                : this.page.coverages;

        this.parentOptions =
            this.ofBrand(this.isFreeService ? this.defaults?.BikeModels ?? [] : this.defaults?.SubCategories ?? []);

        this.childOptions =
            this.isFreeService ? [] : this.ofBrand(this.defaults?.Products ?? []);

        this.modelItems =
        [
            { label:`All ${this.parentLevel.plural}`, value:ALL_VALUE },
            ...this.parentOptions.map(x => ({ label:x.Name, value:x.Id }))
        ];

        this.buildBikeItems();

        if (this.isServiceCampaign)
        {
            this.buildServiceChoices();
        }
    }

    // The bikes of the chosen model (all bikes for All Models)
    private buildBikeItems(): void
    {
        const model = this.pickModelId;

        const rows =
            model != null && model !== ALL_VALUE
                ? this.childOptions.filter(x => x.ParentId === model)
                : this.childOptions;

        this.bikeItems =
        [
            { label:`All ${this.childLevel.plural}`, value:ALL_VALUE },
            ...rows.map(x => ({ label:x.Name, value:x.Id }))
        ];
    }

    private nameOf(type: string, id: number | null): string
    {
        const list =
            type === 'Product'
                ? this.childOptions
                : type === 'Category'
                    ? this.categoryOptions
                    : type === 'Model'
                        ? this.bikeModelOptions
                        : this.parentOptions;

        return list.find(x => x.Id === id)?.Name ?? '';
    }

    // "Models" / "Motor Bikes" / "All" (the row's coverage)
    coverPlural(row: CoverageRow): string
    {
        if (row.TargetType === 'Product')
        {
            return this.childLevel.singular;
        }

        if (row.TargetType === 'SubCategory')
        {
            return this.parentLevel.singular;
        }

        if (row.TargetType === 'Model')
        {
            return 'Eligible Model';
        }

        if (row.TargetType === 'ProductType')
        {
            return 'All';
        }

        return row.TargetType === 'All' ? 'All' : row.TargetType;
    }

    rowName(row: CoverageRow): string
    {
        if (row.TargetType === 'All')
        {
            return this.isServiceCampaign ? `All ${this.childLevel.plural}` : `All ${this.parentLevel.plural}`;
        }

        if (row.TargetType === 'ProductType')
        {
            return `All ${PRODUCT_TYPES.find(x => x.id === row.TargetId)?.name ?? 'Parts'}`;
        }

        return row.TargetName || this.nameOf(row.TargetType, row.TargetId) || '-';
    }

    rowDiscount(row: CoverageRow): string
    {
        if (row.IsExcluded)
        {
            return 'Excluded';
        }

        if (row.TargetType === 'Model')
        {
            return 'Eligible';
        }

        if (!this.isDiscount || !row.DiscountType)
        {
            return '-';
        }

        const value = parseNumber(row.DiscountText);

        return row.DiscountType === 'Percent' ? `${money(value)}%` : `Tk ${money(value)}`;
    }


    //===========================================================
    // Changes (left)
    //===========================================================

    onOfferName(value: string | number): void
    {
        this.offerName = String(value ?? '');
    }

    onOfferTypeChange(value: any): void
    {
        const beforeFree = this.isFreeService;

        const beforeDiscount = this.isDiscount;

        this.offerType = String(value ?? '');

        // Free Service covers models; the others the page's
        // products : rows of the other kind no longer fit
        if (beforeFree !== this.isFreeService)
        {
            this.coverage = [];
        }

        if (beforeDiscount && !this.isDiscount)
        {
            this.coverage.forEach(r => { r.DiscountType = ''; r.DiscountText = ''; });
        }

        if (this.hasPrizes && this.prizes.length === 0)
        {
            this.addPrize();
        }

        this.buildChoices();

        this.resetPick();
    }

    onBrandChange(value: any): void
    {
        this.brandId = value === null || value === undefined || value === '' ? null : Number(value);

        this.buildChoices();

        // Rows of another brand leave the offer
        const before = this.coverage.length;

        this.coverage =
            this.coverage.filter
            (
                r =>
                    r.TargetId == null
                    || r.TargetType === 'ProductType'
                    || (r.TargetType === 'Category' && !this.isServiceCampaign)
                    || (r.TargetType === 'Product'
                            ? this.childOptions
                            : r.TargetType === 'Category'
                                ? this.categoryOptions
                                : r.TargetType === 'Model'
                                    ? this.bikeModelOptions
                                    : this.parentOptions).some(x => x.Id === r.TargetId)
            );

        if (this.coverage.length < before)
        {
            this.toast.info('Coverage', `${before - this.coverage.length} row(s) of another brand removed.`);
        }

        this.cancelEdit();
    }

    onFundedByChange(value: any): void
    {
        this.fundedBy = String(value || 'Company');
    }

    onStartDateChange(value: Date): void
    {
        this.startDate = value;

        if (this.endDate && value && this.endDate < value)
        {
            this.endDate = value;
        }
    }

    onEndDateChange(value: Date): void
    {
        this.endDate = value;
    }

    onBranchScopeChange(value: any): void
    {
        this.branchScope = value === 'selected' ? 'selected' : 'all';
    }

    branchChecked(id: number): boolean
    {
        return this.branchIds.includes(id);
    }

    onBranchToggle(id: number, checked: boolean): void
    {
        this.branchIds =
            checked
                ? [...this.branchIds.filter(x => x !== id), id]
                : this.branchIds.filter(x => x !== id);
    }

    onFreeServiceText(value: string | number): void
    {
        this.freeServiceText = String(value ?? '');
    }

    onClaimDaysText(value: string | number): void
    {
        this.claimDaysText = String(value ?? '');
    }

    onTerms(value: string): void
    {
        this.terms = String(value ?? '');
    }


    //===========================================================
    // Coverage : Add Coverage card + table
    //===========================================================

    private resetPick(): void
    {
        this.pickModelId = null;

        this.pickBikeId = ALL_VALUE;

        this.pickDiscountType = this.page.channel === 'SalesCenter' ? 'Amount' : 'Percent';

        this.pickDiscountText = '';

        this.pickExcluded = false;

        this.scCategoryId = ALL_VALUE;

        this.scSubId = ALL_VALUE;

        this.scPartId = ALL_VALUE;

        this.editingIndex = -1;

        this.syncLock();

        if (this.isServiceCampaign)
        {
            this.buildScCategoryItems();
        }
    }

    // All models on the offer : both dropdowns show "All"
    private syncLock(): void
    {
        if (!this.isEditingLine && !this.pickExcluded && this.allItemsAdded)
        {
            this.pickModelId = ALL_VALUE;

            this.pickBikeId = ALL_VALUE;
        }

        this.buildBikeItems();
    }

    onPickModel(value: any): void
    {
        this.pickModelId = value === null || value === undefined || value === '' ? null : Number(value);

        // A new model : its bikes, "All" first
        this.pickBikeId = ALL_VALUE;

        this.buildBikeItems();
    }

    onPickBike(value: any): void
    {
        this.pickBikeId = value === null || value === undefined || value === '' ? ALL_VALUE : Number(value);
    }

    onPickDiscountType(value: any): void
    {
        this.pickDiscountType = value === 'Percent' ? 'Percent' : 'Amount';
    }

    onPickDiscountText(value: string | number): void
    {
        this.pickDiscountText = String(value ?? '');
    }

    // Add (or Update the row open in the card) :
    //   All Models + All Motor Bikes : one model row per model
    //   Model      + All Motor Bikes : the model row (replaces that
    //                                  model's bike rows)
    //   (any model) + one Motor Bike : a bike row (not when its
    //                                  model is covered as a whole)
    onAddLine(): void
    {
        if (!this.canEditAll)
        {
            return;
        }

        if (this.isServiceCampaign)
        {
            this.scAddLine();

            return;
        }

        if (this.pickExcluded)
        {
            this.addException();

            return;
        }

        const parent = this.parentLevel;

        const child = this.childLevel;

        if (this.itemLocked)
        {
            this.toast.info('Coverage', `Every ${parent.singular.toLowerCase()} is already on the offer : remove a row, or double-click one to edit it.`);

            return;
        }

        if (this.pickModelId === null)
        {
            this.toast.error('Coverage', `Choose the ${parent.singular.toLowerCase()} (or All ${parent.plural}) first.`);

            return;
        }

        let discountType = '';

        let discountText = '';

        if (this.isDiscount)
        {
            const value = parseNumber(this.pickDiscountText);

            if (value <= 0 || (this.pickDiscountType === 'Percent' && value > 100))
            {
                this.toast.error('Coverage', 'Enter the discount (a percent is 0 to 100).');

                return;
            }

            discountType = this.pickDiscountType;

            discountText = String(value);
        }

        const rowOf =
            (type: PromotionalTargetType, option: PromotionalOfferOption): CoverageRow =>
            ({
                Cover:type,
                TargetType:type,
                TargetId:option.Id,
                TargetName:option.Name,
                DiscountType:discountType,
                DiscountText:discountText,
                IsExcluded:false
            });

        const editing = this.editingIndex;

        // Rows except the one being edited
        let rows = this.coverage.filter((_, i) => i !== editing);

        const bikeModel =
            (r: CoverageRow): number | null =>
                r.TargetType === 'Product'
                    ? this.childOptions.find(x => x.Id === r.TargetId)?.ParentId ?? null
                    : null;

        const pickedBike = this.hasChildLevel && this.pickBikeId !== null && this.pickBikeId !== ALL_VALUE;

        let added: CoverageRow[] = [];

        if (pickedBike)
        {
            // One bike
            const bike = this.childOptions.find(x => x.Id === this.pickBikeId);

            if (!bike)
            {
                this.toast.error('Coverage', `Choose the ${child.singular.toLowerCase()} again.`);

                return;
            }

            const model = rows.find(r => r.TargetType === 'SubCategory' && r.TargetId === bike.ParentId);

            if (model)
            {
                this.toast.error('Coverage', `${model.TargetName} is already covered as a whole : remove (or edit) that row first.`);

                return;
            }

            if (rows.some(r => r.TargetType === 'Product' && r.TargetId === bike.Id))
            {
                this.toast.error('Coverage', `${bike.Name} is already on the offer.`);

                return;
            }

            added = [rowOf('Product', bike)];
        }
        else if (this.pickModelId === ALL_VALUE)
        {
            if (editing >= 0)
            {
                this.toast.error('Coverage', `A row holds one ${parent.singular.toLowerCase()} : choose it, or Cancel edit and add All ${parent.plural}.`);

                return;
            }

            // One row per model not covered yet; models with bike
            // rows keep them
            const covered = new Set(rows.filter(r => r.TargetType === 'SubCategory').map(r => r.TargetId));

            const withBikes = new Set(rows.map(bikeModel).filter(x => x != null));

            const models = this.parentOptions.filter(x => !covered.has(x.Id) && !withBikes.has(x.Id));

            const kept = this.parentOptions.filter(x => !covered.has(x.Id) && withBikes.has(x.Id)).length;

            if (models.length === 0)
            {
                this.toast.info('Coverage', kept > 0
                    ? `The other ${parent.plural.toLowerCase()} have ${child.singular.toLowerCase()} rows : edit those rows instead.`
                    : `Every ${parent.singular.toLowerCase()} is already on the offer.`);

                return;
            }

            added = models.map(x => rowOf('SubCategory', x));

            this.toast.success('Coverage',
                `${models.length} ${models.length === 1 ? parent.singular.toLowerCase() : parent.plural.toLowerCase()} added`
                + (kept > 0 ? ` (${kept} kept with their ${child.singular.toLowerCase()} rows)` : '')
                + '; edit or remove any row.');
        }
        else
        {
            // One model as a whole : its bike rows go
            const model = this.parentOptions.find(x => x.Id === this.pickModelId);

            if (!model)
            {
                this.toast.error('Coverage', `Choose the ${parent.singular.toLowerCase()} again.`);

                return;
            }

            if (rows.some(r => r.TargetType === 'SubCategory' && r.TargetId === model.Id))
            {
                this.toast.error('Coverage', `${model.Name} is already on the offer.`);

                return;
            }

            const before = rows.length;

            // (its bike exceptions stay under it)
            rows = rows.filter(r => bikeModel(r) !== model.Id || (r.IsExcluded && !r.DiscountType));

            if (rows.length < before)
            {
                this.toast.info('Coverage', `${before - rows.length} ${child.singular.toLowerCase()} row(s) of ${model.Name} replaced by the whole ${parent.singular.toLowerCase()}.`);
            }

            added = [rowOf('SubCategory', model)];
        }

        // The edited row keeps its place
        if (editing >= 0 && added.length === 1)
        {
            const at = Math.min(editing, rows.length);

            rows = [...rows.slice(0, at), added[0], ...rows.slice(at)];
        }
        else
        {
            rows = [...rows, ...added];
        }

        this.coverage = rows;

        // Keep the model and discount for the next pick (quick entry)
        this.pickBikeId = ALL_VALUE;

        this.editingIndex = -1;

        this.syncLock();
    }

    //===========================================================
    // Exceptions (owner 2026-11-13 00:48) : a model / bike left
    // out of the offer, shown in red on the Coverage table
    //   * Add Coverage with "Exception" ticked : the picked model
    //     row, bike row, or a bike of a covered model
    //   * on the table : the ban button of a row, or of a bike
    //     under an opened model row
    //===========================================================

    onPickExcluded(value: boolean): void
    {
        this.pickExcluded = !!value;

        if (!this.pickExcluded)
        {
            this.syncLock();
        }
        else if (this.pickModelId === ALL_VALUE)
        {
            this.pickModelId = null;

            this.pickBikeId = ALL_VALUE;

            this.buildBikeItems();
        }
    }

    private modelOfBike(bikeId: number | null): number | null
    {
        return this.childOptions.find(x => x.Id === bikeId)?.ParentId ?? null;
    }

    private modelRowIndex(modelId: number | null): number
    {
        return modelId == null ? -1 : this.coverage.findIndex(r => r.TargetType === 'SubCategory' && r.TargetId === modelId);
    }

    private bikeRowIndex(bikeId: number | null): number
    {
        return bikeId == null ? -1 : this.coverage.findIndex(r => r.TargetType === 'Product' && r.TargetId === bikeId);
    }

    private bikeException(bike: PromotionalOfferOption): CoverageRow
    {
        return {
            Cover:'Product',
            TargetType:'Product',
            TargetId:bike.Id,
            TargetName:bike.Name,
            DiscountType:'',
            DiscountText:'',
            IsExcluded:true
        };
    }

    private addException(): void
    {
        const parent = this.parentLevel;

        const child = this.childLevel;

        const pickedBike = this.hasChildLevel && this.pickBikeId !== null && this.pickBikeId !== ALL_VALUE;

        const pickedModel = this.pickModelId !== null && this.pickModelId !== ALL_VALUE;

        if (!pickedBike && !pickedModel)
        {
            this.toast.error('Exception', `Choose the ${parent.singular.toLowerCase()} or the ${child.singular.toLowerCase()} to leave out.`);

            return;
        }

        if (pickedBike)
        {
            const bike = this.childOptions.find(x => x.Id === this.pickBikeId);

            if (!bike)
            {
                return;
            }

            const own = this.bikeRowIndex(bike.Id);

            const model = this.modelOfBike(bike.Id);

            const modelAt = this.modelRowIndex(model);

            if (own >= 0)
            {
                if (!this.setExcluded(own, true))
                {
                    return;
                }
            }
            else if (modelAt >= 0)
            {
                if (this.coverage[modelAt].IsExcluded)
                {
                    this.toast.error('Exception', `Its ${parent.singular.toLowerCase()} is already an exception.`);

                    return;
                }

                this.coverage = [...this.coverage, this.bikeException(bike)];

                if (model != null)
                {
                    this.expandedModels.add(model);
                }
            }
            else
            {
                this.toast.error('Exception', `${bike.Name} is not on the offer : add its ${parent.singular.toLowerCase()} first.`);

                return;
            }

            this.toast.info('Exception', `${bike.Name} is left out of the offer.`);
        }
        else
        {
            const at = this.modelRowIndex(this.pickModelId);

            if (at < 0)
            {
                this.toast.error('Exception', `This ${parent.singular.toLowerCase()} is not on the offer.`);

                return;
            }

            const name = this.coverage[at].TargetName;

            if (!this.setExcluded(at, true))
            {
                return;
            }

            this.toast.info('Exception', `${name} is left out of the offer.`);
        }

        this.pickBikeId = ALL_VALUE;
    }

    // Row exception on / off (the row stays, in red). A model row
    // made an exception drops its own bike exceptions.
    private setExcluded(index: number, excluded: boolean): boolean
    {
        const row = this.coverage[index];

        if (!row)
        {
            return false;
        }

        // A bike exception under a covered model : back on = removed
        // (the model row covers it again)
        if (!excluded
            && row.TargetType === 'Product'
            && !row.DiscountType
            && this.modelRowIndex(this.modelOfBike(row.TargetId)) >= 0)
        {
            this.coverage = this.coverage.filter((_, i) => i !== index);

            this.fixEditingIndex(index);

            return true;
        }

        let discountType = row.DiscountType;

        let discountText = row.DiscountText;

        if (!excluded && this.isDiscount && row.TargetType !== 'Model' && (!discountType || parseNumber(discountText) <= 0))
        {
            // Back on the offer : it needs its discount
            const value = parseNumber(this.pickDiscountText);

            if (value <= 0 || (this.pickDiscountType === 'Percent' && value > 100))
            {
                this.toast.error('Coverage', `Enter the discount in Add Coverage first : ${row.TargetName} gets it back on the offer.`);

                return false;
            }

            discountType = this.pickDiscountType;

            discountText = String(value);
        }

        const editing = this.editingIndex >= 0 ? this.coverage[this.editingIndex] : null;

        this.coverage =
            this.coverage
                .map((r, i) => i === index ? { ...r, IsExcluded:excluded, DiscountType:discountType, DiscountText:discountText } : r)
                .filter
                (
                    r =>
                        !(excluded
                          && row.TargetType === 'SubCategory'
                          && r.TargetType === 'Product'
                          && r.IsExcluded
                          && this.modelOfBike(r.TargetId) === row.TargetId)
                );

        if (editing)
        {
            this.editingIndex = this.coverage.findIndex(r => r.TargetType === editing.TargetType && r.TargetId === editing.TargetId);
        }

        return true;
    }

    private fixEditingIndex(removed: number): void
    {
        if (this.editingIndex === removed)
        {
            this.editingIndex = -1;
        }
        else if (this.editingIndex > removed)
        {
            this.editingIndex--;
        }
    }

    toggleRowExcluded(index: number, event?: Event): void
    {
        event?.stopPropagation();

        if (!this.canEditAll)
        {
            return;
        }

        const row = this.coverage[index];

        if (row)
        {
            this.setExcluded(index, !row.IsExcluded);

            this.syncLock();
        }
    }

    // Table rows : bike exceptions of a listed model show under it
    get displayRows(): { row:CoverageRow; index:number }[]
    {
        return this.coverage
            .map((row, index) => ({ row, index }))
            .filter
            (
                x =>
                    !(x.row.TargetType === 'Product'
                      && x.row.IsExcluded
                      && !x.row.DiscountType
                      && this.modelRowIndex(this.modelOfBike(x.row.TargetId)) >= 0)
            );
    }

    hasBikes(row: CoverageRow): boolean
    {
        return this.hasChildLevel && row.TargetType === 'SubCategory' && this.bikesOf(row.TargetId).length > 0;
    }

    bikesOf(modelId: number | null): PromotionalOfferOption[]
    {
        return modelId == null ? [] : this.childOptions.filter(x => x.ParentId === modelId);
    }

    isExpanded(row: CoverageRow): boolean
    {
        return row.TargetId != null && this.expandedModels.has(row.TargetId);
    }

    toggleExpand(row: CoverageRow, event?: Event): void
    {
        event?.stopPropagation();

        if (row.TargetId == null || !this.hasBikes(row))
        {
            return;
        }

        if (this.expandedModels.has(row.TargetId))
        {
            this.expandedModels.delete(row.TargetId);
        }
        else
        {
            this.expandedModels.add(row.TargetId);
        }
    }

    // A bike under an opened model row is out of the offer
    bikeExcluded(modelRow: CoverageRow, bikeId: number): boolean
    {
        if (modelRow.IsExcluded)
        {
            return true;
        }

        const at = this.bikeRowIndex(bikeId);

        return at >= 0 && this.coverage[at].IsExcluded;
    }

    exceptionsOf(row: CoverageRow): number
    {
        return this.coverage.filter(r => r.TargetType === 'Product' && r.IsExcluded && this.modelOfBike(r.TargetId) === row.TargetId).length;
    }

    toggleBike(modelRow: CoverageRow, bike: PromotionalOfferOption, event?: Event): void
    {
        event?.stopPropagation();

        if (!this.canEditAll || modelRow.IsExcluded)
        {
            return;
        }

        const at = this.bikeRowIndex(bike.Id);

        if (at >= 0)
        {
            this.coverage = this.coverage.filter((_, i) => i !== at);

            this.fixEditingIndex(at);

            return;
        }

        this.coverage = [...this.coverage, this.bikeException(bike)];
    }

    bikeDiscount(modelRow: CoverageRow, bikeId: number): string
    {
        return this.bikeExcluded(modelRow, bikeId) ? 'Excluded' : this.rowDiscount(modelRow);
    }


    //===========================================================
    // Service Campaign (Service Center, owner 2026-11-13 01:56)
    //   * Free Service (labour / service charge only) and / or a
    //     parts discount; taken only within the offer dates; never
    //     uses a membership or scheduled free service
    //   * Eligible Models : no row = every customer; All Models =
    //     one row per model; a model can be an exception
    //   * Parts : All Parts / Category / Sub Category / Part rows,
    //     each with its discount, and exceptions
    //===========================================================

    get isServiceCampaign(): boolean
    {
        return this.offerType === SERVICE_CAMPAIGN;
    }

    get modelRowCount(): number
    {
        return this.coverage.filter(r => r.TargetType === 'Model').length;
    }

    get eligibleText(): string
    {
        const rows = this.coverage.filter(r => r.TargetType === 'Model');

        if (rows.length === 0)
        {
            return 'Every customer';
        }

        const covered = rows.filter(r => !r.IsExcluded).length;

        return covered === 0
            ? `Every customer except ${rows.length} model(s)`
            : `${covered} model(s)${rows.length > covered ? ` · ${rows.length - covered} excluded` : ''}`;
    }

    // The table rows of the screen (Service Campaign) / all rows
    get tableRows(): { row:CoverageRow; index:number }[]
    {
        const rows = this.displayRows;

        if (!this.isServiceCampaign)
        {
            return rows;
        }

        return rows.filter(x => (x.row.TargetType === 'Model') === (this.scStep === 1));
    }

    get tableTitle(): string
    {
        if (!this.isServiceCampaign)
        {
            return 'Coverage';
        }

        return this.scStep === 1 ? 'Bikes : Eligible Models' : 'Parts : Discounts';
    }

    get tableCount(): string
    {
        if (!this.isServiceCampaign)
        {
            return this.coverageCount;
        }

        if (this.scStep === 1)
        {
            return this.eligibleText;
        }

        const parts = this.coverage.filter(r => r.TargetType !== 'Model');

        const covered = parts.filter(r => !r.IsExcluded).length;

        const excluded = parts.length - covered;

        return `${covered} ${covered === 1 ? 'row' : 'rows'}${excluded ? ` · ${excluded} exception${excluded === 1 ? '' : 's'}` : ''}`;
    }

    get tableEmptyText(): string
    {
        if (!this.isServiceCampaign)
        {
            return 'Nothing covered yet. Pick in Add Coverage (left) and press Add. Double-click a row to edit it.';
        }

        return this.scStep === 1
            ? 'No model chosen : the campaign is for every customer. Add models (left) to limit it.'
            : 'No parts discount. Add parts rows (left), or leave it empty for a free service only campaign.';
    }

    onScStep(step: 1 | 2): void
    {
        if (this.scStep === step)
        {
            return;
        }

        this.resetPick();

        this.scStep = step;
    }

    onFreeServiceOn(value: boolean): void
    {
        this.freeServiceOn = !!value;
    }

    private get scTypeName(): string
    {
        return PRODUCT_TYPES.find(x => x.id === this.scTypeId)?.name ?? 'Spare Parts';
    }

    // The chosen type's categories / sub categories / parts
    private get typeCategories(): PromotionalOfferOption[]
    {
        return this.categoryOptions.filter(x => (x.Note ?? '') === this.scTypeName);
    }

    private get typeSubs(): PromotionalOfferOption[]
    {
        const categories = new Set(this.typeCategories.map(x => x.Id));

        return this.parentOptions.filter(x => x.ParentId != null && categories.has(x.ParentId));
    }

    // The product type of a parts row ('' when unknown)
    rowPartType(row: CoverageRow): string
    {
        if (row.TargetType === 'Model' || row.TargetType === 'All')
        {
            return '';
        }

        let category: number | null | undefined = null;

        if (row.TargetType === 'ProductType')
        {
            return PRODUCT_TYPES.find(x => x.id === row.TargetId)?.row ?? '';
        }

        if (row.TargetType === 'Category')
        {
            category = row.TargetId;
        }
        else if (row.TargetType === 'SubCategory')
        {
            category = this.parentOptions.find(x => x.Id === row.TargetId)?.ParentId;
        }
        else if (row.TargetType === 'Product')
        {
            const sub = this.childOptions.find(x => x.Id === row.TargetId)?.ParentId;

            category = this.parentOptions.find(x => x.Id === sub)?.ParentId;
        }

        const type = this.categoryOptions.find(x => x.Id === category)?.Note ?? '';

        return PRODUCT_TYPES.find(x => x.name === type)?.row ?? '';
    }

    onScType(value: any): void
    {
        const id = Number(value);

        this.scTypeId = PRODUCT_TYPES.some(x => x.id === id) ? id : 1;

        this.scCategoryId = ALL_VALUE;

        this.scSubId = ALL_VALUE;

        this.scPartId = ALL_VALUE;

        this.buildScCategoryItems();
    }

    private buildScCategoryItems(): void
    {
        this.scCategoryItems =
        [
            { label:'All Categories', value:ALL_VALUE },
            ...this.typeCategories.map(x => ({ label:x.Name, value:x.Id }))
        ];

        this.buildScSubItems();
    }

    private buildServiceChoices(): void
    {
        this.categoryOptions = this.ofBrand(this.defaults?.Categories ?? []);

        this.bikeModelOptions = this.ofBrand(this.defaults?.BikeModels ?? []);

        this.eligModelItems =
        [
            { label:'All Models', value:ALL_VALUE },
            ...this.bikeModelOptions.map(x => ({ label:x.Name, value:x.Id }))
        ];

        this.buildScCategoryItems();
    }

    private buildScSubItems(): void
    {
        const category = this.scCategoryId;

        const subs =
            category != null && category !== ALL_VALUE
                ? this.parentOptions.filter(x => x.ParentId === category)
                : this.typeSubs;

        this.scSubItems =
        [
            { label:'All Sub Categories', value:ALL_VALUE },
            ...subs.map(x => ({ label:x.Name, value:x.Id }))
        ];

        this.buildScPartItems();
    }

    private buildScPartItems(): void
    {
        const sub = this.scSubId;

        const category = this.scCategoryId;

        let parts = this.childOptions;

        if (sub != null && sub !== ALL_VALUE)
        {
            parts = parts.filter(x => x.ParentId === sub);
        }
        else
        {
            const subs =
                new Set(
                    (category != null && category !== ALL_VALUE
                        ? this.parentOptions.filter(x => x.ParentId === category)
                        : this.typeSubs).map(x => x.Id));

            parts = parts.filter(x => x.ParentId != null && subs.has(x.ParentId));
        }

        this.scPartItems =
        [
            { label:`All ${this.scTypeName}`, value:ALL_VALUE },
            ...parts.map(x => ({ label:x.Name, value:x.Id }))
        ];
    }

    onScCategory(value: any): void
    {
        this.scCategoryId = value === null || value === undefined || value === '' ? ALL_VALUE : Number(value);

        this.scSubId = ALL_VALUE;

        this.scPartId = ALL_VALUE;

        this.buildScSubItems();
    }

    onScSub(value: any): void
    {
        this.scSubId = value === null || value === undefined || value === '' ? ALL_VALUE : Number(value);

        this.scPartId = ALL_VALUE;

        this.buildScPartItems();
    }

    onScPart(value: any): void
    {
        this.scPartId = value === null || value === undefined || value === '' ? ALL_VALUE : Number(value);
    }

    onEligModel(value: any): void
    {
        this.eligModelId = value === null || value === undefined || value === '' ? null : Number(value);
    }

    // The most specific level picked : Part > Sub Category >
    // Category > All Parts
    private scPicked(): { type:PromotionalTargetType; id:number | null; name:string }
    {
        if (this.scPartId != null && this.scPartId !== ALL_VALUE)
        {
            return { type:'Product', id:this.scPartId, name:this.childOptions.find(x => x.Id === this.scPartId)?.Name ?? '' };
        }

        if (this.scSubId != null && this.scSubId !== ALL_VALUE)
        {
            return { type:'SubCategory', id:this.scSubId, name:this.parentOptions.find(x => x.Id === this.scSubId)?.Name ?? '' };
        }

        if (this.scCategoryId != null && this.scCategoryId !== ALL_VALUE)
        {
            return { type:'Category', id:this.scCategoryId, name:this.categoryOptions.find(x => x.Id === this.scCategoryId)?.Name ?? '' };
        }

        // Nothing below the type : all of the type
        return { type:'ProductType', id:this.scTypeId, name:`All ${this.scTypeName}` };
    }

    private sameTarget(r: CoverageRow, type: PromotionalTargetType, id: number | null): boolean
    {
        return r.TargetType === type && (type === 'All' || r.TargetId === id);
    }

    // Add Coverage (Service Campaign) : a parts row / exception
    private scAddLine(): void
    {
        const picked = this.scPicked();

        const at = this.coverage.findIndex(r => this.sameTarget(r, picked.type, picked.id));

        if (this.pickExcluded)
        {
            if (picked.type === 'All' || picked.type === 'ProductType')
            {
                this.toast.error('Exception', 'Choose the category, sub category or part to leave out.');

                return;
            }

            if (at >= 0)
            {
                this.setExcluded(at, true);
            }
            else
            {
                this.coverage =
                [
                    ...this.coverage,
                    { Cover:picked.type, TargetType:picked.type, TargetId:picked.id, TargetName:picked.name, DiscountType:'', DiscountText:'', IsExcluded:true }
                ];
            }

            this.toast.info('Exception', `${picked.name} is left out of the parts discount.`);

            this.scPartId = ALL_VALUE;

            return;
        }

        const value = parseNumber(this.pickDiscountText);

        if (value <= 0 || (this.pickDiscountType === 'Percent' && value > 100))
        {
            this.toast.error('Coverage', 'Enter the parts discount (a percent is 0 to 100).');

            return;
        }

        const row: CoverageRow =
        {
            Cover:picked.type,
            TargetType:picked.type,
            TargetId:picked.id,
            TargetName:picked.name,
            DiscountType:this.pickDiscountType,
            DiscountText:String(value),
            IsExcluded:false
        };

        const editing = this.editingIndex;

        if (at >= 0 && at !== editing)
        {
            this.toast.error('Coverage', `${picked.name || 'All Parts'} is already on the offer : double-click its row to change it.`);

            return;
        }

        if (editing >= 0)
        {
            this.coverage = this.coverage.map((r, i) => i === editing ? row : r);
        }
        else
        {
            this.coverage = [...this.coverage, row];
        }

        this.resetPick();
    }

    // Eligible Models : All Models = one row per model
    onAddModel(): void
    {
        if (!this.canEditAll)
        {
            return;
        }

        if (this.eligModelId === null)
        {
            this.toast.error('Eligible Models', 'Choose a model or All Models.');

            return;
        }

        const listed = new Set(this.coverage.filter(r => r.TargetType === 'Model').map(r => r.TargetId));

        const models =
            this.eligModelId === ALL_VALUE
                ? this.bikeModelOptions.filter(x => !listed.has(x.Id))
                : this.bikeModelOptions.filter(x => x.Id === this.eligModelId && !listed.has(x.Id));

        if (models.length === 0)
        {
            this.toast.info('Eligible Models', this.eligModelId === ALL_VALUE ? 'Every model is already listed.' : 'This model is already listed.');

            return;
        }

        const rows: CoverageRow[] =
            models.map
            (
                x =>
                ({
                    Cover:'Model',
                    TargetType:'Model',
                    TargetId:x.Id,
                    TargetName:x.Name,
                    DiscountType:'',
                    DiscountText:'',
                    IsExcluded:false
                })
            );

        const editing = this.editingIndex >= 0 ? this.coverage[this.editingIndex] : null;

        // Model rows first on the table
        const firstPart = this.coverage.findIndex(r => r.TargetType !== 'Model');

        this.coverage =
            firstPart < 0
                ? [...this.coverage, ...rows]
                : [...this.coverage.slice(0, firstPart), ...rows, ...this.coverage.slice(firstPart)];

        if (editing)
        {
            this.editingIndex = this.coverage.indexOf(editing);
        }

        this.eligModelId = null;
    }


    // Double-click a row : it opens in the Add Coverage card
    editLine(index: number): void
    {
        if (!this.canEditAll)
        {
            return;
        }

        const row = this.coverage[index];

        if (row && this.isServiceCampaign)
        {
            // Parts rows open in Add Coverage; model rows have
            // nothing to edit
            if (row.TargetType === 'Model')
            {
                return;
            }

            this.editingIndex = index;

            this.pickExcluded = false;

            const rowType = row.TargetType === 'ProductType'
                ? PRODUCT_TYPES.find(x => x.id === row.TargetId)
                : PRODUCT_TYPES.find(x => x.row === this.rowPartType(row));

            this.scTypeId = rowType?.id ?? 1;

            this.buildScCategoryItems();

            if (row.TargetType === 'Product')
            {
                const sub = this.childOptions.find(x => x.Id === row.TargetId)?.ParentId ?? null;

                this.scCategoryId = this.parentOptions.find(x => x.Id === sub)?.ParentId ?? ALL_VALUE;

                this.buildScSubItems();

                this.scSubId = sub ?? ALL_VALUE;

                this.buildScPartItems();

                this.scPartId = row.TargetId;
            }
            else if (row.TargetType === 'SubCategory')
            {
                this.scCategoryId = this.parentOptions.find(x => x.Id === row.TargetId)?.ParentId ?? ALL_VALUE;

                this.buildScSubItems();

                this.scSubId = row.TargetId;

                this.buildScPartItems();

                this.scPartId = ALL_VALUE;
            }
            else
            {
                this.scCategoryId = row.TargetType === 'Category' ? row.TargetId : ALL_VALUE;

                this.buildScSubItems();
            }

            if (row.DiscountType)
            {
                this.pickDiscountType = row.DiscountType;

                this.pickDiscountText = row.DiscountText;
            }

            return;
        }

        if (!row || row.TargetType === 'All' || row.TargetType === 'Category')
        {
            return;
        }

        this.editingIndex = index;

        if (row.TargetType === 'Product')
        {
            this.pickModelId = this.childOptions.find(x => x.Id === row.TargetId)?.ParentId ?? ALL_VALUE;

            this.buildBikeItems();

            this.pickBikeId = row.TargetId;
        }
        else
        {
            this.pickModelId = row.TargetId;

            this.buildBikeItems();

            this.pickBikeId = ALL_VALUE;
        }

        if (row.DiscountType)
        {
            this.pickDiscountType = row.DiscountType;

            this.pickDiscountText = row.DiscountText;
        }
    }

    cancelEdit(): void
    {
        if (this.isServiceCampaign)
        {
            this.resetPick();

            return;
        }

        this.pickBikeId = ALL_VALUE;

        if (this.pickModelId === ALL_VALUE || this.isEditingLine)
        {
            this.pickModelId = null;
        }

        this.editingIndex = -1;

        this.syncLock();
    }

    removeLine(index: number, event?: Event): void
    {
        event?.stopPropagation();

        const removed = this.coverage[index];

        const editing = this.editingIndex >= 0 ? this.coverage[this.editingIndex] : null;

        // A model row takes its bike exceptions with it
        this.coverage =
            this.coverage.filter
            (
                (r, i) =>
                    i !== index
                    && !(removed?.TargetType === 'SubCategory'
                         && r.TargetType === 'Product'
                         && r.IsExcluded
                         && !r.DiscountType
                         && this.modelOfBike(r.TargetId) === removed.TargetId)
            );

        this.editingIndex =
            editing && editing !== removed
                ? this.coverage.indexOf(editing)
                : -1;

        if (!this.allItemsAdded && this.pickModelId === ALL_VALUE && !this.isEditingLine)
        {
            this.pickModelId = null;
        }

        this.syncLock();
    }

    clearCoverage(): void
    {
        const screen = this.isServiceCampaign ? (this.scStep === 1 ? 'eligible model' : 'parts') : 'coverage';

        this.confirm.open(
            'Clear Coverage',
            `Remove every ${screen} row?`,
            () =>
            {
                this.coverage =
                    this.isServiceCampaign
                        ? this.coverage.filter(r => (r.TargetType === 'Model') !== (this.scStep === 1))
                        : [];

                this.expandedModels.clear();

                this.editingIndex = -1;

                this.pickModelId = null;

                this.syncLock();

                this.cdr.detectChanges();
            },
            'Remove',
            'Cancel',
            'danger'
        );
    }


    //===========================================================
    // Prizes (Scratch Card / SMS Offer)
    //===========================================================

    addPrize(): void
    {
        this.prizes =
        [
            ...this.prizes,
            { PrizeName:'', PrizeKind:'Cash', ValueText:'', QuantityText:'', GivenQuantity:0 }
        ];
    }

    removePrize(index: number): void
    {
        this.prizes = this.prizes.filter((_, i) => i !== index);
    }

    onPrizeText(prize: PrizeRow, field: 'PrizeName' | 'ValueText' | 'QuantityText', event: Event): void
    {
        prize[field] = (event.target as HTMLInputElement).value;
    }

    onPrizeKind(prize: PrizeRow, value: any): void
    {
        prize.PrizeKind = String(value || 'Cash');
    }

    prizeLeft(prize: PrizeRow): string
    {
        const quantity = parseNumber(prize.QuantityText);

        return quantity > 0
            ? String(Math.max(0, quantity - prize.GivenQuantity))
            : 'No limit';
    }


    //===========================================================
    // Model for the API (the offer-wide discount stays 0 : every
    // coverage row carries its own)
    //===========================================================

    private toModel(): SavePromotionalOffer
    {
        return {
            OfferName:this.offerName.trim(),
            OfferType:this.offerType,
            BrandManagementId:this.brandId,
            FundedBy:this.fundedBy,
            StartDate:dateToIso(this.startDate),
            EndDate:dateToIso(this.endDate),
            AllBranches:!this.branchChoice || this.branchScope === 'all',
            BranchIds:!this.branchChoice || this.branchScope === 'all' ? [] : [...this.branchIds],
            DiscountType:'Percent',
            DiscountValue:0,
            // Service Campaign : one free service per bike, never more
            FreeServiceCount:
                this.isServiceCampaign
                    ? 1
                    : this.isFreeService
                        ? parseNumber(this.freeServiceText)
                        : 0,
            ClaimDays:this.isFreeService ? parseNumber(this.claimDaysText) : 0,
            Terms:this.terms.trim(),
            Targets:
                this.coverage.map
                (
                    r =>
                    ({
                        TargetType:r.TargetType,
                        TargetId:r.TargetType === 'All' ? 0 : Number(r.TargetId ?? 0),
                        TargetName:'',
                        DiscountType:this.isDiscount && !r.IsExcluded && r.TargetType !== 'Model' ? r.DiscountType : '',
                        DiscountValue:this.isDiscount && !r.IsExcluded && r.TargetType !== 'Model' && r.DiscountType ? parseNumber(r.DiscountText) : null,
                        IsExcluded:r.IsExcluded
                    })
                ),
            Prizes:
                this.hasPrizes
                    ? this.prizes
                        .filter(p => p.PrizeName.trim())
                        .map
                        (
                            p =>
                            ({
                                PrizeName:p.PrizeName.trim(),
                                PrizeKind:p.PrizeKind,
                                PrizeValue:parseNumber(p.ValueText),
                                Quantity:Math.trunc(parseNumber(p.QuantityText)),
                                GivenQuantity:p.GivenQuantity
                            })
                        )
                    : []
        };
    }

    private snapshot(): string
    {
        return JSON.stringify(this.toModel());
    }

    get hasChanges(): boolean
    {
        return !this.isViewMode && !this.loading && this.snapshot() !== this.original;
    }

    // First problem; '' = fine
    private check(): string
    {
        const m = this.toModel();

        if (!m.OfferName)
        {
            return 'Enter the offer name.';
        }

        if (!m.StartDate || !m.EndDate)
        {
            return 'Enter the start and end dates.';
        }

        if (m.EndDate < m.StartDate)
        {
            return 'The end date cannot be before the start date.';
        }

        if (this.lineBranches.length === 0)
        {
            return `No branch runs ${this.lineText} today (Business Configuration).`;
        }

        if (this.branchChoice && this.branchScope === 'selected' && m.BranchIds.length === 0)
        {
            return `Choose at least one branch, or all ${this.lineText} branches.`;
        }

        if (this.status !== 'Draft')
        {
            return '';
        }

        if (m.FundedBy === 'Distributor' && !m.BrandManagementId)
        {
            return 'A distributor-funded offer needs its brand.';
        }

        if (this.isFreeService && (m.FreeServiceCount < 1 || m.FreeServiceCount > 50))
        {
            return 'Enter how many free services (1 to 50).';
        }

        if (this.isServiceCampaign)
        {
            // The free service is fixed (one per bike) : parts are
            // optional
        }
        else if (!this.coverage.some(r => !r.IsExcluded))
        {
            return 'Add at least one coverage row (what the offer covers).';
        }

        const empty = this.coverage.findIndex(r => r.TargetType !== 'All' && !r.TargetId);

        if (empty >= 0)
        {
            return `Coverage row ${empty + 1} : choose its ${this.coverages.find(x => x.type === this.coverage[empty].Cover)?.singular.toLowerCase() ?? 'item'} again (the brand changed).`;
        }

        if (this.isDiscount)
        {
            const missing = this.coverage.findIndex(r => !r.IsExcluded && r.TargetType !== 'Model' && (!r.DiscountType || parseNumber(r.DiscountText) <= 0));

            if (missing >= 0)
            {
                return `Coverage row ${missing + 1} : enter its discount (double-click the row).`;
            }
        }

        if (this.hasPrizes && m.Prizes.length === 0)
        {
            return 'Add at least one prize.';
        }

        return '';
    }


    //===========================================================
    // Save / Update
    //===========================================================

    onSave(): void
    {
        if (this.progress.busy || this.loading || this.isViewMode)
        {
            return;
        }

        const problem = this.check();

        if (problem)
        {
            this.toast.error('Validation', problem);

            this.cdr.detectChanges();

            return;
        }

        const model = this.toModel();

        const adding = this.isAddMode;

        this.progress
            .run<any>(
                adding ? 'Saving Offer' : 'Updating Offer',
                adding ? 'Please wait while the offer and its ledger are being saved...' : 'Please wait while the offer is being updated...',
                adding ? 'Offer saved.' : 'Offer updated.',
                adding
                    ? this.service.create(this.page.apiPath, model)
                    : this.service.update(this.page.apiPath, this.publicId, model))
            .subscribe
            ({
                next:
                    (result: any) =>
                    {
                        this.original = this.snapshot();

                        this.toast.success(
                            'Success',
                            adding
                                ? `Offer ${result?.OfferNo ?? ''} saved as Draft.`
                                : `Offer ${result?.OfferNo ?? this.saved?.OfferNo ?? ''} updated.`);

                        this.goToList();
                    },
                error:
                    error =>
                        this.toast.error(adding ? 'Save Failed' : 'Update Failed', this.errorText(error, 'The offer could not be saved.'))
            });
    }


    //===========================================================
    // Activate (View of a Draft)
    //===========================================================

    onActivate(): void
    {
        const offer = this.saved;

        if (!offer || this.progress.busy)
        {
            return;
        }

        this.confirm.open(
            'Activate Offer',
            `Activate ${offer.OfferNo} ${offer.OfferName}? `
                + (this.isDiscount
                    ? 'Invoices of the period apply it automatically (the better of offer or membership).'
                    : 'Staff can record it on invoices of the period.'),
            () =>
                setTimeout(
                    () =>
                        this.progress
                            .run<any>(
                                'Activating Offer',
                                `Please wait while ${offer.OfferNo} is being activated...`,
                                'Offer activated.',
                                this.service.activate(this.page.apiPath, offer.PublicId))
                            .subscribe
                            ({
                                next:
                                    () =>
                                    {
                                        this.toast.success('Activate Successful', `Offer ${offer.OfferNo} is active.`);

                                        this.goToList();
                                    },
                                error:
                                    error =>
                                    {
                                        this.toast.error('Activate Failed', this.errorText(error, 'The offer could not be activated.'));

                                        this.loadEntity();
                                    }
                            })),
            'Activate',
            'Cancel',
            'primary'
        );
    }


    //===========================================================
    // Clear / Back
    //===========================================================

    onClear(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        if (this.isEditMode && this.saved)
        {
            this.fill(this.saved);

            this.cdr.detectChanges();

            return;
        }

        this.resetEntity();

        this.cdr.detectChanges();
    }

    onBackToList(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        if (!this.hasChanges)
        {
            this.goToList();

            return;
        }

        this.confirm.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () => this.goToList(),
            'Leave',
            'Stay',
            'primary'
        );
    }

    private goToList(): void
    {
        void this.router.navigate(['list'], { relativeTo:this.route.parent });
    }


    //===========================================================
    // Helpers
    //===========================================================

    private errorText(error: unknown, fallback: string): string
    {
        const e = error as HttpErrorResponse;

        return e?.error?.message
            || (typeof e?.error === 'string' ? e.error : '')
            || fallback;
    }
}
