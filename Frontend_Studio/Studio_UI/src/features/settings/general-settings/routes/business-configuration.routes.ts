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
// One page : branch overview, extra business grants (added /
// edited in a modal) and wing core business.
//===============================================================

export const BusinessConfigurationRoutes:
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
            breadcrumb:'Business Configuration'
        },

        loadComponent:() =>
            import(
                '../pages/business-configuration/list/business-configuration-list'
            )
            .then(
                m =>
                    m.BusinessConfigurationList
            )
    }
];