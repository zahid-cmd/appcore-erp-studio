//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output
}
from '@angular/core';


//===============================================================
// Step Nav (2026-11-15) : "Step 2 of 3" with Back / Next, for a
// form split over several screens instead of scrolling. Sits in
// the page toolbar's right slot; the toolbar tabs name the steps.
//
//   <app-step-nav
//       pageToolbarRight
//       [steps]="tabs"
//       [current]="selectedTab"
//       (currentChange)="onTabChange($event)">
//   </app-step-nav>
//
// steps : the tabs ({ id, label }) in order; current : the id.
//===============================================================

export interface StepNavStep
{
    id: string;
    label: string;
}

@Component(
{
    selector:'app-step-nav',

    standalone:true,

    changeDetection:ChangeDetectionStrategy.OnPush,

    template:`
        <div class="sn">

            <span class="sn-text">Step {{ index + 1 }} of {{ steps.length }}</span>

            <button
                type="button"
                class="sn-btn"
                [disabled]="index <= 0"
                (click)="go(index - 1)">
                <i class="fas fa-chevron-left"></i>
                Back
            </button>

            <button
                type="button"
                class="sn-btn sn-next"
                [disabled]="index >= steps.length - 1"
                (click)="go(index + 1)">
                Next
                <i class="fas fa-chevron-right"></i>
            </button>

        </div>
    `,

    styles:[`
        :host
        {
            display: block;
        }

        .sn
        {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .sn-text
        {
            margin-right: 6px;
            color: #64748b;
            font-size: 13.5px;
            font-weight: 600;
            white-space: nowrap;
        }

        .sn-btn
        {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-width: 96px;
            height: 36px;
            padding: 0 14px;
            border: 1px solid #c7d7f5;
            border-radius: 12px;
            background: #ffffff;
            color: #1e3a8a;
            font: inherit;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background .15s ease, border-color .15s ease;
        }

        .sn-btn:hover:not(:disabled)
        {
            border-color: #9fc2f7;
            background: #eef4ff;
        }

        .sn-btn:disabled
        {
            cursor: default;
            opacity: .45;
        }

        .sn-btn.sn-next
        {
            border-color: #c9dbfb;
            background: #e8f0fe;
            color: #1e3a8a;
        }

        .sn-btn.sn-next:hover:not(:disabled)
        {
            border-color: #9fbdf5;
            background: #dbe7ff;
        }
    `]
})
export class StepNavComponent
{
    @Input()
    steps:
        StepNavStep[] = [];

    @Input()
    current =
        '';

    @Output()
    readonly currentChange =
        new EventEmitter<string>();

    get index(): number
    {
        return Math.max(0, this.steps.findIndex(x => x.id === this.current));
    }

    go(index: number):
        void
    {
        const step = this.steps[index];

        if (step)
        {
            this.currentChange.emit(step.id);
        }
    }
}
