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

@Component({
    selector: 'app-page-toolbar',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './page-toolbar.html',

    styleUrl:
        './page-toolbar.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})

export class PageToolbarComponent
{
    /* =====================================================
       LAYOUT
    ====================================================== */

    @Input()
    leftFlex =
        '1 1 auto';

    @Input()
    rightFlex =
        '0 0 auto';
}