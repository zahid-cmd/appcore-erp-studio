//===============================================================
// PDI Templates routes (hand-written page : NEVER run Code Sync
// for it). Wired by the Code Sync AUTO block in
// service-settings.routes.ts.
//===============================================================

import
{
    Routes
}
from '@angular/router';

export const PdiTemplatesRoutes:
Routes =
[
    {
        path:'',
        redirectTo:'list',
        pathMatch:'full'
    },
    {
        path:'list',
        data:{ breadcrumb:'PDI Templates' },
        loadComponent:() =>
            import('../pages/pdi-templates/list/pdi-templates-list')
                .then(m => m.PdiTemplatesList)
    },
    {
        path:'add',
        data:{ breadcrumb:'Add PDI Template' },
        loadComponent:() =>
            import('../pages/pdi-templates/form/pdi-templates-form')
                .then(m => m.PdiTemplatesForm)
    },
    {
        path:'edit/:id',
        data:{ breadcrumb:'Edit PDI Template' },
        loadComponent:() =>
            import('../pages/pdi-templates/form/pdi-templates-form')
                .then(m => m.PdiTemplatesForm)
    },
    {
        path:'view/:id',
        data:{ breadcrumb:'View PDI Template' },
        loadComponent:() =>
            import('../pages/pdi-templates/form/pdi-templates-form')
                .then(m => m.PdiTemplatesForm)
    }
];
