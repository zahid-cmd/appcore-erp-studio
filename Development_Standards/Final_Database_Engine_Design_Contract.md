# DATABASE ENGINE

# FINAL DESIGN CONTRACT

===============================================================

## 1. Purpose

The Database Engine is part of the AppCore ERP Backend Synchronization initialization process.

Its purpose is to establish a reliable, traceable, deterministic, and repeatable initial database baseline for one dedicated Backend Code Synchronization.

The Database Engine is not a general database development system.

It does not manage future developer database changes.

After successful initialization, developers continue normal database development using standard EF Core migrations.

The Database Engine consists of two separate engines:

1. Database Creation Engine
2. Database Removal Engine

Both engines use the same database ownership identity.

The Database Creation Engine is responsible for creating and verifying the initial database baseline.

The Database Removal Engine will later be responsible for identifying and removing the database initialization baseline according to its own dedicated design contract.

Creation and Removal must remain separate responsibilities.

===============================================================

## 2. Core Architecture Principle

The Database Engine must work with EF Core.

It must not attempt to replace, reproduce, or duplicate EF Core's internal migration system.

The responsibility boundary is:

Database Engine
        ↓
Controls the initialization process
        ↓
Identifies ownership
        ↓
Builds artifact identity
        ↓
Inspects the existing state
        ↓
Determines the initialization state
        ↓
Requests EF Core operations when required
        ↓
Verifies generated and physical results

EF Core remains responsible for:

Migration generation
        +
Migration designer generation
        +
Model snapshot generation and update
        +
Migration metadata generation
        +
Database schema execution

The Database Engine must not manually reproduce EF Core-generated migration internals.

The fundamental operating principle is:

THE DATABASE ENGINE ORCHESTRATES
EF CORE EXECUTES
THE DATABASE ENGINE VERIFIES

===============================================================

## 3. Engine Separation

The Database Creation Engine and Database Removal Engine are separate engines.

They must not share operational responsibilities.

Database Creation Engine
        ↓
Creates and verifies
the initialization baseline


Database Removal Engine
        ↓
Identifies and removes
the initialization baseline

The Database Creation Engine shall not perform removal operations.

The Database Removal Engine shall not become part of the Database Creation Engine.

Shared components exist only for common responsibilities such as:

- Database ownership identity construction.
- Migration artifact identification.
- Migration state tracking.
- Database table inspection.
- Shared database artifact models.
- Shared initialization state models.

The Shared area must not become a general utility collection.

Only responsibilities genuinely required by both engines may exist inside the Shared area.

===============================================================

## 4. Initialization Scope

The Database Engine operates only during the initial Backend Code Synchronization process.

The initialization sequence is:

Code Synchronization
        ↓
Generated Backend Code
        ↓
Backend Registration
        ↓
Database Creation Engine
        ↓
Initial Database Baseline
        ↓
Developer Ready Platform

The Database Creation Engine assumes that the required backend code has already been successfully generated.

The Database Creation Engine also assumes that Backend Registration has already been successfully completed.

The Database Creation Engine must not generate:

- Backend Entities.
- Repository Interfaces.
- Repository Implementations.
- DTOs.
- Controllers.
- Backend registration code.
- DbSet registrations.
- Dependency Injection registrations.

Those responsibilities belong to the existing Backend Code Synchronization and Backend Registration processes.

The Database Creation Engine begins only after the required generated backend code and registrations are available to EF Core.

===============================================================

## 5. Core Ownership Principle

One dedicated Backend Code Synchronization represents one database initialization ownership unit.

Each ownership unit is permanently identifiable through its dedicated Submenu Code.

The operational flow is:

Code Synchronization ID
        ↓
Load Code Synchronization
        ↓
Load Dedicated Submenu
        ↓
Read Dedicated Submenu Code
        ↓
Build Permanent Database Ownership Identity

Example:

Code Synchronization ID
        ↓
123


Dedicated Submenu Code
        ↓
SUB-003-001-001

The Code Synchronization ID is the operational identifier.

It is used to locate and load the dedicated Code Synchronization context.

