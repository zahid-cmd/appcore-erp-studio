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
    guardElement
}
from '../text-guard';

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

    private composing = false;

    /* =====================================================
       ENGLISH ONLY (see text-guard.ts)
       Characters the database cannot store are dropped as
       they are typed; a short note shows for 2.5 s.
    ====================================================== */

    blocked = false;

    private blockedTimer: ReturnType<typeof setTimeout> | null = null;

    private guard(element: HTMLInputElement | HTMLTextAreaElement): void
    {
        if (!guardElement(element))
        {
            return;
        }

        this.blocked = true;

        if (this.blockedTimer)
        {
            clearTimeout(this.blockedTimer);
        }

        this.blockedTimer =
            setTimeout(() => { this.blocked = false; this.blockedTimer = null; }, 2500);
    }

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

        if (!this.composing)
        {
            this.guard(textarea);
        }

        this.value =
            textarea.value;

        this.valueChange.emit(
            this.value
        );
    }

    /* =====================================================
       IME COMPOSITION (Avro, phonetic keyboards ...)
    ====================================================== */

    onCompositionStart(): void
    {
        this.composing = true;
    }

    onCompositionEnd(event: CompositionEvent): void
    {
        this.composing = false;

        const textarea =
            event.target as HTMLTextAreaElement;

        this.guard(textarea);

        if (textarea.value !== this.value)
        {
            this.value =
                textarea.value;

            this.valueChange.emit(
                this.value
            );
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