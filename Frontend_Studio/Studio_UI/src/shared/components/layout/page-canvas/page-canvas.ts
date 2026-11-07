import
{
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    Input
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

/* =====================================================
   CANVAS MODE
===================================================== */

export type PageCanvasMode =
    | 'list'
    | 'form';

/* =====================================================
   CANVAS CONFIG
===================================================== */

export interface PageCanvasConfig
{
    /* ===================================================
       RENDER MODE
    ==================================================== */

    mode: PageCanvasMode;

    /* ===================================================
       LAYOUT
    ==================================================== */

    showHeader: boolean;

    showFooter: boolean;

    reserveFooterSpace?: boolean;

    bodyScrollable: boolean;

    fixedHeight: boolean;

    /* ===================================================
       LOADING
    ==================================================== */

    loading?: boolean;

    /* ===================================================
       LIST CONTRACT
    ==================================================== */

    visibleRows?: number;

    rowHeight?: number;

    headerHeight?: number;

    footerHeight?: number;
}

@Component(
{
    selector: 'app-page-canvas',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './page-canvas.html',

    styleUrl:
        './page-canvas.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})
export class PageCanvasComponent
{
    /* =====================================================
       FIT TO SCREEN
       -----------------------------------------------------
       The canvas takes the height left on the screen
       between its own top edge and the bottom of the page
       area, after keeping room for whatever the page shows
       under it (summary line, notes). It never grows above
       MAX_HEIGHT and never shrinks below MIN_HEIGHT; if
       even that does not fit, the page area scrolls.
       Re-measured when the window or the page changes size.
    ====================================================== */

    private static readonly MAX_HEIGHT = 660;

    private static readonly MIN_HEIGHT = 320;

    private static readonly NARROW_WIDTH = 992;

    private readonly host =
        inject(ElementRef<HTMLElement>);

    private fitFrame = 0;

    constructor()
    {
        const destroyRef = inject(DestroyRef);

        afterNextRender(() =>
        {
            const schedule = () => this.scheduleFit();

            window.addEventListener('resize', schedule);

            const observer =
                typeof ResizeObserver !== 'undefined'
                    ? new ResizeObserver(schedule)
                    : null;

            const hostEl = this.host.nativeElement as HTMLElement;

            const content = hostEl.closest('.content') as HTMLElement | null;

            if (observer)
            {
                if (content) observer.observe(content);

                if (hostEl.parentElement) observer.observe(hostEl.parentElement);

                observer.observe(hostEl);
            }

            // Rows arriving (or changing) change the row measure
            const rowsWatch =
                typeof MutationObserver !== 'undefined'
                    ? new MutationObserver(schedule)
                    : null;

            rowsWatch?.observe(hostEl, { childList: true, subtree: true });

            this.scheduleFit();

            destroyRef.onDestroy(() =>
            {
                window.removeEventListener('resize', schedule);

                observer?.disconnect();

                rowsWatch?.disconnect();

                if (this.fitFrame) cancelAnimationFrame(this.fitFrame);
            });
        });
    }

    private scheduleFit(): void
    {
        if (this.fitFrame) return;

        this.fitFrame = requestAnimationFrame(() =>
        {
            this.fitFrame = 0;

            this.fit();
        });
    }

    private static readonly ROWS = 10;

    private static readonly MAX_ROW = 40;

    private static readonly MIN_ROW = 28;

    private fitList
    (
        canvas: HTMLElement,
        available: number
    ): void
    {
        const head =
            canvas.querySelector('thead') as HTMLElement | null;

        const foot =
            canvas.querySelector('.page-canvas-footer') as HTMLElement | null;

        const row =
            canvas.querySelector('tbody tr') as HTMLElement | null;

        const headH =
            head ? head.getBoundingClientRect().height : 40;

        const footH =
            foot ? foot.getBoundingClientRect().height : 0;

        const borders =
            canvas.offsetHeight - canvas.clientHeight;

        // What a row adds beyond its set height (cell borders, or a
        // page table with its own row height)
        const currentRow =
            parseFloat(canvas.style.getPropertyValue('--list-row-height')) || PageCanvasComponent.MAX_ROW;

        const extra =
            row && row.getBoundingClientRect().height > 0
                ? Math.max(0, row.getBoundingClientRect().height - currentRow)
                : 1;

        const fixed =
            headH + footH + borders + 2;

        const rowH =
            Math.max(
                PageCanvasComponent.MIN_ROW,
                Math.min(
                    PageCanvasComponent.MAX_ROW,
                    Math.floor((available - fixed) / PageCanvasComponent.ROWS - extra)));

        const height =
            Math.ceil(fixed + PageCanvasComponent.ROWS * (rowH + extra));

        if (canvas.style.getPropertyValue('--list-row-height') !== `${rowH}px`)
        {
            canvas.style.setProperty('--list-row-height', `${rowH}px`);
        }

        const current =
            parseFloat(canvas.style.height) || 0;

        if (Math.abs(current - height) >= 1)
        {
            canvas.style.height = height + 'px';
        }
    }

    private fit(): void
    {
        const hostEl = this.host.nativeElement as HTMLElement;

        const canvas = hostEl.querySelector('.page-canvas') as HTMLElement | null;

        const content = hostEl.closest('.content') as HTMLElement | null;

        if (!canvas) return;

        // Pages marked data-canvas="fit" (page canvas across
        // monitors) : pure CSS, the canvas fills what is left.
        // Nothing is measured; any height set earlier goes.
        if (hostEl.closest('[data-canvas="fit"]'))
        {
            canvas.style.removeProperty('--list-row-height');
            if (canvas.style.height) canvas.style.height = '';
            return;
        }

        // Canvases outside the page area (dialogs) and small
        // screens keep the stylesheet height.
        // Lists : 660px (owner 2026-11-06), rows 40px. Only when the
        // page area is too short for it (small screen, Windows
        // scaling) the canvas gives up exactly what is missing, so
        // the summary line under it stays visible with no page
        // scroll; the rows then scroll inside the list.
        // Lists : pure CSS (app-list-page.css), nothing measured
        if (this.isList)
        {
            canvas.style.removeProperty('--list-row-height');

            if (canvas.style.height) canvas.style.height = '';

            return;
        }

        if (!content || window.innerWidth <= PageCanvasComponent.NARROW_WIDTH)
        {
            if (canvas.style.height) canvas.style.height = '';

            canvas.style.removeProperty('--list-row-height');

            return;
        }

        const contentRect = content.getBoundingClientRect();

        const canvasRect = canvas.getBoundingClientRect();

        const padBottom =
            parseFloat(getComputedStyle(content).paddingBottom) || 0;

        // Room needed by what the page shows under the canvas.
        let below = 0;

        let sibling = hostEl.nextElementSibling as HTMLElement | null;

        while (sibling)
        {
            const style = getComputedStyle(sibling);

            if (style.position !== 'absolute'
                && style.position !== 'fixed'
                && style.display !== 'none')
            {
                const rect = sibling.getBoundingClientRect();

                if (rect.height > 0)
                {
                    below = Math.max(below, rect.bottom - canvasRect.bottom);
                }
            }

            sibling = sibling.nextElementSibling as HTMLElement | null;
        }

        const topInContent =
            canvasRect.top - contentRect.top + content.scrollTop;

        const available =
            content.clientHeight - padBottom - topInContent - below;

        // Lists : exactly 10 rows, never a page scroll. The canvas
        // is header + 10 rows + pager; when the screen is short the
        // rows get lower (down to MIN_ROW) instead.
        if (this.isList)
        {
            this.fitList(canvas, available);

            return;
        }

        const height = Math.round(
            Math.max(
                PageCanvasComponent.MIN_HEIGHT,
                Math.min(PageCanvasComponent.MAX_HEIGHT, available)));

        const current = parseFloat(canvas.style.height) || 0;

        if (Math.abs(current - height) >= 1)
        {
            canvas.style.height = height + 'px';
        }
    }

    /* =====================================================
       CONFIG
    ====================================================== */

    @Input()
    config: PageCanvasConfig =
    {
        mode: 'list',

        showHeader: true,

        showFooter: true,

        reserveFooterSpace: false,

        bodyScrollable: true,

        fixedHeight: true,

        loading: false,

        visibleRows: 10,

        rowHeight: 36,

        headerHeight: 36,

        footerHeight: 56
    };

    /* =====================================================
       MODE
    ====================================================== */

    get isList(): boolean
    {
        return this.config.mode === 'list';
    }

    get isForm(): boolean
    {
        return this.config.mode === 'form';
    }

    /* =====================================================
       LOADING
    ====================================================== */

    get isLoading(): boolean
    {
        return this.config.loading ?? false;
    }

    /* =====================================================
       COMPUTED BODY HEIGHT
    ====================================================== */

    get bodyHeight(): number
    {
        if (!this.isList)
        {
            return 0;
        }

        return (this.config.visibleRows ?? 10)
            * (this.config.rowHeight ?? 36);
    }

    /* =====================================================
       COMPUTED CANVAS HEIGHT
    ====================================================== */

    get canvasHeight(): number
    {
        if (!this.isList)
        {
            return 0;
        }

        return this.bodyHeight
            + (this.config.headerHeight ?? 36)
            + (this.config.footerHeight ?? 56);
    }
}