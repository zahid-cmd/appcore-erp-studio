//===============================================================
// Login Page 2 Theme Selector
//===============================================================

import
{
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output
}
from '@angular/core';


//===============================================================
// Login Page 2 Theme Selector Component
//===============================================================

@Component
({
    selector:
        'app-login-page-theme-selector',

    standalone:
        true,

    templateUrl:
        './theme-selector.html',

    styleUrls:
    [
        './theme-selector.css'
    ],

    changeDetection:
        ChangeDetectionStrategy.OnPush
})


//===============================================================
// Login Page 2 Theme Selector
//===============================================================

export class LoginPageThemeSelectorComponent
{
    //===========================================================
    // Current Theme
    // ----------------------------------------------------------
    // true  = Light Theme
    // false = Deep Theme
    //===========================================================

    @Input()
    isLightTheme:
        boolean =
            true;


    //===========================================================
    // Theme Change Event
    // ----------------------------------------------------------
    // true  = Light Theme
    // false = Deep Theme
    //===========================================================

    @Output()
    themeChange:
        EventEmitter<boolean> =
            new EventEmitter<boolean>();


    //===========================================================
    // Select Light Theme
    //===========================================================

    selectLightTheme():
        void
    {
        if
        (
            this.isLightTheme
        )
        {
            return;
        }

        this.themeChange.emit
        (
            true
        );
    }


    //===========================================================
    // Select Deep Theme
    //===========================================================

    selectDeepTheme():
        void
    {
        if
        (
            !this.isLightTheme
        )
        {
            return;
        }

        this.themeChange.emit
        (
            false
        );
    }


    //===========================================================
    // Toggle Theme
    // ----------------------------------------------------------
    // Clicking the central toggle switches between
    // Light and Deep themes.
    //===========================================================

    toggleTheme():
        void
    {
        this.themeChange.emit
        (
            !this.isLightTheme
        );
    }
}