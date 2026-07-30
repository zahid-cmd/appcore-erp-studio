//===============================================================
// Imports
//===============================================================

import
{
    Component,
    EventEmitter,
    Input,
    Output
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    CheckboxComponent
}
from '../../utilities/checkbox/checkbox';

//===============================================================
// Models
//===============================================================

export interface ActivityItem
{
    id:number;

    text:string;

    checked:boolean;
}

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-activity-selector',

    standalone:true,

    imports:
    [
        CommonModule,
        CheckboxComponent
    ],

    templateUrl:
        './activity-selector.html',

    styleUrl:
        './activity-selector.css'
})

export class ActivitySelector
{
    //===========================================================
    // Fields
    //===========================================================

    private _activities:
        ActivityItem[] = [];

    //===========================================================
    // Inputs
    //===========================================================

    @Input()
    set activities
    (
        value:ActivityItem[]
    )
    {
        this._activities =
            value ?? [];

        this.updateAllState();
    }

    get activities():
        ActivityItem[]
    {
        return this._activities;
    }

    @Input()
    readOnly =
        false;

    //===========================================================
    // Outputs
    //===========================================================

    @Output()
    activitiesChange =
        new EventEmitter<ActivityItem[]>();

    @Output()
    changed =
        new EventEmitter<void>();

    //===========================================================
    // Properties
    //===========================================================

    allChecked =
        false;

    //===========================================================
    // Has Activities
    //===========================================================

    get hasActivities():
        boolean
    {
        return this.activities.length > 0;
    }

    //===========================================================
    // All Changed
    //===========================================================

    onAllChanged():
        void
    {
        if (this.readOnly)
        {
            return;
        }

        this.activities.forEach(
            activity =>
            {
                activity.checked =
                    this.allChecked;
            });

        this.activitiesChange.emit(
            this.activities
        );

        this.changed.emit();
    }

    //===========================================================
    // Checkbox Changed
    //===========================================================

    onCheckedChanged():
        void
    {
        if (this.readOnly)
        {
            return;
        }

        this.updateAllState();

        this.activitiesChange.emit(
            this.activities
        );

        this.changed.emit();
    }

    //===========================================================
    // Update All State
    //===========================================================

    private updateAllState():
        void
    {
        this.allChecked =
            this.activities.length > 0 &&
            this.activities.every(
                activity => activity.checked
            );
    }
}