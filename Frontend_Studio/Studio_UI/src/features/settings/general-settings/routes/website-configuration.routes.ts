//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Website Configuration routes (custom page, no list)
//
// One record : the page opens straight into the form.
//===============================================================

export const WebsiteConfigurationRoutes:
Routes =
[
    {
        path:'',

        data:
        {
            breadcrumb:'Website Configuration'
        },

        loadComponent:() =>
            import(
                '../pages/website-configuration'
            )
            .then(
                m =>
                    m.WebsiteConfigurationPage
            )
    }
];
