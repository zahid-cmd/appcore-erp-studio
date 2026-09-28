//===============================================================
// Namespaces
//===============================================================

using System.Text;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
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
// CORS is therefore required when Angular HttpClient retrieves
// the user profile photo as a Blob.
//
// IMPORTANT:
//
// UseCors() will be placed BEFORE UseStaticFiles() below.
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
//
// Routing is initialized before CORS so that the middleware
// pipeline is ready to process the incoming request.
//
//===============================================================

app.UseRouting();


//===============================================================
// CORS
//===============================================================
//
// IMPORTANT:
//
// CORS MUST execute before static files.
//
// This is especially important for the upcoming profile-photo
// Blob retrieval:
//
//     Angular
//        ↓
//     HttpClient
//        ↓
//     localhost:5100/uploads/...
//        ↓
//     Blob
//
//===============================================================

app.UseCors(
    "AllowAll"
);


//===============================================================
// Static Files - wwwroot
//===============================================================
//
// This serves normal public files from:
//
//     wwwroot/
//
// Example:
//
//     wwwroot/assets/logo.png
//
// URL:
//
//     /assets/logo.png
//
//===============================================================

app.UseStaticFiles();


//===============================================================
// Uploaded Files Directory
//===============================================================
//
// User profile photos are expected under:
//
//     wwwroot/uploads/
//
// Therefore:
//
//     wwwroot/uploads/user-photos/photo.png
//
// is available through:
//
//     /uploads/user-photos/photo.png
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


//===============================================================
// Ensure Upload Directory Exists
//===============================================================

Directory.CreateDirectory(
    uploadsPath
);


//===============================================================
// Static Files - Uploaded Files
//===============================================================
//
// This explicitly exposes the physical uploads directory:
//
//     wwwroot/uploads
//
// through:
//
//     /uploads
//
//===============================================================

app.UseStaticFiles(
    new StaticFileOptions
    {
        FileProvider =
            new PhysicalFileProvider(
                uploadsPath
            ),

        RequestPath =
            "/uploads"
    }
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