The Submenu Code is the permanent readable ownership key.

The Submenu Code connects the database initialization ownership to:

Backend Code Synchronization
        ↓
Generated Entity
        ↓
Expected Database Table
        ↓
Dedicated Initialization Migration
        ↓
Migration Designer Artifact
        ↓
EF Core Migration Identity

The same ownership identity must later allow the Database Removal Engine to identify the initialization artifacts belonging to the same synchronization unit.

===============================================================

## 6. Database Artifact Identity

The engine must build one consistent Database Artifact Identity for every database initialization ownership unit.

The identity must contain all information required to identify the initialization unit without relying on scattered naming logic throughout the engine.

Example:

Synchronization ID:
123

Submenu Code:
SUB-003-001-001

Migration Key:
SUB003001001

Migration Name:
AutoSync_SUB003001001

Entity Name:
Company

Schema:
dbo

Table Name:
Companies

The ownership relationship is:

Code Synchronization ID
        ↓
Submenu Code
        ↓
Permanent Ownership Identity
        ↓
Migration Key
        ↓
Migration Name
        ↓
Generated Entity
        ↓
Expected Schema
        ↓
Expected Database Table

The same Database Artifact Identity must be usable by:

Database Creation Engine

and later by:

Database Removal Engine

Identity construction must remain centralized.

The engine must not duplicate migration naming or ownership normalization logic across multiple components.

===============================================================

## 7. Migration Ownership Principle

Each database initialization ownership unit may have only one dedicated initialization migration.

Example:

Original Submenu Code:

SUB-003-001-001


Normalized Migration Key:

SUB003001001


Migration Name:

AutoSync_SUB003001001

EF Core may generate the actual physical migration identity using its timestamp-based migration ID:

20260824153000_AutoSync_SUB003001001

Therefore, these concepts must remain separate:

Submenu Code
        =
Permanent Readable Ownership Key

Migration Key
        =
Normalized Ownership Key

Migration Name
        =
EF Core Migration Logical Name

Migration ID
        =
Actual EF Core Migration Identity

The timestamped EF Core Migration ID is not the permanent ownership key.

The Submenu Code remains the permanent readable ownership key.

The Migration Name must be deterministically derived from the Submenu Code.

For the same ownership unit:

SUB-003-001-001
        ↓
SUB003001001
        ↓
AutoSync_SUB003001001

Repeated initialization attempts must use the same ownership identity.

The Database Creation Engine must not generate another AutoSync migration for the same ownership unit.

===============================================================

## 8. EF Core Ownership Boundary

The Database Engine must request EF Core to create and manage EF Core-generated artifacts.

When a new initialization migration is required:

Database Creation Engine
        ↓
Requests EF Core Migration Creation
        ↓
EF Core Generates:
        ↓
Migration File
        +
Migration Designer File
        +
Model Snapshot Update
        +
Migration Metadata

The Database Creation Engine then identifies and verifies the generated artifacts.

The Database Engine shall not manually create:

- Migration source files.
- Migration designer files.
- EF Core migration metadata.
- EF Core migration IDs.
- Model snapshot configuration.
- Manual snapshot sections.
- Manual snapshot ownership markers.

The Database Engine may:

- Identify generated migration files.
- Locate generated designer files.
- Read migration information.
- Determine the actual EF Core Migration ID.
- Determine whether the migration is registered.
- Determine whether the migration has been applied.
- Verify the physical database result.

The Database Engine must not reproduce EF Core's internal migration generation mechanism.

===============================================================

## 9. Model Snapshot Principle

AppDbContextModelSnapshot.cs remains under EF Core ownership.

The Database Engine must not manually insert:

AUTO SYNC SNAPSHOT START

or:

AUTO SYNC SNAPSHOT END

markers.

The Database Engine must not manually create individual snapshot sections for each synchronization.

The Database Engine must not use manually inserted snapshot blocks as its ownership mechanism.

The reason is:

AppDbContextModelSnapshot.cs
        ↓
Represents the complete EF Core model
        ↓
May be regenerated or updated
by future EF Core migrations

