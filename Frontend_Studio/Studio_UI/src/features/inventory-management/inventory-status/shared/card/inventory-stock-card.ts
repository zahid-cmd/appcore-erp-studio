//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    DestroyRef,
    EventEmitter,
    HostListener,
    Input,
    OnChanges,
    Output,
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
    Router
}
from '@angular/router';

import
{
    Subscription
}
from 'rxjs';

import
{
    formatMoney
}
from '../../../../../shared/components/accounting/accounting.models';

import
{
    InventoryStockPageConfig
}
from '../inventory-stock.config';

import
{
    InventoryStockCard,
    formatQuantity,
    formatStockDate
}
from '../inventory-stock.model';

import
{
    InventoryStockService
}
from '../inventory-stock.service';

import
{
    productLedgerRoute
}
from '../../../product-ledgers/models/product-ledgers.model';

import
{
    MotorPowerService
}
from '../../../../../core/motor-power/motor-power.service';


type CardTab =
    'batches' | 'ledger' | 'places' | 'bikes';


//===============================================================
// Stock card : one product in a side panel (the list stays
// visible). Tabs : Batches (oldest first = sold first) · Stock
// Ledger (running balance) · Location (branch / warehouse) · Bikes
// (MB). Same branch / warehouse filter as the list.
//===============================================================

@Component(
{
    selector:'inventory-stock-card',

    standalone:true,

    imports:
    [
        CommonModule
    ],

    templateUrl:'./inventory-stock-card.html',

    styleUrl:'./inventory-stock-card.css'
})

export class InventoryStockCardComponent
implements OnChanges
{
    private readonly stockService =
        inject(InventoryStockService);

    // Electric bikes : "Motor" instead of "Engine"
    readonly power =
        inject(MotorPowerService);

    get bikeNoWord():
        string
    {
        this.power.load();

        return this.power.word(this.productId);
    }

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly router =
        inject(Router);

    private readonly destroyRef =
        inject(DestroyRef);

    @Input({ required:true })
    page!:
        InventoryStockPageConfig;

    @Input({ required:true })
    productId!:
        number;

    @Input()
    branchId:
        number =
        0;

    @Input()
    warehouseId:
        number =
        0;

    @Output()
    closed =
        new EventEmitter<void>();

    card:
        InventoryStockCard | null =
        null;

    loading:
        boolean =
        false;

    error:
        string =
        '';

    tab:
        CardTab =
        'batches';

    private request?:
        Subscription;

    readonly money =
        formatMoney;

    readonly qty =
        formatQuantity;

    readonly date =
        formatStockDate;

    get tabs():
        { id:CardTab; label:string; count:number }[]
    {
        const card =
            this.card;

        return [
            { id:'batches' as CardTab, label:'Batches', count:card?.Batches.length ?? 0 },
            { id:'ledger' as CardTab, label:'Stock Ledger', count:card?.Movements.length ?? 0 },
            { id:'places' as CardTab, label:'Location', count:card?.Places.length ?? 0 },
            ...(this.page?.pageType === 'MB'
                ? [{ id:'bikes' as CardTab, label:'Bikes', count:card?.Bikes.length ?? 0 }]
                : [])
        ];
    }

    get statusClass():
        string
    {
        switch
        (
            this.card?.Product.StockStatus
        )
        {
            case 'In Stock':
                return 'sc-ok';

            case 'Low Stock':
                return 'sc-low';

            case 'Critical':
                return 'sc-critical';

            case 'In Transit':
                return 'sc-transit';

            default:
                return 'sc-out';
        }
    }

    ngOnChanges():
        void
    {
        this.load();
    }

    load():
        void
    {
        this.request?.unsubscribe();

        if
        (
            !this.productId
        )
        {
            return;
        }

        this.loading =
            true;

        this.error =
            '';

        this.cdr.detectChanges();

        this.request =
            this.stockService
                .getCard(
                    this.page.apiPath,
                    this.productId,
                    this.branchId,
                    this.warehouseId
                )
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        card =>
                        {
                            this.loading =
                                false;

                            this.card =
                                card;

                            this.cdr.detectChanges();
                        },

                    error:
                        error =>
                        {
                            this.loading =
                                false;

                            this.error =
                                typeof error?.error === 'string'
                                    ? error.error
                                    : 'The stock card could not be loaded.';

                            this.cdr.detectChanges();
                        }
                });
    }

    setTab
    (
        tab:
            CardTab
    ):
        void
    {
        this.tab =
            tab;
    }

    close():
        void
    {
        this.request?.unsubscribe();

        this.closed.emit();
    }

    // The product's full ledger (Product Ledgers page), same
    // branch / warehouse
    openLedger():
        void
    {
        this.request?.unsubscribe();

        this.router.navigate(
            [productLedgerRoute(this.page.pageType)],
            {
                queryParams:
                {
                    product:this.productId,
                    ...(this.branchId ? { branch:this.branchId } : {}),
                    ...(this.warehouseId ? { warehouse:this.warehouseId } : {})
                }
            }
        );
    }

    @HostListener('document:keydown.escape')
    onEscape():
        void
    {
        this.close();
    }

    // Purchase / PurchaseCancel … → Purchase / Purchase Cancel
    movementLabel
    (
        type:
            string
    ):
        string
    {
        return String(type ?? '')
            .replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    bikeClass
    (
        status:
            string
    ):
        string
    {
        return status === 'In Stock'
            ? 'sc-ok'
            : status === 'In Transit' || status === 'Partly Received'
                ? 'sc-transit'
                : 'sc-muted';
    }
}
