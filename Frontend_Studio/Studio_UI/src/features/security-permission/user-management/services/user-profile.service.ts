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

    map,

    tap
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
    providedIn:
        'root'
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
    // Get First Non-Empty Value
    //===========================================================

    private getFirstNonEmptyValue
    (
        ...values:
            (
                string
                |
                null
                |
                undefined
            )[]
    ):
        string
    {
        for
        (
            const value of
                values
        )
        {
            if
            (
                typeof value ===
                'string'
                &&
                value.trim().length > 0
            )
            {
                return value.trim();
            }
        }

        return '';
    }


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
                                        ??
                                        0
                                    ),

                                displayName:
                                    this.getFirstNonEmptyValue
                                    (
                                        profile.displayName,

                                        profile.DisplayName,

                                        profile.fullName,

                                        profile.FullName,

                                        profile.userName,

                                        profile.UserName
                                    ),

                                //================================
                                // Primary Role / Designation
                                //================================

                                PrimaryRoleName:
                                    this.getFirstNonEmptyValue
                                    (
                                        profile.PrimaryRoleName,

                                        profile.primaryRoleName,

                                        profile.RoleProfileName,

                                        profile.roleProfileName,

                                        profile.RoleName,

                                        profile.roleName
                                    ),

                                UserPhotoPath:
                                    this.getFirstNonEmptyValue
                                    (
                                        profile.UserPhotoPath,

                                        profile.userPhotoPath
                                    ),

                                UserPhotoData:
                                    this.getFirstNonEmptyValue
                                    (
                                        profile.UserPhotoData,

                                        profile.userPhotoData
                                    ),

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

                //================================================
                // Debug API Response
                //================================================

                tap(
                    response =>
                    {
                        console.log(
                            '========================================'
                        );

                        console.log(
                            'USER PROFILE SERVICE - GET BY ID'
                        );

                        console.log(
                            'USER PROFILE ID:',
                            id
                        );

                        console.log(
                            'RAW API RESPONSE:',
                            response
                        );

                        console.log(
                            'RAW USER PHOTO PATH:',
                            response?.userPhotoPath
                        );

                        console.log(
                            'RAW USER PHOTO DATA:',
                            response?.userPhotoData
                        );

                        console.log(
                            'RAW PRIMARY ROLE NAME:',
                            response?.primaryRoleName
                        );

                        console.log(
                            'RAW PRIMARY ROLE NAME - PASCAL:',
                            response?.PrimaryRoleName
                        );

                        console.log(
                            '========================================'
                        );
                    }
                ),


                //================================================
                // Normalize Response
                //================================================

                map(
                    response =>
                    {
                        //============================================
                        // Normalize Photo Path
                        //============================================

                        const userPhotoPath =
                            this.getFirstNonEmptyValue
                            (
                                response?.UserPhotoPath,

                                response?.userPhotoPath
                            );


                        //============================================
                        // Normalize Photo Data
                        //============================================

                        const userPhotoData =
                            this.getFirstNonEmptyValue
                            (
                                response?.UserPhotoData,

                                response?.userPhotoData
                            );


                        //============================================
                        // Normalize Display Name
                        //============================================

                        const displayName =
                            this.getFirstNonEmptyValue
                            (
                                response?.displayName,

                                response?.DisplayName,

                                response?.fullName,

                                response?.FullName,

                                response?.userName,

                                response?.UserName
                            );


                        //============================================
                        // Normalize Full Name
                        //============================================

                        const fullName =
                            this.getFirstNonEmptyValue
                            (
                                response?.fullName,

                                response?.FullName
                            );


                        //============================================
                        // Normalize Primary Role / Designation
                        //============================================

                        const primaryRoleName =
                            this.getFirstNonEmptyValue
                            (
                                response?.PrimaryRoleName,

                                response?.primaryRoleName,

                                response?.RoleProfileName,

                                response?.roleProfileName,

                                response?.RoleName,

                                response?.roleName
                            );


                        //============================================
                        // Build Normalized Profile
                        //============================================

                        const normalizedProfile =
                        {
                            ...response,

                            UserProfileId:
                                Number
                                (
                                    response?.userProfileId
                                    ??
                                    response?.UserProfileId
                                    ??
                                    response?.id
                                    ??
                                    response?.Id
                                    ??
                                    0
                                ),

                            ProfileCode:
                                this.getFirstNonEmptyValue
                                (
                                    response?.profileCode,

                                    response?.ProfileCode
                                ),

                            UserName:
                                this.getFirstNonEmptyValue
                                (
                                    response?.userName,

                                    response?.UserName
                                ),

                            DisplayName:
                                displayName,

                            FullName:
                                fullName,

                            Email:
                                this.getFirstNonEmptyValue
                                (
                                    response?.email,

                                    response?.Email
                                ),

                            MobileNo:
                                this.getFirstNonEmptyValue
                                (
                                    response?.mobileNo,

                                    response?.MobileNo
                                ),

                            //========================================
                            // Primary Role / Designation
                            //========================================

                            PrimaryRoleName:
                                primaryRoleName,

                            UserPhotoPath:
                                userPhotoPath,

                            UserPhotoData:
                                userPhotoData,

                            IsActive:
                                Boolean
                                (
                                    response?.isActive
                                    ??
                                    response?.IsActive
                                    ??
                                    true
                                )
                        };


                        //============================================
                        // Debug Normalized Result
                        //============================================

                        console.log(
                            'USER PROFILE SERVICE - NORMALIZED PROFILE:',
                            normalizedProfile
                        );

                        console.log(
                            'USER PROFILE SERVICE - NORMALIZED FULL NAME:',
                            normalizedProfile.FullName
                        );

                        console.log(
                            'USER PROFILE SERVICE - NORMALIZED PRIMARY ROLE:',
                            normalizedProfile.PrimaryRoleName
                        );

                        console.log(
                            'USER PROFILE SERVICE - NORMALIZED PHOTO DATA:',
                            normalizedProfile.UserPhotoData
                        );


                        return normalizedProfile;
                    }
                )
            );
    }


    //===========================================================
    // Get User Profile Photo
    //===========================================================
    //
    // Kept for compatibility with existing screens.
    //
    // The Welcome Widget does NOT use this method.
    //
    // Welcome Widget now receives UserPhotoData directly from
    // getById().
    //
    //===========================================================

    getUserPhoto
    (
        userProfileId:
            number
    ):
        Observable<Blob>
    {
        return this.http

            .get
            (
                `${this.apiUrl}/${userProfileId}/photo`,

                {
                    responseType:
                        'blob'
                }
            )

            .pipe(

                tap(
                    blob =>
                    {
                        console.log(
                            '========================================'
                        );

                        console.log(
                            'USER PROFILE SERVICE - PHOTO BLOB'
                        );

                        console.log(
                            'USER PROFILE ID:',
                            userProfileId
                        );

                        console.log(
                            'BLOB TYPE:',
                            blob.type
                        );

                        console.log(
                            'BLOB SIZE:',
                            blob.size
                        );

                        console.log(
                            '========================================'
                        );
                    }
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