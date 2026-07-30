/* =====================================================
   IMPORTS
===================================================== */

import
{
    Injectable,
    Injector
}
from '@angular/core';

import
{
    Overlay,
    OverlayConfig,
    ConnectedPosition,
    FlexibleConnectedPositionStrategy
}
from '@angular/cdk/overlay';

import
{
    ComponentPortal
}
from '@angular/cdk/portal';

import
{
    AppOverlayRef
}
from './overlay-ref';

import
{
    OverlayConfig as AppOverlayConfig
}
from './overlay-config';

/* =====================================================
   OVERLAY SERVICE
===================================================== */

@Injectable(
{
    providedIn: 'root'
})
export class OverlayService
{
    /* =====================================================
       CONSTRUCTOR
    ====================================================== */

    constructor
    (
        private overlay:
            Overlay,

        private injector:
            Injector
    )
    {
    }

    /* =====================================================
       OPEN
    ====================================================== */

    open
    (
        config:
            AppOverlayConfig
    ):
        AppOverlayRef
    {
        const overlayConfig =
            this.createOverlayConfig(
                config
            );

        const overlayRef =
            this.overlay.create(
                overlayConfig
            );

        overlayRef.attach(
            new ComponentPortal(
                config.component,
                null,
                this.injector
            )
        );

        const appOverlayRef =
            new AppOverlayRef(
                overlayRef
            );

        if
        (
            config.backdropClose !== false
        )
        {
            appOverlayRef
                .backdropClick()
                .subscribe(() =>
                {
                    appOverlayRef.dispose();
                });
        }

        return appOverlayRef;
    }

    /* =====================================================
       CLOSE
    ====================================================== */

    close
    (
        overlay:
            AppOverlayRef | null
    ): void
    {
        if (!overlay)
        {
            return;
        }

        overlay.dispose();
    }

    /* =====================================================
       CREATE CONFIG
    ====================================================== */

    private createOverlayConfig
    (
        config:
            AppOverlayConfig
    ):
        OverlayConfig
    {
        const overlayConfig =
            new OverlayConfig(
            {
                hasBackdrop:
                    config.hasBackdrop ?? true,

                disposeOnNavigation:
                    config.disposeOnNavigation ?? true,

                scrollStrategy:
                    this.overlay
                        .scrollStrategies
                        .reposition()
            });

        if
        (
            config.origin
        )
        {
            overlayConfig.positionStrategy =
                this.createPositionStrategy(
                    config
                );
        }

        overlayConfig.width =
            config.width;

        overlayConfig.height =
            config.height;

        overlayConfig.minWidth =
            config.minWidth;

        overlayConfig.minHeight =
            config.minHeight;

        overlayConfig.maxWidth =
            config.maxWidth;

        overlayConfig.maxHeight =
            config.maxHeight;

        return overlayConfig;
    }

    /* =====================================================
       POSITION STRATEGY
    ====================================================== */

    private createPositionStrategy
    (
        config:
            AppOverlayConfig
    ):
        FlexibleConnectedPositionStrategy
    {
        return this.overlay
            .position()
            .flexibleConnectedTo(
                config.origin!
            )
            .withFlexibleDimensions(false)
            .withPush(false)
            .withPositions(
                config.positions ??
                this.defaultPositions()
            );
    }

    /* =====================================================
       DEFAULT POSITIONS
    ====================================================== */

    private defaultPositions():
        ConnectedPosition[]
    {
        return [
            {
                originX: 'start',
                originY: 'bottom',

                overlayX: 'start',
                overlayY: 'top'
            },
            {
                originX: 'start',
                originY: 'top',

                overlayX: 'start',
                overlayY: 'bottom'
            }
        ];
    }
}