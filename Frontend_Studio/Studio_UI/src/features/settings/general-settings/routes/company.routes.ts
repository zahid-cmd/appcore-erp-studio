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

export const CompanyRoutes:
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
            breadcrumb:'Company'
        },

        loadComponent:() =>
            import(
                '../pages/company/list/company-list'
            )
            .then(
                m =>
                    m.CompanyList
            )
    },


    //===========================================================
    // Add : one company per client (made with the client's
    // database), so the old address only goes back to the list
    //===========================================================

    {
        path:'add',

        redirectTo:'list',

        pathMatch:'full'
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Company'
        },

        loadComponent:() =>
            import(
                '../pages/company/form/company-form'
            )
            .then(
                m =>
                    m.CompanyForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Company'
        },

        loadComponent:() =>
            import(
                '../pages/company/form/company-form'
            )
            .then(
                m =>
                    m.CompanyForm
            )
    }

];