# DATABASE CREATION ENGINE
# DESIGN CONTRACT

===============================================================

## Purpose

The Database Creation Engine is used only for initialization.

Its purpose is to create the initial database baseline for one dedicated Backend Code Synchronization so that developers receive a ready platform for further development.

After initialization, future database changes will be handled by developers through normal/manual EF Core migrations.

The Database Creation Engine and Database Removal Engine are separate engines.

This document defines only the Database Creation Engine.

---

## Overall Synchronization Flow

The Code Synchronization system has separate levels:

### 1. Code Synchronization Engine

Creates and synchronizes the dedicated backend code files for the selected Submenu Code / Synchronization ID.

↓

### 2. Backend Registration Engine

Registers the generated backend components into:

- AppDbContext.cs
- DependencyInjection.cs

↓

### 3. Database Engines

#### 3.1 Database Creation Engine

Creates the initial database baseline:

- Dedicated migration
- Dedicated migration designer file
- Database table
- Dedicated snapshot registration

#### 3.2 Database Removal Engine

Will later identify and remove the same initialization artifacts:

- Dedicated migration
- Dedicated designer file
- Dedicated snapshot section
- Dedicated database table

↓

### 4. Developer Baseline

After successful initialization, the developer receives a ready development baseline.

Any future database changes are handled through separate manual/development migrations.

---

## Core Ownership Principle

One dedicated Submenu Code represents one database initialization unit.

The Submenu Code is the permanent ownership key used to identify all initialization artifacts.

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

The same Submenu Code must later allow the Database Removal Engine to identify the exact initialization artifacts.

---

## Database Creation Flow

Code Synchronization ID
        ↓
Load Code Synchronization
        ↓
Load Dedicated Submenu
        ↓
Read Submenu Code
        ↓
Normalize Migration Key
        ↓
Check Existing Initialization Artifacts
        ↓
If initialization already exists:
    Reuse / verify existing artifacts
        ↓
Apply existing migration if required
        ↓
Return initialization status
        ↓
If initialization does not exist:
    Create dedicated migration
        ↓
Create dedicated designer file
        ↓
Register dedicated snapshot section
        ↓
Apply migration
        ↓
Verify database table
        ↓
Return success

---

## Migration Ownership

Example Submenu Code:

SUB-003-001-001

Normalized Migration Key:

SUB003001001

Migration name:

AutoSync_SUB003001001

Expected file pattern:

{Timestamp}_AutoSync_SUB003001001.cs

Designer file:

{Timestamp}_AutoSync_SUB003001001.Designer.cs

For one Submenu Code, only one initialization migration ownership must exist.

A repeated initialization attempt must not create another AutoSync migration for the same Submenu Code.

Instead, the engine must identify the existing initialization artifacts and verify or apply them when required.

---

## Snapshot Ownership

Each initialized Submenu Code must have one dedicated marked section inside:

AppDbContextModelSnapshot.cs

Format:

//===========================================================
// AUTO SYNC SNAPSHOT START : {SubmenuCode}
//===========================================================

{Entity snapshot configuration}

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

A repeated initialization attempt must not create another snapshot block for the same Submenu Code.

---

## Existing Initialization Handling

Before creating any new migration, the Database Creation Engine must identify whether initialization artifacts already exist for the dedicated Submenu Code.

The engine must check:

- Migration file
- Designer file
- Snapshot section
- Database table

Possible situations include:

### Initialization Already Complete

Migration, designer, snapshot, and table already exist.

Result:

Initialization already completed.

No new migration is created.

### Migration Exists but Table Is Missing

The existing migration belongs to the Submenu Code but has not been applied.

Result:

The existing migration is applied.

No new migration is created.

### Table Already Exists

The table already exists for the dedicated initialization.

Result:

The engine verifies the existing initialization state.

No duplicate migration is created.

### Initialization Does Not Exist

No dedicated migration ownership exists for the Submenu Code.

Result:

The engine creates the initial database artifacts.

---

## Physical Responsibilities

The Database Creation Engine is responsible for creating and managing the initialization state of:

1. Dedicated migration file
2. Dedicated migration designer file
3. Dedicated database table
4. Dedicated snapshot section

All artifacts must remain traceable to the same Submenu Code.

---

## Database Creation Engine SHALL

- Receive the Code Synchronization ID.
- Load the corresponding Code Synchronization.
- Load the dedicated Submenu.
- Read the dedicated Submenu Code.
- Identify the generated Entity and database table.
- Normalize the Submenu Code into the migration ownership key.
- Check whether initialization already exists.
- Prevent duplicate initialization migrations.
- Create one dedicated initialization migration when required.
- Create the corresponding designer file.
- Register one dedicated snapshot section.
- Apply the initialization migration.
- Verify the database table.
- Reuse and verify existing initialization artifacts on repeated attempts.
- Return the final initialization result.

