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
    OverlayModule
}
from '@angular/cdk/overlay';

import
{
    OverlayComponent
}
from '../overlay/overlay';

@Component(
{
    selector: 'app-dropdown',

    standalone: true,

    imports:
    [
        CommonModule,

        OverlayModule,

        OverlayComponent
    ],

    templateUrl:
        './dropdown.html',

    styleUrl:
        './dropdown.css'
})
export class DropdownComponent
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
    items: any[] = [];

    @Input()
    labelField =
        'label';

    @Input()
    valueField =
        'value';

    @Input()
    value: any = null;

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
       TOGGLE
    ====================================================== */

    toggleDropdown(): void
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
        option: any,
        event: MouseEvent
    ): void
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

        this.isOpen = false;

        this.valueChange.emit(
            this.value
        );
    }

    /* =====================================================
       OVERLAY CLOSED
    ====================================================== */

    onOverlayClosed(): void
    {
        this.isOpen = false;
    }
}