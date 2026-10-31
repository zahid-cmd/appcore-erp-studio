//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes : Inventory Status › Spare Parts & Lubricants Stock
// (read-only page : list only)
//===============================================================

export const SparePartsLubricantsStockRoutes:
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
            breadcrumb:'Spare Parts & Lubricants Stock'
        },

        loadComponent:() =>
            import(
                '../pages/spare-parts-lubricants-stock/list/spare-parts-lubricants-stock-list'
            )
            .then(
                m =>
                    m.SparePartsLubricantsStockList
            )
    }
];
