//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    DestroyRef,
    OnInit,
    inject
}
from '@angular/core';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

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
    Observable,
    switchMap,
    tap
}
from 'rxjs';

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

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
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    OrbitLoaderComponent
}
from '../../../../../../shared/components/utilities/orbit-loader/orbit-loader';

import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

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

import
{
    ProgressRunner
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-runner';

import
{
    EmptyStateComponent
}
from '../../../../../../shared/components/layout/empty-state/empty-state';

import
{
    HistoryDrawerComponent
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer';

import
{
    PRODUCT_PRICING_MB_ROUTE,
    PriceCard,
    PriceCardCost,
    PriceCardDefaults,
    PriceCardLineInput,
    PriceCardSaved,
    SavePriceCard,
    priceCardDate,
    priceCardVatRate,
    roundMoney
}
from '../../../models/product-pricing-motor-bikes.model';

import
{
    ProductPricingMotorBikesService
}
from '../../../services/product-pricing-motor-bikes.service';

import
{
    errorText,
    toHistoryItem
}
from '../list/product-pricing-motor-bikes-list';


// A colour of a model on the card : it takes the model price
// unless it has its own (a colour exception)
interface ColourLine
{
    MotorBikeId:
        number;
    ProductCode:
        string;
    ProductName:
        string;
    ColorName:
        string;
    // true = a colour exception (Dp / Mrp below); false = model price
    Own:
        boolean;
    Dp:
        number;
    Mrp:
        number;
    // The price of the card in force before this one (0 = none)
    OldDp:
        number;
    OldMrp:
        number;
}

// A model on the card : its DP / MRP for every colour
interface CardLine
{
    ModelId:
        number;
    ModelName:
        string;
    Dp:
        number;
    Mrp:
        number;
    OldDp:
        number;
    OldMrp:
        number;
    // Colours shown under the model
    Open:
        boolean;
    Colours:
        ColourLine[];
}

// DP / MRP of a model or a colour
interface PricePair
{
    Dp:
        number;
    Mrp:
        number;
}


//===============================================================
// Product Pricing - Motor Bikes form : one price card.
//   Regular  : from Effective From until a later Regular card
//   Campaign : Effective From .. To, wins inside its dates
// Each model : DP (real payable) and MRP (VAT inclusive) for
// every colour; a colour may have its own price (an exception);
// commission = MRP - DP. Saved as a draft, then posted; a posted
// card is not changed (a new card replaces it, or it is cancelled).
//===============================================================

@Component(
{
    selector:'app-product-pricing-motor-bikes-form',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        TextboxComponent,
        TextareaComponent,
        ToastComponent,
        OrbitLoaderComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        HistoryDrawerComponent,
        EmptyStateComponent
    ],

    templateUrl:'./product-pricing-motor-bikes-form.html',

    styleUrl:'./product-pricing-motor-bikes-form.css'
})

export class ProductPricingMotorBikesForm
    implements OnInit
{
    private readonly service =
        inject(ProductPricingMotorBikesService);

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly toast =
        inject(ToastService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly destroyRef =
        inject(DestroyRef);

    readonly progress =
        new ProgressRunner(inject(ProgressDialogService), () => this.cdr.detectChanges());

    readonly pageTitle =
        'Product Pricing - Motor Bikes';

    //===========================================================
    // State
    //===========================================================

    mode:
        'add' | 'edit' | 'view' = 'add';

    private publicId:
        string = '';

    doc:
        PriceCard | null = null;

    defaults:
        PriceCardDefaults | null = null;

    loading:
        boolean = false;

    loadingCurrent:
        boolean = false;

    // Last purchase cost (card's supplier) and stock per colour
    costs:
        Map<number, PriceCardCost> = new Map();

    private costSupplier:
        string = '';

    //===========================================================
    // Card
    //===========================================================

    supplierCode:
        string = '';

    cardType:
        string = 'Regular';

    fromDate:
        Date = new Date();

    toDate:
        Date = new Date();

    reference:
        string = '';

    remarks:
        string = '';

    lines:
        CardLine[] = [];

    // The model picked in the Add box
    pickId:
        number | null = null;

    // Lines filter
    filterText:
        string = '';

    //===========================================================
    // Cancel / history
    //===========================================================

    cancelOpen:
        boolean = false;

    cancelReason:
        string = '';

    historyOpened:
        boolean = false;

    historyItems:
        any[] = [];

    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        this.publicId =
            String(this.route.snapshot.paramMap.get('id') ?? '');

        if (this.publicId)
        {
            this.mode = /\/view\//.test(this.router.url) ? 'view' : 'edit';
        }

        this.loading = true;

        this.service
            .getDefaults()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    defaults =>
                    {
                        this.defaults = defaults;

                        if (this.publicId)
                        {
                            this.loadCard();

                            return;
                        }

                        this.fromDate = fromIso(defaults.Today) ?? new Date();

                        this.toDate = this.fromDate;

                        if (defaults.Suppliers.length === 1)
                        {
                            this.supplierCode = defaults.Suppliers[0].SupplierCode;

                            this.loadCosts();

                            this.prefill();
                        }

                        this.loading = false;

                        this.cdr.detectChanges();
                    },

                error:
                    err =>
                    {
                        this.loading = false;

                        this.toast.error(this.pageTitle, errorText(err, 'Failed to load the suppliers and models.'));

                        this.cdr.detectChanges();
                    }
            });
    }

    private loadCard():
        void
    {
        this.loading = true;

        this.service
            .getById(this.publicId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    card =>
                    {
                        this.setCard(card);

                        this.loadCosts();

                        if (this.mode === 'edit' && card.Status !== 'Draft')
                        {
                            this.mode = 'view';

                            this.toast.info('Edit Not Allowed', `${card.CardNo} is ${card.Status}; it opens to view.`);
                        }

                        this.loading = false;

                        this.cdr.detectChanges();
                    },

                error:
                    err =>
                    {
                        this.loading = false;

                        this.toast.error(this.pageTitle, errorText(err, 'Failed to load the price card.'));

                        this.cdr.detectChanges();
                    }
            });
    }

    private setCard
    (
        card:
            PriceCard
    ):
        void
    {
        this.doc = card;

        this.supplierCode = card.SupplierCode;

        this.cardType = card.CardType || 'Regular';

        this.fromDate = fromIso(card.EffectiveFrom) ?? new Date();

        this.toDate = fromIso(card.EffectiveTo) ?? this.fromDate;

        this.reference = card.Reference;

        this.remarks = card.Remarks;

        const lines:
            CardLine[] = [];

        for (const x of card.Lines.filter(l => !l.IsException))
        {
            const line =
                this.newLine(x.ModelId, x.ModelName);

            line.Dp = x.Dp;

            line.Mrp = x.Mrp;

            for (const e of card.Lines.filter(l => l.IsException && l.ModelId === x.ModelId))
            {
                let colour =
                    line.Colours.find(c => c.MotorBikeId === e.MotorBikeId);

                // A colour no longer set up : still shown
                if (!colour)
                {
                    colour =
                    {
                        MotorBikeId:e.MotorBikeId,
                        ProductCode:e.ProductCode,
                        ProductName:e.ProductName,
                        ColorName:'',
                        Own:false,
                        Dp:0,
                        Mrp:0,
                        OldDp:0,
                        OldMrp:0
                    };

                    line.Colours.push(colour);
                }

                colour.Own = true;

                colour.Dp = e.Dp;

                colour.Mrp = e.Mrp;
            }

            line.Open = line.Colours.some(c => c.Own);

            lines.push(line);
        }

        this.lines = lines;
    }

    // A model line with every colour of the model (model price)
    private newLine
    (
        modelId:
            number,
        modelName:
            string
    ):
        CardLine
    {
        const colours =
            (this.defaults?.Products ?? [])
                .filter(p => p.ModelId === modelId)
                .map
                (
                    p =>
                    ({
                        MotorBikeId:p.MotorBikeId,
                        ProductCode:p.ProductCode,
                        ProductName:p.ProductName,
                        ColorName:p.ColorName,
                        Own:false,
                        Dp:0,
                        Mrp:0,
                        OldDp:0,
                        OldMrp:0
                    })
                );

        return {
            ModelId:modelId,
            ModelName:modelName || this.modelName(modelId),
            Dp:0,
            Mrp:0,
            OldDp:0,
            OldMrp:0,
            Open:false,
            Colours:colours
        };
    }

    //===========================================================
    // Mode
    //===========================================================

    get isView():
        boolean
    {
        return this.mode === 'view';
    }

    get statusText():
        string
    {
        return this.doc?.Superseded ? 'Superseded' : (this.doc?.Status || 'New');
    }

    get numberText():
        string
    {
        return this.doc?.CardNo || this.defaults?.NextNumber || '';
    }

    get subtitle():
        string
    {
        if (this.isView)
        {
            return 'A posted card is not changed : add a new card for new prices, or cancel this one';
        }

        return this.cardType === 'Campaign'
            ? 'Campaign card : wins inside Effective From .. To; afterwards the Regular card decides again'
            : 'The full price set of the supplier from Effective From; a newer price card replaces it as a whole';
    }

    //===========================================================
    // Lookups
    //===========================================================

    get suppliers():
        any[]
    {
        return this.defaults?.Suppliers ?? [];
    }

    private modelName
    (
        modelId:
            number
    ):
        string
    {
        const product =
            this.defaults?.Products.find(x => x.ModelId === modelId);

        return product?.ModelName || product?.ProductName || `Model ${modelId}`;
    }

    // Models with at least one active colour
    private get activeModels():
        { ModelId:number; ModelName:string; Colours:number }[]
    {
        const map =
            new Map<number, { ModelId:number; ModelName:string; Colours:number }>();

        for (const p of this.defaults?.Products ?? [])
        {
            if (!p.IsActive || !p.ModelId)
            {
                continue;
            }

            const found =
                map.get(p.ModelId);

            if (found)
            {
                found.Colours++;
            }
            else
            {
                map.set(p.ModelId, { ModelId:p.ModelId, ModelName:p.ModelName || p.ProductName, Colours:1 });
            }
        }

        return [...map.values()].sort((a, b) => a.ModelName.localeCompare(b.ModelName));
    }

    // Models not on the card yet
    get pickItems():
        any[]
    {
        const taken =
            new Set(this.lines.map(x => x.ModelId));

        return this.activeModels
            .filter(x => !taken.has(x.ModelId))
            .map
            (
                x =>
                ({
                    ModelId:x.ModelId,
                    Label:`${x.ModelName} (${x.Colours} colour${x.Colours === 1 ? '' : 's'})`
                })
            );
    }

    get shownLines():
        CardLine[]
    {
        const words =
            this.filterText.trim().toLowerCase().split(/\s+/).filter(Boolean);

        if (!words.length)
        {
            return this.lines;
        }

        return this.lines.filter
        (
            x =>
            {
                const text =
                    [x.ModelName, ...x.Colours.map(c => `${c.ProductCode} ${c.ProductName} ${c.ColorName}`)]
                        .join(' ')
                        .toLowerCase();

                return words.every(w => text.includes(w));
            }
        );
    }

    exceptionCount
    (
        line:
            CardLine
    ):
        number
    {
        return line.Colours.filter(c => c.Own).length;
    }

    // The price a colour sells at on this card
    colourPrice
    (
        line:
            CardLine,
        colour:
            ColourLine
    ):
        PricePair
    {
        return colour.Own ? colour : line;
    }

    //===========================================================
    // VAT and line figures (the server keeps the same rule)
    //===========================================================

    get fromIso():
        string
    {
        return toIso(this.fromDate);
    }

    get vatRate():
        number
    {
        return priceCardVatRate(this.defaults?.VatRules ?? [], this.fromIso);
    }

    // Purchase VAT % on Effective From (VAT setup : Purchase VAT)
    get purchaseVatRate():
        number
    {
        return priceCardVatRate(this.defaults?.PurchaseVatRules ?? [], this.fromIso);
    }

    // The VAT inside the DP
    dpVatInside
    (
        price:
            PricePair
    ):
        number
    {
        const rate =
            this.purchaseVatRate;

        return roundMoney(price.Dp * rate / (100 + rate));
    }

    vatInside
    (
        price:
            PricePair
    ):
        number
    {
        const rate =
            this.vatRate;

        return roundMoney(price.Mrp * rate / (100 + rate));
    }

    netSale
    (
        price:
            PricePair
    ):
        number
    {
        return roundMoney(price.Mrp - this.vatInside(price));
    }

    commission
    (
        price:
            PricePair
    ):
        number
    {
        return roundMoney(price.Mrp - price.Dp);
    }

    commissionPercent
    (
        price:
            PricePair
    ):
        number
    {
        return price.Mrp > 0
            ? Math.round(this.commission(price) * 10000 / price.Mrp) / 100
            : 0;
    }

    // A price that cannot be saved
    lineProblem
    (
        price:
            PricePair
    ):
        string
    {
        if (!(price.Dp > 0))
        {
            return 'DP is required';
        }

        if (!(price.Mrp > 0))
        {
            return 'MRP is required';
        }

        if (price.Mrp <= price.Dp)
        {
            return 'MRP is not above DP : no commission';
        }

        return '';
    }

    changed
    (
        price:
            PricePair & { OldDp:number; OldMrp:number }
    ):
        boolean
    {
        return price.OldMrp > 0 && (price.OldMrp !== price.Mrp || price.OldDp !== price.Dp);
    }

    get colourExceptions():
        number
    {
        return this.lines.reduce((s, x) => s + this.exceptionCount(x), 0);
    }

    get colourTotal():
        number
    {
        return this.lines.reduce((s, x) => s + x.Colours.length, 0);
    }

    get problemCount():
        number
    {
        return this.lines.reduce
        (
            (s, x) =>
                s
                + (this.lineProblem(x) ? 1 : 0)
                + x.Colours.filter(c => c.Own && !!this.lineProblem(c)).length,
            0
        );
    }

    money
    (
        value:
            number
    ):
        string
    {
        return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
    }

    date
    (
        iso:
            string
    ):
        string
    {
        return priceCardDate(iso);
    }

    //===========================================================
    // Last cost : the last purchase from the card's supplier
    // (cost + 6.3 VAT per unit, to compare with DP) and the stock
    //===========================================================

    private loadCosts():
        void
    {
        const supplier =
            this.supplierCode;

        if (!supplier)
        {
            this.costs = new Map();

            this.costSupplier = '';

            return;
        }

        if (supplier === this.costSupplier)
        {
            return;
        }

        this.costSupplier = supplier;

        this.service
            .getCosts(supplier)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    rows =>
                    {
                        // A later supplier change wins
                        if (supplier !== this.supplierCode)
                        {
                            return;
                        }

                        this.costs = new Map(rows.map(x => [x.MotorBikeId, x]));

                        this.cdr.detectChanges();
                    },

                error:
                    err =>
                    {
                        this.costSupplier = '';

                        this.toast.error(this.pageTitle, errorText(err, 'Failed to load the last costs.'));
                    }
            });
    }

    colourCost
    (
        colour:
            ColourLine
    ):
        PriceCardCost | null
    {
        return this.costs.get(colour.MotorBikeId) ?? null;
    }

    // A model : the latest purchase of any of its colours, the
    // stock of all its colours
    modelCost
    (
        line:
            CardLine
    ):
        PriceCardCost | null
    {
        const rows =
            line.Colours
                .map(c => this.costs.get(c.MotorBikeId))
                .filter((x): x is PriceCardCost => !!x);

        if (!rows.length)
        {
            return null;
        }

        const last =
            rows
                .filter(x => x.LastBatchId > 0)
                .sort((a, b) => b.LastDate.localeCompare(a.LastDate) || b.LastBatchId - a.LastBatchId)[0];

        const qty =
            rows.reduce((s, x) => s + x.StockQty, 0);

        const value =
            rows.reduce((s, x) => s + x.StockQty * x.StockAvgPaid, 0);

        return {
            MotorBikeId:0,
            LastBatchId:last?.LastBatchId ?? 0,
            LastDate:last?.LastDate ?? '',
            LastSourceNo:last?.LastSourceNo ?? '',
            LastUnitCost:last?.LastUnitCost ?? 0,
            LastVat:last?.LastVat ?? 0,
            LastPaid:last?.LastPaid ?? 0,
            StockQty:qty,
            StockAvgPaid:qty > 0 ? roundMoney(value / qty) : 0
        };
    }

    // Hover : the purchase and the stock
    costTitle
    (
        cost:
            PriceCardCost | null
    ):
        string
    {
        if (!cost)
        {
            return 'No purchase from this supplier and no stock';
        }

        const rows:
            string[] = [];

        if (cost.LastBatchId)
        {
            rows.push(`Last purchase : ${cost.LastSourceNo} on ${priceCardDate(cost.LastDate)}`);

            rows.push(`Cost ${this.money(cost.LastUnitCost)} + 6.3 VAT ${this.money(cost.LastVat)} = ${this.money(cost.LastPaid)}`);
        }
        else
        {
            rows.push('No purchase from this supplier');
        }

        rows.push
        (
            cost.StockQty > 0
                ? `In stock ${cost.StockQty} · average paid ${this.money(cost.StockAvgPaid)}`
                : 'No stock in hand'
        );

        return rows.join('\n');
    }

    // DP above the last cost : a price rise from the supplier
    dpUp
    (
        price:
            PricePair,
        cost:
            PriceCardCost | null
    ):
        boolean
    {
        return !!cost && cost.LastPaid > 0 && price.Dp > cost.LastPaid;
    }

    // MRP below the last cost : a sale at a loss
    mrpLoss
    (
        price:
            PricePair,
        cost:
            PriceCardCost | null
    ):
        boolean
    {
        return !!cost && cost.LastPaid > 0 && price.Mrp > 0 && price.Mrp < cost.LastPaid;
    }

    // VAT payable per unit = VAT inside the MRP (sales VAT) - VAT
    // inside the DP (purchase VAT); below 0 : the purchase VAT is
    // higher. From this card only (no purchase record).
    vatPayable
    (
        price:
            PricePair
    ):
        number
    {
        return roundMoney(this.vatInside(price) - this.dpVatInside(price));
    }

    vatPayableTitle
    (
        price:
            PricePair
    ):
        string
    {
        return `VAT in MRP ${this.money(this.vatInside(price))} (${this.vatRate} %) - VAT in DP ${this.money(this.dpVatInside(price))} (${this.purchaseVatRate} %) = ${this.money(this.vatPayable(price))}`;
    }

    // VAT adjustment per unit (display only, for pricing) = 6.3 VAT
    // of the last purchase - VAT inside the DP : the extra VAT the
    // supplier charged through the 6.3; at each sale the bike's own
    // 6.3 VAT is posted to VAT Reimbursement - MB (Stage 3)
    vatAdjust
    (
        price:
            PricePair,
        cost:
            PriceCardCost | null
    ):
        number | null
    {
        if (!cost || !cost.LastBatchId || !(price.Dp > 0))
        {
            return null;
        }

        return roundMoney(cost.LastVat - this.dpVatInside(price));
    }

    vatAdjustTitle
    (
        price:
            PricePair,
        cost:
            PriceCardCost | null
    ):
        string
    {
        const adjust =
            this.vatAdjust(price, cost);

        if (adjust === null || !cost)
        {
            return 'Needs the DP and a purchase from this supplier';
        }

        const rows =
            [
                `6.3 VAT of the last purchase ${this.money(cost.LastVat)} - VAT in DP ${this.money(this.dpVatInside(price))} = ${this.money(adjust)} per unit`,
                'Display only : each sale posts its own bike\'s 6.3 VAT to VAT Reimbursement - MB'
            ];

        if (cost.StockQty > 0)
        {
            rows.splice(1, 0, `On stock in hand (${this.qtyText(cost.StockQty)}) about ${this.money(adjust * cost.StockQty)}`);
        }

        return rows.join('\n');
    }

    qtyText
    (
        value:
            number
    ):
        string
    {
        return (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits:2 });
    }

    //===========================================================
    // Card fields
    //===========================================================

    onSupplier
    (
        code:
            any
    ):
        void
    {
        this.supplierCode = String(code ?? '');

        this.loadCosts();

        this.prefill();

        // The prices of the card in force were for another supplier
        for (const line of this.lines)
        {
            line.OldDp = 0;

            line.OldMrp = 0;

            for (const colour of line.Colours)
            {
                colour.OldDp = 0;

                colour.OldMrp = 0;
            }
        }
    }

    onCardType
    (
        type:
            any
    ):
        void
    {
        this.cardType = type === 'Campaign' ? 'Campaign' : 'Regular';

        if (this.cardType === 'Campaign' && this.toDate < this.fromDate)
        {
            this.toDate = this.fromDate;
        }
    }

    onFromDate
    (
        value:
            Date
    ):
        void
    {
        this.fromDate = value;

        if (this.toDate < value)
        {
            this.toDate = value;
        }
    }

    //===========================================================
    // Models
    //===========================================================

    onPick
    (
        id:
            any
    ):
        void
    {
        const modelId =
            Number(id);

        this.pickId = null;

        if (!modelId || this.lines.some(x => x.ModelId === modelId))
        {
            return;
        }

        this.lines =
            [...this.lines, this.newLine(modelId, this.modelName(modelId))];

        this.cdr.detectChanges();
    }

    // Every active model not on the card yet (DP / MRP blank)
    addAllModels():
        void
    {
        const items =
            this.pickItems;

        if (!items.length)
        {
            this.toast.info(this.pageTitle, 'Every active model is on the card already.');

            return;
        }

        this.lines =
            [...this.lines, ...items.map(x => this.newLine(x.ModelId, this.modelName(x.ModelId)))];

        this.toast.success(this.pageTitle, `${items.length} model(s) added. Enter their DP and MRP.`);

        this.cdr.detectChanges();
    }

    // The card in force for the supplier on Effective From : its
    // models with their DP / MRP and colour exceptions (a model
    // already on the card gets the old prices to compare)
    // A new Regular card replaces the whole current card : it starts
    // as a copy of that card (change only what moved)
    private prefill():
        void
    {
        if (this.mode === 'add' && this.cardType === 'Regular' && !this.lines.length && this.supplierCode)
        {
            this.loadCurrent(true);
        }
    }

    loadCurrent
    (
        quiet:
            boolean = false
    ):
        void
    {
        if (!this.supplierCode)
        {
            if (!quiet)
            {
                this.toast.warning(this.pageTitle, 'Choose the supplier first.');
            }

            return;
        }

        this.loadingCurrent = true;

        this.service
            .getActive(this.supplierCode, this.fromIso, this.cardType === 'Regular')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.loadingCurrent = false;

                        const current =
                            rows.filter(r => !this.doc || r.CardId !== this.doc.Id);

                        if (!current.length)
                        {
                            if (!quiet)
                            {
                                this.toast.info(this.pageTitle, `No card is in force for this supplier on ${priceCardDate(this.fromIso)}.`);
                            }

                            this.cdr.detectChanges();

                            return;
                        }

                        let added = 0;

                        const lines =
                            [...this.lines];

                        for (const modelId of [...new Set(current.map(r => r.ModelId))])
                        {
                            const ofModel =
                                current.filter(r => r.ModelId === modelId);

                            // The model price : a colour taking it, else the first colour
                            const base =
                                ofModel.find(r => r.FromModel) ?? ofModel[0];

                            let line =
                                lines.find(x => x.ModelId === modelId);

                            const isNew =
                                !line;

                            if (!line)
                            {
                                line = this.newLine(modelId, this.modelName(modelId));

                                line.Dp = base.Dp;

                                line.Mrp = base.Mrp;

                                lines.push(line);

                                added++;
                            }

                            line.OldDp = base.Dp;

                            line.OldMrp = base.Mrp;

                            for (const row of ofModel)
                            {
                                const colour =
                                    line.Colours.find(c => c.MotorBikeId === row.MotorBikeId);

                                if (!colour)
                                {
                                    continue;
                                }

                                colour.OldDp = row.Dp;

                                colour.OldMrp = row.Mrp;

                                // A new line keeps the colour exceptions of the card in force
                                if (isNew && (row.Dp !== base.Dp || row.Mrp !== base.Mrp))
                                {
                                    colour.Own = true;

                                    colour.Dp = row.Dp;

                                    colour.Mrp = row.Mrp;

                                    line.Open = true;
                                }
                            }
                        }

                        this.lines = lines;

                        const cardNo =
                            current[0]?.CardNo ?? '';

                        this.toast.success
                        (
                            this.pageTitle,
                            quiet
                                ? `Started from the current card ${cardNo} (${added} model(s)). Change only the prices that moved.`
                                : added
                                    ? `${added} model(s) loaded with the current DP and MRP. Change the new prices.`
                                    : 'The current DP and MRP are shown beside the models.'
                        );

                        this.cdr.detectChanges();
                    },

                error:
                    err =>
                    {
                        this.loadingCurrent = false;

                        this.toast.error(this.pageTitle, errorText(err, 'Failed to load the card in force.'));

                        this.cdr.detectChanges();
                    }
            });
    }

    setDp
    (
        line:
            CardLine,
        input:
            HTMLInputElement
    ):
        void
    {
        line.Dp = parseAmount(input.value);

        input.value = this.inputText(line.Dp);
    }

    setMrp
    (
        line:
            CardLine,
        input:
            HTMLInputElement
    ):
        void
    {
        line.Mrp = parseAmount(input.value);

        input.value = this.inputText(line.Mrp);
    }

    // A colour's own price : the other figure starts from the model
    setColourDp
    (
        line:
            CardLine,
        colour:
            ColourLine,
        input:
            HTMLInputElement
    ):
        void
    {
        const dp =
            parseAmount(input.value);

        if (!colour.Own)
        {
            if (!dp || dp === line.Dp)
            {
                input.value = '';

                return;
            }

            colour.Own = true;

            colour.Mrp = line.Mrp;
        }

        colour.Dp = dp;

        input.value = this.inputText(dp);
    }

    setColourMrp
    (
        line:
            CardLine,
        colour:
            ColourLine,
        input:
            HTMLInputElement
    ):
        void
    {
        const mrp =
            parseAmount(input.value);

        if (!colour.Own)
        {
            if (!mrp || mrp === line.Mrp)
            {
                input.value = '';

                return;
            }

            colour.Own = true;

            colour.Dp = line.Dp;
        }

        colour.Mrp = mrp;

        input.value = this.inputText(mrp);
    }

    // An input shows its figure comma style : 115,000 / 1,250.50
    inputText
    (
        value:
            number
    ):
        string
    {
        return value
            ? value.toLocaleString('en-US', { maximumFractionDigits:2 })
            : '';
    }

    // Focus : the whole figure is selected for typing over
    selectAll
    (
        input:
            HTMLInputElement
    ):
        void
    {
        setTimeout(() => input.select());
    }

    // "Motor Bikes - REVOO - A04" : A04 big, "Motor Bikes · REVOO" small
    modelShort
    (
        name:
            string
    ):
        string
    {
        const parts =
            (name ?? '').split(' - ').map(x => x.trim()).filter(Boolean);

        return parts.length ? parts[parts.length - 1] : name;
    }

    modelPrefix
    (
        name:
            string
    ):
        string
    {
        const parts =
            (name ?? '').split(' - ').map(x => x.trim()).filter(Boolean);

        return parts.slice(0, -1).join(' · ');
    }

    // A swatch for the colour name (grey when not known)
    colourDot
    (
        name:
            string
    ):
        string
    {
        const text =
            (name ?? '').toLowerCase();

        const found =
            COLOUR_SWATCHES.find(x => text.includes(x[0]));

        return found ? found[1] : '#cbd5e1';
    }

    // Back to the model price
    clearColour
    (
        colour:
            ColourLine
    ):
        void
    {
        colour.Own = false;

        colour.Dp = 0;

        colour.Mrp = 0;
    }

    toggleColours
    (
        line:
            CardLine
    ):
        void
    {
        line.Open = !line.Open;
    }

    removeLine
    (
        line:
            CardLine
    ):
        void
    {
        this.lines = this.lines.filter(x => x !== line);
    }

    clearLines():
        void
    {
        if (!this.lines.length)
        {
            return;
        }

        this.confirmDialog.open
        (
            'Remove All Models',
            `Remove all ${this.lines.length} model(s) from the card?`,
            () =>
            {
                this.lines = [];

                this.cdr.detectChanges();
            },
            'Remove'
        );
    }

    //===========================================================
    // Save / post
    //===========================================================

    private check():
        string
    {
        if (!this.supplierCode)
        {
            return 'Choose the supplier.';
        }

        if (this.cardType === 'Campaign' && this.toDate < this.fromDate)
        {
            return 'Effective To cannot be before Effective From.';
        }

        if (!this.lines.length)
        {
            return 'Add at least one model.';
        }

        // Every model needs its DP and MRP (remove a model with its row's x)
        const bad =
            this.lines.find(x => !(x.Dp > 0) || !(x.Mrp > 0));

        if (bad)
        {
            return `${this.modelShort(bad.ModelName)} : enter its DP and MRP, or remove the model with its row's ✕.`;
        }

        for (const line of this.lines)
        {
            const colour =
                line.Colours.find(c => c.Own && (!(c.Dp > 0) || !(c.Mrp > 0)));

            if (colour)
            {
                return `${colour.ProductName} : DP and MRP must be above 0 (or clear the colour exception).`;
            }
        }

        return '';
    }

    private model():
        SavePriceCard
    {
        const lines:
            PriceCardLineInput[] = [];

        for (const line of this.lines)
        {
            lines.push({ ModelId:line.ModelId, MotorBikeId:0, Dp:line.Dp, Mrp:line.Mrp });

            for (const colour of line.Colours)
            {
                // An exception equal to the model price is not kept
                if (colour.Own && (colour.Dp !== line.Dp || colour.Mrp !== line.Mrp))
                {
                    lines.push({ ModelId:line.ModelId, MotorBikeId:colour.MotorBikeId, Dp:colour.Dp, Mrp:colour.Mrp });
                }
            }
        }

        return {
            SupplierCode:this.supplierCode,
            CardType:this.cardType,
            EffectiveFrom:this.fromIso,
            EffectiveTo:this.cardType === 'Campaign' ? toIso(this.toDate) : '',
            Reference:this.reference.trim(),
            Remarks:this.remarks.trim(),
            Lines:lines
        };
    }

    private saveCall():
        Observable<PriceCardSaved>
    {
        return this.mode === 'edit' && this.publicId
            ? this.service.update(this.publicId, this.model())
            : this.service.create(this.model());
    }

    save():
        void
    {
        if (this.progress.busy)
        {
            return;
        }

        const problem =
            this.check();

        if (problem)
        {
            this.toast.warning(this.pageTitle, problem);

            return;
        }

        this.progress
            .run('Saving Price Card', 'Please wait while the price card is being saved...', 'Price card saved.', this.saveCall())
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    saved =>
                    {
                        this.toast.success(this.mode === 'edit' ? 'Update Successful' : 'Save Successful', `${saved.CardNo} saved as a draft.`);

                        // Save / Update : back to the list
                        this.back();
                    },

                error:
                    err =>
                        this.toast.error('Save Failed', errorText(err, 'Failed to save the price card.'))
            });
    }

    // Save (add / edit) and post, or post a draft opened to view
    post():
        void
    {
        if (this.progress.busy)
        {
            return;
        }

        if (!this.isView)
        {
            const problem =
                this.check();

            if (problem)
            {
                this.toast.warning(this.pageTitle, problem);

                return;
            }
        }

        const name =
            this.doc?.CardNo || 'the price card';

        const from =
            priceCardDate(this.fromIso);

        if (this.cardType !== 'Regular' || !this.supplierCode)
        {
            this.confirmPost(`Post ${name}? The campaign prices apply from ${from} to ${priceCardDate(toIso(this.toDate))}; a posted card is not changed.`);

            return;
        }

        // A Regular card replaces the whole current card : models
        // of that card left out of this one have no price from its date
        this.service
            .getActive(this.supplierCode, this.fromIso, true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    rows =>
                    {
                        const current =
                            rows.filter(r => r.CardType === 'Regular' && (!this.doc || r.CardId !== this.doc.Id));

                        const cardNo =
                            current[0]?.CardNo ?? '';

                        const onCard =
                            new Set(this.lines.map(x => x.ModelId));

                        const missing =
                            [...new Set(current.filter(r => !onCard.has(r.ModelId)).map(r => r.ModelId))]
                                .map(id => this.modelShort(this.modelName(id)));

                        let text =
                            `Post ${name}? It becomes the supplier's price card from ${from}`;

                        text +=
                            cardNo
                                ? ` and replaces ${cardNo} as a whole.`
                                : '.';

                        if (missing.length)
                        {
                            text += ` ${missing.length} model(s) of ${cardNo} are not on this card and will have no price from ${from} : ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? ' …' : ''}.`;
                        }

                        this.confirmPost(text);
                    },

                error:
                    () =>
                        this.confirmPost(`Post ${name}? It becomes the supplier's price card from ${from} and replaces the current card as a whole.`)
            });
    }

    private confirmPost
    (
        text:
            string
    ):
        void
    {
        this.confirmDialog.open
        (
            'Post Price Card',
            text,
            () =>
                setTimeout(() => this.runPost()),
            'Post',
            'Cancel',
            'primary'
        );
    }

    private runPost():
        void
    {
        // A new / changed card is saved first; when the post is
        // refused the draft stays saved and opens for editing
        let draft:
            PriceCardSaved | null = null;

        const call$ =
            this.isView && this.publicId
                ? this.service.post(this.publicId)
                : this.saveCall().pipe
                (
                    tap((saved:PriceCardSaved) => draft = saved),
                    switchMap((saved:PriceCardSaved) => this.service.post(saved.PublicId))
                );

        this.progress
            .run('Posting Price Card', 'Please wait while the price card is being posted...', 'Price card posted.', call$)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    saved =>
                    {
                        this.toast.success('Post Successful', `${saved.CardNo} posted.`);

                        this.back();
                    },

                error:
                    err =>
                    {
                        this.toast.error('Post Failed', errorText(err, 'Failed to post the price card.'));

                        const kept =
                            draft as PriceCardSaved | null;

                        if (kept)
                        {
                            this.openSaved(kept, 'edit');
                        }
                    }
            });
    }

    private openSaved
    (
        saved:
            PriceCardSaved,
        mode:
            'edit' | 'view'
    ):
        void
    {
        if (saved.PublicId && saved.PublicId !== this.publicId)
        {
            this.router.navigate([PRODUCT_PRICING_MB_ROUTE, mode, saved.PublicId], { replaceUrl:true });

            return;
        }

        this.mode = mode;

        this.loadCard();
    }

    //===========================================================
    // Clear / delete
    //===========================================================

    clear():
        void
    {
        this.confirmDialog.open
        (
            'Clear Price Card',
            'Clear the card and start again?',
            () =>
            {
                this.cardType = 'Regular';

                this.fromDate = fromIso(this.defaults?.Today ?? '') ?? new Date();

                this.toDate = this.fromDate;

                this.reference = '';

                this.remarks = '';

                this.lines = [];

                this.filterText = '';

                this.cdr.detectChanges();
            },
            'Clear'
        );
    }

    openDelete():
        void
    {
        if (!this.doc || this.progress.busy)
        {
            return;
        }

        this.confirmDialog.open
        (
            'Delete Price Card',
            `Are you sure you want to delete draft "${this.doc.CardNo}"?`,
            () =>
                setTimeout
                (
                    () =>
                        this.progress
                            .run('Deleting Price Card', 'Please wait...', 'Price card deleted.', this.service.delete(this.publicId))
                            .pipe(takeUntilDestroyed(this.destroyRef))
                            .subscribe
                            ({
                                next:
                                    () =>
                                    {
                                        this.toast.success('Delete Successful', `${this.doc?.CardNo} deleted.`);

                                        this.back();
                                    },

                                error:
                                    err =>
                                        this.toast.error('Delete Failed', errorText(err, 'Failed to delete the price card.'))
                            })
                )
        );
    }

    //===========================================================
    // Cancel (posted)
    //===========================================================

    openCancel():
        void
    {
        this.cancelReason = '';

        this.cancelOpen = true;
    }

    confirmCancel():
        void
    {
        const reason =
            this.cancelReason.trim();

        if (reason.length < 5)
        {
            this.toast.warning('Cancel Price Card', 'Write the reason (at least 5 characters).');

            return;
        }

        this.progress
            .run('Cancelling Price Card', 'Please wait...', 'Price card cancelled.', this.service.cancel(this.publicId, reason))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.cancelOpen = false;

                        this.toast.success('Cancel Successful', `${this.doc?.CardNo} cancelled.`);

                        this.back();
                    },

                error:
                    err =>
                        this.toast.error('Cancel Failed', errorText(err, 'Failed to cancel the price card.'))
            });
    }

    //===========================================================
    // History / back
    //===========================================================

    openHistory():
        void
    {
        if (!this.publicId)
        {
            this.toast.info('History', 'History shows once the card is saved.');

            return;
        }

        this.service
            .getEntityHistory(this.publicId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.historyItems = (rows ?? []).map(toHistoryItem);

                        this.historyOpened = true;

                        this.cdr.detectChanges();
                    },

                error:
                    err =>
                        this.toast.error('History', errorText(err, 'Failed to load the history.'))
            });
    }

    back():
        void
    {
        this.router.navigate([PRODUCT_PRICING_MB_ROUTE, 'list']);
    }

    // Header command : Save / Update (edit) ; History (view)
    command1():
        void
    {
        if (this.isView)
        {
            this.openHistory();

            return;
        }

        this.save();
    }
}


