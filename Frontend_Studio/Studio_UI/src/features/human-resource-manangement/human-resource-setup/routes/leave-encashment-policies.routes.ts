//===============================================================
// Leave Encashment Policies routes (hand-written page : NEVER run Code
// Sync for it). Wired by the MANUAL block in
// human-resource-setup.routes.ts.
//===============================================================

import
{
    Routes
}
from '@angular/router';

const page =
    () =>
        import('../pages/leave-encashment-policies/leave-encashment-policies')
            .then(m => m.LeaveEncashmentPoliciesPage);

export const LeaveEncashmentPoliciesRoutes:
Routes =
[
    {
        path:'',
        redirectTo:'list',
        pathMatch:'full'
    },
    {
        path:'list',
        data:{ breadcrumb:'Leave Encashment Policies' },
        loadComponent:page
    },
    {
        path:'add',
        data:{ breadcrumb:'Add Leave Encashment Policy' },
        loadComponent:page
    },
    {
        path:'edit/:id',
        data:{ breadcrumb:'Edit Leave Encashment Policy' },
        loadComponent:page
    },
    {
        path:'view/:id',
        data:{ breadcrumb:'View Leave Encashment Policy' },
        loadComponent:page
    }
];
