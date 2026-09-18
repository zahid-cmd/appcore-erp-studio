//===============================================================
// Imports
//===============================================================

import
{
    Injectable,
    inject
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

    map
}
from 'rxjs';

import
{
    environment
}
from '../../../../environments/environment';

import
{
    UserProfile,

    CreateUserProfile,

    UpdateUserProfile,

    UserProfileDefaults
}
from '../models/user-profile.model';


//===============================================================
// User Profile Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class UserProfileService
{

    //===========================================================
    // Injection
    //===========================================================

    private readonly http =
        inject(HttpClient);



    //===========================================================
    // API
    //===========================================================

    private readonly apiUrl =
        `${environment.apiUrl}/security-permission/user-management/user-profile`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<UserProfile[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(
                map(
                    response =>

                        response.map(
                            profile =>
                            ({
                                ...profile,

                                userProfileId:
                                    Number
                                    (
                                        profile.userProfileId
                                        ??
                                        profile.UserProfileId
                                        ??
                                        profile.id
                                        ??
                                        profile.Id
                                    ),

                                displayName:
                                    profile.displayName
                                    ??
                                    profile.DisplayName
                                    ??
                                    profile.fullName
                                    ??
                                    profile.FullName
                                    ??
                                    profile.userName
                                    ??
                                    profile.UserName
                                    ??
                                    '',

                                IsActive:
                                    Boolean
                                    (
                                        profile.IsActive
                                        ??
                                        profile.isActive
                                        ??
                                        true
                                    )
                            })
                        )
                )
            );
    }



    //===========================================================
    // Get Next Code
    //===========================================================

    getNextCode():
        Observable<string>
    {
        return this.http.get<string>(
            `${this.apiUrl}/next-code`
        );
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<UserProfileDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    ({
                        Code:
                            response.code
                    })
                )
            );
    }



    //===========================================================
    // Get By Id
    //===========================================================

    getById
    (
        id:
            number
    ):
        Observable<UserProfile>
    {
        return this.http.get<UserProfile>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateUserProfile
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,

            model
        );
    }



    //===========================================================
    // Update
    //===========================================================

    update
    (
        model:
            UpdateUserProfile
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,

            model
        );
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Restore
    //===========================================================

    restore():
        Observable<boolean>
    {
        return this.http.put<boolean>(
            `${this.apiUrl}/restore`,

            {}
        );
    }



    //===========================================================
    // Get History
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`
        );
    }



    //===========================================================
    // Get Entity History
    //===========================================================

    getEntityHistory
    (
        id:
            number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }

}