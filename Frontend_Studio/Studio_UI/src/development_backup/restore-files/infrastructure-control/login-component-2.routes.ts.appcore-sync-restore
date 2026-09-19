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

export const LoginComponent2Routes:
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
            breadcrumb:'Login Component 2'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-2/list/login-component-2-list'
            )
            .then(
                m =>
                    m.LoginComponent2List
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Login Component 2'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-2/form/login-component-2-form'
            )
            .then(
                m =>
                    m.LoginComponent2Form
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Login Component 2'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-2/form/login-component-2-form'
            )
            .then(
                m =>
                    m.LoginComponent2Form
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Login Component 2'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-2/form/login-component-2-form'
            )
            .then(
                m =>
                    m.LoginComponent2Form
            )
    }

];