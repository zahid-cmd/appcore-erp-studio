//===============================================================
// AppCore Tooltip
//
//   <button [appTooltip]="'Reload the checks'">…</button>
//   <button appTooltip="Back to the list" tooltipPosition="top">
//
// A small dark label under (or over) the element, with an arrow,
// shown after a short pause on hover or keyboard focus.
//
// The label is placed on <body> with position : fixed, so cards
// with overflow : hidden (page header …) and hover transforms
// never cut it off. Below by default; flips above when there is
// no room, and stays inside the window. Empty text = no tooltip.
//===============================================================

import
{
    Directive,
    ElementRef,
    HostListener,
    Input,
    OnDestroy
}
from '@angular/core';


export type TooltipPosition =
    'bottom' | 'top';

// One <style> for the whole app (added on first use)
const STYLE_ID =
    'app-tooltip-style';

const STYLE =
`
.app-tooltip
{
    position: fixed;
    z-index: 10000;
    max-width: 260px;
    padding: 6px 10px;
    border-radius: 8px;
    background: #0f172a;
    color: #f8fafc;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0.01em;
    white-space: normal;
    pointer-events: none;
    box-shadow:
        0 10px 24px -8px rgba(15, 23, 42, 0.45),
        0 2px 6px rgba(15, 23, 42, 0.18);
    opacity: 0;
    transform: translateY(var(--app-tooltip-shift, 4px));
    transition: opacity 0.14s ease, transform 0.14s ease;
}

.app-tooltip.app-tooltip-on
{
    opacity: 1;
    transform: translateY(0);
}

.app-tooltip::after
{
    content: '';
    position: absolute;
    left: var(--app-tooltip-arrow, 50%);
    width: 8px;
    height: 8px;
    margin-left: -4px;
    background: inherit;
    transform: rotate(45deg);
    border-radius: 1px;
}

.app-tooltip.app-tooltip-bottom::after
{
    top: -4px;
}

.app-tooltip.app-tooltip-top::after
{
    bottom: -4px;
}
`;

@Directive(
{
    selector:'[appTooltip]',
    standalone:true
})

export class TooltipDirective
implements OnDestroy
{
    @Input('appTooltip')
    text:
        string | null | undefined =
        '';

    @Input()
    tooltipPosition:
        TooltipPosition =
        'bottom';

    // Pause before showing (ms)
    @Input()
    tooltipDelay:
        number =
        350;

    private tip:
        HTMLDivElement | null =
        null;

    private showTimer:
        ReturnType<typeof setTimeout> | null =
        null;

    constructor
    (
        private readonly host:
            ElementRef<HTMLElement>
    )
    {
    }

    @HostListener('mouseenter')
    @HostListener('focusin')
    onEnter():
        void
    {
        this.clearTimer();

        if
        (
            !(this.text ?? '').trim()
        )
        {
            return;
        }

        this.showTimer =
            setTimeout(
                () =>
                    this.show(),
                this.tooltipDelay
            );
    }

    @HostListener('mouseleave')
    @HostListener('focusout')
    @HostListener('click')
    onLeave():
        void
    {
        this.hide();
    }

    ngOnDestroy():
        void
    {
        this.hide();
    }

    //===========================================================
    // Show / hide
    //===========================================================

    private show():
        void
    {
        this.showTimer =
            null;

        const text =
            (this.text ?? '').trim();

        if
        (
            !text
            ||
            !this.host.nativeElement.isConnected
        )
        {
            return;
        }

        ensureStyle();

        this.removeTip();

        const tip =
            document.createElement('div');

        tip.className =
            'app-tooltip';

        tip.setAttribute('role', 'tooltip');

        tip.textContent =
            text;

        document.body.appendChild(tip);

        this.tip =
            tip;

        this.place(tip);

        // Next frame : fade / slide in
        requestAnimationFrame(
            () =>
                tip.classList.add('app-tooltip-on'));
    }

    private place
    (
        tip:
            HTMLDivElement
    ):
        void
    {
        const gap =
            8;

        const margin =
            6;

        const box =
            this.host.nativeElement.getBoundingClientRect();

        const width =
            tip.offsetWidth;

        const height =
            tip.offsetHeight;

        const roomBelow =
            window.innerHeight - box.bottom;

        const below =
            this.tooltipPosition === 'bottom'
                ? roomBelow >= height + gap + margin || box.top < height + gap + margin
                : box.top < height + gap + margin;

        const center =
            box.left + box.width / 2;

        const left =
            Math.min(
                Math.max(margin, center - width / 2),
                window.innerWidth - width - margin);

        const top =
            below
                ? box.bottom + gap
                : box.top - height - gap;

        tip.style.left =
            `${Math.round(left)}px`;

        tip.style.top =
            `${Math.round(top)}px`;

        // Arrow points at the element even when the label is
        // pushed in from the window edge
        tip.style.setProperty(
            '--app-tooltip-arrow',
            `${Math.round(Math.min(Math.max(10, center - left), width - 10))}px`);

        tip.style.setProperty(
            '--app-tooltip-shift',
            below ? '-4px' : '4px');

        tip.classList.add(
            below ? 'app-tooltip-bottom' : 'app-tooltip-top');
    }

    private hide():
        void
    {
        this.clearTimer();

        this.removeTip();
    }

    private removeTip():
        void
    {
        this.tip?.remove();

        this.tip =
            null;
    }

    private clearTimer():
        void
    {
        if
        (
            this.showTimer
        )
        {
            clearTimeout(this.showTimer);

            this.showTimer =
                null;
        }
    }
}

function ensureStyle():
    void
{
    if
    (
        document.getElementById(STYLE_ID)
    )
    {
        return;
    }

    const style =
        document.createElement('style');

    style.id =
        STYLE_ID;

    style.textContent =
        STYLE;

    document.head.appendChild(style);
}