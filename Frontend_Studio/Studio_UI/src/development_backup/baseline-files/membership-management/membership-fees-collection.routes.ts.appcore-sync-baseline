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

export const MembershipFeesCollectionRoutes:
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
            breadcrumb:'Membership Fees Collection'
        },

        loadComponent:() =>
            import(
                '../pages/membership-fees-collection/list/membership-fees-collection-list'
            )
            .then(
                m =>
                    m.MembershipFeesCollectionList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Membership Fees Collection'
        },

        loadComponent:() =>
            import(
                '../pages/membership-fees-collection/form/membership-fees-collection-form'
            )
            .then(
                m =>
                    m.MembershipFeesCollectionForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Membership Fees Collection'
        },

        loadComponent:() =>
            import(
                '../pages/membership-fees-collection/form/membership-fees-collection-form'
            )
            .then(
                m =>
                    m.MembershipFeesCollectionForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Membership Fees Collection'
        },

        loadComponent:() =>
            import(
                '../pages/membership-fees-collection/form/membership-fees-collection-form'
            )
            .then(
                m =>
                    m.MembershipFeesCollectionForm
            )
    }

];