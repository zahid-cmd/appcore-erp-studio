APPCORE ERP
DATABASE MIGRATION ENGINE
FINAL CONTRACT
========================================

1. PURPOSE
----------------------------------------
The Database Migration Engine is a development-only tool.

Its purpose is to create and remove EF Core migration definitions
for individual synchronized submenus.

It does NOT create or modify the physical database.

The engine works with the standard EF Core migration structure.


2. FINAL FILE STRUCTURE
----------------------------------------

AppCore.Application
└── Platform
    └── SynchronizationEngineInterfaces
        └── DatabaseEngine
            └── IDatabaseMigrationEngine.cs


AppCore.Infrastructure
└── Platform
    └── Synchronization
        └── DatabaseEngine
            └── MigrationEngine
                ├── DatabaseMigrationEngine.cs
                ├── MigrationCommandExecutor.cs
                ├── MigrationFileManager.cs
                ├── MigrationNameBuilder.cs
                ├── MigrationProjectResolver.cs
                ├── MigrationSnapshotManager.cs
                └── MigrationValidator.cs


3. PUBLIC CONTRACT
----------------------------------------

IDatabaseMigrationEngine.cs exposes ONLY:

    Task CreateAsync(long synchronizationId);

    Task RemoveAsync(long synchronizationId);


No additional public operations are part of the contract.


4. DATABASE MIGRATION ENGINE
----------------------------------------

DatabaseMigrationEngine.cs is the coordinator/orchestrator.

It coordinates the smaller internal components.

CREATE:

    CreateAsync(synchronizationId)
        ↓
    Resolve required project/path information
        ↓
    Build migration name
        ↓
    Execute EF Core migration creation
        ↓
    Verify generated migration files
        ↓
    Verify native EF Core snapshot
        ↓
    SUCCESS


REMOVE:

    RemoveAsync(synchronizationId)
        ↓
    Locate the migration belonging to the SynchronizationId
        ↓
    Validate the target migration
        ↓
    Handle removal of the specific migration definition
        ↓
    Restore/rebuild the correct native EF Core snapshot
        ↓
    Remove target migration files
        ↓
    Verify final migration state
        ↓
    SUCCESS


5. EF CORE MIGRATION FILES
----------------------------------------

EF Core remains the source of truth for migration files.

The standard Migrations folder contains:

    <Migration>.cs
    <Migration>.Designer.cs
    AppDbContextModelSnapshot.cs

There is ONE native:

    AppDbContextModelSnapshot.cs

per DbContext/migrations assembly.

The engine will NOT create per-submenu snapshot files.


6. NO CUSTOM SNAPSHOT FILES
----------------------------------------

The following are NOT part of the design:

    AutoSync_101.Snapshot.cs
    AutoSync_102.Snapshot.cs
    Branch.Snapshot.cs
    Department.Snapshot.cs

No artificial snapshot system will be created.


7. MIGRATION CREATION RESPONSIBILITY
----------------------------------------

For a synchronized submenu:

    SynchronizationId
        ↓
    Backend Registration
        ↓
    Entity registered in AppDbContext
        ↓
    Database Migration Engine
        ↓
    Create EF Core migration

EF Core generates:

    Migration.cs
    Migration.Designer.cs
    AppDbContextModelSnapshot.cs

The Migration Engine verifies the result.

The Migration Engine MUST NOT execute:

    dotnet ef database update

and MUST NOT:

    - create a database
    - create a physical table
    - alter the database
    - update the database


8. MIGRATION REMOVAL RESPONSIBILITY
----------------------------------------

RemoveAsync(synchronizationId) removes the migration definition
belonging to the specified SynchronizationId.

It MUST NOT modify the physical database.

The removal operation must support removal of the specific migration
even when later migration definitions exist.

Example:

    Migration 101 → Branch
    Migration 102 → Department
    Migration 103 → Designation

If RemoveAsync(102) is requested:

    101 remains
    102 is removed
    103 remains

The engine must also leave the single native
AppDbContextModelSnapshot.cs in the correct model state.

The standard EF Core command:

    dotnet ef migrations remove

must NOT simply be used as the complete solution when the requested
migration is not the latest migration.


9. NATIVE SNAPSHOT RESPONSIBILITY
----------------------------------------

MigrationSnapshotManager.cs is responsible only for the
single native EF Core snapshot:

    AppDbContextModelSnapshot.cs

It does NOT create per-submenu snapshots.

When a migration definition is removed, the native snapshot must be
correctly restored/rebuilt so that it represents the resulting
migration/model state.

The exact safe reconstruction mechanism will be implemented and tested
as a dedicated segment before integrating it into migration removal.


10. COMPONENT RESPONSIBILITIES
----------------------------------------

DatabaseMigrationEngine.cs
    - Coordinates the complete operation.
    - Owns CreateAsync().
    - Owns RemoveAsync().
    - Does not contain all low-level implementation logic.


MigrationProjectResolver.cs
    - Resolves Backend Studio/project paths.
    - Resolves AppCore.Infrastructure.
    - Resolves AppCore.API startup project.
    - Resolves required migration/project locations.
    - Does not execute EF commands.


