//===============================================================
// Calculator Window
// --------------------------------------------------------------
// The floating business calculator. Lives in the layout (not
// the top bar) so it floats over every page; the top bar
// button opens it (Alt C).
//
//   Drag     by the title bar; the spot is remembered
//   Keys     connected while it is open (not while typing
//            in a page field) : 0-9 . , + - * x / % Enter =
//            Backspace, Delete clears, F9 ±,
//            Esc clears (twice : closes)
//   Theme    follows the Light / Deep switch
//===============================================================

import
{
    Component,
    ElementRef,
    HostListener,
    computed,
    effect,
    inject,
    signal,
    viewChild
}
from '@angular/core';

import
{
    CalcBusiness,
    CalcOperator,
    CalculatorService
}
from '../topbar-calculator/calculator.service';


//===============================================================
// Keypad
//===============================================================

type KeyKind =
    'num'
    | 'op'
    | 'fn'
    | 'eq';

interface CalcKey
{
    Label:string;

    Aria:string;

    Kind:KeyKind;

    Press:() => void;
}

interface BusinessKey
{
    Label:string;

    Aria:string;

    Press:() => void;
}

const WIDTH_WITH_TAPE =
    568;

const WIDTH_NO_TAPE =
    372;

const HEIGHT =
    604;

const TOP_GAP =
    72;

const EDGE =
    8;


@Component(
{
    selector:
        'app-calculator-window',
    standalone:
        true,
    imports:
    [
    ],
    templateUrl:
        './calculator-window.html',
    styleUrls:
    [
        './calculator-window.css'
    ]
})
export class CalculatorWindowComponent
{
    //===========================================================
    // Dependencies
    //===========================================================

    readonly calc =
        inject(CalculatorService);

    private readonly panel =
        viewChild<ElementRef<HTMLElement>>('panel');

    private readonly vatInput =
        viewChild<ElementRef<HTMLInputElement>>('vatInput');

    private readonly profitInput =
        viewChild<ElementRef<HTMLInputElement>>('profitInput');


    //===========================================================
    // View state
    //===========================================================

    readonly visible =
        computed(
            () =>
                this.calc.open() && !this.calc.minimized()
        );

    readonly editingRate =
        signal<'vat' | 'profit' | null>(null);

    private readonly viewport =
        signal(
            {
                width:window.innerWidth,
                height:window.innerHeight
            }
        );

    private drag:
        {
            pointerId:number;
            offsetX:number;
            offsetY:number;
        }
        | null =
        null;

    readonly dragging =
        signal(false);

    private escapeArmed =
        false;

    readonly width =
        computed(
            () =>
                Math.min(
                    this.calc.showTape() ? WIDTH_WITH_TAPE : WIDTH_NO_TAPE,
                    this.viewport().width - EDGE * 2
                )
        );

    readonly height =
        computed(
            () =>
                Math.min(HEIGHT, this.viewport().height - TOP_GAP - EDGE)
        );

    // Saved spot kept inside the window; default : top right
    readonly left =
        computed(
            () =>
            {
                const max =
                    this.viewport().width - this.width() - EDGE;

                const saved =
                    this.calc.position();

                return clamp(saved ? saved.X : max - 16, EDGE, max);
            }
        );

    readonly top =
        computed(
            () =>
            {
                const max =
                    this.viewport().height - this.height() - EDGE;

                const saved =
                    this.calc.position();

                return clamp(saved ? saved.Y : TOP_GAP, EDGE, Math.max(EDGE, max));
            }
        );


    //===========================================================
    // Keys
    //===========================================================

    readonly keys:
        CalcKey[] =
        [
            this.key('MC', 'Memory clear', 'fn', () => this.calc.memoryClear()),
            this.key('MR', 'Memory recall', 'fn', () => this.calc.memoryRecall()),
            this.key('M+', 'Memory add', 'fn', () => this.calc.memoryAdd(1)),
            this.key('M−', 'Memory subtract', 'fn', () => this.calc.memoryAdd(-1)),

            this.key('C', 'Clear', 'fn', () => this.calc.clear()),
            this.key('⌫', 'Backspace', 'fn', () => this.calc.backspace()),
            this.key('%', 'Percent', 'fn', () => this.calc.percent()),
            this.op('÷', 'Divide'),

            this.num('7'), this.num('8'), this.num('9'), this.op('×', 'Multiply'),
            this.num('4'), this.num('5'), this.num('6'), this.op('−', 'Minus'),
            this.num('1'), this.num('2'), this.num('3'), this.op('+', 'Plus'),

            this.key('00', 'Double zero', 'num', () => this.calc.digit('00')),
            this.num('0'),
            this.key('.', 'Decimal point', 'num', () => this.calc.dot()),
            this.key('=', 'Equals', 'eq', () => this.calc.equals())
        ];

