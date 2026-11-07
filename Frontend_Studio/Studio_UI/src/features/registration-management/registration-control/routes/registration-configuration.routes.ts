//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Registration Configuration Routes
//
// Hand-written page, NO Code Synchronization : one page (list
// with four tabs; add / edit / view in the panel on the right),
// so there are no add / edit / view routes.
//===============================================================

export const RegistrationConfigurationRoutes:
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
            breadcrumb:'Registration Configuration'
        },

        loadComponent:() =>
            import(
                '../pages/registration-configuration/list/registration-configuration-list'
            )
            .then(
                m =>
                    m.RegistrationConfigurationList
            )
    }
];
