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

export const LaborChartRoutes:
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
            breadcrumb:'Labor Chart'
        },

        loadComponent:() =>
            import(
                '../pages/labor-chart/list/labor-chart-list'
            )
            .then(
                m =>
                    m.LaborChartList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Labor Chart'
        },

        loadComponent:() =>
            import(
                '../pages/labor-chart/form/labor-chart-form'
            )
            .then(
                m =>
                    m.LaborChartForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Labor Chart'
        },

        loadComponent:() =>
            import(
                '../pages/labor-chart/form/labor-chart-form'
            )
            .then(
                m =>
                    m.LaborChartForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Labor Chart'
        },

        loadComponent:() =>
            import(
                '../pages/labor-chart/form/labor-chart-form'
            )
            .then(
                m =>
                    m.LaborChartForm
            )
    }

];