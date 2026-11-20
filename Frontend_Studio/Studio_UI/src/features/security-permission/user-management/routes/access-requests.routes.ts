//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Access Requests (hand-written, 2026-11-20 : never run Submenu
// Sync for it)
//===============================================================

export const AccessRequestsRoutes:
Routes =
[
    {
        path:'',

        data:
        {
            breadcrumb:'Access Requests'
        },

        loadComponent:() =>
            import(
                '../pages/access-requests/access-requests'
            )
            .then(
                m =>
                    m.AccessRequestsPageComponent
            )
    }
];
