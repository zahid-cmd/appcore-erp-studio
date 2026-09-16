//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Conventions;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.InfrastructureControl.DevelopmentManagement;

using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;


//===============================================================
// Database Operation Resolver
//===============================================================

namespace AppCore.Infrastructure.Platform.Synchronization.DatabaseEngine.DatabaseEngine;


//===============================================================
// Database Operation Resolver
//===============================================================

public class DatabaseOperationResolver
{
    //===========================================================
    // Dependencies
    //===========================================================

    private readonly AppDbContext
        _context;


    //===========================================================
    // Constructor
    //===========================================================

    public DatabaseOperationResolver
    (
        AppDbContext context
    )
    {
        _context =
            context;
    }


    //===========================================================
    // Resolve Operation
    //===========================================================

    public async Task<string> ResolveAsync
    (
        long synchronizationId
    )
    {
        if
        (
            synchronizationId <= 0
        )
        {
            throw new ArgumentException(
                "Code Synchronization ID must be greater than zero.",
                nameof(synchronizationId)
            );
        }


        //=======================================================
        // Resolve Code Synchronization
        //
        // The Database Engine receives the Code Synchronization
        // ID from the Code Synchronization Controller.
        //
        // Do NOT treat this ID as SubmenuSynchronization.Id.
        //=======================================================

        var codeSynchronization =
            await _context
                .Set<CodeSynchronization>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == synchronizationId
                );


        if
        (
            codeSynchronization == null
        )
        {
            throw new InvalidOperationException(
                $"Code synchronization {synchronizationId} was not found."
            );
        }


        //=======================================================
        // Resolve Submenu Synchronization ID
        //=======================================================

        var submenuSynchronizationId =
            codeSynchronization
                .SubmenuSynchronizationId;


        if
        (
            submenuSynchronizationId <= 0
        )
        {
            throw new InvalidOperationException(
                $"Submenu synchronization reference for code synchronization {synchronizationId} is invalid."
            );
        }


        //=======================================================
        // Resolve Submenu Synchronization
        //=======================================================

