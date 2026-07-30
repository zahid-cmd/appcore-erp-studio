import
{
    CalendarDay
}
from './calendar-day';

import
{
    CalendarMonth
}
from './calendar-month';

/* =====================================================
   CALENDAR HELPER
===================================================== */

export class CalendarHelper
{
    /* ===================================================
       MONTH NAMES
    ==================================================== */

    private static readonly monthNames =
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

    /* ===================================================
       BUILD MONTH
    ==================================================== */

    static buildMonth
    (
        year: number,
        month: number,
        selectedDate?: Date
    ): CalendarMonth
    {
        const firstDay =
            new Date(year, month, 1);

        const lastDay =
            new Date(year, month + 1, 0);

        const days =
            this.buildDays(
                year,
                month,
                selectedDate
            );

        return {
            year,

            month,

            monthName:
                this.monthNames[month],

            title:
                `${this.monthNames[month]} ${year}`,

            days,

            totalWeeks: 6,

            totalDays:
                lastDay.getDate(),

            firstDayOfMonth:
                new Date(firstDay),

            lastDayOfMonth:
                new Date(lastDay),

            previousMonth:
                new Date(firstDay.getFullYear(), firstDay.getMonth() - 1, 1),

            nextMonth:
                new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 1)
        };
    }

    /* ===================================================
       BUILD DAYS
    ==================================================== */

    private static buildDays
    (
        year: number,
        month: number,
        selectedDate?: Date
    ): CalendarDay[]
    {
        const result: CalendarDay[] = [];

        const today =
            new Date();

        const firstDay =
            new Date(year, month, 1);

        const lastDay =
            new Date(year, month + 1, 0);

        const firstWeekDay =
            firstDay.getDay();

        const startOffset =
            firstWeekDay === 0
                ? -6
                : 1 - firstWeekDay;

        const startDate =
            new Date(year, month, startOffset);

        for
        (
            let i = 0;
            i < 42;
            i++
        )
        {
            const current =
                new Date(startDate);

            current.setDate(
                startDate.getDate() + i
            );

            const isCurrent =
                current.getMonth() === month
                &&
                current.getFullYear() === year;

            const isPrevious =
                current < firstDay;

            const isNext =
                current > lastDay;

            const isToday =
                current.toDateString()
                ===
                today.toDateString();

            const isSelected =
                selectedDate
                    ?
                    current.toDateString()
                    ===
                    selectedDate.toDateString()
                    :
                    false;

            result.push(
            {
                date:
                    new Date(current),

                day:
                    current.getDate(),

                isCurrentMonth:
                    isCurrent,

                isPreviousMonth:
                    isPrevious,

                isNextMonth:
                    isNext,

                isToday,

                isSelected,

                isDisabled:
                    false,

                isWeekend:
                    current.getDay() === 0
                    ||
                    current.getDay() === 6
            });
        }

        return result;
    }

    /* ===================================================
       PREVIOUS MONTH
    ==================================================== */

    static previousMonth
    (
        month: CalendarMonth
    ): CalendarMonth
    {
        const previous =
            month.previousMonth;

        return this.buildMonth(
            previous.getFullYear(),
            previous.getMonth()
        );
    }

    /* ===================================================
       NEXT MONTH
    ==================================================== */

    static nextMonth
    (
        month: CalendarMonth
    ): CalendarMonth
    {
        const next =
            month.nextMonth;

        return this.buildMonth(
            next.getFullYear(),
            next.getMonth()
        );
    }
}