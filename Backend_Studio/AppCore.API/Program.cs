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

var builder =
    WebApplication.CreateBuilder(
        args
    );


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
    builder.Configuration
);


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


//===============================================================
// JWT Key Validation
//===============================================================

if
(
    string.IsNullOrWhiteSpace(
        jwtKey
    )
)
{
    throw new InvalidOperationException(
        "JWT configuration 'Jwt:Key' is not configured."
    );
}


//===============================================================
// Authentication
//===============================================================

builder.Services.AddAuthentication(
    JwtBearerDefaults.AuthenticationScheme
)
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
                        jwtIssuer
                    ),

                ValidIssuer =
                    jwtIssuer,

                ValidateAudience =
                    !string.IsNullOrWhiteSpace(
                        jwtAudience
                    ),

                ValidAudience =
                    jwtAudience,

                ValidateLifetime =
                    true,

                ClockSkew =
                    TimeSpan.Zero
            };
    }
);


//===============================================================
// Authorization
//===============================================================

builder.Services.AddAuthorization();


//===============================================================
// CORS
//===============================================================
//
// The Angular frontend runs on:
//
//     http://localhost:4100
//
// The API / uploaded files run on:
//
//     http://localhost:5100
//
// CORS is required when Angular HttpClient retrieves
// uploaded images as Blob resources.
//
//===============================================================

builder.Services.AddCors(
    options =>
    {
        options.AddPolicy(
            "AllowAll",
            policy =>
            {
                policy
                    .AllowAnyOrigin()
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            }
        );
    }
);


//===============================================================
// Build Application
//===============================================================

var app =
    builder.Build();


//===============================================================
// Swagger Middleware
//===============================================================

if
(
    app.Environment.IsDevelopment()
)
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

app.UseCors(
    "AllowAll"
);


//===============================================================
// Static Files
//===============================================================
//
// Serves:
//
//     wwwroot/
//
// Including:
//
//     wwwroot/uploads/
//
// Example:
//
//     wwwroot/uploads/sub-ordinate-components/1/light-image.png
//
// Browser URL:
//
//     /uploads/sub-ordinate-components/1/light-image.png
//
//===============================================================

app.UseStaticFiles();


//===============================================================
// Ensure Upload Directory Exists
//===============================================================
//
// All uploaded files are stored under:
//
//     wwwroot/uploads/
//
//===============================================================

string uploadsPath =
    Path.Combine(
        app.Environment.WebRootPath
        ??
        Path.Combine(
            app.Environment.ContentRootPath,
            "wwwroot"
        ),
        "uploads"
    );


Directory.CreateDirectory(
    uploadsPath
);


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