===============================================================================
                    APPCORE ERP STUDIO
                  AI PAGE GENERATION RULES
===============================================================================

Version : 1.0

Purpose

This document defines the mandatory rules for AI-generated modules,
pages and source code within AppCore ERP Studio.

Every generated file must follow the Backend Development Contract
and Frontend Development Contract.

===============================================================================
1. GENERAL RULES
===============================================================================

Always follow existing project architecture.

Never invent a new architecture.

Never rename existing folders.

Never rename existing files.

Never change existing coding style.

Reuse existing project patterns.

Generate only what is requested.

===============================================================================
2. BEFORE GENERATING CODE
===============================================================================

Always identify

    Module

    Menu

    Submenu

    Entity Name

    Route

    API Endpoint

Determine whether

    New Page

    Existing Page Modification

    Backend Only

    Frontend Only

    Full Stack

Never assume missing information.

Ask if required information is unavailable.

===============================================================================
3. GENERATION ORDER
===============================================================================

Generate files in this order.

Backend

    Entity

    Configuration

    DTOs

    Repository Interface

    Repository

    Controller

    Dependency Injection

    DbContext (If Required)

Frontend

    Model

    Service

    Routes

    List Page

    Form Page

    Sidebar (If Required)

Never skip required files.

===============================================================================
4. BACKEND RULES
===============================================================================

Follow Backend Development Contract.

Repositories contain business logic.

Controllers contain request handling only.

Never create Service Layer.

Never place business logic inside Controllers.

Never change repository pattern.

===============================================================================
5. FRONTEND RULES
===============================================================================

Follow Frontend Development Contract.

Reuse existing shared components.

Maintain existing layout.

Maintain existing routing pattern.

Do not create duplicate UI components.

===============================================================================
6. FILE MODIFICATION RULES
===============================================================================

Modify only requested files.

Do not modify unrelated files.

Do not refactor existing code unless requested.

Do not change namespaces.

Do not change routes.

Do not rename classes.

Preserve existing comments.

Preserve existing formatting.

===============================================================================
7. CODE STYLE RULES
===============================================================================

Follow existing AppCore coding style.

Maintain comment sections.

Use meaningful names.

Keep methods small.

Avoid duplicate code.

Do not over-engineer.

Prefer consistency over creativity.

===============================================================================
8. OUTPUT RULES
===============================================================================

Always provide

    File Name

    File Location

Return complete file.

Never return partial implementation unless requested.

If file is too large

    Clearly indicate where code should be inserted.

===============================================================================
9. ERROR HANDLING
===============================================================================

Never guess.

Never fabricate missing code.

If dependency is missing

    Inform the user.

If ambiguity exists

    Ask before generating.

===============================================================================
10. SAFE CHANGES
===============================================================================

Allowed

    New Files

    New Methods

    New DTOs

    New Repository

    New Controller

    New Routes

Not Allowed

    Architecture Changes

    Project Refactoring

    Folder Renaming

    File Renaming

    Breaking Existing Pages

===============================================================================
11. AUTOMATIC PAGE GENERATION
===============================================================================

When a new Module/Menu/Submenu is created,
the AI shall automatically generate

Backend

    Entity

    Configuration

    DTOs

    Repository Interface

    Repository

    Controller

Frontend

    Model

    Service

    Routes

    List Page

    Form Page

Only minimal working code shall be generated.

Business logic shall not be generated automatically.

===============================================================================
12. VALIDATION CHECKLIST
===============================================================================

□ Folder Structure Correct

□ File Names Correct

□ Naming Convention Correct

□ Backend Contract Followed

□ Frontend Contract Followed

□ Build Compiles

□ Routes Registered

□ Dependency Injection Updated

□ API Connected

□ Shared Components Used

□ No Existing Functionality Broken

===============================================================================
13. CHANGE CONTROL RULES
===============================================================================

Do not improve existing code unless requested.

Do not refactor existing code unless requested.

Do not optimize existing code unless requested.

Do not simplify existing code unless requested.

Do not change application behavior unless requested.

Generate only the requested feature.

When modifying an existing file, preserve all unrelated code.

Minimize changes to existing files.

Backward compatibility is mandatory.

===============================================================================
14. DEVELOPMENT WORKFLOW
===============================================================================

Every new module shall follow this workflow.

STEP 1

    Requirement Analysis

    Module Design

    Database Design

    UI Layout Approval

STEP 2

    Frontend Development

        Model

        Service

        Routes

        List Page

        Form Page

STEP 3

    Frontend Review

        UI Review

        Workflow Approval

STEP 4

    Backend Development

        Entity

        Configuration

        DTOs

        Repository Interface

        Repository

        Controller

STEP 5

    Integration

        API Connection

        CRUD Testing

        Validation

STEP 6

    Final Review

        UI

        Backend

        Performance

        Contract Validation

Never begin backend implementation before frontend
design has been approved.

===============================================================================
15. AI RESPONSE RULES
===============================================================================

Always follow the approved module design.

Always follow the approved page layout.

Always generate code in the defined workflow.

Never redesign an approved page.

Never modify unrelated functionality.

Always return complete files unless instructed otherwise.

If a file is too large, clearly indicate the section to replace.

Ask before making architectural decisions.

Follow the Backend Development Contract.

Follow the Frontend Development Contract.

Follow this AI Page Generation Rules document.

===============================================================================
END OF DOCUMENT
===============================================================================