//===============================================================
// Figures and colours
//===============================================================

// "115,000.50" -> 115000.5 (2 decimals)
function parseAmount
(
    text:
        string
):
    number
{
    const value =
        Number(String(text ?? '').replace(/[^0-9.\-]/g, ''));

    return isFinite(value) && value > 0 ? roundMoney(value) : 0;
}

const COLOUR_SWATCHES:
    [string, string][] =
[
    ['black', '#111827'],
    ['grey', '#9ca3af'],
    ['gray', '#9ca3af'],
    ['silver', '#cbd5e1'],
    ['white', '#f8fafc'],
    ['pink', '#ec4899'],
    ['purple', '#8b5cf6'],
    ['violet', '#8b5cf6'],
    ['yellow', '#facc15'],
    ['green', '#22c55e'],
    ['red', '#ef4444'],
    ['maroon', '#9f1239'],
    ['blue', '#3b82f6'],
    ['navy', '#1e3a8a'],
    ['orange', '#f97316'],
    ['brown', '#92400e'],
    ['gold', '#d4a017'],
    ['cyan', '#06b6d4']
];


//===============================================================
// Dates (local, yyyy-MM-dd)
//===============================================================

function toIso
(
    value:
        Date
):
    string
{
    const d =
        value instanceof Date && !isNaN(value.getTime()) ? value : new Date();

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromIso
(
    iso:
        string
):
    Date | null
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
