AppCore ERP — Login Page Design & Configuration Studio
Full Development Contract — Revised Baseline

Status: Development Baseline
Module: Infrastructure Control → Application Configuration → Login Pages
Purpose: Database-driven Login Page design, configuration, preview and publishing system.

1. Core Objective

The system will provide a database-driven Login Page Design & Configuration Studio inside the ERP.

The administrator will be able to create and configure Login Page designs from:

Infrastructure Control
    ↓
Application Configuration
    ↓
Login Pages

The administrator will not write HTML/CSS or modify Angular code to change the public Login Page design.

The public Login Page will render its appearance from the published database configuration.

2. Existing Login Pages CRUD

The existing CRUD system remains the master management layer:

Application Configuration
    └── Login Pages
         ├── Login Pages List
         └── Login Page Form

The existing Login Pages CRUD will not be replaced.

The Form Page will be upgraded into a Login Page Design & Configuration Studio.

3. Fundamental Architecture

The architecture will be:

                    ERP ADMIN
                        │
                        ▼
              Login Pages Management
                        │
                        ▼
          Login Page Design Studio
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
     Configuration DB        Reusable UI Components
            │                       │
            └───────────┬───────────┘
                        ▼
                Published Design
                        │
                        ▼
                  PUBLIC /login
                        │
                        ▼
               Login Page Renderer
                        │
                        ▼
                 Authentication API
4. Component-Based Form Architecture

The Login Page Form will not become one huge Angular page.

Several reusable child components will be created and maintained through the existing:

Component Management

system.

The Login Page Form will act as the orchestrator/container.

Conceptually:

Login Page Form
│
├── General Configuration
├── Branding Configuration
├── Layout Configuration
├── Background Configuration
├── Promotional Panel Configuration
├── Login Panel Configuration
├── Registration Configuration
├── Password Recovery Configuration
├── Footer Configuration
├── Responsive Configuration
└── Live Preview

These should become reusable application components where appropriate.

5. Component Management Principle

The child components should follow the existing AppCore Component Management architecture.

We should not create disposable page-specific UI blocks unnecessarily.

For example, a reusable:

Login Page Preview

could potentially be used by:

Login Page Form
Public Login Page
Fullscreen Preview
Future Client Portal Login

The exact component list will be finalized after reviewing the existing Component Management structure.

6. Login Page Form Is an Administrative Design Studio

The Form Page should visually differ from ordinary ERP CRUD forms.

It should provide:

Configuration
       +
Live Preview
       +
Responsive Preview
       +
Fullscreen Preview
       +
Save
       +
Publish

The objective is to allow the administrator to design/configure the public Login Page without leaving the ERP.

7. Fullscreen Mode

A Fullscreen button is required.

Example:

[ Preview ] [ Fullscreen ] [ Save Draft ] [ Publish ]

Fullscreen is an ERP administrator/design function only.

It must never appear on the public Login Page.

Normal Form
ERP Header
ERP Sidebar

Login Page Design Studio
─────────────────────────────────────────────

Configuration       Live Preview
Fullscreen
┌──────────────────────────────────────────────────────┐
│                                                      │
│              LOGIN PAGE PREVIEW                     │
│                                                      │
│          Exact public-page presentation              │
│                                                      │
└──────────────────────────────────────────────────────┘

The ERP shell should be hidden while fullscreen preview is active.

An administrator should be able to exit fullscreen and return to the Design Studio.

8. Live Preview

The Form Page should provide a live preview.

Configuration changes should be reflected in the preview without requiring the administrator to navigate to the public Login Page.

Concept:

Configuration Change
        ↓
Component State
        ↓
Live Preview

The preview should use the same reusable rendering components used by the public Login Page wherever practical.

This is important because it minimizes the possibility of:

Admin Preview ≠ Actual Public Login Page

9. Preview Modes

The Design Studio should eventually support:

Desktop
Tablet
Mobile
Fullscreen

Example toolbar:

[ Desktop ] [ Tablet ] [ Mobile ] [ Fullscreen ]

