//===============================================================
// Employee Management routes (hand-written pages : NEVER run
// Code Sync for them). Wired by the MANUAL block in
// human-resource-manangement.routes.ts.
//
//   employees            Employee Profiles : list / add / edit/:id / view/:id
//   employee-movements   list / add / view/:id
//===============================================================

import
{
    Routes
}
from '@angular/router';

const employeesList =
    () =>
        import('../pages/employees/list/employees-list')
            .then(m => m.EmployeesList);

const employeesForm =
    () =>
        import('../pages/employees/form/employees-form')
            .then(m => m.EmployeesForm);

export const EmployeeManagementRoutes:
Routes =
[
    {
        path:'',
        children:
        [
            {
                path:'employees',
                data:{ breadcrumb:'Employee Profiles' },
                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:{ breadcrumb:'Employee Profiles' },
                        loadComponent:employeesList
                    },
                    {
                        path:'add',
                        data:{ breadcrumb:'Add Employee Profile' },
                        loadComponent:employeesForm
                    },
                    {
                        path:'edit/:id',
                        data:{ breadcrumb:'Edit Employee Profile' },
                        loadComponent:employeesForm
                    },
                    {
                        path:'view/:id',
                        data:{ breadcrumb:'View Employee Profile' },
                        loadComponent:employeesForm
                    }
                ]
            },
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
