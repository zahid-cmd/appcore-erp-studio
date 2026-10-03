//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Domain.Common;
using AppCore.Domain.Entities.SecurityPermission.UserManagement;
using AppCore.Domain.Entities.Settings.GeneralSettings;

using AppCore.Application.SecurityPermission.UserManagement;
using AppCore.Application.SecurityPermission.UserManagement.BranchAssignment.DTOs;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SecurityPermission.UserManagement;


//===============================================================
// Branch Assignment Repository
//===============================================================

public class BranchAssignmentRepository
    : IBranchAssignmentRepository
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public BranchAssignmentRepository
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

    public Task<BranchAssignmentDefaultsDto>
        GetDefaultsAsync()
    {
        return Task.FromResult(

            new BranchAssignmentDefaultsDto
            {
                UserProfileId =
                    0
            });
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<BranchAssignmentDto>>
        GetAllAsync()
    {
        var assignments =

            await
            (
                from assignment
                in _context.Set<BranchAssignment>()

                join userProfile
                in _context.Set<UserProfile>()

                on assignment.UserProfileId
                equals userProfile.UserProfileId

                where

                    !assignment.IsDeleted

                orderby
                    userProfile.ProfileCode

                select new
                {
                    Assignment =
                        assignment,

                    UserProfileCode =
                        userProfile.ProfileCode,

                    UserProfileName =
                        userProfile.UserName
                }
            )

            .AsNoTracking()

            .ToListAsync();


        var result =
            new List<BranchAssignmentDto>();


        foreach
        (
            var item
            in assignments
        )
        {
            //=======================================================
            // Branch Count
            //=======================================================

            var branchCount =

                await _context
                    .Set<BranchAssignmentDetail>()

                    .CountAsync
                    (
                        x =>

                            x.BranchAssignmentId ==
                            item.Assignment.BranchAssignmentId

                            &&

                            !x.IsDeleted
                    );


            //=======================================================
            // Default Branch
            //=======================================================

            var defaultBranchName =

                await LoadDefaultBranchNameAsync
                (
                    item.Assignment.BranchAssignmentId
                );


            //=======================================================
            // Default Branch Fallback
            //=======================================================

            defaultBranchName =
                string.IsNullOrWhiteSpace(
                    defaultBranchName
                )
                    ?
                    "Not Assigned"
                    :
                    defaultBranchName;


            //=======================================================
            // Result
            //=======================================================

            result.Add(

                new BranchAssignmentDto
                {
                    BranchAssignmentId =
                        item.Assignment.BranchAssignmentId,

                    UserProfileId =
                        item.Assignment.UserProfileId,

                    UserProfileCode =
                        item.UserProfileCode,

                    UserProfileName =
                        item.UserProfileName,

                    BranchCount =
                        branchCount,

                    DefaultBranchName =
                        defaultBranchName,

                    IsActive =
                        item.Assignment.IsActive
                });
        }


        return result;
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<BranchAssignmentDto?>
        GetByIdAsync
        (
            long branchAssignmentId
        )
    {
        var assignment =

            await
            (
                from branchAssignment
                in _context.Set<BranchAssignment>()

                join userProfile
                in _context.Set<UserProfile>()

                on branchAssignment.UserProfileId
                equals userProfile.UserProfileId

                where

                    branchAssignment.BranchAssignmentId ==
                    branchAssignmentId

                    &&

                    !branchAssignment.IsDeleted

                select new BranchAssignmentDto
                {
                    BranchAssignmentId =
                        branchAssignment.BranchAssignmentId,

                    UserProfileId =
                        branchAssignment.UserProfileId,

                    UserProfileCode =
                        userProfile.ProfileCode,

                    UserProfileName =
                        userProfile.UserName,

                    IsActive =
                        branchAssignment.IsActive
                }
            )

            .AsNoTracking()

            .FirstOrDefaultAsync();


        if
        (
            assignment ==
            null
        )
        {
            return null;
        }


        //=======================================================
        // Details
        //=======================================================

        assignment.Details =
            await LoadDetailsAsync
            (
                assignment.BranchAssignmentId
            );


        //=======================================================
        // Branch Count
        //=======================================================

        assignment.BranchCount =
            assignment.Details.Count;


        //=======================================================
        // Default Branch
        //=======================================================

        assignment.DefaultBranchName =
            await LoadDefaultBranchNameAsync
            (
                assignment.BranchAssignmentId
            );


        return assignment;
    }


    //===========================================================
    // Get By User Profile Id
    //===========================================================

    public async Task<BranchAssignmentDto?>
        GetByUserProfileIdAsync
        (
            long userProfileId
        )
    {
        var assignment =

            await
            (
                from branchAssignment
                in _context.Set<BranchAssignment>()

                join userProfile
                in _context.Set<UserProfile>()

                on branchAssignment.UserProfileId
                equals userProfile.UserProfileId

                where

                    branchAssignment.UserProfileId ==
                    userProfileId

                    &&

                    !branchAssignment.IsDeleted

                select new BranchAssignmentDto
                {
                    BranchAssignmentId =
                        branchAssignment.BranchAssignmentId,

                    UserProfileId =
                        branchAssignment.UserProfileId,

                    UserProfileCode =
                        userProfile.ProfileCode,

                    UserProfileName =
                        userProfile.UserName,

                    IsActive =
                        branchAssignment.IsActive
                }
            )

            .AsNoTracking()

            .FirstOrDefaultAsync();


        if
        (
            assignment ==
            null
        )
        {
            return null;
        }


        //=======================================================
        // Details
        //=======================================================

        assignment.Details =
            await LoadDetailsAsync
            (
                assignment.BranchAssignmentId
            );


        //=======================================================
        // Branch Count
        //=======================================================

        assignment.BranchCount =
            assignment.Details.Count;


        //=======================================================
        // Default Branch
        //=======================================================

        assignment.DefaultBranchName =
            await LoadDefaultBranchNameAsync
            (
                assignment.BranchAssignmentId
            );


        return assignment;
    }


    //===========================================================
    // Exists By User Profile Id
    //===========================================================

    public async Task<bool>
        ExistsByUserProfileIdAsync
        (
            long userProfileId
        )
    {
        return await _context
            .Set<BranchAssignment>()

            .AsNoTracking()

            .AnyAsync
            (
                x =>

                    x.UserProfileId ==
                    userProfileId

                    &&

                    !x.IsDeleted
            );
    }


    //===========================================================
    // Load Default Branch Name
    //===========================================================

    private async Task<string>
        LoadDefaultBranchNameAsync
        (
            long branchAssignmentId
        )
    {
        var defaultBranchName =

            await
            (
                from detail
                in _context.Set<BranchAssignmentDetail>()

                join branch
                in _context.Set<Branches>()

                on detail.BranchId
                equals branch.BranchId

                where

                    detail.BranchAssignmentId ==
                    branchAssignmentId

                    &&

                    !detail.IsDeleted

                orderby
                    detail.BranchAssignmentDetailId

                select
                    branch.BranchName
            )

            .AsNoTracking()

            .FirstOrDefaultAsync();


        return

            string.IsNullOrWhiteSpace(
                defaultBranchName
            )

                ?

                "Not Assigned"

                :

                defaultBranchName;
    }


    //===========================================================
    // Load Details
    //===========================================================

    private async Task<List<BranchAssignmentDetailDto>>
        LoadDetailsAsync
        (
            long branchAssignmentId
        )
    {
        return await
        (
            from detail
            in _context.Set<BranchAssignmentDetail>()

            join branch
            in _context.Set<Branches>()

            on detail.BranchId
            equals branch.BranchId

            where

                detail.BranchAssignmentId ==
                branchAssignmentId

                &&

                !detail.IsDeleted

            orderby
                branch.BranchName

            select new BranchAssignmentDetailDto
            {
                BranchAssignmentDetailId =
                    detail.BranchAssignmentDetailId,

                BranchAssignmentId =
                    detail.BranchAssignmentId,

                BranchId =
                    detail.BranchId,

                BranchCode =
                    branch.BranchCode,

                BranchName =
                    branch.BranchName,

                IsActive =
                    detail.IsActive
            }
        )

        .AsNoTracking()

        .ToListAsync();
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateBranchAssignmentDto dto
        )
    {
        const long systemUserId =
            1;


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            dto.UserProfileId <= 0
        )
        {
            throw new InvalidOperationException(
                "User Profile is required."
            );
        }


        if
        (
            dto.Details == null ||
            dto.Details.Count == 0
        )
        {
            throw new InvalidOperationException(
                "At least one Branch assignment is required."
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
                        x.BranchId
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
                "Duplicate Branch assignment detected."
            );
        }


        //=======================================================
        // Branch Id Validation
        //=======================================================

        if
        (
            dto.Details.Any
            (
                x =>
                    x.BranchId <= 0
            )
        )
        {
            throw new InvalidOperationException(
                "Invalid Branch detected."
            );
        }


        //=======================================================
        // User Profile Validation
        //=======================================================

        var userProfileExists =

            await _context
                .Set<UserProfile>()

                .AnyAsync
                (
                    x =>

                        x.UserProfileId ==
                        dto.UserProfileId

                        &&

                        !x.IsDeleted
                );


        if
        (
            !userProfileExists
        )
        {
            throw new InvalidOperationException(
                "Selected User Profile was not found."
            );
        }


        //=======================================================
        // Existing Assignment Validation
        //=======================================================

        var existingAssignment =

            await _context
                .Set<BranchAssignment>()

                .AnyAsync
                (
                    x =>

                        x.UserProfileId ==
                        dto.UserProfileId

                        &&

                        !x.IsDeleted
                );


        if
        (
            existingAssignment
        )
        {
            throw new InvalidOperationException(
                $"A branch assignment already exists for User Profile Id '{dto.UserProfileId}'."
            );
        }


        //=======================================================
        // Branch Validation
        //=======================================================

        var branchIds =

            dto.Details
                .Select
                (
                    x =>
                        x.BranchId
                )
                .ToList();


        var validBranchCount =

            await _context
                .Set<Branches>()

                .CountAsync
                (
                    x =>

                        branchIds.Contains(
                            x.BranchId
                        )

                        &&

                        !x.IsDeleted
                );


        if
        (
            validBranchCount !=
            branchIds.Count
        )
        {
            throw new InvalidOperationException(
                "One or more selected Branches were not found."
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
                new BranchAssignment
                {
                    UserProfileId =
                        dto.UserProfileId,

                    IsActive =
                        true,

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
                    new BranchAssignmentDetail
                    {
                        BranchId =
                            detailDto.BranchId,

                        IsActive =
                            true,

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


                entity.Details.Add(
                    detail
                );
            }


            //===================================================
            // Add Complete Graph
            //===================================================

            _context
                .Set<BranchAssignment>()
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
                        "Security & Permission",

                    EntityName =
                        "Branch Assignment",

                    EntityId =
                        entity.BranchAssignmentId,

                    ActivityType =
                        "Create",

                    ActivityTitle =
                        "Branch Assignment Created",

                    ActivityDescription =
                        $"Branch Assignment created for User Profile Id '{entity.UserProfileId}'.",

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


            return entity.BranchAssignmentId;
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
            UpdateBranchAssignmentDto dto
        )
    {
        const long systemUserId =
            1;


        //=======================================================
        // Validation
        //=======================================================

        if
        (
            dto.BranchAssignmentId <= 0
        )
        {
            throw new InvalidOperationException(
                "Branch Assignment Id is required."
            );
        }


        if
        (
            dto.UserProfileId <= 0
        )
        {
            throw new InvalidOperationException(
                "User Profile is required."
            );
        }


        if
        (
            dto.Details == null ||
            dto.Details.Count == 0
        )
        {
            throw new InvalidOperationException(
                "At least one Branch assignment is required."
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
                        x.BranchId
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
                "Duplicate Branch assignment detected."
            );
        }


        //=======================================================
        // Branch Id Validation
        //=======================================================

        if
        (
            dto.Details.Any
            (
                x =>
                    x.BranchId <= 0
            )
        )
        {
            throw new InvalidOperationException(
                "Invalid Branch detected."
            );
        }


        //=======================================================
        // User Profile Validation
        //=======================================================

        var userProfileExists =

            await _context
                .Set<UserProfile>()

                .AnyAsync
                (
                    x =>

                        x.UserProfileId ==
                        dto.UserProfileId

                        &&

                        !x.IsDeleted
                );


        if
        (
            !userProfileExists
        )
        {
            throw new InvalidOperationException(
                "Selected User Profile was not found."
            );
        }


        //=======================================================
        // Duplicate User Profile Validation
        //=======================================================

        var duplicateUserProfile =

            await _context
                .Set<BranchAssignment>()

                .AnyAsync
                (
                    x =>

                        x.UserProfileId ==
                        dto.UserProfileId

                        &&

                        x.BranchAssignmentId !=
                        dto.BranchAssignmentId

                        &&

                        !x.IsDeleted
                );


        if
        (
            duplicateUserProfile
        )
        {
            throw new InvalidOperationException(
                $"A branch assignment already exists for User Profile Id '{dto.UserProfileId}'."
            );
        }


        //=======================================================
        // Branch Validation
        //=======================================================

        var branchIds =

            dto.Details
                .Select
                (
                    x =>
                        x.BranchId
                )
                .ToList();


        var validBranchCount =

            await _context
                .Set<Branches>()

                .CountAsync
                (
                    x =>

                        branchIds.Contains(
                            x.BranchId
                        )

                        &&

                        !x.IsDeleted
                );


        if
        (
            validBranchCount !=
            branchIds.Count
        )
        {
            throw new InvalidOperationException(
                "One or more selected Branches were not found."
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
                    .Set<BranchAssignment>()

                    .FirstOrDefaultAsync
                    (
                        x =>

                            x.BranchAssignmentId ==
                            dto.BranchAssignmentId

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

            entity.UserProfileId =
                dto.UserProfileId;

            entity.IsActive =
                true;

            entity.ModifiedBy =
                systemUserId;

            entity.ModifiedDate =
                DateTime.UtcNow;


            //===================================================
            // Existing Details
            //===================================================

            var existingDetails =

                await _context
                    .Set<BranchAssignmentDetail>()

                    .Where
                    (
                        x =>

                            x.BranchAssignmentId ==
                            entity.BranchAssignmentId
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
                    .Set<BranchAssignmentDetail>()
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
                    new BranchAssignmentDetail
                    {
                        BranchAssignmentId =
                            entity.BranchAssignmentId,

                        BranchId =
                            detailDto.BranchId,

                        IsActive =
                            true,

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


                _context
                    .Set<BranchAssignmentDetail>()
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
                        "Security & Permission",

                    EntityName =
                        "Branch Assignment",

                    EntityId =
                        entity.BranchAssignmentId,

                    ActivityType =
                        "Update",

                    ActivityTitle =
                        "Branch Assignment Updated",

                    ActivityDescription =
                        $"Branch Assignment updated for User Profile Id '{entity.UserProfileId}'.",

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
            long branchAssignmentId
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
                    .Set<BranchAssignment>()

                    .FirstOrDefaultAsync
                    (
                        x =>

                            x.BranchAssignmentId ==
                            branchAssignmentId

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
                    .Set<BranchAssignmentDetail>()

                    .Where
                    (
                        x =>

                            x.BranchAssignmentId ==
                            branchAssignmentId

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
                        "Security & Permission",

                    EntityName =
                        "Branch Assignment",

                    EntityId =
                        entity.BranchAssignmentId,

                    ActivityType =
                        "Delete",

                    ActivityTitle =
                        "Branch Assignment Deleted",

                    ActivityDescription =
                        $"Branch Assignment deleted for User Profile Id '{entity.UserProfileId}'.",

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
                    .Set<BranchAssignment>()

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
                    .Set<BranchAssignmentDetail>()

                    .Where
                    (
                        x =>

                            x.BranchAssignmentId ==
                            entity.BranchAssignmentId

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
                        "Security & Permission",

                    EntityName =
                        "Branch Assignment",

                    EntityId =
                        entity.BranchAssignmentId,

                    ActivityType =
                        "Restore",

                    ActivityTitle =
                        "Branch Assignment Restored",

                    ActivityDescription =
                        $"Branch Assignment restored for User Profile Id '{entity.UserProfileId}'.",

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