//===============================================================
// HR dates (Human Resource Management pages)
//
// The HR pages keep a date as text, yyyy-MM-dd ('' = none); the
// shared date picker (app-datepicker) works with a Date. These
// turn one into the other.
//===============================================================

const cache =
    new Map<string, Date>();

// '2026-11-14' : the Date (null for '' or a text that is no date).
// The same text gives the same Date object, so the picker does not
// see a new value on every check.
export function hrToDate(text: string | null | undefined): Date | null
{
    const value =
        String(text ?? '').substring(0, 10);

    const m =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!m)
    {
        return null;
    }

    let date =
        cache.get(value);

    if (!date)
    {
        date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

        if (cache.size > 500)
        {
            cache.clear();
        }

        cache.set(value, date);
    }

    return date;
}

// The Date : '2026-11-14' ('' for none)
export function hrToText(date: Date | null | undefined): string
{
    if (!(date instanceof Date) || isNaN(date.getTime()))
    {
        return '';
    }

    const two =
        (value: number): string => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

// What the picker gives, shaped as the change event of a date box :
// the pages' date handlers read event.target.value
export function hrDateEvent(date: Date | null | undefined): any
{
    return { target:{ value:hrToText(date) } };
}