        var synchronization =
            await _context
                .Set<SubmenuSynchronization>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id ==
                        submenuSynchronizationId
                );


        if
        (
            synchronization == null
        )
        {
            throw new InvalidOperationException(
                $"Submenu synchronization {submenuSynchronizationId} referenced by code synchronization {synchronizationId} was not found."
            );
        }


        //=======================================================
        // Resolve Entity
        //=======================================================

        var entityType =
            ResolveEntityType
            (
                synchronization
            );


        if
        (
            entityType == null
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database entity for code synchronization {synchronizationId}."
            );
        }


        //=======================================================
        // Resolve Table
        //=======================================================

        var tableName =
            entityType.GetTableName();


        var schemaName =
            entityType.GetSchema();


        if
        (
            string.IsNullOrWhiteSpace(
                tableName
            )
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database table for code synchronization {synchronizationId}."
            );
        }


        //=======================================================
        // Resolve Schema
        //=======================================================

        var qualifiedTableName =
            string.IsNullOrWhiteSpace(
                schemaName
            )
                ?
                $"\"{tableName}\""
                :
                $"\"{schemaName}\".\"{tableName}\"";


        //=======================================================
        // Resolve Columns
        //=======================================================

        var storeObject =
            StoreObjectIdentifier.Table
            (
                tableName,

                schemaName
            );


        var columns =
            entityType
                .GetProperties();


        if
        (
            columns == null
            ||
            !columns.Any()
        )
        {
            throw new InvalidOperationException(
                $"No database columns were found for table '{tableName}'."
            );
        }


        //=======================================================
        // Build SQL
        //=======================================================

        var sql =
            $"CREATE TABLE {qualifiedTableName} (";


        var firstColumn =
            true;


        foreach
        (
            var property in columns
        )
        {
            if
            (
                !firstColumn
            )
            {
                sql += ",";
            }


            var columnName =
                property.GetColumnName(
                    storeObject
                );


            if
            (
                string.IsNullOrWhiteSpace(
                    columnName
                )
            )
            {
                throw new InvalidOperationException(
                    $"Unable to resolve database column for property '{property.Name}' on table '{tableName}'."
                );
            }


            sql +=
                $"{Environment.NewLine}    " +
                $"\"{columnName}\" " +
                $"{ResolvePostgreSqlColumnDefinition(property)}";


            if
            (
                property.IsNullable == false
            )
            {
                sql +=
                    " NOT NULL";
            }


            firstColumn =
                false;
        }


        //=======================================================
        // Primary Key
        //=======================================================

        var primaryKey =
            entityType.FindPrimaryKey();


        if
        (
            primaryKey != null
        )
        {
            var primaryKeyColumns =
                primaryKey
                    .Properties
                    .Select
                    (
                        property =>
                            $"\"{property.GetColumnName(storeObject)}\""
                    );


            sql +=
                "," +
                $"{Environment.NewLine}    " +
                $"CONSTRAINT \"PK_{tableName}\" " +
                $"PRIMARY KEY ({string.Join(", ", primaryKeyColumns)})";
        }


        sql +=
            $"{Environment.NewLine});";


        //=======================================================
        // Return Operation
        //=======================================================

        return sql;
    }


    //===========================================================
    // Resolve Removal Operation
    //===========================================================

    public async Task<string> ResolveRemovalAsync
    (
        long synchronizationId
    )
    {
        if
        (
            synchronizationId <= 0
        )
        {
            throw new ArgumentException(
                "Code Synchronization ID must be greater than zero.",
                nameof(synchronizationId)
            );
        }


        //=======================================================
        // Resolve Code Synchronization
        //
        // The Database Engine receives the Code Synchronization
        // ID from the Code Synchronization Controller.
        //
        // Do NOT treat this ID as SubmenuSynchronization.Id.
        //=======================================================

        var codeSynchronization =
            await _context
                .Set<CodeSynchronization>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == synchronizationId
                );


        if
        (
            codeSynchronization == null
        )
        {
            throw new InvalidOperationException(
                $"Code synchronization {synchronizationId} was not found."
            );
        }


        //=======================================================
        // Resolve Submenu Synchronization ID
        //=======================================================

        var submenuSynchronizationId =
            codeSynchronization
                .SubmenuSynchronizationId;


        if
        (
            submenuSynchronizationId <= 0
        )
        {
            throw new InvalidOperationException(
                $"Submenu synchronization reference for code synchronization {synchronizationId} is invalid."
            );
        }


        //=======================================================
        // Resolve Submenu Synchronization
        //=======================================================

        var synchronization =
            await _context
                .Set<SubmenuSynchronization>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id ==
                        submenuSynchronizationId
                );


        if
        (
            synchronization == null
        )
        {
            throw new InvalidOperationException(
                $"Submenu synchronization {submenuSynchronizationId} referenced by code synchronization {synchronizationId} was not found."
            );
        }


        //=======================================================
        // Resolve Entity
        //=======================================================

        var entityType =
            ResolveEntityType
            (
                synchronization
            );


        if
        (
            entityType == null
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database entity for code synchronization {synchronizationId}."
            );
        }


        //=======================================================
        // Resolve Table
        //=======================================================

        var tableName =
            entityType.GetTableName();


        var schemaName =
            entityType.GetSchema();


        if
        (
            string.IsNullOrWhiteSpace(
                tableName
            )
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database table for code synchronization {synchronizationId}."
            );
        }


        //=======================================================
        // Resolve Schema
        //=======================================================

        var qualifiedTableName =
            string.IsNullOrWhiteSpace(
                schemaName
            )
                ?
                $"\"{tableName}\""
                :
                $"\"{schemaName}\".\"{tableName}\"";


        //=======================================================
        // Build Removal SQL
        //=======================================================

        var sql =
            $"DROP TABLE IF EXISTS {qualifiedTableName} CASCADE;";


        //=======================================================
        // Return Removal Operation
        //=======================================================

        return sql;
    }


    //===========================================================
    // Resolve Entity Type
    //===========================================================

    private IReadOnlyEntityType?
        ResolveEntityType
    (
        SubmenuSynchronization synchronization
    )
    {
        //=======================================================
        // Resolve Entity File
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace(
                synchronization.BackendSubMenuEntityFile
            )
        )
        {
            return null;
        }


        //=======================================================
        // Resolve Entity Name
        //=======================================================

        var entityName =
            Path.GetFileNameWithoutExtension
            (
                synchronization.BackendSubMenuEntityFile
            );


        if
        (
            string.IsNullOrWhiteSpace(
                entityName
            )
        )
        {
            return null;
        }


        //=======================================================
        // Resolve Domain Assembly
        //=======================================================

        var domainAssembly =
            typeof(SubmenuSynchronization)
                .Assembly;


        //=======================================================
        // Resolve CLR Type
        //=======================================================

        var entityClrType =
            domainAssembly
                .GetTypes()
                .FirstOrDefault
                (
                    type =>
                        type.IsClass
                        &&
                        !type.IsAbstract
                        &&
                        string.Equals
                        (
                            type.Name,

                            entityName,

                            StringComparison.Ordinal
                        )
                );


        if
        (
            entityClrType == null
        )
        {
            return null;
        }


        //=======================================================
        // Resolve Existing EF Entity Type
        //
        // If the entity is already registered in the running
        // EF model, use the existing metadata.
        //=======================================================

        var existingEntityType =
            _context
                .Model
                .FindEntityType
                (
                    entityClrType
                );


        if
        (
            existingEntityType != null
        )
        {
            return existingEntityType;
        }


        //=======================================================
        // Build Fresh EF Metadata
        //
        // The Registration Engine may have added the entity to
        // AppDbContext.cs after the current API process started.
        //
        // The running DbContext model may therefore not contain
        // the newly registered entity.
        //
        // Build a fresh model for the target entity so Database
        // Creation does not require a manual API rebuild.
        //=======================================================

        var conventionSet =
            ConventionSet
                .CreateConventionSet
                (
                    _context
                );


        var modelBuilder =
            new ModelBuilder
            (
                conventionSet
            );


        //=======================================================
        // Register Target Entity
        //=======================================================

        modelBuilder
            .Entity
            (
                entityClrType
            );


        //=======================================================
        // Apply Entity Configurations
        //
        // Apply only the configuration belonging to the target
        // entity.
        //=======================================================

        modelBuilder
            .ApplyConfigurationsFromAssembly
            (
                typeof(AppDbContext).Assembly,

                configurationType =>
                {
                    //===================================================
                    // Resolve Configuration Interface
                    //===================================================

                    Type?
                        configurationInterface =
                            configurationType
                                .GetInterfaces()
                                .FirstOrDefault
                                (
                                    interfaceType =>
                                        interfaceType.IsGenericType
                                        &&
                                        interfaceType
                                            .GetGenericTypeDefinition()
                                            ==
                                        typeof
                                        (
                                            IEntityTypeConfiguration<>
                                        )
                                );


                    //===================================================
                    // Configuration Interface Not Found
                    //===================================================

                    if
                    (
                        configurationInterface
                        ==
                        null
                    )
                    {
                        return
                            false;
                    }


                    //===================================================
                    // Resolve Configuration Entity Type
                    //===================================================

                    var configurationEntityType =
                        configurationInterface
                            .GetGenericArguments()
                            [0];


                    //===================================================
                    // Apply Only Target Entity Configuration
                    //===================================================

                    return
                        configurationEntityType
                        ==
                        entityClrType;
                }
            );


        //=======================================================
        // Resolve Fresh EF Entity Type
        //=======================================================

        var freshEntityType =
            modelBuilder
                .Model
                .FindEntityType
                (
                    entityClrType
                );


        return freshEntityType;
    }


    //===========================================================
    // Resolve PostgreSQL Column Definition
    //===========================================================

    private string
        ResolvePostgreSqlColumnDefinition
    (
        IReadOnlyProperty property
    )
    {
        var postgreSqlType =
            ResolvePostgreSqlType(
                property
            );


        //=======================================================
        // Resolve Database Generated Value
        //=======================================================

        if
        (
            property.ValueGenerated ==
            ValueGenerated.OnAdd
        )
        {
            if
            (
                property.ClrType == typeof(long)
                ||
                property.ClrType == typeof(int)
                ||
                Nullable.GetUnderlyingType(
                    property.ClrType
                ) == typeof(long)
                ||
                Nullable.GetUnderlyingType(
                    property.ClrType
                ) == typeof(int)
            )
            {
                return
                    $"{postgreSqlType} " +
                    "GENERATED BY DEFAULT AS IDENTITY";
            }


            throw new InvalidOperationException(
                $"Database-generated property '{property.Name}' uses unsupported PostgreSQL identity type '{property.ClrType.Name}'."
            );
        }


        return
            postgreSqlType;
    }


    //===========================================================
    // Resolve PostgreSQL Type
    //===========================================================

    private string
        ResolvePostgreSqlType
    (
        IReadOnlyProperty property
    )
    {
        var clrType =
            Nullable.GetUnderlyingType(
                property.ClrType
            )
            ??
            property.ClrType;


        if
        (
            clrType == typeof(long)
        )
        {
            return "bigint";
        }


        if
        (
            clrType == typeof(int)
        )
        {
            return "integer";
        }


        if
        (
            clrType == typeof(bool)
        )
        {
            return "boolean";
        }


        if
        (
            clrType == typeof(DateTime)
        )
        {
            return "timestamp with time zone";
        }


        if
        (
            clrType == typeof(Guid)
        )
        {
            return "uuid";
        }


        if
        (
            clrType == typeof(string)
        )
        {
            var maxLength =
                property.GetMaxLength();


            if
            (
                maxLength.HasValue
            )
            {
                return
                    $"character varying({maxLength.Value})";
            }


            return "text";
        }


        throw new InvalidOperationException(
            $"Unsupported database property type '{property.ClrType.Name}'."
        );
    }
}