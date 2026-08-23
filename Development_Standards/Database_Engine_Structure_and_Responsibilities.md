DATABASE ENGINE STRUCTURE AND RESPONSIBILITIES

===============================================================

Purpose

===============================================================

The Database Engine is part of the AppCore ERP backend synchronization
initialization process.

It provides a traceable database initialization baseline for each
dedicated submenu-level Backend Code Synchronization.

The Database Creation Engine and Database Removal Engine are separate
engines with separate responsibilities.

The shared components exist only to provide common artifact
identification, migration tracking, snapshot tracking, and shared
database artifact models.


===============================================================
Clean Architecture Placement
===============================================================

Backend_Studio
│
├── AppCore.API
│
├── AppCore.Application
│   │
│   └── Platform
│       └── SynchronizationEngineInterfaces
│           └── DatabaseEngine
│               ├── IDatabaseCreationEngine.cs
│               └── IDatabaseRemovalEngine.cs
│
├── AppCore.Domain
│
└── AppCore.Infrastructure
    │
    └── Platform
        └── Synchronization
            └── DatabaseEngine
                │
                ├── Shared
                │   ├── DatabaseArtifactHelper.cs
                │   ├── DatabaseMigrationHelper.cs
                │   ├── DatabaseSnapshotHelper.cs
                │   │
                │   └── Models
                │       ├── DatabaseArtifactInfo.cs
                │       ├── DatabaseMigrationInfo.cs
                │       └── DatabaseTableInfo.cs
                │
                ├── DatabaseCreationEngine
                │   └── DatabaseCreationEngine.cs
                │
                └── DatabaseRemovalEngine
                    └── DatabaseRemovalEngine.cs


===============================================================
Application Layer
===============================================================

Location:

AppCore.Application
└── Platform
    └── SynchronizationEngineInterfaces
        └── DatabaseEngine

Files:

IDatabaseCreationEngine.cs

IDatabaseRemovalEngine.cs


Responsibility:

The Application layer contains only the engine contracts.

The implementation remains inside AppCore.Infrastructure.


===============================================================
Infrastructure Layer
===============================================================

Location:

AppCore.Infrastructure
└── Platform
    └── Synchronization
        └── DatabaseEngine


===============================================================
Shared Artifact Tracking Logic
===============================================================

The Shared folder contains common logic required by both:

- Database Creation Engine
- Database Removal Engine

The Shared folder must remain limited to database artifact ownership,
identification, tracking, and shared models.

It must not become a collection of unrelated utility methods.


===============================================================
DatabaseArtifactHelper.cs
===============================================================

Purpose:

Central ownership and artifact identification helper.

Responsibilities may include:

- Read Submenu Code.
- Normalize Migration Key.
- Build the database artifact identity.
- Find existing migration ownership.
- Find existing designer ownership.
- Identify the dedicated snapshot block.
- Identify the database table ownership.

Core ownership flow:

Submenu Code
    ↓
Normalize Migration Key
    ↓
Identify Migration
Identify Designer
Identify Snapshot Block
Identify Table


The same artifact identity must be usable by both the Creation Engine
and the future Removal Engine.


===============================================================
DatabaseMigrationHelper.cs
===============================================================

Purpose:

Handle dedicated migration artifact identification and tracking.

Responsibilities:

- Find Migration File.
- Find Designer File.
- Check whether a dedicated migration already exists.
- Create the dedicated migration name.
- Read migration information.
- Return migration artifact information.

Example:

Original Submenu Code:

SUB-003-001-001

Normalized Migration Key:

SUB003001001

Migration Name:

AutoSync_SUB003001001


Key rule:

If a dedicated migration already exists for the same Submenu Code,
the Database Creation Engine must identify and reuse that existing
migration identity.

It must not create another dedicated migration for the same submenu
ownership unit.


===============================================================
DatabaseSnapshotHelper.cs
===============================================================

Purpose:

Handle the dedicated synchronization snapshot section inside:

AppDbContextModelSnapshot.cs


Each synchronization has its own marked snapshot block.

Format:

//===========================================================
// AUTO SYNC SNAPSHOT START : {SubmenuCode}
//===========================================================

{Generated Entity Snapshot Configuration}

//===========================================================
// AUTO SYNC SNAPSHOT END : {SubmenuCode}
//===========================================================


Example:

//===========================================================
// AUTO SYNC SNAPSHOT START : SUB-003-001-001
//===========================================================

// Company entity snapshot configuration

//===========================================================
// AUTO SYNC SNAPSHOT END : SUB-003-001-001
//===========================================================


Responsibilities:

- Find an existing dedicated snapshot block.
- Identify snapshot ownership by Submenu Code.
- Support creation of a dedicated snapshot section.
- Support future identification by the Database Removal Engine.

The Database Creation Engine creates the section.

The Database Removal Engine will later use the same markers to identify
the exact section.


===============================================================
Shared Models
===============================================================


DatabaseArtifactInfo.cs

Purpose:

Represents the complete database artifact ownership information.

Expected information:

