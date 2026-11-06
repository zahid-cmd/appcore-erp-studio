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

export const ActivityAssignmentRoutes:
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
            breadcrumb:'Activity Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/activity-assignment/list/activity-assignment-list'
            )
            .then(
                m =>
                    m.ActivityAssignmentList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Activity Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/activity-assignment/form/activity-assignment-form'
            )
            .then(
                m =>
                    m.ActivityAssignmentForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Activity Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/activity-assignment/form/activity-assignment-form'
            )
            .then(
                m =>
                    m.ActivityAssignmentForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Activity Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/activity-assignment/form/activity-assignment-form'
            )
            .then(
                m =>
                    m.ActivityAssignmentForm
            )
    }

];