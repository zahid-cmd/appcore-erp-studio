//===============================================================
// Product Shelf : a popup to pick several items at once
//
// Image cards (filtered by search, category chips, sub-category
// and "Ordered before") on the left; the Picked tray
// on the right with Qty / Free / MRP / Margin % / price per item.
// "Add n to Order" hands the picks to the page; Close with picks
// asks first. The page passes the products already filtered by
// the supplier and turns the picks into its own lines.
//===============================================================

import
{
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    ViewChild
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    SearchDropdownComponent
}
from '../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    poDpFromMrp,
    poProfitFrom,
    poRound
}
from '../purchase-order/purchase-order.model';

import
{
    ShelfFigures,
    ShelfOptions,
    ShelfPick,
    ShelfProduct
}
from './product-shelf.model';


// One row of the Picked tray (texts as typed)
interface TrayRow
{
    product:
        ShelfProduct;

    qtyText:
        string;

    freeText:
        string;

    mrpText:
        string;

    marginText:
        string;

    dpText:
        string;

    // DP given (typed / from the last order), not worked out
    dpTyped:
        boolean;
}


// Category chip
interface ShelfChip
{
    id:
        number | null;

    label:
        string;

    count:
        number;
}


// Most cards drawn at once (refine the search for more)
const MAX_CARDS =
    120;

// Chips shown before "More"
const TOP_CHIPS =
    6;


//===============================================================
// Colour tag : colour words -> swatch (the colour master keeps
// names only). Two-word names match on their last word too
// ("Matte Black" -> black).
//===============================================================

export interface ShelfColor
{
    name:
        string;

    hex:
        string;

    // Light swatch : drawn with a darker ring
    light:
        boolean;
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
    pink:'#f9a8d4',
    purple:'#8b5cf6',
    violet:'#7c3aed',
    blue:'#2563eb',
    navy:'#1e3a8a',
    sky:'#38bdf8',
    cyan:'#06b6d4',
    teal:'#0d9488',
    green:'#16a34a',
    olive:'#65a30d',
    mint:'#86efac',
    yellow:'#facc15',
    golden:'#d4a017',
    gold:'#d4a017',
    orange:'#f97316',
    brown:'#92400e',
    beige:'#e7d7b8',
    cream:'#fdf4dc',
    champagne:'#e8d5b0',
    bronze:'#b06d2a',
    copper:'#b87333'
};

