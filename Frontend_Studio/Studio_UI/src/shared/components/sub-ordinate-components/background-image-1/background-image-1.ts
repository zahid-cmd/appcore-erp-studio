//===============================================================
// Imports
//===============================================================

import
{
    CommonModule
}
from '@angular/common';

import
{
    Component,
    Input
}
from '@angular/core';


//===============================================================
// Component
//===============================================================

@Component
(
    {
        selector:
            'app-background-image',

        standalone:
            true,

        imports:
        [
            CommonModule
        ],

        templateUrl:
            './background-image-1.html',

        styleUrl:
            './background-image-1.css'
    }
)


//===============================================================
// Background Image Component
//===============================================================

export class BackgroundImageComponent
{

    //===========================================================
    // Background Image - Light
    //===========================================================
    //
    // This input receives the image URL from the
    // Sub Ordinate Components List page.
    //
    // Example:
    //
    // http://localhost:xxxx/uploads/
    // sub-ordinate-components/1/light-xxxx.jpg
    //
    //===========================================================

    @Input()
    lightBackgroundImageUrl:
        string =
        '';


    //===========================================================
    // Background Image - Deep
    //===========================================================
    //
    // This input receives the image URL from the
    // Sub Ordinate Components List page.
    //
    //===========================================================

    @Input()
    deepBackgroundImageUrl:
        string =
        '';


    //===========================================================
    // Background Image - Light
    //===========================================================
    //
    // Local display state.
    //
    // Kept for the existing upload/remove functionality.
    //
    //===========================================================

    lightImageUrl:
        string =
        '';


    //===========================================================
    // Background Image - Deep
    //===========================================================
    //
    // Local display state.
    //
    // Kept for the existing upload/remove functionality.
    //
    //===========================================================

    deepImageUrl:
        string =
        '';


    //===========================================================
    // Upload Light Image
    //===========================================================

    uploadLightImage():
        void
    {
        // Upload implementation will be connected later.
    }


    //===========================================================
    // Remove Light Image
    //===========================================================

    removeLightImage():
        void
    {
        this.lightImageUrl =
            '';

        this.lightBackgroundImageUrl =
            '';
    }


    //===========================================================
    // Upload Deep Image
    //===========================================================

    uploadDeepImage():
        void
    {
        // Upload implementation will be connected later.
    }


    //===========================================================
    // Remove Deep Image
    //===========================================================

    removeDeepImage():
        void
    {
        this.deepImageUrl =
            '';

        this.deepBackgroundImageUrl =
            '';
    }

}