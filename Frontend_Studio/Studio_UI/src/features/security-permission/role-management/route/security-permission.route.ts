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
    ROLE_PROFILE_ROUTES
}
from './role-profiles.route';

import
{
    ACTIVITY_ASSIGNMENT_ROUTES
}
from './activity-assignment.route';

//===============================================================
// Security & Permission Routes
//===============================================================

export const SECURITY_PERMISSION_ROUTES:
    Routes =
[
    //===========================================================
    // Role Management
    //===========================================================

    {
        path:'role-management/role-profiles',

        children:
            ROLE_PROFILE_ROUTES
    },

    {
        path:'role-management/activity-assignment',

        children:
            ACTIVITY_ASSIGNMENT_ROUTES
    }
];