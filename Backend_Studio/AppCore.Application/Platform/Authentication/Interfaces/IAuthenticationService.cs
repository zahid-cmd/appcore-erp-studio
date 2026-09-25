//=============================================================== 
// Namespaces 
//=============================================================== 
 
using AppCore.Application.Platform.Authentication.DTOs; 
 
 
//=============================================================== 
// Namespace 
//=============================================================== 
 
namespace AppCore.Application.Platform.Authentication.Interfaces; 
 
 
//=============================================================== 
// Authentication Service Interface 
//=============================================================== 
 
public interface IAuthenticationService 
{ 
    //=========================================================== 
    // Login 
    //=========================================================== 
 
    Task<LoginResponseDto> LoginAsync( 
        LoginRequestDto request); 
 
 
    //=========================================================== 
    // Register 
    //=========================================================== 
 
    Task<LoginResponseDto> RegisterAsync( 
        RegisterRequestDto request); 
 
 
    //=========================================================== 
    // Check Forgot Password 
    //=========================================================== 
 
    Task<ForgotPasswordCheckResponseDto> CheckForgotPasswordAsync( 
        ForgotPasswordCheckRequestDto request); 
 
 
    //=========================================================== 
    // Confirm Forgot Password 
    //=========================================================== 
 
    Task<LoginResponseDto> ConfirmForgotPasswordAsync( 
        ForgotPasswordConfirmRequestDto request); 
}