//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

using AppCore.Api.Security;

using AppCore.Application.Platform.Authentication.DTOs;
using AppCore.Application.Platform.Authentication.Interfaces;


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


    //===========================================================
    // Constructor
    //===========================================================

    public AuthenticationController
    (
        IAuthenticationService authenticationService,
        LoginAttemptGuard loginAttempts
    )
    {
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
        LoginResponseDto response =
            await _authenticationService
                .RegisterAsync(
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