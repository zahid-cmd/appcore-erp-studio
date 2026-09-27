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

                                UserPhotoPath:
                                    profile.UserPhotoPath
                                    ??
                                    profile.userPhotoPath
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
        return this.http
            .get<any>(
                `${this.apiUrl}/${id}`
            )
            .pipe(
                map(
                    response =>
                    ({
                        ...response,

                        UserProfileId:
                            Number
                            (
                                response.userProfileId
                                ??
                                response.UserProfileId
                                ??
                                response.id
                                ??
                                response.Id
                                ??
                                0
                            ),

                        ProfileCode:
                            response.profileCode
                            ??
                            response.ProfileCode
                            ??
                            '',

                        UserName:
                            response.userName
                            ??
                            response.UserName
                            ??
                            '',

                        DisplayName:
                            response.displayName
                            ??
                            response.DisplayName
                            ??
                            '',

                        FullName:
                            response.fullName
                            ??
                            response.FullName
                            ??
                            '',

                        Email:
                            response.email
                            ??
                            response.Email
                            ??
                            '',

                        MobileNo:
                            response.mobileNo
                            ??
                            response.MobileNo
                            ??
                            '',

                        UserPhotoPath:
                            response.userPhotoPath
                            ??
                            response.UserPhotoPath
                            ??
                            '',

                        IsActive:
                            Boolean
                            (
                                response.isActive
                                ??
                                response.IsActive
                                ??
                                true
                            )
                    })
                )
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
    // Upload User Profile Photo
    //===========================================================

    uploadUserPhoto
    (
        userProfileId:
            number,

        file:
            File
    ):
        Observable<string>
    {
        const formData =
            new FormData();


        formData.append(
            'file',

            file
        );


        return this.http.post(
            `${this.apiUrl}/${userProfileId}/photo`,

            formData,

            {
                responseType:
                    'text'
            }
        );
    }



    //===========================================================
    // Delete User Profile Photo
    //===========================================================

    deleteUserPhoto
    (
        userProfileId:
            number
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${userProfileId}/photo`
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