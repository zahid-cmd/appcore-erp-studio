===============================================================================
                    APPCORE ERP STUDIO
                 BACKEND DEVELOPMENT CONTRACT
===============================================================================

Version : 1.0

===============================================================================
1. BACKEND SOLUTION STRUCTURE
===============================================================================

Backend_Studio

    Studio_API

    Studio_Application

    Studio_Domain

    Studio_Infrastructure

The backend architecture consists of four projects.

Each project has a dedicated responsibility.

No additional projects should be added without architectural approval.

===============================================================================
2. STUDIO_API
===============================================================================

Purpose

    Expose backend API endpoints.

Contains

    Controllers

    Program.cs

Responsibilities

    Receive HTTP Request

    Validate Request

    Call Repository Interface

    Return HTTP Response

Rules

    No business logic.

    No database operations.

    No Entity Framework queries.

    Use constructor dependency injection only.

===============================================================================
3. STUDIO_APPLICATION
===============================================================================

Purpose

    Define application contracts.

Structure

    Module

        Menu

            DTOs

                CreateModuleDto.cs

                UpdateModuleDto.cs

                ModuleDto.cs

                ModuleDefaultsDto.cs

                ModuleHistoryDto.cs (If Required)

            Interfaces

                IModuleRepository.cs

Contains

    DTOs

    Repository Interfaces

Responsibilities

    Data Transfer Objects

    Repository Contracts

Rules

    No implementation.

    No database operations.

    No business logic.

===============================================================================
4. STUDIO_DOMAIN
===============================================================================

Purpose

    Define domain models.

Structure

    Common

        BaseEntity.cs

        Shared Classes

    Module

        Menu

            Module.cs

Contains

    Entities

    BaseEntity

    Common Classes

Responsibilities

    Domain Properties

    Navigation Properties

    Relationships

    Default Values

Rules

    No repository code.

    No controller code.

    No DTO code.

    No database queries.

===============================================================================
5. STUDIO_INFRASTRUCTURE
===============================================================================

Purpose

    Implement backend functionality.

Structure

    Common

        Shared Repositories

        Shared Components

    Module

        Menu

            Configurations

                ModuleConfiguration.cs

            Repositories

                ModuleRepository.cs

    AppDbContext.cs

    DependencyInjection.cs

Contains

    Repository Implementations

    Entity Configurations

    Database Context

    Dependency Injection

Repository Responsibilities

    Business Logic

    Database Operations

    Validation

    History

    Restore

    Default Values

Configuration Responsibilities

    Entity Framework Core Mapping

Rules

    All Entity Framework operations are performed here.
    
===============================================================================
5. STUDIO_INFRASTRUCTURE
===============================================================================

Purpose

    Implement backend functionality.

Structure

    CodeMaster

        Shared code generation

    Common

        Shared Repositories

        Shared Components

    Configurations

        Module

            Menu

                EntityConfiguration.cs

    Repositories

        Module

            Menu

                EntityRepository.cs

    Persistence

        AppDbContext.cs

    Migrations

    DependencyInjection.cs

Contains

    Repository Implementations

    Entity Configurations

    Database Context

    Entity Framework Migrations

    Dependency Injection

Repository Responsibilities

    Business Logic

    Database Operations

    Validation

    History

    Restore

    Default Values

Configuration Responsibilities

    Entity Framework Core Mapping

Rules

    All Entity Framework operations are performed here.

    Configurations are organized by

        Module

            Menu

    Repositories are organized by

        Module

            Menu

    Multiple related configuration files may exist directly
    under the corresponding menu folder.

    Multiple related repository files may exist directly
    under the corresponding menu folder.

    Do not create an additional folder for every entity
    unless there is a functional reason.

===============================================================================
6. STANDARD PAGE STRUCTURE
===============================================================================

Studio_API

    InfrastructureControl

        DevelopmentManagement

            ProjectSynchronizationController.cs

            ModuleSynchronizationController.cs

            MenuSynchronizationController.cs

            SubmenuSynchronizationController.cs


Studio_Application

    InfrastructureControl

        DevelopmentManagement

            ProjectSynchronization

                DTOs

                    CreateProjectSynchronizationDto.cs

                    UpdateProjectSynchronizationDto.cs

                    ProjectSynchronizationDto.cs

                    ProjectSynchronizationDefaultsDto.cs

                    ProjectSynchronizationHistoryDto.cs (If Required)

                Interfaces

                    IProjectSynchronizationRepository.cs


            ModuleSynchronization

                DTOs

                    CreateModuleSynchronizationDto.cs

                    UpdateModuleSynchronizationDto.cs

                    ModuleSynchronizationDto.cs

                    ModuleSynchronizationDefaultsDto.cs

                    ModuleSynchronizationHistoryDto.cs (If Required)

                Interfaces

                    IModuleSynchronizationRepository.cs


            MenuSynchronization

                DTOs

                    CreateMenuSynchronizationDto.cs

                    UpdateMenuSynchronizationDto.cs

                    MenuSynchronizationDto.cs

                    MenuSynchronizationDefaultsDto.cs

                    MenuSynchronizationHistoryDto.cs (If Required)

                Interfaces

                    IMenuSynchronizationRepository.cs


            SubmenuSynchronization

                DTOs

                    CreateSubmenuSynchronizationDto.cs

                    UpdateSubmenuSynchronizationDto.cs

                    SubmenuSynchronizationDto.cs

                    SubmenuSynchronizationDefaultsDto.cs

                    SubmenuSynchronizationHistoryDto.cs (If Required)

                Interfaces

                    ISubmenuSynchronizationRepository.cs


