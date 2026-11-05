//===============================================================
// Website : Why buy from us (numbered points, photo, stats)
//===============================================================

import
{
    Component,
    inject,
    input
}
from '@angular/core';

import
{
    WebsiteWhy
}
from '../../../../core/website/website.models';

import
{
    WebsiteDataService
}
from '../../../../core/website/website-data.service';


@Component(
{
    selector:'app-why-us',
    standalone:true,
    templateUrl:'./why-us.html',
    styleUrls:
    [
        '../website-section.css',
        './why-us.css'
    ]
})
export class WhyUsComponent
{
    // Section wording (Website Configuration › Texts & Offer)
    private readonly wording =
        inject(WebsiteDataService);

    t
    (
        key:
            string
    ):
        string
    {
        return this.wording.text(key);
    }

    readonly why =
        input.required<WebsiteWhy>();

    number
    (
        i:
            number
    ):
        string
    {
        return String(i + 1).padStart(2, '0');
    }
}
