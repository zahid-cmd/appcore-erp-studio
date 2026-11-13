//===============================================================
// Imports
//===============================================================
import
{
    CommonModule
}
from '@angular/common';
import
{
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnDestroy,
    Output,
    inject
}
from '@angular/core';
import
{
    ActivityItem,
    ActivitySelector,
    PageSlot,
    activityColumnWidth,
    pageSlotColumns
}
from '../../utilities/activity-selector/activity-selector';
import
{
    EmptyStateComponent
}
from '../empty-state/empty-state';
import
{
    OrbitLoaderComponent
}
from '../../utilities/orbit-loader/orbit-loader';
import
{
    CheckboxComponent
}
from '../../utilities/checkbox/checkbox';

//===============================================================
// Interfaces
//===============================================================
export type ActivityCartHeaderField =
    'all'
    |
    'view'
    |
    'add'
    |
    'update'
    |
    'delete'
    |
    'restore';

export interface ItemCartColumn
{
    header:string;
    field:string;
    width?:string;
    align:
        'left'
        |
        'center'
        |
        'right';
    type:
        'serial'
        |
        'text'
        |
        'masterActivities'
        |
        'action';
    headerCheckbox?:boolean;
}

export interface ItemCartRow
{
    id:number;
    roleProfileId:number | null;
    moduleId:number;
    menuId:number;
    subMenuId:number;
    menu:string;
    subMenu:string;
    masterActivities:
        ActivityItem[];
    [key:string]:any;
}

//===============================================================
// Component
//===============================================================
@Component(
{
    selector:'app-item-cart',
    standalone:true,
    imports:
    [
        CommonModule,
        ActivitySelector,
        CheckboxComponent,
        EmptyStateComponent,
        OrbitLoaderComponent
    ],
    templateUrl:'./item-cart.html',
    styleUrl:'./item-cart.css'
})
export class ItemCart implements AfterViewInit, OnDestroy
{
    //===========================================================
    // Floating Action column (2026-11-14) : while the table
    // scrolls sideways, Action stays at the right edge of the
    // frame (sticky) with a soft shadow; the host gets
    // ic-scroll when there is something to scroll and ic-end
    // when the body is scrolled all the way right.
    //===========================================================

    private readonly host =
        inject(ElementRef<HTMLElement>);

    private resizeObserver?:ResizeObserver;

    private mutationObserver?:MutationObserver;

    ngAfterViewInit():
        void
    {
        const el =
            this.host.nativeElement as HTMLElement;

        const update =
            () => this.updateScrollState();

        if (typeof ResizeObserver !== 'undefined')
        {
            this.resizeObserver =
                new ResizeObserver(update);

            this.resizeObserver.observe(el);
        }

        // rows / tables come and go (loading, paging)
        this.mutationObserver =
            new MutationObserver(update);

        this.mutationObserver.observe(el, { childList:true, subtree:true });

        update();
    }

    ngOnDestroy():
        void
    {
        this.resizeObserver?.disconnect();

        this.mutationObserver?.disconnect();
    }

    private updateScrollState():
        void
    {
        const el =
            this.host.nativeElement as HTMLElement;

        const body =
            el.querySelector('.list-table-body') as HTMLElement | null;

        if (!body)
        {
            return;
        }

        const scroll =
            body.scrollWidth > body.clientWidth + 1;

        const end =
            body.scrollLeft + body.clientWidth >= body.scrollWidth - 1;

        el.classList.toggle('ic-scroll', scroll);

        el.classList.toggle('ic-end', !scroll || end);

        el.classList.toggle('ic-scrolled', scroll && body.scrollLeft > 0);

        // the header leaves room for the body's vertical scrollbar,
        // so both scroll the same distance and Action lines up
        const header =
            el.querySelector('.list-table-header') as HTMLElement | null;

        if (header)
        {
            const gutter =
                Math.max(0, body.offsetWidth - body.clientWidth);

            header.style.paddingRight = `${gutter}px`;

            header.scrollLeft = body.scrollLeft;
        }
    }

    //===========================================================
    // Inputs
    //===========================================================
    @Input()
    columns:
        ItemCartColumn[] = [];

    @Input()
    rows:
        ItemCartRow[] = [];

    @Input()
    loading =
        false;

    @Input()
    orbitLoading =
        false;

    @Input()
    error =
        false;

    @Input()
    serialOffset =
        0;

    //===========================================================
    // Page Slots : every page action in the table, fixed order
    // (each keeps the same column on every row)
    //===========================================================
    @Input()
    pageSlots:
        PageSlot[] = [];

    //===========================================================
    // All rows (every page of the table) : the column "All"
    // boxes act on these, not only on the visible page.
    //===========================================================
    @Input()
    allRows:
        ItemCartRow[] = [];

    //===========================================================
    // Table width (2026-11-14) : the fixed columns plus what the
    // activities need. On a narrower canvas the body scrolls
    // sideways and the header follows it.
    //===========================================================

