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

export const SpecialAssignmentRoutes:
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
            breadcrumb:'Special Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/special-assignment/list/special-assignment-list'
            )
            .then(
                m =>
                    m.SpecialAssignmentList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Special Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/special-assignment/form/special-assignment-form'
            )
            .then(
                m =>
                    m.SpecialAssignmentForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Special Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/special-assignment/form/special-assignment-form'
            )
            .then(
                m =>
                    m.SpecialAssignmentForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Special Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/special-assignment/form/special-assignment-form'
            )
            .then(
                m =>
                    m.SpecialAssignmentForm
            )
    }

];