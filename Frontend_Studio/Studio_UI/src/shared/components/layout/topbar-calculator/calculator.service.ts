//===============================================================
// Calculator Service
// --------------------------------------------------------------
// Business calculator opened from the top bar (Alt C).
//
//   Keys      digits, 00, ., + − × ÷, %, =, C, ⌫, ±
//   Memory    MC MR M+ M−
//   Business  +VAT / −VAT (VAT rate), Markup / Margin (profit
//             rate), Copy result
//   Tape      every = and business key, with the working
//
// One state for the top bar button (minimised pill shows the
// last result) and the floating window. Rates, memory, tape,
// tape visibility and window position are remembered in this
// browser.
//===============================================================

import
{
    Injectable,
    computed,
    signal
}
from '@angular/core';


//===============================================================
// Types
//===============================================================

export type CalcOperator =
    '+'
    | '−'
    | '×'
    | '÷';

export type CalcBusiness =
    'vat-add'
    | 'vat-remove'
    | 'markup'
    | 'margin';

export interface CalcTapeRow
{
    Label:string;

    Detail:string;

    Result:number;
}

export interface CalcPosition
{
    X:number;

    Y:number;
}

interface CalcSaved
{
    mem?:number;

    tape?:CalcTapeRow[];

    vat?:number;

    profit?:number;

    showTape?:boolean;

    pos?:CalcPosition | null;
}


//===============================================================
// Constants
//===============================================================

const STORAGE_KEY =
    'appcore.calculator';

const MAX_TAPE =
    50;

const MAX_DIGITS =
    15;

const MONEY =
    new Intl.NumberFormat(
        'en-IN',
        {
            minimumFractionDigits:2,
            maximumFractionDigits:2
        }
    );

const PLAIN =
    new Intl.NumberFormat(
        'en-IN',
        {
            maximumFractionDigits:6
        }
    );


@Injectable(
{
    providedIn:'root'
})
export class CalculatorService
{
    //===========================================================
    // Window state
    //===========================================================

    readonly open =
        signal(false);

    readonly minimized =
        signal(false);

    readonly position =
        signal<CalcPosition | null>(null);

    readonly showTape =
        signal(true);


    //===========================================================
    // Engine state
    //===========================================================

    // What is being typed (raw text, no grouping)
    readonly current =
        signal('0');

    readonly accumulator =
        signal<number | null>(null);

    readonly operator =
        signal<CalcOperator | null>(null);

    // Next digit starts a new number
    readonly fresh =
        signal(true);

    readonly expression =
        signal('');

    readonly memory =
        signal(0);

    readonly tape =
        signal<CalcTapeRow[]>([]);

    readonly vatRate =
        signal(15);

    readonly profitRate =
        signal(20);

    // Short note ("Copied") under the display
    readonly flash =
        signal('');


    //===========================================================
    // Derived
    //===========================================================

    readonly value =
        computed(
            () =>
                toNumber(this.current())
        );

    readonly display =
        computed(
            () =>
                this.fresh()
                    ? PLAIN.format(this.value())
                    : groupTyped(this.current())
        );

    readonly words =
        computed(
            () =>
                this.value()
                    ? amountInWords(this.value())
                    : ''
        );

    readonly hasMemory =
        computed(
            () =>
                this.memory() !== 0
        );

    readonly tapeNewestFirst =
        computed(
            () =>
                [...this.tape()].reverse()
        );

    // Shown on the top bar pill while minimised
    readonly lastResult =
        computed(
            () =>
                PLAIN.format(this.value())
        );


    //===========================================================
    // Constructor
    //===========================================================

    constructor()
    {
        this.restore();
    }


    //===========================================================
    // Window
    //===========================================================

    toggle():
        void
    {
        if
        (
            this.open()
            &&
            !this.minimized()
        )
        {
            this.close();

            return;
        }

        this.show();
    }

    show():
        void
    {
        this.open.set(true);

        this.minimized.set(false);
    }

    close():
        void
    {
        this.open.set(false);

        this.minimized.set(false);
    }

    minimize():
        void
    {
        this.open.set(true);

        this.minimized.set(true);
    }

    toggleTape():
        void
    {
        this.showTape.update(x => !x);

        this.save();
    }

