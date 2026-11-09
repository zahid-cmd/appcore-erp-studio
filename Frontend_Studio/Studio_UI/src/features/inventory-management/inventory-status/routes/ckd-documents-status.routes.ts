//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes : Inventory Status › CKD Documents Status
// (hand-written page : list + panel, no Code Sync)
//===============================================================

export const CkdDocumentsStatusRoutes:
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
            breadcrumb:'CKD Documents Status'
        },

        loadComponent:() =>
            import(
                '../pages/ckd-documents-status/list/ckd-documents-status-list'
            )
            .then(
                m =>
                    m.CkdDocumentsStatusList
            )
    }
];
