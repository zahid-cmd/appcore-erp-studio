//===============================================================
// Imports
//===============================================================

import
{
    Component,
    EventEmitter,
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
    CheckboxComponent
}
from '../../utilities/checkbox/checkbox';

//===============================================================
// Models
//===============================================================

export interface ActivityItem
{
    id:number;

    text:string;

    checked:boolean;

    // common : on every page (fixed columns)
    // page   : only on its own pages (Page Actions slots)
    group?:
        'common'
        |
        'page';
}

//===============================================================
// Page Slot
//
// One fixed column place in the Page Actions area. Every page
// action has its own slot, so it sits in the same place on every
// row and has its own "All" box in the header.
//===============================================================

export interface PageSlot
{
    key:string;

    ids:number[];

    label:string;
}

//===============================================================
// Build Page Slots : one per action, in display order
//===============================================================

export function buildPageSlots
(
    actions:ActivityItem[],
    _pagesOf?:Map<number, Set<number>>
):
    PageSlot[]
{
    return actions.map
    (
        action =>
        ({
            key:String(action.id),
            ids:[ action.id ],
            label:action.text
        })
    );
}

//===============================================================
// Page Slot Columns
//
// Slots fill top-to-bottom in pairs. Each column is as wide as the
// longer label of its pair, so the header and every row line up.
//===============================================================

export function pageSlotColumns
(
    slots:PageSlot[]
):
    string
{
    // checkbox + gap (26px) + label (~7px a letter at 12.5px,
    // so no label is cut) + a little air (2026-11-14)
    const width =
        (slot?:PageSlot):number =>
            slot
                ? 34 + Math.ceil(slot.label.length * 7)
                : 0;

    const columns:
        string[] =
        [];

    for
    (
        let index = 0;
        index < slots.length;
        index += 2
    )
    {
        columns.push(
            `${Math.max(width(slots[index]), width(slots[index + 1]))}px`
        );
    }

    return columns.join(' ');
}

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-activity-selector',

    standalone:true,

    imports:
    [
        CommonModule,
        CheckboxComponent
    ],

    templateUrl:
        './activity-selector.html',

    styleUrl:
        './activity-selector.css'
})

export class ActivitySelector
{
    //===========================================================
    // Fields
    //===========================================================

    private _activities:
        ActivityItem[] = [];

    private byId =
        new Map<number, ActivityItem>();

    //===========================================================
    // Inputs
    //===========================================================

    @Input()
    set activities
    (
        value:ActivityItem[]
    )
    {
        this._activities =
            value ?? [];

        this.byId =
            new Map(
                this._activities.map(
                    activity => [activity.id, activity] as [number, ActivityItem]
                )
            );
    }

    get activities():
        ActivityItem[]
    {
        return this._activities;
    }

    @Input()
    readOnly =
        false;

    // Fixed page-action slots for the whole table
    @Input()
    pageSlots:
        PageSlot[] = [];

    get slotColumns():
        string
    {
        return pageSlotColumns(
            this.pageSlots
        );
    }

    //===========================================================
    // Outputs
    //===========================================================

    @Output()
    activitiesChange =
        new EventEmitter<ActivityItem[]>();

    @Output()
    changed =
        new EventEmitter<void>();

    //===========================================================
    // Groups
    //===========================================================

    get hasActivities():
        boolean
    {
        return this.activities.length > 0;
    }

    get commonActivities():
        ActivityItem[]
    {
        return this.activities.filter(
            activity => activity.group !== 'page'
        );
    }

    // The row's own action in a slot (at most one per slot)
    slotItem
    (
        slot:PageSlot
    ):
        ActivityItem | undefined
    {
        for
        (
            const id of slot.ids
        )
        {
            const item =
                this.byId.get(id);

            if
            (
                item
                &&
                item.group === 'page'
            )
            {
                return item;
            }
        }

        return undefined;
    }

    //===========================================================
    // All (live : also follows the column "All" boxes)
    //===========================================================

    get allChecked():
        boolean
    {
        return this.activities.length > 0
            &&
            this.activities.every(
                activity => activity.checked
            );
    }

    onAllChanged
    (
        checked:boolean
    ):
        void
    {
        if (this.readOnly)
        {
            return;
        }

        this.activities.forEach(
            activity =>
            {
                activity.checked =
                    checked;
            });

        this.activitiesChange.emit(
            this.activities
        );

        this.changed.emit();
    }

    //===========================================================
    // Checkbox Changed
    //===========================================================

    onCheckedChanged():
        void
    {
        if (this.readOnly)
        {
            return;
        }

        this.activitiesChange.emit(
            this.activities
        );

        this.changed.emit();
    }
}

//===============================================================
// Activity Table Width (2026-11-14)
//
// The width the activity column needs so nothing is cut :
// side padding + All + 3 common columns + the page-action
// slots. The table never gets narrower than this; a narrower
// canvas scrolls sideways (item-cart).
// Keep in step with activity-selector.css / item-cart.css.
//===============================================================

export const ACT_ALL_WIDTH = 84;

export const ACT_COL_WIDTH = 116;

export const ACT_SLOT_GAP = 22;

export function activityColumnWidth
(
    slots:PageSlot[]
):
    number
{
    const columns =
        pageSlotColumns(slots)
            .split(' ')
            .filter(c => c.length > 0)
            .map(c => parseFloat(c) || 0);

    const page =
        columns.length > 0
            ? 4 + 12 + 1
              + columns.reduce((a, c) => a + c, 0)
              + ACT_SLOT_GAP * (columns.length - 1)
            : 0;

    // 32 = the cell's side padding, 16 = air at the end
    return 32 + ACT_ALL_WIDTH + 3 * ACT_COL_WIDTH + page + 16;
}
