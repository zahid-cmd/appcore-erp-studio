//===============================================================
// Usings
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

namespace AppCore.Application.Platform.Authentication.Services;


//===============================================================
// Authentication Service
//===============================================================

public class AuthenticationService : IAuthenticationService
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IAuthenticationRepository _authenticationRepository;
    private readonly IConfiguration _configuration;


    //===========================================================
    // Constructor
    //===========================================================

    public AuthenticationService(
        IAuthenticationRepository authenticationRepository,
        IConfiguration configuration)
    {
        _authenticationRepository = authenticationRepository;
        _configuration = configuration;
    }


    //===============================================================
    // Login
    //===============================================================

    public async Task<LoginResponseDto> LoginAsync(
        LoginRequestDto request)
    {
        //===========================================================
        // Validate Request
        //===========================================================

        if (request == null)
        {
            return CreateFailureResponse(
                "Invalid login request.");
        }


        //===========================================================
        // Normalize User Name
        //===========================================================

        string userName =
            request.UserName?.Trim() ?? string.Empty;


        //===========================================================
        // Validate User Name
        //===========================================================

        if (string.IsNullOrWhiteSpace(userName))
        {
            return CreateFailureResponse(
                "Login ID is required.");
        }


        //===========================================================
        // Validate Password
        //===========================================================

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return CreateFailureResponse(
                "Password is required.");
        }


        //===========================================================
        // Get User Profile
        //===========================================================

        UserProfile? userProfile =
            await _authenticationRepository
                .GetUserProfileByUserNameAsync(userName);


        //===========================================================
        // User Not Found
        //===========================================================

        if (userProfile == null)
        {
            return CreateFailureResponse(
                "Invalid Login ID or password.");
        }


        //===========================================================
        // Deleted User
        //===========================================================

        if (userProfile.IsDeleted)
        {
            return CreateFailureResponse(
                "Invalid Login ID or password.");
        }


        //===========================================================
        // Inactive User
        //===========================================================

        if (!userProfile.IsActive)
        {
            return CreateFailureResponse(
                "Your Login ID is inactive. Please contact the administrator for activation.");
        }


        //===========================================================
        // Get User Credential
        //===========================================================

        UserCredential? credential =
            await _authenticationRepository
                .GetUserCredentialByUserProfileIdAsync(
                    userProfile.UserProfileId);


        //===========================================================
        // Credential Not Found
        //===========================================================

        if (credential == null ||
            string.IsNullOrWhiteSpace(credential.PasswordHash))
        {
            return CreateFailureResponse(
                "Login credentials are not configured.");
        }


        //===========================================================
        // Verify Password
        //===========================================================

        bool passwordValid =
            VerifyPassword(
                request.Password,
                credential.PasswordHash);


        //===========================================================
        // Invalid Password
        //===========================================================

        if (!passwordValid)
        {
            return CreateFailureResponse(
                "Invalid Login ID or password.");
        }


        //===========================================================
        // Generate Token
        //===========================================================

        string token =
            GenerateToken(userProfile);


        //===========================================================
        // Login Success
        //===========================================================

        return new LoginResponseDto
        {
            Success = true,
            Message = "Login successful.",
            Token = token,
            UserProfileId = userProfile.UserProfileId,
            UserName = userProfile.UserName,
            DisplayName = userProfile.DisplayName
        };
    }


    //===============================================================
    // Register
    //===============================================================

    public async Task<LoginResponseDto> RegisterAsync(
        RegisterRequestDto request)
    {
        //===========================================================
        // Validate Request
        //===========================================================

        if (request == null)
        {
            return CreateFailureResponse(
                "Invalid registration request.");
        }


        //===========================================================
        // Normalize User Name
        //===========================================================

        string userName =
            request.UserName?.Trim() ?? string.Empty;


        //===========================================================
        // Validate User Name
        //===========================================================

        if (string.IsNullOrWhiteSpace(userName))
        {
            return CreateFailureResponse(
                "Login ID is required.");
        }


        //===========================================================
        // Validate Password
        //===========================================================

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return CreateFailureResponse(
                "Password is required.");
        }


        //===========================================================
        // Password Length
        //===========================================================

        if (request.Password.Length < 8)
        {
            return CreateFailureResponse(
                "Password must be at least 8 characters long.");
        }


        //===========================================================
        // Check Existing User
        //===========================================================

        UserProfile? existingUser =
            await _authenticationRepository
                .GetUserProfileByUserNameAsync(userName);


        //===========================================================
        // Existing User
        //===========================================================

        if (existingUser != null)
        {
            return CreateFailureResponse(
                "This Login ID is already registered.");
        }


        //===========================================================
        // Create User Profile
        //===========================================================

        UserProfile userProfile = new UserProfile
        {
            UserName = userName,
            DisplayName = request.DisplayName?.Trim() ?? string.Empty,
            IsActive = false,
            IsDeleted = false,
            CreatedDate = DateTime.UtcNow
        };


        //===========================================================
        // Create User Credential
        //===========================================================

        UserCredential credential = new UserCredential
        {
            PasswordHash =
                HashPassword(request.Password),

            PasswordChangedDate =
                DateTime.UtcNow,

            CreatedDate =
                DateTime.UtcNow
        };


        //===========================================================
        // Create Registration
        //===========================================================

        long userProfileId =
            await _authenticationRepository
                .CreateRegistrationAsync(
                    userProfile,
                    credential);


        //===========================================================
        // Registration Success
        //===========================================================

        return new LoginResponseDto
        {
            Success = true,
            Message =
                "User account created successfully. Please wait for administrator activation.",

            UserProfileId = userProfileId,
            UserName = userProfile.UserName,
            DisplayName = userProfile.DisplayName
        };
    }


    //===============================================================
    // Check Forgot Password
    //===============================================================

    public async Task<ForgotPasswordCheckResponseDto>
        CheckForgotPasswordAsync(
            ForgotPasswordCheckRequestDto request)
    {
        //===========================================================
        // Validate Request
        //===========================================================

        if (request == null)
        {
            return CreateForgotPasswordCheckFailureResponse(
                "Invalid password recovery request.");
        }


        //===========================================================
        // Normalize User Name
        //===========================================================

        string userName =
            request.UserName?.Trim() ?? string.Empty;


        //===========================================================
        // Validate User Name
        //===========================================================

        if (string.IsNullOrWhiteSpace(userName))
        {
            return CreateForgotPasswordCheckFailureResponse(
                "Login ID is required.");
        }


        //===========================================================
        // Get User Profile
        //===========================================================

        UserProfile? userProfile =
            await _authenticationRepository
                .GetUserProfileByUserNameAsync(userName);


        //===========================================================
        // User Not Found
        //===========================================================

        if (userProfile == null)
        {
            return CreateForgotPasswordCheckFailureResponse(
                "Unable to process the password recovery request. Please verify your Login ID.");
        }


        //===========================================================
        // Deleted User
        //===========================================================

        if (userProfile.IsDeleted)
        {
            return CreateForgotPasswordCheckFailureResponse(
                "Unable to process the password recovery request. Please verify your Login ID.");
        }


        //===========================================================
        // Inactive User
        //===========================================================

        if (!userProfile.IsActive)
        {
            return CreateForgotPasswordCheckFailureResponse(
                "Your Login ID is inactive. Please contact the administrator for activation.");
        }


        //===========================================================
        // Invalidate Previous Verification Codes
        //===========================================================

        await _authenticationRepository
            .InvalidatePasswordResetVerificationsAsync(
                userProfile.UserProfileId);


        //===========================================================
        // Generate Verification Code
        //===========================================================

        string verificationCode =
            GenerateVerificationCode();


        //===========================================================
        // Verification Expiration
        //===========================================================

        DateTime now =
            DateTime.UtcNow;

        DateTime expiresAt =
            now.AddMinutes(5);


        //===========================================================
        // Create Verification Entity
        //===========================================================

        PasswordResetVerification verification =
            new PasswordResetVerification
            {
                UserProfileId =
                    userProfile.UserProfileId,

                CodeHash =
                    HashPassword(verificationCode),

                ExpiresAt =
                    expiresAt,

                UsedAt =
                    null,

                AttemptCount =
                    0,

                CreatedDate =
                    now
            };


        //===========================================================
        // Save Verification
        //===========================================================

        await _authenticationRepository
            .CreatePasswordResetVerificationAsync(
                verification);


        //===========================================================
        // Return Verification Code
        //===========================================================
        // The code is intentionally returned to the Forget Password
        // panel according to the current internal ERP design.

        return new ForgotPasswordCheckResponseDto
        {
            Success = true,

            Message =
                "Verification code generated successfully.",

            VerificationCode =
                verificationCode,

            ExpiresAt =
                expiresAt,

            UserProfileId =
                userProfile.UserProfileId
        };
    }


    //===============================================================
    // Confirm Forgot Password
    //===============================================================

    public async Task<LoginResponseDto>
        ConfirmForgotPasswordAsync(
            ForgotPasswordConfirmRequestDto request)
    {
        //===========================================================
        // Validate Request
        //===========================================================

        if (request == null)
        {
            return CreateFailureResponse(
                "Invalid password recovery request.");
        }


        //===========================================================
        // Normalize User Name
        //===========================================================

        string userName =
            request.UserName?.Trim() ?? string.Empty;


        //===========================================================
        // Normalize Verification Code
        //===========================================================

        string verificationCode =
            request.VerificationCode?.Trim() ?? string.Empty;


        //===========================================================
        // Validate User Name
        //===========================================================

        if (string.IsNullOrWhiteSpace(userName))
        {
            return CreateFailureResponse(
                "Login ID is required.");
        }


        //===========================================================
        // Validate Verification Code
        //===========================================================

        if (string.IsNullOrWhiteSpace(verificationCode))
        {
            return CreateFailureResponse(
                "Verification code is required.");
        }


        //===========================================================
        // Validate Verification Code Format
        //===========================================================

        if (verificationCode.Length != 6 ||
            !verificationCode.All(char.IsDigit))
        {
            return CreateFailureResponse(
                "Verification code must be a valid 6-digit code.");
        }


        //===========================================================
        // Validate New Password
        //===========================================================

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return CreateFailureResponse(
                "New password is required.");
        }


        //===========================================================
        // Validate Password Length
        //===========================================================

        if (request.NewPassword.Length < 8)
        {
            return CreateFailureResponse(
                "Password must be at least 8 characters long.");
        }


        //===========================================================
        // Get User Profile
        //===========================================================

        UserProfile? userProfile =
            await _authenticationRepository
                .GetUserProfileByUserNameAsync(userName);


        //===========================================================
        // User Not Found
        //===========================================================

        if (userProfile == null)
        {
            return CreateFailureResponse(
                "Unable to process the password recovery request.");
        }


        //===========================================================
        // Deleted User
        //===========================================================

        if (userProfile.IsDeleted)
        {
            return CreateFailureResponse(
                "Unable to process the password recovery request.");
        }


        //===========================================================
        // Inactive User
        //===========================================================

        if (!userProfile.IsActive)
        {
            return CreateFailureResponse(
                "Your Login ID is inactive. Please contact the administrator for activation.");
        }


        //===========================================================
        // Get Active Verification
        //===========================================================

        PasswordResetVerification? verification =
            await _authenticationRepository
                .GetActivePasswordResetVerificationAsync(
                    userProfile.UserProfileId);


        //===========================================================
        // Verification Not Found / Expired / Used
        //===========================================================

        if (verification == null)
        {
            return CreateFailureResponse(
                "Verification code is invalid or expired. Please request a new code.");
        }


        //===========================================================
        // Verify Expiration
        //===========================================================

        DateTime utcNow =
            DateTime.UtcNow;


        if
        (
            verification.ExpiresAt.ToUniversalTime() <=
            utcNow
        )
        {
            await _authenticationRepository
                .MarkPasswordResetVerificationUsedAsync(
                    verification);

            return CreateFailureResponse(
                "Verification code has expired. Please request a new code.");
        }


        //===========================================================
        // Maximum Attempts
        //===========================================================

        if
        (
            verification.AttemptCount >=
            3
        )
        {
            await _authenticationRepository
                .MarkPasswordResetVerificationUsedAsync(
                    verification);

            return CreateFailureResponse(
                "Too many invalid verification attempts. Please request a new code.");
        }


        //===========================================================
        // Verify Code
        //===========================================================

        bool verificationCodeValid =
            VerifyPassword(
                verificationCode,
                verification.CodeHash);


        //===========================================================
        // Invalid Verification Code
        //===========================================================

        if (!verificationCodeValid)
        {
            await _authenticationRepository
                .IncrementPasswordResetAttemptAsync(
                    verification);


            //=======================================================
            // Maximum Attempts Reached
            //=======================================================

            if
            (
                verification.AttemptCount >=
                3
            )
            {
                await _authenticationRepository
                    .MarkPasswordResetVerificationUsedAsync(
                        verification);

                return CreateFailureResponse(
                    "Too many invalid verification attempts. Please request a new code.");
            }


            //=======================================================
            // Remaining Attempts
            //=======================================================

            int remainingAttempts =
                3 -
                verification.AttemptCount;


            return CreateFailureResponse(
                $"Invalid verification code. {remainingAttempts} attempt(s) remaining.");
        }


        //===========================================================
        // Get User Credential
        //===========================================================

        UserCredential? credential =
            await _authenticationRepository
                .GetUserCredentialByUserProfileIdAsync(
                    userProfile.UserProfileId);


        //===========================================================
        // Credential Not Found
        //===========================================================

        if (credential == null)
        {
            return CreateFailureResponse(
                "Login credentials are not configured.");
        }


        //===========================================================
        // Hash New Password
        //===========================================================

        credential.PasswordHash =
            HashPassword(
                request.NewPassword);

        credential.PasswordChangedDate =
            DateTime.UtcNow;

        credential.ModifiedDate =
            DateTime.UtcNow;


        //===========================================================
        // Update Password
        //===========================================================

        await _authenticationRepository
            .UpdateCredentialAsync(
                credential);


        //===========================================================
        // Mark Verification As Used
        //===========================================================

        await _authenticationRepository
            .MarkPasswordResetVerificationUsedAsync(
                verification);


        //===========================================================
        // Password Reset Success
        //===========================================================

        return new LoginResponseDto
        {
            Success = true,

            Message =
                "Password changed successfully.",

            UserProfileId =
                userProfile.UserProfileId,

            UserName =
                userProfile.UserName,

            DisplayName =
                userProfile.DisplayName
        };
    }


    //===============================================================
    // Generate Verification Code
    //===============================================================

    private static string GenerateVerificationCode()
    {
        int code =
            RandomNumberGenerator.GetInt32(
                100000,
                1000000);

        return code.ToString();
    }


    //===============================================================
    // Hash Password
    //===============================================================

    private static string HashPassword(
        string password)
    {
        const int saltSize = 16;
        const int keySize = 32;
        const int iterations = 100000;

        byte[] salt =
            RandomNumberGenerator.GetBytes(
                saltSize);

        byte[] hash =
            Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                iterations,
                HashAlgorithmName.SHA256,
                keySize);

        return string.Join(
            '.',
            "PBKDF2",
            iterations.ToString(),
            Convert.ToBase64String(salt),
            Convert.ToBase64String(hash));
    }


    //===============================================================
    // Verify Password / Verification Code
    //===============================================================

    private static bool VerifyPassword(
        string password,
        string storedHash)
    {
        try
        {
            string[] parts =
                storedHash.Split('.');


            if
            (
                parts.Length !=
                4
            )
            {
                return false;
            }


            //=======================================================
            // Validate Algorithm
            //=======================================================

            if
            (
                !string.Equals(
                    parts[0],
                    "PBKDF2",
                    StringComparison.Ordinal)
            )
            {
                return false;
            }


            //=======================================================
            // Parse Iterations
            //=======================================================

            if
            (
                !int.TryParse(
                    parts[1],
                    out int iterations)
            )
            {
                return false;
            }


            //=======================================================
            // Validate Iterations
            //=======================================================

            if
            (
                iterations <=
                0
            )
            {
                return false;
            }


            //=======================================================
            // Decode Salt
            //=======================================================

            byte[] salt =
                Convert.FromBase64String(
                    parts[2]);


            //=======================================================
            // Decode Stored Hash
            //=======================================================

            byte[] storedHashBytes =
                Convert.FromBase64String(
                    parts[3]);


            //=======================================================
            // Validate Stored Hash
            //=======================================================

            if
            (
                storedHashBytes.Length ==
                0
            )
            {
                return false;
            }


            //=======================================================
            // Generate Computed Hash
            //=======================================================

            byte[] computedHash =
                Rfc2898DeriveBytes.Pbkdf2(
                    password,
                    salt,
                    iterations,
                    HashAlgorithmName.SHA256,
                    storedHashBytes.Length);


            //=======================================================
            // Fixed-Time Comparison
            //=======================================================

            return CryptographicOperations.FixedTimeEquals(
                computedHash,
                storedHashBytes);
        }
        catch
        {
            return false;
        }
    }


    //===============================================================
    // Generate JWT Token
    //===============================================================

    private string GenerateToken(
        UserProfile userProfile)
    {
        //===========================================================
        // JWT Settings
        //===========================================================

        string secret =
            _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "JWT configuration 'Jwt:Key' is not configured.");

        string issuer =
            _configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException(
                "JWT issuer is not configured.");

        string audience =
            _configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException(
                "JWT audience is not configured.");


        //===========================================================
        // Security Key
        //===========================================================

        SymmetricSecurityKey key =
            new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(secret));


        //===========================================================
        // Credentials
        //===========================================================

        SigningCredentials credentials =
            new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256);


        //===========================================================
        // Claims
        //===========================================================

        List<Claim> claims =
            new List<Claim>
            {
                new Claim(
                    JwtRegisteredClaimNames.Sub,
                    userProfile.UserProfileId.ToString()),

                new Claim(
                    JwtRegisteredClaimNames.UniqueName,
                    userProfile.UserName),

                new Claim(
                    "displayName",
                    userProfile.DisplayName ?? string.Empty)
            };


        //===========================================================
        // Token
        //===========================================================

        JwtSecurityToken token =
            new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: credentials);


        //===========================================================
        // Serialize Token
        //===========================================================

        return new JwtSecurityTokenHandler()
            .WriteToken(token);
    }


    //===============================================================
    // Create Login Failure Response
    //===============================================================

    private static LoginResponseDto CreateFailureResponse(
        string message)
    {
        return new LoginResponseDto
        {
            Success = false,
            Message = message
        };
    }


    //===============================================================
    // Create Forgot Password Check Failure Response
    //===============================================================

    private static ForgotPasswordCheckResponseDto
        CreateForgotPasswordCheckFailureResponse(
            string message)
    {
        return new ForgotPasswordCheckResponseDto
        {
            Success = false,
            Message = message,
            VerificationCode = string.Empty,
            ExpiresAt = null,
            UserProfileId = 0
        };
    }
}