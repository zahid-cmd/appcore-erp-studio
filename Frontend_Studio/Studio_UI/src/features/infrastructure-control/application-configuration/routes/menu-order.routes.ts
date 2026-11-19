//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Menu Order (hand-written, 2026-11-20 : never run Submenu Sync)
//===============================================================

export const MenuOrderRoutes:
Routes =
[
    {
        path:'',

        data:
        {
            breadcrumb:'Menu Order'
        },

        loadComponent:() =>
            import(
                '../pages/menu-order/menu-order'
            )
            .then(
                m =>
                    m.MenuOrderPageComponent
            )
    }
];
