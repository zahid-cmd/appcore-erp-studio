/* =====================================================
   IMPORTS
===================================================== */

import
{
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

/* =====================================================
   TYPES
===================================================== */

type CalendarView =
    | 'days'
    | 'months'
    | 'years';

interface CalendarDay
{
    date: Date;

    day: number;

    isCurrentMonth: boolean;

    isToday: boolean;

    isSelected: boolean;

    isFriday: boolean;

    isDisabled: boolean;
}

interface CalendarMonthCell
{
    index: number;

    label: string;

    isCurrent: boolean;

    isSelected: boolean;

    isDisabled: boolean;
}

interface CalendarYearCell
{
    year: number;

    isCurrent: boolean;

    isSelected: boolean;

    isDisabled: boolean;
}

/* =====================================================
   CALENDAR

   Three views, switched from the header title:
     Days   → click "July 2026"  → Months
     Months → click "2026"       → Years (12-year page)
     Years  → pick a year        → Months → pick a month → Days

   Inputs / outputs are unchanged, so app-datepicker
   keeps working as before. minDate / maxDate are new
   and optional.
===================================================== */

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
    implements OnInit, OnChanges
{
    /* =====================================================
       VALUE
    ====================================================== */

    @Input()
    value: Date | null =
        new Date();

    @Output()
    valueChange =
        new EventEmitter<Date>();

    /* =====================================================
       RANGE (optional)
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

    @Input()
    showTodayButton = true;

    /* =====================================================
       WEEK DAYS (Saturday first)
    ====================================================== */

    readonly weekDays =
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

    readonly months =
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

    readonly shortMonths =
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
    ];

    /* =====================================================
       STATE
    ====================================================== */

    view: CalendarView =
        'days';

    currentMonth = 0;

    currentYear = 0;

    // First year shown on the 12-year page
    yearPageStart = 0;

    readonly YEARS_PER_PAGE = 12;

    calendarDays: CalendarDay[] = [];

    monthCells: CalendarMonthCell[] = [];

    yearCells: CalendarYearCell[] = [];

    /* =====================================================
       LOCKED (disabled or readonly)
    ====================================================== */

    get isLocked(): boolean
    {
        return this.disabled || this.readonly;
    }

    /* =====================================================
       TITLES
    ====================================================== */

    get monthName(): string
    {
        return this.months[this.currentMonth];
    }

    get yearRangeTitle(): string
    {
        return `${this.yearPageStart} – ${this.yearPageStart + this.YEARS_PER_PAGE - 1}`;
    }

    get headerTitle(): string
    {
        switch (this.view)
        {
            case 'months':
                return `${this.currentYear}`;

            case 'years':
                return this.yearRangeTitle;

            default:
                return `${this.monthName} ${this.currentYear}`;
        }
    }

    get canGoUp(): boolean
    {
        return this.view !== 'years';
    }

    get previousLabel(): string
    {
        switch (this.view)
        {
            case 'months':
                return 'Previous year';

            case 'years':
                return 'Previous years';

            default:
                return 'Previous month';
        }
    }

    get nextLabel(): string
    {
        switch (this.view)
        {
            case 'months':
                return 'Next year';

            case 'years':
                return 'Next years';

            default:
                return 'Next month';
        }
    }

    /* =====================================================
       INITIALIZE
    ====================================================== */

    ngOnInit(): void
    {
        this.focusOn(
            this.value ?? new Date()
        );
    }

    /* =====================================================
       INPUT CHANGES

       When the value is changed from outside (for example
       an End Date set automatically), show its month.
    ====================================================== */

    ngOnChanges(
        changes: SimpleChanges
    ): void
    {
        if
        (
            changes['value']
            &&
            !changes['value'].firstChange
        )
        {
            this.focusOn(
                this.value ?? new Date()
            );

            return;
        }

        if
        (
            (changes['minDate'] || changes['maxDate'])
            &&
            this.currentYear > 0
        )
        {
            this.rebuild();
        }
    }

    /* =====================================================
       FOCUS ON A DATE
    ====================================================== */

    private focusOn(
        date: Date
    ): void
    {
        const safe =
            this.isValidDate(date)
                ? date
                : new Date();

        this.currentMonth =
            safe.getMonth();

        this.currentYear =
            safe.getFullYear();

        this.yearPageStart =
            this.pageStartFor(this.currentYear);

        this.view =
            'days';

        this.rebuild();
    }

    /* =====================================================
       HEADER : TITLE CLICK (go up one level)
    ====================================================== */

    onTitleClick(): void
    {
        if (this.isLocked)
        {
            return;
        }

        if (this.view === 'days')
        {
            this.view = 'months';
        }
        else if (this.view === 'months')
        {
            this.yearPageStart =
                this.pageStartFor(this.currentYear);

            this.view = 'years';
        }

        this.rebuild();
    }

    /* =====================================================
       HEADER : PREVIOUS
    ====================================================== */

    previous(): void
    {
        if (this.isLocked)
        {
            return;
        }

        switch (this.view)
        {
            case 'months':
                this.currentYear--;
                break;

            case 'years':
                this.yearPageStart -= this.YEARS_PER_PAGE;
                break;

            default:
                this.previousMonth();
                return;
        }

        this.rebuild();
    }

    /* =====================================================
       HEADER : NEXT
    ====================================================== */

    next(): void
    {
        if (this.isLocked)
        {
            return;
        }

        switch (this.view)
        {
            case 'months':
                this.currentYear++;
                break;

            case 'years':
                this.yearPageStart += this.YEARS_PER_PAGE;
                break;

            default:
                this.nextMonth();
                return;
        }

        this.rebuild();
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
       SELECT YEAR  → month view
    ====================================================== */

    selectYear(
        cell: CalendarYearCell
    ): void
    {
        if (this.isLocked || cell.isDisabled)
        {
            return;
        }

        this.currentYear =
            cell.year;

        this.view =
            'months';

        this.rebuild();
    }

    /* =====================================================
       SELECT MONTH  → day view
    ====================================================== */

    selectMonth(
        cell: CalendarMonthCell
    ): void
    {
        if (this.isLocked || cell.isDisabled)
        {
            return;
        }

        this.currentMonth =
            cell.index;

        this.view =
            'days';

        this.rebuild();
    }

    /* =====================================================
       SELECT DATE
    ====================================================== */

    selectDate(
        day: CalendarDay
    ): void
    {
        if (this.isLocked || day.isDisabled)
        {
            return;
        }

        this.value =
            new Date(
                day.date.getFullYear(),
                day.date.getMonth(),
                day.date.getDate()
            );

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
       TODAY
    ====================================================== */

    get isTodayDisabled(): boolean
    {
        return this.isOutOfRange(
            this.startOfDay(new Date())
        );
    }

    goToToday(): void
    {
        if (this.isLocked || this.isTodayDisabled)
        {
            return;
        }

        const today =
            this.startOfDay(new Date());

        this.value =
            today;

        this.focusOn(
            today
        );

        this.valueChange.emit(
            this.value
        );
    }

    /* =====================================================
       REBUILD CURRENT VIEW
    ====================================================== */

    private rebuild(): void
    {
        switch (this.view)
        {
            case 'months':
                this.generateMonths();
                break;

            case 'years':
                this.generateYears();
                break;

            default:
                this.generateCalendar();
                break;
        }
    }

    /* =====================================================
       GENERATE DAYS (6 weeks, Saturday first)
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

        const startDay =
            (firstDay.getDay() + 1) % 7;

        for (let i = 0; i < 42; i++)
        {
            const date =
                new Date(
                    this.currentYear,
                    this.currentMonth,
                    1 - startDay + i
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
                    date.getDay() === 5,

                isDisabled:
                    this.isOutOfRange(date)
            });
        }
    }

    /* =====================================================
       GENERATE MONTHS
    ====================================================== */

    private generateMonths(): void
    {
        const today =
            new Date();

        this.monthCells =
            this.shortMonths.map(
                (label, index) =>
                ({
                    index,

                    label,

                    isCurrent:
                        today.getFullYear() === this.currentYear
                        &&
                        today.getMonth() === index,

                    isSelected:
                        !!this.value
                        &&
                        this.value.getFullYear() === this.currentYear
                        &&
                        this.value.getMonth() === index,

                    isDisabled:
                        this.isMonthOutOfRange(
                            this.currentYear,
                            index
                        )
                })
            );
    }

    /* =====================================================
       GENERATE YEARS (12 per page)
    ====================================================== */

    private generateYears(): void
    {
        const thisYear =
            new Date().getFullYear();

        this.yearCells =
            Array.from(
                { length: this.YEARS_PER_PAGE },
                (_, i) =>
                {
                    const year =
                        this.yearPageStart + i;

                    return {
                        year,

                        isCurrent:
                            year === thisYear,

                        isSelected:
                            !!this.value
                            &&
                            this.value.getFullYear() === year,

                        isDisabled:
                            this.isYearOutOfRange(year)
                    };
                }
            );
    }

    /* =====================================================
       RANGE HELPERS
    ====================================================== */

    private startOfDay(
        date: Date
    ): Date
    {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );
    }

    private isOutOfRange(
        date: Date
    ): boolean
    {
        const day =
            this.startOfDay(date).getTime();

        if
        (
            this.isValidDate(this.minDate)
            &&
            day < this.startOfDay(this.minDate as Date).getTime()
        )
        {
            return true;
        }

        if
        (
            this.isValidDate(this.maxDate)
            &&
            day > this.startOfDay(this.maxDate as Date).getTime()
        )
        {
            return true;
        }

        return false;
    }

    private isMonthOutOfRange(
        year: number,
        month: number
    ): boolean
    {
        const first =
            new Date(year, month, 1);

        const last =
            new Date(year, month + 1, 0);

        return (
            this.isValidDate(this.minDate)
            &&
            last < this.startOfDay(this.minDate as Date)
        )
        ||
        (
            this.isValidDate(this.maxDate)
            &&
            first > this.startOfDay(this.maxDate as Date)
        );
    }

    private isYearOutOfRange(
        year: number
    ): boolean
    {
        return (
            this.isValidDate(this.minDate)
            &&
            year < (this.minDate as Date).getFullYear()
        )
        ||
        (
            this.isValidDate(this.maxDate)
            &&
            year > (this.maxDate as Date).getFullYear()
        );
    }

    /* =====================================================
       YEAR PAGE START (12-year pages, e.g. 2016 – 2027)
    ====================================================== */

    private pageStartFor(
        year: number
    ): number
    {
        return year - (((year % this.YEARS_PER_PAGE) + this.YEARS_PER_PAGE) % this.YEARS_PER_PAGE);
    }

    /* =====================================================
       VALID DATE
    ====================================================== */

    private isValidDate(
        value: Date | null | undefined
    ): boolean
    {
        return value instanceof Date
            &&
            !isNaN(value.getTime());
    }

    /* =====================================================
       SAME DATE
    ====================================================== */

    private isSameDate(
        date1: Date,
        date2: Date | null
    ): boolean
    {
        if (!this.isValidDate(date2))
        {
            return false;
        }

        return (
            date1.getDate() === (date2 as Date).getDate() &&
            date1.getMonth() === (date2 as Date).getMonth() &&
            date1.getFullYear() === (date2 as Date).getFullYear()
        );
    }
}