//===============================================================
// Namespaces
//===============================================================

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
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
    // Resolve Creation Operation
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
        //=======================================================

        var codeSynchronization =
            await _context
                .Set<CodeSynchronization>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id ==
                        synchronizationId
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
        // Resolve Submenu Synchronization
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
        // Resolve Target Entity
        //=======================================================

        var targetEntityClrType =
            ResolveEntityClrType(
                synchronization
            );


        if
        (
            targetEntityClrType == null
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database entity for code synchronization {synchronizationId}."
            );
        }


        //=======================================================
        // Resolve Configuration Entity Group
        //
        // IMPORTANT:
        //
        // One configuration class may configure multiple
        // database entities.
        //
        // Example:
        //
        // ActivityAssignmentConfiguration
        //     ├── ActivityAssignment
        //     ├── ActivityAssignmentDetail
        //     └── ActivityAssignmentPermission
        //
        // The same structure can therefore be used for:
        //
        // SpecialAssignmentConfiguration
        //     ├── SpecialAssignment
        //     ├── SpecialAssignmentDetail
        //     └── SpecialAssignmentPermission
        //
        // All entities exposed by the matching configuration
        // class are included in the database operation.
        //=======================================================

        var entityClrTypes =
            ResolveConfigurationEntityTypes(
                targetEntityClrType
            );


        if
        (
            !entityClrTypes.Contains(
                targetEntityClrType
            )
        )
        {
            entityClrTypes.Insert(
                0,
                targetEntityClrType
            );
        }


        //=======================================================
        // Remove Duplicate CLR Types
        //=======================================================

        entityClrTypes =
            entityClrTypes
                .Distinct()
                .ToList();


        //=======================================================
        // Build Fresh EF Model
        //=======================================================

        var model =
            BuildFreshModel(
                entityClrTypes
            );


        //=======================================================
        // Resolve Entity Metadata
        //=======================================================

        var entityTypes =
            entityClrTypes
                .Select
                (
                    clrType =>
                        model.FindEntityType(
                            clrType
                        )
                )
                .Where
                (
                    entityType =>
                        entityType != null
                )
                .Cast<IEntityType>()
                .ToList();


        if
        (
            !entityTypes.Any()
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve EF metadata for database entity '{targetEntityClrType.Name}'."
            );
        }


        //=======================================================
        // Validate Resolved Entity Group
        //=======================================================

        ValidateResolvedEntityGroup(
            targetEntityClrType,
            entityTypes
        );


        //=======================================================
        // Order Entities
        //
        // Parent tables are created before child tables.
        //
        // Example:
        //
        // ActivityAssignments
        //         ↓
        // ActivityAssignmentDetails
        //         ↓
        // ActivityAssignmentPermissions
        //
        // The same dependency ordering is applied to
        // Special Assignment or any other master/detail group.
        //=======================================================

        var orderedEntityTypes =
            OrderEntityTypesForCreation(
                entityTypes
            );


        //=======================================================
        // Build CREATE TABLE Operations
        //=======================================================

        var operations =
            new List<string>();


        foreach
        (
            var entityType
            in orderedEntityTypes
        )
        {
            operations.Add(
                BuildCreateTableSql(
                    entityType
                )
            );
        }


        //=======================================================
        // Return Combined SQL
        //=======================================================

        return
            string.Join(
                $"{Environment.NewLine}{Environment.NewLine}",
                operations
            );
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
        //=======================================================

        var codeSynchronization =
            await _context
                .Set<CodeSynchronization>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id ==
                        synchronizationId
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
        // Resolve Submenu Synchronization
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
        // Resolve Target Entity
        //=======================================================

        var targetEntityClrType =
            ResolveEntityClrType(
                synchronization
            );


        if
        (
            targetEntityClrType == null
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve database entity for code synchronization {synchronizationId}."
            );
        }


        //=======================================================
        // Resolve Configuration Entity Group
        //=======================================================

        var entityClrTypes =
            ResolveConfigurationEntityTypes(
                targetEntityClrType
            );


        if
        (
            !entityClrTypes.Contains(
                targetEntityClrType
            )
        )
        {
            entityClrTypes.Insert(
                0,
                targetEntityClrType
            );
        }


        //=======================================================
        // Remove Duplicate CLR Types
        //=======================================================

        entityClrTypes =
            entityClrTypes
                .Distinct()
                .ToList();


        //=======================================================
        // Build Fresh EF Model
        //=======================================================

        var model =
            BuildFreshModel(
                entityClrTypes
            );


        //=======================================================
        // Resolve Entity Metadata
        //=======================================================

        var entityTypes =
            entityClrTypes
                .Select
                (
                    clrType =>
                        model.FindEntityType(
                            clrType
                        )
                )
                .Where
                (
                    entityType =>
                        entityType != null
                )
                .Cast<IEntityType>()
                .ToList();


        if
        (
            !entityTypes.Any()
        )
        {
            throw new InvalidOperationException(
                $"Unable to resolve EF metadata for database entity '{targetEntityClrType.Name}'."
            );
        }


        //=======================================================
        // Validate Resolved Entity Group
        //=======================================================

        ValidateResolvedEntityGroup(
            targetEntityClrType,
            entityTypes
        );


        //=======================================================
        // Order Entity Types For Removal
        //
        // Child tables are removed before parent tables.
        //=======================================================

        var orderedEntityTypes =
            OrderEntityTypesForRemoval(
                entityTypes
            );


        //=======================================================
        // Build DROP Operations
        //=======================================================

        var operations =
            new List<string>();


        foreach
        (
            var entityType
            in orderedEntityTypes
        )
        {
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
                continue;
            }


            var qualifiedTableName =
                ResolveQualifiedTableName(
                    tableName,
                    schemaName
                );


            operations.Add(
                $"DROP TABLE IF EXISTS {qualifiedTableName} CASCADE;"
            );
        }


        return
            string.Join(
                Environment.NewLine,
                operations
            );
    }



    //===========================================================
    // Resolve Entity CLR Type
    //===========================================================

    private Type?
        ResolveEntityClrType
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
            Path.GetFileNameWithoutExtension(
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

        return
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
    }



    //===========================================================
    // Resolve Configuration Entity Types
    //===========================================================

    private List<Type>
        ResolveConfigurationEntityTypes
    (
        Type targetEntityClrType
    )
    {
        var configurationAssembly =
            typeof(AppDbContext)
                .Assembly;


        //=======================================================
        // Find Configuration Class
        //
        // The configuration class is identified by finding a
        // configuration implementing:
        //
        // IEntityTypeConfiguration<TargetEntity>
        //
        //=======================================================

        var configurationType =
            configurationAssembly
                .GetTypes()
                .Where
                (
                    type =>
                        type.IsClass

                        &&

                        !type.IsAbstract
                )
                .FirstOrDefault
                (
                    type =>
                        ImplementsEntityConfiguration
                        (
                            type,
                            targetEntityClrType
                        )
                );


        //=======================================================
        // No Configuration Class
        //=======================================================

        if
        (
            configurationType == null
        )
        {
            return
                new List<Type>
                {
                    targetEntityClrType
                };
        }


        //=======================================================
        // Resolve ALL Entities From Configuration Class
        //
        // IMPORTANT:
        //
        // We intentionally inspect every
        // IEntityTypeConfiguration<T> implemented by the
        // matching configuration class.
        //
        // Therefore one configuration class can represent a
        // complete database artifact group.
        //
        // Example:
        //
        // ActivityAssignmentConfiguration
        //     ├── ActivityAssignment
        //     ├── ActivityAssignmentDetail
        //     └── ActivityAssignmentPermission
        //
        // SpecialAssignmentConfiguration
        //     ├── SpecialAssignment
        //     ├── SpecialAssignmentDetail
        //     └── SpecialAssignmentPermission
        //=======================================================

        var entityTypes =
            configurationType
                .GetInterfaces()
                .Where
                (
                    interfaceType =>
                        IsEntityConfigurationInterface(
                            interfaceType
                        )
                )
                .Select
                (
                    interfaceType =>
                        interfaceType
                            .GetGenericArguments()
                            [0]
                )
                .Distinct()
                .ToList();


        //=======================================================
        // Always Include Target Entity
        //=======================================================

        if
        (
            !entityTypes.Contains(
                targetEntityClrType
            )
        )
        {
            entityTypes.Insert(
                0,
                targetEntityClrType
            );
        }


        return entityTypes;
    }



    //===========================================================
    // Implements Entity Configuration
    //===========================================================

    private bool
        ImplementsEntityConfiguration
    (
        Type configurationType,
        Type targetEntityClrType
    )
    {
        return
            configurationType
                .GetInterfaces()
                .Any
                (
                    interfaceType =>
                        IsEntityConfigurationInterface(
                            interfaceType
                        )

                        &&

                        interfaceType
                            .GetGenericArguments()
                            [0]
                            ==
                        targetEntityClrType
                );
    }



    //===========================================================
    // Is Entity Configuration Interface
    //===========================================================

    private bool
        IsEntityConfigurationInterface
    (
        Type interfaceType
    )
    {
        return
            interfaceType.IsGenericType

            &&

            interfaceType
                .GetGenericTypeDefinition()
                ==
            typeof(
                IEntityTypeConfiguration<>
            );
    }



    //===========================================================
    // Validate Resolved Entity Group
    //===========================================================

    private void
        ValidateResolvedEntityGroup
    (
        Type targetEntityClrType,
        List<IEntityType> entityTypes
    )
    {
        //=======================================================
        // Target Entity Must Exist
        //=======================================================

        var targetEntityType =
            entityTypes
                .FirstOrDefault
                (
                    entityType =>
                        entityType.ClrType ==
                        targetEntityClrType
                );


        if
        (
            targetEntityType == null
        )
        {
            throw new InvalidOperationException(
                $"Resolved database entity group does not contain target entity '{targetEntityClrType.Name}'."
            );
        }


        //=======================================================
        // Every Entity Must Have a Table
        //=======================================================

        foreach
        (
            var entityType
            in entityTypes
        )
        {
            if
            (
                string.IsNullOrWhiteSpace(
                    entityType.GetTableName()
                )
            )
            {
                throw new InvalidOperationException(
                    $"Unable to resolve database table for entity '{entityType.ClrType.Name}'."
                );
            }
        }
    }



    //===========================================================
    // Build Fresh EF Model
    //===========================================================

    private IMutableModel
        BuildFreshModel
    (
        List<Type> entityClrTypes
    )
    {
        //=======================================================
        // Convention Set
        //=======================================================

        var conventionSet =
            ConventionSet
                .CreateConventionSet(
                    _context
                );


        //=======================================================
        // Model Builder
        //=======================================================

        var modelBuilder =
            new ModelBuilder(
                conventionSet
            );


        //=======================================================
        // Register Target Entity Group
        //=======================================================

        foreach
        (
            var entityClrType
            in entityClrTypes
        )
        {
            modelBuilder
                .Entity(
                    entityClrType
                );
        }


        //=======================================================
        // Entity Type Set
        //=======================================================

        var entityTypeSet =
            entityClrTypes
                .ToHashSet();


        //=======================================================
        // Resolve Configuration Dependencies
        //
        // IMPORTANT:
        //
        // A target entity may depend on another entity through a
        // foreign key relationship.
        //
        // Example:
        //
        // Wings
        //     └── Company
        //
        // The target database operation must still apply the
        // CompanyConfiguration so that the principal table name
        // and column metadata are resolved correctly.
        //
        // The dependent entity is NOT added to entityClrTypes.
        // Therefore its table is NOT created or removed by this
        // synchronization operation.
        //
        // Its configuration is applied only so that EF can build
        // the correct relationship metadata.
        //=======================================================

        var configurationEntityTypes =
            ResolveConfigurationDependencyTypes(
                entityClrTypes
            );


        //=======================================================
        // Apply Only Matching Configuration Classes
        //
        // IMPORTANT:
        //
        // A configuration class is selected when ANY of its
        // IEntityTypeConfiguration<T> interfaces belongs to the
        // resolved entity group or one of its foreign-key
        // dependencies.
        //
        // This preserves the existing grouped configuration
        // behavior while also allowing dependent entities such
        // as Company to contribute their table mapping.
        //
        // Unrelated configuration classes are NOT applied.
        //=======================================================

        modelBuilder
            .ApplyConfigurationsFromAssembly
            (
                typeof(AppDbContext).Assembly,

                configurationType =>
                {
                    var configurationTypes =
                        configurationType
                            .GetInterfaces()
                            .Where
                            (
                                interfaceType =>
                                    IsEntityConfigurationInterface(
                                        interfaceType
                                    )
                            )
                            .Select
                            (
                                interfaceType =>
                                    interfaceType
                                        .GetGenericArguments()
                                        [0]
                            )
                            .ToList();


                    if
                    (
                        !configurationTypes.Any()
                    )
                    {
                        return false;
                    }


                    return
                        configurationTypes
                            .Any
                            (
                                configurationEntityTypes.Contains
                            );
                }
            );


        //=======================================================
        // Return Mutable Model
        //=======================================================

        return
            modelBuilder
                .Model;
    }



    //===========================================================
    // Resolve Configuration Dependency Types
    //===========================================================

    private HashSet<Type>
        ResolveConfigurationDependencyTypes
    (
        List<Type> entityClrTypes
    )
    {
        var configurationEntityTypes =
            entityClrTypes
                .ToHashSet();


        //=======================================================
        // Resolve Foreign-Key Dependencies
        //=======================================================

        foreach
        (
            var entityClrType
            in entityClrTypes
        )
        {
            var entityType =
                _context.Model.FindEntityType(
                    entityClrType
                );


            if
            (
                entityType == null
            )
            {
                continue;
            }


            foreach
            (
                var foreignKey
                in entityType.GetForeignKeys()
            )
            {
                var principalClrType =
                    foreignKey
                        .PrincipalEntityType
                        .ClrType;


                configurationEntityTypes.Add(
                    principalClrType
                );
            }
        }


        return configurationEntityTypes;
    }



    //===========================================================
    // Order Entity Types For Creation
    //===========================================================

    private List<IEntityType>
        OrderEntityTypesForCreation
    (
        List<IEntityType> entityTypes
    )
    {
        var result =
            new List<IEntityType>();


        var remaining =
            new HashSet<IEntityType>(
                entityTypes
            );


        //=======================================================
        // Parent Before Child
        //=======================================================

        while
        (
            remaining.Any()
        )
        {
            var addedAny =
                false;


            foreach
            (
                var entityType
                in remaining.ToList()
            )
            {
                var foreignKeys =
                    entityType
                        .GetForeignKeys()
                        .ToList();


                var dependsOnRemainingEntity =
                    foreignKeys.Any
                    (
                        foreignKey =>
                            remaining.Contains(
                                foreignKey.PrincipalEntityType
                            )
                    );


                if
                (
                    !dependsOnRemainingEntity
                )
                {
                    result.Add(
                        entityType
                    );


                    remaining.Remove(
                        entityType
                    );


                    addedAny =
                        true;
                }
            }


            //===================================================
            // Circular Relationship Protection
            //===================================================

            if
            (
                !addedAny
            )
            {
                result.AddRange(
                    remaining
                );


                break;
            }
        }


        return result;
    }



    //===========================================================
    // Order Entity Types For Removal
    //===========================================================

    private List<IEntityType>
        OrderEntityTypesForRemoval
    (
        List<IEntityType> entityTypes
    )
    {
        var ordered =
            OrderEntityTypesForCreation(
                entityTypes
            );


        ordered.Reverse();


        return ordered;
    }



    //===========================================================
    // Build CREATE TABLE SQL
    //===========================================================

    private string
        BuildCreateTableSql
    (
        IEntityType entityType
    )
    {
        //=======================================================
        // Table
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
                $"Unable to resolve database table for entity '{entityType.ClrType.Name}'."
            );
        }


        //=======================================================
        // Qualified Table
        //=======================================================

        var qualifiedTableName =
            ResolveQualifiedTableName(
                tableName,
                schemaName
            );


        //=======================================================
        // Store Object
        //=======================================================

        var storeObject =
            StoreObjectIdentifier.Table(
                tableName,
                schemaName
            );


        var definitions =
            new List<string>();


        //=======================================================
        // Columns
        //=======================================================

        foreach
        (
            var property
            in entityType.GetProperties()
        )
        {
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


            var definition =
                $"\"{columnName}\" " +
                $"{ResolvePostgreSqlColumnDefinition(property)}";


            //===================================================
            // Nullability
            //===================================================

            if
            (
                property.IsNullable ==
                false
            )
            {
                definition +=
                    " NOT NULL";
            }


            //===================================================
            // Default
            //===================================================

            var defaultSql =
                ResolveDefaultValueSql(
                    property
                );


            if
            (
                !string.IsNullOrWhiteSpace(
                    defaultSql
                )
            )
            {
                definition +=
                    $" DEFAULT {defaultSql}";
            }


            definitions.Add(
                definition
            );
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
                    )
                    .ToList();


            if
            (
                primaryKeyColumns.Any()
            )
            {
                definitions.Add(
                    $"CONSTRAINT \"PK_{tableName}\" " +
                    $"PRIMARY KEY ({string.Join(", ", primaryKeyColumns)})"
                );
            }
        }


        //=======================================================
        // Foreign Keys
        //=======================================================

        foreach
        (
            var foreignKey
            in entityType.GetForeignKeys()
        )
        {
            var dependentColumns =
                foreignKey
                    .Properties
                    .Select
                    (
                        property =>
                            $"\"{property.GetColumnName(storeObject)}\""
                    )
                    .ToList();


            if
            (
                !dependentColumns.Any()
            )
            {
                continue;
            }


            var principalEntityType =
                foreignKey
                    .PrincipalEntityType;


            var principalTableName =
                principalEntityType
                    .GetTableName();


            var principalSchemaName =
                principalEntityType
                    .GetSchema();


            if
            (
                string.IsNullOrWhiteSpace(
                    principalTableName
                )
            )
            {
                continue;
            }


            var principalStoreObject =
                StoreObjectIdentifier.Table(
                    principalTableName,
                    principalSchemaName
                );


            var principalColumns =
                foreignKey
                    .PrincipalKey
                    .Properties
                    .Select
                    (
                        property =>
                            $"\"{property.GetColumnName(principalStoreObject)}\""
                    )
                    .ToList();


            if
            (
                !principalColumns.Any()
            )
            {
                continue;
            }


            var foreignKeyName =
                foreignKey.GetConstraintName();


            if
            (
                string.IsNullOrWhiteSpace(
                    foreignKeyName
                )
            )
            {
                foreignKeyName =
                    $"FK_{tableName}_{principalTableName}";
            }


            var principalQualifiedName =
                ResolveQualifiedTableName(
                    principalTableName,
                    principalSchemaName
                );


            var foreignKeySql =
                $"CONSTRAINT \"{foreignKeyName}\" " +
                $"FOREIGN KEY ({string.Join(", ", dependentColumns)}) " +
                $"REFERENCES {principalQualifiedName} " +
                $"({string.Join(", ", principalColumns)})";


            definitions.Add(
                foreignKeySql
            );
        }


        //=======================================================
        // CREATE TABLE
        //=======================================================

        var sql =
            $"CREATE TABLE {qualifiedTableName} (" +
            Environment.NewLine +
            "    " +
            string.Join(
                "," +
                Environment.NewLine +
                "    ",
                definitions
            ) +
            Environment.NewLine +
            ");";


        //=======================================================
        // Unique Indexes
        //=======================================================

        foreach
        (
            var index
            in entityType.GetIndexes()
        )
        {
            if
            (
                !index.IsUnique
            )
            {
                continue;
            }


            var indexColumns =
                index
                    .Properties
                    .Select
                    (
                        property =>
                            $"\"{property.GetColumnName(storeObject)}\""
                    )
                    .ToList();


            if
            (
                !indexColumns.Any()
            )
            {
                continue;
            }


            var indexName =
                index.Name;


            if
            (
                string.IsNullOrWhiteSpace(
                    indexName
                )
            )
            {
                indexName =
                    $"UX_{tableName}_" +
                    string.Join(
                        "_",
                        index.Properties.Select(
                            x => x.Name
                        )
                    );
            }


            sql +=
                Environment.NewLine +
                Environment.NewLine +
                $"CREATE UNIQUE INDEX \"{indexName}\" " +
                $"ON {qualifiedTableName} " +
                $"({string.Join(", ", indexColumns)});";
        }


        return sql;
    }



    //===========================================================
    // Resolve Qualified Table Name
    //===========================================================

    private string
        ResolveQualifiedTableName
    (
        string tableName,
        string? schemaName
    )
    {
        return
            string.IsNullOrWhiteSpace(
                schemaName
            )
                ?
                $"\"{tableName}\""
                :
                $"\"{schemaName}\".\"{tableName}\"";
    }



    //===========================================================
    // Resolve Provider CLR Type
    //
    // Unwraps Nullable<T>, applies value converters
    // (e.g. enum → string) and maps enums to their
    // underlying integer type.
    //===========================================================

    private Type
        ResolveProviderClrType
    (
        IReadOnlyProperty property
    )
    {
        var clrType =
            property.GetValueConverter()?.ProviderClrType
            ??
            property.ClrType;


        clrType =
            Nullable.GetUnderlyingType(
                clrType
            )
            ??
            clrType;


        if
        (
            clrType.IsEnum
        )
        {
            clrType =
                Enum.GetUnderlyingType(
                    clrType
                );
        }


        return clrType;
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


        var clrType =
            ResolveProviderClrType(
                property
            );


        //=======================================================
        // Integer Identity
        //=======================================================

        if
        (
            property.ValueGenerated ==
            ValueGenerated.OnAdd

            &&

            (
                clrType == typeof(long)
                ||
                clrType == typeof(int)
                ||
                clrType == typeof(short)
            )
        )
        {
            return
                $"{postgreSqlType} " +
                "GENERATED BY DEFAULT AS IDENTITY";
        }


        return
            postgreSqlType;
    }



    //===========================================================
    // Resolve Default Value SQL
    //===========================================================

    private string?
        ResolveDefaultValueSql
    (
        IReadOnlyProperty property
    )
    {
        var clrType =
            ResolveProviderClrType(
                property
            );


        //=======================================================
        // Identity Columns
        //=======================================================

        if
        (
            property.ValueGenerated ==
            ValueGenerated.OnAdd

            &&

            (
                clrType == typeof(long)
                ||
                clrType == typeof(int)
                ||
                clrType == typeof(short)
            )
        )
        {
            return null;
        }


        //=======================================================
        // SQL Default
        //=======================================================

        var defaultSql =
            property.GetDefaultValueSql();


        if
        (
            !string.IsNullOrWhiteSpace(
                defaultSql
            )
        )
        {
            return defaultSql;
        }


        //=======================================================
        // CLR Default
        //=======================================================

        var defaultValue =
            property.GetDefaultValue();


        if
        (
            defaultValue == null
        )
        {
            return null;
        }


        //=======================================================
        // Apply Value Converter (e.g. enum → string)
        //=======================================================

        var converter =
            property.GetValueConverter();


        if
        (
            converter != null
        )
        {
            defaultValue =
                converter.ConvertToProvider(
                    defaultValue
                );


            if
            (
                defaultValue == null
            )
            {
                return null;
            }
        }


        var culture =
            System.Globalization.CultureInfo.InvariantCulture;


        //=======================================================
        // Enum (stored as its integer value)
        //=======================================================

        if
        (
            defaultValue is Enum
        )
        {
            return
                Convert.ToInt64(
                    defaultValue,
                    culture
                )
                .ToString(
                    culture
                );
        }


        //=======================================================
        // Boolean
        //=======================================================

        if
        (
            clrType ==
            typeof(bool)
        )
        {
            return
                Convert.ToBoolean(
                    defaultValue,
                    culture
                )
                    ?
                    "TRUE"
                    :
                    "FALSE";
        }


        //=======================================================
        // Numeric (integer & decimal)
        //=======================================================

        if
        (
            clrType == typeof(long)
            ||
            clrType == typeof(int)
            ||
            clrType == typeof(short)
            ||
            clrType == typeof(byte)
            ||
            clrType == typeof(sbyte)
            ||
            clrType == typeof(uint)
            ||
            clrType == typeof(ulong)
            ||
            clrType == typeof(ushort)
            ||
            clrType == typeof(decimal)
            ||
            clrType == typeof(double)
            ||
            clrType == typeof(float)
        )
        {
            return
                Convert.ToString(
                    defaultValue,
                    culture
                );
        }


        //=======================================================
        // DateTime
        //=======================================================

        if
        (
            clrType ==
            typeof(DateTime)
        )
        {
            var value =
                (DateTime)defaultValue;


            return
                $"'{value.ToString("yyyy-MM-dd HH:mm:ss.ffffff", culture)}'";
        }


        //=======================================================
        // DateTimeOffset
        //=======================================================

        if
        (
            clrType ==
            typeof(DateTimeOffset)
        )
        {
            var value =
                (DateTimeOffset)defaultValue;


            return
                $"'{value.ToString("yyyy-MM-dd HH:mm:ss.ffffffzzz", culture)}'";
        }


        //=======================================================
        // DateOnly
        //=======================================================

        if
        (
            clrType ==
            typeof(DateOnly)
        )
        {
            var value =
                (DateOnly)defaultValue;


            return
                $"'{value.ToString("yyyy-MM-dd", culture)}'";
        }


        //=======================================================
        // TimeOnly
        //=======================================================

        if
        (
            clrType ==
            typeof(TimeOnly)
        )
        {
            var value =
                (TimeOnly)defaultValue;


            return
                $"'{value.ToString("HH:mm:ss.ffffff", culture)}'";
        }


        //=======================================================
        // Guid
        //=======================================================

        if
        (
            clrType ==
            typeof(Guid)
        )
        {
            return
                $"'{defaultValue}'";
        }


        //=======================================================
        // String / Char
        //=======================================================

        if
        (
            clrType == typeof(string)
            ||
            clrType == typeof(char)
        )
        {
            var value =
                Convert.ToString(
                    defaultValue,
                    culture
                )
                ?.Replace(
                    "'",
                    "''"
                );


            return
                $"'{value}'";
        }


        //=======================================================
        // Unsupported Default (column created without DEFAULT)
        //=======================================================

        return null;
    }



    //===========================================================
    // Resolve PostgreSQL Type
    //
    // 1. Explicit column type wins :
    //      builder.Property(x => x.MFSCharges)
    //             .HasColumnType("numeric(5,2)")
    //    or [Column(TypeName = "numeric(5,2)")]
    //
    // 2. Otherwise the CLR type is mapped below.
    //===========================================================

    private string
        ResolvePostgreSqlType
    (
        IReadOnlyProperty property
    )
    {
        //=======================================================
        // Explicit Column Type
        //=======================================================

        var explicitColumnType =
            property
                .FindAnnotation(
                    RelationalAnnotationNames.ColumnType
                )
                ?.Value
            as string;


        if
        (
            !string.IsNullOrWhiteSpace(
                explicitColumnType
            )
        )
        {
            return
                explicitColumnType.Trim();
        }


        var clrType =
            ResolveProviderClrType(
                property
            );


        //=======================================================
        // Integers
        //=======================================================

        if (clrType == typeof(long))   return "bigint";

        if (clrType == typeof(int))    return "integer";

        if (clrType == typeof(short))  return "smallint";

        if (clrType == typeof(byte))   return "smallint";

        if (clrType == typeof(sbyte))  return "smallint";

        if (clrType == typeof(ushort)) return "integer";

        if (clrType == typeof(uint))   return "bigint";

        if (clrType == typeof(ulong))  return "numeric(20,0)";


        //=======================================================
        // Decimal
        //
        // Uses HasPrecision(p, s) when configured,
        // otherwise numeric(18,2).
        //=======================================================

        if
        (
            clrType ==
            typeof(decimal)
        )
        {
            var precision =
                property.GetPrecision();


            var scale =
                property.GetScale();


            if
            (
                precision.HasValue
            )
            {
                return
                    $"numeric({precision.Value},{scale ?? 0})";
            }


            return "numeric(18,2)";
        }


        //=======================================================
        // Floating Point
        //=======================================================

        if (clrType == typeof(double)) return "double precision";

        if (clrType == typeof(float))  return "real";


        //=======================================================
        // Boolean
        //=======================================================

        if (clrType == typeof(bool)) return "boolean";


        //=======================================================
        // Date & Time
        //=======================================================

        if (clrType == typeof(DateTime))       return "timestamp with time zone";

        if (clrType == typeof(DateTimeOffset)) return "timestamp with time zone";

        if (clrType == typeof(DateOnly))       return "date";

        if (clrType == typeof(TimeOnly))       return "time without time zone";

        if (clrType == typeof(TimeSpan))       return "interval";


        //=======================================================
        // Guid
        //=======================================================

        if (clrType == typeof(Guid)) return "uuid";


        //=======================================================
        // Binary
        //=======================================================

        if (clrType == typeof(byte[])) return "bytea";


        //=======================================================
        // Char
        //=======================================================

        if (clrType == typeof(char)) return "character(1)";


        //=======================================================
        // String
        //=======================================================

        if
        (
            clrType ==
            typeof(string)
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


        //=======================================================
        // Unsupported
        //=======================================================

        throw new InvalidOperationException(
            $"Unsupported database property type '{property.ClrType.Name}' " +
            $"on '{property.DeclaringType.ClrType.Name}.{property.Name}'. " +
            "Set an explicit column type with HasColumnType(...) or [Column(TypeName = \"...\")]."
        );
    }
}
