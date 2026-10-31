//===============================================================
// Topbar Calculator (button)
// --------------------------------------------------------------
// Opens the floating business calculator (Alt C). While the
// calculator is minimised, the button grows a pill with the
// last result; a click brings the window back.
//
// The window itself (CalculatorWindowComponent) lives in the
// layout, outside the top bar, so it floats over every page.
//===============================================================

import
{
    Component,
    HostListener,
    inject
}
from '@angular/core';

import
{
    CalculatorService
}
from './calculator.service';


@Component(
{
    selector:
        'app-topbar-calculator',
    standalone:
        true,
    imports:
    [
    ],
    templateUrl:
        './topbar-calculator.html',
    styleUrls:
    [
        './topbar-calculator.css'
    ]
})
export class TopbarCalculatorComponent
{
    //===========================================================
    // Dependencies
    //===========================================================

    readonly calculator =
        inject(CalculatorService);


    //===========================================================
    // Actions
    //===========================================================

    toggle():
        void
    {
        this.calculator.toggle();
    }


    //===========================================================
    // Keyboard : Alt C opens / closes
    //===========================================================

    @HostListener(
        'document:keydown',
        [
            '$event'
        ]
    )
    onDocumentKeydown
    (
        event:
            KeyboardEvent
    ):
        void
    {
        if
        (
            !event.altKey
            ||
            event.ctrlKey
            ||
            event.metaKey
            ||
            event.shiftKey
        )
        {
            return;
        }

        if
        (
            (event.key ?? '').toLowerCase() === 'c'
            ||
            event.code === 'KeyC'
        )
        {
            event.preventDefault();

            this.calculator.toggle();
        }
    }
}
