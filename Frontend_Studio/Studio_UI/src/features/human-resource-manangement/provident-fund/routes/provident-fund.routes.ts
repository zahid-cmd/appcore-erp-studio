//===============================================================
// Provident Fund routes (hand-written pages : NEVER run Code Sync
// for them). Wired by the MANUAL block in
// human-resource-manangement.routes.ts.
//
//   provident-fund-policy   the rules of the fund (one record)
//   pf-members              list / add / edit / view
//   pf-loans                list / add / view
//   pf-settlements          list / add / view
//   pf-interest             the yearly interest
//   pf-payments             list / add / view : pays the settlements
//                           and the loans (the payment page of Human
//                           Resource, group 'pf')
// (PF Reports is a page of the HR Reports menu.)
//===============================================================

import
{
    Routes
}
from '@angular/router';

const list =
    () =>
        import('../pages/pf-list/pf-list')
            .then(m => m.PfList);

const hrPayments =
    () =>
        import('../../payroll-management/pages/hr-payments/hr-payments')
            .then(m => m.HrPaymentsPage);

const memberForm =
    () =>
        import('../pages/pf-member-form/pf-member-form')
            .then(m => m.PfMemberForm);

const loanForm =
    () =>
        import('../pages/pf-loan-form/pf-loan-form')
            .then(m => m.PfLoanForm);

const settlementForm =
    () =>
        import('../pages/pf-settlement-form/pf-settlement-form')
            .then(m => m.PfSettlementForm);

export const ProvidentFundRoutes:
Routes =
[
    {
        path:'',
        children:
        [
            {
                path:'provident-fund-policy',
                data:{ breadcrumb:'Provident Fund Policy' },
                loadComponent:() =>
                    import('../pages/pf-policy/pf-policy')
                        .then(m => m.PfPolicyPage)
            },
            {
                path:'pf-payments',
                data:{ breadcrumb:'PF Payments', hrPayGroup:'pf' },
                children:
                [
                    { path:'', redirectTo:'list', pathMatch:'full' },
                    { path:'list', data:{ breadcrumb:'PF Payments', hrPayGroup:'pf' }, loadComponent:hrPayments },
                    { path:'add', data:{ breadcrumb:'PF Payment', hrPayGroup:'pf' }, loadComponent:hrPayments },
                    { path:'view/:id', data:{ breadcrumb:'View PF Payment', hrPayGroup:'pf' }, loadComponent:hrPayments }
                ]
            },
            {
                path:'pf-members',
                data:{ breadcrumb:'PF Members' },
                children:
                [
                    { path:'', redirectTo:'list', pathMatch:'full' },
                    { path:'list', data:{ breadcrumb:'PF Members', pf:'members' }, loadComponent:list },
                    { path:'add', data:{ breadcrumb:'Add PF Member' }, loadComponent:memberForm },
                    { path:'edit/:id', data:{ breadcrumb:'Edit PF Member' }, loadComponent:memberForm },
                    { path:'view/:id', data:{ breadcrumb:'View PF Member' }, loadComponent:memberForm }
                ]
            },
            {
                path:'pf-loans',
                data:{ breadcrumb:'PF Loans' },
                children:
                [
                    { path:'', redirectTo:'list', pathMatch:'full' },
                    { path:'list', data:{ breadcrumb:'PF Loans', pf:'loans' }, loadComponent:list },
                    { path:'add', data:{ breadcrumb:'Add PF Loan' }, loadComponent:loanForm },
                    { path:'view/:id', data:{ breadcrumb:'View PF Loan' }, loadComponent:loanForm }
                ]
            },
            {
                path:'pf-settlements',
                data:{ breadcrumb:'PF Settlements' },
                children:
                [
                    { path:'', redirectTo:'list', pathMatch:'full' },
                    { path:'list', data:{ breadcrumb:'PF Settlements', pf:'settlements' }, loadComponent:list },
                    { path:'add', data:{ breadcrumb:'Add PF Settlement' }, loadComponent:settlementForm },
                    { path:'view/:id', data:{ breadcrumb:'View PF Settlement' }, loadComponent:settlementForm }
                ]
            },
            {
                path:'pf-interest',
                data:{ breadcrumb:'PF Interest' },
                loadComponent:() =>
                    import('../pages/pf-interest/pf-interest')
                        .then(m => m.PfInterestPage)
            }
            // (PF Reports is under the HR Reports menu :
            //  hr-reports/routes/hr-reports.routes.ts)
        ]
    }
];
