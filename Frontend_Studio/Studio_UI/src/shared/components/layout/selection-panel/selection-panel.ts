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
   SELECTION PANEL DROPDOWN
===================================================== */

export interface SelectionPanelDropdown
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
   SELECTION PANEL COMPONENT
===================================================== */

@Component(
{
    selector: 'app-selection-panel',

    standalone: true,

    imports:
    [
        CommonModule,
        FormsModule,
        SearchDropdownComponent
    ],

    templateUrl:
        './selection-panel.html',

    styleUrl:
        './selection-panel.css'
})
export class SelectionPanelComponent
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
    SelectionPanelDropdown[] =
    [];

    /* =====================================================
    BUTTON
    ===================================================== */

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
        new EventEmitter<SelectionPanelDropdown>();

    /* =====================================================
       DROPDOWN VALUE CHANGED
    ====================================================== */

    onDropdownValueChanged
    (
        dropdown: SelectionPanelDropdown,
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
    ===================================================== */

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