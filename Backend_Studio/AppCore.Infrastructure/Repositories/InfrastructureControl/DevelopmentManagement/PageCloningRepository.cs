//===============================================================
// Namespaces
//===============================================================

using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;

using AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement;

using AppCore.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore;


//===============================================================
// Page Cloning Repository
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement;

public class PageCloningRepository :
    IPageCloningRepository
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public PageCloningRepository
    (
        AppDbContext context
    )
    {
        _context = context;
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<IEnumerable<PageCloning>> GetAllAsync()
    {
        return await _context.Set<PageCloning>()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .OrderBy
            (
                x =>
                    x.Id
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<PageCloning?> GetByIdAsync
    (
        long id
    )
    {
        return await _context.Set<PageCloning>()
            .FirstOrDefaultAsync
            (
                x =>
                    x.Id == id &&
                    !x.IsDeleted
            );
    }


    //===========================================================
    // Get History
    //===========================================================

    public async Task<IEnumerable<PageCloning>> GetHistoryAsync()
    {
        return await _context.Set<PageCloning>()
            .OrderByDescending
            (
                x =>
                    x.Id
            )
            .ToListAsync();
    }


    //===========================================================
    // Analyze Source
    //===========================================================

    public async Task<PageCloningSourceAnalysisDto> AnalyzeSourceAsync
    (
        long submenuId
    )
    {
        //=======================================================
        // SECTION 01 : VALIDATE SOURCE
        //=======================================================

        if (submenuId <= 0)
        {
            throw new InvalidOperationException(
                "Source page is required.");
        }

        //=======================================================
        // SECTION 02 : LOAD SUBMENU
        //=======================================================

        var submenu =
            await _context.NavigationSubmenus
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        x.Id == submenuId &&
                        !x.IsDeleted);

        if (submenu == null)
        {
            throw new InvalidOperationException(
                "Source page was not found.");
        }

        //=======================================================
        // SECTION 03 : LOAD REGISTERED SYNCHRONIZATION RECORDS
        //=======================================================

        var synchronizationRecords =
            await _context
                .Set<
                    AppCore.Domain.Entities.InfrastructureControl
                        .DevelopmentManagement.SubmenuSynchronization
                >()
                .AsNoTracking()
                .Where(
                    x =>
                        x.SubmenuId == submenuId &&
                        !x.IsDeleted)
                .OrderByDescending(x => x.Id)
                .ToListAsync();

        if (synchronizationRecords.Count == 0)
        {
            throw new InvalidOperationException(
                "Source page has no registered paths in " +
                "INF_SubmenuSynchronization.");
        }

        //=======================================================
        // SECTION 04 : RESOLVE FRONTEND REGISTRATION
        //=======================================================

        var frontendSync =
            synchronizationRecords.FirstOrDefault(
                x =>
                    !string.IsNullOrWhiteSpace(
                        x.FrontendSubmenuModelFile) ||
                    !string.IsNullOrWhiteSpace(
                        x.FrontendSubmenuServiceFile) ||
                    !string.IsNullOrWhiteSpace(
                        x.FrontendSubmenuRouteFile) ||
                    !string.IsNullOrWhiteSpace(
                        x.FrontendSubmenuFormTsFile) ||
                    !string.IsNullOrWhiteSpace(
                        x.FrontendSubmenuListTsFile));

        if (frontendSync == null)
        {
            throw new InvalidOperationException(
                "Frontend paths are not registered for the source page.");
        }

        //=======================================================
        // SECTION 05 : RESOLVE BACKEND REGISTRATION
        //=======================================================

        var backendSync =
            synchronizationRecords.FirstOrDefault(
                x =>
                    !string.IsNullOrWhiteSpace(
                        x.BackendSubMenuEntityFile) ||
                    !string.IsNullOrWhiteSpace(
                        x.BackendSubMenuConfigurationFile) ||
                    !string.IsNullOrWhiteSpace(
                        x.BackendSubMenuDtoFile) ||
                    !string.IsNullOrWhiteSpace(
                        x.BackendSubMenuRepositoryFile) ||
                    !string.IsNullOrWhiteSpace(
                        x.BackendControllerFile));

        if (backendSync == null)
        {
            throw new InvalidOperationException(
                "Backend paths are not registered for the source page.");
        }

        //=======================================================
        // SECTION 06 : RESOLVE REGISTERED FILE PATH
        //=======================================================

        static string ResolveRegisteredFilePath
        (
            string? registeredFile,
            string? registeredSolution,
            string? registeredProject
        )
        {
            if (string.IsNullOrWhiteSpace(registeredFile))
            {
                return string.Empty;
            }

            var filePath =
                Environment.ExpandEnvironmentVariables(
                    registeredFile.Trim());

            if (Path.IsPathRooted(filePath))
            {
                return Path.GetFullPath(filePath);
            }

            if (string.IsNullOrWhiteSpace(registeredSolution))
            {
                throw new InvalidOperationException(
                    $"A solution path is required for registered " +
                    $"file '{filePath}'.");
            }

            var solutionPath =
                Environment.ExpandEnvironmentVariables(
                    registeredSolution.Trim());

            if (!Path.IsPathRooted(solutionPath))
            {
                solutionPath = Path.Combine(
                    Environment.CurrentDirectory,
                    solutionPath);
            }

            solutionPath = Path.GetFullPath(solutionPath);

            var basePath = solutionPath;

            if (!string.IsNullOrWhiteSpace(registeredProject))
            {
                var projectPath =
                    Environment.ExpandEnvironmentVariables(
                        registeredProject.Trim());

                basePath = Path.IsPathRooted(projectPath)
                    ? projectPath
                    : Path.Combine(solutionPath, projectPath);

                basePath = Path.GetFullPath(basePath);
            }

            return Path.GetFullPath(
                Path.Combine(basePath, filePath));
        }

        //=======================================================
        // SECTION 07 : INITIALIZE SOURCE ANALYSIS RESULT
        //=======================================================

        var result = new PageCloningSourceAnalysisDto
        {
            SubmenuId = submenu.Id,
            SubmenuCode = frontendSync.SubmenuCode,
            SubmenuName = frontendSync.SubmenuName,
            AnalysisCompleted = false,
            Message = string.Empty
        };

        //=======================================================
        // SECTION 08 : REGISTER FRONTEND FILES
        //=======================================================

        var frontendFiles = new[]
        {
            (
                Id: 1,
                Type: "Model",
                RegisteredPath: frontendSync.FrontendSubmenuModelFile
            ),
            (
                Id: 2,
                Type: "Service",
                RegisteredPath: frontendSync.FrontendSubmenuServiceFile
            ),
            (
                Id: 3,
                Type: "List TS",
                RegisteredPath: frontendSync.FrontendSubmenuListTsFile
            ),
            (
                Id: 4,
                Type: "List HTML",
                RegisteredPath: frontendSync.FrontendSubmenuListHtmlFile
            ),
            (
                Id: 5,
                Type: "Form TS",
                RegisteredPath: frontendSync.FrontendSubmenuFormTsFile
            ),
            (
                Id: 6,
                Type: "Form HTML",
                RegisteredPath: frontendSync.FrontendSubmenuFormHtmlFile
            )
        };

        foreach (var item in frontendFiles)
        {
            var path = ResolveRegisteredFilePath(
                item.RegisteredPath,
                frontendSync.FrontendSolution,
                frontendSync.FrontendProject);

            var exists =
                !string.IsNullOrWhiteSpace(path) &&
                File.Exists(path);

            result.Files.Add(
                new PageCloningSourceFileDto
                {
                    Id = item.Id,
                    Category = "Frontend",
                    FileType = item.Type,
                    FileName = string.IsNullOrWhiteSpace(path)
                        ? string.Empty
                        : Path.GetFileName(path),
                    Location = string.IsNullOrWhiteSpace(path)
                        ? string.Empty
                        : Path.GetDirectoryName(path) ?? string.Empty,
                    Path = path,
                    Exists = exists,
                    Action = exists ? "Ready" : "Missing"
                });
        }

        //=======================================================
        // SECTION 09 : REGISTER BACKEND FILES
        //=======================================================

        var backendFiles = new[]
        {
            (
                Id: 7,
                Type: "Entity",
                RegisteredPath: backendSync.BackendSubMenuEntityFile,
                Project: backendSync.BackendDomainProject
            ),
            (
                Id: 8,
                Type: "Configuration",
                RegisteredPath: backendSync.BackendSubMenuConfigurationFile,
                Project: backendSync.BackendInfrastructureProject
            ),
            (
                Id: 9,
                Type: "DTO",
                RegisteredPath: backendSync.BackendSubMenuDtoFile,
                Project: backendSync.BackendApplicationProject
            ),
            (
                Id: 10,
                Type: "Default DTO",
                RegisteredPath: backendSync.BackendSubMenuDefaultsDtoFile,
                Project: backendSync.BackendApplicationProject
            ),
            (
                Id: 11,
                Type: "Create DTO",
                RegisteredPath: backendSync.BackendCreateSubMenuDtoFile,
                Project: backendSync.BackendApplicationProject
            ),
            (
                Id: 12,
                Type: "Update DTO",
                RegisteredPath: backendSync.BackendUpdateSubMenuDtoFile,
                Project: backendSync.BackendApplicationProject
            ),
            (
                Id: 13,
                Type: "Repository Interface",
                RegisteredPath: backendSync.BackendSubMenuRepositoryInterfaceFile,
                Project: backendSync.BackendApplicationProject
            ),
            (
                Id: 14,
                Type: "Repository",
                RegisteredPath: backendSync.BackendSubMenuRepositoryFile,
                Project: backendSync.BackendInfrastructureProject
            ),
            (
                Id: 15,
                Type: "Controller",
                RegisteredPath: backendSync.BackendControllerFile,
                Project: string.Empty
            )
        };

        foreach (var item in backendFiles)
        {
            var path = ResolveRegisteredFilePath(
                item.RegisteredPath,
                backendSync.BackendSolution,
                item.Project);

            var exists =
                !string.IsNullOrWhiteSpace(path) &&
                File.Exists(path);

            result.Files.Add(
                new PageCloningSourceFileDto
                {
                    Id = item.Id,
                    Category = "Backend",
                    FileType = item.Type,
                    FileName = string.IsNullOrWhiteSpace(path)
                        ? string.Empty
                        : Path.GetFileName(path),
                    Location = string.IsNullOrWhiteSpace(path)
                        ? string.Empty
                        : Path.GetDirectoryName(path) ?? string.Empty,
                    Path = path,
                    Exists = exists,
                    Action = exists ? "Ready" : "Missing"
                });
        }

        //=======================================================
        // SECTION 10 : VALIDATE REQUIRED FRONTEND FILES
        //=======================================================

        var requiredFrontendTypes = new[]
        {
            "Model",
            "List TS",
            "List HTML",
            "Form TS",
            "Form HTML"
        };

        foreach (var fileType in requiredFrontendTypes)
        {
            var file = result.Files.First(
                x => string.Equals(
                    x.FileType,
                    fileType,
                    StringComparison.OrdinalIgnoreCase));

            if (!file.Exists)
            {
                throw new FileNotFoundException(
                    $"The registered source {fileType} file " +
                    $"could not be found: '{file.Path}'.",
                    file.Path);
            }
        }

        //=======================================================
        // SECTION 11 : RESOLVE FRONTEND SOURCE FILES
        //=======================================================

        var frontendModelFile =
            result.Files.First(x => x.Id == 1).Path;

        var frontendListTsFile =
            result.Files.First(x => x.Id == 3).Path;

        var frontendListHtmlFile =
            result.Files.First(x => x.Id == 4).Path;

        var frontendFormTsFile =
            result.Files.First(x => x.Id == 5).Path;

        var frontendFormHtmlFile =
            result.Files.First(x => x.Id == 6).Path;

        //=======================================================
        // SECTION 12 : READ FRONTEND SOURCE CONTENT
        //=======================================================

        var frontendModelContent =
            await ReadSourceFileAsync(frontendModelFile);

        var frontendListTsContent =
            await ReadSourceFileAsync(frontendListTsFile);

        var frontendListHtmlContent =
            await ReadSourceFileAsync(frontendListHtmlFile);

        var frontendFormTsContent =
            await ReadSourceFileAsync(frontendFormTsFile);

        var frontendFormHtmlContent =
            await ReadSourceFileAsync(frontendFormHtmlFile);

        //=======================================================
        // SECTION 13 : TEMPORARY MODEL CONTENT DIAGNOSTICS
        //=======================================================
        // TEMPORARY: Remove after the model-loading issue is
        // identified and corrected.

        Console.WriteLine(
            $"[PageCloning] Submenu ID: {submenuId}");

        Console.WriteLine(
            $"[PageCloning] Model path: {frontendModelFile}");

        Console.WriteLine(
            $"[PageCloning] Model file exists: " +
            $"{File.Exists(frontendModelFile)}");

        Console.WriteLine(
            $"[PageCloning] Model content length: " +
            $"{frontendModelContent.Length}");

        Console.WriteLine(
            $"[PageCloning] Contains Wing interface: " +
            $"{Regex.IsMatch(
                frontendModelContent,
                @"\binterface\s+Wing\b")}");

        Console.WriteLine(
            $"[PageCloning] Model content preview: " +
            $"{frontendModelContent[..Math.Min(
                frontendModelContent.Length,
                500)]}");

        //=======================================================
        // SECTION 14 : VALIDATE LOADED MODEL CONTENT
        //=======================================================

        if (string.IsNullOrWhiteSpace(frontendModelContent))
        {
            throw new InvalidOperationException(
                $"The registered model file is empty: " +
                $"{frontendModelFile}");
        }

        //=======================================================
        // SECTION 15 : ANALYZE UI-DRIVEN MODEL FIELDS
        //=======================================================

        result.ModelFields = ParseUiDrivenModelFields(
            frontendModelContent,
            frontendListTsContent,
            frontendListHtmlContent,
            frontendFormTsContent,
            frontendFormHtmlContent);

        //=======================================================
        // SECTION 16 : COMPLETE ANALYSIS
        //=======================================================

        result.AnalysisCompleted = true;

        result.Message =
            result.ModelFields.Count == 0
                ? "Source files were resolved and read successfully, " +
                "but no model fields were discovered. " +
                "Check the model content and field parser."
                : $"Source analysis completed successfully. " +
                $"{result.Files.Count} registered files were analyzed " +
                $"and {result.ModelFields.Count} model fields were discovered.";

        Console.WriteLine(
            $"[PageCloning] Parsed model field count: " +
            $"{result.ModelFields.Count}");

        return result;
    }

    //===========================================================
    // Analyze Target
    //===========================================================

    public async Task<PageCloningSourceAnalysisDto> AnalyzeTargetAsync
    (
        long submenuId
    )
    {
        //=======================================================
        // Validate Target
        //=======================================================

        if (submenuId <= 0)
        {
            throw new InvalidOperationException(
                "Target page is required.");
        }


        //=======================================================
        // Load Target Submenu
        //=======================================================

        var targetSubmenu =
            await _context.NavigationSubmenus
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == submenuId &&
                        !x.IsDeleted
                );

        if (targetSubmenu == null)
        {
            throw new InvalidOperationException(
                "Target page was not found.");
        }


        //=======================================================
        // Load Target Synchronization Records
        //=======================================================

        var targetSynchronizationRecords =
            await _context
                .Set<
                    AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement.SubmenuSynchronization
                >()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.SubmenuId == submenuId &&
                        !x.IsDeleted
                )
                .OrderByDescending
                (
                    x => x.Id
                )
                .ToListAsync();

        if (targetSynchronizationRecords.Count == 0)
        {
            throw new InvalidOperationException(
                "Target page has no registered paths in INF_SubmenuSynchronization.");
        }


        //=======================================================
        // Select Target Frontend Registration
        //=======================================================

        var frontendSync =
            targetSynchronizationRecords
                .FirstOrDefault
                (
                    x =>
                        !string.IsNullOrWhiteSpace(
                            x.FrontendSolution) ||
                        !string.IsNullOrWhiteSpace(
                            x.FrontendProject) ||
                        !string.IsNullOrWhiteSpace(
                            x.FrontendSubmenuModelFile) ||
                        !string.IsNullOrWhiteSpace(
                            x.FrontendSubmenuServiceFile) ||
                        !string.IsNullOrWhiteSpace(
                            x.FrontendSubmenuListTsFile) ||
                        !string.IsNullOrWhiteSpace(
                            x.FrontendSubmenuListHtmlFile) ||
                        !string.IsNullOrWhiteSpace(
                            x.FrontendSubmenuFormTsFile) ||
                        !string.IsNullOrWhiteSpace(
                            x.FrontendSubmenuFormHtmlFile)
                );

        if (frontendSync == null)
        {
            throw new InvalidOperationException(
                "Target page has no registered frontend file paths.");
        }


        //=======================================================
        // Select Target Backend Registration
        //=======================================================

        var backendSync =
            targetSynchronizationRecords
                .FirstOrDefault
                (
                    x =>
                        !string.IsNullOrWhiteSpace(
                            x.BackendSolution) ||
                        !string.IsNullOrWhiteSpace(
                            x.BackendDomainProject) ||
                        !string.IsNullOrWhiteSpace(
                            x.BackendApplicationProject) ||
                        !string.IsNullOrWhiteSpace(
                            x.BackendInfrastructureProject) ||
                        !string.IsNullOrWhiteSpace(
                            x.BackendControllerFile) ||
                        !string.IsNullOrWhiteSpace(
                            x.BackendSubMenuEntityFile) ||
                        !string.IsNullOrWhiteSpace(
                            x.BackendSubMenuConfigurationFile) ||
                        !string.IsNullOrWhiteSpace(
                            x.BackendSubMenuDtoFile) ||
                        !string.IsNullOrWhiteSpace(
                            x.BackendCreateSubMenuDtoFile) ||
                        !string.IsNullOrWhiteSpace(
                            x.BackendUpdateSubMenuDtoFile) ||
                        !string.IsNullOrWhiteSpace(
                            x.BackendSubMenuDefaultsDtoFile) ||
                        !string.IsNullOrWhiteSpace(
                            x.BackendSubMenuRepositoryInterfaceFile) ||
                        !string.IsNullOrWhiteSpace(
                            x.BackendSubMenuRepositoryFile)
                );

        if (backendSync == null)
        {
            throw new InvalidOperationException(
                "Target page has no registered backend file paths.");
        }


        //=======================================================
        // Resolve Registered Target File Path
        //=======================================================

        static string ResolveRegisteredFilePath
        (
            string? registeredFile,
            string? registeredSolution,
            string? registeredProject
        )
        {
            // Validate Registered File
            if (string.IsNullOrWhiteSpace(registeredFile))
            {
                return string.Empty;
            }

            var filePath =
                Environment.ExpandEnvironmentVariables(
                    registeredFile.Trim());

            // Absolute File Path
            if (Path.IsPathRooted(filePath))
            {
                return Path.GetFullPath(filePath);
            }

            // Resolve Solution Path
            var solutionPath =
                string.IsNullOrWhiteSpace(registeredSolution)
                    ? string.Empty
                    : Environment.ExpandEnvironmentVariables(
                        registeredSolution.Trim());

            if (!string.IsNullOrWhiteSpace(solutionPath))
            {
                if (!Path.IsPathRooted(solutionPath))
                {
                    solutionPath =
                        Path.Combine(
                            Environment.CurrentDirectory,
                            solutionPath);
                }

                solutionPath = Path.GetFullPath(solutionPath);
            }

            // Resolve Project Candidate
            if (
                !string.IsNullOrWhiteSpace(solutionPath) &&
                !string.IsNullOrWhiteSpace(registeredProject)
            )
            {
                var projectPath =
                    Environment.ExpandEnvironmentVariables(
                        registeredProject.Trim());

                var projectRoot =
                    Path.IsPathRooted(projectPath)
                        ? projectPath
                        : Path.Combine(
                            solutionPath,
                            projectPath);

                var projectCandidate =
                    Path.GetFullPath(
                        Path.Combine(
                            projectRoot,
                            filePath));

                if (File.Exists(projectCandidate))
                {
                    return projectCandidate;
                }
            }

            // Resolve Solution Candidate
            if (!string.IsNullOrWhiteSpace(solutionPath))
            {
                var solutionCandidate =
                    Path.GetFullPath(
                        Path.Combine(
                            solutionPath,
                            filePath));

                if (File.Exists(solutionCandidate))
                {
                    return solutionCandidate;
                }
            }

            // Fallback Candidate
            return Path.GetFullPath(
                Path.Combine(
                    Environment.CurrentDirectory,
                    filePath));
        }


        //=======================================================
        // Initialize Target Analysis Result
        //=======================================================

        var result = new PageCloningSourceAnalysisDto
        {
            SubmenuId = targetSubmenu.Id,
            SubmenuCode = frontendSync.SubmenuCode,
            SubmenuName = frontendSync.SubmenuName
        };


        //=======================================================
        // Add Target File
        //=======================================================

        void AddTargetFile
        (
            string category,
            string fileType,
            string? registeredFile,
            string? solutionPath,
            string? projectPath
        )
        {
            var resolvedPath =
                ResolveRegisteredFilePath
                (
                    registeredFile,
                    solutionPath,
                    projectPath
                );

            var fileExists =
                !string.IsNullOrWhiteSpace(resolvedPath) &&
                File.Exists(resolvedPath);

            result.Files.Add(
                new PageCloningSourceFileDto
                {
                    Category = category,
                    FileType = fileType,
                    FileName = string.IsNullOrWhiteSpace(resolvedPath)
                        ? string.Empty
                        : Path.GetFileName(resolvedPath),
                    Location = string.IsNullOrWhiteSpace(resolvedPath)
                        ? string.Empty
                        : Path.GetDirectoryName(resolvedPath) ?? string.Empty,
                    Path = resolvedPath,
                    Exists = fileExists,
                    Action = fileExists
                        ? "Ready"
                        : "Missing"
                });
        }


        //=======================================================
        // Frontend Target Files
        //=======================================================

        AddTargetFile(
            "Frontend",
            "Model",
            frontendSync.FrontendSubmenuModelFile,
            frontendSync.FrontendSolution,
            frontendSync.FrontendProject);

        AddTargetFile(
            "Frontend",
            "Service",
            frontendSync.FrontendSubmenuServiceFile,
            frontendSync.FrontendSolution,
            frontendSync.FrontendProject);

        AddTargetFile(
            "Frontend",
            "List TS",
            frontendSync.FrontendSubmenuListTsFile,
            frontendSync.FrontendSolution,
            frontendSync.FrontendProject);

        AddTargetFile(
            "Frontend",
            "List HTML",
            frontendSync.FrontendSubmenuListHtmlFile,
            frontendSync.FrontendSolution,
            frontendSync.FrontendProject);

        AddTargetFile(
            "Frontend",
            "Form TS",
            frontendSync.FrontendSubmenuFormTsFile,
            frontendSync.FrontendSolution,
            frontendSync.FrontendProject);

        AddTargetFile(
            "Frontend",
            "Form HTML",
            frontendSync.FrontendSubmenuFormHtmlFile,
            frontendSync.FrontendSolution,
            frontendSync.FrontendProject);


        //=======================================================
        // Backend Target Files
        //=======================================================

        AddTargetFile(
            "Backend",
            "Entity",
            backendSync.BackendSubMenuEntityFile,
            backendSync.BackendSolution,
            backendSync.BackendDomainProject);

        AddTargetFile(
            "Backend",
            "Configuration",
            backendSync.BackendSubMenuConfigurationFile,
            backendSync.BackendSolution,
            backendSync.BackendInfrastructureProject);

        AddTargetFile(
            "Backend",
            "DTO",
            backendSync.BackendSubMenuDtoFile,
            backendSync.BackendSolution,
            backendSync.BackendApplicationProject);

        AddTargetFile(
            "Backend",
            "Default DTO",
            backendSync.BackendSubMenuDefaultsDtoFile,
            backendSync.BackendSolution,
            backendSync.BackendApplicationProject);

        AddTargetFile(
            "Backend",
            "Create DTO",
            backendSync.BackendCreateSubMenuDtoFile,
            backendSync.BackendSolution,
            backendSync.BackendApplicationProject);

        AddTargetFile(
            "Backend",
            "Update DTO",
            backendSync.BackendUpdateSubMenuDtoFile,
            backendSync.BackendSolution,
            backendSync.BackendApplicationProject);

        AddTargetFile(
            "Backend",
            "Repository Interface",
            backendSync.BackendSubMenuRepositoryInterfaceFile,
            backendSync.BackendSolution,
            backendSync.BackendApplicationProject);

        AddTargetFile(
            "Backend",
            "Repository",
            backendSync.BackendSubMenuRepositoryFile,
            backendSync.BackendSolution,
            backendSync.BackendInfrastructureProject);

        AddTargetFile(
            "Backend",
            "Controller",
            backendSync.BackendControllerFile,
            backendSync.BackendSolution,
            null);


        //=======================================================
        // Validate Target File Mapping
        //=======================================================

        if (result.Files.Count != 15)
        {
            throw new InvalidOperationException(
                $"Target analysis expected 15 files but registered {result.Files.Count}.");
        }


        //=======================================================
        // Validate Target File Paths
        //=======================================================

        var unregisteredFiles =
            result.Files
                .Where(
                    x => string.IsNullOrWhiteSpace(x.Path))
                .ToList();

        if (unregisteredFiles.Count > 0)
        {
            var missingTypes =
                string.Join(
                    ", ",
                    unregisteredFiles.Select(x => x.FileType));

            throw new InvalidOperationException(
                $"Target file paths are not registered for: {missingTypes}.");
        }


        //=======================================================
        // Completed
        //=======================================================

        return result;
    }


    //===========================================================
    // Find Solution Root
    //===========================================================

    private static string FindSolutionRoot()
    {
        var directory = new DirectoryInfo(Environment.CurrentDirectory);

        while (directory != null)
        {
            var backendPath = Path.Combine(directory.FullName, "Backend_Studio");

            if (Directory.Exists(backendPath))
            {
                return directory.FullName;
            }

            if (string.Equals(directory.Name, "Backend_Studio", StringComparison.OrdinalIgnoreCase))
            {
                return directory.Parent?.FullName
                    ?? throw new InvalidOperationException("AppCore solution root could not be located.");
            }

            directory = directory.Parent;
        }

        throw new InvalidOperationException
        (
            $"AppCore solution root could not be located from: {Environment.CurrentDirectory}"
        );
    }


    //===========================================================
    // Resolve Source File
    //===========================================================

    private static string ResolveSourceFile
    (
        string root,
        string expectedFileName,
        string fallbackPath,
        string? projectFolder = null,
        string? alternateFileName = null
    )
    {
        //=======================================================
        // Validate Registered Path
        //=======================================================

        if (string.IsNullOrWhiteSpace(fallbackPath))
        {
            return string.Empty;
        }


        //=======================================================
        // Normalize Path
        //=======================================================

        var registeredPath = Path.GetFullPath(fallbackPath);


        //=======================================================
        // Validate File
        //=======================================================

        if (File.Exists(registeredPath))
        {
            return registeredPath;
        }


        //=======================================================
        // Return Registered Path
        //=======================================================

        // Do not search recursively or substitute another file.
        // The caller can report the registered file as missing.

        return registeredPath;
    }


    //===========================================================
    // Add Source File
    //===========================================================

    private static void AddSourceFile
    (
        List<PageCloningSourceFileDto> files,

        int id,

        string category,

        string fileType,

        string fileName,

        string path
    )
    {
        var exists =
            File.Exists
            (
                path
            );

        files.Add
        (
            new PageCloningSourceFileDto
            {
                Id =
                    id,

                Category =
                    category,

                FileType =
                    fileType,

                FileName =
                    fileName,

                Location =
                    Path.GetDirectoryName
                    (
                        path
                    )
                    ??
                    string.Empty,

                Path =
                    path,

                Exists =
                    exists,

                Action =
                    exists
                        ?
                            "Ready"
                        :
                            "Missing"
            }
        );
    }


    //===========================================================
    // Read Source File
    //===========================================================

    private static async Task<string> ReadSourceFileAsync
    (
        string path
    )
    {
        if
        (
            !File.Exists
            (
                path
            )
        )
        {
            return string.Empty;
        }


        return await File.ReadAllTextAsync
        (
            path
        );
    }


    //=======================================================
    // Parse UI-driven Model Fields
    //=======================================================

    private static List<PageCloningModelFieldDto> ParseUiDrivenModelFields
    (
        string modelContent,
        string listTsContent,
        string listHtmlContent,
        string formTsContent,
        string formHtmlContent
    )
    {
        //===================================================
        // SECTION 01 : INITIALIZE RESULT
        //===================================================

        var result = new List<PageCloningModelFieldDto>();

        if (string.IsNullOrWhiteSpace(modelContent))
        {
            Console.WriteLine(
                "[PageCloning Parser] Model content is empty.");

            return result;
        }

        //===================================================
        // SECTION 02 : COMBINE UI CONTENT
        //===================================================

        var uiContent = string.Join(
            Environment.NewLine,
            listTsContent ?? string.Empty,
            listHtmlContent ?? string.Empty,
            formTsContent ?? string.Empty,
            formHtmlContent ?? string.Empty);

        //===================================================
        // SECTION 03 : INPUT DIAGNOSTICS
        //===================================================

        Console.WriteLine(
            $"[PageCloning Parser] Model length: {modelContent.Length}");

        Console.WriteLine(
            $"[PageCloning Parser] UI content length: {uiContent.Length}");

        //===================================================
        // SECTION 04 : FIND EXPORTED INTERFACES
        //===================================================

        var interfaceMatches = Regex.Matches(
            modelContent,
            @"\bexport\s+interface\s+" +
            @"(?<name>[A-Za-z_$][\w$]*)" +
            @"(?:\s+extends\s+[^{]+)?\s*" +
            @"\{(?<body>[^{}]*)\}",
            RegexOptions.Multiline);

        Console.WriteLine(
            $"[PageCloning Parser] Interfaces found: {interfaceMatches.Count}");

        //===================================================
        // SECTION 05 : PARSE EACH INTERFACE
        //===================================================

        foreach (Match interfaceMatch in interfaceMatches)
        {
            var inputModel =
                interfaceMatch.Groups["name"].Value.Trim();

            var body =
                interfaceMatch.Groups["body"].Value;

            if (
                string.IsNullOrWhiteSpace(inputModel) ||
                string.IsNullOrWhiteSpace(body)
            )
            {
                continue;
            }

            Console.WriteLine(
                $"[PageCloning Parser] Interface: {inputModel}; " +
                $"body length: {body.Length}");

            //================================================
            // SECTION 06 : MATCH PROPERTY DECLARATIONS
            //================================================
            // Supports:
            //
            // WingId: number;
            //
            // WingId:
            //     number;
            //
            // WingName?: string;
            //
            // Complex nested object types and method signatures
            // are intentionally not inferred by this parser.

            var propertyMatches = Regex.Matches(
                body,
                @"(?m)^[ \t]*" +
                @"(?<name>[A-Za-z_$][\w$]*)" +
                @"[ \t]*(?<optional>\?)?[ \t]*:" +
                @"[ \t\r\n]*" +
                @"(?<type>[A-Za-z_$][\w$]*(?:[ \t]*\[\])?)" +
                @"[ \t]*;");

            Console.WriteLine(
                $"[PageCloning Parser] Properties found in " +
                $"{inputModel}: {propertyMatches.Count}");

            //================================================
            // SECTION 07 : PROCESS PROPERTIES
            //================================================

            foreach (Match propertyMatch in propertyMatches)
            {
                var fieldName =
                    propertyMatch.Groups["name"].Value.Trim();

                var fieldType =
                    Regex.Replace(
                        propertyMatch.Groups["type"].Value.Trim(),
                        @"\s+",
                        string.Empty);

                var isOptional =
                    propertyMatch.Groups["optional"].Success;

                if (
                    string.IsNullOrWhiteSpace(fieldName) ||
                    string.IsNullOrWhiteSpace(fieldType)
                )
                {
                    continue;
                }

                //============================================
                // SECTION 07.1 : EXCLUDE SYSTEM FIELDS
                //============================================

                if (IsSystemField(fieldName))
                {
                    Console.WriteLine(
                        $"[PageCloning Parser] Excluded system field: " +
                        $"{inputModel}.{fieldName}");

                    continue;
                }

                //============================================
                // SECTION 07.2 : DETERMINE REQUIRED STATUS
                //============================================

                var escapedFieldName =
                    Regex.Escape(fieldName);

                var requiredPattern =
                    $@"\b{escapedFieldName}\b[\s\S]{{0,150}}" +
                    @"(?:Validators\.required|" +
                    @"required\s*=\s*[""']?required)";

                var isRequired =
                    !isOptional &&
                    Regex.IsMatch(
                        uiContent,
                        requiredPattern,
                        RegexOptions.IgnoreCase);

                //============================================
                // SECTION 07.3 : ADD MODEL FIELD
                //============================================

                result.Add(
                    new PageCloningModelFieldDto
                    {
                        InputModel = inputModel,
                        SourceField = fieldName,
                        Name = fieldName,
                        Type = fieldType,
                        Category = GetModelFieldCategory(fieldName),
                        Required = isRequired,
                        Operation = "Keep",
                        Description = null,
                        DefaultValue = null
                    });

                Console.WriteLine(
                    $"[PageCloning Parser] Parsed: " +
                    $"{inputModel}.{fieldName} : {fieldType}");
            }
        }

        //===================================================
        // SECTION 08 : REMOVE DUPLICATE DEFINITIONS
        //===================================================
        // A field is unique within its interface, not across
        // the entire model file.

        var uniqueFields = result
            .GroupBy(
                field => $"{field.InputModel}.{field.SourceField}",
                StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .ToList();

        //===================================================
        // SECTION 09 : FINAL DIAGNOSTICS
        //===================================================

        Console.WriteLine(
            $"[PageCloning Parser] Total parsed fields: {result.Count}");

        Console.WriteLine(
            $"[PageCloning Parser] Unique model fields: {uniqueFields.Count}");

        return uniqueFields;
    }

    //===========================================================
    // Determine UI-driven Field
    //===========================================================

    private static bool IsUiDrivenField
    (
        string fieldName,

        string uiContent
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                uiContent
            )
        )
        {
            return false;
        }


        var escapedFieldName =
            Regex.Escape
            (
                fieldName
            );


        //=======================================================
        // Form Control
        //=======================================================

        if
        (
            Regex.IsMatch
            (
                uiContent,

                $@"formControlName\s*=\s*[""']{escapedFieldName}[""']",

                RegexOptions.IgnoreCase
            )
        )
        {
            return true;
        }


        //=======================================================
        // Template Binding
        //=======================================================

        if
        (
            Regex.IsMatch
            (
                uiContent,

                $@"(?:\[\(|\[|\()\s*[^)\]]*{escapedFieldName}",

                RegexOptions.IgnoreCase
            )
        )
        {
            return true;
        }


        //=======================================================
        // Object Property
        //=======================================================

        if
        (
            Regex.IsMatch
            (
                uiContent,

                $@"\.\s*{escapedFieldName}\b",

                RegexOptions.IgnoreCase
            )
        )
        {
            return true;
        }


        //=======================================================
        // Property Definition / Access
        //=======================================================

        if
        (
            Regex.IsMatch
            (
                uiContent,

                $@"\b{escapedFieldName}\s*[:=]",

                RegexOptions.IgnoreCase
            )
        )
        {
            return true;
        }


        //=======================================================
        // Table / Column Field
        //=======================================================

        if
        (
            Regex.IsMatch
            (
                uiContent,

                $@"(?:field|property|key|name|column)\s*[:=]\s*[""']{escapedFieldName}[""']",

                RegexOptions.IgnoreCase
            )
        )
        {
            return true;
        }


        //=======================================================
        // Direct Field Reference
        //=======================================================

        return Regex.IsMatch
        (
            uiContent,

            $@"\b{escapedFieldName}\b",

            RegexOptions.IgnoreCase
        );
    }


    //===========================================================
    // Determine System Field
    //===========================================================

    private static bool IsSystemField
    (
        string fieldName
    )
    {
        var normalizedName =
            NormalizeFieldName
            (
                fieldName
            );


        var systemFields =
            new HashSet<string>
            (
                StringComparer.OrdinalIgnoreCase
            )
            {
                "id",

                "createdby",
                "createddate",

                "modifiedby",
                "modifieddate",

                "deletedby",
                "deleteddate",

                "isdeleted",

                "lastmodifiedby",
                "lastmodifieddate",

                "lastupdatedby",
                "lastupdateddate"
            };


        return systemFields.Contains
        (
            normalizedName
        );
    }


    //===========================================================
    // Get Model Field Category
    //===========================================================

    private static string GetModelFieldCategory
    (
        string fieldName
    )
    {
        var normalizedName =
            NormalizeFieldName
            (
                fieldName
            );


        //=======================================================
        // Primary & Navigation
        //=======================================================

        var navigationFields =
            new HashSet<string>
            (
                StringComparer.OrdinalIgnoreCase
            )
            {
                "moduleid",
                "modulecode",
                "modulename",

                "menuid",
                "menucode",
                "menuname",

                "submenuid",
                "submenucode",
                "submenuname",

                "navigationmoduleid",
                "navigationmodulecode",
                "navigationmodulename",

                "navigationmenuid",
                "navigationmenucode",
                "navigationmenuname"
            };


        if
        (
            navigationFields.Contains
            (
                normalizedName
            )
        )
        {
            return "Primary & Navigation";
        }


        //=======================================================
        // Audit & System
        //=======================================================

        var auditFields =
            new HashSet<string>
            (
                StringComparer.OrdinalIgnoreCase
            )
            {
                "createdby",
                "createddate",

                "modifiedby",
                "modifieddate",

                "deletedby",
                "deleteddate",

                "isdeleted",
                "isactive",

                "lastmodifiedby",
                "lastmodifieddate",

                "lastupdatedby",
                "lastupdateddate"
            };


        if
        (
            auditFields.Contains
            (
                normalizedName
            )
        )
        {
            return "Audit & System";
        }


        //=======================================================
        // Business & Functional
        //=======================================================

        return "Business & Functional";
    }


    //===========================================================
    // Normalize Field Name
    //===========================================================

    private static string NormalizeFieldName
    (
        string fieldName
    )
    {
        return fieldName
            .Replace
            (
                "_",
                string.Empty
            )
            .Replace
            (
                "-",
                string.Empty
            )
            .ToLowerInvariant();
    }


    //===========================================================
    // Get Route Segment
    //===========================================================

    private static string GetRouteSegment(string? route)
    {
        if (string.IsNullOrWhiteSpace(route))
        {
            return string.Empty;
        }

        var normalizedRoute = route
            .Trim()
            .Replace('\\', '/')
            .TrimEnd('/');

        var routeSegment = normalizedRoute
            .Split(
                '/',
                StringSplitOptions.RemoveEmptyEntries)
            .LastOrDefault();

        return NormalizeFrontendPhysicalName(
            routeSegment ?? string.Empty);
    }

    //===========================================================
    // Normalize Frontend Physical Name
    //===========================================================

    private static string NormalizeFrontendPhysicalName
    (
        string value
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                value
            )
        )
        {
            return string.Empty;
        }


        var builder =
            new StringBuilder();

        var previousWasSeparator =
            false;


        foreach
        (
            var character in value.Trim()
        )
        {
            if
            (
                char.IsLetterOrDigit
                (
                    character
                )
            )
            {
                builder.Append
                (
                    char.ToLowerInvariant
                    (
                        character
                    )
                );

                previousWasSeparator =
                    false;

                continue;
            }


            if
            (
                builder.Length > 0 &&
                !previousWasSeparator
            )
            {
                builder.Append
                (
                    '-'
                );

                previousWasSeparator =
                    true;
            }
        }


        return builder
            .ToString()
            .Trim
            (
                '-'
            );
    }


    //===========================================================
    // Get Singular Backend Physical Name
    //===========================================================

    private static string GetSingularBackendPhysicalName(
        string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        if (value.EndsWith(
            "ies",
            StringComparison.OrdinalIgnoreCase))
        {
            return value[..^3] + "y";
        }

        if (value.EndsWith(
            "s",
            StringComparison.OrdinalIgnoreCase) &&
            !value.EndsWith(
                "ss",
                StringComparison.OrdinalIgnoreCase))
        {
            return value[..^1];
        }

        return value;
    }

    //===========================================================
    // Normalize Backend Physical Name
    //===========================================================

    private static string NormalizeBackendPhysicalName
    (
        string value
    )
    {
        if
        (
            string.IsNullOrWhiteSpace
            (
                value
            )
        )
        {
            return string.Empty;
        }


        return string.Concat
        (
            value
                .Trim()
                .Where
                (
                    character =>
                        char.IsLetterOrDigit
                        (
                            character
                        )
                )
        );
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long> CreateAsync
    (
        PageCloning pageCloning
    )
    {
        await _context.Set<PageCloning>()
            .AddAsync
            (
                pageCloning
            );

        await _context.SaveChangesAsync();

        return pageCloning.Id;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task UpdateAsync
    (
        PageCloning pageCloning
    )
    {
        _context.Set<PageCloning>()
            .Update
            (
                pageCloning
            );

        await _context.SaveChangesAsync();
    }




    //===========================================================
    // Clone
    //===========================================================

    public async Task CloneAsync
    (
        long id,
        PageCloningDto? configuration = null
    )
    {
        //=======================================================
        // Load Page Cloning Record
        //=======================================================

        var pageCloning =
            await _context.Set<PageCloning>()
                .FirstOrDefaultAsync(
                    x =>
                        x.Id == id &&
                        !x.IsDeleted);

        if (pageCloning == null)
        {
            throw new InvalidOperationException(
                "Page cloning record was not found.");
        }

        //=======================================================
        // Initialize Operation State
        //=======================================================

        var originalTargetContents =
            new Dictionary<string, byte[]>(
                StringComparer.OrdinalIgnoreCase);

        var modifiedTargetPaths =
            new List<string>();

        try
        {
            //===================================================
            // Prepare Transformation Configuration
            //===================================================

            configuration ??= new PageCloningDto
            {
                Id = pageCloning.Id,

                CloneFromId = pageCloning.CloneFromId,
                CloneFromCode = pageCloning.CloneFromCode,
                CloneFromName = pageCloning.CloneFromName,

                CloneToId = pageCloning.CloneToId,
                CloneToCode = pageCloning.CloneToCode,
                CloneToName = pageCloning.CloneToName,

                RenameIdentifiers = true,
                UpdateRoutes = true,
                UpdateApiReferences = true,
                UpdateModelReferences = true,
                PreserveTargetFilePaths = true
            };

            //===================================================
            // Validate Configuration Ownership
            //===================================================

            if (
                configuration.CloneFromId > 0 &&
                configuration.CloneFromId != pageCloning.CloneFromId
            )
            {
                throw new InvalidOperationException(
                    "The configured source page does not match " +
                    "the saved cloning record.");
            }

            if (
                configuration.CloneToId > 0 &&
                configuration.CloneToId != pageCloning.CloneToId
            )
            {
                throw new InvalidOperationException(
                    "The configured target page does not match " +
                    "the saved cloning record.");
            }

            //===================================================
            // Validate Source and Target
            //===================================================

            if (
                pageCloning.CloneFromId <= 0 ||
                pageCloning.CloneToId <= 0
            )
            {
                throw new InvalidOperationException(
                    "Both source and target pages are required.");
            }

            if (pageCloning.CloneFromId == pageCloning.CloneToId)
            {
                throw new InvalidOperationException(
                    "Source and target pages must be different.");
            }

            if (
                configuration.RenameIdentifiers &&
                (
                    string.IsNullOrWhiteSpace(pageCloning.CloneFromName) ||
                    string.IsNullOrWhiteSpace(pageCloning.CloneToName)
                )
            )
            {
                throw new InvalidOperationException(
                    "Source and target page names are required " +
                    "when identifier renaming is enabled.");
            }

            if (
                configuration.UpdateApiReferences &&
                (
                    string.IsNullOrWhiteSpace(pageCloning.CloneFromCode) ||
                    string.IsNullOrWhiteSpace(pageCloning.CloneToCode)
                )
            )
            {
                throw new InvalidOperationException(
                    "Source and target page codes are required " +
                    "when API reference updates are enabled.");
            }

            //===================================================
            // Validate Model Field Operations
            //===================================================

            var modelFields =
                configuration.ModelFields ??
                new List<PageCloningModelFieldDto>();

            var allowedFieldOperations =
                new HashSet<string>(
                    StringComparer.OrdinalIgnoreCase)
                {
                    "Keep",
                    "Modify",
                    "Add",
                    "Exclude"
                };

            var configuredFieldKeys =
                new HashSet<string>(
                    StringComparer.OrdinalIgnoreCase);

            foreach (var field in modelFields)
            {
                if (field == null)
                {
                    throw new InvalidOperationException(
                        "The model-field configuration contains " +
                        "an empty entry.");
                }

                if (string.IsNullOrWhiteSpace(field.Name))
                {
                    throw new InvalidOperationException(
                        "Every configured model field must have a name.");
                }

                var operation =
                    field.Operation?.Trim() ?? string.Empty;

                if (!allowedFieldOperations.Contains(operation))
                {
                    throw new InvalidOperationException(
                        $"Unsupported operation '{operation}' " +
                        $"for model field '{field.Name}'.");
                }

                if (
                    string.Equals(
                        operation,
                        "Add",
                        StringComparison.OrdinalIgnoreCase)
                )
                {
                    if (string.IsNullOrWhiteSpace(field.Type))
                    {
                        throw new InvalidOperationException(
                            $"A type is required for the new field " +
                            $"'{field.Name}'.");
                    }

                    continue;
                }

                var sourceField =
                    string.IsNullOrWhiteSpace(field.SourceField)
                        ? field.Name.Trim()
                        : field.SourceField.Trim();

                var inputModel =
                    field.InputModel?.Trim() ?? string.Empty;

                var fieldKey =
                    $"{inputModel}|{sourceField}";

                if (!configuredFieldKeys.Add(fieldKey))
                {
                    throw new InvalidOperationException(
                        "Duplicate model-field configuration found " +
                        $"for '{sourceField}' in model '{inputModel}'.");
                }
            }

            //===================================================
            // Analyze Source and Target Independently
            //===================================================

            var sourceAnalysis =
                await AnalyzeSourceAsync(
                    pageCloning.CloneFromId);

            var targetAnalysis =
                await AnalyzeTargetAsync(
                    pageCloning.CloneToId);

            var sourceFiles =
                sourceAnalysis.Files?.ToList() ??
                new List<PageCloningSourceFileDto>();

            var targetFiles =
                targetAnalysis.Files?.ToList() ??
                new List<PageCloningSourceFileDto>();

            //===================================================
            // Validate Registered File Count
            //===================================================

            if (
                sourceFiles.Count != 15 ||
                targetFiles.Count != 15
            )
            {
                throw new InvalidOperationException(
                    "Cloning requires exactly 15 registered files " +
                    "for both source and target. " +
                    $"Source: {sourceFiles.Count}; " +
                    $"Target: {targetFiles.Count}.");
            }

            //===================================================
            // Normalize File Types
            //===================================================

            static string NormalizeFileType(string? fileType)
            {
                return fileType?.Trim() ?? string.Empty;
            }

            var sourceFilesByType =
                new Dictionary<string, PageCloningSourceFileDto>(
                    StringComparer.OrdinalIgnoreCase);

            var targetFilesByType =
                new Dictionary<string, PageCloningSourceFileDto>(
                    StringComparer.OrdinalIgnoreCase);

            foreach (var file in sourceFiles)
            {
                var fileType =
                    NormalizeFileType(file.FileType);

                if (string.IsNullOrWhiteSpace(fileType))
                {
                    throw new InvalidOperationException(
                        "A source file registration has no file type.");
                }

                if (!sourceFilesByType.TryAdd(fileType, file))
                {
                    throw new InvalidOperationException(
                        $"Duplicate source file registration " +
                        $"for type '{fileType}'.");
                }
            }

            foreach (var file in targetFiles)
            {
                var fileType =
                    NormalizeFileType(file.FileType);

                if (string.IsNullOrWhiteSpace(fileType))
                {
                    throw new InvalidOperationException(
                        "A target file registration has no file type.");
                }

                if (!targetFilesByType.TryAdd(fileType, file))
                {
                    throw new InvalidOperationException(
                        $"Duplicate target file registration " +
                        $"for type '{fileType}'.");
                }
            }

            //===================================================
            // Validate Matching Source and Target File Types
            //===================================================

            var missingTargetTypes =
                sourceFilesByType.Keys
                    .Except(
                        targetFilesByType.Keys,
                        StringComparer.OrdinalIgnoreCase)
                    .ToList();

            var unexpectedTargetTypes =
                targetFilesByType.Keys
                    .Except(
                        sourceFilesByType.Keys,
                        StringComparer.OrdinalIgnoreCase)
                    .ToList();

            if (
                missingTargetTypes.Count > 0 ||
                unexpectedTargetTypes.Count > 0
            )
            {
                throw new InvalidOperationException(
                    "Source and target file registrations do not match. " +
                    "Missing target types: " +
                    (
                        missingTargetTypes.Count == 0
                            ? "none"
                            : string.Join(", ", missingTargetTypes)
                    ) +
                    ". Unexpected target types: " +
                    (
                        unexpectedTargetTypes.Count == 0
                            ? "none"
                            : string.Join(", ", unexpectedTargetTypes)
                    ) +
                    ".");
            }

            //===================================================
            // Build Deterministic Source-to-Target Mapping
            //===================================================

            var orderedSourceFiles =
                sourceFiles
                    .OrderBy(
                        x => NormalizeFileType(x.FileType),
                        StringComparer.OrdinalIgnoreCase)
                    .ToList();

            var orderedTargetFiles =
                orderedSourceFiles
                    .Select(
                        sourceFile =>
                            targetFilesByType[
                                NormalizeFileType(sourceFile.FileType)])
                    .ToList();

            //===================================================
            // Validate Existing Source Files
            //===================================================

            foreach (var file in orderedSourceFiles)
            {
                if (string.IsNullOrWhiteSpace(file.Path))
                {
                    throw new InvalidOperationException(
                        $"Source path is missing for '{file.FileType}'.");
                }

                var sourcePath =
                    Path.GetFullPath(file.Path);

                if (!File.Exists(sourcePath))
                {
                    throw new FileNotFoundException(
                        $"Source file does not exist: {sourcePath}",
                        sourcePath);
                }
            }

            //===================================================
            // Validate Existing Target Files
            //===================================================

            foreach (var file in orderedTargetFiles)
            {
                if (string.IsNullOrWhiteSpace(file.Path))
                {
                    throw new InvalidOperationException(
                        $"Target path is missing for '{file.FileType}'.");
                }

                var targetPath =
                    Path.GetFullPath(file.Path);

                if (!File.Exists(targetPath))
                {
                    throw new FileNotFoundException(
                        "Target file does not exist. Page Cloning " +
                        "never creates files or folders: " + targetPath,
                        targetPath);
                }
            }

            //===================================================
            // Validate Unique Target Paths
            //===================================================

            var fullTargetPaths =
                orderedTargetFiles
                    .Select(x => Path.GetFullPath(x.Path))
                    .ToList();

            var duplicateTargetPaths =
                fullTargetPaths
                    .GroupBy(
                        x => x,
                        StringComparer.OrdinalIgnoreCase)
                    .Where(x => x.Count() > 1)
                    .Select(x => x.Key)
                    .ToList();

            if (duplicateTargetPaths.Count > 0)
            {
                throw new InvalidOperationException(
                    "Multiple target registrations resolve to " +
                    "the same file: " +
                    string.Join(", ", duplicateTargetPaths));
            }

            //===================================================
            // Read and Transform All Source Files Before Writing
            //===================================================

            var transformedContents =
                new List<byte[]>(orderedSourceFiles.Count);

            foreach (var sourceFile in orderedSourceFiles)
            {
                //================================================
                // Read Source File
                //================================================

                var sourcePath =
                    Path.GetFullPath(sourceFile.Path);

                var sourceText =
                    await File.ReadAllTextAsync(sourcePath);

                //================================================
                // Apply Model-Field Operations to Frontend Model
                //================================================

                var isFrontendModelFile =
                    string.Equals(
                        sourceFile.Category,
                        "Frontend",
                        StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(
                        NormalizeFileType(sourceFile.FileType),
                        "Model",
                        StringComparison.OrdinalIgnoreCase);

                if (
                    isFrontendModelFile &&
                    configuration.UpdateModelReferences &&
                    modelFields.Count > 0
                )
                {
                    sourceText =
                        TransformTypeScriptModelFields(
                            sourceText,
                            modelFields);
                }

                //================================================
                // Apply Model-Field Renames to Dependent Files
                //================================================

                if (
                    configuration.UpdateModelReferences &&
                    modelFields.Count > 0
                )
                {
                    sourceText =
                        TransformModelFieldReferences(
                            sourceText,
                            sourceFile.FileType,
                            modelFields);
                }

                //================================================
                // Apply Page Identifier Transformations
                //================================================

                var transformedText =
                    TransformClonedContent(
                        sourceText,
                        sourceFile.FileType,
                        pageCloning,
                        configuration);

                //================================================
                // Prepare Output Bytes
                //================================================

                transformedContents.Add(
                    new UTF8Encoding(
                        encoderShouldEmitUTF8Identifier: false)
                    .GetBytes(transformedText));
            }

            //===================================================
            // Capture Existing Target Contents In Memory
            //===================================================
            // Used only for rollback if this operation fails.
            // No backup files or folders are created.

            foreach (var targetFile in orderedTargetFiles)
            {
                var targetPath =
                    Path.GetFullPath(targetFile.Path);

                originalTargetContents[targetPath] =
                    await File.ReadAllBytesAsync(targetPath);
            }

            //===================================================
            // Write to Existing Target Files Only
            //===================================================

            for (
                var index = 0;
                index < orderedTargetFiles.Count;
                index++
            )
            {
                var targetPath =
                    Path.GetFullPath(
                        orderedTargetFiles[index].Path);

                modifiedTargetPaths.Add(targetPath);

                await File.WriteAllBytesAsync(
                    targetPath,
                    transformedContents[index]);
            }

            //===================================================
            // Record Successful Clone
            //===================================================

            pageCloning.Status = "Completed";
            pageCloning.LastClonedDate = DateTime.UtcNow;
            pageCloning.LastCloningResult =
                "Successfully transformed and cloned 15 source files " +
                "into 15 existing target files using file-type-based " +
                "mapping. No files or folders were created. " +
                "In-memory rollback snapshots were held for this " +
                "operation only.";

            await _context.SaveChangesAsync();
        }
        catch (Exception exception)
        {
            //===================================================
            // Roll Back Files Modified During This Operation
            //===================================================

            var rollbackErrors =
                new List<string>();

            foreach (
                var targetPath in modifiedTargetPaths
                    .AsEnumerable()
                    .Reverse()
            )
            {
                try
                {
                    if (
                        originalTargetContents.TryGetValue(
                            targetPath,
                            out var originalContents) &&
                        File.Exists(targetPath)
                    )
                    {
                        await File.WriteAllBytesAsync(
                            targetPath,
                            originalContents);
                    }
                }
                catch (Exception rollbackException)
                {
                    rollbackErrors.Add(
                        $"{targetPath}: {rollbackException.Message}");
                }
            }

            //===================================================
            // Record Failure
            //===================================================

            pageCloning.Status = "Failed";
            pageCloning.LastClonedDate = DateTime.UtcNow;

            pageCloning.LastCloningResult =
                rollbackErrors.Count == 0
                    ? exception.Message
                    : exception.Message +
                      " | Rollback errors: " +
                      string.Join(" | ", rollbackErrors);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception databaseException)
            {
                throw new InvalidOperationException(
                    "Cloning failed and the failure status could not " +
                    "be saved. Original error: " +
                    exception.Message +
                    " | Database error: " +
                    databaseException.Message,
                    exception);
            }

            if (rollbackErrors.Count > 0)
            {
                throw new InvalidOperationException(
                    "Cloning failed and one or more modified target " +
                    "files could not be restored from the operation's " +
                    "in-memory snapshot. " +
                    string.Join(" | ", rollbackErrors),
                    exception);
            }

            throw;
        }
    }


    //===========================================================
    // Transform Cloned Content
    //===========================================================

    private static string TransformClonedContent
    (
        string content,
        string fileType,
        PageCloning pageCloning,
        PageCloningDto configuration
    )
    {
        //=======================================================
        // Validate Content
        //=======================================================

        if (string.IsNullOrEmpty(content))
        {
            return content;
        }

        ArgumentNullException.ThrowIfNull(pageCloning);
        ArgumentNullException.ThrowIfNull(configuration);

        //=======================================================
        // Read Source and Target Identifiers
        //=======================================================

        var sourceName =
            pageCloning.CloneFromName?.Trim() ?? string.Empty;

        var targetName =
            pageCloning.CloneToName?.Trim() ?? string.Empty;

        var sourceCode =
            pageCloning.CloneFromCode?.Trim() ?? string.Empty;

        var targetCode =
            pageCloning.CloneToCode?.Trim() ?? string.Empty;

        var normalizedFileType =
            fileType?.Trim() ?? string.Empty;

        //=======================================================
        // Validate Required Identifiers
        //=======================================================

        if (
            configuration.RenameIdentifiers &&
            (
                string.IsNullOrWhiteSpace(sourceName) ||
                string.IsNullOrWhiteSpace(targetName)
            )
        )
        {
            throw new InvalidOperationException(
                "Source and target names are required when identifier renaming is enabled.");
        }

        if (
            configuration.UpdateApiReferences &&
            (
                string.IsNullOrWhiteSpace(sourceCode) ||
                string.IsNullOrWhiteSpace(targetCode)
            )
        )
        {
            throw new InvalidOperationException(
                "Source and target codes are required when API reference updates are enabled.");
        }

        //=======================================================
        // Prepare Identifier Variants
        //=======================================================

        var sourcePascal =
            configuration.RenameIdentifiers
                ? ToPascalIdentifier(sourceName)
                : string.Empty;

        var targetPascal =
            configuration.RenameIdentifiers
                ? ToPascalIdentifier(targetName)
                : string.Empty;

        var sourceCamel =
            configuration.RenameIdentifiers
                ? ToCamelIdentifier(sourceName)
                : string.Empty;

        var targetCamel =
            configuration.RenameIdentifiers
                ? ToCamelIdentifier(targetName)
                : string.Empty;

        var sourceKebab =
            configuration.UpdateRoutes
                ? ToKebabIdentifier(sourceName)
                : string.Empty;

        var targetKebab =
            configuration.UpdateRoutes
                ? ToKebabIdentifier(targetName)
                : string.Empty;

        var sourceSnake =
            configuration.UpdateRoutes
                ? ToSnakeIdentifier(sourceName)
                : string.Empty;

        var targetSnake =
            configuration.UpdateRoutes
                ? ToSnakeIdentifier(targetName)
                : string.Empty;

        //=======================================================
        // Define File-Type Groups
        //=======================================================

        var routeFileTypes =
            new HashSet<string>(
                StringComparer.OrdinalIgnoreCase)
            {
                "Route",
                "Routes",
                "Routing",
                "Service",
                "List TS",
                "Form TS",
                "Controller"
            };

        var modelReferenceFileTypes =
            new HashSet<string>(
                StringComparer.OrdinalIgnoreCase)
            {
                "Model",
                "Entity",
                "Configuration",
                "DTO",
                "Default DTO",
                "Create DTO",
                "Update DTO",
                "Repository Interface",
                "Repository",
                "Service",
                "List TS",
                "Form TS",
                "Controller"
            };

        //=======================================================
        // Define Identifier-Family Replacement Helper
        //=======================================================
        // Replaces a complete source identifier and recognized
        // PascalCase/camelCase suffixes.
        //
        // Examples:
        // Wing             -> CashAccounts
        // WingDto          -> CashAccountsDto
        // wingService      -> cashAccountsService
        //
        // It does not replace arbitrary substrings such as
        // Wing inside WingedItem.

        static string ReplaceIdentifierFamily(
            string input,
            string source,
            string target)
        {
            if (
                string.IsNullOrEmpty(input) ||
                string.IsNullOrEmpty(source) ||
                string.IsNullOrEmpty(target) ||
                string.Equals(
                    source,
                    target,
                    StringComparison.Ordinal)
            )
            {
                return input;
            }

            var pattern =
                $@"(?<![A-Za-z0-9_$])" +
                Regex.Escape(source) +
                @"(?<suffix>(?=[A-Z0-9_$])[A-Za-z0-9_$]*)?" +
                @"(?![A-Za-z0-9_$])";

            return Regex.Replace(
                input,
                pattern,
                match =>
                    target + match.Groups["suffix"].Value,
                RegexOptions.CultureInvariant);
        }

        //=======================================================
        // Define Exact Display-Name Replacement Helper
        //=======================================================
        // Updates standalone page-name text in labels,
        // comments, and other content without replacing the
        // source name inside longer identifiers.
        //
        // This helper must not be used as an unrestricted
        // substring replacement.

        static string ReplaceExactDisplayName(
            string input,
            string source,
            string target)
        {
            if (
                string.IsNullOrEmpty(input) ||
                string.IsNullOrWhiteSpace(source) ||
                string.IsNullOrWhiteSpace(target) ||
                string.Equals(
                    source,
                    target,
                    StringComparison.OrdinalIgnoreCase)
            )
            {
                return input;
            }

            var pattern =
                $@"(?<![A-Za-z0-9_$])" +
                Regex.Escape(source) +
                @"(?![A-Za-z0-9_$])";

            return Regex.Replace(
                input,
                pattern,
                _ => target,
                RegexOptions.IgnoreCase |
                RegexOptions.CultureInvariant);
        }

        //=======================================================
        // Transform Page Identifiers
        //=======================================================

        if (configuration.RenameIdentifiers)
        {
            // Transform PascalCase identifier families first.

            content = ReplaceIdentifierFamily(
                content,
                sourcePascal,
                targetPascal);

            // Transform camelCase identifier families.

            content = ReplaceIdentifierFamily(
                content,
                sourceCamel,
                targetCamel);

            // Update standalone display-name occurrences.
            // Word boundaries prevent changes inside names
            // such as CashAccountsDto or cashAccountsService.

            content = ReplaceExactDisplayName(
                content,
                sourceName,
                targetName);
        }

        //=======================================================
        // Transform Route References
        //=======================================================
        // Route variants are applied only to recognized
        // route-bearing file types.

        if (
            configuration.UpdateRoutes &&
            routeFileTypes.Contains(normalizedFileType)
        )
        {
            content = ReplaceBoundedRouteIdentifier(
                content,
                sourceKebab,
                targetKebab);

            content = ReplaceBoundedRouteIdentifier(
                content,
                sourceSnake,
                targetSnake);
        }

        //=======================================================
        // Transform API References
        //=======================================================
        // Replace complete API-code tokens only.

        if (
            configuration.UpdateApiReferences &&
            !string.IsNullOrWhiteSpace(sourceCode) &&
            !string.IsNullOrWhiteSpace(targetCode)
        )
        {
            content = ReplaceBoundedIdentifier(
                content,
                sourceCode,
                targetCode);
        }

        //=======================================================
        // Transform Model-Related Identifiers
        //=======================================================
        // This handles page-name references only.
        // Model-field Keep/Modify/Add/Exclude operations are
        // handled by the dedicated model-field transformer.

        if (
            configuration.UpdateModelReferences &&
            modelReferenceFileTypes.Contains(normalizedFileType)
        )
        {
            content = ReplaceIdentifierFamily(
                content,
                sourcePascal,
                targetPascal);

            content = ReplaceIdentifierFamily(
                content,
                sourceCamel,
                targetCamel);
        }

        //=======================================================
        // Return Transformed Content
        //=======================================================

        return content;

        //=======================================================
        // Local Helper: Bounded Identifier
        //=======================================================

        static string ReplaceBoundedIdentifier(
            string input,
            string source,
            string target)
        {
            if (
                string.IsNullOrEmpty(input) ||
                string.IsNullOrEmpty(source) ||
                string.IsNullOrEmpty(target) ||
                string.Equals(
                    source,
                    target,
                    StringComparison.Ordinal)
            )
            {
                return input;
            }

            var pattern =
                $@"(?<![A-Za-z0-9_$])" +
                Regex.Escape(source) +
                @"(?![A-Za-z0-9_$])";

            return Regex.Replace(
                input,
                pattern,
                _ => target,
                RegexOptions.CultureInvariant);
        }

        //=======================================================
        // Local Helper: Bounded Route Identifier
        //=======================================================
        // Hyphens are treated as part of route identifiers
        // so that partial route segments are not replaced.

        static string ReplaceBoundedRouteIdentifier(
            string input,
            string source,
            string target)
        {
            if (
                string.IsNullOrEmpty(input) ||
                string.IsNullOrEmpty(source) ||
                string.IsNullOrEmpty(target) ||
                string.Equals(
                    source,
                    target,
                    StringComparison.Ordinal)
            )
            {
                return input;
            }

            var pattern =
                $@"(?<![A-Za-z0-9_$-])" +
                Regex.Escape(source) +
                @"(?![A-Za-z0-9_$-])";

            return Regex.Replace(
                input,
                pattern,
                _ => target,
                RegexOptions.CultureInvariant);
        }
    }


    //===========================================================
    // Transform TypeScript Model Fields
    //===========================================================

    private static string TransformTypeScriptModelFields
    (
        string content,
        IReadOnlyCollection<PageCloningModelFieldDto> modelFields
    )
    {
        //=======================================================
        // SECTION 01 : VALIDATE INPUT
        //=======================================================

        if (
            string.IsNullOrWhiteSpace(content) ||
            modelFields == null ||
            modelFields.Count == 0
        )
        {
            return content;
        }

        //=======================================================
        // SECTION 02 : LOCATE EXPORTED INTERFACES
        //=======================================================

        var interfacePattern =
            @"export\s+interface\s+" +
            @"(?<name>[A-Za-z_$][\w$]*)\s*" +
            @"\{(?<body>[^{}]*)\}";

        var interfaceMatches = Regex.Matches(
            content,
            interfacePattern,
            RegexOptions.Multiline);

        if (interfaceMatches.Count == 0)
        {
            throw new InvalidOperationException(
                "Model-field operations require at least one supported " +
                "exported TypeScript interface.");
        }

        var output = new StringBuilder();
        var lastIndex = 0;

        //=======================================================
        // SECTION 03 : PROCESS EACH INTERFACE
        //=======================================================

        foreach (Match interfaceMatch in interfaceMatches)
        {
            var interfaceName =
                interfaceMatch.Groups["name"].Value.Trim();

            var interfaceBody =
                interfaceMatch.Groups["body"].Value;

            // Preserve all content preceding this interface.
            output.Append(
                content.Substring(
                    lastIndex,
                    interfaceMatch.Index - lastIndex));

            // Only apply configurations assigned to this interface.
            var interfaceFields = modelFields
                .Where(field =>
                    field != null &&
                    string.Equals(
                        field.InputModel?.Trim(),
                        interfaceName,
                        StringComparison.OrdinalIgnoreCase))
                .ToList();

            // No configuration for this interface: preserve it unchanged.
            if (interfaceFields.Count == 0)
            {
                output.Append(interfaceMatch.Value);

                lastIndex =
                    interfaceMatch.Index + interfaceMatch.Length;

                continue;
            }

            //===================================================
            // SECTION 04 : VALIDATE FIELD CONFIGURATIONS
            //===================================================

            var configuredSources =
                new HashSet<string>(
                    StringComparer.OrdinalIgnoreCase);

            var outputNames =
                new HashSet<string>(
                    StringComparer.OrdinalIgnoreCase);

            var additions =
                new List<string>();

            foreach (var field in interfaceFields)
            {
                if (string.IsNullOrWhiteSpace(field.Name))
                {
                    throw new InvalidOperationException(
                        $"Interface '{interfaceName}' contains a " +
                        "field configuration without a name.");
                }

                var operation =
                    field.Operation?.Trim() ?? "Keep";

                if (!new[]
                    {
                        "Keep",
                        "Modify",
                        "Add",
                        "Exclude"
                    }.Contains(
                        operation,
                        StringComparer.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException(
                        $"Unsupported operation '{operation}' for " +
                        $"field '{field.Name}' in '{interfaceName}'.");
                }

                ValidateTypeScriptFieldName(field.Name.Trim());

                if (string.Equals(
                    operation,
                    "Add",
                    StringComparison.OrdinalIgnoreCase))
                {
                    if (string.IsNullOrWhiteSpace(field.Type))
                    {
                        throw new InvalidOperationException(
                            $"A TypeScript type is required for added " +
                            $"field '{field.Name}' in '{interfaceName}'.");
                    }

                    var addedType = field.Type.Trim();

                    if (
                        addedType.Contains('\r') ||
                        addedType.Contains('\n') ||
                        addedType.Contains(';') ||
                        addedType.Contains('{') ||
                        addedType.Contains('}')
                    )
                    {
                        throw new InvalidOperationException(
                            $"The type for added field '{field.Name}' " +
                            "must be a single-line TypeScript type.");
                    }

                    additions.Add(
                        $"    {field.Name.Trim()}: {addedType};");

                    continue;
                }

                var sourceField =
                    string.IsNullOrWhiteSpace(field.SourceField)
                        ? field.Name.Trim()
                        : field.SourceField.Trim();

                ValidateTypeScriptFieldName(sourceField);

                if (!configuredSources.Add(sourceField))
                {
                    throw new InvalidOperationException(
                        $"More than one configuration targets field " +
                        $"'{sourceField}' in interface '{interfaceName}'.");
                }

                if (
                    string.Equals(
                        operation,
                        "Modify",
                        StringComparison.OrdinalIgnoreCase) &&
                    !string.IsNullOrWhiteSpace(field.Type)
                )
                {
                    var modifiedType = field.Type.Trim();

                    if (
                        modifiedType.Contains('\r') ||
                        modifiedType.Contains('\n') ||
                        modifiedType.Contains(';') ||
                        modifiedType.Contains('{') ||
                        modifiedType.Contains('}')
                    )
                    {
                        throw new InvalidOperationException(
                            $"The type for field '{field.Name}' must " +
                            "be a single-line TypeScript type.");
                    }
                }
            }

            //===================================================
            // SECTION 05 : PARSE PROPERTY DECLARATIONS
            //===================================================
            // Supports both:
            //
            // WingId: number;
            //
            // WingId:
            //     number;
            //
            // Existing optional markers are preserved.

            var propertyPattern =
                @"^(?<indent>[ \t]*)" +
                @"(?<name>[A-Za-z_$][\w$]*)" +
                @"(?<optional>\?)?" +
                @"[ \t]*:[ \t]*" +
                @"(?<type>[^;\r\n]+?)" +
                @"[ \t]*;[ \t]*" +
                @"(?<comment>//[^\r\n]*)?$";

            var lines =
                interfaceBody.Split('\n');

            var transformedLines =
                new List<string>();

            var pendingProperty =
                new StringBuilder();

            var outputPropertyNames =
                new HashSet<string>(
                    StringComparer.OrdinalIgnoreCase);

            foreach (var originalLine in lines)
            {
                var line = originalLine.TrimEnd('\r');

                //================================================
                // SECTION 05.1 : ACCUMULATE MULTILINE PROPERTIES
                //================================================

                if (pendingProperty.Length > 0)
                {
                    pendingProperty.Append('\n');
                    pendingProperty.Append(line);

                    if (!line.Contains(';'))
                    {
                        continue;
                    }

                    line = pendingProperty.ToString();
                    pendingProperty.Clear();
                }
                else if (
                    Regex.IsMatch(
                        line,
                        @"^[ \t]*[A-Za-z_$][\w$]*\??[ \t]*:[ \t]*$")
                )
                {
                    pendingProperty.Append(line);
                    continue;
                }

                //================================================
                // SECTION 05.2 : MATCH PROPERTY
                //================================================

                var propertyMatch = Regex.Match(
                    line,
                    propertyPattern,
                    RegexOptions.Multiline);

                if (!propertyMatch.Success)
                {
                    transformedLines.Add(line);
                    continue;
                }

                var originalName =
                    propertyMatch.Groups["name"].Value;

                var fieldConfiguration =
                    interfaceFields.FirstOrDefault(field =>
                        !string.Equals(
                            field.Operation?.Trim(),
                            "Add",
                            StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(
                            string.IsNullOrWhiteSpace(field.SourceField)
                                ? field.Name?.Trim()
                                : field.SourceField.Trim(),
                            originalName,
                            StringComparison.OrdinalIgnoreCase));

                //================================================
                // SECTION 05.3 : KEEP UNCONFIGURED PROPERTY
                //================================================

                if (fieldConfiguration == null)
                {
                    if (!outputPropertyNames.Add(originalName))
                    {
                        throw new InvalidOperationException(
                            $"Duplicate TypeScript property '{originalName}' " +
                            $"was found in interface '{interfaceName}'.");
                    }

                    transformedLines.Add(line);
                    continue;
                }

                var operation =
                    fieldConfiguration.Operation?.Trim() ?? "Keep";

                //================================================
                // SECTION 05.4 : EXCLUDE PROPERTY
                //================================================

                if (string.Equals(
                    operation,
                    "Exclude",
                    StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                //================================================
                // SECTION 05.5 : KEEP OR MODIFY PROPERTY
                //================================================

                var outputName =
                    string.Equals(
                        operation,
                        "Modify",
                        StringComparison.OrdinalIgnoreCase)
                        ? fieldConfiguration.Name.Trim()
                        : originalName;

                var outputType =
                    string.Equals(
                        operation,
                        "Modify",
                        StringComparison.OrdinalIgnoreCase) &&
                    !string.IsNullOrWhiteSpace(fieldConfiguration.Type)
                        ? fieldConfiguration.Type.Trim()
                        : propertyMatch.Groups["type"].Value.Trim();

                // Preserve source optionality. UI Required is not
                // the same as TypeScript optionality.
                var optionalMarker =
                    propertyMatch.Groups["optional"].Value;

                var indent =
                    propertyMatch.Groups["indent"].Value;

                var comment =
                    propertyMatch.Groups["comment"].Success
                        ? " " + propertyMatch.Groups["comment"].Value
                        : string.Empty;

                if (!outputPropertyNames.Add(outputName))
                {
                    throw new InvalidOperationException(
                        $"Transformation produces duplicate property " +
                        $"'{outputName}' in interface '{interfaceName}'.");
                }

                transformedLines.Add(
                    $"{indent}{outputName}{optionalMarker}: " +
                    $"{outputType};{comment}");
            }

            //===================================================
            // SECTION 06 : VALIDATE PENDING DECLARATION
            //===================================================

            if (pendingProperty.Length > 0)
            {
                throw new InvalidOperationException(
                    $"An incomplete multiline property declaration " +
                    $"was found in interface '{interfaceName}'.");
            }

            //===================================================
            // SECTION 07 : ADD NEW PROPERTIES
            //===================================================

            foreach (var addition in additions)
            {
                var addedPropertyMatch = Regex.Match(
                    addition.Trim(),
                    @"^(?<name>[A-Za-z_$][\w$]*)\s*:");

                if (!addedPropertyMatch.Success)
                {
                    throw new InvalidOperationException(
                        $"An added property in '{interfaceName}' " +
                        "has an invalid declaration.");
                }

                var addedName =
                    addedPropertyMatch.Groups["name"].Value;

                if (!outputPropertyNames.Add(addedName))
                {
                    throw new InvalidOperationException(
                        $"Added field '{addedName}' duplicates a " +
                        $"property in interface '{interfaceName}'.");
                }

                transformedLines.Add(addition);
            }

            //===================================================
            // SECTION 08 : REBUILD INTERFACE
            //===================================================

            var transformedBody =
                string.Join("\n", transformedLines);

            var transformedInterface =
                interfaceMatch.Value.Replace(
                    interfaceBody,
                    transformedBody);

            output.Append(transformedInterface);

            lastIndex =
                interfaceMatch.Index + interfaceMatch.Length;
        }

        //=======================================================
        // SECTION 09 : APPEND REMAINING CONTENT
        //=======================================================

        output.Append(
            content.Substring(lastIndex));

        return output.ToString();
    }

    //===========================================================
    // Transform Model-Field References in Dependent Files
    //===========================================================

    private static string TransformModelFieldReferences
    (
        string content,
        string fileType,
        IReadOnlyCollection<PageCloningModelFieldDto> modelFields
    )
    {
        //=======================================================
        // Validate Input
        //=======================================================

        if (
            string.IsNullOrWhiteSpace(content) ||
            modelFields == null ||
            modelFields.Count == 0
        )
        {
            return content;
        }

        //=======================================================
        // Identify Operations That Require Reference Changes
        //=======================================================

        var renameMappings = modelFields
            .Where(field =>
                string.Equals(
                    field.Operation?.Trim(),
                    "Modify",
                    StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(field.SourceField) &&
                !string.IsNullOrWhiteSpace(field.Name) &&
                !string.Equals(
                    field.SourceField.Trim(),
                    field.Name.Trim(),
                    StringComparison.Ordinal))
            .GroupBy(
                field => field.SourceField!.Trim(),
                StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                if (group.Count() > 1)
                {
                    throw new InvalidOperationException(
                        $"Multiple model-field mappings use source field " +
                        $"'{group.Key}'.");
                }

                return new
                {
                    Source = group.Key,
                    Target = group.Single().Name.Trim()
                };
            })
            .ToList();

        //=======================================================
        // Restrict Reference Transformation to Supported Files
        //=======================================================

        var supportedFileTypes = new HashSet<string>(
            StringComparer.OrdinalIgnoreCase)
        {
            "Service",
            "List TS",
            "List HTML",
            "Form TS",
            "Form HTML",
            "DTO",
            "Default DTO",
            "Create DTO",
            "Update DTO",
            "Entity",
            "Configuration",
            "Repository Interface",
            "Repository",
            "Controller"
        };

        if (!supportedFileTypes.Contains(fileType))
        {
            return content;
        }

        //=======================================================
        // Replace Exact Field Identifiers
        //=======================================================
        // Identifier boundaries prevent replacing a field name
        // inside a longer identifier.
        // Excluded fields are not automatically deleted here:
        // their usages require file-specific handling.

        foreach (var mapping in renameMappings)
        {
            var pattern =
                $@"(?<![A-Za-z0-9_$])" +
                Regex.Escape(mapping.Source) +
                $@"(?![A-Za-z0-9_$])";

            content = Regex.Replace(
                content,
                pattern,
                _ => mapping.Target,
                RegexOptions.CultureInvariant);
        }

        //=======================================================
        // Return Transformed Content
        //=======================================================

        return content;
    }

    //===========================================================
    // Validate TypeScript Field Name
    //===========================================================

    private static void ValidateTypeScriptFieldName
    (
        string fieldName
    )
    {
        if (
            string.IsNullOrWhiteSpace(fieldName) ||
            !Regex.IsMatch(
                fieldName,
                @"^[A-Za-z_$][A-Za-z0-9_$]*$")
        )
        {
            throw new InvalidOperationException(
                $"Invalid TypeScript field name '{fieldName}'.");
        }
    }

    //===========================================================
    // Convert Name to Pascal Identifier
    //===========================================================

    private static string ToPascalIdentifier(string value)
    {
        var parts = Regex.Split(value, @"[^A-Za-z0-9]+")
            .Where(x => !string.IsNullOrWhiteSpace(x));

        return string.Concat(parts.Select(x =>
            x.Length == 0
                ? string.Empty
                : char.ToUpperInvariant(x[0]) + x[1..]));
    }


    //===========================================================
    // Convert Name to Camel Identifier
    //===========================================================

    private static string ToCamelIdentifier(string value)
    {
        var pascal = ToPascalIdentifier(value);

        return pascal.Length == 0
            ? string.Empty
            : char.ToLowerInvariant(pascal[0]) + pascal[1..];
    }


    //===========================================================
    // Convert Name to Kebab Identifier
    //===========================================================

    private static string ToKebabIdentifier(string value)
    {
        var pascal = ToPascalIdentifier(value);

        if (pascal.Length == 0)
        {
            return string.Empty;
        }

        var separated = Regex.Replace(
            pascal,
            @"([a-z0-9])([A-Z])",
            "$1-$2");

        separated = Regex.Replace(
            separated,
            @"([A-Z])([A-Z][a-z])",
            "$1-$2");

        return separated.ToLowerInvariant();
    }


    //===========================================================
    // Convert Name to Snake Identifier
    //===========================================================

    private static string ToSnakeIdentifier(string value)
    {
        return ToKebabIdentifier(value).Replace('-', '_');
    }

    //===========================================================
    // Generate Package
    //===========================================================

    public async Task GeneratePackageAsync
    (
        long id
    )
    {
        //=======================================================
        // Load Page Cloning Record
        //=======================================================

        var pageCloning =
            await _context.Set<PageCloning>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == id &&
                        !x.IsDeleted
                );

        if (pageCloning == null)
        {
            throw new InvalidOperationException(
                "Page cloning record was not found.");
        }

        //=======================================================
        // Package Generation Not Implemented
        //=======================================================

        throw new NotSupportedException(
            "Package generation is separate from direct page cloning. Use CloneAsync for the cloning workflow.");
    }


    //===========================================================
    // Restore Package
    //===========================================================

    public async Task RestorePackageAsync
    (
        long id
    )
    {
        var pageCloning =
            await _context.Set<PageCloning>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == id &&
                        !x.IsDeleted
                );

        if (pageCloning == null)
        {
            throw new InvalidOperationException(
                "Page cloning record was not found.");
        }

        //=======================================================
        // Persistent Restore Is Not Available Yet
        //=======================================================
        // The existing Code Synchronization restore files are
        // maintained by its own synchronization lifecycle. The
        // current implementation does not prove that those files
        // contain the exact target-file contents from immediately
        // before this Page Cloning operation.
        //
        // Do not report a restore as successful unless the target
        // files have actually been restored from a verified snapshot.

        throw new NotSupportedException(
            "Persistent Page Cloning restore is not available yet. " +
            "The operation-scoped rollback snapshot exists only in memory " +
            "and is no longer available after CloneAsync completes. " +
            "The existing Code Synchronization restore files cannot be used " +
            "safely until their contents are verified as the pre-clone target state.");
    }


    //===========================================================
    // Delete
    //===========================================================

    public async Task DeleteAsync
    (
        long id
    )
    {
        var pageCloning =
            await _context.Set<PageCloning>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == id &&
                        !x.IsDeleted
                );


        if
        (
            pageCloning == null
        )
        {
            return;
        }


        pageCloning.IsDeleted =
            true;

        pageCloning.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore
    //===========================================================

    public async Task RestoreAsync()
    {
        var records =
            await _context.Set<PageCloning>()
                .Where
                (
                    x =>
                        x.IsDeleted
                )
                .ToListAsync();


        foreach
        (
            var record in records
        )
        {
            record.IsDeleted =
                false;

            record.DeletedDate =
                null;

            record.DeletedBy =
                null;
        }


        await _context.SaveChangesAsync();
    }
}