//===============================================================
// Imports
//===============================================================

import
{
    Component,
    EventEmitter,
    Input,
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
    @ViewChild('searchBox')
    searchBox:
        any;

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

    // Optional counter at the right of an option row : the
    // option's field to show (empty = none; null / '' = no badge)
    @Input()
    badgeField =
        '';

    // Optional color swatch at the right of an option row (and
    // of the selected value) : the option's field holding a CSS
    // color (empty = none)
    @Input()
    swatchField =
        '';

    // Two-line rows (2026-11-16) : the option's code field. Empty =
    // read it from labels written as "CODE - Name" (SUB-002-002-001 -
    // Cash In Hand); the name is shown on top, the code under it
    @Input()
    codeField =
        '';

    // The list may be wider than the box so long names fit
    @Input()
    panelMinWidth:
        number =
        340;

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

            (
                String(
                    item[this.labelField] ?? ''
                )
                +
                ' '
                +
                (
                    this.codeField
                        ? String(item[this.codeField] ?? '')
                        : ''
                )
            )
            .toLowerCase()
            .includes(keyword)
        );
    }

    // Rows kept by value : a page that rebuilds its items on every
    // change detection (a getter) no longer re-creates the rows,
    // so the first click selects (it needed a double click)
    trackOption =
        (
            index: number,
            option: any
        ): any =>
            option?.[this.valueField] ?? index;

    /* =====================================================
       SELECTED LABEL
    ====================================================== */

    get selectedSwatch(): string
    {
        if
        (
            !this.swatchField
            ||
            this.value === null
            ||
            this.value === undefined
        )
        {
            return '';
        }

        const selected =
            this.items.find(
                option =>
                    option[this.valueField] == this.value
            );

        return selected?.[this.swatchField] ?? '';
    }

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
       NAME AND CODE (two-line rows)
    ====================================================== */

    // "SUB-002-002-001 - Cash In Hand" : a code (letters, then
    // one or more -parts) , " - ", the name
    private static readonly codeLabel =
        /^([A-Z]{2,6}(?:-[A-Z0-9]+)+)\s+[-\u2013]\s+(.+)$/;

    // Same object for the same label, so the rows are not rebuilt
    // on every change detection
    private partsCache =
        new Map<string, { name:string; code:string }>();

    parts
    (
        option:any
    ):
        { name:string; code:string }
    {
        const label =
            String(option?.[this.labelField] ?? '');

        const explicit =
            this.codeField
                ? String(option?.[this.codeField] ?? '').trim()
                : '';

        const key =
            explicit + '\u0001' + label;

        let result =
            this.partsCache.get(key);

        if (result)
        {
            return result;
        }

        if (explicit)
        {
            // The label may still start with the code : drop it
            const name =
                label.startsWith(explicit)
                    ? label.slice(explicit.length).replace(/^\s*[-\u2013]\s*/, '')
                    : label;

            result =
                { name: name || label, code: explicit };
        }
        else
        {
            const match =
                SearchDropdownComponent.codeLabel.exec(label);

            result =
                match
                    ? { name: match[2].trim(), code: match[1] }
                    : { name: label, code: '' };
        }

        if (this.partsCache.size > 2000)
        {
            this.partsCache.clear();
        }

        this.partsCache.set(key, result);

        return result;
    }

    // The closed box shows the name only (the full label is its
    // tooltip)
    get selectedName(): string
    {
        const label =
            this.selectedLabel;

        if (!label)
        {
            return '';
        }

        const selected =
            this.items.find(
                option =>
                    option[this.valueField] == this.value
            );

        return selected
            ? this.parts(selected).name
            : label;
    }

    get selectedTitle(): string | null
    {
        const label =
            this.selectedLabel;

        if (!label)
        {
            return null;
        }

        const selected =
            this.items.find(
                option =>
                    option[this.valueField] == this.value
            );

        const code =
            selected
                ? this.parts(selected).code
                : '';

        return code && !String(label).includes(code)
            ? code + ' - ' + label
            : String(label);
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

        if (this.isOpen)
        {
            setTimeout(
                () =>
                {
                    this.searchBox?.focus();
                }
            );
        }
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
