//===============================================================
// Motor Bike Receiving : Form page
//
// The page itself lives in shared/form/receiving-form (one page for
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
    ReceivingForm
}
from '../../../shared/form/receiving-form';


@Component(
{
    selector:'motor-bike-receiving-form',

    standalone:true,

    imports:
    [
        ReceivingForm
    ],

    templateUrl:'./motor-bike-receiving-form.html',

    styleUrl:'./motor-bike-receiving-form.css',

    changeDetection:ChangeDetectionStrategy.OnPush
})
export class MotorBikeReceivingForm
{
}
