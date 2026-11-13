//===============================================================
// HR Reports routes (hand-written page : NEVER run Code Sync for
// it). Wired by the MANUAL block in
// human-resource-manangement.routes.ts.
//
//   staff-payroll-reports   Staff List, Leave Balance, Salary
//                           Register (read only)
//   pf-reports              Provident fund : fund summary, member
//                           statement, contribution register
//===============================================================

import
{
    Routes
}
from '@angular/router';

export const HrReportsRoutes:
Routes =
[
    {
        path:'',
        children:
        [
            {
                path:'staff-payroll-reports',
                data:{ breadcrumb:'Staff & Payroll Reports' },
                loadComponent:() =>
                    import('../pages/staff-payroll-reports/staff-payroll-reports')
                        .then(m => m.StaffPayrollReports)
            },
            // Provident fund reports (the page lives in the
            // provident-fund feature; the menu is HR Reports)
            {
                path:'pf-reports',
                data:{ breadcrumb:'PF Reports' },
                loadComponent:() =>
                    import('../../provident-fund/pages/pf-reports/pf-reports')
                        .then(m => m.PfReportsPage)
            }
        ]
    }
];
