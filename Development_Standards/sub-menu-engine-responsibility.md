========================================================
Frontend
========================================================
Existing Module
    ↓
Existing Menu
    ↓
Existing pages/
    ↓
Create Submenu folder
    ├── form/
    │   ├── sub-menu-form.ts
    │   ├── sub-menu-form.html
    │   └── sub-menu-form.css
    │
    └── list/
        ├── sub-menu-list.ts
        ├── sub-menu-list.html
        └── sub-menu-list.css

Existing Menu
├── model/
│   └── sub-menu.model.ts
│
├── services/
│   └── sub-menu.service.ts
│
└── routes/
    └── sub-menu.routes.ts


pages/
└── <submenu>/          ← 1
    ├── form/           ← 1
    └── list/           ← 1

model/
└── sub-menu.model.ts

services/
└── sub-menu.service.ts

routes/
└── sub-menu.routes.ts

pages/<submenu>/form/
├── sub-menu-form.ts
├── sub-menu-form.html
└── sub-menu-form.css

pages/<submenu>/list/
├── sub-menu-list.ts
├── sub-menu-list.html
└── sub-menu-list.css


===================================================================================
Backend
===================================================================================

===================================================================================
AppCore.API
===================================================================================
AppCore.API
    ↓
Controllers
    ↓
Existing Module
    ↓
Existing Menu/
└── (SubMenu)Controller.cs              --- sub Menu Responsibility (File)


===================================================================================
AppCore.Application
===================================================================================
AppCore.Application
    ↓
Existing Module
    ↓
Existing Menu
└── (SubMenu)                           --- sub Menu Responsibility (Folder)
    └── DTOs                            --- sub Menu Responsibility (Folder)
        └── (SubMenu)Dto.cs             --- sub Menu Responsibility (File)
        └── Create(SubMenu)Dto.cs       --- sub Menu Responsibility (File)
        └── Update(SubMenu)Dto.cs       --- sub Menu Responsibility (File)
        └── (SubMenu)DefaultsDto.cs     --- sub Menu Responsibility (File)

    └── Interfaces                      --- sub Menu Responsibility (Folder)
        └── I(SubMenu)Repository.cs     --- sub Menu Responsibility (File)


===================================================================================
AppCore.Domain
===================================================================================
AppCore.Domain
    ↓
Existing Module
    ↓
Existing Menu
└── (SubMenu).cs                        --- sub Menu Responsibility (File)

===================================================================================
AppCore.Infrastructure
===================================================================================
A.  AppCore.Infrastructure
        ↓
    Configurations
        ↓
    Existing Module
        ↓
    Existing Menu
    └── (SubMenu)Configuration.cs       --- sub Menu Responsibility (File)

B.  AppCore.Infrastructure
        ↓
    Repositories
        ↓
    Existing Module
        ↓
    Existing Menu
    └── (SubMenu)Repositories.cs        --- sub Menu Responsibility (File)
