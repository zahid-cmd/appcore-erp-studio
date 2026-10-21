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

export const MembershipCardsRoutes:
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
            breadcrumb:'Membership Cards'
        },

        loadComponent:() =>
            import(
                '../pages/membership-cards/list/membership-cards-list'
            )
            .then(
                m =>
                    m.MembershipCardsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Membership Cards'
        },

        loadComponent:() =>
            import(
                '../pages/membership-cards/form/membership-cards-form'
            )
            .then(
                m =>
                    m.MembershipCardsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Membership Cards'
        },

        loadComponent:() =>
            import(
                '../pages/membership-cards/form/membership-cards-form'
            )
            .then(
                m =>
                    m.MembershipCardsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Membership Cards'
        },

        loadComponent:() =>
            import(
                '../pages/membership-cards/form/membership-cards-form'
            )
            .then(
                m =>
                    m.MembershipCardsForm
            )
    }

];