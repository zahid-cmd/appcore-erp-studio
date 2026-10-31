//===============================================================
// Accessories Receiving : Form page
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
    selector:'accessories-receiving-form',

    standalone:true,

    imports:
    [
        ReceivingForm
    ],

    templateUrl:'./accessories-receiving-form.html',

    styleUrl:'./accessories-receiving-form.css',

    changeDetection:ChangeDetectionStrategy.OnPush
})
export class AccessoriesReceivingForm
{
}
