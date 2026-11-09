//===============================================================
// Motor Bike Shelf (Sales Invoices - MB)
//
// The priced bikes in stock in the invoice's warehouse, as model
// cards (picture, colour, bikes free, MRP). Pick a card, then
// tick its chassis (oldest first); the Picked tray on the right
// lists them and "Add n to Invoice" hands the chassis to the
// page (one line each). The CKD status of a chassis can be
// changed here (Yes -> No needs a reason). Same look as the
// Product Shelf of the purchase / PO pages.
//===============================================================

import
{
    Component,
    EventEmitter,
    HostListener,
    Input,
    Output
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    SalesInvoiceBikeUnit
}
from '../sales-invoice/sales-invoice.model';


// One card : a model in one colour (a product)
interface BikeCard
{
    productId:
        number;

    name:
        string;

    code:
        string;

    modelId:
        number;

    modelName:
        string;

    colorName:
        string;

    colorHex:
        string;

    colorLight:
        boolean;

    imageUrl:
        string;

    // Bikes that can be picked (not on this / another invoice)
    free:
        number;

    // On this invoice already
    onInvoice:
        number;

    mrpMin:
        number;

    mrpMax:
        number;
}


export interface BikeCkdChange
{
    unitId:
        number;

    status:
        'Yes' | 'No';

    remarks:
        string;
}


const COLOR_WORDS:
    Record<string, string> =
{
    black:'#111827',
    white:'#f8fafc',
    grey:'#9ca3af',
    gray:'#9ca3af',
    silver:'#c0c7d1',
    red:'#dc2626',
    maroon:'#7f1d1d',
    pink:'#f472b6',
    purple:'#8b5cf6',
    blue:'#2563eb',
    navy:'#1e3a8a',
    cyan:'#06b6d4',
    teal:'#0d9488',
    green:'#16a34a',
    yellow:'#facc15',
    golden:'#d4a017',
    gold:'#d4a017',
    orange:'#f97316',
    brown:'#92400e'
};

