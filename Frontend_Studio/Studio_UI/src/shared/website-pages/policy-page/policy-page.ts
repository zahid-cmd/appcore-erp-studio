//===============================================================
// Website : Policy page  ( /warranty  /terms  /privacy )
// --------------------------------------------------------------
// The route's data.policy picks the text from the content file.
//===============================================================

import
{
    Component,
    computed,
    effect,
    inject
}
from '@angular/core';

import
{
    ActivatedRoute,
    RouterLink
}
from '@angular/router';

import
{
    toSignal
}
from '@angular/core/rxjs-interop';

import
{
    map
}
from 'rxjs';

import
{
    WebsiteDataService
}
from '../../../core/website/website-data.service';

import
{
    WebsitePolicyKey
}
from '../../../core/website/website.models';


const TITLES:
    Record<WebsitePolicyKey, string> =
    {
        warranty:'Warranty',
        terms:'Terms & conditions',
        privacy:'Privacy policy'
    };


@Component(
{
    selector:'app-policy-page',
    standalone:true,
    imports:
    [
        RouterLink
    ],
    templateUrl:'./policy-page.html',
    styleUrls:
    [
        '../../components/website-components/website-section.css',
        './policy-page.css'
    ]
})
export class PolicyPage
{
    readonly content =
        inject(WebsiteDataService).content;

    readonly key =
        toSignal(
            inject(ActivatedRoute).data.pipe(
                map(d => (d['policy'] ?? 'terms') as WebsitePolicyKey)
            ),
            {
                initialValue:'terms' as WebsitePolicyKey
            }
        );

    readonly policy =
        computed(
            () =>
                this.content()?.policies[this.key()] ?? null
        );

    readonly title =
        computed(
            () =>
                this.policy()?.title || TITLES[this.key()]
        );

    constructor()
    {
        effect(
            () =>
            {
                const c =
                    this.content();

                if
                (
                    c
                )
                {
                    document.title = `${this.title()} · ${c.company.name}`;
                }
            }
        );
    }
}