    setPosition
    (
        position:
            CalcPosition
    ):
        void
    {
        this.position.set(position);

        this.save();
    }


    //===========================================================
    // Typing
    //===========================================================

    digit
    (
        digit:
            string
    ):
        void
    {
        this.flash.set('');

        if
        (
            this.fresh()
        )
        {
            this.current.set(digit === '00' ? '0' : digit);

            this.fresh.set(false);

            return;
        }

        const text =
            this.current();

        if
        (
            text.replace(/[-.]/g, '').length >= MAX_DIGITS
        )
        {
            return;
        }

        this.current.set(
            text === '0'
                ? (digit === '00' ? '0' : digit)
                : text === '-0'
                    ? '-' + (digit === '00' ? '0' : digit)
                    : text + digit
        );
    }

    dot():
        void
    {
        if
        (
            this.fresh()
        )
        {
            this.current.set('0.');

            this.fresh.set(false);

            return;
        }

        if
        (
            !this.current().includes('.')
        )
        {
            this.current.update(x => x + '.');
        }
    }

    backspace():
        void
    {
        if
        (
            this.fresh()
        )
        {
            return;
        }

        const text =
            this.current();

        const next =
            text.length > 1
                ? text.slice(0, -1)
                : '0';

        this.current.set(next === '-' ? '0' : next);
    }

    clear():
        void
    {
        this.current.set('0');

        this.accumulator.set(null);

        this.operator.set(null);

        this.fresh.set(true);

        this.expression.set('');

        this.flash.set('');
    }

    negate():
        void
    {
        const text =
            this.current();

        if
        (
            toNumber(text) === 0
        )
        {
            return;
        }

        this.current.set(
            text.startsWith('-')
                ? text.slice(1)
                : '-' + text
        );
    }


    //===========================================================
    // Arithmetic
    //===========================================================

    setOperator
    (
        operator:
            CalcOperator
    ):
        void
    {
        const value =
            this.value();

        let accumulator =
            this.accumulator();

        if
        (
            accumulator !== null
            &&
            this.operator()
            &&
            !this.fresh()
        )
        {
            accumulator =
                clean(apply(accumulator, this.operator()!, value));

            if
            (
                !isFinite(accumulator)
            )
            {
                this.divideByZero();

                return;
            }
        }
        else if
        (
            accumulator === null
        )
        {
            accumulator =
                value;
        }

        this.accumulator.set(accumulator);

        this.operator.set(operator);

        this.current.set(String(accumulator));

        this.fresh.set(true);

        this.expression.set(`${PLAIN.format(accumulator)} ${operator}`);

        this.flash.set('');
    }

    equals():
        void
    {
        const accumulator =
            this.accumulator();

        const operator =
            this.operator();

        if
        (
            accumulator === null
            ||
            !operator
        )
        {
            return;
        }

        const value =
            this.value();

        const result =
            clean(apply(accumulator, operator, value));

        if
        (
            !isFinite(result)
        )
        {
            this.divideByZero();

            return;
        }

        const detail =
            `${PLAIN.format(accumulator)} ${operator} ${PLAIN.format(value)}`;

        this.finish(result, `${detail} =`);

        this.log('=', detail, result);
    }

    // a + b% → a + (a × b / 100); otherwise b / 100
    percent():
        void
    {
        const value =
            this.value();

        const accumulator =
            this.accumulator();

        const operator =
            this.operator();

        const result =
            accumulator !== null && (operator === '+' || operator === '−')
                ? accumulator * value / 100
                : value / 100;

        this.current.set(String(clean(result)));

        this.fresh.set(true);
    }


    //===========================================================
    // Memory
    //===========================================================

    memoryClear():
        void
    {
        this.memory.set(0);

        this.save();
    }

    memoryRecall():
        void
    {
        this.current.set(String(this.memory()));

        this.fresh.set(true);
    }

    memoryAdd
    (
        sign:
            1 | -1
    ):
        void
    {
        this.memory.set(clean(this.memory() + sign * this.value()));

        this.fresh.set(true);

        this.save();
    }


    //===========================================================
    // Business keys
    //===========================================================

