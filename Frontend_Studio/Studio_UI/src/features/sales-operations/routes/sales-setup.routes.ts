//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';

import
{
    moved
}
from '../../../shared/utils/moved-route';


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

        redirectTo:'pdi-templates',

        pathMatch:'full'
    },

    // Bike Accessory Schemes : moved 2026-11-20 to Inventory
    // Management > Product Setup (the old address opens it)
    moved('bike-accessory-schemes', '/inventory-management/product-setup/bike-accessory-schemes'),

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
