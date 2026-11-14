/* =====================================================
   IMPORTS
===================================================== */

import
{
    Component,
    EventEmitter,
    HostListener,
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
    CalendarComponent
}
from '../calendar/calendar';

import
{
    OverlayComponent
}
from '../overlay/overlay';

/* =====================================================
   DATEPICKER
===================================================== */

@Component(
{
    selector: 'app-datepicker',

    standalone: true,

    imports:
    [
        CommonModule,

        OverlayModule,

        CalendarComponent,

        OverlayComponent
    ],

    templateUrl:
        './datepicker.html',

    styleUrl:
        './datepicker.css'
})
export class DatepickerComponent
{
    /* =====================================================
       VALUE
    ====================================================== */

    @Input()
    value: Date =
        new Date();

    @Output()
    valueChange =
        new EventEmitter<Date>();

    /* =====================================================
       BASIC (optional, same as app-textbox)
    ====================================================== */

    @Input()
    id = '';

    @Input()
    label = '';

    @Input()
    required = false;

    /* =====================================================
       PLACEHOLDER
    ====================================================== */

    @Input()
    placeholder =
        'Select Date';

    /* =====================================================
       RANGE (optional, passed to the calendar)
    ====================================================== */

    @Input()
    minDate: Date | null =
        null;

    @Input()
    maxDate: Date | null =
        null;

    /* =====================================================
       BEHAVIOUR
    ====================================================== */

    @Input()
    disabled = false;

    @Input()
    readonly = false;

    // An optional date : emptying the field clears the value (null
    // is emitted). Off by default : the old value stays.
    @Input()
    allowEmpty = false;

    // Month mode : the picker picks a month (the value is the first
    // day of the month). The field shows Nov-2026; the calendar
    // opens on the months. Typed : nov 2026, 11-2026, 2026-11.
    @Input()
    monthMode = false;

    /* =====================================================
       STATE
    ====================================================== */

    calendarVisible = false;

    // Typed entry : the text while the user types; committed on
    // Enter / Tab / leaving the field
    typing = false;

    draftText = '';

    // The typed text read as a date (moves the calendar along)
    draftDate: Date | null = null;

    // Last commit could not be read : the field turns red
    typedInvalid = false;

    private static readonly MONTHS =
        ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    /* =====================================================
       DISPLAY VALUE
    ====================================================== */

    get displayValue(): string
    {
        if
        (
            !(this.value instanceof Date)
            ||
            isNaN(this.value.getTime())
        )
        {
            return '';
        }

        const day =
            this.value
                .getDate()
                .toString()
                .padStart(2, '0');

        const month =
        [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec'
        ][this.value.getMonth()];

        const year =
            this.value.getFullYear();

        if (this.monthMode)
        {
            return `${month}-${year}`;
        }

        return `${day}-${month}-${year}`;
    }

    /* =====================================================
       OPEN
    ====================================================== */

    openCalendar(): void
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

