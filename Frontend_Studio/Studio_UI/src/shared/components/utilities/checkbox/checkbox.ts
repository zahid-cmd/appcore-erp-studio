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

/* =====================================================
   CHECKBOX
===================================================== */

@Component(
{
    selector:'app-checkbox',

    standalone:true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './checkbox.html',

    styleUrl:
        './checkbox.css'
})
export class CheckboxComponent
{
    /* =====================================================
       VALUE
    ====================================================== */

    @Input()
    value = false;

    @Output()
    valueChange =
        new EventEmitter<boolean>();

    /* =====================================================
       LABEL
    ====================================================== */

    @Input()
    label = '';

    /* =====================================================
       APPEARANCE
    ====================================================== */

    @Input()
    appearance:
        'standard'
        |
        'switch'
        |
        'card'
        =
        'standard';

    /* =====================================================
       COLOR
    ====================================================== */

    @Input()
    color:
        'primary'
        |
        'success'
        |
        'danger'
        |
        'warning'
        |
        'secondary'
        =
        'primary';

    /* =====================================================
       BEHAVIOUR
    ====================================================== */

    @Input()
    disabled = false;

    @Input()
    readOnly = false;

    @Input()
    autofocus = false;

    /* =====================================================
       COMPUTED
    ====================================================== */

    get interactive():
        boolean
    {
        return !this.disabled &&
               !this.readOnly;
    }

    /* =====================================================
       TOGGLE
    ====================================================== */

    toggle():
        void
    {
        if (!this.interactive)
        {
            return;
        }

        this.value =
            !this.value;

        this.valueChange.emit(
            this.value
        );
    }

    /* =====================================================
       CLEAR
    ====================================================== */

    clear():
        void
    {
        if (!this.interactive)
        {
            return;
        }

        this.value =
            false;

        this.valueChange.emit(
            this.value
        );
    }
}