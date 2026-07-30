//===============================================================
// Imports
//===============================================================

import
{
    Component,
    Input,
    ChangeDetectionStrategy
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    RecordCounterSection
}
from './record-counter.model';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-record-counter',

    standalone:true,

    imports:
    [
        CommonModule
    ],

    templateUrl:'./record-counter.html',

    styleUrl:'./record-counter.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})

//===============================================================
// Record Counter Component
//===============================================================

export class RecordCounterComponent
{
    //===========================================================
    // Sections
    //===========================================================

    @Input()

    sections:
        RecordCounterSection[] =
        [];

    //===========================================================
    // Appearance
    //===========================================================

    @Input()

    minHeight =
        82;

    @Input()

    maxWidth:
        number | null =
        null;

    @Input()

    borderRadius =
        14;

    @Input()

    showBorder =
        true;

    @Input()

    showShadow =
        true;

    @Input()

    compact =
        false;

    //===========================================================
    // Visible Sections
    //===========================================================

    get visibleSections():
        RecordCounterSection[]
    {
        return this.sections.filter(

            section =>

                section.visible !== false
        );
    }
}