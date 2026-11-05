//===============================================================
// Website : Branches (sales, service and accessory centres)
//===============================================================

import
{
    Component,
    computed,
    inject,
    input
}
from '@angular/core';

import
{
    WebsiteBranch
}
from '../../../../core/website/website.models';

import
{
    WebsiteDataService
}
from '../../../../core/website/website-data.service';

import
{
    mapLink,
    telLink
}
from '../../../../core/website/website-links';


@Component(
{
    selector:'app-branch-list',
    standalone:true,
    templateUrl:'./branch-list.html',
    styleUrls:
    [
        '../website-section.css',
        './branch-list.css'
    ]
})
export class BranchListComponent
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

    readonly branches =
        input.required<WebsiteBranch[]>();

    readonly cards =
        computed(
            () =>
                this.branches().map
                (
                    branch =>
                    ({
                        branch,
                        call:telLink(branch.phone),
                        map:mapLink(branch.mapUrl, branch.address)
                    })
                )
        );
}