The first implementation may prioritize Desktop and Fullscreen, but the architecture should not prevent Tablet/Mobile preview later.

10. Database-Driven Principle

The Login Page must be configuration-driven rather than hardcoded.

Database-controlled items may include:

Page name
Branding
Logo
Colors
Text
Labels
Images
Layout selection
Promotional content
Feature blocks
Login panel presentation
Registration presentation
Password recovery presentation
Footer
Visibility options
Responsive presentation settings
11. Application-Controlled Principle

Security and application behavior must not become arbitrary database configuration.

The database should not control:

Password hashing
Authentication algorithms
JWT generation
Authorization enforcement
API security
Guards
Interceptors
Credential verification
Permission calculation
Security-sensitive business rules

Therefore:

DATABASE
    ↓
Presentation / Configuration

while:

APPLICATION
    ↓
Authentication / Security / Authorization
12. General Configuration

The Login Page configuration should contain appropriate general information such as:

Page Code
Page Name
Description
Status
Active / Inactive

The system-generated Code should remain system-controlled where applicable.

13. Draft and Published Design

I strongly recommend separating editing from public publishing.

The design lifecycle should be:

Draft
  ↓
Preview
  ↓
Publish
  ↓
Public Login

The administrator should be able to work on a Login Page without immediately changing the public Login Page.

Recommended actions:

[ Save Draft ]   [ Preview ]   [ Publish ]

The public /login should use the published active configuration.

14. Active Login Page

There should be a controlled mechanism for determining which Login Page is publicly active.

Conceptually:

Login Pages
────────────────────────────────
LP-001   AppCore Corporate     Published
LP-002   AppCore Dark          Draft
LP-003   AppCore Minimal       Inactive

The public Login endpoint should not arbitrarily select a random record.

There should be one controlled published/active design according to the final database rule.

15. Branding Configuration

The Branding section should control:

Company Name
Logo
Logo Size
Logo Position
Primary Brand Color
Secondary Brand Color
Accent Color

Current company identity:

AppCore Technologies Limited

Domain convention:

@appcoretechnologies.com

These should be reflected consistently throughout the Login experience.

16. Login Page Layout

The system should support predefined layout types rather than unrestricted CSS editing.

Initial supported concept:

Split Screen

Potential future layouts:

Split Screen
Centered Login
Full Background
Minimal

For the current AppCore design, the primary design is:

Left Promotional / Brand Area
            +
Right Login Area
17. Promotional / Brand Panel

The left side should be configurable.

Possible configuration:

Heading
Subheading
Description
Feature Blocks
Feature Icons
Background Image
Decorative Elements

Example:

Technology
That Empowers
Progress

The exact wording should be database-driven.

18. Feature Blocks

Feature blocks should not be hardcoded into the HTML.

Example:

Integrated Solutions
One platform for your entire business

Secure & Compliant
Enterprise-grade security and governance

Built for Growth
Scalable technology for tomorrow

The number of feature blocks should be controlled by the configuration model/component design.

19. Background Configuration

Support:

Solid
Gradient
Image
Image + Overlay

Configuration may include:

Background Image
Overlay
Overlay Opacity
Image Position
Image Size

The previously generated AppCore visual concepts can be used as references/assets, but the actual renderer must be database-driven.

20. Login Panel Configuration

The Login Panel should configure:

Heading
Subheading
Login ID Label
Login ID Placeholder
Password Label
Password Placeholder
Login Icons
Remember Me
Forgot Password
Login Button

Example:

Welcome to
AppCore Technologies Limited

Sign in to your workspace
21. Login ID / Work Email

The actual authentication identifier will remain controlled by the authentication contract.

The presentation may be configured as:

Label:
Login ID

Placeholder:
Enter your login ID

or, if the authentication design later uses email:

Label:
Work Email

Placeholder:
username@appcoretechnologies.com

The database controls presentation; the authentication backend controls actual validation.

22. Password

The password UI should support:

Password
Show / Hide
Password Icon
Placeholder

Password itself is never stored in Login Page configuration.

