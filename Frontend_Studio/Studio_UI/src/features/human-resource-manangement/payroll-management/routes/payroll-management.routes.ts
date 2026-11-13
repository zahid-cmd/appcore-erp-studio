//===============================================================
// Payroll Management routes (hand-written pages : NEVER run Code
// Sync for them). Wired by the MANUAL block in
// human-resource-manangement.routes.ts.
//
//   salary-advances   list / add / edit/:id / view/:id
//   salary-sheets     list / add (generate) / sheet/:id
//===============================================================

import
{
    Routes
}
from '@angular/router';

const advancesList =
    () =>
        import('../pages/salary-advances/list/salary-advances-list')
            .then(m => m.SalaryAdvancesList);

const advancesForm =
    () =>
        import('../pages/salary-advances/form/salary-advances-form')
            .then(m => m.SalaryAdvancesForm);

export const PayrollManagementRoutes:
Routes =
[
    {
        path:'',
        children:
        [
            {
                path:'salary-advances',
                data:{ breadcrumb:'Salary Advances' },
                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:{ breadcrumb:'Salary Advances' },
                        loadComponent:advancesList
                    },
                    {
                        path:'add',
                        data:{ breadcrumb:'Add Salary Advance' },
                        loadComponent:advancesForm
                    },
                    {
                        path:'edit/:id',
                        data:{ breadcrumb:'Edit Salary Advance' },
                        loadComponent:advancesForm
                    },
                    {
                        path:'view/:id',
                        data:{ breadcrumb:'View Salary Advance' },
                        loadComponent:advancesForm
                    }
                ]
            },
            {
                path:'salary-sheets',
                data:{ breadcrumb:'Salary Sheets' },
                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:{ breadcrumb:'Salary Sheets' },
                        loadComponent:() =>
                            import('../pages/salary-sheets/list/salary-sheets-list')
                                .then(m => m.SalarySheetsList)
                    },
                    {
                        path:'add',
                        data:{ breadcrumb:'Generate Salary Sheet' },
                        loadComponent:() =>
                            import('../pages/salary-sheets/generate/salary-sheet-generate')
                                .then(m => m.SalarySheetGenerate)
                    },
                    {
                        path:'sheet/:id',
                        data:{ breadcrumb:'Salary Sheet' },
                        loadComponent:() =>
                            import('../pages/salary-sheets/sheet/salary-sheet')
                                .then(m => m.SalarySheetPage)
                    }
                ]
            }
        ]
    }
];
