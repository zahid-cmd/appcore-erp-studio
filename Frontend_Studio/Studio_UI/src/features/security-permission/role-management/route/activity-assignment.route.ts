//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';

import
{
    ActivityAssignmentListComponent
}
from '../activity-assignment/pages/list/activity-assignment-list';

import
{
    ActivityAssignmentFormComponent
}
from '../activity-assignment/pages/form/activity-assignment-form';

//===============================================================
// Activity Assignment Routes
//===============================================================

export const ACTIVITY_ASSIGNMENT_ROUTES:
    Routes =
[
    //===========================================================
    // List
    //===========================================================

    {
        path:'',

        component:
            ActivityAssignmentListComponent
    },

    //===========================================================
    // Create
    //===========================================================

    {
        path:'new',

        component:
            ActivityAssignmentFormComponent
    },

    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        component:
            ActivityAssignmentFormComponent
    },

    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        component:
            ActivityAssignmentFormComponent
    }
];