- Submenu Code.
- Normalized Migration Key.
- Migration File.
- Designer File.
- Snapshot File.
- Table Name.


DatabaseMigrationInfo.cs

Purpose:

Represents migration-specific information.

Expected information:

- Migration Name.
- Migration File Path.
- Designer File Path.
- Migration Exists.


DatabaseTableInfo.cs

Purpose:

Represents physical database table information.

Expected information:

- Schema.
- Table Name.


===============================================================
Database Creation Engine
===============================================================

Location:

AppCore.Infrastructure
└── Platform
    └── Synchronization
        └── DatabaseEngine
            └── DatabaseCreationEngine
                └── DatabaseCreationEngine.cs


Purpose:

Create the initial physical database baseline for one dedicated
Backend Code Synchronization.


Creation flow:

Code Synchronization ID
        ↓
Load Code Synchronization
        ↓
Load dedicated Submenu
        ↓
Read Submenu Code
        ↓
Normalize Migration Key
        ↓
Identify generated Entity / Table
        ↓
Check existing dedicated artifacts
        ↓
Create or identify dedicated Migration
        ↓
Identify dedicated Designer File
        ↓
Apply Migration
        ↓
Create or verify Database Table
        ↓
Create or verify dedicated Snapshot Section
        ↓
Return final result


The Database Creation Engine is responsible for:

- Receiving the Code Synchronization ID.
- Loading the corresponding Code Synchronization.
- Loading the dedicated Submenu.
- Reading the dedicated Submenu Code.
- Normalizing the Migration Key.
- Identifying the generated Entity and Table.
- Checking whether dedicated artifacts already exist.
- Creating the dedicated migration when required.
- Identifying the dedicated designer file.
- Applying the dedicated migration.
- Creating or verifying the physical database table.
- Creating or verifying the dedicated snapshot section.
- Returning the final creation result.


Important ownership rule:

One Submenu Code represents one dedicated database synchronization unit.

Repeated creation attempts for the same Submenu Code must not create
multiple dedicated migrations.

The engine must first identify whether the dedicated migration artifacts
already exist.


The Database Creation Engine SHALL NOT:

- Remove database tables.
- Delete migration files.
- Delete designer files.
- Remove snapshot sections.
- Perform database rollback.
- Perform database removal operations.


===============================================================
Database Removal Engine
===============================================================

Location:

AppCore.Infrastructure
└── Platform
    └── Synchronization
        └── DatabaseEngine
            └── DatabaseRemovalEngine
                └── DatabaseRemovalEngine.cs


Purpose:

The Database Removal Engine will later remove the exact initialization
database artifacts belonging to one dedicated Submenu Code.


It will use the same ownership identity to identify:

- Dedicated Migration File.
- Dedicated Designer File.
- Dedicated Snapshot Section.
- Dedicated Database Table.


Removal flow:

Code Synchronization ID
        ↓
Load Code Synchronization
        ↓
Load dedicated Submenu
        ↓
Read Submenu Code
        ↓
Normalize Migration Key
        ↓
Identify exact database artifacts
        ↓
Identify dedicated Migration
Identify dedicated Designer
Identify dedicated Snapshot Section
Identify dedicated Database Table
        ↓
Perform removal according to the Database Removal Engine design


The Database Removal Engine is a separate engine.

Its detailed implementation remains pending.


===============================================================
Core Ownership Principle
===============================================================

Every submenu-level Backend Code Synchronization requiring a database
table is identified by its dedicated Submenu Code.

The Submenu Code is the permanent ownership key for the initialization
database artifacts.

Example:

SUB-003-001-001
        ↓
Generated Entity
        ↓
Database Table
        ↓
Dedicated Migration
        ↓
Dedicated Designer File
        ↓
Dedicated Snapshot Section


One Submenu Code connects:

Code Synchronization
        ↓
Entity
        ↓
Database Table
        ↓
Migration File
        ↓
Designer File
        ↓
Snapshot Section


This identity must remain traceable so that the Database Removal Engine
can later identify the exact initialization artifacts belonging to that
same Submenu Code.


===============================================================
Initialization Baseline Principle
===============================================================

These engines are intended for initialization before further module
development.

The process creates a ready development baseline:

Code Synchronization Engine
        ↓
Writes generated backend code into dedicated files

Backend Registration Engine
        ↓
Registers generated backend components

Database Creation Engine
        ↓
Creates dedicated database initialization artifacts

Developer
        ↓
Receives the ready initialization baseline


After initialization, developers may continue development and create
their own normal manual migrations for future database changes.

The Database Creation Engine is responsible only for establishing the
initial dedicated baseline.

Future manual development migrations are outside the ownership of this
initialization engine.


===============================================================
Locked Design Principle
===============================================================

Creation and Removal are separate engines.

Shared components provide common artifact identification and tracking.

One dedicated Submenu Code represents one database synchronization
ownership unit.

That same ownership identity must allow:

Database Creation Engine
        ↓
Create and identify initialization artifacts

and later:

Database Removal Engine
        ↓
Identify the same initialization artifacts for removal


The system must never create duplicate dedicated migration ownership for
the same Submenu Code.