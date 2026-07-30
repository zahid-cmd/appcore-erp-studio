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

@Component(
{
    selector: 'app-textarea',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl: './textarea.html',

    styleUrl: './textarea.css'
})
export class TextareaComponent
{
    /* =====================================================
       VALUE
    ====================================================== */

    @Input()
    value = '';

    @Output()
    valueChange =
        new EventEmitter<string>();

    /* =====================================================
       BASIC
    ====================================================== */

    @Input()
    label = '';

    @Input()
    placeholder = '';

    /* =====================================================
       ROWS
    ====================================================== */

    @Input()
    rows = 4;

    /* =====================================================
       BEHAVIOUR
    ====================================================== */

    @Input()
    required = false;

    @Input()
    disabled = false;

    @Input()
    readonly = false;

    @Input()
    autofocus = false;

    @Input()
    maxLength?: number;

    /* =====================================================
       ICONS
    ====================================================== */

    @Input()
    prefixIcon = '';

    @Input()
    suffixIcon = '';

    /* =====================================================
       COMPUTED
    ====================================================== */

    get hasPrefix(): boolean
    {
        return this.prefixIcon.trim().length > 0;
    }

    get hasSuffix(): boolean
    {
        return this.suffixIcon.trim().length > 0;
    }

    /* =====================================================
       VALUE CHANGE
    ====================================================== */

    onInput(event: Event): void
    {
        const textarea =
            event.target as HTMLTextAreaElement;

        this.value =
            textarea.value;

        this.valueChange.emit(
            this.value
        );
    }

    /* =====================================================
       CLEAR
    ====================================================== */

    clear(): void
    {
        if (this.disabled || this.readonly)
        {
            return;
        }

        this.value = '';

        this.valueChange.emit(
            this.value
        );
    }
}