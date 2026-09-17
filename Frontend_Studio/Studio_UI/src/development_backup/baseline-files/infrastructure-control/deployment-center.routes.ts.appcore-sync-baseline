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

export const DeploymentCenterRoutes:
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
            breadcrumb:'Deployment Center'
        },

        loadComponent:() =>
            import(
                '../pages/deployment-center/list/deployment-center-list'
            )
            .then(
                m =>
                    m.DeploymentCenterList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Deployment Center'
        },

        loadComponent:() =>
            import(
                '../pages/deployment-center/form/deployment-center-form'
            )
            .then(
                m =>
                    m.DeploymentCenterForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Deployment Center'
        },

        loadComponent:() =>
            import(
                '../pages/deployment-center/form/deployment-center-form'
            )
            .then(
                m =>
                    m.DeploymentCenterForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Deployment Center'
        },

        loadComponent:() =>
            import(
                '../pages/deployment-center/form/deployment-center-form'
            )
            .then(
                m =>
                    m.DeploymentCenterForm
            )
    }

];