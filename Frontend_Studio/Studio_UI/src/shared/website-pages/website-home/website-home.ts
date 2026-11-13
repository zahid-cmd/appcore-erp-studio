//===============================================================
// Website Home ( / )
// --------------------------------------------------------------
// Shows the home page of the design in use : the default design
// (Website Configuration › Design), or the staff preview.
//===============================================================

import
{
    Component,
    inject
}
from '@angular/core';

import
{
    NgComponentOutlet
}
from '@angular/common';

import
{
    WebsiteDesignService
}
from '../../../core/website/website-design.service';


@Component(
{
    selector:'app-website-home',
    standalone:true,
    imports:
    [
        NgComponentOutlet
    ],
    template:`
        @if (designs.kit(); as kit)
        {
            <ng-container *ngComponentOutlet="kit.home"></ng-container>
        }
    `,
    styles:[':host{display:block}']
})
export class WebsiteHome
{
    readonly designs =
        inject(WebsiteDesignService);
}
