//===============================================================
// Spare Parts & Lubricants Receiving : Form page
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
    selector:'spare-parts-lubricants-receiving-form',

    standalone:true,

    imports:
    [
        ReceivingForm
    ],

    templateUrl:'./spare-parts-lubricants-receiving-form.html',

    styleUrl:'./spare-parts-lubricants-receiving-form.css',

    changeDetection:ChangeDetectionStrategy.OnPush
})
export class SparePartsLubricantsReceivingForm
{
}
