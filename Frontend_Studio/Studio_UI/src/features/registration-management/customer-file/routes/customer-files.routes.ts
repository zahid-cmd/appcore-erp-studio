//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Customer Files Routes
//
// Hand-written page, NO Code Synchronization : one page (three tabs;
// add / edit / view in the panel on the right),
// so there are no add / edit / view routes.
//===============================================================

export const CustomerFilesRoutes:
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
            breadcrumb:'Customer Files'
        },

        loadComponent:() =>
            import(
                '../pages/customer-files/list/customer-files-list'
            )
            .then(
                m =>
                    m.CustomerFilesList
            )
    }
];
