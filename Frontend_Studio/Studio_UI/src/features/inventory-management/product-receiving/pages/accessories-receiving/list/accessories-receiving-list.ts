//===============================================================
// Accessories Receiving : List page
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
    selector:'accessories-receiving-list',

    standalone:true,

    imports:
    [
        ReceivingList
    ],

    templateUrl:'./accessories-receiving-list.html',

    styleUrl:'./accessories-receiving-list.css',

    changeDetection:ChangeDetectionStrategy.OnPush
})
export class AccessoriesReceivingList
{
}
