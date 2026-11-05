//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes
//
// Price List (hand-written : read-only page, no Code Sync).
// ?type=MB|SP|AC opens on that product type (default SP).
//===============================================================

export const PriceListRoutes:
Routes =
[


    //===========================================================
    // Price List
    //===========================================================

    {
        path:'',

        data:
        {
            breadcrumb:'Price List'
        },

        loadComponent:() =>
            import(
                '../pages/price-list/price-list'
            )
            .then(
                m =>
                    m.PriceListPage
            )
    }

];
