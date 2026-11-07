//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Customer File Configuration Routes
//
// Hand-written page, NO Code Synchronization : one page (list
// with two tabs; add / edit / view in the panel on the right),
// so there are no add / edit / view routes.
//===============================================================

export const CustomerFileConfigurationRoutes:
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
            breadcrumb:'Customer File Configuration'
        },

        loadComponent:() =>
            import(
                '../pages/customer-file-configuration/list/customer-file-configuration-list'
            )
            .then(
                m =>
                    m.CustomerFileConfigurationList
            )
    }
];
