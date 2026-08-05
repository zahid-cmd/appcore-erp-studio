# Standard Placeholders

## General

{{Company}}
{{Solution}}
{{Project}}

## Navigation

{{Module}}
{{Menu}}
{{Submenu}}

## Code

{{EntityName}}
{{Namespace}}
{{RoutePath}}

## Backend

{{ApplicationProject}}
{{InfrastructureProject}}
{{Repository}}
{{RepositoryInterface}}
{{Controller}}
{{Dto}}
{{Configuration}}

## Frontend

{{FeatureFolder}}
{{SourceFolder}}

# Template Folder Structure

AppCore.Infrastructure
│
└── Templates
    │
    ├── Backend
    │
    │   ├── Controller
    │   │     Controller.tpl
    │   │
    │   ├── DTO
    │   │     CreateDto.tpl
    │   │     UpdateDto.tpl
    │   │     Dto.tpl
    │   │     DefaultsDto.tpl
    │   │
    │   ├── Repository
    │   │     Repository.tpl
    │   │
    │   ├── RepositoryInterface
    │   │     RepositoryInterface.tpl
    │   │
    │   ├── Entity
    │   │     Entity.tpl
    │   │
    │   └── Configuration
    │         Configuration.tpl
    │
    └── Frontend
        │
        ├── Model
        │     Model.tpl
        │
        ├── Service
        │     Service.tpl
        │
        ├── Route
        │     Route.tpl
        │
        └── Page
              ListPage.tpl
              FormPage.tpl

