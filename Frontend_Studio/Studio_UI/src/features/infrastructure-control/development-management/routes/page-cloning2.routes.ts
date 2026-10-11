//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Routes
//===============================================================

export const pageCloning2Routes:
Routes =
[

{
    path:'',
    redirectTo:'list',
    pathMatch:'full'
},

{
    path:'list',
    loadComponent:() =>
        import(
            '../pages/page-cloning2/list/page-cloning-list2'
        )
        .then(m => m.PageCloningListComponent)
},

{
    path:'source',
    children:
    [
        {
            path:'new',
            loadComponent:() =>
                import('../pages/page-cloning2/source-page/source-page2')
                .then(m => m.SourcePageComponent)
        },
        {
            path:'view/:id',
            loadComponent:() =>
                import('../pages/page-cloning2/source-page/source-page2')
                .then(m => m.SourcePageComponent)
        },
        {
            path:'edit/:id',
            loadComponent:() =>
                import('../pages/page-cloning2/source-page/source-page2')
                .then(m => m.SourcePageComponent)
        }
    ]
},

{
    path:'target',
    children:
    [
        {
            path:'new',
            loadComponent:() =>
                import('../pages/page-cloning2/target-page/target-page2')
                .then(m => m.TargetPageComponent)
        },
        {
            path:'view/:id',
            loadComponent:() =>
                import('../pages/page-cloning2/target-page/target-page2')
                .then(m => m.TargetPageComponent)
        },
        {
            path:'edit/:id',
            loadComponent:() =>
                import('../pages/page-cloning2/target-page/target-page2')
                .then(m => m.TargetPageComponent)
        }
    ]
}

];