import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component(
{
    selector: 'app-steps-counter',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './steps-counter.html',
    styleUrls: ['./steps-counter.css']
})
export class StepsCounterComponent
{
    // The step the user is on (1-based)
    @Input() current = 1;

    // How many steps there are
    @Input() total = 1;

    // Text before the numbers, e.g. "Step" gives "Step 2 of 4"
    @Input() label = 'Step';

    // Show the small progress dots next to the text
    @Input() showDots = true;

    get dots(): number[]
    {
        return Array.from({ length: Math.max(this.total, 0) }, (_, i) => i + 1);
    }
}