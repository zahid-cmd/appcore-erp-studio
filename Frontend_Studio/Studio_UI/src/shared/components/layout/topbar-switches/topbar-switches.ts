//===============================================================
// Topbar Switches
// --------------------------------------------------------------
// Light / Deep appearance and Side / Top layout.
//
//   Ctrl Shift D   flip Light / Deep
//   Ctrl Shift L   flip Sidebar / Top navigation
//
// State lives in ShellService (remembered per user in this
// browser); the layout applies it.
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
    ShellService
}
from '../../../../core/shell/shell.service';

import
{
    ShellAppearance,
    ShellLayoutMode
}
from '../../../../core/shell/shell.models';


@Component(
{
    selector:
        'app-topbar-switches',

    standalone:
        true,

    imports:
    [
    ],

    templateUrl:
        './topbar-switches.html',

    styleUrls:
    [
        './topbar-switches.css'
    ]
})
export class TopbarSwitchesComponent
{

    //===========================================================
    // Dependencies
    //===========================================================

    private readonly shellService =
        inject(ShellService);


    //===========================================================
    // State
    //===========================================================

    readonly appearance =
        this.shellService.appearance;

    readonly layoutMode =
        this.shellService.layoutMode;


    //===========================================================
    // Actions
    //===========================================================

    setAppearance
    (
        appearance:
            ShellAppearance
    ):
        void
    {
        this.shellService.setAppearance(
            appearance
        );
    }


    setLayout
    (
        mode:
            ShellLayoutMode
    ):
        void
    {
        this.shellService.setLayoutMode(
            mode
        );
    }


    //===========================================================
    // Keyboard Shortcuts
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
            !(
                event.ctrlKey
                ||
                event.metaKey
            )
            ||
            !event.shiftKey
            ||
            event.altKey
        )
        {
            return;
        }

        const key =
            (event.key ?? '').toLowerCase();

        if
        (
            key === 'l'
        )
        {
            event.preventDefault();

            this.shellService.toggleLayoutMode();
        }
        else if
        (
            key === 'd'
        )
        {
            event.preventDefault();

            this.shellService.toggleAppearance();
        }
    }

}
