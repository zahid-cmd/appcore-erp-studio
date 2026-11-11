//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Registration Profiles Routes
//
// Hand-written page, NO Code Synchronization : one list page with
// a view panel on the right, so there are no add / edit / view
// routes.
//===============================================================

export const RegistrationProfilesRoutes:
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
            breadcrumb:'Registration Profiles'
        },

        loadComponent:() =>
            import(
                '../pages/registration-profiles/list/registration-profiles-list'
            )
            .then(
                m =>
                    m.RegistrationProfilesList
            )
    }
];
