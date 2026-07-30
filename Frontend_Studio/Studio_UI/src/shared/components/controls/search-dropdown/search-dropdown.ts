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
    FormsModule
}
from '@angular/forms';

import
{
    OverlayModule
}
from '@angular/cdk/overlay';

import
{
    OverlayComponent
}
from '../overlay/overlay';

import
{
    SearchBoxComponent
}
from '../../utilities/search-box/search-box';

@Component(
{
    selector: 'app-search-dropdown',

    standalone: true,

    imports:
    [
        CommonModule,

        FormsModule,

        OverlayModule,

        OverlayComponent,

        SearchBoxComponent
    ],

    templateUrl:
        './search-dropdown.html',

    styleUrl:
        './search-dropdown.css'
})
export class SearchDropdownComponent
{
    /* =====================================================
       INPUTS
    ====================================================== */

    @Input()
    label = '';

    @Input()
    placeholder =
        'Select Option';

    @Input()
    disabled = false;

    @Input()
    readonly = false;

    @Input()
    required = false;

    @Input()
    inline = false;

    @Input()
    items:any[] = [];

    @Input()
    labelField =
        'label';

    @Input()
    valueField =
        'value';

    @Input()
    value:any = null;

    @Input()
    minWidth:
        string | number | null = null;

    /* =====================================================
       OUTPUT
    ====================================================== */

    @Output()
    valueChange =
        new EventEmitter<any>();

    /* =====================================================
       STATE
    ====================================================== */

    isOpen = false;

    searchText = '';

    /* =====================================================
       FILTERED ITEMS
    ====================================================== */

    get filteredItems(): any[]
    {
        const keyword =
            this.searchText
                .trim()
                .toLowerCase();

        if (!keyword)
        {
            return this.items;
        }

        return this.items.filter(item =>

            String(
                item[this.labelField]
            )
            .toLowerCase()
            .includes(keyword)
        );
    }

    /* =====================================================
       SELECTED LABEL
    ====================================================== */

    get selectedLabel(): string
    {
        if
        (
            this.value === null
            ||
            this.value === undefined
        )
        {
            return '';
        }

        const selected =
            this.items.find
            (
                option =>

                    option[this.valueField]
                    ==
                    this.value
            );

        return selected
            ? selected[this.labelField]
            : '';
    }

    /* =====================================================
       SEARCH
    ====================================================== */

    onSearch
    (
        value:string
    ):
        void
    {
        this.searchText =
            value;
    }

    /* =====================================================
       TOGGLE
    ====================================================== */

    toggleDropdown():
        void
    {
        if
        (
            this.disabled
            ||
            this.readonly
        )
        {
            return;
        }

        this.isOpen =
            !this.isOpen;
    }

    /* =====================================================
       SELECT
    ====================================================== */

    selectOption
    (
        option:any,
        event:MouseEvent
    ):
        void
    {
        if
        (
            this.disabled
            ||
            this.readonly
        )
        {
            return;
        }

        event.stopPropagation();

        this.value =
            option[this.valueField];

        this.isOpen =
            false;

        this.searchText =
            '';

        this.valueChange.emit(
            this.value
        );
    }

    /* =====================================================
       OVERLAY CLOSED
    ====================================================== */

    onOverlayClosed():
        void
    {
        this.isOpen =
            false;

        this.searchText =
            '';
    }
}