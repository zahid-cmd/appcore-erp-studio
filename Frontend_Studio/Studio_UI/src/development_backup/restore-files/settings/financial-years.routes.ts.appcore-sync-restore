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

export const FinancialYearsRoutes:
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
            breadcrumb:'Financial Years'
        },

        loadComponent:() =>
            import(
                '../pages/financial-years/list/financial-years-list'
            )
            .then(
                m =>
                    m.FinancialYearsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Financial Years'
        },

        loadComponent:() =>
            import(
                '../pages/financial-years/form/financial-years-form'
            )
            .then(
                m =>
                    m.FinancialYearsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Financial Years'
        },

        loadComponent:() =>
            import(
                '../pages/financial-years/form/financial-years-form'
            )
            .then(
                m =>
                    m.FinancialYearsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Financial Years'
        },

        loadComponent:() =>
            import(
                '../pages/financial-years/form/financial-years-form'
            )
            .then(
                m =>
                    m.FinancialYearsForm
            )
    }

];