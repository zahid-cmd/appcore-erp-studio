//===============================================================
// Scroll Rail (website)
// --------------------------------------------------------------
// A vertical line fixed on the right of the website, in place of
// the browser scrollbar (hidden on desktop by the website frame).
//
//   • one dot per page section (the page's top-level [id]
//     sections, plus Visit Us), placed where that section starts
//   • a glowing ball runs down the line with the scroll; the
//     line behind it fills in
//   • the section being read is lit, and its name shows beside
//     the ball while scrolling
//   • click a dot → smooth scroll to that section; click or drag
//     on the line → scroll there (it works like a scrollbar)
//
// It appears only after the first screen (the hero) : on the
// hero it stays hidden, from the second section on it slides in.
// Hidden on small screens (normal touch scrolling there).
//===============================================================

import
{
    Component,
    ElementRef,
    Input,
    NgZone,
    OnDestroy,
    AfterViewInit,
    ViewChild,
    inject,
    signal
}
from '@angular/core';

import
{
    NavigationEnd,
    Router
}
from '@angular/router';

import
{
    Subscription,
    filter
}
from 'rxjs';

import
{
    scrollToSection
}
from '../../../../core/website/website-links';


// One step on the rail
interface RailStep
{
    id:string;
    label:string;
    // 0 … 1 along the rail
    at:number;
}


// Names of the home page sections (others : the id, title-cased)
const STEP_LABELS:
    Record<string, string> =
{
    top:'Top',
    models:'Bikes',
    why:'Why Us',
    emi:'EMI',
    service:'Service',
    branches:'Branches',
    faq:'FAQ',
    'test-ride':'Test Ride',
    visit:'Visit Us'
};