Therefore, manually injecting synchronization ownership blocks into the EF-generated snapshot would create an unstable dependency.

The correct ownership mechanism is:

Code Synchronization ID
        +
Submenu Code
        +
Migration Key
        +
Migration Name
        +
Actual Migration ID
        +
Entity Name
        +
Schema
        +
Table Name

Therefore:

AppDbContextModelSnapshot.cs
        ↓
Generated and maintained by EF Core
        ↓
Database Engine may inspect when necessary
        ↓
Database Engine does not manually modify it

===============================================================

## 10. Database Creation Engine

### Purpose

The Database Creation Engine is responsible for orchestrating and verifying the initial database baseline for one dedicated Backend Code Synchronization.

It does not manually generate EF Core artifacts.

It controls the initialization process.

It determines whether initialization should:

Create

or:

Reuse

or:

Apply

or:

Verify

or:

Stop because of an inconsistent state

The Creation Engine is the orchestrator of the database initialization process.

It is not an independent replacement for EF Core.

===============================================================

## 11. Database Creation Engine Responsibilities

The Database Creation Engine SHALL:

- Receive the Code Synchronization ID.
- Load the corresponding Code Synchronization.
- Load the dedicated Submenu.
- Read the dedicated Submenu Code.
- Identify the generated Entity.
- Identify the expected database Schema.
- Identify the expected database Table.
- Build the complete Database Artifact Identity.
- Normalize the Submenu Code into the Migration Key.
- Determine the expected Migration Name.
- Inspect existing migration artifacts.
- Inspect the corresponding designer artifact.
- Determine whether the owned migration exists.
- Determine whether the migration is registered by EF Core.
- Determine the actual EF Core Migration ID.
- Determine whether the migration has already been applied.
- Inspect the expected physical database table.
- Determine the current Database Initialization State.
- Prevent duplicate initialization migrations.
- Request EF Core migration generation only when required.
- Verify that the migration artifact was generated.
- Verify that the corresponding designer artifact was generated.
- Apply the migration when required.
- Verify that the migration has been applied.
- Verify that the expected physical database table exists.
- Reuse existing valid initialization artifacts during repeated execution.
- Return the final initialization result.
- Return detailed information when an inconsistent state is detected.
- Stop when an unsafe or inconsistent initialization state is detected.
- Maintain deterministic ownership identification so that the Database Removal Engine can later identify the same initialization unit.

===============================================================

## 12. Database Creation Engine SHALL NOT

The Database Creation Engine SHALL NOT:

- Manually create database tables outside EF Core migration execution.
- Manually create migration source files.
- Manually create migration designer files.
- Manually create EF Core migration metadata.
- Manually generate EF Core Migration IDs.
- Manually modify AppDbContextModelSnapshot.cs.
- Insert ownership blocks into the EF Core model snapshot.
- Insert Auto Sync snapshot markers.
- Remove database tables.
- Delete migration files.
- Delete migration designer files.
- Delete or modify EF Core snapshot content.
- Perform database rollback.
- Perform database removal operations.
- Create duplicate initialization migrations.
- Manage future developer database changes.
- Manage future manual/development migrations.
- Guess database artifact ownership.
- Automatically create another migration because an existing state is unclear.
- Blindly repair an inconsistent state.
- Modify EF-generated artifacts manually to force consistency.

===============================================================

## 13. Initialization State Principle

Before creating, applying, or modifying anything, the Database Creation Engine must determine the current initialization state.

The engine must never immediately assume that initialization does not exist.

The required sequence is:

Build Database Artifact Identity
        ↓
Inspect Migration Artifacts
        ↓
Inspect Designer Artifact
        ↓
Inspect EF Core Migration State
        ↓
Inspect Migration Application State
        ↓
Inspect Expected Physical Table
        ↓
Determine Database Initialization State
        ↓
Perform Only the Appropriate Safe Action

The initialization state represents the relationship between:

Owned Migration
        +
Designer Artifact
        +
EF Core Migration Registration
        +
Migration Application State
        +
Expected Physical Database Table

The engine must classify the state before deciding what to do.

===============================================================

