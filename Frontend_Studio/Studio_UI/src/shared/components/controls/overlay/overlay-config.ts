/* =====================================================
   IMPORTS
===================================================== */

import
{
    Type
}
from '@angular/core';

import
{
    ConnectedPosition,
    FlexibleConnectedPositionStrategyOrigin
}
from '@angular/cdk/overlay';

/* =====================================================
   OVERLAY CONFIG
===================================================== */

export interface OverlayConfig
{
    /* =====================================================
       CONTENT
    ====================================================== */

    component:
        Type<unknown>;

    /* =====================================================
       ORIGIN
    ====================================================== */

    origin?:
        FlexibleConnectedPositionStrategyOrigin;

    /* =====================================================
       SIZE
    ====================================================== */

    width?:
        number | string;

    height?:
        number | string;

    minWidth?:
        number | string;

    minHeight?:
        number | string;

    maxWidth?:
        number | string;

    maxHeight?:
        number | string;

    matchOriginWidth?:
        boolean;

    /* =====================================================
       POSITION
    ====================================================== */

    positions?:
        ConnectedPosition[];

    offsetX?:
        number;

    offsetY?:
        number;

    /* =====================================================
       BEHAVIOUR
    ====================================================== */

    hasBackdrop?:
        boolean;

    backdropClose?:
        boolean;

    disposeOnNavigation?:
        boolean;
}