    business
    (
        kind:
            CalcBusiness
    ):
        void
    {
        const value =
            this.value();

        const vat =
            this.vatRate();

        const profit =
            this.profitRate();

        let result:
            number;

        let label:
            string;

        let detail:
            string;

        if
        (
            kind === 'vat-add'
        )
        {
            const tax =
                value * vat / 100;

            result = value + tax;

            label = `+VAT ${vat}%`;

            detail = `${MONEY.format(value)} + VAT ${MONEY.format(tax)}`;
        }
        else if
        (
            kind === 'vat-remove'
        )
        {
            const base =
                value / (1 + vat / 100);

            result = base;

            label = `−VAT ${vat}%`;

            detail = `VAT ${MONEY.format(value - base)} inside ${MONEY.format(value)}`;
        }
        else if
        (
            kind === 'markup'
        )
        {
            result = value * (1 + profit / 100);

            label = `Markup ${profit}%`;

            detail = `Cost ${MONEY.format(value)} + ${MONEY.format(result - value)}`;
        }
        else
        {
            if
            (
                profit >= 100
            )
            {
                this.flash.set('Margin must be under 100%');

                return;
            }

            result = value / (1 - profit / 100);

            label = `Margin ${profit}%`;

            detail = `Cost ${MONEY.format(value)}, profit ${MONEY.format(result - value)}`;
        }

        result =
            clean(result);

        this.finish(result, label);

        this.log(label, detail, result);
    }

    setVatRate
    (
        rate:
            number
    ):
        void
    {
        this.vatRate.set(clampRate(rate, 0, 100));

        this.save();
    }

    setProfitRate
    (
        rate:
            number
    ):
        void
    {
        this.profitRate.set(clampRate(rate, 0, 99));

        this.save();
    }


    //===========================================================
    // Tape and clipboard
    //===========================================================

    clearTape():
        void
    {
        this.tape.set([]);

        this.save();
    }

    copyResult():
        void
    {
        this.copy(MONEY.format(this.value()), 'Copied');
    }

    copyTape():
        void
    {
        const text =
            this.tape()
                .map(x => `${x.Label}\t${x.Detail}\t${MONEY.format(x.Result)}`)
                .join('\n');

        this.copy(text, 'Tape copied');
    }

    money
    (
        value:
            number
    ):
        string
    {
        return MONEY.format(value);
    }


    //===========================================================
    // Helpers
    //===========================================================

    private finish
    (
        result:
            number,
        expression:
            string
    ):
        void
    {
        this.current.set(String(result));

        this.accumulator.set(null);

        this.operator.set(null);

        this.fresh.set(true);

        this.expression.set(expression);

        this.flash.set('');
    }

    private divideByZero():
        void
    {
        this.clear();

        this.expression.set('Cannot divide by zero');
    }

    private log
    (
        label:
            string,
        detail:
            string,
        result:
            number
    ):
        void
    {
        this.tape.update(
            rows =>
                [...rows, { Label:label, Detail:detail, Result:result }].slice(-MAX_TAPE)
        );

        this.save();
    }

    private copy
    (
        text:
            string,
        note:
            string
    ):
        void
    {
        const done =
            () =>
            {
                this.flash.set(note);

                setTimeout(
                    () =>
                    {
                        if
                        (
                            this.flash() === note
                        )
                        {
                            this.flash.set('');
                        }
                    },
                    1600
                );
            };

        try
        {
            navigator.clipboard
                .writeText(text)
                .then(done, () => this.flash.set('Copy blocked'));
        }
        catch
        {
            this.flash.set('Copy blocked');
        }
    }


    //===========================================================
    // Browser storage
    //===========================================================

    private restore():
        void
    {
        try
        {
            const text =
                localStorage.getItem(STORAGE_KEY);

            if
            (
                !text
            )
            {
                return;
            }

            const saved =
                JSON.parse(text) as CalcSaved;

            this.memory.set(Number(saved.mem) || 0);

            this.tape.set(Array.isArray(saved.tape) ? saved.tape.slice(-MAX_TAPE) : []);

            this.vatRate.set(clampRate(saved.vat ?? 15, 0, 100));

            this.profitRate.set(clampRate(saved.profit ?? 20, 0, 99));

            this.showTape.set(saved.showTape !== false);

            this.position.set(saved.pos ?? null);
        }
        catch
        {
            // Blocked or broken storage : start clean
        }
    }

