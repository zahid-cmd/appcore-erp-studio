//===============================================================
// Website : FAQ (one answer open at a time)
// Heading on top; the questions in two columns side by side
// (first half left, second half right; each column grows on its
// own when an answer opens).
//===============================================================

import
{
    Component,
    computed,
    inject,
    input,
    signal
}
from '@angular/core';

import
{
    WebsiteContent
}
from '../../../../core/website/website.models';

import
{
    WebsiteDataService
}
from '../../../../core/website/website-data.service';

import
{
    whatsAppLink
}
from '../../../../core/website/website-links';


@Component(
{
    selector:'app-faq-accordion',
    standalone:true,
    templateUrl:'./faq-accordion.html',
    styleUrls:
    [
        '../website-section.css',
        './faq-accordion.css'
    ]
})
export class FaqAccordionComponent
{
    // Section wording (Website Configuration › Section Headings)
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

    readonly content =
        input.required<WebsiteContent>();

    readonly open =
        signal(0);

    // Two columns : { item, i } keeps the overall number for open()
    readonly columns =
        computed(
            () =>
            {
                const all =
                    this.content().faq.map((item, i) => ({ item, i }));

                const half =
                    Math.ceil(all.length / 2);

                return [all.slice(0, half), all.slice(half)].filter(c => c.length);
            }
        );

    readonly ask =
        computed(
            () =>
                whatsAppLink(this.content().company.whatsApp, 'I have a question')
        );

    toggle
    (
        i:
            number
    ):
        void
    {
        this.open.set(this.open() === i ? -1 : i);
    }
}
