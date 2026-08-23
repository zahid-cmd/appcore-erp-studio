//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Persistence;


//===============================================================
// Application Database Context Factory
//===============================================================

public class AppDbContextFactory
    : IDesignTimeDbContextFactory<AppDbContext>
{

    //===========================================================
    // Create Database Context
    //===========================================================

    public AppDbContext CreateDbContext
    (
        string[] args
    )
    {
        //=======================================================
        // Build Configuration
        //=======================================================

        var basePath =
            Path.Combine
            (
                Directory.GetCurrentDirectory(),

                "..",

                "AppCore.API"
            );


        var configuration =
            new ConfigurationBuilder()

                .SetBasePath
                (
                    Path.GetFullPath
                    (
                        basePath
                    )
                )

                .AddJsonFile
                (
                    "appsettings.json",

                    optional: false
                )

                .Build();


        //=======================================================
        // Get Connection String
        //=======================================================

        var connectionString =
            configuration.GetConnectionString
            (
                "DefaultConnection"
            );


        //=======================================================
        // Configure DbContext
        //=======================================================

        var optionsBuilder =
            new DbContextOptionsBuilder<AppDbContext>();


        optionsBuilder.UseNpgsql
        (
            connectionString
        );


        //=======================================================
        // Return DbContext
        //=======================================================

        return new AppDbContext
        (
            optionsBuilder.Options
        );
    }
}