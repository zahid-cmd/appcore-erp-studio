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
    selector: 'app-textbox',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl: './textbox.html',

    styleUrl: './textbox.css'
})
export class TextboxComponent
{
    /* =====================================================
       VALUE
    ====================================================== */

    @Input()
    value: string | number = '';

    @Output()
    valueChange =
        new EventEmitter<string | number>();

    /* =====================================================
       BASIC
    ====================================================== */

    @Input()
    id = '';

    @Input()
    name = '';

    @Input()
    label = '';

    @Input()
    placeholder = '';

    @Input()
    autocomplete = 'off';

    /* =====================================================
       INPUT TYPE
    ====================================================== */

    @Input()
    type:
        | 'text'
        | 'email'
        | 'password'
        | 'number'
        = 'text';

    @Input()
    inputMode:
        | 'text'
        | 'decimal'
        | 'numeric'
        | 'email'
        | 'search'
        | 'tel'
        | 'url'
        = 'text';

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
    spellcheck = false;

    @Input()
    tabIndex = 0;

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
       EVENTS
    ====================================================== */

    @Output()
    focus =
        new EventEmitter<FocusEvent>();

    @Output()
    blur =
        new EventEmitter<FocusEvent>();

    @Output()
    enterPressed =
        new EventEmitter<void>();

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
        const input =
            event.target as HTMLInputElement;

        this.value =
            input.value;

        this.valueChange.emit(
            this.value
        );
    }

    /* =====================================================
       EVENTS
    ====================================================== */

    onFocus(event: FocusEvent): void
    {
        this.focus.emit(event);
    }

    onBlur(event: FocusEvent): void
    {
        this.blur.emit(event);
    }

    onKeyDown(event: KeyboardEvent): void
    {
        if (event.key === 'Enter')
        {
            this.enterPressed.emit();
        }
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