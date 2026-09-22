//===============================================================
// Namespaces
//===============================================================

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

using AppCore.Application.Platform.Authentication.DTOs;
using AppCore.Application.Platform.Authentication.Interfaces;

using AppCore.Domain.Entities.SecurityPermission.UserManagement;
using AppCore.Domain.Platform.Authentication;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.Authentication.Service;


//===============================================================
// Authentication Service
//===============================================================

public class AuthenticationService
    : IAuthenticationService
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly IAuthenticationRepository
        _authenticationRepository;

    private readonly IConfiguration
        _configuration;


    //===========================================================
    // Constructor
    //===========================================================

    public AuthenticationService
    (
        IAuthenticationRepository authenticationRepository,

        IConfiguration configuration
    )
    {
        _authenticationRepository =
            authenticationRepository;

        _configuration =
            configuration;
    }


    //===========================================================
    // Login
    //===========================================================

    public async Task<LoginResponseDto>
        LoginAsync(
            LoginRequestDto request)
    {
        if
        (
            request ==
            null
        )
        {
            return CreateFailureResponse(
                "Login request is required."
            );
        }


        string userName =
            request.UserName?.Trim()
            ??
            string.Empty;

        string password =
            request.Password
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(
                userName)
        )
        {
            return CreateFailureResponse(
                "Login ID is required."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                password)
        )
        {
            return CreateFailureResponse(
                "Password is required."
            );
        }


        UserProfile? userProfile =
            await _authenticationRepository
                .GetUserProfileByUserNameAsync(
                    userName
                );


        if
        (
            userProfile ==
            null
        )
        {
            return CreateFailureResponse(
                "Invalid Login ID or password."
            );
        }


        if
        (
            userProfile.IsDeleted
        )
        {
            return CreateFailureResponse(
                "This user account is no longer available."
            );
        }


        if
        (
            !userProfile.IsActive
        )
        {
            return CreateFailureResponse(
                "This user account is not active."
            );
        }


        UserCredential? credential =
            await _authenticationRepository
                .GetUserCredentialByUserProfileIdAsync(
                    userProfile.UserProfileId
                );


        if
        (
            credential ==
            null
            ||
            string.IsNullOrWhiteSpace(
                credential.PasswordHash)
        )
        {
            return CreateFailureResponse(
                "Login credentials are not configured for this user."
            );
        }


        bool passwordValid =
            VerifyPassword(
                password,
                credential.PasswordHash
            );


        if
        (
            !passwordValid
        )
        {
            return CreateFailureResponse(
                "Invalid Login ID or password."
            );
        }


        string token =
            GenerateToken(
                userProfile
            );


        return new LoginResponseDto
        {
            Success =
                true,

            Message =
                "Login successful.",

            Token =
                token,

            UserProfileId =
                userProfile.UserProfileId,

            UserName =
                userProfile.UserName,

            DisplayName =
                userProfile.DisplayName
        };
    }


    //===========================================================
    // Register
    //===========================================================

    public async Task<LoginResponseDto>
        RegisterAsync(
            RegisterRequestDto request)
    {
        if
        (
            request ==
            null
        )
        {
            return CreateFailureResponse(
                "Registration request is required."
            );
        }


        string userName =
            request.UserName?.Trim()
            ??
            string.Empty;

        string displayName =
            request.DisplayName?.Trim()
            ??
            string.Empty;

        string fullName =
            request.FullName?.Trim()
            ??
            string.Empty;

        string email =
            request.Email?.Trim()
            ??
            string.Empty;

        string mobileNo =
            request.MobileNo?.Trim()
            ??
            string.Empty;

        string password =
            request.Password
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(
                userName)
        )
        {
            return CreateFailureResponse(
                "User Name is required."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                displayName)
        )
        {
            return CreateFailureResponse(
                "Display Name is required."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                fullName)
        )
        {
            return CreateFailureResponse(
                "Full Name is required."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                email)
        )
        {
            return CreateFailureResponse(
                "Email is required."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                mobileNo)
        )
        {
            return CreateFailureResponse(
                "Mobile Number is required."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                password)
        )
        {
            return CreateFailureResponse(
                "Password is required."
            );
        }


        if
        (
            password.Length <
            8
        )
        {
            return CreateFailureResponse(
                "Password must contain at least 8 characters."
            );
        }


        UserProfile? existingUser =
            await _authenticationRepository
                .GetUserProfileByUserNameAsync(
                    userName
                );


        if
        (
            existingUser !=
            null
        )
        {
            return CreateFailureResponse(
                "The Login ID is already registered."
            );
        }


        UserProfile userProfile =
            new UserProfile
            {
                ProfileCode =
                    string.Empty,

                UserName =
                    userName,

                DisplayName =
                    displayName,

                FullName =
                    fullName,

                Email =
                    email,

                MobileNo =
                    mobileNo,

                IsActive =
                    false,

                IsDeleted =
                    false,

                DeletedBy =
                    null,

                DeletedDate =
                    null,

                CreatedBy =
                    0,

                CreatedDate =
                    DateTime.UtcNow,

                ModifiedBy =
                    null,

                ModifiedDate =
                    null
            };


        UserCredential userCredential =
            new UserCredential
            {
                UserProfileId =
                    0,

                PasswordHash =
                    HashPassword(
                        password
                    ),

                PasswordChangedDate =
                    DateTime.UtcNow,

                CreatedDate =
                    DateTime.UtcNow,

                ModifiedDate =
                    null
            };


        await _authenticationRepository
            .CreateRegistrationAsync(
                userProfile,
                userCredential
            );


        return new LoginResponseDto
        {
            Success =
                true,

            Message =
                "Registration submitted successfully. Your account is awaiting administrator activation.",

            Token =
                string.Empty,

            UserProfileId =
                userProfile.UserProfileId,

            UserName =
                userProfile.UserName,

            DisplayName =
                userProfile.DisplayName
        };
    }


    //===========================================================
    // Forgot Password
    //===========================================================

    public async Task<LoginResponseDto>
        ForgotPasswordAsync(
            ForgotPasswordRequestDto request)
    {
        if
        (
            request ==
            null
        )
        {
            return CreateFailureResponse(
                "Forgot password request is required."
            );
        }


        string userName =
            request.UserName?.Trim()
            ??
            string.Empty;

        string newPassword =
            request.NewPassword
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(
                userName)
        )
        {
            return CreateFailureResponse(
                "Login ID is required."
            );
        }


        if
        (
            string.IsNullOrWhiteSpace(
                newPassword)
        )
        {
            return CreateFailureResponse(
                "New password is required."
            );
        }


        if
        (
            newPassword.Length <
            8
        )
        {
            return CreateFailureResponse(
                "Password must contain at least 8 characters."
            );
        }


        UserProfile? userProfile =
            await _authenticationRepository
                .GetUserProfileByUserNameAsync(
                    userName
                );


        if
        (
            userProfile ==
            null
        )
        {
            return CreateFailureResponse(
                "User account was not found."
            );
        }


        if
        (
            userProfile.IsDeleted
        )
        {
            return CreateFailureResponse(
                "This user account is no longer available."
            );
        }


        if
        (
            !userProfile.IsActive
        )
        {
            return CreateFailureResponse(
                "This user account is not active."
            );
        }


        UserCredential credential =
            await _authenticationRepository
                .EnsureUserCredentialAsync(
                    userProfile.UserProfileId
                );


        credential.PasswordHash =
            HashPassword(
                newPassword
            );

        credential.PasswordChangedDate =
            DateTime.UtcNow;

        credential.ModifiedDate =
            DateTime.UtcNow;


        await _authenticationRepository
            .UpdateCredentialAsync(
                credential
            );


        return new LoginResponseDto
        {
            Success =
                true,

            Message =
                "Password changed successfully.",

            Token =
                string.Empty,

            UserProfileId =
                userProfile.UserProfileId,

            UserName =
                userProfile.UserName,

            DisplayName =
                userProfile.DisplayName
        };
    }


    //===========================================================
    // Password Hash
    //===========================================================

    private static string
        HashPassword(
            string password)
    {
        const int saltSize =
            16;

        const int keySize =
            32;

        const int iterations =
            100000;


        byte[] salt =
            RandomNumberGenerator.GetBytes(
                saltSize
            );


        byte[] hash =
            Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                iterations,
                HashAlgorithmName.SHA256,
                keySize
            );


        return string.Join(
            '.',

            "PBKDF2",

            iterations.ToString(),

            Convert.ToBase64String(
                salt
            ),

            Convert.ToBase64String(
                hash
            )
        );
    }


    //===========================================================
    // Password Verification
    //===========================================================

    private static bool
        VerifyPassword
        (
            string password,

            string storedHash
        )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                password)
            ||
            string.IsNullOrWhiteSpace(
                storedHash)
        )
        {
            return false;
        }


        string[] parts =
            storedHash.Split(
                '.'
            );


        if
        (
            parts.Length !=
            4
        )
        {
            return false;
        }


        if
        (
            !string.Equals(
                parts[0],
                "PBKDF2",
                StringComparison.Ordinal
            )
        )
        {
            return false;
        }


        if
        (
            !int.TryParse(
                parts[1],
                out int iterations)
        )
        {
            return false;
        }


        if
        (
            iterations <=
            0
        )
        {
            return false;
        }


        byte[] salt;

        byte[] expectedHash;


        try
        {
            salt =
                Convert.FromBase64String(
                    parts[2]
                );

            expectedHash =
                Convert.FromBase64String(
                    parts[3]
                );
        }
        catch
        {
            return false;
        }


        byte[] actualHash =
            Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                iterations,
                HashAlgorithmName.SHA256,
                expectedHash.Length
            );


        return CryptographicOperations.FixedTimeEquals(
            actualHash,
            expectedHash
        );
    }


    //===========================================================
    // Generate JWT Token
    //===========================================================

    private string
        GenerateToken(
            UserProfile userProfile)
    {
        string jwtKey =
            _configuration["Jwt:Key"]
            ??
            string.Empty;

        string jwtIssuer =
            _configuration["Jwt:Issuer"]
            ??
            string.Empty;

        string jwtAudience =
            _configuration["Jwt:Audience"]
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(
                jwtKey)
        )
        {
            throw new InvalidOperationException(
                "JWT configuration 'Jwt:Key' is not configured."
            );
        }


        List<Claim> claims =
            new List<Claim>
            {
                new Claim(
                    JwtRegisteredClaimNames.Sub,
                    userProfile.UserProfileId.ToString()
                ),

                new Claim(
                    JwtRegisteredClaimNames.UniqueName,
                    userProfile.UserName
                ),

                new Claim(
                    ClaimTypes.NameIdentifier,
                    userProfile.UserProfileId.ToString()
                ),

                new Claim(
                    ClaimTypes.Name,
                    userProfile.UserName
                ),

                new Claim(
                    "displayName",
                    userProfile.DisplayName
                )
            };


        SymmetricSecurityKey securityKey =
            new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    jwtKey
                )
            );


        SigningCredentials credentials =
            new SigningCredentials(
                securityKey,
                SecurityAlgorithms.HmacSha256
            );


        DateTime expires =
            DateTime.UtcNow.AddHours(
                8
            );


        JwtSecurityToken token =
            new JwtSecurityToken(
                issuer:
                    string.IsNullOrWhiteSpace(
                        jwtIssuer)
                        ? null
                        : jwtIssuer,

                audience:
                    string.IsNullOrWhiteSpace(
                        jwtAudience)
                        ? null
                        : jwtAudience,

                claims:
                    claims,

                notBefore:
                    DateTime.UtcNow,

                expires:
                    expires,

                signingCredentials:
                    credentials
            );


        return new JwtSecurityTokenHandler()
            .WriteToken(
                token
            );
    }


    //===========================================================
    // Failure Response
    //===========================================================

    private static LoginResponseDto
        CreateFailureResponse(
            string message)
    {
        return new LoginResponseDto
        {
            Success =
                false,

            Message =
                message,

            Token =
                string.Empty,

            UserProfileId =
                0,

            UserName =
                string.Empty,

            DisplayName =
                string.Empty
        };
    }
}