---

## Database Creation Engine SHALL NOT

- Remove database tables.
- Delete migration files.
- Delete designer files.
- Remove snapshot sections.
- Perform database rollback.
- Perform database removal.
- Create duplicate initialization migrations for the same Submenu Code.
- Manage future developer database changes.

---

## Developer Baseline Principle

The Database Creation Engine is an initialization engine, not a long-term database development engine.

After successful initialization:

Generated Code
        +
Backend Registration
        +
Initial Migration
        +
Initial Database Table
        +
Snapshot Baseline
        ↓
Developer Ready Platform

Developers can then continue normal development and create their own migrations for future database changes.

The initialization migration remains identifiable as the baseline artifact owned by its Submenu Code.

---

## Database Removal Compatibility

The future Database Removal Engine must be able to use the same Submenu Code to identify the initialization baseline.

Example:

SUB-003-001-001
        ↓
*_AutoSync_SUB003001001.cs
        ↓
*_AutoSync_SUB003001001.Designer.cs
        ↓
AUTO SYNC SNAPSHOT START : SUB-003-001-001
        ↓
AUTO SYNC SNAPSHOT END : SUB-003-001-001
        ↓
Dedicated Database Table

The Database Creation Engine must therefore maintain one clear and traceable ownership relationship between the Submenu Code and its initialization artifacts.

---

## Locked Design Principle

One Submenu Code
        =
One Initialization Ownership Unit

That ownership unit connects:

Code Synchronization
        ↓
Generated Entity
        ↓
Database  Table
        ↓
Initialization Migration
        ↓
Designer File
        ↓
Snapshot Section

The Database Creation Engine creates and initializes this baseline.

The Database Removal Engine will later use the same Submenu Code to identify and remove the exact initialization artifacts.

No duplicate initialization migration may be created for the same Submenu Code.

Future developer migrations are o n nm nmgjgv

# DATABASE CREATION ENGINE
# RESPONSIBILITIES

===============================================================

## Purpose

The Database Creation Engine is responsible only for initializing the database baseline for one dedicated Backend Code Synchronization.

It prepares the initial database platform for further developer work.

Future database changes are outside the responsibility of this engine.

---

## Core Responsibility

One dedicated Submenu Code represents one database initialization ownership unit.

The Database Creation Engine uses that Submenu Code to create and track:

- Dedicated migration file
- Dedicated migration designer file
- Dedicated database table
- Dedicated snapshot section

---

## The Database Creation Engine SHALL

- Receive the Code Synchronization ID.
- Load the corresponding Code Synchronization.
- Load the dedicated Submenu.
- Read the dedicated Submenu Code.
- Identify the generated Entity and database table.
- Normalize the Submenu Code into the migration ownership key.
- Check whether initialization artifacts already exist.
- Prevent duplicate initialization migrations for the same Submenu Code.
- Create one dedicated initialization migration when required.
- Create the corresponding migration designer file.
- Register one dedicated snapshot section.
- Apply the initialization migration.
- Create the physical database table.
- Verify the database table.
- Reuse and verify existing initialization artifacts on repeated attempts.
- Return the final initialization result.
- Maintain artifact ownership so the future Database Removal Engine can identify the same initialization artifacts using the same Submenu Code.

---

## Repeated Initialization

If initialization already exists for a Submenu Code, the engine must not create another AutoSync migration.

It must check and reuse the existing:

- Migration file
- Designer file
- Snapshot section
- Database table

If the migration exists but the table is missing, the existing migration should be applied.

If the complete initialization already exists, the engine should return the initialization status without creating duplicate artifacts.

---

## The Database Creation Engine SHALL NOT

- Remove database tables.
- Delete migration files.
- Delete designer files.
- Remove snapshot sections.
- Perform database rollback.
- Perform database removal operations.
- Create duplicate initialization migrations for the same Submenu Code.
- Manage future developer database changes.
- Manage future manual/development migrations.

---

## Final Responsibility

The Database Creation Engine creates the initial development baseline:

Generated Code
        +
Backend Registration
        +
Dedicated Initialization Migration
        +
Dedicated Designer File
        +
Database Table
        +
Dedicated Snapshot Section
        ↓
Developer Ready Platform

The future Database Removal Engine will use the same Submenu Code to identify and remove the exact initialization artifacts.