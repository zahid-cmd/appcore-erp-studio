//===============================================================
// Overtime Structures routes (hand-written page : NEVER run Code
// Sync for it). Wired by the MANUAL block in
// human-resource-setup.routes.ts.
//===============================================================

import
{
    Routes
}
from '@angular/router';

const form =
    () =>
        import('../pages/overtime-structures/form/overtime-structures-form')
            .then(m => m.OvertimeStructuresForm);

export const OvertimeStructuresRoutes:
Routes =
[
    {
        path:'',
        redirectTo:'list',
        pathMatch:'full'
    },
    {
        path:'list',
        data:{ breadcrumb:'Overtime Structures' },
        loadComponent:() =>
            import('../pages/overtime-structures/list/overtime-structures-list')
                .then(m => m.OvertimeStructuresList)
    },
    {
        path:'add',
        data:{ breadcrumb:'Add Overtime Structure' },
        loadComponent:form
    },
    {
        path:'edit/:id',
        data:{ breadcrumb:'Edit Overtime Structure' },
        loadComponent:form
    },
    {
        path:'view/:id',
        data:{ breadcrumb:'View Overtime Structure' },
        loadComponent:form
    }
];
