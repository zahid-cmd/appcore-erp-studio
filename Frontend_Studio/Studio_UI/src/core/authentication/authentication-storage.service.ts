/* ============================================================
   Authentication Storage Service
============================================================ */

import
{
    Injectable
}
from '@angular/core';

import
{
    LoginResponse
}
from './authentication.model';



/* ============================================================
   Authentication Storage Service
============================================================ */

@Injectable
({
    providedIn:
        'root'
})

export class AuthenticationStorageService
{
    private readonly tokenKey:
        string =
            'appcore_authentication_token';


    private readonly userKey:
        string =
            'appcore_authentication_user';



    /* ========================================================
       Set Authentication
    ======================================================== */

    setAuthentication
    (
        response:
            LoginResponse
    ):
        void
    {
        //=======================================================
        // Store Authentication Token
        //=======================================================

        localStorage.setItem
        (
            this.tokenKey,

            response.token
        );


        //=======================================================
        // Store Authenticated User
        //=======================================================

        localStorage.setItem
        (
            this.userKey,

            JSON.stringify
            ({
                userProfileId:
                    response.userProfileId,

                userName:
                    response.userName,

                displayName:
                    response.displayName,

                fullName:
                    response.fullName,

                userPhotoPath:
                    (
                        response as
                        LoginResponse &
                        {
                            userPhotoPath?:
                                string;

                            UserPhotoPath?:
                                string;
                        }
                    ).userPhotoPath
                    ??
                    (
                        response as
                        LoginResponse &
                        {
                            userPhotoPath?:
                                string;

                            UserPhotoPath?:
                                string;
                        }
                    ).UserPhotoPath
                    ??
                    ''
            })
        );
    }



    /* ========================================================
       Get Token
    ======================================================== */

    getToken():
        string | null
    {
        return localStorage.getItem
        (
            this.tokenKey
        );
    }



    /* ========================================================
    Get User
    ======================================================== */

    getUser():
        {
            userProfileId:
                number;

            userName:
                string;

            displayName:
                string;

            fullName:
                string;

            userPhotoPath:
                string;
        }
        | null
    {
        const user:
            string | null =
                localStorage.getItem
                (
                    this.userKey
                );


        if
        (
            !user
        )
        {
            return null;
        }


        try
        {
            const parsedUser:
                any =
                    JSON.parse
                    (
                        user
                    );


            //===================================================
            // Return Normalized Authenticated User
            //===================================================

            return {
                userProfileId:
                    Number
                    (
                        parsedUser.userProfileId
                        ??
                        parsedUser.UserProfileId
                        ??
                        parsedUser.id
                        ??
                        parsedUser.Id
                        ??
                        0
                    ),

                userName:
                    parsedUser.userName
                    ??
                    parsedUser.UserName
                    ??
                    '',

                displayName:
                    parsedUser.displayName
                    ??
                    parsedUser.DisplayName
                    ??
                    '',

                fullName:
                    parsedUser.fullName
                    ??
                    parsedUser.FullName
                    ??
                    '',

                userPhotoPath:
                    parsedUser.userPhotoPath
                    ??
                    parsedUser.UserPhotoPath
                    ??
                    ''
            };
        }
        catch
        {
            return null;
        }
    }



    /* ========================================================
       Is Authenticated
    ======================================================== */

    isAuthenticated():
        boolean
    {
        const token:
            string | null =
                this.getToken();


        return !!token;
    }



    /* ========================================================
       Clear Authentication
    ======================================================== */

    clearAuthentication():
        void
    {
        localStorage.removeItem
        (
            this.tokenKey
        );


        localStorage.removeItem
        (
            this.userKey
        );
    }
}