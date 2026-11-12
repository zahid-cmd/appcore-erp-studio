//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    inject
}
from '@angular/core';

import
{
    Router
}
from '@angular/router';


//===============================================================
// Membership Fees Collection Form (hand-written : NEVER run Code
// Sync for this page again). Fees are collected on the list (the
// Payment Desk modal); this route only sends the user there.
//===============================================================

@Component(
{
    selector:'membership-fees-collection-form',

    standalone:true,

    templateUrl:'./membership-fees-collection-form.html',

    styleUrl:'./membership-fees-collection-form.css'
})

export class MembershipFeesCollectionForm
    implements OnInit
{
    private readonly router =
        inject(Router);

    ngOnInit(): void
    {
        void this.router.navigate(
            ['/membership-management/membership-assignment/membership-fees-collection/list'],
            { replaceUrl:true });
    }
}