## 14. Database Initialization States

The Database Engine must support clear and deterministic initialization states.

The minimum conceptual states are:

NotInitialized

MigrationExistsNotApplied

Initialized

Inconsistent

Additional internal state information may exist where required.

The final result must clearly describe what state was detected and what action was taken.

===============================================================

## 15. State 1 — Not Initialized

Condition:

Owned Migration does not exist

and the ownership unit does not have a valid existing initialization baseline.

Expected flow:

No Owned Initialization Migration
        ↓
Request EF Core Migration Creation
        ↓
Verify Migration File Exists
        ↓
Verify Designer File Exists
        ↓
Identify Actual EF Core Migration ID
        ↓
Verify Migration Registration
        ↓
Apply Migration
        ↓
Verify Migration Applied
        ↓
Verify Expected Physical Table Exists
        ↓
Initialization Completed Successfully

The migration must use the deterministic ownership migration name:

AutoSync_{MigrationKey}

Example:

AutoSync_SUB003001001

The Database Creation Engine must not manually create the migration or designer source files.

EF Core must generate them.

===============================================================

## 16. State 2 — Migration Exists but Is Not Applied

Condition:

Owned Migration Exists
        +
Designer Artifact Exists
        +
Migration Is Valid
        +
Migration Has Not Been Applied
        +
Expected Table Does Not Exist

Expected flow:

Existing Owned Migration
        ↓
Reuse Existing Migration
        ↓
Do Not Create Another Migration
        ↓
Apply Existing Migration
        ↓
Verify Migration Applied
        ↓
Verify Expected Physical Table Exists
        ↓
Initialization Completed Successfully

No new migration may be created.

The existing owned migration must remain the initialization migration for that ownership unit.

===============================================================

## 17. State 3 — Initialization Complete

Condition:

Owned Migration Exists
        +
Designer Artifact Exists
        +
Migration Is Registered
        +
Migration Is Applied
        +
Expected Physical Table Exists

Expected flow:

Existing Initialization Verified
        ↓
No Migration Creation
        ↓
No Duplicate Artifact Creation
        ↓
No Database Modification Required
        ↓
Return Already Initialized

Repeated execution must be safe.

The engine must return the existing initialization status.

===============================================================

## 18. State 4 — Inconsistent Initialization State

An inconsistent state exists when the engine cannot safely determine or verify a valid initialization baseline.

Examples include:

Migration Exists
        +
Designer File Missing

or:

Migration Is Applied
        +
Expected Physical Table Is Missing

or:

Expected Physical Table Exists
        +
No Owned Migration Can Be Identified

or:

Migration File Exists
        +
Migration Is Not Registered by EF Core

or:

Multiple Owned AutoSync Migrations
exist for the same ownership unit

or any other condition where ownership or initialization cannot be safely and deterministically established.

Expected flow:

Detect Inconsistent State
        ↓
Classify the Inconsistency
        ↓
Do Not Guess
        ↓
Do Not Create Another Migration
        ↓
Do Not Delete Existing Artifacts
        ↓
Do Not Perform Unsafe Automatic Repair
        ↓
Return Detailed Inconsistency Result

The Creation Engine may only perform an automatic repair when:

The repair is explicitly defined
        +
The ownership is deterministic
        +
The operation is safe
        +
The result can be verified

Otherwise, the engine must stop.

===============================================================

## 19. Repeated Initialization Principle

The Database Creation Engine must be idempotent.

Repeated execution for the same Code Synchronization must not produce additional initialization migrations.

Example:

First execution:

Synchronization ID
        ↓
123
        ↓
Submenu Code
        ↓
SUB-003-001-001
        ↓
Migration
        ↓
AutoSync_SUB003001001
        ↓
Migration Applied
        ↓
Table Verified

Second execution:

Same Synchronization ID
        ↓
Same Submenu Code
        ↓
Same Database Artifact Identity
        ↓
Existing Owned Migration Identified
        ↓
Existing Initialization State Verified
        ↓
No New Migration Created

Possible result:

AlreadyInitialized

If the migration already exists but was not previously applied:

