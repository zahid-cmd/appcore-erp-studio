import
{
    ChangeDetectionStrategy,
    Component,
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