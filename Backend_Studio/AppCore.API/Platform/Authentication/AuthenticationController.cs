//=============================================================== 
// Namespaces 
//=============================================================== 
 
using Microsoft.AspNetCore.Authorization; 
using Microsoft.AspNetCore.Mvc; 
 
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
 
 
    //=========================================================== 
    // Constructor 
    //=========================================================== 
 
    public AuthenticationController 
    ( 
        IAuthenticationService authenticationService 
    ) 
    { 
        _authenticationService = 
            authenticationService; 
    } 
 
 
    //=========================================================== 
    // Login 
    //=========================================================== 
 
    [AllowAnonymous] 
 
    [HttpPost( 
        "login" 
    )] 
 
    public async Task<ActionResult<LoginResponseDto>> 
        Login( 
            [FromBody] 
            LoginRequestDto request) 
    { 
        LoginResponseDto response = 
            await _authenticationService 
                .LoginAsync( 
                    request 
                ); 
 
 
        if 
        ( 
            !response.Success 
        ) 
        { 
            return Unauthorized( 
                response 
            ); 
        } 
 
 
        return Ok( 
            response 
        ); 
    } 
 
 
    //=========================================================== 
    // Register 
    //=========================================================== 
 
    [AllowAnonymous] 
 
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
}