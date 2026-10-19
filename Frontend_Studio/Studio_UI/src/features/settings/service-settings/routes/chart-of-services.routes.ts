import
{
    Routes
}
from '@angular/router';

//===============================================================
// Chart of Services Routes
//
// Single read-only page — no list / add / edit / view.
//===============================================================

export const ChartOfServicesRoutes:
Routes =
[
    {
        path:'',

        loadComponent:() =>
            import(
                '../pages/chart-of-services/chart-of-services-view/chart-of-services-view'
            )
            .then(
                m =>
                    m.ChartOfServicesView
            )
    }
];