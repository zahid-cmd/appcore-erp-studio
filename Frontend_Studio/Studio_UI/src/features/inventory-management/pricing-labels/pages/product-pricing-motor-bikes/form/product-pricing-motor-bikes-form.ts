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
    ControlSegmentComponent,
    ControlSegmentItem
}
from '../../../../../../shared/components/utilities/control-segment/control-segment';

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
    HistoryDrawerComponent
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer';

import
{
    PRODUCT_PRICING_MB_ROUTE,
    PriceCard,
    PriceCardDefaults,
    PriceCardProduct,
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


// A line on the card being edited
interface CardLine
{
    MotorBikeId:
        number;
    ProductCode:
        string;
    ProductName:
        string;
    ColorName:
        string;
    Dp:
        number;
    Mrp:
        number;
    // DP / MRP of the card in force before this one (0 = none)
    OldDp:
        number;
    OldMrp:
        number;
}


//===============================================================
// Product Pricing - Motor Bikes form : one price card.
//   Regular  : from Effective From until a later Regular card
//   Campaign : Effective From .. To, wins inside its dates
// Each line : DP (real payable) and MRP (VAT inclusive);
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
        ControlSegmentComponent,
        ToastComponent,
        OrbitLoaderComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        HistoryDrawerComponent
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

    readonly cardTypes:
        ControlSegmentItem[] =
        [
            { value:'Regular', text:'Regular' },
            { value:'Campaign', text:'Campaign' }
        ];

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

        this.lines =
            card.Lines.map
            (
                x =>
                ({
                    MotorBikeId:x.MotorBikeId,
                    ProductCode:x.ProductCode,
                    ProductName:x.ProductName,
                    ColorName:this.product(x.MotorBikeId)?.ColorName ?? '',
                    Dp:x.Dp,
                    Mrp:x.Mrp,
                    OldDp:0,
                    OldMrp:0
                })
            );
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
        return this.doc?.Status || 'New';
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
            : 'Regular card : holds from Effective From until a later Regular card of the supplier';
    }

    //===========================================================
    // Lookups
    //===========================================================

    get suppliers():
        any[]
    {
        return this.defaults?.Suppliers ?? [];
    }

    private product
    (
        id:
            number
    ):
        PriceCardProduct | undefined
    {
        return this.defaults?.Products.find(x => x.MotorBikeId === id);
    }

    // Active models not on the card yet
    get pickItems():
        any[]
    {
        const taken =
            new Set(this.lines.map(x => x.MotorBikeId));

        return (this.defaults?.Products ?? [])
            .filter(x => x.IsActive && !taken.has(x.MotorBikeId))
            .map
            (
                x =>
                ({
                    MotorBikeId:x.MotorBikeId,
                    Label:`${x.ProductCode} - ${x.ProductName}${x.ColorName ? ' (' + x.ColorName + ')' : ''}`
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
                    `${x.ProductCode} ${x.ProductName} ${x.ColorName}`.toLowerCase();

                return words.every(w => text.includes(w));
            }
        );
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

    vatInside
    (
        line:
            CardLine
    ):
        number
    {
        const rate =
            this.vatRate;

        return roundMoney(line.Mrp * rate / (100 + rate));
    }

    netSale
    (
        line:
            CardLine
    ):
        number
    {
        return roundMoney(line.Mrp - this.vatInside(line));
    }

    commission
    (
        line:
            CardLine
    ):
        number
    {
        return roundMoney(line.Mrp - line.Dp);
    }

    commissionPercent
    (
        line:
            CardLine
    ):
        number
    {
        return line.Mrp > 0
            ? Math.round(this.commission(line) * 10000 / line.Mrp) / 100
            : 0;
    }

    // A line that cannot be saved
    lineProblem
    (
        line:
            CardLine
    ):
        string
    {
        if (!(line.Dp > 0))
        {
            return 'DP is required';
        }

        if (!(line.Mrp > 0))
        {
            return 'MRP is required';
        }

        if (line.Mrp <= line.Dp)
        {
            return 'MRP is not above DP : no commission';
        }

        return '';
    }

    changed
    (
        line:
            CardLine
    ):
        boolean
    {
        return line.OldMrp > 0 && (line.OldMrp !== line.Mrp || line.OldDp !== line.Dp);
    }

    get totalDp():
        number
    {
        return roundMoney(this.lines.reduce((s, x) => s + (Number(x.Dp) || 0), 0));
    }

    get totalMrp():
        number
    {
        return roundMoney(this.lines.reduce((s, x) => s + (Number(x.Mrp) || 0), 0));
    }

    get totalCommission():
        number
    {
        return roundMoney(this.totalMrp - this.totalDp);
    }

    get problemCount():
        number
    {
        return this.lines.filter(x => !!this.lineProblem(x)).length;
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

        // DP / MRP of the card in force are for another supplier now
        for (const line of this.lines)
        {
            line.OldDp = 0;

            line.OldMrp = 0;
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
    // Lines
    //===========================================================

    onPick
    (
        id:
            any
    ):
        void
    {
        const product =
            this.product(Number(id));

        this.pickId = null;

        if (!product || this.lines.some(x => x.MotorBikeId === product.MotorBikeId))
        {
            return;
        }

        this.lines =
            [
                ...this.lines,
                {
                    MotorBikeId:product.MotorBikeId,
                    ProductCode:product.ProductCode,
                    ProductName:product.ProductName,
                    ColorName:product.ColorName,
                    Dp:0,
                    Mrp:0,
                    OldDp:0,
                    OldMrp:0
                }
            ];

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

        for (const item of items)
        {
            this.onPick(item.MotorBikeId);
        }

        this.toast.success(this.pageTitle, `${items.length} model(s) added. Enter their DP and MRP.`);
    }

    // The card in force for the supplier on Effective From :
    // its models with their DP / MRP (a model already on the card
    // gets the old values to compare)
    loadCurrent():
        void
    {
        if (!this.supplierCode)
        {
            this.toast.warning(this.pageTitle, 'Choose the supplier first.');

            return;
        }

        this.loadingCurrent = true;

        this.service
            .getActive(this.supplierCode, this.fromIso)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.loadingCurrent = false;

                        if (!rows.length)
                        {
                            this.toast.info(this.pageTitle, `No card is in force for this supplier on ${priceCardDate(this.fromIso)}.`);

                            this.cdr.detectChanges();

                            return;
                        }

                        let added = 0;

                        const lines =
                            [...this.lines];

                        for (const row of rows)
                        {
                            if (this.doc && row.CardId === this.doc.Id)
                            {
                                continue;
                            }

                            const line =
                                lines.find(x => x.MotorBikeId === row.MotorBikeId);

                            if (line)
                            {
                                line.OldDp = row.Dp;

                                line.OldMrp = row.Mrp;

                                continue;
                            }

                            const product =
                                this.product(row.MotorBikeId);

                            if (!product)
                            {
                                continue;
                            }

                            lines.push
                            ({
                                MotorBikeId:product.MotorBikeId,
                                ProductCode:product.ProductCode,
                                ProductName:product.ProductName,
                                ColorName:product.ColorName,
                                Dp:row.Dp,
                                Mrp:row.Mrp,
                                OldDp:row.Dp,
                                OldMrp:row.Mrp
                            });

                            added++;
                        }

                        this.lines = lines;

                        this.toast.success
                        (
                            this.pageTitle,
                            added
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
        value:
            string
    ):
        void
    {
        line.Dp = roundMoney(Number(value));
    }

    setMrp
    (
        line:
            CardLine,
        value:
            string
    ):
        void
    {
        line.Mrp = roundMoney(Number(value));
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

        const bad =
            this.lines.find(x => !(x.Dp > 0) || !(x.Mrp > 0));

        if (bad)
        {
            return `${bad.ProductName} : DP and MRP must be above 0.`;
        }

        return '';
    }

    private model():
        SavePriceCard
    {
        return {
            SupplierCode:this.supplierCode,
            CardType:this.cardType,
            EffectiveFrom:this.fromIso,
            EffectiveTo:this.cardType === 'Campaign' ? toIso(this.toDate) : '',
            Reference:this.reference.trim(),
            Remarks:this.remarks.trim(),
            Lines:this.lines.map(x => ({ MotorBikeId:x.MotorBikeId, Dp:x.Dp, Mrp:x.Mrp }))
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
                        this.toast.success('Save Successful', `${saved.CardNo} saved as a draft.`);

                        this.openSaved(saved, 'edit');
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

        this.confirmDialog.open
        (
            'Post Price Card',
            `Post ${name}? The card decides the DP and MRP of its models from ${priceCardDate(this.fromIso)}; a posted card is not changed (cancel it or add a new card).`,
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

                        this.openSaved(saved, 'view');
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

                        this.loadCard();
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