function colorHex(name: string): string
{
    const words =
        (name ?? '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w);

    const word =
        [...words].reverse().find(w => COLOR_WORDS[w]);

    return word ? COLOR_WORDS[word] : '';
}

// "Motor Bikes - REVOO - A10 - Black" -> "REVOO - A10 - Black"
function shortName(name: string): string
{
    return (name ?? '').replace(/^motor\s*bikes\s*-\s*/i, '');
}


@Component(
{
    selector:'app-bike-shelf',

    standalone:true,

    imports:
    [
        CommonModule
    ],

    templateUrl:'./bike-shelf.html',

    styleUrls:
    [
        '../../../procurement/shared/product-shelf/product-shelf.css',
        './bike-shelf.css'
    ]
})
export class BikeShelfComponent
{
    //===========================================================
    // Inputs / Outputs
    //===========================================================

    // Opening clears the search, the card and the tray
    @Input()
    set open
    (
        value:
            boolean
    )
    {
        if (!!value && !this.isOpen)
        {
            this.search =
                '';

            this.modelId =
                null;

            this.productId =
                null;

            this.picked =
                [];

            this.limitNote =
                '';

            this.confirmDiscard =
                false;

            this.cancelCkd();
        }

        this.isOpen =
            !!value;

        if (this.isOpen)
        {
            this.placeOnCanvas();
        }
    }


    //===========================================================
    // Centred on the page canvas (right of the sidebar, below
    // the topbar), not on the whole window
    //===========================================================

    canvasPadding =
        '24px';

    @HostListener('window:resize')
    placeOnCanvas():
        void
    {
        const canvas =
            document.querySelector('main.content') as HTMLElement | null;

        if (!canvas)
        {
            this.canvasPadding = '24px';
            return;
        }

        const r =
            canvas.getBoundingClientRect();

        const top =
            Math.max(0, r.top);

        const left =
            Math.max(0, r.left);

        const right =
            Math.max(0, window.innerWidth - Math.min(window.innerWidth, r.right));

        const bottom =
            Math.max(0, window.innerHeight - Math.min(window.innerHeight, r.bottom));

        // Too narrow (phone / collapsed) : use the window
        if (window.innerWidth - left - right < 720)
        {
            this.canvasPadding = '24px';
            return;
        }

        this.canvasPadding =
            `${top + 20}px ${right + 20}px ${bottom + 20}px ${left + 20}px`;
    }

    get open():
        boolean
    {
        return this.isOpen;
    }

    private isOpen =
        false;

    @Input()
    title:
        string =
        'Motor Bike Shelf';

    @Input()
    subtitle:
        string =
        '';

    // The bikes in stock in the warehouse (every one; the
    // unpriced are left out here)
    @Input()
    units:
        SalesInvoiceBikeUnit[] =
        [];

    // Chassis on this invoice already
    @Input()
    takenIds:
        number[] =
        [];

    // A CKD change on its way (its chassis)
    @Input()
    ckdBusyId:
        number | null =
        null;

    // How many chassis may still be picked (Regular sale : 1 less
    // the one on the invoice); null = no limit (Corporate)
    @Input()
    maxPick:
        number | null =
        null;

    // The limit was hit (footer note)
    limitNote =
        '';

    private get full():
        boolean
    {
        return this.maxPick !== null && this.picked.length >= this.maxPick;
    }

    private noteLimit():
        void
    {
        this.limitNote =
            this.maxPick === 0
                ? 'Regular sale : the invoice has its bike already (choose Corporate for several).'
                : `Regular sale : one chassis per invoice (choose Corporate for several).`;
    }

    @Output()
    add =
        new EventEmitter<number[]>();

    @Output()
    closed =
        new EventEmitter<void>();

    @Output()
    ckdChange =
        new EventEmitter<BikeCkdChange>();


    //===========================================================
    // State
    //===========================================================

    search =
        '';

    // Model chip (sub category); null = all
    modelId:
        number | null =
        null;

    // The card whose chassis are listed; null = the cards
    productId:
        number | null =
        null;

    // Picked chassis, in the order picked
    picked:
        number[] =
        [];

    confirmDiscard =
        false;

    // Yes -> No : the reason box of this chassis
    ckdEditId:
        number | null =
        null;

    ckdReason =
        '';


    //===========================================================
    // Bikes
    //===========================================================

    private get priced():
        SalesInvoiceBikeUnit[]
    {
        return (this.units ?? []).filter(x => x.Mrp > 0);
    }

    get unpricedCount():
        number
    {
        return (this.units ?? []).filter(x => !(x.Mrp > 0)).length;
    }

    isTaken
    (
        unit:
            SalesInvoiceBikeUnit
    ):
        boolean
    {
        return (this.takenIds ?? []).includes(unit.MotorBikeUnitId);
    }

    isPicked
    (
        unit:
            SalesInvoiceBikeUnit
    ):
        boolean
    {
        return this.picked.includes(unit.MotorBikeUnitId);
    }

    // Free to pick : not on this invoice nor another open one
    isFree
    (
        unit:
            SalesInvoiceBikeUnit
    ):
        boolean
    {
        return !unit.OnInvoiceNo && !this.isTaken(unit);
    }

    private matches
    (
        unit:
            SalesInvoiceBikeUnit,
        word:
            string
    ):
        boolean
    {
        return [unit.ProductName, unit.ProductCode, unit.ModelName, unit.ColorName, unit.ChassisNo, unit.EngineNo, unit.KeyNo ?? '', unit.BatteryNo ?? '']
            .some(x => (x ?? '').toLowerCase().includes(word));
    }

    private get searched():
        SalesInvoiceBikeUnit[]
    {
        const words =
            this.search.trim().toLowerCase().split(/\s+/).filter(w => w);

        return this.priced.filter(unit => words.every(word => this.matches(unit, word)));
    }

    // Every card (search applied), then the model chip
    private cardsOf
    (
        units:
            SalesInvoiceBikeUnit[]
    ):
        BikeCard[]
    {
        const cards =
            new Map<number, BikeCard>();

        units.forEach
        (
            unit =>
            {
                let card =
                    cards.get(unit.ProductId);

                if (!card)
                {
                    const hex =
                        colorHex(unit.ColorName || unit.ProductName);

                    card =
                    {
                        productId:unit.ProductId,
                        name:shortName(unit.ProductName),
                        code:unit.ProductCode,
                        modelId:unit.ProductSubCategoryId,
                        modelName:unit.ModelName || shortName(unit.ProductName),
                        colorName:unit.ColorName,
                        colorHex:hex,
                        colorLight:['#f8fafc', '#c0c7d1', '#facc15'].includes(hex),
                        imageUrl:unit.ImageUrl || '',
                        free:0,
                        onInvoice:0,
                        mrpMin:unit.Mrp,
                        mrpMax:unit.Mrp
                    };

                    cards.set(unit.ProductId, card);
                }

                if (this.isTaken(unit))
                {
                    card.onInvoice++;
                }
                else if (!unit.OnInvoiceNo)
                {
                    card.free++;
                }

                card.mrpMin =
                    Math.min(card.mrpMin, unit.Mrp);

                card.mrpMax =
                    Math.max(card.mrpMax, unit.Mrp);
            }
        );

        return [...cards.values()]
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    get chips():
        { id:number; label:string; count:number }[]
    {
        const models =
            new Map<number, { id:number; label:string; count:number }>();

        this.cardsOf(this.searched).forEach
        (
            card =>
            {
                const chip =
                    models.get(card.modelId)
                    ??
                    { id:card.modelId, label:card.modelName, count:0 };

                chip.count += card.free;

                models.set(card.modelId, chip);
            }
        );

        return [...models.values()]
            .sort((a, b) => a.label.localeCompare(b.label));
    }

    get allCount():
        number
    {
        return this.cardsOf(this.searched).reduce((sum, card) => sum + card.free, 0);
    }

    get cards():
        BikeCard[]
    {
        return this.cardsOf(this.searched)
            .filter(card => this.modelId === null || card.modelId === this.modelId);
    }

    get card():
        BikeCard | null
    {
        if (this.productId === null)
        {
            return null;
        }

        return this.cardsOf(this.priced).find(x => x.productId === this.productId) ?? null;
    }

    // Chassis of the open card, oldest first (a search that
    // matches a chassis / engine narrows them)
    get chassis():
        SalesInvoiceBikeUnit[]
    {
        if (this.productId === null)
        {
            return [];
        }

        const all =
            this.priced.filter(x => x.ProductId === this.productId);

        const words =
            this.search.trim().toLowerCase().split(/\s+/).filter(w => w);

        const narrowed =
            words.length > 0
                ? all.filter(unit => words.every(word => (unit.ChassisNo + ' ' + unit.EngineNo).toLowerCase().includes(word)))
                : [];

        return (narrowed.length > 0 ? narrowed : all)
            .slice()
            .sort((a, b) => (a.StockInDate || '').localeCompare(b.StockInDate || '') || a.MotorBikeUnitId - b.MotorBikeUnitId);
    }

    get tray():
        SalesInvoiceBikeUnit[]
    {
        return this.picked
            .map(id => this.priced.find(x => x.MotorBikeUnitId === id))
            .filter((x): x is SalesInvoiceBikeUnit => !!x);
    }

    get total():
        number
    {
        return this.tray.reduce((sum, unit) => sum + unit.Mrp, 0);
    }

    get addText():
        string
    {
        const n =
            this.tray.length;

        return n === 0
            ? 'Add to Invoice'
            : `Add ${n} ${n === 1 ? 'Bike' : 'Bikes'} to Invoice`;
    }


    //===========================================================
    // Actions
    //===========================================================

    onSearch
    (
        event:
            Event
    ):
        void
    {
        this.search =
            (event.target as HTMLInputElement).value ?? '';
    }

    // Enter : a typed chassis / engine no. is picked
    onSearchEnter():
        void
    {
        const text =
            this.search.trim().toLowerCase();

        if (!text)
        {
            return;
        }

        const unit =
            this.priced.find(x => this.isFree(x) && (x.ChassisNo.toLowerCase() === text || x.EngineNo.toLowerCase() === text))
            ??
            (() =>
            {
                const hits =
                    this.priced.filter(x => this.isFree(x) && (x.ChassisNo + ' ' + x.EngineNo).toLowerCase().includes(text));

                return hits.length === 1 ? hits[0] : undefined;
            })();

        if (unit)
        {
            this.productId =
                unit.ProductId;

            if (!this.isPicked(unit))
            {
                if (this.full)
                {
                    this.noteLimit();

                    return;
                }

                this.picked =
                    [...this.picked, unit.MotorBikeUnitId];
            }

            this.search =
                '';

            return;
        }

        // One card : open it
        const cards =
            this.cards;

        if (cards.length === 1)
        {
            this.openCard(cards[0]);
        }
    }

    pickModel
    (
        id:
            number | null
    ):
        void
    {
        this.modelId =
            id;

        this.productId =
            null;
    }

    openCard
    (
        card:
            BikeCard
    ):
        void
    {
        this.productId =
            card.productId;

        this.cancelCkd();
    }

    backToCards():
        void
    {
        this.productId =
            null;

        this.cancelCkd();
    }

    pickedOf
    (
        card:
            BikeCard
    ):
        number
    {
        return this.tray.filter(x => x.ProductId === card.productId).length;
    }

    toggle
    (
        unit:
            SalesInvoiceBikeUnit
    ):
        void
    {
        if (!this.isFree(unit))
        {
            return;
        }

        if (!this.isPicked(unit) && this.full)
        {
            this.noteLimit();

            return;
        }

        this.limitNote =
            '';

        this.picked =
            this.isPicked(unit)
                ? this.picked.filter(id => id !== unit.MotorBikeUnitId)
                : [...this.picked, unit.MotorBikeUnitId];

        this.confirmDiscard =
            false;
    }

    // The oldest free chassis of a card that is not picked yet
    pickOldest
    (
        card:
            BikeCard,
        event:
            Event
    ):
        void
    {
        event.stopPropagation();

        if (this.full)
        {
            this.noteLimit();

            return;
        }

        const unit =
            this.priced
                .filter(x => x.ProductId === card.productId && this.isFree(x) && !this.isPicked(x))
                .sort((a, b) => (a.StockInDate || '').localeCompare(b.StockInDate || '') || a.MotorBikeUnitId - b.MotorBikeUnitId)[0];

        if (unit)
        {
            this.picked =
                [...this.picked, unit.MotorBikeUnitId];
        }
    }

    unpick
    (
        unit:
            SalesInvoiceBikeUnit
    ):
        void
    {
        this.picked =
            this.picked.filter(id => id !== unit.MotorBikeUnitId);

        this.limitNote =
            '';
    }

    confirmAdd():
        void
    {
        const ids =
            this.tray.filter(x => this.isFree(x)).map(x => x.MotorBikeUnitId);

        if (ids.length === 0)
        {
            return;
        }

        this.add.emit(ids);
    }

    requestClose():
        void
    {
        if (this.tray.length > 0 && !this.confirmDiscard)
        {
            this.confirmDiscard =
                true;

            return;
        }

        this.confirmDiscard =
            false;

        this.closed.emit();
    }

    keepPicking():
        void
    {
        this.confirmDiscard =
            false;
    }


    //===========================================================
    // CKD status : No -> Yes at once; Yes -> No asks the reason
    //===========================================================

    flipCkd
    (
        unit:
            SalesInvoiceBikeUnit,
        event:
            Event
    ):
        void
    {
        event.stopPropagation();

        if (this.ckdBusyId)
        {
            return;
        }

        if (unit.CkdStatus === 'Yes')
        {
            this.ckdEditId =
                unit.MotorBikeUnitId;

            this.ckdReason =
                '';

            return;
        }

        this.ckdChange.emit({ unitId:unit.MotorBikeUnitId, status:'Yes', remarks:'' });
    }

    onCkdReason
    (
        event:
            Event
    ):
        void
    {
        this.ckdReason =
            (event.target as HTMLInputElement).value ?? '';
    }

    saveCkdNo
    (
        unit:
            SalesInvoiceBikeUnit
    ):
        void
    {
        if (!this.ckdReason.trim())
        {
            return;
        }

        this.ckdChange.emit({ unitId:unit.MotorBikeUnitId, status:'No', remarks:this.ckdReason.trim() });

        this.cancelCkd();
    }

    cancelCkd():
        void
    {
        this.ckdEditId =
            null;

        this.ckdReason =
            '';
    }


    //===========================================================
    // Texts
    //===========================================================

    money
    (
        value:
            number
    ):
        string
    {
        return (value ?? 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
    }

    mrpText
    (
        card:
            BikeCard
    ):
        string
    {
        return card.mrpMin === card.mrpMax
            ? this.money(card.mrpMin)
            : `${this.money(card.mrpMin)} - ${this.money(card.mrpMax)}`;
    }

    dateText
    (
        value:
            string
    ):
        string
    {
        const m =
            /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

        if (!m)
        {
            return '';
        }

        const months =
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return `${m[3]}-${months[Number(m[2]) - 1]}-${m[1]}`;
    }
}
