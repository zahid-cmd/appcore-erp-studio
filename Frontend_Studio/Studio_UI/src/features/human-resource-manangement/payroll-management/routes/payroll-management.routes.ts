//===============================================================
// Payroll Management routes (hand-written pages : NEVER run Code
// Sync for them). Wired by the MANUAL block in
// human-resource-manangement.routes.ts.
//
//   salary-advances   list / add / edit/:id / view/:id
//   salary-sheets     list / add (generate) / sheet/:id
//   overtime-sheets   list / view/:id  (no add : an overtime sheet
//                     is there when its salary sheet is posted)
//   festival-bonus    list / add (generate) / sheet/:id
//   leave-encashments list / add / view/:id
//   payroll-payments  list / add / view/:id  (the payment page of
//                     Human Resource, group 'payroll' : salary and
//                     overtime; Provident Fund uses it too)
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

const overtimeSheets =
    () =>
        import('../pages/overtime-sheets/overtime-sheets')
            .then(m => m.OvertimeSheetsPage);

const hrPayments =
    () =>
        import('../pages/hr-payments/hr-payments')
            .then(m => m.HrPaymentsPage);

const festivalBonus =
    () =>
        import('../pages/festival-bonus/festival-bonus')
            .then(m => m.FestivalBonusPage);

const leaveEncashments =
    () =>
        import('../pages/leave-encashments/leave-encashments')
            .then(m => m.LeaveEncashmentsPage);

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
                path:'festival-bonus',
                data:{ breadcrumb:'Festival Bonus' },
                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:{ breadcrumb:'Festival Bonus' },
                        loadComponent:festivalBonus
                    },
                    {
                        path:'add',
                        data:{ breadcrumb:'Generate Festival Bonus' },
                        loadComponent:festivalBonus
                    },
                    {
                        path:'sheet/:id',
                        data:{ breadcrumb:'Festival Bonus Sheet' },
                        loadComponent:festivalBonus
                    }
                ]
            },
            {
                path:'leave-encashments',
                data:{ breadcrumb:'Leave Encashments' },
                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:{ breadcrumb:'Leave Encashments' },
                        loadComponent:leaveEncashments
                    },
                    {
                        path:'add',
                        data:{ breadcrumb:'Leave Encashment' },
                        loadComponent:leaveEncashments
                    },
                    {
                        path:'view/:id',
                        data:{ breadcrumb:'View Leave Encashment' },
                        loadComponent:leaveEncashments
                    }
                ]
            },
            {
                path:'payroll-payments',
                data:{ breadcrumb:'Payroll Payments', hrPayGroup:'payroll' },
                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:{ breadcrumb:'Payroll Payments', hrPayGroup:'payroll' },
                        loadComponent:hrPayments
                    },
                    {
                        path:'add',
                        data:{ breadcrumb:'Payroll Payment', hrPayGroup:'payroll' },
                        loadComponent:hrPayments
                    },
                    {
                        path:'view/:id',
                        data:{ breadcrumb:'View Payroll Payment', hrPayGroup:'payroll' },
                        loadComponent:hrPayments
                    }
                ]
            },
            {
                path:'overtime-sheets',
                data:{ breadcrumb:'Overtime Sheets' },
                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:{ breadcrumb:'Overtime Sheets' },
                        loadComponent:overtimeSheets
                    },
                    {
                        path:'view/:id',
                        data:{ breadcrumb:'Overtime Sheet' },
                        loadComponent:overtimeSheets
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
