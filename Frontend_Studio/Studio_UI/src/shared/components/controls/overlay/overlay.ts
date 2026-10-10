//===============================================================
// Imports
//===============================================================

import
{
    Component,
    EventEmitter,
    HostListener,
    Input,
    Output,
    OnChanges,
    SimpleChanges
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    OverlayModule,
    CdkOverlayOrigin,
    ConnectedPosition
}
from '@angular/cdk/overlay';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-overlay',

    standalone:true,

    imports:
    [
        CommonModule,

        OverlayModule
    ],

    templateUrl:
        './overlay.html',

    styleUrl:
        './overlay.css'
})

export class OverlayComponent
implements OnChanges
{
    //===========================================================
    // Origin
    //===========================================================

    @Input(
    {
        required:true
    })
    origin!:
        CdkOverlayOrigin;

    //===========================================================
    // Visibility
    //===========================================================

    @Input()
    visible =
        false;

    @Output()
    visibleChange =
        new EventEmitter<boolean>();

    @Output()
    closed =
        new EventEmitter<void>();

    //===========================================================
    // Size
    //===========================================================

    @Input()
    width:
        string | number | null = null;

    @Input()
    minWidth:
        string | number | null = null;

    @Input()
    matchOriginWidth =
        true;

    protected overlayWidth:
        string | number = '';

    //===========================================================
    // Position
    //===========================================================

    @Input()
    offsetY =
        4;

    //===========================================================
    // Behaviour
    //===========================================================

    @Input()
    hasBackdrop =
        true;

    @Input()
    closeOnOutsideClick =
        true;

    //===========================================================
    // Changes
    //===========================================================

    ngOnChanges
    (
        changes:SimpleChanges
    ):
        void
    {
        if
        (
            changes['visible']
            ||
            changes['width']
            ||
            changes['minWidth']
            ||
            changes['matchOriginWidth']
        )
        {
            if(this.visible)
            {
                this.calculateWidth();
            }
        }
    }

    //===========================================================
    // Width
    //===========================================================

    private calculateWidth():
        void
    {
        //=======================================================
        // Explicit Width
        //=======================================================

        if
        (
            this.width !== null &&
            !this.matchOriginWidth
        )
        {
            this.overlayWidth =
                this.width;

            return;
        }

        //=======================================================
        // Origin
        //=======================================================

        if(!this.origin)
        {
            this.overlayWidth =
                this.width ?? '';

            return;
        }

        const element =
            this.origin
                .elementRef
                .nativeElement as HTMLElement;

        const originWidth =
            element
                .getBoundingClientRect()
                .width;

        //=======================================================
        // Match Origin Width
        //=======================================================

        if(this.matchOriginWidth)
        {
            this.overlayWidth =
                originWidth;

            return;
        }

        //=======================================================
        // Explicit Width Fallback
        //=======================================================

        this.overlayWidth =
            this.width ?? originWidth;

        //=======================================================
        // Minimum Width
        //=======================================================

        if(this.minWidth !== null)
        {
            const minimumWidth =
                typeof this.minWidth === 'number'
                    ? this.minWidth
                    : parseFloat(this.minWidth);

            const currentWidth =
                typeof this.overlayWidth === 'number'
                    ? this.overlayWidth
                    : parseFloat(String(this.overlayWidth));

            if
            (
                Number.isFinite(minimumWidth) &&
                Number.isFinite(currentWidth)
            )
            {
                this.overlayWidth =
                    Math.max(
                        currentWidth,
                        minimumWidth
                    );
            }
        }
    }

    //===========================================================
    // Positions
    //===========================================================

    get positions(): ConnectedPosition[]
    {
        return [
            {
                originX:'start',
                originY:'bottom',

                overlayX:'start',
                overlayY:'top',

                offsetY:this.offsetY
            },

            {
                originX:'start',
                originY:'top',

                overlayX:'start',
                overlayY:'bottom',

                offsetY:-this.offsetY
            }
        ];
    }

    //===========================================================
    // Attach
    //===========================================================

    onAttach():
        void
    {
        this.calculateWidth();
    }

    //===========================================================
    // Detach
    //===========================================================

    onDetach():
        void
    {
        this.close();
    }

    //===========================================================
    // Close
    //===========================================================

    close():
        void
    {
        if(!this.visible)
        {
            return;
        }

        this.visible =
            false;

        this.visibleChange.emit(
            false
        );

        this.closed.emit();
    }

    //===========================================================
    // Window Resize
    //===========================================================

    @HostListener('window:resize')
    onWindowResize():
        void
    {
        if(this.visible)
        {
            this.calculateWidth();
        }
    }

    //===========================================================
    // Backdrop
    //===========================================================

    onBackdropClick():
        void
    {
        if(this.closeOnOutsideClick)
        {
            this.close();
        }
    }

    //===========================================================
    // Escape
    //===========================================================

    @HostListener('document:keydown.escape')
    onEscape():
        void
    {
        this.close();
    }
}