        this.calendarVisible = true;
    }

    /* =====================================================
       TOGGLE
    ====================================================== */

    toggleCalendar(): void
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

        this.calendarVisible =
            !this.calendarVisible;
    }

    /* =====================================================
       CLOSE
    ====================================================== */

    closeCalendar(): void
    {
        this.calendarVisible = false;
    }

    /* =====================================================
       KEYBOARD (Enter / Space open, Escape closes)
    ====================================================== */

    onKeyDown
    (
        event: KeyboardEvent
    ): void
    {
        if (event.key === 'Enter')
        {
            event.preventDefault();

            if (this.typing)
            {
                this.commitTyped();

                this.closeCalendar();
            }
            else
            {
                this.toggleCalendar();
            }
        }
        else if (event.key === 'Escape')
        {
            // Escape : the typed text is dropped
            this.cancelTyped();

            this.closeCalendar();
        }
        else if (event.key === 'ArrowDown' && (event.altKey || !this.calendarVisible))
        {
            event.preventDefault();

            this.openCalendar();
        }
        else if (event.key === 'Tab')
        {
            this.commitTyped();

            this.closeCalendar();
        }
    }

    /* =====================================================
       TYPED ENTRY
    ====================================================== */

    // Focus selects the text, so typing replaces it
    onInputFocus
    (
        event: FocusEvent
    ): void
    {
        const input =
            event.target as HTMLInputElement;

        setTimeout(() => input.select());
    }

    onInput
    (
        event: Event
    ): void
    {
        this.typing = true;

        this.typedInvalid = false;

        this.draftText =
            (event.target as HTMLInputElement).value;

        const parsed =
            this.parseTyped(this.draftText);

        this.draftDate =
            parsed && this.inRange(parsed) ? parsed : null;
    }

    // Enter / Tab / leaving the field : take the typed date
    commitTyped(): void
    {
        if (!this.typing)
        {
            return;
        }

        const text =
            this.draftText.trim();

        const parsed =
            text ? this.parseTyped(text) : null;

        this.typing = false;

        this.draftText = '';

        this.draftDate = null;

        if (!text && this.allowEmpty)
        {
            this.typedInvalid = false;

            if (this.value)
            {
                this.value = null as any;

                this.valueChange.emit(
                    this.value
                );
            }

            return;
        }

        if (!parsed || !this.inRange(parsed))
        {
            // Not a date (or outside the allowed range) : the old
            // value stays; the field shows red until the next edit
            this.typedInvalid = text.length > 0;

            return;
        }

        this.typedInvalid = false;

        if (this.sameDay(parsed, this.value))
        {
            return;
        }

        this.value = parsed;

        this.valueChange.emit(
            this.value
        );
    }

    private cancelTyped(): void
    {
        this.typing = false;

        this.draftText = '';

        this.draftDate = null;

        this.typedInvalid = false;
    }

    private sameDay
    (
        a: Date,
        b: Date
    ): boolean
    {
        return b instanceof Date
            && !isNaN(b.getTime())
            && a.getFullYear() === b.getFullYear()
            && a.getMonth() === b.getMonth()
            && a.getDate() === b.getDate();
    }

    private inRange
    (
        date: Date
    ): boolean
    {
        const day =
            new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

        const floor =
            (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();

        if (this.minDate instanceof Date && !isNaN(this.minDate.getTime()) && day < floor(this.minDate))
        {
            return false;
        }

        if (this.maxDate instanceof Date && !isNaN(this.maxDate.getTime()) && day > floor(this.maxDate))
        {
            return false;
        }

        return true;
    }

    // Day first (Bangladesh) : 01-Jul-2025, 1 jul 25, 01/07/2025,
    // 1.7.25, 010725, 01072025, 2025-07-01, 1-7 (this year),
    // "today" / "t"
    private parseTyped
    (
        raw: string
    ): Date | null
    {
        const text =
            raw.trim().toLowerCase();

        if (!text)
        {
            return null;
        }

        // month mode : nov 2026 / nov-2026 / 11-2026 / 2026-11 /
        // t (this month)
        if (this.monthMode)
        {
            if (text === 't' || text === 'today')
            {
                const now = new Date();

                return new Date(now.getFullYear(), now.getMonth(), 1);
            }

            let found: RegExpMatchArray | null;

            let monthIndex = -1;

            let yearNumber = 0;

            if ((found = text.match(/^([a-z]{3,9})[\s\-\/.,]*(\d{4})$/)))
            {
                monthIndex = DatepickerComponent.MONTHS.indexOf(found[1].substring(0, 3));
                yearNumber = Number(found[2]);
            }
            else if ((found = text.match(/^(\d{1,2})[\s\-\/.](\d{4})$/)))
            {
                monthIndex = Number(found[1]) - 1;
                yearNumber = Number(found[2]);
            }
            else if ((found = text.match(/^(\d{4})[\s\-\/.](\d{1,2})$/)))
            {
                monthIndex = Number(found[2]) - 1;
                yearNumber = Number(found[1]);
            }

            return monthIndex >= 0 && monthIndex <= 11 && yearNumber >= 1900 && yearNumber <= 2999
                ? new Date(yearNumber, monthIndex, 1)
                : null;
        }

        if (text === 't' || text === 'today')
        {
            const now = new Date();

            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }

        const baseYear =
            this.value instanceof Date && !isNaN(this.value.getTime())
                ? this.value.getFullYear()
                : new Date().getFullYear();

        let day = 0;
        let month = 0;
        let year = 0;

        let m: RegExpMatchArray | null;

        if ((m = text.match(/^(\d{4})[-\/.\s](\d{1,2})[-\/.\s](\d{1,2})$/)))
        {
            // 2025-07-01
            year = +m[1]; month = +m[2]; day = +m[3];
        }
        else if ((m = text.match(/^(\d{1,2})[-\/.\s]*([a-z]{3,9})[-\/.\s,]*(\d{2}|\d{4})?$/)))
        {
            // 01-Jul-2025, 1 jul 25, 1jul
            const index =
                DatepickerComponent.MONTHS.indexOf(m[2].substring(0, 3));

            if (index < 0)
            {
                return null;
            }

            day = +m[1]; month = index + 1; year = m[3] ? +m[3] : baseYear;
        }
        else if ((m = text.match(/^(\d{1,2})[-\/.\s](\d{1,2})(?:[-\/.\s](\d{2}|\d{4}))?$/)))
        {
            // 01/07/2025, 1-7-25, 1/7
            day = +m[1]; month = +m[2]; year = m[3] ? +m[3] : baseYear;
        }
        else if ((m = text.match(/^(\d{2})(\d{2})(\d{2}|\d{4})$/)))
        {
            // 010725, 01072025
            day = +m[1]; month = +m[2]; year = +m[3];
        }
        else
        {
            return null;
        }

        if (year < 100)
        {
            year += 2000;
        }

        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2999)
        {
            return null;
        }

        const date =
            new Date(year, month - 1, day);

        // 31-Feb and the like are refused
        return date.getMonth() === month - 1 && date.getDate() === day
            ? date
            : null;
    }

    /* =====================================================
       DATE SELECTED
    ====================================================== */

    onDateSelected
    (
        date: Date
    ): void
    {
        this.cancelTyped();

        this.value = date;

        this.valueChange.emit(
            this.value
        );

        this.closeCalendar();
    }

    /* =====================================================
       OUTSIDE CLICK
    ====================================================== */

    @HostListener(
        'document:click',
        ['$event']
    )
    onDocumentClick
    (
        event: MouseEvent
    ): void
    {
        const target =
            event.target as HTMLElement;

        if
        (
            !target.closest('.datepicker')
            &&
            !target.closest('.cdk-overlay-container')
        )
        {
            this.closeCalendar();
        }
    }

    /* =====================================================
       CLEAR
    ====================================================== */

    clear(): void
    {
        this.value =
            new Date();

        this.valueChange.emit(
            this.value
        );

        this.closeCalendar();
    }
}