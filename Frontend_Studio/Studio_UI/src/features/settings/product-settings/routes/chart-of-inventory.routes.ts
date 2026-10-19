import
{
    Routes
}
from '@angular/router';

//===============================================================
// Chart of Inventory Routes
//
// Single read-only page — no list / add / edit / view.
//===============================================================

export const ChartOfInventoryRoutes:
Routes =
[
    {
        path:'',

        loadComponent:() =>
            import(
                '../pages/chart-of-inventory/chart-of-inventory-view/chart-of-inventory-view'
            )
            .then(
                m =>
                    m.ChartOfInventoryView
            )
    }
];