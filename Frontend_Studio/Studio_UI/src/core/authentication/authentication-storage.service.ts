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


    private readonly rememberedLoginIdKey:
        string =
            'appcore_remembered_login_id';



    /* ========================================================
       Set Authentication
       --------------------------------------------------------
       Remember Me behavior:

       rememberMe = true
           -> localStorage

       rememberMe = false
           -> sessionStorage

       The Login ID is remembered only when Remember Me
       is enabled.

       Password is NEVER stored.
    ======================================================== */

    setAuthentication
    (
        response:
            LoginResponse,

        rememberMe:
            boolean =
                false,

        loginId:
            string =
                ''
    ):
        void
    {
        //=======================================================
        // Clear Previous Authentication
        //=======================================================

        this.clearAuthentication();



        //=======================================================
        // Remember Login ID
        //=======================================================

        if
        (
            rememberMe
            &&
            loginId.trim()
        )
        {
            localStorage.setItem
            (
                this.rememberedLoginIdKey,

                loginId.trim()
            );
        }
        else
        {
            localStorage.removeItem
            (
                this.rememberedLoginIdKey
            );
        }



        //=======================================================
        // Select Authentication Storage
        //=======================================================

        const storage:
            Storage =
                rememberMe
                    ? localStorage
                    : sessionStorage;



        //=======================================================
        // Store Authentication Token
        //=======================================================

        storage.setItem
        (
            this.tokenKey,

            response.token
        );



        //=======================================================
        // Store Authenticated User
        //=======================================================

        storage.setItem
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
       --------------------------------------------------------
       Checks sessionStorage first and then localStorage.
    ======================================================== */

    getToken():
        string | null
    {
        const sessionToken:
            string | null =
                sessionStorage.getItem
                (
                    this.tokenKey
                );


        if
        (
            sessionToken
        )
        {
            return sessionToken;
        }



        return localStorage.getItem
        (
            this.tokenKey
        );
    }



    /* ========================================================
       Get User
       --------------------------------------------------------
       Checks sessionStorage first and then localStorage.
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
        const sessionUser:
            string | null =
                sessionStorage.getItem
                (
                    this.userKey
                );


        const localUser:
            string | null =
                localStorage.getItem
                (
                    this.userKey
                );


        const user:
            string | null =
                sessionUser
                ??
                localUser;


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


            const normalizedUser =
            {
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


            return normalizedUser;
        }
        catch
        {
            return null;
        }
    }



    /* ========================================================
       Get Remembered Login ID
    ======================================================== */

    getRememberedLoginId():
        string
        | null
    {
        return localStorage.getItem
        (
            this.rememberedLoginIdKey
        );
    }



    /* ========================================================
       Has Remembered Login
    ======================================================== */

    hasRememberedLogin():
        boolean
    {
        return !!this.getRememberedLoginId();
    }



    /* ========================================================
       Clear Remembered Login
       --------------------------------------------------------
       Removes only the remembered Login ID.

       This is separate from Logout.
    ======================================================== */

    clearRememberedLogin():
        void
    {
        localStorage.removeItem
        (
            this.rememberedLoginIdKey
        );
    }



    /* ========================================================
       Is Authenticated
    ======================================================== */

    isAuthenticated():
        boolean
    {
        return !!this.getToken();
    }



    /* ========================================================
       Logout
       --------------------------------------------------------
       Clears authentication from BOTH localStorage and
       sessionStorage.

       The remembered Login ID is intentionally preserved.

       Therefore:

           Remember Me checked
               -> Login ID remains after logout.

           Remember Me unchecked
               -> no remembered Login ID exists.

       IMPORTANT:

           This method does NOT navigate.

           Routing/navigation belongs to the component or
           AuthenticationService.
    ======================================================== */

    logout():
        void
    {
        this.clearAuthentication();
    }



    /* ========================================================
       Clear Authentication
       --------------------------------------------------------
       Removes ONLY authentication information.

       Removes:

           - Authentication token
           - Authenticated user

       From:

           - localStorage
           - sessionStorage

       Does NOT remove:

           - Remembered Login ID
    ======================================================== */

    clearAuthentication():
        void
    {
        //=======================================================
        // Clear Local Authentication
        //=======================================================

        localStorage.removeItem
        (
            this.tokenKey
        );

        localStorage.removeItem
        (
            this.userKey
        );



        //=======================================================
        // Clear Session Authentication
        //=======================================================

        sessionStorage.removeItem
        (
            this.tokenKey
        );

        sessionStorage.removeItem
        (
            this.userKey
        );
    }
}