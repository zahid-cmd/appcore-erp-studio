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

@Component({
    selector: 'app-page-header',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    // "title" is an input; without this the browser also keeps it as
    // the host's HTML title, which shows as a tooltip over every
    // button inside the header
    host:
    {
        '[attr.title]':'null'
    },
    templateUrl:
        './page-header.html',

    styleUrl:
        './page-header.css'
})
export class PageHeaderComponent
{
    /* =====================================================
       INPUTS
    ====================================================== */

    @Input()
    title = '';

    @Input()
    subtitle = '';

    @Input()
    icon = '';
}