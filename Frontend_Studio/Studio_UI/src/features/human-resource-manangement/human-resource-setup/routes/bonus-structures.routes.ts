//===============================================================
// Bonus Structures routes (hand-written page : NEVER run Code
// Sync for it). Wired by the MANUAL block in
// human-resource-setup.routes.ts.
//===============================================================

import
{
    Routes
}
from '@angular/router';

const page =
    () =>
        import('../pages/bonus-structures/bonus-structures')
            .then(m => m.BonusStructuresPage);

export const BonusStructuresRoutes:
Routes =
[
    {
        path:'',
        redirectTo:'list',
        pathMatch:'full'
    },
    {
        path:'list',
        data:{ breadcrumb:'Bonus Structures' },
        loadComponent:page
    },
    {
        path:'add',
        data:{ breadcrumb:'Add Bonus Structure' },
        loadComponent:page
    },
    {
        path:'edit/:id',
        data:{ breadcrumb:'Edit Bonus Structure' },
        loadComponent:page
    },
    {
        path:'view/:id',
        data:{ breadcrumb:'View Bonus Structure' },
        loadComponent:page
    }
];
