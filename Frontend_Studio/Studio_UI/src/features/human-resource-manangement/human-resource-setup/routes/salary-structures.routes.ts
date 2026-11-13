//===============================================================
// Salary Structures routes (hand-written page : NEVER run Code
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
        import('../pages/salary-structures/form/salary-structures-form')
            .then(m => m.SalaryStructuresForm);

export const SalaryStructuresRoutes:
Routes =
[
    {
        path:'',
        redirectTo:'list',
        pathMatch:'full'
    },
    {
        path:'list',
        data:{ breadcrumb:'Salary Structures' },
        loadComponent:() =>
            import('../pages/salary-structures/list/salary-structures-list')
                .then(m => m.SalaryStructuresList)
    },
    {
        path:'add',
        data:{ breadcrumb:'Add Salary Structure' },
        loadComponent:form
    },
    {
        path:'edit/:id',
        data:{ breadcrumb:'Edit Salary Structure' },
        loadComponent:form
    },
    {
        path:'view/:id',
        data:{ breadcrumb:'View Salary Structure' },
        loadComponent:form
    }
];
