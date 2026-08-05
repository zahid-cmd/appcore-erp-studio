===============================================================================
                    APPCORE ERP STUDIO
               FRONTEND DEVELOPMENT CONTRACT
===============================================================================

Version : 1.0

===============================================================================
1. FRONTEND SOLUTION STRUCTURE
===============================================================================

Frontend_Studio

    Studio_UI

Frontend is organized by modules.

===============================================================================
2. FIXED APPLICATION STRUCTURE
===============================================================================

The following folders are part of the application architecture and are fixed.

Frontend_Studio
└── Studio_UI
    └── src
        ├── app
        ├── core
        ├── environments
        ├── features
        └── shared

Module Synchronization shall not create, rename, or modify these folders.

Only module-specific folders are created under:

    src/features

===============================================================================
3. STANDARD PAGE STRUCTURE
===============================================================================

Pages

    Module

        ModuleList

            module-list.html

            module-list.ts

            module-list.css

        ModuleForm

            module-form.html

            module-form.ts

            module-form.css

The same structure applies to

    Menu

    Submenu

    Activity

    Role Profile

===============================================================================
4. REQUIRED FILES
===============================================================================

Model

Service

Routes

List Page

Form Page

HTML

TypeScript

CSS

===============================================================================
5. MODEL STANDARD
===============================================================================

One model per entity.

Examples

ModuleModel

MenuModel

SubmenuModel

ActivityModel

RoleProfileModel

===============================================================================
6. SERVICE STANDARD
===============================================================================

One service per module.

Responsibilities

    Call Backend API

    Return Observable

    No UI Logic

===============================================================================
7. ROUTING STANDARD
===============================================================================

Each module contains its own routing file.

Routes are registered in the parent routing.

===============================================================================
8. LIST PAGE STANDARD
===============================================================================

Files

    module-list.html

    module-list.ts

    module-list.css

Responsibilities

    Search

    Load List

    Refresh

    Delete

    Restore (If Required)

    Navigate To Form

===============================================================================
9. FORM PAGE STANDARD
===============================================================================

Files

    module-form.html

    module-form.ts

    module-form.css

Responsibilities

    Load Record

    Create

    Update

    Validation

    Save

    Clear

    Cancel

===============================================================================
10. TYPESCRIPT STANDARD
===============================================================================

Recommended Method Order

    Constructor

    ngOnInit()

    load()

    loadDefaults()

    save()

    update()

    delete()

    restore()

    refresh()

    Event Methods

    Helper Methods

===============================================================================
11. HTML STANDARD
===============================================================================

Use AppCore shared components.

Maintain standard page layout.

Avoid inline styles.

===============================================================================
12. SHARED COMPONENT STANDARD
===============================================================================

Reuse existing AppCore shared components.

Do not recreate existing controls.

Maintain consistent UI across all pages.

Create new shared components only when existing
components cannot satisfy the requirement.

===============================================================================
13. CSS STANDARD
===============================================================================

One CSS file per page.

Reuse shared styles.

Maintain AppCore design.

No inline CSS.

===============================================================================
14. FILE NAMING
===============================================================================

List Page

    module-list.*

Form Page

    module-form.*

Service

    module.service.ts

Model

    module.model.ts

Routes

    module.routes.ts

Same naming convention applies to

    Menu

    Submenu

    Activity

    Role Profile

===============================================================================
15. GENERAL RULES
===============================================================================

Follow existing AppCore architecture.

Follow existing folder structure.

Follow existing naming convention.

Reuse shared components.

Maintain existing page layout.

Maintain existing coding style.

Do not introduce new frontend architecture.

Every CRUD page shall contain

    List Page

    Form Page

Every new frontend page must follow this document.

===============================================================================
16. PAGE CREATION CHECKLIST
===============================================================================

□ Model Created

□ Service Created

□ Routes Created

□ List Page Created

□ Form Page Created

□ Navigation Registered (If Required)

□ Shared Components Used

□ Backend API Connected

□ Build Successful

□ Follows Frontend Development Contract

===============================================================================
END OF DOCUMENT
===============================================================================