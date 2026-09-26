//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Domain.Common;
using AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration;
using AppCore.Domain.Entities.InfrastructureControl.DashboardComponents;

using AppCore.Application.InfrastructureControl.ApplicationConfiguration;
using AppCore.Application.InfrastructureControl.ApplicationConfiguration.WidgetConfiguration.DTOs;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// Widget Configuration Repository
//===============================================================

public class WidgetConfigurationRepository
    : IWidgetConfigurationRepository
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public WidgetConfigurationRepository
    (
        AppDbContext context
    )
    {
        _context =
            context;
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public Task<WidgetConfigurationDefaultsDto>
        GetDefaultsAsync()
    {
        return Task.FromResult(

            new WidgetConfigurationDefaultsDto
            {
                DashboardId =
                    0
            });
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<WidgetConfigurationDto>>
        GetAllAsync()
    {
        var configurations =

            await
            (
                from configuration
                in _context.Set<WidgetConfiguration>()

                join dashboard
                in _context.Set<Dashboards>()

                on configuration.DashboardId
                equals dashboard.Id

                where

                    !configuration.IsDeleted

                orderby
                    dashboard.Code

                select new
                {
                    Configuration =
                        configuration,

                    DashboardCode =
                        dashboard.Code,

                    DashboardName =
                        dashboard.Name
                }
            )

            .AsNoTracking()

            .ToListAsync();


        var result =
            new List<WidgetConfigurationDto>();


        foreach
        (
            var item
            in configurations
        )
        {
            //=======================================================
            // Widget Count
            //=======================================================

            var widgetCount =

                await _context
                    .Set<WidgetConfigurationDetail>()

                    .CountAsync
                    (
                        x =>

                            x.WidgetConfigurationId ==
                            item.Configuration.WidgetConfigurationId

                            &&

                            !x.IsDeleted
                    );


            //=======================================================
            // Result
            //=======================================================

            result.Add(

                new WidgetConfigurationDto
                {
                    WidgetConfigurationId =
                        item.Configuration.WidgetConfigurationId,

                    DashboardId =
                        item.Configuration.DashboardId,

                    DashboardCode =
                        item.DashboardCode,

                    DashboardName =
                        item.DashboardName,

                    WidgetCount =
                        widgetCount,

                    IsActive =
                        item.Configuration.IsActive,

                    Details =
                        await LoadDetailsAsync
                        (
                            item.Configuration.WidgetConfigurationId
                        )
                });
        }


        return result;
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<WidgetConfigurationDto?>
        GetByIdAsync
        (
            long widgetConfigurationId
        )
    {
        var configuration =

            await
            (
                from widgetConfiguration
                in _context.Set<WidgetConfiguration>()

                join dashboard
                in _context.Set<Dashboards>()

                on widgetConfiguration.DashboardId
                equals dashboard.Id

                where

                    widgetConfiguration.WidgetConfigurationId ==
                    widgetConfigurationId

                    &&

                    !widgetConfiguration.IsDeleted

                select new WidgetConfigurationDto
                {
                    WidgetConfigurationId =
                        widgetConfiguration.WidgetConfigurationId,

                    DashboardId =
                        widgetConfiguration.DashboardId,

                    DashboardCode =
                        dashboard.Code,

                    DashboardName =
                        dashboard.Name,

                    IsActive =
                        widgetConfiguration.IsActive
                }
            )

            .AsNoTracking()

            .FirstOrDefaultAsync();


        if
        (
            configuration ==
            null
        )
        {
            return null;
        }


        //=======================================================
        // Details
        //=======================================================

        configuration.Details =
            await LoadDetailsAsync
            (
                configuration.WidgetConfigurationId
            );


        //=======================================================
        // Widget Count
        //=======================================================

        configuration.WidgetCount =
            configuration.Details.Count;


        return configuration;
    }


    //===========================================================
    // Get By Dashboard Id
    //===========================================================

    public async Task<WidgetConfigurationDto?>
        GetByDashboardIdAsync
        (
            long dashboardId
        )
    {
        var configuration =

            await
            (
                from widgetConfiguration
                in _context.Set<WidgetConfiguration>()

                join dashboard
                in _context.Set<Dashboards>()

                on widgetConfiguration.DashboardId
                equals dashboard.Id

                where

                    widgetConfiguration.DashboardId ==
                    dashboardId

                    &&

                    !widgetConfiguration.IsDeleted

                select new WidgetConfigurationDto
                {
                    WidgetConfigurationId =
                        widgetConfiguration.WidgetConfigurationId,

                    DashboardId =
                        widgetConfiguration.DashboardId,

                    DashboardCode =
                        dashboard.Code,

                    DashboardName =
                        dashboard.Name,

                    IsActive =
                        widgetConfiguration.IsActive
                }
            )

            .AsNoTracking()

            .FirstOrDefaultAsync();


        if
        (
            configuration ==
            null
        )
        {
            return null;
        }


        //=======================================================
        // Details
        //=======================================================

        configuration.Details =
            await LoadDetailsAsync
            (
                configuration.WidgetConfigurationId
            );


        //=======================================================
        // Widget Count
        //=======================================================

        configuration.WidgetCount =
            configuration.Details.Count;


        return configuration;
    }


    //===========================================================
    // Exists By Dashboard Id
    //===========================================================

    public async Task<bool>
        ExistsByDashboardIdAsync
        (
            long dashboardId
        )
    {
        return await _context
            .Set<WidgetConfiguration>()

            .AsNoTracking()

            .AnyAsync
            (
                x =>

                    x.DashboardId ==
                    dashboardId

                    &&

                    !x.IsDeleted
            );
    }


    //===========================================================
    // Load Details
    //===========================================================

    private async Task<List<WidgetConfigurationDetailDto>>
        LoadDetailsAsync
        (
            long widgetConfigurationId
        )
    {
        var configuration =

            await _context
                .Set<WidgetConfiguration>()

                .AsNoTracking()

                .Where
                (
                    x =>

                        x.WidgetConfigurationId ==
                        widgetConfigurationId

                        &&

                        !x.IsDeleted
                )

                .Select
                (
                    x =>
                        new
                        {
                            x.DashboardId
                        }
                )

                .FirstOrDefaultAsync();


        if
        (
            configuration ==
            null
        )
        {
            return new List<WidgetConfigurationDetailDto>();
        }


        var dashboardType =

            await _context
                .Set<Dashboards>()

                .AsNoTracking()

                .Where
                (
                    x =>
                        x.Id ==
                        configuration.DashboardId
                )

                .Select
                (
                    x =>
                        x.DashboardType
                )

                .FirstOrDefaultAsync();


        var details =

            await _context
                .Set<WidgetConfigurationDetail>()

                .AsNoTracking()

                .Where
                (
                    x =>

                        x.WidgetConfigurationId ==
                        widgetConfigurationId

                        &&

                        !x.IsDeleted
                )

                //===================================================
                // Display Order
                //===================================================

                .OrderBy
                (
                    x =>
                        x.DisplayOrder
                )

                .ThenBy
                (
                    x =>
                        x.WidgetConfigurationDetailId
                )

                .ToListAsync();


        if
        (
            dashboardType?
                .Trim()
                .ToLower()
            ==
            "role-based"
        )
        {
            var widgetIds =

                details
                    .Select(
                        x => x.WidgetId
                    )
                    .ToList();


            var widgets =

                await _context
                    .Set<RoleBasedDBComponents>()

                    .AsNoTracking()

                    .Where
                    (
                        x =>
                            widgetIds.Contains(
                                x.Id
                            )
                            &&
                            !x.IsDeleted
                    )

                    .Select
                    (
                        x =>
                            new
                            {
                                x.Id,
                                x.Code,
                                x.Name
                            }
                    )

                    .ToListAsync();


            return details

                .Select
                (
                    detail =>
                    {
                        var widget =

                            widgets.FirstOrDefault
                            (
                                x =>
                                    x.Id ==
                                    detail.WidgetId
                            );

                        return new WidgetConfigurationDetailDto
                        {
                            WidgetConfigurationDetailId =
                                detail.WidgetConfigurationDetailId,

                            WidgetConfigurationId =
                                detail.WidgetConfigurationId,

                            WidgetId =
                                detail.WidgetId,

                            WidgetCode =
                                widget?.Code ??
                                string.Empty,

                            WidgetName =
                                widget?.Name ??
                                string.Empty,

                            //================================================
                            // Layout
                            //================================================

                            ColumnSpan =
                                detail.ColumnSpan,

                            DisplayOrder =
                                detail.DisplayOrder,

                            IsActive =
                                detail.IsActive
                        };
                    }
                )

                .ToList();
        }


        var defaultWidgetIds =

            details
                .Select(
                    x => x.WidgetId
                )
                .ToList();


        var defaultWidgets =

            await _context
                .Set<DefaultDBComponents>()

                .AsNoTracking()

                .Where
                (
                    x =>
                        defaultWidgetIds.Contains(
                            x.Id
                        )
                        &&
                        !x.IsDeleted
                )

                .Select
                (
                    x =>
                        new
                        {
                            x.Id,
                            x.Code,
                            x.Name
                        }
                )

                .ToListAsync();


        return details

            .Select
            (
                detail =>
                {
                    var widget =

                        defaultWidgets.FirstOrDefault
                        (
                            x =>
                                x.Id ==
                                detail.WidgetId
                        );

                    return new WidgetConfigurationDetailDto
                    {
                        WidgetConfigurationDetailId =
                            detail.WidgetConfigurationDetailId,

                        WidgetConfigurationId =
                            detail.WidgetConfigurationId,

                        WidgetId =
                            detail.WidgetId,

                        WidgetCode =
                            widget?.Code ??
                            string.Empty,

                        WidgetName =
                            widget?.Name ??
                            string.Empty,

                        //================================================
                        // Layout
                        //================================================

                        ColumnSpan =
                            detail.ColumnSpan,

                        DisplayOrder =
                            detail.DisplayOrder,

                        IsActive =
                            detail.IsActive
                    };
                }
            )

            .ToList();
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateWidgetConfigurationDto dto
        )
    {
        const long systemUserId =
            1;


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            dto.DashboardId <= 0
        )
        {
            throw new InvalidOperationException(
                "Dashboard is required."
            );
        }


        if
        (
            dto.Details == null ||
            dto.Details.Count == 0
        )
        {
            throw new InvalidOperationException(
                "At least one Widget assignment is required."
            );
        }


        //=======================================================
        // Duplicate Detail Validation
        //=======================================================

        var duplicateDetails =

            dto.Details
                .GroupBy
                (
                    x =>
                        x.WidgetId
                )
                .Any
                (
                    x =>
                        x.Count() > 1
                );


        if
        (
            duplicateDetails
        )
        {
            throw new InvalidOperationException(
                "Duplicate Widget assignment detected."
            );
        }


        //=======================================================
        // Duplicate Display Order Validation
        //=======================================================

        var duplicateOrders =

            dto.Details
                .GroupBy
                (
                    x =>
                        x.DisplayOrder
                )
                .Any
                (
                    x =>
                        x.Count() > 1
                );


        if
        (
            duplicateOrders
        )
        {
            throw new InvalidOperationException(
                "Duplicate Widget display order detected."
            );
        }


        //=======================================================
        // Layout Validation
        //=======================================================

        foreach
        (
            var detail
            in dto.Details
        )
        {
            if
            (
                detail.ColumnSpan != 3
                &&
                detail.ColumnSpan != 4
                &&
                detail.ColumnSpan != 6
                &&
                detail.ColumnSpan != 8
                &&
                detail.ColumnSpan != 12
            )
            {
                throw new InvalidOperationException(
                    "Invalid Widget width detected."
                );
            }


            if
            (
                detail.DisplayOrder <= 0
            )
            {
                throw new InvalidOperationException(
                    "Invalid Widget display order detected."
                );
            }
        }


        //=======================================================
        // Widget Id Validation
        //=======================================================

        if
        (
            dto.Details.Any
            (
                x =>
                    x.WidgetId <= 0
            )
        )
        {
            throw new InvalidOperationException(
                "Invalid Widget detected."
            );
        }


        //=======================================================
        // Dashboard Validation
        //=======================================================

        var dashboard =

            await _context
                .Set<Dashboards>()

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        dto.DashboardId

                        &&

                        !x.IsDeleted
                );


        if
        (
            dashboard ==
            null
        )
        {
            throw new InvalidOperationException(
                "Selected Dashboard was not found."
            );
        }


        //=======================================================
        // Existing Configuration Validation
        //=======================================================

        var existingConfiguration =

            await _context
                .Set<WidgetConfiguration>()

                .AnyAsync
                (
                    x =>

                        x.DashboardId ==
                        dto.DashboardId

                        &&

                        !x.IsDeleted
                );


        if
        (
            existingConfiguration
        )
        {
            throw new InvalidOperationException(
                $"A widget configuration already exists for Dashboard Id '{dto.DashboardId}'."
            );
        }


        //=======================================================
        // Widget Validation
        //=======================================================

        var widgetIds =

            dto.Details
                .Select
                (
                    x =>
                        x.WidgetId
                )
                .ToList();


        int validWidgetCount;


        if
        (
            dashboard.DashboardType?
                .Trim()
                .ToLower()
            ==
            "role-based"
        )
        {
            validWidgetCount =

                await _context
                    .Set<RoleBasedDBComponents>()

                    .CountAsync
                    (
                        x =>

                            widgetIds.Contains(
                                x.Id
                            )

                            &&

                            !x.IsDeleted
                    );
        }
        else
        {
            validWidgetCount =

                await _context
                    .Set<DefaultDBComponents>()

                    .CountAsync
                    (
                        x =>

                            widgetIds.Contains(
                                x.Id
                            )

                            &&

                            !x.IsDeleted
                    );
        }


        if
        (
            validWidgetCount !=
            widgetIds.Count
        )
        {
            throw new InvalidOperationException(
                "One or more selected Widgets were not found."
            );
        }


        //=======================================================
        // Transaction
        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();


        try
        {
            //===================================================
            // Header
            //===================================================

            var entity =
                new WidgetConfiguration
                {
                    DashboardId =
                        dto.DashboardId,

                    IsActive =
                        dto.IsActive,

                    IsDeleted =
                        false,

                    CreatedBy =
                        systemUserId,

                    CreatedDate =
                        DateTime.UtcNow,

                    ModifiedBy =
                        null,

                    ModifiedDate =
                        null,

                    DeletedBy =
                        null,

                    DeletedDate =
                        null
                };


            //===================================================
            // Details
            //===================================================

            foreach
            (
                var detailDto
                in dto.Details
            )
            {
                var detail =
                    new WidgetConfigurationDetail
                    {
                        WidgetId =
                            detailDto.WidgetId,

                        //===========================================
                        // Layout
                        //===========================================

                        ColumnSpan =
                            detailDto.ColumnSpan,

                        DisplayOrder =
                            detailDto.DisplayOrder,

                        //===========================================
                        // Status
                        //===========================================

                        IsActive =
                            detailDto.IsActive,

                        IsDeleted =
                            false,

                        //===========================================
                        // Audit
                        //===========================================

                        CreatedBy =
                            systemUserId,

                        CreatedDate =
                            DateTime.UtcNow,

                        ModifiedBy =
                            null,

                        ModifiedDate =
                            null,

                        DeletedBy =
                            null,

                        DeletedDate =
                            null
                    };


                entity.Details.Add(
                    detail
                );
            }


            //===================================================
            // Add Complete Graph
            //===================================================

            _context
                .Set<WidgetConfiguration>()
                .Add(
                    entity
                );


            //===================================================
            // Save Complete Graph
            //===================================================

            await _context.SaveChangesAsync();


            //===================================================
            // Activity History
            //===================================================

            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "Infrastructure Control",

                    EntityName =
                        "Widget Configuration",

                    EntityId =
                        entity.WidgetConfigurationId,

                    ActivityType =
                        "Create",

                    ActivityTitle =
                        "Widget Configuration Created",

                    ActivityDescription =
                        $"Widget Configuration created for Dashboard Id '{entity.DashboardId}'.",

                    PerformedBy =
                        systemUserId,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                }
            );


            await _context.SaveChangesAsync();


            //===================================================
            // Commit
            //===================================================

            await transaction.CommitAsync();


            return entity.WidgetConfigurationId;
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task<bool>
        UpdateAsync
        (
            UpdateWidgetConfigurationDto dto
        )
    {
        const long systemUserId =
            1;


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            dto.WidgetConfigurationId <= 0
        )
        {
            throw new InvalidOperationException(
                "Widget Configuration Id is required."
            );
        }


        if
        (
            dto.DashboardId <= 0
        )
        {
            throw new InvalidOperationException(
                "Dashboard is required."
            );
        }


        if
        (
            dto.Details == null ||
            dto.Details.Count == 0
        )
        {
            throw new InvalidOperationException(
                "At least one Widget assignment is required."
            );
        }


        //=======================================================
        // Duplicate Detail Validation
        //=======================================================

        var duplicateDetails =

            dto.Details
                .GroupBy
                (
                    x =>
                        x.WidgetId
                )
                .Any
                (
                    x =>
                        x.Count() > 1
                );


        if
        (
            duplicateDetails
        )
        {
            throw new InvalidOperationException(
                "Duplicate Widget assignment detected."
            );
        }


        //=======================================================
        // Duplicate Display Order Validation
        //=======================================================

        var duplicateOrders =

            dto.Details
                .GroupBy
                (
                    x =>
                        x.DisplayOrder
                )
                .Any
                (
                    x =>
                        x.Count() > 1
                );


        if
        (
            duplicateOrders
        )
        {
            throw new InvalidOperationException(
                "Duplicate Widget display order detected."
            );
        }


        //=======================================================
        // Layout Validation
        //=======================================================

        foreach
        (
            var detail
            in dto.Details
        )
        {
            if
            (
                detail.ColumnSpan != 3
                &&
                detail.ColumnSpan != 4
                &&
                detail.ColumnSpan != 6
                &&
                detail.ColumnSpan != 8
                &&
                detail.ColumnSpan != 12
            )
            {
                throw new InvalidOperationException(
                    "Invalid Widget width detected."
                );
            }


            if
            (
                detail.DisplayOrder <= 0
            )
            {
                throw new InvalidOperationException(
                    "Invalid Widget display order detected."
                );
            }
        }


        //=======================================================
        // Widget Id Validation
        //=======================================================

        if
        (
            dto.Details.Any
            (
                x =>
                    x.WidgetId <= 0
            )
        )
        {
            throw new InvalidOperationException(
                "Invalid Widget detected."
            );
        }


        //=======================================================
        // Dashboard Validation
        //=======================================================

        var dashboard =

            await _context
                .Set<Dashboards>()

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.Id ==
                        dto.DashboardId

                        &&

                        !x.IsDeleted
                );


        if
        (
            dashboard ==
            null
        )
        {
            throw new InvalidOperationException(
                "Selected Dashboard was not found."
            );
        }


        //=======================================================
        // Duplicate Dashboard Validation
        //=======================================================

        var duplicateDashboard =

            await _context
                .Set<WidgetConfiguration>()

                .AnyAsync
                (
                    x =>

                        x.DashboardId ==
                        dto.DashboardId

                        &&

                        x.WidgetConfigurationId !=
                        dto.WidgetConfigurationId

                        &&

                        !x.IsDeleted
                );


        if
        (
            duplicateDashboard
        )
        {
            throw new InvalidOperationException(
                $"A widget configuration already exists for Dashboard Id '{dto.DashboardId}'."
            );
        }


        //=======================================================
        // Widget Validation
        //=======================================================

        var widgetIds =

            dto.Details
                .Select
                (
                    x =>
                        x.WidgetId
                )
                .ToList();


        int validWidgetCount;


        if
        (
            dashboard.DashboardType?
                .Trim()
                .ToLower()
            ==
            "role-based"
        )
        {
            validWidgetCount =

                await _context
                    .Set<RoleBasedDBComponents>()

                    .CountAsync
                    (
                        x =>

                            widgetIds.Contains(
                                x.Id
                            )

                            &&

                            !x.IsDeleted
                    );
        }
        else
        {
            validWidgetCount =

                await _context
                    .Set<DefaultDBComponents>()

                    .CountAsync
                    (
                        x =>

                            widgetIds.Contains(
                                x.Id
                            )

                            &&

                            !x.IsDeleted
                    );
        }


        if
        (
            validWidgetCount !=
            widgetIds.Count
        )
        {
            throw new InvalidOperationException(
                "One or more selected Widgets were not found."
            );
        }


        //=======================================================
        // Transaction
        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();


        try
        {
            //===================================================
            // Load Header
            //===================================================

            var entity =

                await _context
                    .Set<WidgetConfiguration>()

                    .FirstOrDefaultAsync
                    (
                        x =>

                            x.WidgetConfigurationId ==
                            dto.WidgetConfigurationId

                            &&

                            !x.IsDeleted
                    );


            if
            (
                entity ==
                null
            )
            {
                await transaction.RollbackAsync();

                return false;
            }


            //===================================================
            // Update Header
            //===================================================

            entity.DashboardId =
                dto.DashboardId;

            entity.IsActive =
                dto.IsActive;

            entity.ModifiedBy =
                systemUserId;

            entity.ModifiedDate =
                DateTime.UtcNow;


            //===================================================
            // Existing Details
            //===================================================

            var existingDetails =

                await _context
                    .Set<WidgetConfigurationDetail>()

                    .Where
                    (
                        x =>

                            x.WidgetConfigurationId ==
                            entity.WidgetConfigurationId
                    )

                    .ToListAsync();


            //===================================================
            // Remove Existing Details
            //===================================================

            if
            (
                existingDetails.Any()
            )
            {
                _context
                    .Set<WidgetConfigurationDetail>()
                    .RemoveRange(
                        existingDetails
                    );
            }


            await _context.SaveChangesAsync();


            //===================================================
            // Insert New Details
            //===================================================

            foreach
            (
                var detailDto
                in dto.Details
            )
            {
                var detail =
                    new WidgetConfigurationDetail
                    {
                        WidgetConfigurationId =
                            entity.WidgetConfigurationId,

                        WidgetId =
                            detailDto.WidgetId,

                        //===========================================
                        // Layout
                        //===========================================

                        ColumnSpan =
                            detailDto.ColumnSpan,

                        DisplayOrder =
                            detailDto.DisplayOrder,

                        //===========================================
                        // Status
                        //===========================================

                        IsActive =
                            detailDto.IsActive,

                        IsDeleted =
                            false,

                        //===========================================
                        // Audit
                        //===========================================

                        CreatedBy =
                            systemUserId,

                        CreatedDate =
                            DateTime.UtcNow,

                        ModifiedBy =
                            null,

                        ModifiedDate =
                            null,

                        DeletedBy =
                            null,

                        DeletedDate =
                            null
                    };


                _context
                    .Set<WidgetConfigurationDetail>()
                    .Add(
                        detail
                    );
            }


            //===================================================
            // Save
            //===================================================

            await _context.SaveChangesAsync();


            //===================================================
            // Activity History
            //===================================================

            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "Infrastructure Control",

                    EntityName =
                        "Widget Configuration",

                    EntityId =
                        entity.WidgetConfigurationId,

                    ActivityType =
                        "Update",

                    ActivityTitle =
                        "Widget Configuration Updated",

                    ActivityDescription =
                        $"Widget Configuration updated for Dashboard Id '{entity.DashboardId}'.",

                    PerformedBy =
                        systemUserId,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                }
            );


            await _context.SaveChangesAsync();


            //===================================================
            // Commit
            //===================================================

            await transaction.CommitAsync();


            return true;
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Delete
    //===========================================================

    public async Task<bool>
        DeleteAsync
        (
            long widgetConfigurationId
        )
    {
        const long systemUserId =
            1;


        await using var transaction =
            await _context.Database.BeginTransactionAsync();


        try
        {
            var entity =

                await _context
                    .Set<WidgetConfiguration>()

                    .FirstOrDefaultAsync
                    (
                        x =>

                            x.WidgetConfigurationId ==
                            widgetConfigurationId

                            &&

                            !x.IsDeleted
                    );


            if
            (
                entity ==
                null
            )
            {
                await transaction.RollbackAsync();

                return false;
            }


            //===================================================
            // Header
            //===================================================

            entity.IsDeleted =
                true;

            entity.DeletedBy =
                systemUserId;

            entity.DeletedDate =
                DateTime.UtcNow;

            entity.ModifiedBy =
                systemUserId;

            entity.ModifiedDate =
                DateTime.UtcNow;


            //===================================================
            // Details
            //===================================================

            var details =

                await _context
                    .Set<WidgetConfigurationDetail>()

                    .Where
                    (
                        x =>

                            x.WidgetConfigurationId ==
                            widgetConfigurationId

                            &&

                            !x.IsDeleted
                    )

                    .ToListAsync();


            foreach
            (
                var detail
                in details
            )
            {
                detail.IsDeleted =
                    true;

                detail.DeletedBy =
                    systemUserId;

                detail.DeletedDate =
                    DateTime.UtcNow;

                detail.ModifiedBy =
                    systemUserId;

                detail.ModifiedDate =
                    DateTime.UtcNow;
            }


            //===================================================
            // Activity History
            //===================================================

            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "Infrastructure Control",

                    EntityName =
                        "Widget Configuration",

                    EntityId =
                        entity.WidgetConfigurationId,

                    ActivityType =
                        "Delete",

                    ActivityTitle =
                        "Widget Configuration Deleted",

                    ActivityDescription =
                        $"Widget Configuration deleted for Dashboard Id '{entity.DashboardId}'.",

                    PerformedBy =
                        systemUserId,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                }
            );


            await _context.SaveChangesAsync();


            //===================================================
            // Commit
            //===================================================

            await transaction.CommitAsync();


            return true;
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Restore Last Deleted
    //===========================================================

    public async Task<bool>
        RestoreLastDeletedAsync()
    {
        const long systemUserId =
            1;


        await using var transaction =
            await _context.Database.BeginTransactionAsync();


        try
        {
            var entity =

                await _context
                    .Set<WidgetConfiguration>()

                    .Where
                    (
                        x =>
                            x.IsDeleted
                    )

                    .OrderByDescending
                    (
                        x =>
                            x.DeletedDate
                    )

                    .FirstOrDefaultAsync();


            if
            (
                entity ==
                null
            )
            {
                await transaction.RollbackAsync();

                return false;
            }


            //===================================================
            // Header
            //===================================================

            entity.IsDeleted =
                false;

            entity.DeletedBy =
                null;

            entity.DeletedDate =
                null;

            entity.IsActive =
                true;

            entity.ModifiedBy =
                systemUserId;

            entity.ModifiedDate =
                DateTime.UtcNow;


            //===================================================
            // Details
            //===================================================

            var details =

                await _context
                    .Set<WidgetConfigurationDetail>()

                    .Where
                    (
                        x =>

                            x.WidgetConfigurationId ==
                            entity.WidgetConfigurationId

                            &&

                            x.IsDeleted
                    )

                    .ToListAsync();


            foreach
            (
                var detail
                in details
            )
            {
                detail.IsDeleted =
                    false;

                detail.DeletedBy =
                    null;

                detail.DeletedDate =
                    null;

                detail.IsActive =
                    true;

                detail.ModifiedBy =
                    systemUserId;

                detail.ModifiedDate =
                    DateTime.UtcNow;
            }


            //===================================================
            // Activity History
            //===================================================

            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "Infrastructure Control",

                    EntityName =
                        "Widget Configuration",

                    EntityId =
                        entity.WidgetConfigurationId,

                    ActivityType =
                        "Restore",

                    ActivityTitle =
                        "Widget Configuration Restored",

                    ActivityDescription =
                        $"Widget Configuration restored for Dashboard Id '{entity.DashboardId}'.",

                    PerformedBy =
                        systemUserId,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                }
            );


            await _context.SaveChangesAsync();


            //===================================================
            // Commit
            //===================================================

            await transaction.CommitAsync();


            return true;
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }
}