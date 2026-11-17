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
// Step Tabs (2026-11-15) : the steps of a form split over several
// screens, as a light stepper (number badges, a short joining
// line, a tick on the steps behind) instead of the filled tab pills.
// No sliding motion, only a soft colour change. Pair it with
// app-step-nav (Back / Next) in the toolbar.
//
//   <app-step-tabs
//       pageToolbarLeft
//       [steps]="tabs"
//       [current]="selectedTab"
//       (currentChange)="onTabChange($event)">
//   </app-step-tabs>
//===============================================================

export interface StepTabsStep
{
    id: string;
    label: string;
}

@Component(
{
    selector:'app-step-tabs',

    standalone:true,

    changeDetection:ChangeDetectionStrategy.OnPush,

    template:`
        <nav class="st">
            @for (step of steps; track step.id; let i = $index)
            {
                @if (i > 0)
                {
                    <span
                        class="st-join"
                        [class.st-join-done]="i <= index">
                    </span>
                }

                <button
                    type="button"
                    class="st-step"
                    [class.st-on]="i === index"
                    [class.st-done]="i < index"
                    (click)="currentChange.emit(step.id)">

                    <span class="st-badge">
                        @if (i < index)
                        {
                            <i class="fas fa-check"></i>
                        }
                        @else
                        {
                            {{ i + 1 }}
                        }
                    </span>

                    <span class="st-label">{{ step.label }}</span>

                </button>
            }
        </nav>
    `,

    styles:[`
        :host
        {
            display: block;
        }

        .st
        {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px;
            border: 1px solid #e3ebf8;
            border-radius: 14px;
            background: #f7f9fe;
        }

        .st-step
        {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            height: 38px;
            padding: 0 16px 0 6px;
            border: 1px solid transparent;
            border-radius: 11px;
            background: transparent;
            color: #64748b;
            font: inherit;
            font-size: 14px;
            font-weight: 600;
            white-space: nowrap;
            cursor: pointer;
            transition: background-color .15s ease, color .15s ease, border-color .15s ease;
        }

        .st-step:hover
        {
            background: #eef4ff;
            color: #1e3a8a;
        }

        .st-badge
        {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            height: 26px;
            border: 1.5px solid #cbd8ee;
            border-radius: 50%;
            background: #ffffff;
            color: #64748b;
            font-size: 12.5px;
            font-weight: 700;
            box-sizing: border-box;
            transition: background-color .15s ease, color .15s ease, border-color .15s ease;
        }

        .st-badge > i
        {
            font-size: 11px;
        }

        /* the open step : light blue, navy text */
        .st-step.st-on
        {
            border-color: #c9dbfb;
            background: #e8f0fe;
            color: #1e3a8a;
        }

        .st-step.st-on .st-badge
        {
            border-color: #1f6bff;
            background: #1f6bff;
            color: #ffffff;
        }

        /* the steps behind : a soft green tick */
        .st-step.st-done
        {
            color: #334155;
        }

        .st-step.st-done .st-badge
        {
            border-color: #a7d7b9;
            background: #ecf8f1;
            color: #15803d;
        }

        .st-join
        {
            flex: 0 0 18px;
            height: 2px;
            border-radius: 2px;
            background: #d6e2f5;
            transition: background-color .15s ease;
        }

        .st-join.st-join-done
        {
            background: #9fbdf5;
        }
    `]
})
export class StepTabsComponent
{
    @Input()
    steps:
        StepTabsStep[] = [];

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
}
