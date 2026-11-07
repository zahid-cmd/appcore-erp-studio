//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Warranty Configuration Routes
//
// Hand-written page, NO Code Synchronization : one page (list
// with three tabs; add / edit / view in the panel on the right),
// so there are no add / edit / view routes.
//===============================================================

export const WarrantyConfigurationRoutes:
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
            breadcrumb:'Warranty Configuration'
        },

        loadComponent:() =>
            import(
                '../pages/warranty-configuration/list/warranty-configuration-list'
            )
            .then(
                m =>
                    m.WarrantyConfigurationList
            )
    }
];
