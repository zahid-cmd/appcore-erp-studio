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

export const pageCloningRoutes:
Routes =
[

//===========================================================
// Default
//===========================================================

{
    path:'',

    redirectTo:'list',

    pathMatch:'full'
},


//===========================================================
// List
//===========================================================

{
    path:'list',

    loadComponent:() =>
        import(
            '../pages/page-cloning/list/page-cloning-list'
        )
        .then(
            m =>
                m.PageCloningListComponent
        )
},


//===========================================================
// Source
//===========================================================

{
    path:'source',

    children:
    [

        //=======================================================
        // Source - New
        //=======================================================

        {
            path:'new',

            loadComponent:() =>
                import(
                    '../pages/page-cloning/source-page/source-page'
                )
                .then(
                    m =>
                        m.SourcePageComponent
                )
        },


        //=======================================================
        // Source - View
        //=======================================================

        {
            path:'view/:id',

            loadComponent:() =>
                import(
                    '../pages/page-cloning/source-page/source-page'
                )
                .then(
                    m =>
                        m.SourcePageComponent
                )
        },


        //=======================================================
        // Source - Edit
        //=======================================================

        {
            path:'edit/:id',

            loadComponent:() =>
                import(
                    '../pages/page-cloning/source-page/source-page'
                )
                .then(
                    m =>
                        m.SourcePageComponent
                )
        }

    ]
},


//===========================================================
// Target
//===========================================================

{
    path:'target',

    children:
    [

        //=======================================================
        // Target - New
        //=======================================================

        {
            path:'new',

            loadComponent:() =>
                import(
                    '../pages/page-cloning/target-page/target-page'
                )
                .then(
                    m =>
                        m.TargetPageComponent
                )
        },


        //=======================================================
        // Target - View
        //=======================================================

        {
            path:'view/:id',

            loadComponent:() =>
                import(
                    '../pages/page-cloning/target-page/target-page'
                )
                .then(
                    m =>
                        m.TargetPageComponent
                )
        },


        //=======================================================
        // Target - Edit
        //=======================================================

        {
            path:'edit/:id',

            loadComponent:() =>
                import(
                    '../pages/page-cloning/target-page/target-page'
                )
                .then(
                    m =>
                        m.TargetPageComponent
                )
        }

    ]
}

];