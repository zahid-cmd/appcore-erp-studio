//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

using AppCore.Api.Security;

using AppCore.Application.Platform.Authentication.DTOs;
using AppCore.Application.Platform.Authentication.Interfaces;
using AppCore.Api.Platform.Tenancy;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Platform.Authentication;


//===============================================================
// Authentication Controller
//===============================================================

[ApiController]

[Route(
    "api/authentication"
)]

public class AuthenticationController
    : ControllerBase
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly IAuthenticationService
        _authenticationService;

    private readonly LoginAttemptGuard
        _loginAttempts;

    private readonly IWebHostEnvironment
        _environment;


    //===========================================================
    // Constructor
    //===========================================================

    public AuthenticationController
    (
        IAuthenticationService authenticationService,
        LoginAttemptGuard loginAttempts,
        IWebHostEnvironment environment
    )
    {
        _environment =
            environment;

        _authenticationService =
            authenticationService;

        _loginAttempts =
            loginAttempts;
    }


    //===========================================================
    // Login
    //===========================================================
    //
    // Rate limits : 20 calls a minute per IP (LoginPolicy), and
    // 5 wrong passwords in 5 minutes per Login ID → wait 60 seconds
    // (LoginAttemptGuard).
    // Over the limit : 429 with the seconds to wait.
    //
    //===========================================================

    [AllowAnonymous]

    [EnableRateLimiting(
        ApiSecurity.LoginPolicy
    )]

    [HttpPost(
        "login"
    )]

    public async Task<ActionResult<LoginResponseDto>>
        Login(
            [FromBody]
            LoginRequestDto request)
    {
        int? secondsToWait =
            _loginAttempts.SecondsToWait(
                request?.UserName
            );

        if
        (
            secondsToWait is not null
        )
        {
            Response.Headers.RetryAfter =
                secondsToWait.Value.ToString(
                    System.Globalization.CultureInfo.InvariantCulture
                );

            return StatusCode(
                StatusCodes.Status429TooManyRequests,
                new LoginResponseDto
                {
                    Success = false,
                    Message =
                        $"Too many wrong attempts. Please wait {secondsToWait} seconds and try again."
                }
            );
        }


        LoginResponseDto response =
            await _authenticationService
                .LoginAsync(
                    request!
                );


        if
        (
            !response.Success
        )
        {
            _loginAttempts.RecordFailure(
                request?.UserName
            );

            return Unauthorized(
                response
            );
        }


        _loginAttempts.RecordSuccess(
            request?.UserName
        );

        return Ok(
            response
        );
    }


    //===========================================================
    // Register
    //===========================================================

    [AllowAnonymous]

    [EnableRateLimiting(
        ApiSecurity.LoginPolicy
    )]

    [HttpPost(
        "register"
    )]

    public async Task<ActionResult<LoginResponseDto>>
        Register(
            [FromBody]
            RegisterRequestDto request)
    {
        //=======================================================
        // Profile Photo (optional) : saved first, removed again
        // when the registration fails
        //=======================================================

        request.UserPhotoPath =
            string.Empty;

        string? photoFile =
            null;

        if
        (
            !string.IsNullOrWhiteSpace(
                request.UserPhotoData
            )
        )
        {
            (string? path, string? file, string? error) =
                await SaveRegistrationPhotoAsync(
                    request.UserPhotoData
                );

            if
            (
                error is not null
            )
            {
                return BadRequest(
                    new LoginResponseDto
                    {
                        Success = false,
                        Message = error
                    }
                );
            }

            request.UserPhotoPath =
                path ?? string.Empty;

            photoFile =
                file;
        }

        request.UserPhotoData =
            string.Empty;


        LoginResponseDto response;

        try
        {
            response =
                await _authenticationService
                    .RegisterAsync(
                        request
                    );
        }
        catch
        {
            DeleteQuietly(
                photoFile
            );

            throw;
        }


        if
        (
            !response.Success
        )
        {
            DeleteQuietly(
                photoFile
            );

            return BadRequest(
                response
            );
        }


        return Ok(
            response
        );
    }


    //===========================================================
    // Registration Photo
    //
    // Same folder as the User Profile page
    // (wwwroot/uploads/user-photos), so the Uploads Mirror copies
    // it to every PC. Max 2 MB; JPG, PNG or WEBP, checked by the
    // file's own bytes, not by what the browser says.
    //===========================================================

    private const int MaxRegistrationPhotoBytes =
        2 * 1024 * 1024;

    private async Task<(string? Path, string? File, string? Error)>
        SaveRegistrationPhotoAsync
        (
            string data
        )
    {
        string base64 =
            data.Trim();

        int comma =
            base64.IndexOf(',');

        if
        (
            base64.StartsWith("data:", StringComparison.OrdinalIgnoreCase)
            &&
            comma > 0
        )
        {
            base64 =
                base64[(comma + 1)..];
        }

        if
        (
            base64.Length > (MaxRegistrationPhotoBytes / 3 * 4) + 8
        )
        {
            return (null, null, "Profile photo cannot be larger than 2 MB.");
        }

        byte[] bytes;

        try
        {
            bytes =
                Convert.FromBase64String(
                    base64
                );
        }
        catch (FormatException)
        {
            return (null, null, "The profile photo could not be read. Please choose it again.");
        }

        if
        (
            bytes.Length == 0
            ||
            bytes.Length > MaxRegistrationPhotoBytes
        )
        {
            return (null, null, "Profile photo cannot be larger than 2 MB.");
        }

        string? extension =
            bytes.Length > 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF
                ? ".jpg"
                : bytes.Length > 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47
                    ? ".png"
                    : bytes.Length > 12
                      && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
                      && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50
                        ? ".webp"
                        : null;

        if
        (
            extension is null
        )
        {
            return (null, null, "Only JPG, PNG and WEBP photos are allowed.");
        }

        string webRootPath =
            TenantWebRoot.Of(HttpContext, _environment)
            ??
            Path.Combine(
                _environment.ContentRootPath,
                "wwwroot"
            );

        string folder =
            Path.Combine(
                webRootPath,
                "uploads",
                "user-photos"
            );

        Directory.CreateDirectory(
            folder
        );

        string fileName =
            $"{Guid.NewGuid():N}{extension}";

        string physical =
            Path.Combine(
                folder,
                fileName
            );

        await System.IO.File.WriteAllBytesAsync(
            physical,
            bytes
        );

        return ($"/uploads/user-photos/{fileName}", physical, null);
    }

    private static void DeleteQuietly
    (
        string? file
    )
    {
        try
        {
            if
            (
                file is not null
                &&
                System.IO.File.Exists(file)
            )
            {
                System.IO.File.Delete(file);
            }
        }
        catch
        {
            // left for the next clean-up
        }
    }


    //===========================================================
    // Check Forgot Password
    //===========================================================

    [AllowAnonymous]

    [EnableRateLimiting(
        ApiSecurity.LoginPolicy
    )]

    [HttpPost(
        "forgot-password/check"
    )]

    public async Task<
        ActionResult<ForgotPasswordCheckResponseDto>
    >
        CheckForgotPassword(
            [FromBody]
            ForgotPasswordCheckRequestDto request)
    {
        ForgotPasswordCheckResponseDto response =
            await _authenticationService
                .CheckForgotPasswordAsync(
                    request
                );


        if
        (
            !response.Success
        )
        {
            return BadRequest(
                response
            );
        }


        return Ok(
            response
        );
    }


    //===========================================================
    // Confirm Forgot Password
    //===========================================================

    [AllowAnonymous]

    [EnableRateLimiting(
        ApiSecurity.LoginPolicy
    )]

    [HttpPost(
        "forgot-password/confirm"
    )]

    public async Task<
        ActionResult<LoginResponseDto>
    >
        ConfirmForgotPassword(
            [FromBody]
            ForgotPasswordConfirmRequestDto request)
    {
        LoginResponseDto response =
            await _authenticationService
                .ConfirmForgotPasswordAsync(
                    request
                );


        if
        (
            !response.Success
        )
        {
            return BadRequest(
                response
            );
        }


        return Ok(
            response
        );
    }


    //===========================================================
    // Validate Current Password
    //===========================================================
    //
    // Authenticated ERP user only.
    //
    // This endpoint is used for LIVE validation when the user
    // leaves the Current Password field.
    //
    // Flow:
    //
    //     Current Password
    //            ↓
    //     Backend Verification
    //            ↓
    //     Valid / Invalid
    //
    // This endpoint DOES NOT change the password.
    //
    // IMPORTANT:
    //
    // Validation failure is returned as HTTP 200 with
    // Success = false.
    //
    // This is intentional because an incorrect password is a
    // normal field-validation result, not an API failure.
    //
    // Endpoint:
    //
    //     POST /api/authentication/validate-current-password
    //
    //===========================================================

    [Authorize]

    [HttpPost(
        "validate-current-password"
    )]

    public async Task<
        ActionResult<ValidateCurrentPasswordResponseDto>
    >
        ValidateCurrentPassword(
            [FromBody]
            ValidateCurrentPasswordRequestDto request)
    {
        ValidateCurrentPasswordResponseDto response =
            await _authenticationService
                .ValidateCurrentPasswordAsync(
                    request
                );


        //=======================================================
        // Return Validation Result
        //=======================================================
        //
        // Both valid and invalid password results are returned
        // through HTTP 200.
        //
        // The response.Success property tells the frontend
        // whether the password is valid.
        //
        //=======================================================

        return Ok(
            response
        );
    }


    //===========================================================
    // Change Password
    //===========================================================
    //
    // Authenticated ERP user only.
    //
    // Flow:
    //
    //     Login ID
    //          ↓
    //     Current Password Verification
    //          ↓
    //     New Password
    //          ↓
    //     Save Password
    //
    // Endpoint:
    //
    //     POST /api/authentication/change-password
    //
    //===========================================================

    [Authorize]

    [HttpPost(
        "change-password"
    )]

    public async Task<
        ActionResult<ChangePasswordResponseDto>
    >
        ChangePassword(
            [FromBody]
            ChangePasswordRequestDto request)
    {
        ChangePasswordResponseDto response =
            await _authenticationService
                .ChangePasswordAsync(
                    request
                );


        if
        (
            !response.Success
        )
        {
            return BadRequest(
                response
            );
        }


        return Ok(
            response
        );
    }
}
