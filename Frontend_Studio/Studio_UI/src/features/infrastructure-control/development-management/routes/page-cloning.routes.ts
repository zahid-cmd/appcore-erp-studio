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
// Step 1 : Clone From (Source Page)
//===========================================================

{
    path:'source',

    loadComponent:() =>
        import(
            '../pages/page-cloning/source/page-cloning-source'
        )
        .then(
            m =>
                m.PageCloningSourceComponent
        )
},


//===========================================================
// Step 2 : Clone To (Target Page)
//===========================================================

{
    path:'target',

    loadComponent:() =>
        import(
            '../pages/page-cloning/target/page-cloning-target'
        )
        .then(
            m =>
                m.PageCloningTargetComponent
        )
},

//===========================================================
// Step 3 : Clone Action
//===========================================================

{
    path:'action',

    loadComponent:() =>
        import(
            '../pages/page-cloning/action/page-cloning-action'
        )
        .then(
            m =>
                m.PageCloningActionComponent
        )
},

//===========================================================
// Step 4 : Clone Preview
//===========================================================

{
    path:'preview',

    loadComponent:() =>
        import(
            '../pages/page-cloning/preview/page-cloning-preview'
        )
        .then(
            m =>
                m.PageCloningPreviewComponent
        )
},


//===========================================================
// View
//===========================================================

{
    path:'view/:id',

    loadComponent:() =>
        import(
            '../pages/page-cloning/form/page-cloning-form'
        )
        .then(
            m =>
                m.PageCloningFormComponent
        )
},


//===========================================================
// Edit
//===========================================================

{
    path:'edit/:id',

    loadComponent:() =>
        import(
            '../pages/page-cloning/form/page-cloning-form'
        )
        .then(
            m =>
                m.PageCloningFormComponent
        )
}

];