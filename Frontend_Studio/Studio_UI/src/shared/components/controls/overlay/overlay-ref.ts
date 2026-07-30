/* =====================================================
   IMPORTS
===================================================== */

import
{
    OverlayRef
}
from '@angular/cdk/overlay';

/* =====================================================
   APP OVERLAY REF
===================================================== */

export class AppOverlayRef
{
    /* =====================================================
       CONSTRUCTOR
    ====================================================== */

    constructor
    (
        private readonly overlayRef:
            OverlayRef
    )
    {
    }

    /* =====================================================
       OVERLAY
    ====================================================== */

    get overlay():
        OverlayRef
    {
        return this.overlayRef;
    }

    /* =====================================================
       ATTACHED
    ====================================================== */

    get attached():
        boolean
    {
        return this.overlayRef.hasAttached();
    }

    /* =====================================================
       UPDATE POSITION
    ====================================================== */

    updatePosition(): void
    {
        this.overlayRef.updatePosition();
    }

    /* =====================================================
       UPDATE SIZE
    ====================================================== */

    updateSize
    (
        width?:
            number | string,

        height?:
            number | string
    ): void
    {
        this.overlayRef.updateSize(
        {
            width,
            height
        });
    }

    /* =====================================================
       DETACH
    ====================================================== */

    detach(): void
    {
        if
        (
            this.overlayRef.hasAttached()
        )
        {
            this.overlayRef.detach();
        }
    }

    /* =====================================================
       DISPOSE
    ====================================================== */

    dispose(): void
    {
        this.overlayRef.dispose();
    }

    /* =====================================================
       BACKDROP CLICK
    ====================================================== */

    backdropClick()
    {
        return this.overlayRef.backdropClick();
    }
}