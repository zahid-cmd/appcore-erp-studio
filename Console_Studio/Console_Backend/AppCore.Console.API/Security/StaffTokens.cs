//===============================================================
// Staff login tokens (JWT, HS256)
//===============================================================

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

using Microsoft.IdentityModel.Tokens;

using AppCore.Console.API.Data;

namespace AppCore.Console.API.Security;


public class StaffTokens
{
    private readonly IConfiguration _config;

    public StaffTokens(IConfiguration config)
    {
        _config = config;
    }

    public (string Token, DateTime ExpiresUtc) Create(StaffUser user, StaffRole role)
    {
        DateTime expires =
            DateTime.UtcNow.AddHours(_config.GetValue("Jwt:Hours", 8));

        Claim[] claims =
        [
            new(JwtRegisteredClaimNames.Sub, user.StaffUserId.ToString()),
            new(ClaimTypes.NameIdentifier, user.StaffUserId.ToString()),
            new(ClaimTypes.Name, user.FullName),
            new("login", user.LoginId),
            new(ClaimTypes.Role, role.RoleCode),
            new("pwd_change", user.MustChangePassword ? "1" : "0")
        ];

        SigningCredentials credentials =
            new(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!)), SecurityAlgorithms.HmacSha256);

        JwtSecurityToken token =
            new(_config["Jwt:Issuer"], _config["Jwt:Audience"], claims, expires: expires, signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }
}