ExistingMigrationApplied

The engine must never create:

AutoSync_SUB003001001

followed later by:

AutoSync_SUB003001001_2

or:

AutoSync_SUB003001001_Another

or another timestamped ownership migration with the same logical ownership identity.

There must be one dedicated initialization migration ownership for one ownership unit.

===============================================================

## 20. Database Artifact Identity Builder

### Location

AppCore.Infrastructure
└── Platform
    └── Synchronization
        └── DatabaseEngine
            └── Shared
                └── DatabaseArtifactIdentityBuilder.cs

### Purpose

The DatabaseArtifactIdentityBuilder is responsible only for building the permanent and operational identity for one database initialization ownership unit.

It centralizes ownership naming and normalization logic.

Input may include:

Synchronization ID
Submenu Code
Entity Name
Schema
Table Name

Output:

DatabaseArtifactIdentity

Example:

SynchronizationId:
123

SubmenuCode:
SUB-003-001-001

MigrationKey:
SUB003001001

MigrationName:
AutoSync_SUB003001001

EntityName:
Company

Schema:
dbo

TableName:
Companies

The builder SHALL NOT:

- Search migration files.
- Search designer files.
- Execute EF Core commands.
- Access the database.
- Apply migrations.
- Create database tables.
- Remove database tables.
- Create or remove EF Core artifacts.

Its responsibility is identity construction only.

===============================================================

## 21. Database Migration Tracker

### Location

AppCore.Infrastructure
└── Platform
    └── Synchronization
        └── DatabaseEngine
            └── Shared
                └── DatabaseMigrationTracker.cs

### Purpose

The DatabaseMigrationTracker is responsible for identifying and inspecting the EF Core migration artifacts belonging to one Database Artifact Identity.

Its responsibilities include:

- Locate the owned migration.
- Locate the corresponding migration designer file.
- Identify the actual EF Core Migration ID.
- Determine whether the migration source artifact exists.
- Determine whether the designer artifact exists.
- Determine whether the migration is registered by EF Core.
- Determine whether the migration has been applied.
- Return migration information to the calling engine.

The Migration Tracker identifies and reports migration state.

It does not own the overall database initialization orchestration.

It does not create database tables directly.

It does not remove database tables.

It does not perform Database Creation Engine responsibilities.

It does not perform Database Removal Engine responsibilities.

===============================================================

## 22. Database Table Inspector

### Location

AppCore.Infrastructure
└── Platform
    └── Synchronization
        └── DatabaseEngine
            └── Shared
                └── DatabaseTableInspector.cs

### Purpose

The DatabaseTableInspector is responsible for inspecting the expected physical database table.

Its responsibilities include:

- Verify database connectivity where required.
- Identify the expected schema.
- Verify schema existence where required.
- Verify physical table existence.
- Return physical table information.

Example:

Schema:
dbo

Table:
Companies

Exists:
True

The DatabaseTableInspector does not:

- Create tables.
- Delete tables.
- Modify tables.
- Apply migrations.
- Remove migrations.

Physical table creation remains the responsibility of EF Core migration execution.

The Table Inspector only verifies the physical result.

===============================================================

## 23. Shared Models

The Database Engine Shared area contains models representing ownership, migration information, and initialization state.

The shared models must remain focused on the Database Engine.

### DatabaseArtifactIdentity

Purpose:

Represents the complete ownership identity for one database initialization unit.

Expected information:

Synchronization ID

Submenu Code

Migration Key

Migration Name

Entity Name

Schema

Table Name

This model represents the common identity used throughout the Database Engine.

### DatabaseMigrationInfo

Purpose:

Represents the EF Core migration state belonging to one ownership identity.

Expected information:

Migration Name

Migration ID

Migration File Path

Designer File Path

Migration Exists

Designer Exists

Registered

Applied

Additional diagnostic information may exist when required to safely identify migration state.

### DatabaseInitializationState

Purpose:

Represents the evaluated database initialization condition.

Possible conceptual values include:

NotInitialized

MigrationExistsNotApplied

Initialized

Inconsistent

