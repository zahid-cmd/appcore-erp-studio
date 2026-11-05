//===============================================================
// Motor Bike Receiving : List page
//
// The page itself lives in shared/list/receiving-list (one page for
// the three receivings); this file only picks the type.
//===============================================================

import
{
    ChangeDetectionStrategy,
    Component
}
from '@angular/core';

import
{
    ReceivingList
}
from '../../../shared/list/receiving-list';


@Component(
{
    selector:'motor-bike-receiving-list',

    standalone:true,

    imports:
    [
        ReceivingList
    ],

    templateUrl:'./motor-bike-receiving-list.html',

    styleUrl:'./motor-bike-receiving-list.css',

    changeDetection:ChangeDetectionStrategy.OnPush
})
export class MotorBikeReceivingList
{
}
