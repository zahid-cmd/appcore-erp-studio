//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Infrastructure.Persistence;

using global::AppCore.Application.Settings.GeneralSettings.Branch;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Settings.GeneralSettings;


//===============================================================
// BranchRepository
//===============================================================

public class BranchRepository
    : IBranchRepository
{

    //===========================================================
    // DbContext
    //===========================================================

    private readonly AppDbContext
        _context;


    //===========================================================
    // Constructor
    //===========================================================

    public BranchRepository
    (
        AppDbContext context
    )
    {
        _context =
            context;
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<IReadOnlyList<global::AppCore.Domain.Settings.GeneralSettings.Branch>>
        GetAllAsync()
    {
        return await _context
            .Set<global::AppCore.Domain.Settings.GeneralSettings.Branch>()
            .AsNoTracking()
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<global::AppCore.Domain.Settings.GeneralSettings.Branch?>
        GetByIdAsync
    (
        long id
    )
    {
        return await _context
            .Set<global::AppCore.Domain.Settings.GeneralSettings.Branch>()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == id
            );
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
    (
        global::AppCore.Domain.Settings.GeneralSettings.Branch entity
    )
    {
        await _context
            .Set<global::AppCore.Domain.Settings.GeneralSettings.Branch>()
            .AddAsync(
                entity
            );


        await _context.SaveChangesAsync();


        return entity.Id;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
    (
        global::AppCore.Domain.Settings.GeneralSettings.Branch entity
    )
    {
        _context
            .Set<global::AppCore.Domain.Settings.GeneralSettings.Branch>()
            .Update(
                entity
            );


        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete
    //===========================================================

    public async Task
        DeleteAsync
    (
        long id
    )
    {
        var entity =
            await _context
                .Set<global::AppCore.Domain.Settings.GeneralSettings.Branch>()
                .FirstOrDefaultAsync(
                    x => x.Id == id
                );


        if
        (
            entity is null
        )
        {
            return;
        }


        _context
            .Set<global::AppCore.Domain.Settings.GeneralSettings.Branch>()
            .Remove(
                entity
            );


        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore
    //===========================================================

    public async Task
        RestoreAsync()
    {
        throw new NotImplementedException();
    }


    //===========================================================
    // Get History
    //===========================================================

    public async Task
        <IReadOnlyList<object>>
        GetHistoryAsync()
    {
        throw new NotImplementedException();
    }


    //===========================================================
    // Get Entity History
    //===========================================================

    public async Task
        <IReadOnlyList<object>>
        GetEntityHistoryAsync
    (
        long id
    )
    {
        throw new NotImplementedException();
    }

}