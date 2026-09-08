//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.DatabaseEngine
{

    //===========================================================
    // Database Project
    //===========================================================

    public sealed class DatabaseProject
    {

        //=======================================================
        // Infrastructure Project
        //=======================================================

        public string InfrastructureProject
        {
            get;
        }


        public string InfrastructureProjectFile
        {
            get;
        }


        //=======================================================
        // API Project
        //=======================================================

        public string ApiProject
        {
            get;
        }


        public string ApiProjectFile
        {
            get;
        }


        //=======================================================
        // Migrations Path
        //=======================================================

        public string MigrationsPath
        {
            get;
        }



        //=======================================================
        // Constructor
        //=======================================================

        public DatabaseProject
        (
            string infrastructureProject,

            string infrastructureProjectFile,

            string apiProject,

            string apiProjectFile,

            string migrationsPath
        )
        {
            InfrastructureProject =
                infrastructureProject;


            InfrastructureProjectFile =
                infrastructureProjectFile;


            ApiProject =
                apiProject;


            ApiProjectFile =
                apiProjectFile;


            MigrationsPath =
                migrationsPath;
        }
    }



    //===========================================================
    // Database Project Resolver
    //===========================================================

    public sealed class DatabaseProjectResolver
    {

        //=======================================================
        // Resolve
        //=======================================================

        public Task<DatabaseProject>
            ResolveAsync
        (
            CancellationToken cancellationToken
        )
        {
            cancellationToken.ThrowIfCancellationRequested();


            //===================================================
            // Locate Backend Studio Root
            //===================================================

            var currentDirectory =
                new DirectoryInfo
                (
                    Directory.GetCurrentDirectory()
                );


            DirectoryInfo?
                backendStudioRoot =
                    currentDirectory;


            while
            (
                backendStudioRoot != null
            )
            {
                var infrastructureDirectory =
                    Path.Combine
                    (
                        backendStudioRoot.FullName,

                        "AppCore.Infrastructure"
                    );


                var apiDirectory =
                    Path.Combine
                    (
                        backendStudioRoot.FullName,

                        "AppCore.API"
                    );


                var alternateApiDirectory =
                    Path.Combine
                    (
                        backendStudioRoot.FullName,

                        "AppCore.Api"
                    );


                if
                (
                    Directory.Exists
                    (
                        infrastructureDirectory
                    )
                    &&
                    (
                        Directory.Exists
                        (
                            apiDirectory
                        )
                        ||
                        Directory.Exists
                        (
                            alternateApiDirectory
                        )
                    )
                )
                {
                    //===========================================
                    // Resolve API Project
                    //===========================================

                    var resolvedApiDirectory =
                        Directory.Exists
                        (
                            apiDirectory
                        )
                            ?
                            apiDirectory
                            :
                            alternateApiDirectory;


                    //===========================================
                    // Resolve Infrastructure Project File
                    //===========================================

                    var infrastructureProjectFile =
                        Path.Combine
                        (
                            infrastructureDirectory,

                            "AppCore.Infrastructure.csproj"
                        );


                    //===========================================
                    // Resolve API Project File
                    //===========================================

                    var apiProjectFile =
                        Directory.Exists
                        (
                            apiDirectory
                        )
                            ?
                            Path.Combine
                            (
                                resolvedApiDirectory,

                                "AppCore.API.csproj"
                            )
                            :
                            Path.Combine
                            (
                                resolvedApiDirectory,

                                "AppCore.Api.csproj"
                            );


                    //===========================================
                    // Resolve Migrations Directory
                    //===========================================

                    var migrationsPath =
                        Path.Combine
                        (
                            infrastructureDirectory,

                            "Migrations"
                        );


                    //===========================================
                    // Return Database Project
                    //===========================================

                    return Task.FromResult
                    (
                        new DatabaseProject
                        (
                            infrastructureDirectory,

                            infrastructureProjectFile,

                            resolvedApiDirectory,

                            apiProjectFile,

                            migrationsPath
                        )
                    );
                }


                backendStudioRoot =
                    backendStudioRoot.Parent;
            }


            throw new DirectoryNotFoundException
            (
                "Unable to locate the Backend Studio root containing AppCore.Infrastructure and AppCore.API/AppCore.Api."
            );
        }
    }
}