@Component(
{
    selector:'app-scroll-rail',
    standalone:true,
    templateUrl:'./scroll-rail.html',
    styleUrl:'./scroll-rail.css'
})
export class ScrollRailComponent
implements AfterViewInit, OnDestroy
{
    // The element that scrolls (the website frame)
    @Input({ required:true })
    scroller!:
        HTMLElement;


    @ViewChild('track')
    private track?:
        ElementRef<HTMLElement>;

    @ViewChild('ball')
    private ball?:
        ElementRef<HTMLElement>;

    @ViewChild('fill')
    private fill?:
        ElementRef<HTMLElement>;


    private readonly zone =
        inject(NgZone);

    private readonly router =
        inject(Router);


    readonly steps =
        signal<RailStep[]>([]);

    readonly active =
        signal<number>(0);

    // Label beside the ball : shown while scrolling, then fades
    readonly moving =
        signal<boolean>(false);

    // Nothing to scroll : the rail hides
    readonly idle =
        signal<boolean>(true);

    // Past the hero : the rail shows
    readonly shown =
        signal<boolean>(false);

    // Scroll position after which the rail shows (end of the
    // hero, else most of the first screen)
    private showAfter =
        0;


    private progress =
        0;

    private frame =
        0;

    private movingTimer?:
        number;

    private resizeObserver?:
        ResizeObserver;

    private navigation?:
        Subscription;

    private dragging =
        false;


    private readonly onScroll =
        (): void =>
            this.schedule();


    //===========================================================
    // Start / stop
    //===========================================================

    ngAfterViewInit():
        void
    {
        this.zone.runOutsideAngular(
            () =>
            {
                this.scroller.addEventListener(
                    'scroll',
                    this.onScroll,
                    { passive:true }
                );

                // Page height changes (content loaded, accordions,
                // images) : steps are measured again
                this.resizeObserver =
                    new ResizeObserver(() => this.measure());

                const content =
                    this.scroller.firstElementChild;

                if
                (
                    content
                )
                {
                    this.resizeObserver.observe(content);
                }

                this.resizeObserver.observe(this.scroller);
            }
        );

        this.navigation =
            this.router.events
                .pipe(filter(e => e instanceof NavigationEnd))
                .subscribe(() => setTimeout(() => this.measure(), 60));

        setTimeout(() => this.measure(), 0);
    }


    ngOnDestroy():
        void
    {
        this.scroller?.removeEventListener('scroll', this.onScroll);

        this.resizeObserver?.disconnect();

        this.navigation?.unsubscribe();

        cancelAnimationFrame(this.frame);

        clearTimeout(this.movingTimer);
    }



    //===========================================================
    // Measure the sections
    //===========================================================

    private maxScroll():
        number
    {
        return Math.max(
            0,
            this.scroller.scrollHeight - this.scroller.clientHeight
        );
    }


    // Where the frame scrolls to for this element (as the
    // section links do : less its scroll-margin-top)
    private targetOf
    (
        element:
            HTMLElement
    ):
        number
    {
        const margin =
            parseFloat(getComputedStyle(element).scrollMarginTop) || 0;

        return this.scroller.scrollTop
            + element.getBoundingClientRect().top
            - this.scroller.getBoundingClientRect().top
            - margin;
    }


    private measure():
        void
    {
        const max =
            this.maxScroll();

        // Top-level sections of the page, then Visit Us
        const elements =
            Array.from(
                this.scroller.querySelectorAll<HTMLElement>(
                    '.website-main .page > [id], .website-main > * > [id], #visit'
                )
            )
            .filter(
                (element, index, all) =>
                    all.indexOf(element) === index
                    &&
                    element.offsetHeight > 0
            );

        const steps:
            RailStep[] =
        [
            {
                id:'top',
                label:STEP_LABELS['top'],
                at:0
            }
        ];

        for
        (
            const element
            of elements
        )
        {
            const at =
                max > 0
                    ? Math.min(1, Math.max(0, this.targetOf(element) / max))
                    : 0;

            // Two dots on one spot : keep the first
            if
            (
                steps.some(x => Math.abs(x.at - at) < 0.015)
            )
            {
                continue;
            }

            steps.push(
                {
                    id:element.id,
                    label:STEP_LABELS[element.id] ?? this.titleCase(element.id),
                    at
                }
            );
        }

        steps.sort((a, b) => a.at - b.at);

        // Show after the hero : once its lower part has scrolled
        // away (pages without a hero : most of the first screen)
        const hero =
            this.scroller.querySelector<HTMLElement>('.website-main app-hero');

        this.showAfter =
            hero && hero.offsetHeight > 0
                ? Math.max(0, hero.offsetHeight * 0.65)
                : this.scroller.clientHeight * 0.6;

        this.zone.run(
            () =>
            {
                this.steps.set(steps);

                this.idle.set(max < 40);
            }
        );

        this.schedule();
    }


    private titleCase
    (
        id:
            string
    ):
        string
    {
        return id
            .split(/[-_]/)
            .filter(x => !!x)
            .map(x => x.charAt(0).toUpperCase() + x.slice(1))
            .join(' ');
    }



    //===========================================================
    // Follow the scroll (one update per frame, outside Angular)
    //===========================================================

    private schedule():
        void
    {
        cancelAnimationFrame(this.frame);

        this.frame =
            requestAnimationFrame(() => this.update());
    }


    private update():
        void
    {
        const max =
            this.maxScroll();

        this.progress =
            max > 0
                ? Math.min(1, Math.max(0, this.scroller.scrollTop / max))
                : 0;

        const percent =
            `${(this.progress * 100).toFixed(3)}%`;

        if
        (
            this.ball
        )
        {
            this.ball.nativeElement.style.top = percent;
        }

        if
        (
            this.fill
        )
        {
            this.fill.nativeElement.style.height = percent;
        }

        // Hidden on the hero, shown from the next section on
        const shown =
            this.scroller.scrollTop > this.showAfter;

        if
        (
            shown !== this.shown()
        )
        {
            this.zone.run(() => this.shown.set(shown));
        }

        // The section being read : the last one the ball passed
        const steps =
            this.steps();

        let index =
            0;

        for
        (
            let i = 0;
            i < steps.length;
            i++
        )
        {
            if
            (
                steps[i].at <= this.progress + 0.002
            )
            {
                index = i;
            }
        }

        if
        (
            index !== this.active()
            ||
            !this.moving()
        )
        {
            this.zone.run(
                () =>
                {
                    this.active.set(index);

                    this.moving.set(true);
                }
            );
        }

        clearTimeout(this.movingTimer);

        this.movingTimer =
            window.setTimeout(
                () =>
                    this.zone.run(() => this.moving.set(false)),
                1200
            );
    }



    //===========================================================
    // Click a dot : smooth scroll to its section
    //===========================================================

    goTo
    (
        step:
            RailStep,

        event:
            Event
    ):
        void
    {
        event.stopPropagation();

        if
        (
            step.id === 'top'
        )
        {
            this.scroller.scrollTo({ top:0, behavior:'smooth' });

            return;
        }

        scrollToSection(step.id);
    }



    //===========================================================
    // Click or drag on the line : scroll there
    //===========================================================

    private scrollToPointer
    (
        clientY:
            number,

        smooth:
            boolean
    ):
        void
    {
        const rect =
            this.track?.nativeElement.getBoundingClientRect();

        if
        (
            !rect
            ||
            rect.height <= 0
        )
        {
            return;
        }

        const fraction =
            Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));

        this.scroller.scrollTo(
            {
                top:fraction * this.maxScroll(),
                behavior:smooth ? 'smooth' : 'auto'
            }
        );
    }


    onPointerDown
    (
        event:
            PointerEvent
    ):
        void
    {
        if
        (
            event.button !== 0
        )
        {
            return;
        }

        this.dragging = true;

        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

        this.scrollToPointer(event.clientY, true);

        event.preventDefault();
    }


    onPointerMove
    (
        event:
            PointerEvent
    ):
        void
    {
        if
        (
            this.dragging
        )
        {
            this.scrollToPointer(event.clientY, false);
        }
    }


    onPointerUp
    (
        event:
            PointerEvent
    ):
        void
    {
        this.dragging = false;

        try
        {
            (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
        }
        catch
        {
            // Already released
        }
    }


    // Keys on the focused rail : up / down by section
    onKey
    (
        event:
            KeyboardEvent
    ):
        void
    {
        const steps =
            this.steps();

        const step =
            event.key === 'ArrowDown' || event.key === 'PageDown'
                ? steps[Math.min(steps.length - 1, this.active() + 1)]
                : event.key === 'ArrowUp' || event.key === 'PageUp'
                    ? steps[Math.max(0, this.active() - 1)]
                    : null;

        if
        (
            step
        )
        {
            event.preventDefault();

            this.goTo(step, event);
        }
    }
}
