//===============================================================
// Item Summary Card (2026-11-10)
// --------------------------------------------------------------
// A small floating card shown while the mouse rests on a list
// row : the document's items in short (name, quantity, amount)
// with totals. Used by the purchase order and purchase lists;
// any list can use it :
//
//   1. the list table reports the row under the mouse :
//        <app-list-table ... (rowHover)="itemHover.onHover($event)">
//   2. the page keeps one ItemSummaryHover (below) with a
//      loader for the row's items and a title builder, sets its
//      "enabled" from the page's switch and calls dispose() when
//      the page is left
//   3. the card :
//        <app-item-summary-card [card]="itemHover.card">
//
// The card never takes the mouse (pointer-events none), so the
// row's own buttons stay usable under it.
//===============================================================

import
{
    Component,
    Input
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    Observable,
    Subscription
}
from 'rxjs';


// One line of the card (already grouped by the server, e.g.
// motor bikes by model, not by colour)
export interface ItemSummaryLine
{
    name:string;
    quantity:number;
    freeQuantity:number;
    amount:number;
}


export interface ItemSummaryCardState
{
    title:string;
    subtitle:string;
    lines:ItemSummaryLine[];
    loading:boolean;
    failed:boolean;
    // Where the card sits (fixed, viewport px)
    left:number;
    top:number;
    width:number;
}


// What the list table reports (null = the mouse left the rows)
export interface ListRowHover
{
    row:any;
    rect:DOMRect;
}


@Component(
{
    selector:'app-item-summary-card',

    standalone:true,

    imports:[CommonModule],

    templateUrl:'./item-summary-card.html',

    styleUrl:'./item-summary-card.css'
})
export class ItemSummaryCardComponent
{
    @Input()
    card:
        ItemSummaryCardState | null =
        null;

    @Input()
    quantityLabel =
        'Qty';

    // Lines shown before "+ n more"
    static readonly MAX_LINES =
        8;

    get shownLines():
        ItemSummaryLine[]
    {
        return (this.card?.lines ?? []).slice(0, ItemSummaryCardComponent.MAX_LINES);
    }

    get moreCount():
        number
    {
        return Math.max(0, (this.card?.lines.length ?? 0) - ItemSummaryCardComponent.MAX_LINES);
    }

    get totalQuantity():
        number
    {
        return (this.card?.lines ?? []).reduce((s, x) => s + x.quantity, 0);
    }

    get totalFree():
        number
    {
        return (this.card?.lines ?? []).reduce((s, x) => s + x.freeQuantity, 0);
    }

    get totalAmount():
        number
    {
        return (this.card?.lines ?? []).reduce((s, x) => s + x.amount, 0);
    }

    money
    (
        value: number
    ):
        string
    {
        return (Number(value) || 0).toLocaleString(
            'en-US',
            { minimumFractionDigits:2, maximumFractionDigits:2 });
    }

    qty
    (
        value: number
    ):
        string
    {
        const n = Number(value) || 0;

        return Number.isInteger(n)
            ? String(n)
            : n.toLocaleString('en-US', { maximumFractionDigits:3 });
    }
}


//===============================================================
// ItemSummaryHover : the page side (timer, cache, position)
//===============================================================

export class ItemSummaryHover
{
    // The card the page binds ([card]); null = hidden
    card:
        ItemSummaryCardState | null =
        null;

    // The page's switch (e.g. "Show Items on Hover"); false = no
    // card at all
    enabled =
        false;

    // Wait before showing (ms), so passing over rows shows nothing
    private static readonly DELAY_MS =
        350;

    private static readonly CARD_WIDTH =
        440;

    private timer?:
        number;

    private request?:
        Subscription;

    private readonly cache =
        new Map<string, ItemSummaryLine[]>();

    private currentKey =
        '';

    constructor
    (
        // The row's key (e.g. its PublicId); '' = no card
        private readonly keyOf:
            (row: any) => string,
        // Loads the row's lines
        private readonly load:
            (row: any) => Observable<ItemSummaryLine[]>,
        // Title / subtitle of the card
        private readonly titleOf:
            (row: any) => { title:string; subtitle:string },
        // Redraw the page (zoneless : the page's detectChanges)
        private readonly changed:
            () => void
    )
    {
        // The card is placed for the row where it was; any scroll
        // (page or table) hides it
        window.addEventListener('scroll', this.onScroll, true);
    }

    // Call when the page is left
    dispose():
        void
    {
        window.removeEventListener('scroll', this.onScroll, true);

        window.clearTimeout(this.timer);

        this.request?.unsubscribe();
    }

    private readonly onScroll =
        () =>
        {
            if (this.card || this.currentKey)
            {
                this.hide();
            }
        };

    onHover
    (
        hover: ListRowHover | null
    ):
        void
    {
        window.clearTimeout(this.timer);

        if (!this.enabled || !hover || !hover.row)
        {
            this.hide();

            return;
        }

        const key =
            this.keyOf(hover.row);

        if (!key)
        {
            this.hide();

            return;
        }

        this.timer =
            window.setTimeout(
                () => this.show(key, hover),
                ItemSummaryHover.DELAY_MS);
    }

    // Forget the cached items (after save / delete / refresh)
    clear():
        void
    {
        this.cache.clear();

        this.hide();
    }

    hide():
        void
    {
        window.clearTimeout(this.timer);

        this.request?.unsubscribe();

        this.currentKey = '';

        if (this.card)
        {
            this.card = null;

            this.changed();
        }
    }

    private show
    (
        key: string,
        hover: ListRowHover
    ):
        void
    {
        this.currentKey = key;

        const cached =
            this.cache.get(key);

        const head =
            this.titleOf(hover.row);

        this.card =
        {
            title:head.title,
            subtitle:head.subtitle,
            lines:cached ?? [],
            loading:!cached,
            failed:false,
            ...this.position(hover.rect, cached?.length ?? 3)
        };

        this.changed();

        if (cached)
        {
            return;
        }

        this.request?.unsubscribe();

        this.request =
            this.load(hover.row)
                .subscribe(
                {
                    next:lines =>
                    {
                        this.cache.set(key, lines);

                        if (this.currentKey !== key || !this.card)
                        {
                            return;
                        }

                        this.card =
                        {
                            ...this.card,
                            lines,
                            loading:false,
                            ...this.position(hover.rect, lines.length)
                        };

                        this.changed();
                    },

                    error:() =>
                    {
                        if (this.currentKey !== key || !this.card)
                        {
                            return;
                        }

                        this.card =
                        {
                            ...this.card,
                            loading:false,
                            failed:true
                        };

                        this.changed();
                    }
                });
    }

    // Under the row, from about a third of its width; above it
    // when there is no room below
    private position
    (
        rect: DOMRect,
        lineCount: number
    ):
        { left:number; top:number; width:number }
    {
        const width =
            Math.min(ItemSummaryHover.CARD_WIDTH, window.innerWidth - 24);

        const shown =
            Math.min(Math.max(lineCount, 1), ItemSummaryCardComponent.MAX_LINES);

        // header + column titles + lines + total (+ more)
        const height =
            64 + 30 + shown * 30 + 40 + (lineCount > ItemSummaryCardComponent.MAX_LINES ? 24 : 0);

        let left =
            rect.left + rect.width * 0.32;

        left =
            Math.max(12, Math.min(left, window.innerWidth - width - 12));

        let top =
            rect.bottom + 6;

        if (top + height > window.innerHeight - 12)
        {
            top = Math.max(12, rect.top - height - 6);
        }

        return { left, top, width };
    }
}
