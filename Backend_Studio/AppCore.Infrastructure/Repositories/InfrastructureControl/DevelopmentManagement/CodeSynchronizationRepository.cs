//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Contracts.Persistence.InfrastructureControl.DevelopmentManagement;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.DTOs;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.CodeSynchronization.Interfaces;

using AppCore.Domain.Common;
using AppCore.Domain.InfrastructureControl.DevelopmentManagement;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Entity Alias
//===============================================================

using CodeSynchronizationEntity =
    AppCore.Domain.InfrastructureControl.DevelopmentManagement.CodeSynchronization;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.DevelopmentManagement.CodeSynchronization;


//===============================================================
// Code Synchronization Repository
//===============================================================

public class CodeSynchronizationRepository
    : ICodeSynchronizationRepository
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext
        _context;


    private readonly ICodeSynchronizationEngine
        _codeSynchronizationEngine;



    //===========================================================
    // Constructor
    //===========================================================

    public CodeSynchronizationRepository
    (
        AppDbContext context,

        ICodeSynchronizationEngine
            codeSynchronizationEngine
    )
    {
        _context =
            context;


        _codeSynchronizationEngine =
            codeSynchronizationEngine;
    }



    //===========================================================
    // Get All
    //===========================================================
    //
    // Code Synchronization belongs to the corresponding
    // Submenu Synchronization.
    //
    // Therefore SynchronizationType is resolved from the
    // Submenu Synchronization record instead of trusting a
    // potentially stale Code Synchronization type value.
    //
    //===========================================================

    public async Task<List<CodeSynchronizationDto>>
        GetAllAsync
    (
        string synchronizationType
    )
    {
        if
        (
            string.IsNullOrWhiteSpace(
                synchronizationType
            )
        )
        {
            return [];
        }


        synchronizationType =
            synchronizationType.Trim();


        return await _context.CodeSynchronizations

            .Where
            (
                x =>

                    !x.IsDeleted

                    &&

                    _context.SubmenuSynchronizations.Any
                    (
                        submenu =>

                            submenu.Id ==
                            x.SubmenuSynchronizationId

                            &&

                            !submenu.IsDeleted

                            &&

                            submenu.SynchronizationType ==
                            synchronizationType
                    )
            )

            .OrderBy
            (
                x =>
                    x.SubmenuName
            )

            .Select
            (
                x =>
                    new CodeSynchronizationDto
                    {
                        //===================================================
                        // Primary Key
                        //===================================================

                        Id =
                            x.Id,


                        //===================================================
                        // Submenu Synchronization Reference
                        //===================================================

                        SubmenuSynchronizationId =
                            x.SubmenuSynchronizationId,


                        //===================================================
                        // Navigation
                        //===================================================

                        ModuleId =
                            x.ModuleId,

                        ModuleCode =
                            x.ModuleCode,

                        ModuleName =
                            x.ModuleName,


                        MenuId =
                            x.MenuId,

                        MenuCode =
                            x.MenuCode,

                        MenuName =
                            x.MenuName,


                        SubmenuId =
                            x.SubmenuId,

                        SubmenuCode =
                            x.SubmenuCode,

                        SubmenuName =
                            x.SubmenuName,


                        //===================================================
                        // Synchronization Type
                        //===================================================
                        //
                        // Resolve the type from the parent Submenu
                        // Synchronization record.
                        //
                        //===================================================

                        SynchronizationType =
                            _context.SubmenuSynchronizations

                                .Where
                                (
                                    submenu =>

                                        submenu.Id ==
                                        x.SubmenuSynchronizationId
                                )

                                .Select
                                (
                                    submenu =>
                                        submenu.SynchronizationType
                                )

                                .FirstOrDefault(),


                        //===================================================
                        // Status
                        //===================================================

                        Status =
                            x.Status,


                        //===================================================
                        // Configuration
                        //===================================================

                        Remarks =
                            x.Remarks,


                        //===================================================
                        // Last Synchronization
                        //===================================================

                        LastSynchronizedBy =
                            x.LastSynchronizedBy,

                        LastSynchronizedDate =
                            x.LastSynchronizedDate,

                        LastSynchronizationResult =
                            x.LastSynchronizationResult,


                        //===================================================
                        // Status
                        //===================================================

                        IsActive =
                            x.IsActive,


                        //===================================================
                        // Audit
                        //===================================================

                        CreatedDate =
                            x.CreatedDate
                    }
            )

            .ToListAsync();
    }



    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<CodeSynchronizationDto?>
        GetByIdAsync
    (
        long id
    )
    {
        return await _context.CodeSynchronizations

            .Where
            (
                x =>

                    x.Id ==
                    id

                    &&

                    !x.IsDeleted
            )

            .Select
            (
                x =>
                    new CodeSynchronizationDto
                    {
                        //===================================================
                        // Primary Key
                        //===================================================

                        Id =
                            x.Id,


                        //===================================================
                        // Submenu Synchronization Reference
                        //===================================================

                        SubmenuSynchronizationId =
                            x.SubmenuSynchronizationId,


                        //===================================================
                        // Navigation
                        //===================================================

                        ModuleId =
                            x.ModuleId,

                        ModuleCode =
                            x.ModuleCode,

                        ModuleName =
                            x.ModuleName,


                        MenuId =
                            x.MenuId,

                        MenuCode =
                            x.MenuCode,

                        MenuName =
                            x.MenuName,


                        SubmenuId =
                            x.SubmenuId,

                        SubmenuCode =
                            x.SubmenuCode,

                        SubmenuName =
                            x.SubmenuName,


                        //===================================================
                        // Synchronization Type
                        //===================================================

                        SynchronizationType =
                            _context.SubmenuSynchronizations

                                .Where
                                (
                                    submenu =>

                                        submenu.Id ==
                                        x.SubmenuSynchronizationId
                                )

                                .Select
                                (
                                    submenu =>
                                        submenu.SynchronizationType
                                )

                                .FirstOrDefault(),


                        //===================================================
                        // Synchronization
                        //===================================================

                        Status =
                            x.Status,

                        Remarks =
                            x.Remarks,


                        //===================================================
                        // Last Synchronization
                        //===================================================

                        LastSynchronizedBy =
                            x.LastSynchronizedBy,

                        LastSynchronizedDate =
                            x.LastSynchronizedDate,

                        LastSynchronizationResult =
                            x.LastSynchronizationResult,


                        //===================================================
                        // Status
                        //===================================================

                        IsActive =
                            x.IsActive,


                        //===================================================
                        // Audit
                        //===================================================

                        CreatedDate =
                            x.CreatedDate
                    }
            )

            .FirstOrDefaultAsync();
    }



    //===========================================================
    // Synchronize Code
    //===========================================================

    public async Task<bool>
        SynchronizeAsync
    (
        long id
    )
    {
        var result =
            await _codeSynchronizationEngine
                .SynchronizeAsync
                (
                    id
                );


        if
        (
            !result.Success
        )
        {
            throw new InvalidOperationException
            (
                result.Message
            );
        }


        return true;
    }



    //===========================================================
    // Rollback Code
    //===========================================================

    public async Task<bool>
        RollbackAsync
    (
        long id
    )
    {
        var result =
            await _codeSynchronizationEngine
                .RollbackAsync
                (
                    id
                );


        if
        (
            !result.Success
        )
        {
            throw new InvalidOperationException
            (
                result.Message
            );
        }


        return true;
    }



    //===========================================================
    // Create From Submenu Synchronization
    //===========================================================
    //
    // The Code Synchronization record is created only after
    // the corresponding Submenu Synchronization is synchronized.
    //
    // SynchronizationType is taken directly from the source
    // Submenu Synchronization record.
    //
    //===========================================================

    public async Task<long>
        CreateFromSubmenuSynchronizationAsync
    (
        long submenuSynchronizationId
    )
    {
        const long userId =
            1;


        //=======================================================
        // Load Submenu Synchronization
        //=======================================================

        var submenuSynchronization =
            await _context.SubmenuSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        submenuSynchronizationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            submenuSynchronization == null
        )
        {
            throw new InvalidOperationException
            (
                "The Submenu Synchronization record was not found."
            );
        }


        //=======================================================
        // Validate Submenu Synchronization Status
        //=======================================================

        if
        (
            !string.Equals
            (
                submenuSynchronization.Status,

                "Synchronized",

                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Code Synchronization cannot be created because Submenu Synchronization for '{submenuSynchronization.SubmenuName}' is not synchronized."
            );
        }


        //=======================================================
        // Validate Synchronization Type
        //=======================================================

        if
        (
            string.IsNullOrWhiteSpace
            (
                submenuSynchronization.SynchronizationType
            )
        )
        {
            throw new InvalidOperationException
            (
                $"Code Synchronization cannot be created because the synchronization type for '{submenuSynchronization.SubmenuName}' is not configured."
            );
        }


        var synchronizationType =
            submenuSynchronization
                .SynchronizationType
                .Trim();


        //=======================================================
        // Check Existing Code Synchronization
        //=======================================================

        var existing =
            await _context.CodeSynchronizations

                .FirstOrDefaultAsync
                (
                    x =>

                        x.SubmenuSynchronizationId ==
                        submenuSynchronizationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            existing != null
        )
        {
            //===================================================
            // Keep Existing Record Synchronized With Its Source
            //===================================================

            existing.SynchronizationType =
                synchronizationType;


            existing.ModuleId =
                submenuSynchronization.ModuleId;

            existing.ModuleCode =
                submenuSynchronization.ModuleCode;

            existing.ModuleName =
                submenuSynchronization.ModuleName;


            existing.MenuId =
                submenuSynchronization.MenuId;

            existing.MenuCode =
                submenuSynchronization.MenuCode;

            existing.MenuName =
                submenuSynchronization.MenuName;


            existing.SubmenuId =
                submenuSynchronization.SubmenuId;

            existing.SubmenuCode =
                submenuSynchronization.SubmenuCode;

            existing.SubmenuName =
                submenuSynchronization.SubmenuName;


            existing.Remarks =
                submenuSynchronization.Remarks;


            await _context.SaveChangesAsync();


            return existing.Id;
        }


        //=======================================================
        // Create Code Synchronization
        //=======================================================

        var synchronization =
            new CodeSynchronizationEntity
            {
                //===================================================
                // Submenu Synchronization Reference
                //===================================================

                SubmenuSynchronizationId =
                    submenuSynchronization.Id,


                //===================================================
                // Navigation
                //===================================================

                ModuleId =
                    submenuSynchronization.ModuleId,

                ModuleCode =
                    submenuSynchronization.ModuleCode,

                ModuleName =
                    submenuSynchronization.ModuleName,


                MenuId =
                    submenuSynchronization.MenuId,

                MenuCode =
                    submenuSynchronization.MenuCode,

                MenuName =
                    submenuSynchronization.MenuName,


                SubmenuId =
                    submenuSynchronization.SubmenuId,

                SubmenuCode =
                    submenuSynchronization.SubmenuCode,

                SubmenuName =
                    submenuSynchronization.SubmenuName,


                //===================================================
                // Synchronization Type
                //===================================================

                SynchronizationType =
                    synchronizationType,


                //===================================================
                // Code Synchronization Status
                //===================================================

                Status =
                    "Ready",


                //===================================================
                // Configuration
                //===================================================

                Remarks =
                    submenuSynchronization.Remarks,


                //===================================================
                // Synchronization Result
                //===================================================

                LastSynchronizedBy =
                    null,

                LastSynchronizedDate =
                    null,

                LastSynchronizationResult =
                    string.Empty,


                //===================================================
                // Audit
                //===================================================

                IsActive =
                    true,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };


        _context.CodeSynchronizations.Add
        (
            synchronization
        );


        await _context.SaveChangesAsync();


        //=======================================================
        // Activity History
        //=======================================================

        _context.ActivityHistories.Add
        (
            new ActivityHistory
            {
                Module =
                    "Infrastructure Control",

                EntityName =
                    "Code Synchronization",

                EntityId =
                    synchronization.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Code Synchronization Created",

                ActivityDescription =
                    $"Code synchronization record created for '{synchronization.SubmenuName}'.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return synchronization.Id;
    }



    //===========================================================
    // Get History
    //===========================================================

    public async Task<List<CodeSynchronizationDto>>
        GetHistoryAsync()
    {
        return await _context.CodeSynchronizations

            .Where
            (
                x =>

                    !x.IsDeleted
            )

            .OrderByDescending
            (
                x =>
                    x.CreatedDate
            )

            .Select
            (
                x =>
                    new CodeSynchronizationDto
                    {
                        Id =
                            x.Id,

                        SubmenuSynchronizationId =
                            x.SubmenuSynchronizationId,

                        ModuleId =
                            x.ModuleId,

                        ModuleCode =
                            x.ModuleCode,

                        ModuleName =
                            x.ModuleName,

                        MenuId =
                            x.MenuId,

                        MenuCode =
                            x.MenuCode,

                        MenuName =
                            x.MenuName,

                        SubmenuId =
                            x.SubmenuId,

                        SubmenuCode =
                            x.SubmenuCode,

                        SubmenuName =
                            x.SubmenuName,

                        SynchronizationType =
                            _context.SubmenuSynchronizations

                                .Where
                                (
                                    submenu =>

                                        submenu.Id ==
                                        x.SubmenuSynchronizationId
                                )

                                .Select
                                (
                                    submenu =>
                                        submenu.SynchronizationType
                                )

                                .FirstOrDefault(),

                        Status =
                            x.Status,

                        Remarks =
                            x.Remarks,

                        LastSynchronizedBy =
                            x.LastSynchronizedBy,

                        LastSynchronizedDate =
                            x.LastSynchronizedDate,

                        LastSynchronizationResult =
                            x.LastSynchronizationResult,

                        IsActive =
                            x.IsActive,

                        CreatedDate =
                            x.CreatedDate
                    }
            )

            .ToListAsync();
    }

}