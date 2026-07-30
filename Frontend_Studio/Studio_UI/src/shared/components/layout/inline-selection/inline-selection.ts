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
    SearchDropdownComponent
}
from '../../controls/search-dropdown/search-dropdown';

/* =====================================================
   INLINE SELECTION DROPDOWN
===================================================== */

export interface InlineSelectionDropdown
{
    label: string;

    value?: any;

    items?: any[];

    placeholder?: string;

    disabled?: boolean;

    labelField?: string;

    valueField?: string;
}

/* =====================================================
   INLINE SELECTION COMPONENT
===================================================== */

@Component(
{
    selector: 'app-inline-selection',

    standalone: true,

    imports:
    [
        CommonModule,
        FormsModule,
        SearchDropdownComponent
    ],

    templateUrl:
        './inline-selection.html',

    styleUrl:
        './inline-selection.css'
})
export class InlineSelectionComponent
{
    /* =====================================================
       HEADER
    ====================================================== */

    @Input()
    title =
        'Selection';

    @Input()
    subtitle =
        '';

    /* =====================================================
       DROPDOWNS
    ====================================================== */

    @Input()
    dropdowns:
    InlineSelectionDropdown[] =
    [];

    /* =====================================================
       BUTTON
    ====================================================== */

    @Input()
    buttonText =
        'Add';

    @Input()
    icon =
        'fas fa-plus';

    @Input()
    showButton =
        true;

    @Input()
    disabled =
        false;

    @Input()
    loading =
        false;

    @Input()
    addDisabled =
        false;

    /* =====================================================
       OUTPUTS
    ====================================================== */

    @Output()
    add =
        new EventEmitter<void>();

    @Output()
    dropdownChange =
        new EventEmitter<InlineSelectionDropdown>();

    /* =====================================================
       DROPDOWN VALUE CHANGED
    ====================================================== */

    onDropdownValueChanged
    (
        dropdown: InlineSelectionDropdown,
        value: any
    ): void
    {
        dropdown.value =
            value;

        this.dropdownChange.emit(
            dropdown
        );
    }

    /* =====================================================
       EVENTS
    ====================================================== */

    onAdd(): void
    {
        if
        (
            this.disabled
            ||
            this.loading
            ||
            this.addDisabled
        )
        {
            return;
        }

        this.add.emit();
    }
}