Studio_Domain

    InfrastructureControl

        DevelopmentManagement

            ProjectSynchronization.cs

            ModuleSynchronization.cs

            MenuSynchronization.cs

            SubmenuSynchronization.cs


Studio_Infrastructure

    Configurations

        InfrastructureControl

            DevelopmentManagement

                ProjectSynchronizationConfiguration.cs

                ModuleSynchronizationConfiguration.cs

                MenuSynchronizationConfiguration.cs

                SubmenuSynchronizationConfiguration.cs


    Repositories

        InfrastructureControl

            DevelopmentManagement

                ProjectSynchronizationRepository.cs

                ModuleSynchronizationRepository.cs

                MenuSynchronizationRepository.cs

                SubmenuSynchronizationRepository.cs


    Persistence

        AppDbContext.cs


    DependencyInjection.cs


The same folder structure and naming convention apply to

    Human Resource

    Navigation Management

    Security Permission

    Every future module

    Every future menu

    Every future entity.
===============================================================================
8. CONTROLLER STANDARD
===============================================================================

Responsibilities

    Receive Request

    Call Repository Interface

    Return Response

Do Not

    Business Logic

    Database Query

    Entity Framework Code

===============================================================================
9. STANDARD CONTROLLER ENDPOINTS
===============================================================================

GET

    Defaults

    List

    Details

    History (If Required)

POST

    Create

PUT

    Update

    Restore

    Refresh (If Required)

DELETE

    Delete

===============================================================================
10. REPOSITORY STANDARD
===============================================================================

Responsibilities

    Business Logic

    Database Operations

    Validation

    History

    Restore

    Default Values

===============================================================================
11. STANDARD REPOSITORY METHODS
===============================================================================

GetDefaultsAsync()

GetAllAsync()

GetByIdAsync()

GetHistoryAsync()           (If Required)

CreateAsync()

UpdateAsync()

DeleteAsync()

RestoreAsync()

RefreshAsync()              (If Required)

ExistsAsync()

Additional helper methods when required.

===============================================================================
12. DTO STANDARD
===============================================================================

Every DTO folder shall contain

    CreateModuleDto.cs

    UpdateModuleDto.cs

    ModuleDto.cs

    ModuleDefaultsDto.cs

Optional

    ModuleHistoryDto.cs

The same convention applies to

    Menu

    Submenu

    Activity

    RoleProfile

    and every future backend page.

===============================================================================
13. ENTITY STANDARD
===============================================================================

Entity contains

    Properties

    Navigation Properties

    Default Values

Entity must not contain

    Business Logic

    Repository Logic

    Controller Logic

===============================================================================
14. CONFIGURATION STANDARD
===============================================================================

One Entity

    One Configuration

Naming

    ModuleConfiguration.cs

Use

    Fluent API

Configuration is responsible only for

    Entity Mapping

===============================================================================
15. DEPENDENCY INJECTION
===============================================================================

Register every Repository Interface.

Register every Repository Implementation.

DependencyInjection.cs is registered from

    Program.cs

Never instantiate Repository manually.

===============================================================================
16. DATABASE
===============================================================================

Use

    Entity Framework Core

Database Context

    AppDbContext

Every Entity

    DbSet Registration

Every Configuration

    ApplyConfiguration()

===============================================================================
17. FILE NAMING
===============================================================================

Controller

    ModuleController.cs

Entity

    Module.cs

Repository

    ModuleRepository.cs

Repository Interface

    IModuleRepository.cs

Configuration

    ModuleConfiguration.cs

DTO Folder

    CreateModuleDto.cs

    UpdateModuleDto.cs

    ModuleDto.cs

    ModuleDefaultsDto.cs

Optional

    ModuleHistoryDto.cs

The same naming convention applies to

    Menu

    Submenu

    Activity

    RoleProfile

    and every future backend page.

===============================================================================
18. METHOD NAMING
===============================================================================

Use PascalCase.

Examples

    GetDefaultsAsync()

    GetAllAsync()

    GetByIdAsync()

    GetHistoryAsync()

    CreateAsync()

    UpdateAsync()

    DeleteAsync()

    RestoreAsync()

    RefreshAsync()

    ExistsAsync()

===============================================================================
19. COMMENTS
===============================================================================

Use standard AppCore section comments.

//===============================================================
// Imports
//===============================================================

//===============================================================
// Create Module
//===============================================================

Maintain the same comment style throughout the project.

===============================================================================
20. CODING STYLE
===============================================================================

One public class per file.

One responsibility per class.

Opening braces on new line.

Use four-space indentation.

Use meaningful names.

Avoid duplicate code.

Keep methods short and readable.

Maintain existing AppCore coding style.

===============================================================================
21. GENERAL RULES
===============================================================================

Follow existing AppCore architecture.

Follow existing folder structure.

Follow existing naming convention.

Follow existing repository pattern.

Follow existing controller pattern.

Maintain repository method order.

Maintain controller endpoint order.

Do not introduce new architectural patterns.

Every new backend page must follow this document.

===============================================================================
END OF DOCUMENT
===============================================================================