The state model may contain additional diagnostic information.

The diagnostic information should allow the Creation Engine to return the exact reason for an inconsistent or failed state.

===============================================================

## 24. Recommended Clean Architecture Placement

Backend_Studio
│
├── AppCore.API
│
├── AppCore.Application
│   │
│   └── Platform
│       │
│       └── SynchronizationEngineInterfaces
│           │
│           └── DatabaseEngine
│               │
│               ├── IDatabaseCreationEngine.cs
│               │
│               └── IDatabaseRemovalEngine.cs
│
├── AppCore.Domain
│
└── AppCore.Infrastructure
    │
    └── Platform
        │
        ├── Common
        │
        ├── Synchronization
        │
        └── DatabaseEngine
            │
            ├── DatabaseCreationEngine
            │   │
            │   └── DatabaseCreationEngine.cs
            │
            ├── DatabaseRemovalEngine
            │   │
            │   └── DatabaseRemovalEngine.cs
            │
            ├── Models
            │   │
            │   ├── DatabaseArtifactIdentity.cs
            │   │
            │   ├── DatabaseMigrationInfo.cs
            │   │
            │   └── DatabaseInitializationState.cs
            │
            └── Shared
                │
                ├── DatabaseArtifactIdentityBuilder.cs
                │
                ├── DatabaseMigrationTracker.cs
                │
                └── DatabaseTableInspector.cs

The Application layer contains engine contracts only.

The Infrastructure layer contains the engine implementations and supporting infrastructure logic.

The Domain layer is not required to contain database engine implementation details unless an actual domain-level concept later requires it.

===============================================================

## 25. Database Creation Flow

The final Database Creation flow shall be:

Code Synchronization ID
        ↓
Load Code Synchronization
        ↓
Load Dedicated Submenu
        ↓
Read Dedicated Submenu Code
        ↓
Resolve Generated Entity
        ↓
Resolve Expected Database Schema
        ↓
Resolve Expected Database Table
        ↓
Build Database Artifact Identity
        ↓
Inspect Migration Artifact
        ↓
Inspect Designer Artifact
        ↓
Inspect EF Core Migration Registration
        ↓
Inspect Migration Application State
        ↓
Inspect Expected Physical Table
        ↓
Determine Database Initialization State
        ↓
Select Safe Action

===============================================================

## 26. Creation Flow — Not Initialized

When the initialization state is:

NotInitialized

the flow is:

No Valid Owned Migration Exists
        ↓
Request EF Core Migration Creation
using:
AutoSync_{MigrationKey}
        ↓
EF Core Generates Migration
        +
EF Core Generates Designer
        +
EF Core Updates Model Snapshot
        ↓
Verify Migration File Exists
        ↓
Verify Designer File Exists
        ↓
Identify Actual EF Core Migration ID
        ↓
Verify Migration Registration
        ↓
Apply Migration
        ↓
Verify Migration Applied
        ↓
Verify Expected Physical Table Exists
        ↓
Return Initialization Success

The engine does not manually create any of the EF-generated artifacts.

===============================================================

## 27. Creation Flow — Existing Migration Not Applied

When the initialization state is:

MigrationExistsNotApplied

the flow is:

Existing Owned Migration Identified
        ↓
Existing Designer Artifact Verified
        ↓
Migration Identity Verified
        ↓
Do Not Create New Migration
        ↓
Apply Existing Migration
        ↓
Verify Migration Applied
        ↓
Verify Expected Physical Table Exists
        ↓
Return Initialization Success

The existing migration remains the initialization migration for that ownership unit.

===============================================================

## 28. Creation Flow — Already Initialized

When the initialization state is:

Initialized

the flow is:

Existing Owned Migration Verified
        ↓
Designer Artifact Verified
        ↓
Migration Registration Verified
        ↓
Migration Application Verified
        ↓
Physical Table Verified
        ↓
No New Migration
        ↓
No Database Modification
        ↓
Return Already Initialized

Repeated execution must remain safe.

===============================================================

## 29. Creation Flow — Inconsistent

When the initialization state is:

Inconsistent

the flow is:

Inconsistency Detected
        ↓
Determine Exact Reason
        ↓
Stop Unsafe Processing
        ↓
Do Not Guess Ownership
        ↓
Do Not Create Another Migration
        ↓
Do Not Delete Existing Artifacts
        ↓
Do Not Modify EF-Generated Artifacts
        ↓
Do Not Perform Blind Automatic Repair
        ↓
Return Detailed Inconsistency Result

Only explicitly defined, deterministic, safe, and verifiable recovery operations may be performed automatically.

===============================================================

## 30. Developer Baseline Principle

After successful execution, the developer receives a ready database development baseline.

The completed baseline is:

Generated Backend Code
        +
Completed Backend Registration
        +
EF Core Initialization Migration
        +
EF Core Migration Designer Artifact
        +
EF Core Model Snapshot Update
        +
Applied Database Migration
        +
Verified Physical Database Table
        ↓
Developer Ready Baseline

From this point:

Developer
        ↓
Continues Module Development
        ↓
Creates Normal EF Core Migrations
        ↓
Continues Standard Database Development

Those future migrations are outside the responsibility of the Database Creation Engine.

The Creation Engine does not monitor, manage, modify, or own future developer migrations.

The initialization migration remains identifiable through its dedicated ownership identity.

===============================================================

## 31. Future Developer Migration Boundary

After the initialization baseline has been successfully created:

Database Creation Engine Responsibility
        ↓
ENDS

Future database changes belong to the normal development process.

For example:

Developer modifies Entity
        ↓
Developer creates a new EF Core Migration
        ↓
Developer applies the Migration

The Database Creation Engine does not:

- Create those migrations.
- Track those migrations as initialization artifacts.
- Modify those migrations.
- Delete those migrations.
- Apply special ownership to those migrations.

The initialization migration is a dedicated baseline artifact.

Future migrations remain normal developer-owned EF Core migrations.

===============================================================

## 32. Database Removal Engine Compatibility

The Database Removal Engine is a separate engine.

Its detailed implementation and removal strategy are intentionally outside the Database Creation Engine implementation.

However, the Creation Engine must establish clear ownership information that the Removal Engine can later use.

The shared ownership relationship is:

Code Synchronization ID
        ↓
Load Code Synchronization
        ↓
Dedicated Submenu Code
        ↓
Database Artifact Identity
        ↓
Migration Key
        ↓
Migration Name
        ↓
Actual Migration ID
        ↓
Entity
        ↓
Schema
        ↓
Table

The Removal Engine will use the same identity mechanism to identify the initialization baseline belonging to the same ownership unit.

The Removal Engine must not depend on manually inserted snapshot markers.

The Model Snapshot remains under EF Core ownership.

===============================================================

## 33. Failure and Safety Principle

The Database Engine must prioritize correctness over automatic recovery.

The engine must never:

Guess ownership

The engine must never:

Create another migration because
the existing state is unclear

The engine must never:

Modify EF-generated artifacts manually
to force consistency

The correct safety sequence is:

Detect
        ↓
Identify
        ↓
Inspect
        ↓
Classify
        ↓
Determine State
        ↓
Perform Only Deterministic Safe Action
        ↓
Verify Result

If a deterministic and safe action cannot be established:

STOP
        ↓
RETURN THE EXACT STATE
        ↓
DO NOT GUESS

===============================================================

## 34. Final Database Creation Engine Responsibility

The Database Creation Engine owns the initialization process.

Its complete responsibility is:

Receive Synchronization ID
        ↓
Resolve Synchronization Context
        ↓
Resolve Dedicated Submenu
        ↓
Read Submenu Code
        ↓
Resolve Generated Entity
        ↓
Resolve Expected Schema
        ↓
Resolve Expected Table
        ↓
Build Database Artifact Identity
        ↓
Inspect Migration
        ↓
Inspect Designer Artifact
        ↓
Inspect Migration Registration
        ↓
Inspect Migration Application
        ↓
Inspect Physical Table
        ↓
Determine Initialization State
        ↓
Create Migration Only When Absent
        ↓
