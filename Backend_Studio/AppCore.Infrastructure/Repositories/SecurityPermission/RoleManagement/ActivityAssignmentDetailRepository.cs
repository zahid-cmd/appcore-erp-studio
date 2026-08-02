//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Domain.Entities.SecurityPermission.RoleManagement;

using AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;
using AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.Interfaces;

using AppCore.Infrastructure.Persistence;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.SecurityPermission.RoleManagement;

//===============================================================
// Repository
//===============================================================

public class ActivityAssignmentDetailRepository
    : IActivityAssignmentDetailRepository
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;

    //===========================================================
    // Constructor
    //===========================================================

    public ActivityAssignmentDetailRepository(
        AppDbContext context)
    {
        _context = context;
    }

    //===========================================================
    // Get By Activity Assignment Id
    //===========================================================

    public async Task<List<ActivityAssignmentDetailDto>>
        GetByActivityAssignmentIdAsync(
            long activityAssignmentId)
    {
        var details =

            await _context.ActivityAssignmentDetails

                .AsNoTracking()

                .Where(x =>

                    x.ActivityAssignmentId ==
                    activityAssignmentId

                    &&

                    !x.IsDeleted)

                .Select(x =>

                    new ActivityAssignmentDetailDto
                    {
                        ActivityAssignmentDetailId =
                            x.ActivityAssignmentDetailId,

                        ActivityAssignmentId =
                            x.ActivityAssignmentId,

                        ModuleId =
                            x.ModuleId,

                        MenuId =
                            x.MenuId,

                        SubMenuId =
                            x.SubMenuId,

                        IsActive =
                            x.IsActive
                    })

                .ToListAsync();

        foreach (var detail in details)
        {
            detail.ActivityAssignmentPermissions =

                await _context.ActivityAssignmentPermissions

                    .AsNoTracking()

                    .Where(x =>

                        x.ActivityAssignmentDetailId ==
                        detail.ActivityAssignmentDetailId

                        &&

                        !x.IsDeleted)

                    .Select(x =>

                        new ActivityAssignmentPermissionDto
                        {
                            ActivityAssignmentPermissionId =
                                x.ActivityAssignmentPermissionId,

                            ActivityAssignmentDetailId =
                                x.ActivityAssignmentDetailId,

                            MasterActivityId =
                                x.MasterActivityId,

                            NavigationActivityId =
                                x.NavigationActivityId
                        })

                    .ToListAsync();
        }

        return details;
    }

    //===========================================================
    // Create
    //===========================================================

    public async Task CreateAsync(
        ActivityAssignmentDetail entity)
    {
        _context.ActivityAssignmentDetails.Add(
            entity);

        await _context.SaveChangesAsync();
    }

    //===========================================================
    // Create Range
    //===========================================================

    public async Task CreateRangeAsync(
        List<ActivityAssignmentDetail> entities)
    {
        _context.ActivityAssignmentDetails.AddRange(
            entities);

        await _context.SaveChangesAsync();
    }

    //===========================================================
    // Update
    //===========================================================

    public async Task UpdateAsync(
        ActivityAssignmentDetail entity)
    {
        _context.ActivityAssignmentDetails.Update(
            entity);

        await _context.SaveChangesAsync();
    }

    //===========================================================
    // Delete
    //===========================================================

    public async Task DeleteAsync(
        long activityAssignmentDetailId)
    {
        var entity =

            await _context.ActivityAssignmentDetails

                .FirstOrDefaultAsync(x =>

                    x.ActivityAssignmentDetailId ==
                    activityAssignmentDetailId

                    &&

                    !x.IsDeleted);

        if (entity == null)
        {
            return;
        }

        entity.IsDeleted =
            true;

        entity.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    //===========================================================
    // Delete By Activity Assignment Id
    //===========================================================

    public async Task DeleteByActivityAssignmentIdAsync(
        long activityAssignmentId)
    {
        var entities =

            await _context.ActivityAssignmentDetails

                .Where(x =>

                    x.ActivityAssignmentId ==
                    activityAssignmentId

                    &&

                    !x.IsDeleted)

                .ToListAsync();

        foreach (var entity in entities)
        {
            entity.IsDeleted =
                true;

            entity.DeletedDate =
                DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }
}