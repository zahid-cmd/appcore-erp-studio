# AppCore Studio - Backend Migration Command

dotnet ef migrations add MigrationName --startup-project ../AppCore.API

dotnet ef database update --startup-project ../AppCore.API