Reuse Existing Migration When Valid
        ↓
Apply Migration When Required
        ↓
Verify Migration Application
        ↓
Verify Physical Database Table
        ↓
Return Deterministic Final Result

===============================================================

## 35. Final Locked Principles

The following principles are the foundation of the Database Engine rebuild.

### Principle 1

Database Creation and Database Removal are separate engines.

### Principle 2

One dedicated Backend Code Synchronization represents one database initialization ownership unit.

### Principle 3

The Code Synchronization ID is the operational identifier used to resolve the synchronization context.

### Principle 4

The Submenu Code is the permanent readable ownership key.

### Principle 5

The Migration Key is the normalized ownership key derived from the Submenu Code.

Example:

SUB-003-001-001
        ↓
SUB003001001

### Principle 6

The Migration Name is deterministically derived from the Migration Key.

Example:

AutoSync_SUB003001001

### Principle 7

One ownership unit may have only one dedicated AutoSync initialization migration.

### Principle 8

The actual EF Core Migration ID is a physical EF Core artifact identity and is not the permanent ownership key.

Example:

20260824153000_AutoSync_SUB003001001

### Principle 9

Repeated execution must be idempotent.

The engine must not create duplicate initialization migrations.

### Principle 10

The Database Engine determines the initialization state before taking action.

### Principle 11

EF Core generates and owns the migration file.

### Principle 12

EF Core generates and owns the migration designer file.

### Principle 13

EF Core generates and maintains the model snapshot.

### Principle 14

The Database Engine may identify and verify EF Core artifacts but must not manually generate or modify them.

### Principle 15

The Database Engine does not use manually inserted snapshot blocks as its ownership mechanism.

### Principle 16

Database tables are created through EF Core migration execution, not through separate manual table creation.

### Principle 17

The Database Engine orchestrates the initialization process.

### Principle 18

Shared components contain only common identity construction, migration tracking, database inspection, and shared state models.

### Principle 19

Shared components must not become a general collection of unrelated utility methods.

### Principle 20

Inconsistent states must not be guessed or blindly repaired.

### Principle 21

Automatic recovery may only occur when the recovery operation is explicitly defined, deterministic, safe, and verifiable.

### Principle 22

The Database Creation Engine establishes only the initial developer baseline.

### Principle 23

Future developer migrations remain outside the responsibility and ownership of the Database Creation Engine.

### Principle 24

The Database Removal Engine will use the same ownership identity but remains a separate engine with separate responsibilities.

===============================================================

## 36. FINAL DESIGN POSITION

The final Database Engine architecture is based on the following operating model:

CODE SYNCHRONIZATION
        ↓
GENERATED BACKEND CODE
        ↓
BACKEND REGISTRATION
        ↓
DATABASE CREATION ENGINE
        ↓
Resolve Synchronization
        ↓
Build Ownership Identity
        ↓
Inspect Current State
        ↓
Determine Initialization State
        ↓
Create Migration ONLY if absent
        ↓
EF CORE GENERATES:
    • Migration File
    • Designer File
    • Migration Metadata
    • Model Snapshot Update
        ↓
DATABASE CREATION ENGINE
        ↓
Verify Generated Artifacts
        ↓
Apply Migration when required
        ↓
Verify Migration Applied
        ↓
Verify Expected Database Table
        ↓
Return Deterministic Initialization Result
        ↓
DEVELOPER READY BASELINE

The final central principle is:

THE DATABASE ENGINE ORCHESTRATES

EF CORE EXECUTES

THE DATABASE ENGINE VERIFIES

And the complete engine philosophy is:

RESOLVE
        ↓
IDENTIFY
        ↓
INSPECT
        ↓
DETERMINE STATE
        ↓
CREATE ONLY WHEN ABSENT
        ↓
REUSE WHEN VALID
        ↓
APPLY WHEN REQUIRED
        ↓
VERIFY EVERYTHING
        ↓
RETURN DETERMINISTIC RESULT

This is the complete Final Database Engine Design Contract recommended as the starting point for the clean rebuild, without reusing the old Database Creation Engine code.
