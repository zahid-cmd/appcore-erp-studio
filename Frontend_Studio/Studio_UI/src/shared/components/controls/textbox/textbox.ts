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
   TEXT CASE
   auto  : 'title', except technical fields (default)
   title : first letter of every word capital
   upper : ALL CAPITAL
   lower : all small
   none  : kept exactly as typed
====================================================== */

export type TextboxCase =
    | 'auto'
    | 'title'
    | 'upper'
    | 'lower'
    | 'none';

/* =====================================================
   TECHNICAL FIELDS (auto mode keeps them as typed)
   Matched on the field's label, name or id. Icons,
   routes, keys, codes, numbers, emails, URLs ... are
   case-sensitive or code-like, so title case would
   break them (e.g. "fa-solid fa-book-open").
====================================================== */

const TECHNICAL_FIELD =
    /\b(icon|icons|route|routes|url|uri|link|path|key|keys|code|codes|slug|class|css|selector|prefix|suffix|e-?mail|password|user ?name|login|token|api|domain|website|web|regex|pattern|format|no|number|nid|bin|tin|phone|mobile|ip|host|port)\b/i;

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
       TEXT CASE
       Default 'auto' : title case, except technical fields
       (see TECHNICAL_FIELD). Always off for email / password /
       number types and numeric, decimal, email, tel and url
       input modes. Set textCase explicitly to override.
    ====================================================== */

    @Input()
    textCase: TextboxCase = 'auto';

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
       STATE
    ====================================================== */

    private composing = false;

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

    get effectiveCase(): TextboxCase
    {
        if (this.type !== 'text')
        {
            return 'none';
        }

        if (
            this.inputMode !== 'text' &&
            this.inputMode !== 'search'
        )
        {
            return 'none';
        }

        if (this.textCase === 'auto')
        {
            const hint =
                `${this.label} ${this.name} ${this.id}`;

            return TECHNICAL_FIELD.test(hint)
                ? 'none'
                : 'title';
        }

        return this.textCase;
    }

    get autoCapitalize(): string
    {
        switch (this.effectiveCase)
        {
            case 'title': return 'words';
            case 'upper': return 'characters';
            default:      return 'off';
        }
    }

    /* =====================================================
       VALUE CHANGE
    ====================================================== */

    onInput(event: Event): void
    {
        const input =
            event.target as HTMLInputElement;

        if (!this.composing)
        {
            this.applyCase(input);
        }

        this.value =
            input.value;

        this.valueChange.emit(
            this.value
        );
    }

    /* =====================================================
       IME COMPOSITION
       (do not change text while a word is being composed)
    ====================================================== */

    onCompositionStart(): void
    {
        this.composing = true;
    }

    onCompositionEnd(event: CompositionEvent): void
    {
        this.composing = false;

        const input =
            event.target as HTMLInputElement;

        this.applyCase(input);

        if (input.value !== this.value)
        {
            this.value =
                input.value;

            this.valueChange.emit(
                this.value
            );
        }
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

    /* =====================================================
       CASE CONVERSION
       Changes the input in place and keeps the cursor
       where the user is typing.
    ====================================================== */

    private applyCase(input: HTMLInputElement): void
    {
        const mode =
            this.effectiveCase;

        if (mode === 'none')
        {
            return;
        }

        const original =
            input.value;

        const converted =
            TextboxComponent.convert(original, mode);

        if (converted === original)
        {
            return;
        }

        const start =
            input.selectionStart;

        const end =
            input.selectionEnd;

        input.value =
            converted;

        if (start !== null && end !== null)
        {
            input.setSelectionRange(start, end);
        }
    }

    private static convert(
        text: string,
        mode: TextboxCase
    ): string
    {
        switch (mode)
        {
            case 'upper':
                return TextboxComponent.sameLength(text, c => c.toUpperCase());

            case 'lower':
                return TextboxComponent.sameLength(text, c => c.toLowerCase());

            case 'title':
                // First letter of every word to capital; the rest is kept
                // as typed, so short forms like "BRTA" or "CNG" stay intact.
                // A word starts after a space, - / ( & . , or at the start.
                return text.replace(
                    /(^|[\s\-\/(&.,])(\p{Ll})/gu,
                    (_m, before: string, letter: string) =>
                    {
                        const upper =
                            letter.toUpperCase();

                        return before + (upper.length === 1 ? upper : letter);
                    }
                );

            default:
                return text;
        }
    }

    /* Keeps length unchanged (e.g. 'ß' is left alone) so the cursor stays put. */
    private static sameLength(
        text: string,
        map: (c: string) => string
    ): string
    {
        let result = '';

        for (const c of text)
        {
            const m = map(c);

            result += m.length === c.length ? m : c;
        }

        return result;
    }
}