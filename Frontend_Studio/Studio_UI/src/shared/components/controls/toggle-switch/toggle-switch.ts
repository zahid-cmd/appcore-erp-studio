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
// Toggle Switch (2026-11-15) : an on / off switch with a label and
// the state in words (e.g. Status : Active / Inactive).
//
//   <app-toggle-switch
//       label="Status"
//       onText="Active"
//       offText="Inactive"
//       [(value)]="entity.IsActive"
//       (valueChange)="onValueChange()"
//       [disabled]="isViewMode">
//   </app-toggle-switch>
//===============================================================

@Component(
{
    selector:'app-toggle-switch',

    standalone:true,

    changeDetection:ChangeDetectionStrategy.OnPush,

    template:`
        <label
            class="ts"
            [class.ts-on]="value"
            [class.ts-disabled]="disabled">

            <span class="ts-text">
                @if (label)
                {
                    <span class="ts-label">{{ label }}</span>
                }
                <b class="ts-state">{{ value ? onText : offText }}</b>
            </span>

            <input
                type="checkbox"
                [checked]="value"
                [disabled]="disabled"
                (change)="toggle($any($event.target).checked)">

            <span class="ts-track">
                <span class="ts-knob"></span>
            </span>

        </label>
    `,

    styles:[`
        :host
        {
            display: block;
        }

        .ts
        {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-height: 44px;
            padding: 8px 12px 8px 14px;
            border: 1px solid #dbe6f7;
            border-radius: 12px;
            background: #ffffff;
            box-sizing: border-box;
            cursor: pointer;
            transition: border-color .15s ease, background-color .15s ease;
        }

        .ts:hover:not(.ts-disabled)
        {
            border-color: #9fc2f7;
        }

        .ts-disabled
        {
            cursor: default;
        }

        .ts input
        {
            position: absolute;
            opacity: 0;
            pointer-events: none;
        }

        .ts-text
        {
            display: flex;
            flex-direction: column;
            min-width: 0;
            line-height: 1.25;
        }

        .ts-label
        {
            color: #64748b;
            font-size: 12px;
            font-weight: 600;
        }

        .ts-state
        {
            color: #be123c;
            font-size: 14.5px;
            font-weight: 700;
        }

        .ts-on .ts-state
        {
            color: #047857;
        }

        .ts-track
        {
            position: relative;
            flex: 0 0 auto;
            width: 42px;
            height: 24px;
            border-radius: 999px;
            background: #cbd5e1;
            transition: background-color .2s ease;
        }

        .ts-on .ts-track
        {
            background: #22a06b;
        }

        .ts-disabled .ts-track
        {
            opacity: .6;
        }

        .ts-knob
        {
            position: absolute;
            top: 3px;
            left: 3px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(15, 23, 42, .25);
            transition: transform .2s ease;
        }

        .ts-on .ts-knob
        {
            transform: translateX(18px);
        }

        .ts input:focus-visible + .ts-track
        {
            box-shadow: 0 0 0 3px rgba(37, 99, 235, .25);
        }
    `]
})
export class ToggleSwitchComponent
{
    @Input()
    label =
        '';

    @Input()
    onText =
        'Yes';

    @Input()
    offText =
        'No';

    @Input()
    value =
        false;

    @Input()
    disabled =
        false;

    @Output()
    readonly valueChange =
        new EventEmitter<boolean>();

    toggle(checked: boolean):
        void
    {
        if (this.disabled)
        {
            return;
        }

        this.value = checked;

        this.valueChange.emit(checked);
    }
}
