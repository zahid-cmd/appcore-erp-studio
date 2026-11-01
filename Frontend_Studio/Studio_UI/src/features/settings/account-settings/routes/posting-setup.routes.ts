import
{
    Routes
}
from '@angular/router';

//===============================================================
// Posting Setup Routes
//
// Single page (custom, not Code Synchronization) — no list /
// add / edit / view routes.
//===============================================================

export const PostingSetupRoutes:
Routes =
[
    {
        path:'',

        loadComponent:() =>
            import(
                '../pages/posting-setup/posting-setup-view/posting-setup-view'
            )
            .then(
                m =>
                    m.PostingSetupView
            )
    }
];