    readonly businessKeys:
        BusinessKey[] =
        [
            this.biz('+VAT', 'Add VAT', 'vat-add'),
            this.biz('−VAT', 'Remove VAT', 'vat-remove'),
            {
                Label:'±',
                Aria:'Change sign',
                Press:() => this.calc.negate()
            },
            this.biz('Markup', 'Add profit on cost', 'markup'),
            this.biz('Margin', 'Price for profit margin', 'margin'),
            {
                Label:'Copy',
                Aria:'Copy result',
                Press:() => this.calc.copyResult()
            }
        ];


    //===========================================================
    // Constructor : focus the window when it opens
    //===========================================================

    constructor()
    {
        effect(
            () =>
            {
                if
                (
                    this.visible()
                )
                {
                    setTimeout(() => this.panel()?.nativeElement.focus(), 0);
                }
            }
        );

        // Rate chip turned into an input : focus and select it
        effect(
            () =>
            {
                const input =
                    this.editingRate() === 'vat'
                        ? this.vatInput()
                        : this.editingRate() === 'profit'
                            ? this.profitInput()
                            : undefined;

                if
                (
                    input
                )
                {
                    setTimeout(
                        () =>
                        {
                            input.nativeElement.focus();

                            input.nativeElement.select();
                        },
                        0
                    );
                }
            }
        );
    }


    //===========================================================
    // Key builders
    //===========================================================

    private key
    (
        label:
            string,
        aria:
            string,
        kind:
            KeyKind,
        press:
            () => void
    ):
        CalcKey
    {
        return {
            Label:label,
            Aria:aria,
            Kind:kind,
            Press:press
        };
    }

    private num
    (
        digit:
            string
    ):
        CalcKey
    {
        return this.key(digit, digit, 'num', () => this.calc.digit(digit));
    }

    private op
    (
        operator:
            CalcOperator,
        aria:
            string
    ):
        CalcKey
    {
        return this.key(operator, aria, 'op', () => this.calc.setOperator(operator));
    }

    private biz
    (
        label:
            string,
        aria:
            string,
        kind:
            CalcBusiness
    ):
        BusinessKey
    {
        return {
            Label:label,
            Aria:aria,
            Press:() => this.calc.business(kind)
        };
    }


    //===========================================================
    // Window buttons
    //===========================================================

    close():
        void
    {
        this.editingRate.set(null);

        this.calc.close();
    }

    minimize():
        void
    {
        this.editingRate.set(null);

        this.calc.minimize();
    }

    toggleTape():
        void
    {
        this.calc.toggleTape();
    }


    //===========================================================
    // Rates (click a chip, type, Enter)
    //===========================================================

    editRate
    (
        which:
            'vat' | 'profit'
    ):
        void
    {
        this.editingRate.set(which);
    }

    saveRate
    (
        which:
            'vat' | 'profit',
        text:
            string
    ):
        void
    {
        const value =
            parseFloat(text);

        if
        (
            isFinite(value)
        )
        {
            if
            (
                which === 'vat'
            )
            {
                this.calc.setVatRate(value);
            }
            else
            {
                this.calc.setProfitRate(value);
            }
        }

        this.editingRate.set(null);

        this.panel()?.nativeElement.focus();
    }

    onRateKey
    (
        which:
            'vat' | 'profit',
        event:
            KeyboardEvent
    ):
        void
    {
        event.stopPropagation();

        if
        (
            event.key === 'Enter'
        )
        {
            this.saveRate(which, (event.target as HTMLInputElement).value);
        }
        else if
        (
            event.key === 'Escape'
        )
        {
            this.editingRate.set(null);

            this.panel()?.nativeElement.focus();
        }
    }


    //===========================================================
    // Keyboard : connected while the calculator is open
    //
    // Keys go to the calculator from anywhere on the page,
    // except while typing in a field of the page itself
    // (input, textarea, select, editable text). Each key
    // lights up on the keypad.
    //===========================================================

    readonly pressed =
        signal('');

    private pressedTimer:
        ReturnType<typeof setTimeout> | undefined;

    private light
    (
        label:
            string
    ):
        void
    {
        this.pressed.set(label);

        clearTimeout(this.pressedTimer);

        this.pressedTimer =
            setTimeout(() => this.pressed.set(''), 140);
    }

