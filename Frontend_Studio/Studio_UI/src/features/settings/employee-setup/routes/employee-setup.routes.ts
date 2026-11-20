//===============================================================
// Settings > Employee Setup (2026-11-20, hand-written : NEVER run
// Menu / Submenu / Code Sync for it).
//
//   department    Department          list / add / edit/:id / view/:id
//   designation   Designation         list / add / edit/:id / view/:id
//   employees     Employee Profiles   list / add / edit/:id / view/:id
//
// Employees, departments and designations are used by the whole
// ERP (sales persons, technicians, cashiers), so the three pages
// sit under Settings and stay when Human Resource Management is
// switched off for a company (claude\blueprint-module-isolation.md,
// decision D1). EmployeeSetup_Navigation.sql moved the pages here.
//
// The page files stay in features\human-resource-manangement and
// the API addresses are unchanged. The old addresses open these
// (human-resource-setup.routes.ts, employee-management.routes.ts).
//===============================================================

import
{
    Routes
}
from '@angular/router';

const employeesList =
    () =>
        import('../../../human-resource-manangement/employee-management/pages/employees/list/employees-list')
            .then(m => m.EmployeesList);

const employeesForm =
    () =>
        import('../../../human-resource-manangement/employee-management/pages/employees/form/employees-form')
            .then(m => m.EmployeesForm);

export const EmployeeSetupRoutes:
Routes =
[
    {
        path:'',
        children:
        [
            {
                path:'department',
                data:{ breadcrumb:'Department' },
                loadChildren:() =>
                    import('../../../human-resource-manangement/human-resource-setup/routes/department.routes')
                        .then(m => m.DepartmentRoutes)
            },
            {
                path:'designation',
                data:{ breadcrumb:'Designation' },
                loadChildren:() =>
                    import('../../../human-resource-manangement/human-resource-setup/routes/designation.routes')
                        .then(m => m.DesignationRoutes)
            },
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
            }
        ]
    }
];
