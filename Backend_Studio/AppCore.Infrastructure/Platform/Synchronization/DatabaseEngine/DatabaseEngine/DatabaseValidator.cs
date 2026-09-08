//=============================================================== 
// Namespaces 
//=============================================================== 
 
using System; 
using System.IO; 
 
 
//=============================================================== 
// Namespace 
//=============================================================== 
 
namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.DatabaseEngine 
{ 
 
    //=========================================================== 
    // Database Validator 
    //=========================================================== 
 
    public sealed class DatabaseValidator 
    { 
 
        //======================================================= 
        // Validate Synchronization ID 
        //======================================================= 
 
        public void 
            ValidateSynchronizationId 
        ( 
            long submenuId 
        ) 
        { 
            if 
            ( 
                submenuId <= 0 
            ) 
            { 
                throw new ArgumentException 
                ( 
                    "Submenu ID must be greater than zero.", 
                    nameof(submenuId) 
                ); 
            } 
        } 
 
 
 
        //======================================================= 
        // Validate Database Project 
        //======================================================= 
 
        public void 
            ValidateProject 
        ( 
            DatabaseProject project 
        ) 
        { 
            if 
            ( 
                project == null 
            ) 
            { 
                throw new InvalidOperationException 
                ( 
                    "Database project could not be resolved." 
                ); 
            } 
 
 
            //=================================================== 
            // Validate Infrastructure Project 
            //=================================================== 
 
            if 
            ( 
                string.IsNullOrWhiteSpace 
                ( 
                    project.InfrastructureProject 
                ) 
            ) 
            { 
                throw new InvalidOperationException 
                ( 
                    "AppCore.Infrastructure project path is required." 
                ); 
            } 
 
 
            if 
            ( 
                !Directory.Exists 
                ( 
                    project.InfrastructureProject 
                ) 
            ) 
            { 
                throw new DirectoryNotFoundException 
                ( 
                    $"AppCore.Infrastructure project directory does not exist: {project.InfrastructureProject}" 
                ); 
            } 
 
 
            if 
            ( 
                string.IsNullOrWhiteSpace 
                ( 
                    project.InfrastructureProjectFile 
                ) 
                || 
                !File.Exists 
                ( 
                    project.InfrastructureProjectFile 
                ) 
            ) 
            { 
                throw new FileNotFoundException 
                ( 
                    "AppCore.Infrastructure project file was not found.", 
                    project.InfrastructureProjectFile 
                ); 
            } 
 
 
            //=================================================== 
            // Validate API Project 
            //=================================================== 
 
            if 
            ( 
                string.IsNullOrWhiteSpace 
                ( 
                    project.ApiProject 
                ) 
            ) 
            { 
                throw new InvalidOperationException 
                ( 
                    "AppCore.API project path is required." 
                ); 
            } 
 
 
            if 
            ( 
                !Directory.Exists 
                ( 
                    project.ApiProject 
                ) 
            ) 
            { 
                throw new DirectoryNotFoundException 
                ( 
                    $"AppCore.API project directory does not exist: {project.ApiProject}" 
                ); 
            } 
 
 
            if 
            ( 
                string.IsNullOrWhiteSpace 
                ( 
                    project.ApiProjectFile 
                ) 
                || 
                !File.Exists 
                ( 
                    project.ApiProjectFile 
                ) 
            ) 
            { 
                throw new FileNotFoundException 
                ( 
                    "AppCore API project file was not found.", 
                    project.ApiProjectFile 
                ); 
            } 
 
 
            //=================================================== 
            // Validate Migrations Path 
            //=================================================== 
 
            if 
            ( 
                string.IsNullOrWhiteSpace 
                ( 
                    project.MigrationsPath 
                ) 
            ) 
            { 
                throw new InvalidOperationException 
                ( 
                    "Migrations path is required." 
                ); 
            } 
 
 
            if 
            ( 
                !Directory.Exists 
                ( 
                    project.MigrationsPath 
                ) 
            ) 
            { 
                throw new DirectoryNotFoundException 
                ( 
                    $"Migrations directory does not exist: {project.MigrationsPath}" 
                ); 
            } 
        } 
 
 
 
        //======================================================= 
        // Validate Migration 
        //======================================================= 
 
        public void 
            ValidateMigration 
        ( 
            string migrationFile, 
 
            long submenuId 
        ) 
        { 
            if 
            ( 
                string.IsNullOrWhiteSpace 
                ( 
                    migrationFile 
                ) 
            ) 
            { 
                throw new InvalidOperationException 
                ( 
                    $"Migration for Submenu ID {submenuId} could not be located." 
                ); 
            } 
 
 
            if 
            ( 
                !File.Exists 
                ( 
                    migrationFile 
                ) 
            ) 
            { 
                throw new FileNotFoundException 
                ( 
                    $"Migration file for Submenu ID {submenuId} was not found.", 
                    migrationFile 
                ); 
            } 
 
 
            var fileName = 
                Path.GetFileNameWithoutExtension 
                ( 
                    migrationFile 
                ); 
 
 
            //=================================================== 
            // Validate Migration Name 
            //=================================================== 
 
            if 
            ( 
                string.IsNullOrWhiteSpace 
                ( 
                    fileName 
                ) 
                || 
                !fileName.Contains 
                ( 
                    $"AutoSync_{submenuId}_", 
                    StringComparison.OrdinalIgnoreCase 
                ) 
            ) 
            { 
                throw new InvalidOperationException 
                ( 
                    $"The located migration does not belong to Submenu ID {submenuId}." 
                ); 
            } 
        } 
    } 
}