function colorHex(name: string): string
{
    const words =
        (name ?? '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w);

    const word =
        [...words].reverse().find(w => COLOR_WORDS[w]);

    return word ? COLOR_WORDS[word] : '';
}

function isLightColor(hex: string): boolean
{
    const m =
        /^#([0-9a-f]{6})$/i.exec(hex ?? '');

    if (!m)
    {
        return false;
    }

    const n = parseInt(m[1], 16);

    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;

    return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}


@Component(
{
    selector:'app-product-shelf',

    standalone:true,

    imports:
    [
        CommonModule,
        SearchDropdownComponent
    ],

    templateUrl:'./product-shelf.html',

    styleUrl:'./product-shelf.css'
})
export class ProductShelfComponent
    implements OnChanges
{
    //===========================================================
    // Inputs / Outputs
    //===========================================================

    // Opening resets the filters and the tray
    @Input()
    set open
    (
        value:
            boolean
    )
    {
        const opening =
            !!value && !this.isOpen;

        this.isOpen =
            !!value;

        if
        (
            opening
        )
        {
            this.search =
                '';

            this.categoryId =
                null;

            this.subCategoryId =
                null;

            this.boughtOnly =
                false;

            this.reorderOnly =
                false;

            this.tray =
                [];

            this.confirmDiscard =
                false;

            // The lines already on the record come into the tray
            // once the products of this opening are in
            this.prefillPending =
                true;
        }
    }

    private prefillPending =
        false;

    // Opening : every item already on the record (added on the
    // page) is in the tray with its figures, ticked on its card;
    // changing them updates its line
    ngOnChanges():
        void
    {
        if
        (
            !this.prefillPending
            ||
            !this.isOpen
        )
        {
            return;
        }

        this.prefillPending =
            false;

        this.tray =
            (this.products ?? [])
                .filter(item => item.inOrderQty > 0)
                .map(item => this.rowOf(item));
    }

    // A tray row from an item's start figures
    private rowOf
    (
        item:
            ShelfProduct
    ):
        TrayRow
    {
        const start =
            item.start;

        return {
            product:item,
            qtyText:start.qty > 0 ? String(start.qty) : '',
            freeText:start.free > 0 ? String(start.free) : '',
            mrpText:start.mrp > 0 ? String(start.mrp) : '',
            marginText:start.margin !== null && this.options.showMargin ? String(start.margin) : '',
            dpText:start.dp > 0 ? String(start.dp) : '',
            // MRP invoice : DP follows MRP and Margin % (read only)
            dpTyped:start.dp > 0 && !this.options.showMargin
        };
    }

    // The figures a row would send
    private figuresOf
    (
        row:
            TrayRow
    ):
        ShelfFigures
    {
        return {
            qty:poRound(this.num(row.qtyText), 2),
            free:this.options.showFree ? poRound(this.num(row.freeText), 2) : 0,
            mrp:this.options.showMrp ? poRound(this.num(row.mrpText), 2) : 0,
            margin:
                this.options.showMargin && row.marginText.trim() !== ''
                    ? poRound(this.num(row.marginText), 2)
                    : null,
            dp:poRound(this.num(row.dpText), 4)
        };
    }

    // New item, or a line on the record whose figures changed
    isChanged
    (
        row:
            TrayRow
    ):
        boolean
    {
        if
        (
            row.product.inOrderQty <= 0
        )
        {
            return true;
        }

        const now =
            this.figuresOf(row);

        const start =
            row.product.start;

        return now.qty !== poRound(start.qty, 2)
            ||
            now.free !== (this.options.showFree ? poRound(start.free, 2) : 0)
            ||
            now.mrp !== (this.options.showMrp ? poRound(start.mrp, 2) : 0)
            ||
            (this.options.showMargin && now.margin !== (start.margin === null ? null : poRound(start.margin, 2)))
            ||
            now.dp !== poRound(start.dp, 4);
    }

    private get changedRows():
        TrayRow[]
    {
        return this.tray.filter(row => this.isChanged(row));
    }

    // On the record already (the card's tick)
    isOnRecord
    (
        item:
            ShelfProduct
    ):
        boolean
    {
        return item.inOrderQty > 0;
    }

    get open():
        boolean
    {
        return this.isOpen;
    }

    @Input()
    title:
        string =
        'Product Shelf';

    @Input()
    subtitle:
        string =
        '';

    // Order terms shown as chips (Incl. VAT · DP invoice)
    @Input()
    chips:
        string[] =
        [];

    @Input()
    products:
        ShelfProduct[] =
        [];

    @Input()
    options:
        ShelfOptions =
        {
            showMrp:false,
            showMargin:false,
            showFree:false,
            mrpRequired:false,
            priceWord:'Unit Price',
            itemWord:'item',
            itemsWord:'items',
            icon:'fa-box'
        };

    // Switch "Max Lines" (0 = no limit) and the lines already on
    // the order; a pick of an item on the order only updates it
    @Input()
    maxLines:
        number =
        0;

    @Input()
    lineCount:
        number =
        0;

    // Set by the page when it could not take the picks
    @Input()
    error:
        string =
        '';

    @Output()
    add =
        new EventEmitter<ShelfPick[]>();

    @Output()
    closed =
        new EventEmitter<void>();


    //===========================================================
    // State
    //===========================================================

    private isOpen =
        false;

    @ViewChild('trayRows')
    private trayRows?:
        ElementRef<HTMLElement>;

    @ViewChild('addButton')
    private addButton?:
        ElementRef<HTMLButtonElement>;

    search:
        string =
        '';

    categoryId:
        number | null =
        null;

    subCategoryId:
        number | null =
        null;

    // Only items at / below Re-order Level (red first)
    reorderOnly:
        boolean =
        false;

    boughtOnly:
        boolean =
        false;

    tray:
        TrayRow[] =
        [];

    // Close with picks : "Discard?" in the footer
    confirmDiscard:
        boolean =
        false;


    //===========================================================
    // Categories : the top chips, the rest under "More"
    //===========================================================

    private get categories():
        ShelfChip[]
    {
        const map =
            new Map<number, ShelfChip>();

        for
        (
            const item of this.products
        )
        {
            if
            (
                item.categoryId === null
            )
            {
                continue;
            }

            const chip =
                map.get(item.categoryId)
                ??
                {
                    id:item.categoryId,
                    label:item.categoryName || `Category ${item.categoryId}`,
                    count:0
                };

            chip.count++;

            map.set(item.categoryId, chip);
        }

        return [...map.values()]
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    }

    get topChips():
        ShelfChip[]
    {
        const all =
            this.categories;

        const top =
            all.slice(0, TOP_CHIPS);

        // A category picked from "More" shows as a chip too
        if
        (
            this.categoryId !== null
            &&
            !top.some(x => x.id === this.categoryId)
        )
        {
            const picked =
                all.find(x => x.id === this.categoryId);

            if
            (
                picked
            )
            {
                top.push(picked);
            }
        }

        return top;
    }

    get moreItems():
        { label:string; value:number | null }[]
    {
        const shown =
            new Set(this.topChips.map(x => x.id));

        return this.categories
            .filter(x => !shown.has(x.id))
            .map(x => ({ label:`${x.label} · ${x.count}`, value:x.id }));
    }

    get subCategoryItems():
        { label:string; value:number | null }[]
    {
        const map =
            new Map<number, string>();

        for
        (
            const item of this.products
        )
        {
            if
            (
                item.subCategoryId !== null
                &&
                item.categoryId === this.categoryId
            )
            {
                map.set(item.subCategoryId, item.subCategoryName || `Sub-Category ${item.subCategoryId}`);
            }
        }

        return [
            {
                label:'All sub-categories',
                value:null
            },
            ...[...map.entries()]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([id, name]) => ({ label:name, value:id }))
        ];
    }

    pickCategory
    (
        id:
            number | null
    ):
        void
    {
        this.categoryId =
            id;

        this.subCategoryId =
            null;
    }

    onMore
    (
        value:
            unknown
    ):
        void
    {
        if
        (
            value !== null
            &&
            value !== undefined
            &&
            value !== ''
        )
        {
            this.pickCategory(Number(value));
        }
    }

    onSubCategory
    (
        value:
            unknown
    ):
        void
    {
        this.subCategoryId =
            value === null || value === undefined || value === ''
                ? null
                : Number(value);
    }


    //===========================================================
    // Cards
    //===========================================================

    private get filtered():
        ShelfProduct[]
    {
        const words =
            this.search
                .trim()
                .toLowerCase()
                .split(/\s+/)
                .filter(x => !!x);

        const list =
            this.products.filter
        (
            item =>
                (!this.reorderOnly || item.stockTone === 'red' || item.stockTone === 'amber')
                &&
                (this.categoryId === null || item.categoryId === this.categoryId)
                &&
                (this.subCategoryId === null || item.subCategoryId === this.subCategoryId)
                &&
                (!this.boughtOnly || item.boughtBefore)
                &&
                words.every
                (
                    word =>
                        item.name.toLowerCase().includes(word)
                        ||
                        item.code.toLowerCase().includes(word)
                )
        );

        // Most urgent first while "Needs re-order" is on
        return this.reorderOnly
            ? [...list].sort((a, b) => (a.stockTone === 'red' ? 0 : 1) - (b.stockTone === 'red' ? 0 : 1))
            : list;
    }

    // Items at / below their Re-order Level
    get reorderCount():
        number
    {
        return this.products.filter(x => x.stockTone === 'red' || x.stockTone === 'amber').length;
    }

    onReorderOnly
    (
        event:
            Event
    ):
        void
    {
        this.reorderOnly =
            (event.target as HTMLInputElement).checked;
    }

    get cards():
        ShelfProduct[]
    {
        return this.filtered.slice(0, MAX_CARDS);
    }

    get matchCount():
        number
    {
        return this.filtered.length;
    }

    get moreThanShown():
        boolean
    {
        return this.filtered.length > MAX_CARDS;
    }

    //===========================================================
    // Colour tag on the card picture : the item's colour (given,
    // or the last part of its name when that is a colour word)
    //===========================================================

    private readonly colorCache =
        new Map<string, ShelfColor | null>();

    colorOf
    (
        item:
            ShelfProduct
    ):
        ShelfColor | null
    {
        if (this.colorCache.has(item.code))
        {
            return this.colorCache.get(item.code) ?? null;
        }

        const given =
            (item.colorName ?? '').trim();

        const parts =
            (item.name ?? '').split(' - ');

        const name =
            given || (parts.length > 1 ? parts[parts.length - 1].trim() : '');

        const hex =
            colorHex(name);

        const color =
            name && (given || hex)
                ? { name, hex:hex || '#94a3b8', light:isLightColor(hex) }
                : null;

        this.colorCache.set(item.code, color);

        return color;
    }

    isPicked
    (
        code:
            string
    ):
        boolean
    {
        return this.tray.some(x => x.product.code === code);
    }

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

    // Enter in the search : the first match goes to the tray
    onSearchEnter():
        void
    {
        const first =
            this.filtered.find(x => !this.isPicked(x.code) && !this.isBlocked(x));

        if
        (
            first
        )
        {
            this.pick(first);
        }
    }

    onBoughtOnly
    (
        event:
            Event
    ):
        void
    {
        this.boughtOnly =
            (event.target as HTMLInputElement).checked;
    }

    pick
    (
        item:
            ShelfProduct
    ):
        void
    {
        if
        (
            this.isPicked(item.code)
            ||
            this.isBlocked(item)
        )
        {
            return;
        }

        this.tray =
        [
            this.rowOf(item),
            ...this.tray
        ];

        this.confirmDiscard =
            false;

        // Margin given, no DP yet : worked out from MRP
        this.derive(this.tray[0], 'margin');

        // The new item's Qty box takes the typing
        setTimeout(() => this.focusBox(0));
    }

    // Enter : the next box (Qty → … → price → next item's Qty)
    nextBox
    (
        event:
            Event
    ):
        void
    {
        event.preventDefault();

        const boxes =
            this.boxes();

        const index =
            boxes.indexOf(event.target as HTMLInputElement);

        if
        (
            index >= 0
            &&
            index < boxes.length - 1
        )
        {
            this.focusBox(index + 1);

            return;
        }

        // Last box : everything filled → the Add button (Enter on it
        // adds to the order); else back to the first item needing
        // a figure
        if
        (
            this.canAdd
        )
        {
            setTimeout(() => this.addButton?.nativeElement.focus());

            return;
        }

        const bad =
            this.tray.findIndex(x => !!this.rowProblem(x));

        const row =
            bad >= 0
                ? this.trayRows?.nativeElement.querySelectorAll<HTMLElement>('.ps-row')[bad]
                : undefined;

        const first =
            row?.querySelector<HTMLInputElement>('input');

        if
        (
            first
        )
        {
            first.focus();

            first.select();
        }
    }

    private boxes():
        HTMLInputElement[]
    {
        return Array.from(
            this.trayRows?.nativeElement.querySelectorAll<HTMLInputElement>('input') ?? []);
    }

    private focusBox
    (
        index:
            number
    ):
        void
    {
        const box =
            this.boxes()[index];

        if
        (
            box
        )
        {
            box.focus();

            box.select();
        }
    }

    unpick
    (
        index:
            number
    ):
        void
    {
        this.tray =
            this.tray.filter((_, i) => i !== index);
    }

    trackCard
    (
        _:
            number,
        item:
            ShelfProduct
    ):
        string
    {
        return item.code;
    }


    //===========================================================
    // Tray figures
    //===========================================================

    private num
    (
        text:
            string
    ):
        number
    {
        const value =
            Number(String(text ?? '').replace(/,/g, '').trim());

        return Number.isFinite(value)
            ? value
            : 0;
    }

    private text
    (
        value:
            number,
        places:
            number
    ):
        string
    {
        return String(poRound(value, places));
    }

    onField
    (
        row:
            TrayRow,
        field:
            'qty' | 'free' | 'mrp' | 'margin' | 'dp',
        event:
            Event
    ):
        void
    {
        const value =
            (event.target as HTMLInputElement).value ?? '';

        switch
        (
            field
        )
        {
            case 'qty':
                row.qtyText = value;
                break;

            case 'free':
                row.freeText = value;
                break;

            case 'mrp':
                row.mrpText = value;
                this.derive(row, 'mrp');
                break;

            case 'margin':
                row.marginText = value;
                this.derive(row, 'margin');
                break;

            case 'dp':
                row.dpText = value;
                row.dpTyped = value.trim() !== '';
                this.derive(row, 'dp');
                break;
        }

        this.confirmDiscard =
            false;
    }

    // Margin % (MRP invoice) : MRP and Margin % give the DP; a
    // typed DP gives the Margin % instead
    private derive
    (
        row:
            TrayRow,
        source:
            'mrp' | 'margin' | 'dp'
    ):
        void
    {
        if
        (
            !this.options.showMargin
        )
        {
            return;
        }

        const mrp =
            poRound(this.num(row.mrpText), 2);

        if
        (
            !(mrp > 0)
        )
        {
            return;
        }

        if
        (
            source === 'margin'
        )
        {
            row.dpTyped =
                false;
        }

        if
        (
            !row.dpTyped
            &&
            row.marginText.trim() !== ''
        )
        {
            row.dpText =
                this.text(poDpFromMrp(mrp, poRound(this.num(row.marginText), 2), 'MRP'), 4);

            return;
        }

        const dp =
            poRound(this.num(row.dpText), 4);

        if
        (
            row.dpTyped
            &&
            dp > 0
        )
        {
            row.marginText =
                this.text(poProfitFrom(mrp, dp, 'MRP'), 2);
        }
    }

    // First problem of a row ('' = fine)
    rowProblem
    (
        row:
            TrayRow
    ):
        string
    {
        const qty =
            this.num(row.qtyText);

        const free =
            this.num(row.freeText);

        const mrp =
            this.num(row.mrpText);

        const dp =
            this.num(row.dpText);

        if
        (
            !(qty > 0)
            ||
            poRound(qty, 2) !== qty
        )
        {
            return 'Type the quantity';
        }

        if
        (
            free < 0
            ||
            poRound(free, 2) !== free
        )
        {
            return 'Free Qty : 0 or more';
        }

        if
        (
            this.options.mrpRequired
            &&
            !(mrp > 0)
        )
        {
            return 'MRP is needed (MRP invoice)';
        }

        // Max Stock Level of the item (hard cap)
        if
        (
            row.product.room !== null
            &&
            qty + free > row.product.room
        )
        {
            return `At most ${row.product.room} (Max Stock Level)`;
        }

        if
        (
            !(dp > 0)
        )
        {
            return `Type the ${this.options.priceWord}`;
        }

        if
        (
            mrp > 0
            &&
            dp > mrp
        )
        {
            return `${this.options.priceWord} is more than MRP`;
        }

        if
        (
            this.options.showMargin
            &&
            this.num(row.marginText) >= 100
        )
        {
            return 'Margin % must be less than 100';
        }

        return '';
    }

    rowTotal
    (
        row:
            TrayRow
    ):
        string
    {
        const total =
            poRound(this.num(row.qtyText) * this.num(row.dpText), 2);

        return total > 0
            ? this.money(total)
            : '—';
    }

    get problemCount():
        number
    {
        return this.tray.filter(x => !!this.rowProblem(x)).length;
    }

    get totalQty():
        number
    {
        return poRound(this.tray.reduce((sum, x) => sum + this.num(x.qtyText), 0), 2);
    }

    get totalFree():
        number
    {
        return poRound(this.tray.reduce((sum, x) => sum + this.num(x.freeText), 0), 2);
    }

    get totalAmount():
        string
    {
        return this.money(
            this.tray.reduce((sum, x) => sum + poRound(this.num(x.qtyText) * this.num(x.dpText), 2), 0));
    }

    // Any item ordered from this supplier before
    get hasHistory():
        boolean
    {
        return this.products.some(x => x.boughtBefore);
    }

    get canAdd():
        boolean
    {
        return this.changedRows.length > 0 && this.problemCount === 0 && !this.overLimit;
    }

    //===========================================================
    // Max Lines : new items (not on the order) take a line each
    //===========================================================

    private get newPicks():
        number
    {
        return this.tray.filter(x => x.product.inOrderQty <= 0).length;
    }

    // Lines still free after the picks (negative = over)
    get linesLeft():
        number
    {
        return this.maxLines - this.lineCount - this.newPicks;
    }

    get overLimit():
        boolean
    {
        return this.maxLines > 0 && this.linesLeft < 0;
    }

    get linesText():
        string
    {
        if
        (
            this.maxLines <= 0
        )
        {
            return 'No line limit';
        }

        const left =
            Math.max(this.linesLeft, 0);

        return `${left} of ${this.maxLines} lines left`;
    }

    get maxLinesTip():
        string
    {
        return `Max Lines reached (${this.maxLines}). Remove a picked item, or pick an item already on the order to change it.`;
    }

    // A new item cannot be picked once the lines are used up
    isBlocked
    (
        item:
            ShelfProduct
    ):
        boolean
    {
        return this.maxLines > 0
               &&
               item.inOrderQty <= 0
               &&
               !this.isPicked(item.code)
               &&
               this.linesLeft <= 0;
    }

    // 'Order' / 'Purchase' : the record the lines go to
    get docTitle():
        string
    {
        const word =
            this.options?.docWord || 'order';

        return word.charAt(0).toUpperCase() + word.slice(1);
    }

    // Add N (new items) · Update M (lines on the record changed)
    get addText():
        string
    {
        const rows =
            this.changedRows;

        const added =
            rows.filter(x => x.product.inOrderQty <= 0).length;

        const updated =
            rows.length - added;

        if
        (
            added > 0
            &&
            updated > 0
        )
        {
            return `Add & Update ${this.docTitle}`;
        }

        // No counts on the button : the footer shows items and qty
        if
        (
            updated > 0
        )
        {
            return `Update ${this.docTitle}`;
        }

        return `Add to ${this.docTitle}`;
    }

    // "MRP 400.00" → "400.00"
    mrpValue
    (
        text:
            string
    ):
        string
    {
        return (text ?? '').replace(/^MRP\s*/i, '') || '—';
    }

    money
    (
        value:
            number
    ):
        string
    {
        return poRound(value, 2).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
    }


    //===========================================================
    // Footer
    //===========================================================

    confirmAdd():
        void
    {
        if
        (
            !this.canAdd
        )
        {
            return;
        }

        // Only new items and changed lines (an untouched line keeps
        // its exact figures)
        this.add.emit(
            this.changedRows.map
            (
                row =>
                ({
                    code:row.product.code,
                    figures:this.figuresOf(row),
                    dpTyped:row.dpTyped || !this.options.showMargin
                })
            )
        );
    }

    requestClose():
        void
    {
        if
        (
            this.changedRows.length > 0
            &&
            !this.confirmDiscard
        )
        {
            this.confirmDiscard =
                true;

            return;
        }

        this.closed.emit();
    }

    keepPicking():
        void
    {
        this.confirmDiscard =
            false;
    }
}
