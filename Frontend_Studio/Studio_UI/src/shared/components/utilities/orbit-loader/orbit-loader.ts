import
{
    Component,
    Input
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

@Component(
{
    selector: 'app-orbit-loader',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './orbit-loader.html',

    styleUrl:
        './orbit-loader.css'
})
export class OrbitLoaderComponent
{
    /* =====================================================
       INPUTS
    ====================================================== */

    @Input()
    title = 'Loading';

    @Input()
    message =
        'Please wait while data is being loaded.';

    @Input()
    size:
        'small' |
        'medium' |
        'large' = 'medium';

    @Input()
    showMessage = true;

    @Input()
    overlay = false;
}