23. Remember Me

Configuration:

Show Remember Me
Label
Default State

The actual session behavior remains controlled by the authentication implementation.

24. Forgot Password

Configuration:

Show Forgot Password
Label

Example:

Forgot password?

The actual password recovery process remains application-controlled.

25. Sign In Button

Configuration may include:

Button Text
Icon
Icon Position
Width
Style
Border Radius
Primary Color
Hover Behavior
Loading Text

But the actual login action must remain application-controlled.

26. Registration Section

This is directly connected to our previously approved registration architecture.

The Login Page should support:

Show Registration
Heading
Description
Button Text

Example:

Don't have an account?

Create a new account and get started.

[ Register Now ]

Clicking Register Now will navigate to the approved public registration page.

27. Registration Security Boundary

The Login Page configuration must never be allowed to configure:

Registration API
Password hashing
User activation
User roles
Special assignments
Branch assignments

The Login Page controls only presentation and visibility.

28. Footer Configuration

The footer may include:

Copyright
Privacy Policy
Terms of Use
Contact Support

Example:

© 2026 AppCore Technologies Limited. All rights reserved.
29. Language Configuration

The Login Page may provide:

Show Language Selector
Default Language
Available Languages

Current design:

English

The actual localization mechanism remains application-level.

30. Responsive Design

The Login Page must be responsive.

Desktop:

Promotional Panel | Login Panel

Tablet:

Promotional Panel
       ↓
Login Panel

Mobile:

Brand
  ↓
Login

We should avoid exposing hundreds of raw CSS settings to administrators.

The application should provide sensible predefined responsive behavior.

31. Public Login Page

The public Login Page should be a renderer.

It should load:

Published Active Login Page
        ↓
Configuration
        ↓
Reusable Components
        ↓
Public Login UI

The public page must not contain:

ERP Sidebar
ERP Header
Configuration controls
Save
Publish
Preview
Fullscreen
Admin buttons
32. Fullscreen Preview vs Public Page

These are two separate concepts.

ERP Fullscreen Preview
Administrator
     ↓
Fullscreen
     ↓
Preview
Public Login
End User
     ↓
/login
     ↓
Published Login Page

The two should use the same rendering architecture where possible, but the administrative controls must never leak into the public renderer.

33. Reusable Component Architecture

The Login Page should use reusable child components such as:

LoginPageGeneral
LoginPageBranding
LoginPageLayout
LoginPageBackground
LoginPagePromo
LoginPagePanel
LoginPageRegistration
LoginPageRecovery
LoginPageFooter
LoginPagePreview
LoginPageResponsive

These are conceptual names only at this stage.

We will inspect the existing Component Management architecture before deciding the actual component names/files.

34. Component Management Integration

All required reusable child components should follow the existing AppCore:

Component Management

architecture.

We should not create a parallel component-management mechanism specifically for Login Pages.

The Login Page Form should consume the approved reusable components.

35. Form Page Responsibility

The parent Login Page Form should primarily coordinate:

Load Login Page
Load Configuration
Load Child Components
Bind Configuration
Manage Form State
Save
Publish
Preview
Fullscreen
Validation

It should not contain all visual implementation itself.

36. Child Component Responsibility

Each child should have a clear responsibility.

For example:

Branding Component
    ↓
Branding configuration only

Background Component
    ↓
Background configuration only

Login Panel Component
    ↓
Login-panel configuration only

Preview Component
    ↓
Render complete configured Login Page

This keeps the system maintainable.

37. Data Model Philosophy

The database should represent configuration, not Angular implementation details.

Avoid storing things like:

HTML
Angular template code
TypeScript
arbitrary JavaScript

The database should store structured configuration.

For example:

PrimaryColor
LogoUrl
Heading
Description
ShowRegistration
ShowForgotPassword
LayoutType
BackgroundType

rather than storing an entire HTML document.

38. Security Boundary

The database-driven system must never become a mechanism for executing arbitrary frontend code.

Therefore:

NO arbitrary HTML injection
NO arbitrary JavaScript
NO arbitrary Angular template
NO arbitrary CSS execution