    @HostListener(
        'document:keydown',
        [
            '$event'
        ]
    )
    onKeydown
    (
        event:
            KeyboardEvent
    ):
        void
    {
        if
        (
            !this.visible()
            ||
            event.ctrlKey
            ||
            event.metaKey
            ||
            event.altKey
            ||
            event.defaultPrevented
        )
        {
            return;
        }

        const target =
            event.target as HTMLElement | null;

        const panel =
            this.panel()?.nativeElement;

        const inPanel =
            !!panel && !!target && panel.contains(target);

        const typingInPage =
            !!target
            &&
            !inPanel
            &&
            (
                target.isContentEditable
                ||
                /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
            );

        if
        (
            typingInPage
            ||
            document.querySelector('[role="dialog"][aria-modal="true"]')
        )
        {
            return;
        }

        const key =
            event.key;

        let label =
            '';

        if
        (
            /^[0-9]$/.test(key)
        )
        {
            this.calc.digit(key);

            label = key;
        }
        else if
        (
            key === '.' || key === ','
        )
        {
            this.calc.dot();

            label = '.';
        }
        else if
        (
            key === '+'
        )
        {
            this.calc.setOperator('+');

            label = '+';
        }
        else if
        (
            key === '-'
        )
        {
            this.calc.setOperator('−');

            label = '−';
        }
        else if
        (
            key === '*' || key === 'x' || key === 'X'
        )
        {
            this.calc.setOperator('×');

            label = '×';
        }
        else if
        (
            key === '/'
        )
        {
            this.calc.setOperator('÷');

            label = '÷';
        }
        else if
        (
            key === '%'
        )
        {
            this.calc.percent();

            label = '%';
        }
        else if
        (
            key === 'Enter' || key === '='
        )
        {
            this.calc.equals();

            label = '=';
        }
        else if
        (
            key === 'Backspace'
        )
        {
            this.calc.backspace();

            label = '⌫';
        }
        else if
        (
            key === 'Delete'
        )
        {
            this.calc.clear();

            label = 'C';
        }
        else if
        (
            key === 'Escape'
        )
        {
            event.preventDefault();

            if
            (
                this.escapeArmed
            )
            {
                this.escapeArmed = false;

                this.close();

                return;
            }

            this.calc.clear();

            this.light('C');

            this.escapeArmed = true;

            return;
        }
        else if
        (
            key === 'F9'
        )
        {
            this.calc.negate();

            label = '±';
        }
        else
        {
            return;
        }

        this.escapeArmed = false;

        this.light(label);

        event.preventDefault();
    }


    //===========================================================
    // Dragging by the title bar
    //===========================================================

    startDrag
    (
        event:
            PointerEvent
    ):
        void
    {
        if
        (
            event.button !== 0
            ||
            (event.target as HTMLElement).closest('button, input')
        )
        {
            return;
        }

        this.drag =
            {
                pointerId:event.pointerId,
                offsetX:event.clientX - this.left(),
                offsetY:event.clientY - this.top()
            };

        this.dragging.set(true);

        (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);

        event.preventDefault();
    }

    moveDrag
    (
        event:
            PointerEvent
    ):
        void
    {
        if
        (
            !this.drag
            ||
            event.pointerId !== this.drag.pointerId
        )
        {
            return;
        }

        this.calc.position.set(
            {
                X:Math.round(event.clientX - this.drag.offsetX),
                Y:Math.round(event.clientY - this.drag.offsetY)
            }
        );
    }

    endDrag
    (
        event:
            PointerEvent
    ):
        void
    {
        if
        (
            !this.drag
            ||
            event.pointerId !== this.drag.pointerId
        )
        {
            return;
        }

        this.drag = null;

        this.dragging.set(false);

        // Save the spot as it is shown (kept inside the window)
        this.calc.setPosition(
            {
                X:this.left(),
                Y:this.top()
            }
        );
    }

    // Double-click the title bar : back to the default spot
    resetPosition():
        void
    {
        this.calc.position.set(null);

        this.calc.setPosition(
            {
                X:this.left(),
                Y:this.top()
            }
        );
    }

    @HostListener('window:resize')
    onResize():
        void
    {
        this.viewport.set(
            {
                width:window.innerWidth,
                height:window.innerHeight
            }
        );
    }
}


//===============================================================
// Helpers
//===============================================================

function clamp
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
    return Math.min(Math.max(value, min), Math.max(min, max));
}
