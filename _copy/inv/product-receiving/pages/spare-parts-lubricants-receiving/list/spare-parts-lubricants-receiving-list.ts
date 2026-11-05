//===============================================================
// Spare Parts & Lubricants Receiving : List page
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
    selector:'spare-parts-lubricants-receiving-list',

    standalone:true,

    imports:
    [
        ReceivingList
    ],

    templateUrl:'./spare-parts-lubricants-receiving-list.html',

    styleUrl:'./spare-parts-lubricants-receiving-list.css',

    changeDetection:ChangeDetectionStrategy.OnPush
})
export class SparePartsLubricantsReceivingList
{
}