    private save():
        void
    {
        try
        {
            const saved:
                CalcSaved =
                {
                    mem:this.memory(),
                    tape:this.tape(),
                    vat:this.vatRate(),
                    profit:this.profitRate(),
                    showTape:this.showTape(),
                    pos:this.position()
                };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        }
        catch
        {
            // Storage blocked : state lasts for this visit
        }
    }
}


//===============================================================
// Pure helpers
//===============================================================

function toNumber
(
    text:
        string
):
    number
{
    const value =
        parseFloat(String(text).replace(/,/g, ''));

    return isFinite(value)
        ? value
        : 0;
}

// Removes floating point noise (0.1 + 0.2)
function clean
(
    value:
        number
):
    number
{
    return Math.round(value * 1e10) / 1e10;
}

function clampRate
(
    value:
        number,
    min:
        number,
    max:
        number
):
    number
{
    const rate =
        Number(value);

    return isFinite(rate)
        ? Math.min(max, Math.max(min, Math.round(rate * 100) / 100))
        : min;
}

function apply
(
    left:
        number,
    operator:
        CalcOperator,
    right:
        number
):
    number
{
    switch (operator)
    {
        case '+':
            return left + right;

        case '−':
            return left - right;

        case '×':
            return left * right;

        case '÷':
            return right === 0
                ? NaN
                : left / right;
    }
}

// "1250000.5" → "12,50,000.5" (keeps what was typed after .)
function groupTyped
(
    text:
        string
):
    string
{
    const negative =
        text.startsWith('-');

    const [whole, fraction] =
        (negative ? text.slice(1) : text).split('.');

    const grouped =
        Number(whole || '0').toLocaleString('en-IN');

    return (negative ? '-' : '')
        + grouped
        + (fraction !== undefined ? '.' + fraction : '');
}


//===============================================================
// Amount in words (lakh / crore, taka and poisa)
//===============================================================

const ONES =
[
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen'
];

const TENS =
[
    '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'
];

function twoDigits
(
    value:
        number
):
    string
{
    return value < 20
        ? ONES[value]
        : TENS[Math.floor(value / 10)] + (value % 10 ? '-' + ONES[value % 10] : '');
}

function threeDigits
(
    value:
        number
):
    string
{
    const hundred =
        Math.floor(value / 100);

    const rest =
        value % 100;

    return (hundred ? ONES[hundred] + ' hundred' + (rest ? ' ' : '') : '')
        + (rest ? twoDigits(rest) : '');
}

function wholeInWords
(
    value:
        number
):
    string
{
    if
    (
        value === 0
    )
    {
        return 'zero';
    }

    const parts:
        string[] =
        [];

    const crore =
        Math.floor(value / 1e7);

    let rest =
        value % 1e7;

    const lakh =
        Math.floor(rest / 1e5);

    rest %= 1e5;

    const thousand =
        Math.floor(rest / 1e3);

    rest %= 1e3;

    if
    (
        crore
    )
    {
        parts.push(wholeInWords(crore) + ' crore');
    }

    if
    (
        lakh
    )
    {
        parts.push(twoDigits(lakh) + ' lakh');
    }

    if
    (
        thousand
    )
    {
        parts.push(twoDigits(thousand) + ' thousand');
    }

    if
    (
        rest
    )
    {
        parts.push(threeDigits(rest));
    }

    return parts.join(' ');
}

export function amountInWords
(
    amount:
        number
):
    string
{
    const value =
        Math.abs(Number(amount) || 0);

    if
    (
        value >= 1e15
    )
    {
        return '';
    }

    let whole =
        Math.floor(value);

    let poisa =
        Math.round((value - whole) * 100);

    if
    (
        poisa === 100
    )
    {
        whole += 1;

        poisa = 0;
    }

    const text =
        (amount < 0 ? 'minus ' : '')
        + wholeInWords(whole)
        + ' taka'
        + (poisa ? ' and ' + twoDigits(poisa) + ' poisa' : '');

    return text.charAt(0).toUpperCase() + text.slice(1);
}
