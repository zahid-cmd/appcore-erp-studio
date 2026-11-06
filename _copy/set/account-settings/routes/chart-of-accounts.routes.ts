import
{
    Routes
}
from '@angular/router';

//===============================================================
// Chart of Accounts Routes
//
// Single read-only page — no list / add / edit / view.
//===============================================================

export const ChartOfAccountsRoutes:
Routes =
[
    {
        path:'',

        loadComponent:() =>
            import(
                '../pages/chart-of-accounts/chart-of-accounts-view/chart-of-accounts-view'
            )
            .then(
                m =>
                    m.ChartOfAccountsView
            )
    }
];