import
{
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

interface CalendarDay
{
    date: Date;

    day: number;

    isCurrentMonth: boolean;

    isToday: boolean;

    isSelected: boolean;

    isFriday: boolean;
}

@Component({
    selector: 'app-calendar',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl: './calendar.html',

    styleUrl: './calendar.css'
})
export class CalendarComponent
    implements OnInit
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
       BEHAVIOUR
    ====================================================== */

    @Input()
    disabled = false;

    @Input()
    readonly = false;

    /* =====================================================
       WEEK DAYS
    ====================================================== */

    weekDays =
    [
        'Sat',
        'Sun',
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri'
    ];

    /* =====================================================
       MONTHS
    ====================================================== */

    months =
    [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];

    /* =====================================================
       STATE
    ====================================================== */

    currentMonth = 0;

    currentYear = 0;

    calendarDays: CalendarDay[] = [];

    /* =====================================================
       MONTH NAME
    ====================================================== */

    get monthName(): string
    {
        return this.months[this.currentMonth];
    }

    /* =====================================================
       INITIALIZE
    ====================================================== */

    ngOnInit(): void
    {
        this.currentMonth =
            this.value.getMonth();

        this.currentYear =
            this.value.getFullYear();

        this.generateCalendar();
    }

    /* =====================================================
       PREVIOUS MONTH
    ====================================================== */

    previousMonth(): void
    {
        if (this.currentMonth === 0)
        {
            this.currentMonth = 11;

            this.currentYear--;
        }
        else
        {
            this.currentMonth--;
        }

        this.generateCalendar();
    }

    /* =====================================================
       NEXT MONTH
    ====================================================== */

    nextMonth(): void
    {
        if (this.currentMonth === 11)
        {
            this.currentMonth = 0;

            this.currentYear++;
        }
        else
        {
            this.currentMonth++;
        }

        this.generateCalendar();
    }

    /* =====================================================
       SELECT DATE
    ====================================================== */

    selectDate(day: CalendarDay): void
    {
        if (this.disabled || this.readonly)
        {
            return;
        }

        this.value =
            new Date(day.date);

        this.currentMonth =
            this.value.getMonth();

        this.currentYear =
            this.value.getFullYear();

        this.valueChange.emit(
            this.value
        );

        this.generateCalendar();
    }

    /* =====================================================
       GENERATE CALENDAR
    ====================================================== */

    private generateCalendar(): void
    {
        this.calendarDays = [];

        const today =
            new Date();

        const firstDay =
            new Date(
                this.currentYear,
                this.currentMonth,
                1
            );

        /* =====================================================
           SATURDAY FIRST
        ====================================================== */

        const startDay =
            (firstDay.getDay() + 1) % 7;

        const startDate =
            new Date(firstDay);

        startDate.setDate(
            firstDay.getDate() - startDay
        );

        for (let i = 0; i < 42; i++)
        {
            const date =
                new Date(startDate);

            date.setDate(
                startDate.getDate() + i
            );

            this.calendarDays.push(
            {
                date,

                day:
                    date.getDate(),

                isCurrentMonth:
                    date.getMonth() === this.currentMonth,

                isToday:
                    this.isSameDate(
                        date,
                        today
                    ),

                isSelected:
                    this.isSameDate(
                        date,
                        this.value
                    ),

                isFriday:
                    date.getDay() === 5
            });
        }
    }

    /* =====================================================
       SAME DATE
    ====================================================== */

    private isSameDate(
        date1: Date,
        date2: Date
    ): boolean
    {
        return (
            date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear()
        );
    }
}