//===============================================================
// Employee Management routes (hand-written pages : NEVER run
// Code Sync for them). Wired by the MANUAL block in
// human-resource-manangement.routes.ts.
//
//   employees            moved to Settings > Employee Setup (2026-11-20)
//   employee-movements   list / add / view/:id
//===============================================================

import
{
    Routes
}
from '@angular/router';

import
{
    moved
}
from '../../../../shared/utils/moved-route';

export const EmployeeManagementRoutes:
Routes =
[
    {
        path:'',
        children:
        [
            // Employee Profiles moved to Settings > Employee Setup
            // (2026-11-20, EmployeeSetup_Navigation.sql) : the old
            // address opens the new one. The page files stay here.
            moved('employees', '/settings/employee-setup/employees'),
            {
                path:'employee-movements',
                data:{ breadcrumb:'Employee Movements' },
                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:{ breadcrumb:'Employee Movements' },
                        loadComponent:() =>
                            import('../pages/employee-movements/list/employee-movements-list')
                                .then(m => m.EmployeeMovementsList)
                    },
                    {
                        path:'add',
                        data:{ breadcrumb:'Add Employee Movement' },
                        loadComponent:() =>
                            import('../pages/employee-movements/form/employee-movements-form')
                                .then(m => m.EmployeeMovementsForm)
                    },
                    {
                        path:'view/:id',
                        data:{ breadcrumb:'View Employee Movement' },
                        loadComponent:() =>
                            import('../pages/employee-movements/form/employee-movements-form')
                                .then(m => m.EmployeeMovementsForm)
                    }
                ]
            }
        ]
    }
];
