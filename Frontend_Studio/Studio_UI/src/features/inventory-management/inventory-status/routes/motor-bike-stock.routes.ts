//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes : Inventory Status › Motor Bike Stock
// (read-only page : list only)
//===============================================================

export const MotorBikeStockRoutes:
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
            breadcrumb:'Motor Bike Stock'
        },

        loadComponent:() =>
            import(
                '../pages/motor-bike-stock/list/motor-bike-stock-list'
            )
            .then(
                m =>
                    m.MotorBikeStockList
            )
    }
];
