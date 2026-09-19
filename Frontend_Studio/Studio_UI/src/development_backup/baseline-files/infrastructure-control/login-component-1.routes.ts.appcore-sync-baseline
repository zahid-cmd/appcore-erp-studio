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

export const LoginComponent1Routes:
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
            breadcrumb:'Login Component 1'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-1/list/login-component-1-list'
            )
            .then(
                m =>
                    m.LoginComponent1List
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Login Component 1'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-1/form/login-component-1-form'
            )
            .then(
                m =>
                    m.LoginComponent1Form
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Login Component 1'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-1/form/login-component-1-form'
            )
            .then(
                m =>
                    m.LoginComponent1Form
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Login Component 1'
        },

        loadComponent:() =>
            import(
                '../pages/login-component-1/form/login-component-1-form'
            )
            .then(
                m =>
                    m.LoginComponent1Form
            )
    }

];