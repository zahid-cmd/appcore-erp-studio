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
// Barcode Management (hand-written : utility page, no Code Sync).
// ?type=MB|SP|AC opens on that product type (default SP).
//===============================================================

export const BarcodeManagementRoutes:
Routes =
[


    //===========================================================
    // Barcode Management
    //===========================================================

    {
        path:'',

        data:
        {
            breadcrumb:'Barcode Management'
        },

        loadComponent:() =>
            import(
                '../pages/barcode-management/barcode-management'
            )
            .then(
                m =>
                    m.BarcodeManagementPage
            )
    }

];
