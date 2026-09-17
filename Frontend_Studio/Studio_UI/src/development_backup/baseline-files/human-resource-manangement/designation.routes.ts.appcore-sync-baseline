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
//===============================================================

export const DesignationRoutes:
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

        data:
        {
            breadcrumb:'Designation'
        },

        loadComponent:() =>
            import(
                '../pages/designation/list/designation-list'
            )
            .then(
                m =>
                    m.DesignationList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Designation'
        },

        loadComponent:() =>
            import(
                '../pages/designation/form/designation-form'
            )
            .then(
                m =>
                    m.DesignationForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Designation'
        },

        loadComponent:() =>
            import(
                '../pages/designation/form/designation-form'
            )
            .then(
                m =>
                    m.DesignationForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Designation'
        },

        loadComponent:() =>
            import(
                '../pages/designation/form/designation-form'
            )
            .then(
                m =>
                    m.DesignationForm
            )
    }

];