MigrationNameBuilder.cs
    - Creates the standard AutoSync migration name.
    - SynchronizationId must be identifiable from the migration name.


MigrationCommandExecutor.cs
    - Executes required .NET/EF Core commands.
    - Captures exit code, standard output and standard error.
    - Does not decide business operation logic.


MigrationFileManager.cs
    - Locates migration files.
    - Locates Designer files.
    - Verifies migration files.
    - Removes target migration files when instructed.
    - Does not modify the physical database.


MigrationSnapshotManager.cs
    - Manages the single native AppDbContextModelSnapshot.cs.
    - Ensures the native snapshot represents the correct model state.
    - Does not create custom/per-submenu snapshots.


MigrationValidator.cs
    - Validates migration creation results.
    - Validates migration removal results.
    - Verifies expected files and migration state.
    - Does not perform the main migration operation.


11. STRICT RESPONSIBILITY BOUNDARY
----------------------------------------

The Database Migration Engine CAN:

    - Create migration definitions.
    - Remove specific migration definitions.
    - Manage migration .cs files.
    - Manage migration .Designer.cs files.
    - Manage/reconstruct the native EF Core snapshot.
    - Validate migration state.


The Database Migration Engine CANNOT:

    - Create a database.
    - Update a database.
    - Apply a migration to a database.
    - Create a physical table.
    - Remove a physical table.
    - Roll back the physical database.
    - Register DbSets.
    - Deregister DbSets.
    - Synchronize frontend code.
    - Synchronize backend code.
    - Manage submenu registration.


12. DATABASE CREATION ENGINE BOUNDARY
----------------------------------------

Database Creation Engine is completely separate.

Database Migration Engine:

    Synchronization
        ↓
    Migration definition
        ↓
    Migration files + native snapshot


Database Creation Engine:

    Existing migration definition
        ↓
    Apply migration
        ↓
    Physical database schema


Database Creation Engine is responsible for physical database
creation/removal.

It does NOT create or delete migration source files.


13. INDEPENDENT OPERATIONS
----------------------------------------

Database removal and migration removal are independent.

Database Creation Engine:

    Remove physical database schema
    WITHOUT deleting migration files.


Database Migration Engine:

    Remove migration definition/files
    WITHOUT modifying the physical database.


14. SYNCHRONIZATION ID
----------------------------------------

SynchronizationId is the identity/reference used to locate the
migration associated with a synchronized submenu.

It is NOT a migration dependency.

The engine does not implement cross-submenu dependency management.

Each submenu is treated as an independent development baseline unit.


15. DEVELOPMENT BASELINE RULE
----------------------------------------

This is a development-only database baseline tool.

It is NOT a production migration management system.

The persistent EF Core Migrations folder remains the development
migration baseline.

A new empty development database should be created later by applying
the existing migration baseline.

Migrations should NOT be regenerated merely because a new empty
database is created.


16. IMPLEMENTATION WORKFLOW
----------------------------------------

Development must proceed incrementally.

SEGMENT 1
    IDatabaseMigrationEngine.cs
    ↓
    BUILD / VERIFY

SEGMENT 2
    MigrationProjectResolver.cs
    ↓
    BUILD / TEST

SEGMENT 3
    MigrationNameBuilder.cs
    ↓
    BUILD / TEST

SEGMENT 4
    MigrationCommandExecutor.cs
    ↓
    BUILD / TEST

SEGMENT 5
    MigrationFileManager.cs
    ↓
    BUILD / TEST

SEGMENT 6
    CreateAsync()
    ↓
    REAL MIGRATION CREATION TEST

SEGMENT 7
    MigrationSnapshotManager.cs
    ↓
    DEDICATED SNAPSHOT TEST

SEGMENT 8
    RemoveAsync()
    ↓
    REAL MIGRATION REMOVAL TEST

SEGMENT 9
    COMPLETE INTEGRATION TEST


17. CORE TEST SCENARIO
----------------------------------------

Create:

    101 → Branch
    102 → Department
    103 → Designation

Then remove:

    102

Expected:

    101 remains
    102 is removed
    103 remains
    native AppDbContextModelSnapshot.cs is correct
    physical database is untouched


18. FINAL DESIGN STATEMENT
----------------------------------------

ONE PUBLIC ENGINE
    DatabaseMigrationEngine

ONE PUBLIC CONTRACT
    IDatabaseMigrationEngine

TWO PUBLIC OPERATIONS
    CreateAsync()
    RemoveAsync()

SEVEN SMALL IMPLEMENTATION COMPONENTS
    DatabaseMigrationEngine.cs
    MigrationCommandExecutor.cs
    MigrationFileManager.cs
    MigrationNameBuilder.cs
    MigrationProjectResolver.cs
    MigrationSnapshotManager.cs
    MigrationValidator.cs

ONE NATIVE EF CORE SNAPSHOT
    AppDbContextModelSnapshot.cs

NO PER-SUBMENU SNAPSHOTS

NO DATABASE OPERATIONS

NO PRODUCTION MIGRATION MANAGEMENT

The Database Migration Engine creates and removes migration
definitions only. The Database Creation Engine separately applies
and reverses those existing migration definitions against the
physical database.
