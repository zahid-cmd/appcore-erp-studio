//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Enquiry Setup Routes
//
// Hand-written page, NO Code Synchronization : one page (list
// with five tabs; add / edit / view in a modal), so there are no
// add / edit / view routes.
//===============================================================

export const EnquirySetupRoutes:
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
    // List (the whole page)
    //===========================================================

    {
        path:'list',

        data:
        {
            breadcrumb:'Enquiry Setup'
        },

        loadComponent:() =>
            import(
                '../pages/enquiry-setup/list/enquiry-setup-list'
            )
            .then(
                m =>
                    m.EnquirySetupList
            )
    }

];
