//===============================================================
// Imports
//===============================================================

import
{
    Injectable
}
from '@angular/core';

import
{
    HttpClient
}
from '@angular/common/http';

import
{
    Observable,
    of,
    forkJoin,
    tap,
    map
}
from 'rxjs';

import
{
    environment
}
from '../../environments/environment';

import
{
    EffectiveAccess
}
from './effective-access.model';

import
{
    MasterActivity
}
from '../../features/infrastructure-control/navigation-management/models/master-activity.model';

import
{
    MasterActivityService
}
from '../../features/infrastructure-control/navigation-management/services/master-activity.service';


//===============================================================
// Service
//===============================================================

@Injectable
({
    providedIn: 'root'
})
export class EffectiveAccessService
{

    //===========================================================
    // API URL
    //===========================================================

    private readonly apiUrl =
        `${environment.apiUrl}/platform/effective-access`;


    //===========================================================
    // Effective Access Cache
    //===========================================================

    private effectiveAccess:
        EffectiveAccess[] = [];

    private loadedUserProfileId:
        number | null = null;


    //===========================================================
    // Master Activity Cache
    //===========================================================

    private masterActivities:
        MasterActivity[] = [];

    private masterActivitiesLoaded =
        false;


    //===========================================================
    // Constructor
    //===========================================================

    constructor
    (
        private readonly http: HttpClient,

        private readonly masterActivityService:
            MasterActivityService
    )
    {
    }


    //===========================================================
    // Load Permissions
    //===========================================================

    loadPermissions
    (
        userProfileId: number
    ):
        Observable<EffectiveAccess[]>
    {
        return forkJoin
        (
            {
                effectiveAccess:
                    this.http.get<EffectiveAccess[]>
                    (
                        `${this.apiUrl}/${userProfileId}`
                    ),

                masterActivities:
                    this.loadMasterActivities()
            }
        )
        .pipe
        (
            tap
            (
                result =>
                {
                    this.effectiveAccess =
                        result.effectiveAccess;

                    this.loadedUserProfileId =
                        userProfileId;

                    this.masterActivities =
                        result.masterActivities;

                    this.masterActivitiesLoaded =
                        true;
                }
            ),

            map
            (
                result =>
                    result.effectiveAccess
            )
        );
    }


    //===========================================================
    // Get Effective Access
    //===========================================================

    getEffectiveAccess
    (
        userProfileId: number
    ):
        Observable<EffectiveAccess[]>
    {
        return this.http.get<EffectiveAccess[]>
        (
            `${this.apiUrl}/${userProfileId}`
        )
        .pipe
        (
            tap
            (
                access =>
                {
                    this.effectiveAccess =
                        access;

                    this.loadedUserProfileId =
                        userProfileId;
                }
            )
        );
    }


    //===========================================================
    // Load Master Activities
    //===========================================================

    private loadMasterActivities():
        Observable<MasterActivity[]>
    {
        if
        (
            this.masterActivitiesLoaded
        )
        {
            return of(
                this.masterActivities
            );
        }

        return this.masterActivityService
            .getAll();
    }


    //===========================================================
    // Get Cached Effective Access
    //===========================================================

    getCachedEffectiveAccess():
        EffectiveAccess[]
    {
        return this.effectiveAccess;
    }


    //===========================================================
    // Get Cached Master Activities
    //===========================================================

    getCachedMasterActivities():
        MasterActivity[]
    {
        return this.masterActivities;
    }


    //===========================================================
    // Check Loaded User
    //===========================================================

    isLoadedForUser
    (
        userProfileId: number
    ):
        boolean
    {
        return (
            this.loadedUserProfileId
            ===
            userProfileId
        );
    }


    //===========================================================
    // Find Master Activity
    //===========================================================

    private findMasterActivity
    (
        activityName: string
    ):
        MasterActivity | null
    {
        const normalizedName =
            activityName
                .trim()
                .toLowerCase();

        return (
            this.masterActivities.find
            (
                activity =>
                    activity.isActive

                    &&

                    activity.name
                        .trim()
                        .toLowerCase()
                    ===
                    normalizedName
            )
            ??
            null
        );
    }


    //===========================================================
    // Check Master Activity Permission
    //===========================================================

    private hasMasterActivity
    (
        subMenuId: number,
        activityName: string
    ):
        boolean
    {
        const masterActivity =
            this.findMasterActivity
            (
                activityName
            );

        if
        (
            !masterActivity
        )
        {
            return false;
        }

        return this.effectiveAccess.some
        (
            access =>
                access.subMenuId
                ===
                subMenuId

                &&

                access.masterActivityId
                ===
                masterActivity.id
        );
    }


    //===========================================================
    // View Permission
    //===========================================================

    canView
    (
        subMenuId: number
    ):
        boolean
    {
        return this.hasMasterActivity
        (
            subMenuId,
            'View'
        );
    }


    //===========================================================
    // Add Permission
    //===========================================================

    canAdd
    (
        subMenuId: number
    ):
        boolean
    {
        return this.hasMasterActivity
        (
            subMenuId,
            'Add'
        );
    }


    //===========================================================
    // Update Permission
    //===========================================================

    canUpdate
    (
        subMenuId: number
    ):
        boolean
    {
        return this.hasMasterActivity
        (
            subMenuId,
            'Update'
        );
    }


    //===========================================================
    // Delete Permission
    //===========================================================

    canDelete
    (
        subMenuId: number
    ):
        boolean
    {
        return this.hasMasterActivity
        (
            subMenuId,
            'Delete'
        );
    }


    //===========================================================
    // Restore Permission
    //===========================================================

    canRestore
    (
        subMenuId: number
    ):
        boolean
    {
        return this.hasMasterActivity
        (
            subMenuId,
            'Restore'
        );
    }


    //===========================================================
    // Special Activity Permission
    //===========================================================

    hasSpecialActivity
    (
        moduleId: number,
        navigationActivityId: number
    ):
        boolean
    {
        return this.effectiveAccess.some
        (
            access =>
                access.moduleId
                ===
                moduleId

                &&

                access.navigationActivityId
                ===
                navigationActivityId
        );
    }


    //===========================================================
    // Get Module Special Activities
    //===========================================================

    getModuleSpecialActivities
    (
        moduleId: number
    ):
        EffectiveAccess[]
    {
        return this.effectiveAccess.filter
        (
            access =>
                access.moduleId
                ===
                moduleId

                &&

                access.navigationActivityId
                !==
                null
        );
    }


    //===========================================================
    // Clear Permission Cache
    //===========================================================

    clear():
        void
    {
        this.effectiveAccess =
            [];

        this.masterActivities =
            [];

        this.loadedUserProfileId =
            null;

        this.masterActivitiesLoaded =
            false;
    }
}