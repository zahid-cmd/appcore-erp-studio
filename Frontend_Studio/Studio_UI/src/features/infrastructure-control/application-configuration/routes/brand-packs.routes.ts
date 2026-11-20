//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Brand Packs (hand-written, 2026-11-20 : never run Submenu Sync;
// no menu entry : AppCore opens it by its address)
//===============================================================

export const BrandPacksRoutes:
Routes =
[
    {
        path:'',

        data:
        {
            breadcrumb:'Brand Packs'
        },

        loadComponent:() =>
            import(
                '../pages/brand-packs/brand-packs'
            )
            .then(
                m =>
                    m.BrandPacksPageComponent
            )
    }
];
