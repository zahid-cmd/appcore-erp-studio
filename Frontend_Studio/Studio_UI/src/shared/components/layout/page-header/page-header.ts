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

import
{
    WorkspaceArtComponent
}
from '../workspace-art/workspace-art';

@Component({
    selector: 'app-page-header',

    standalone: true,

    imports:
    [
        CommonModule,
        WorkspaceArtComponent
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

    // A short name after the title, in deep green :
    // "Return on Investment - ROI" (2026-11-17)
    @Input()
    titleMark = '';

    @Input()
    subtitle = '';

    @Input()
    icon = '';

    // A workspace art theme (company, branches ...) : the icon tile
    // shows that drawing instead of the font icon (2026-11-15)
    @Input()
    art = '';
}