    get tableMinWidth():
        number
    {
        const fixed =
            this.columns
                .filter(column => column.type !== 'masterActivities')
                .reduce((sum, column) => sum + (parseFloat(column.width ?? '') || 100), 0);

        return fixed + activityColumnWidth(this.pageSlots);
    }

    //===========================================================
    // Frozen left columns (2026-11-14) : # and Sub Menu stay at
    // the left edge while the table scrolls sideways.
    //===========================================================

    isStickLeft
    (
        column:ItemCartColumn
    ):
        boolean
    {
        return column.type === 'serial'
            ||
            (column.type === 'text' && column.field === 'subMenu');
    }

    // the last frozen column carries the shadow
    isStickLeftLast
    (
        column:ItemCartColumn
    ):
        boolean
    {
        const frozen =
            this.columns.filter(c => this.isStickLeft(c));

        return frozen.length > 0 && frozen[frozen.length - 1] === column;
    }

    // left offset = the widths of the frozen columns before it
    stickLeft
    (
        column:ItemCartColumn
    ):
        number | null
    {
        if (!this.isStickLeft(column))
        {
            return null;
        }

        let left = 0;

        for (const c of this.columns)
        {
            if (c === column)
            {
                break;
            }

            if (this.isStickLeft(c))
            {
                left += parseFloat(c.width ?? '') || 0;
            }
        }

        return left;
    }

    onBodyScroll
    (
        event:Event
    ):
        void
    {
        const body =
            event.target as HTMLElement;

        const header =
            body.parentElement?.querySelector('.list-table-header') as HTMLElement | null;

        if (header)
        {
            header.scrollLeft = body.scrollLeft;
        }

        this.updateScrollState();
    }

    get slotColumns():
        string
    {
        return pageSlotColumns(
            this.pageSlots
        );
    }

    private get sourceRows():
        ItemCartRow[]
    {
        return this.allRows.length > 0
            ? this.allRows
            : this.rows;
    }

    // Common columns, in the same order as the rows
    get commonColumns():
        ActivityItem[]
    {
        const first =
            this.sourceRows[0];

        return (first?.masterActivities ?? [])
            .filter(activity => activity.group !== 'page');
    }

    // Column "All" : ticked when every row that has it is ticked
    columnState
    (
        ids:number[]
    ):
        boolean
    {
        const items =
            this.sourceRows
                .flatMap(row => row.masterActivities)
                .filter(activity => ids.includes(activity.id));

        return items.length > 0
            &&
            items.every(activity => activity.checked);
    }

    onColumnChanged
    (
        ids:number[],
        checked:boolean
    ):
        void
    {
        if
        (
            this.readOnly
        )
        {
            return;
        }

        this.columnCheckboxChange.emit(
        {
            ids,
            checked
        });
    }

    //===========================================================
    // Read Only
    //===========================================================
    @Input()
    readOnly =
        false;

    //===========================================================
    // Header Checkbox States
    //===========================================================
    @Input()
    headerCheckboxStates:
    {
        [field:string]:boolean;
    } =
    {
        all:false,
        view:false,
        add:false,
        update:false,
        delete:false,
        restore:false
    };

    //===========================================================
    // Outputs
    //===========================================================
    @Output()
    remove =
        new EventEmitter<ItemCartRow>();

    @Output()
    headerCheckboxStateChange =
        new EventEmitter<
        {
            field:ActivityCartHeaderField;
            checked:boolean;
        }>();

    @Output()
    activityChanged =
        new EventEmitter<void>();

    // Column "All" box : the page ticks / clears these activity ids
    // on every row (all pages of the table)
    @Output()
    columnCheckboxChange =
        new EventEmitter<
        {
            ids:number[];
            checked:boolean;
        }>();

    //===========================================================
    // Track Row
    //===========================================================
    trackRow
    (
        index:number,
        row:ItemCartRow
    ):
        number
    {
        return row.id;
    }

    //===========================================================
    // Remove
    //===========================================================
    onRemove
    (
        row:ItemCartRow,
        event:MouseEvent
    ):
        void
    {
        event.stopPropagation();

        this.remove.emit(
            row
        );
    }

    //===========================================================
    // Header Checkbox Changed
    //===========================================================
    onHeaderCheckboxChanged
    (
        field:ActivityCartHeaderField,
        checked:boolean
    ):
        void
    {
        if
        (
            this.readOnly
        )
        {
            return;
        }

        this.headerCheckboxStates[field] =
            checked;

        this.headerCheckboxStateChange.emit(
        {
            field,
            checked
        });
    }

    //===========================================================
    // Activity Changed
    //===========================================================
    onActivityChanged():
        void
    {
        this.activityChanged.emit();
    }

    //===========================================================
    // Cell Value
    //===========================================================
    getCellValue
    (
        row:ItemCartRow,
        column:ItemCartColumn
    ):
        any
    {
        return row[
            column.field
        ];
    }

    //===========================================================
    // Serial
    //===========================================================
    getSerial
    (
        index:number
    ):
        number
    {
        return this.serialOffset
            +
            index
            +
            1;
    }
}