//===============================================================
// Website : Marquee strip (moving selling points)
//===============================================================

import
{
    Component,
    computed,
    input
}
from '@angular/core';


@Component(
{
    selector:'app-marquee-strip',
    standalone:true,
    templateUrl:'./marquee-strip.html',
    styleUrls:
    [
        '../website-section.css',
        './marquee-strip.css'
    ]
})
export class MarqueeStripComponent
{
    readonly tags =
        input.required<string[]>();

    // 1 slowest … 10 fastest; 5 = the original pace
    readonly speed =
        input<number>(5);

    // Same pace however many points : time grows with the text.
    // Each step of speed is about 19 % faster than the one before.
    readonly duration =
        computed(
            () =>
            {
                const level =
                    Math.min(10, Math.max(1, Math.round(this.speed() || 5)));

                const length =
                    this.tags().reduce((sum, tag) => sum + tag.length + 6, 0);

                const secondsPerLetter =
                    0.22 * Math.pow(2, (5 - level) / 4);

                return Math.max(6, Math.round(length * secondsPerLetter));
            }
        );

    // Two copies side by side make the loop seamless
    readonly loop =
        computed(
            () =>
                [...this.tags(), ...this.tags()]
        );
}
