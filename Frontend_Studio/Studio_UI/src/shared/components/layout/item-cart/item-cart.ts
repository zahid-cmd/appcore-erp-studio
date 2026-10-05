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
    Component,
    EventEmitter,
    Input,
    Output
}
from '@angular/core';
import
{
    ActivityItem,
    ActivitySelector
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
export class ItemCart
{
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