Configuration should be controlled through known properties and predefined options.

39. Future Theme System

This architecture will allow us to eventually create a separate:

Application Configuration
    ├── Login Pages
    ├── Login Themes
    └── Application Themes

A Login Page can then reference a Theme.

For example:

AppCore Corporate
        ↓
AppCore Blue Theme

or:

AppCore Dark
        ↓
AppCore Dark Theme

We don't need to implement the complete Theme Engine immediately.

The architecture should simply avoid blocking it.

40. Versioning

Full versioning is not required for the first implementation.

However, the database design should avoid making future versioning impossible.

Potential future model:

Login Page
    ↓
Login Page Version
    ↓
Configuration

This can later provide:

Version 1
Version 2
Version 3

without redesigning the entire system.

41. Public Authentication Contract

The visual Login Page remains connected to the authentication architecture already agreed:

Login Page
     ↓
Login ID / Password
     ↓
Authentication API
     ↓
User Profile
     ↓
User Credential
     ↓
Password Verification
     ↓
IsActive Check
     ↓
JWT
     ↓
Role Assignment
     ↓
Special Assignment
     ↓
Branch Assignment
     ↓
Authorized ERP
42. Registration Contract

Register Now follows:

Login
 ↓
Register Now
 ↓
Public Registration
 ↓
User Profile
IsActive = false
 +
User Credential
 ↓
Administrator Activation
 ↓
IsActive = true
 ↓
Login Allowed

No role, special assignment, or branch assignment is automatically granted during registration.

43. Development Sequence

We will develop this carefully.

Phase 1 — Architecture
Confirm existing Login Pages CRUD
Inspect Component Management architecture
Define Login Page configuration structure
Define parent/child component responsibilities
Define database configuration entities/relationships
Phase 2 — Form Shell
Login Page Form parent
Configuration navigation
Preview area
Fullscreen mechanism
Save / Publish controls
Phase 3 — Child Components

One by one:

General
Branding
Layout
Background
Promotional Panel
Login Panel
Registration
Password Recovery
Footer
Responsive
Preview
Phase 4 — Database

Connect each configuration section to the database.

Phase 5 — Renderer

Build the public:

/login

renderer.

Phase 6 — Authentication

Connect:

Login
Registration
Forgot Password
JWT
Session
Guard
Interceptor

44. Development Rule

We continue our existing strict development process:

Existing file
      ↓
User provides full file
      ↓
Inspect
      ↓
Revise full file
      ↓
User replaces
      ↓
Build
      ↓
Verify
      ↓
Next file

No hypothetical replacement of existing project architecture.

No partial code when a full-file revision is requested.

45. Final Locked Architecture

The overall architecture is now:

INFRASTRUCTURE CONTROL
│
└── APPLICATION CONFIGURATION
    │
    └── LOGIN PAGES
        │
        ├── Login Pages List
        │
        └── Login Page Design Studio
              │
              ├── General
              ├── Branding
              ├── Layout
              ├── Background
              ├── Promotional Panel
              ├── Login Panel
              ├── Registration
              ├── Password Recovery
              ├── Footer
              ├── Responsive
              │
              ├── Live Preview
              ├── Fullscreen Preview
              │
              ├── Save Draft
              └── Publish
                       │
                       ▼
              DATABASE CONFIGURATION
                       │
                       ▼
                PUBLIC LOGIN PAGE
                       │
                       ▼
                 AUTHENTICATION
                       │
                       ▼
                    JWT
                       │
                       ▼
               ERP AUTHORIZATION
Final design principle

The most important rule I recommend we lock is:

The Login Page Form is a Design & Configuration Studio; the public Login Page is a Renderer.

And:

Reusable UI functionality belongs in Component Management; page-specific configuration belongs to Login Pages; security and authentication logic remain in the application/backend.

This gives us a clean foundation to eventually have multiple Login Page designs, multiple themes, database-driven branding, fullscreen preview, responsive preview, and published production designs without creating separate Angular login pages for every design.