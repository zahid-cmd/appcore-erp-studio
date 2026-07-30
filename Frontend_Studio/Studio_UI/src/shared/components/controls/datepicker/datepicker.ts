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
       PLACEHOLDER
    ====================================================== */

    @Input()
    placeholder =
        'Select Date';

    /* =====================================================
       BEHAVIOUR
    ====================================================== */

    @Input()
    disabled = false;

    @Input()
    readonly = false;

    /* =====================================================
       STATE
    ====================================================== */

    calendarVisible = false;

    /* =====================================================
       DISPLAY VALUE
    ====================================================== */

    get displayValue(): string
    {
        if (!this.value)
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
       DATE SELECTED
    ====================================================== */

    onDateSelected
    (
        date: Date
    ): void
    {
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