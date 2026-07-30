/* =====================================================
   IMPORTS
===================================================== */

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

/* =====================================================
   SEARCH BOX
===================================================== */

@Component(
{
    selector: 'app-search-box',

    standalone: true,

    imports:
    [
        CommonModule,
        FormsModule
    ],

    templateUrl:
        './search-box.html',

    styleUrl:
        './search-box.css'
})
export class SearchBoxComponent
{
    /* =====================================================
       INPUTS
    ====================================================== */

    @Input()
    placeholder = 'Search...';

    @Input()
    value = '';

    @Input()
    disabled = false;

    @Input()
    autofocus = false;

    /* =====================================================
       OUTPUTS
    ====================================================== */

    @Output()
    valueChange =
        new EventEmitter<string>();

    @Output()
    search =
        new EventEmitter<string>();

    /* =====================================================
       INPUT CHANGED
    ====================================================== */

    onInput(
        value: string
    ): void
    {
        this.value = value;

        this.valueChange.emit(
            value
        );

        this.search.emit(
            value
        );
    }

    /* =====================================================
       CLEAR
    ====================================================== */

    clear(): void
    {
        if (this.disabled)
        {
            return;
        }

        this.value = '';

        this.valueChange.emit(
            this.value
        );

        this.search.emit(
            this.value
        );
    }
}