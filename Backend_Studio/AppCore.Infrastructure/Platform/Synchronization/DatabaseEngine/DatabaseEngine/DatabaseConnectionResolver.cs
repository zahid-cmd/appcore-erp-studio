//===============================================================
// Namespaces
//===============================================================

using System;
using System.Threading.Tasks;

using Microsoft.Extensions.Configuration;


//===============================================================
// Database Connection Resolver
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.DatabaseEngine;


//===============================================================
// Database Connection Resolver
//===============================================================

public class DatabaseConnectionResolver
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IConfiguration _configuration;


    //===========================================================
    // Constructor
    //===========================================================

    public DatabaseConnectionResolver
    (
        IConfiguration configuration
    )
    {
        _configuration =
            configuration;
    }


    //===========================================================
    // Resolve Connection String
    //===========================================================

    public Task<string> ResolveAsync()
    {
        var connectionString =
            _configuration.GetConnectionString(
                "DefaultConnection"
            );


        if
        (
            string.IsNullOrWhiteSpace(
                connectionString
            )
        )
        {
            throw new InvalidOperationException(
                "The DefaultConnection connection string could not be found."
            );
        }


        return Task.FromResult(
            connectionString
        );
    }
}