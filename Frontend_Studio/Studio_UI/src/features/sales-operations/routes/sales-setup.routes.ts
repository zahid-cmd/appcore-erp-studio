//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Sales Operations > Sales Setup (hand-written : NEVER run Menu /
// Submenu / Code Sync for it)
//
// Moved here 2026-11-15 : Bike Accessory Schemes (from Product
// Settings) and PDI Templates (from Service Settings). Their files
// stay where they were; only the address changed.
//===============================================================

export const salesSetupRoutes:
Routes =
[
    {
        path:'',

        redirectTo:'bike-accessory-schemes',

        pathMatch:'full'
    },

    {
        path:'bike-accessory-schemes',

        data:
        {
            breadcrumb:'Bike Accessory Schemes'
        },

        loadChildren:() =>
            import(
                '../../settings/product-settings/routes/bike-accessory-schemes.routes'
            )
            .then(
                m =>
                    m.BikeAccessorySchemesRoutes
            )
    },

    {
        path:'pdi-templates',

        data:
        {
            breadcrumb:'PDI Templates'
        },

        loadChildren:() =>
            import(
                '../../settings/service-settings/routes/pdi-templates.routes'
            )
            .then(
                m =>
                    m.PdiTemplatesRoutes
            )
    }
];
