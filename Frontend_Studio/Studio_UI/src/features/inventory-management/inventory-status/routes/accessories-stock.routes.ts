//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes : Inventory Status › Accessories Stock
// (read-only page : list only)
//===============================================================

export const AccessoriesStockRoutes:
Routes =
[
    {
        path:'',

        redirectTo:'list',

        pathMatch:'full'
    },

    {
        path:'list',

        data:
        {
            breadcrumb:'Accessories Stock'
        },

        loadComponent:() =>
            import(
                '../pages/accessories-stock/list/accessories-stock-list'
            )
            .then(
                m =>
                    m.AccessoriesStockList
            )
    }
];
