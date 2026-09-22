//===============================================================
// Namespaces
//===============================================================

using System.Text;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

using AppCore.Application;
using AppCore.Infrastructure;


//===============================================================
// Builder
//===============================================================

var builder = WebApplication.CreateBuilder(args);


//===============================================================
// Add Controllers
//===============================================================

builder.Services.AddControllers();


//===============================================================
// Swagger
//===============================================================

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen();


//===============================================================
// Application Layer
//===============================================================

builder.Services.AddApplication();


//===============================================================
// Infrastructure Layer
//===============================================================

builder.Services.AddInfrastructure(
    builder.Configuration);


//===============================================================
// JWT Authentication
//===============================================================

string jwtKey =
    builder.Configuration["Jwt:Key"]
    ??
    string.Empty;

string jwtIssuer =
    builder.Configuration["Jwt:Issuer"]
    ??
    string.Empty;

string jwtAudience =
    builder.Configuration["Jwt:Audience"]
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


builder.Services.AddAuthentication(
    JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(
    options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuerSigningKey =
                    true,

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(
                            jwtKey
                        )
                    ),

                ValidateIssuer =
                    !string.IsNullOrWhiteSpace(
                        jwtIssuer),

                ValidIssuer =
                    jwtIssuer,

                ValidateAudience =
                    !string.IsNullOrWhiteSpace(
                        jwtAudience),

                ValidAudience =
                    jwtAudience,

                ValidateLifetime =
                    true,

                ClockSkew =
                    TimeSpan.Zero
            };
    });


//===============================================================
// Authorization
//===============================================================

builder.Services.AddAuthorization();


//===============================================================
// CORS
//===============================================================

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "AllowAll",
        policy =>
        {
            policy.AllowAnyOrigin()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});


//===============================================================
// Build Application
//===============================================================

var app = builder.Build();


//===============================================================
// Swagger Middleware
//===============================================================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();

    app.UseSwaggerUI();
}


//===============================================================
// HTTPS Redirection
//===============================================================

app.UseHttpsRedirection();


//===============================================================
// Routing
//===============================================================

app.UseRouting();


//===============================================================
// CORS
//===============================================================

app.UseCors("AllowAll");


//===============================================================
// Authentication
//===============================================================

app.UseAuthentication();


//===============================================================
// Authorization
//===============================================================

app.UseAuthorization();


//===============================================================
// Map Controllers
//===============================================================

app.MapControllers();


//===============================================================
// Run Application
//===============================================================

app.Run();