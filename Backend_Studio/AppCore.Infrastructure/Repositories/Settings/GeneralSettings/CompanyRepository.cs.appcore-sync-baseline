//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Infrastructure.Persistence;

using global::AppCore.Application.Settings.GeneralSettings.Company;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Settings.GeneralSettings;


//===============================================================
// CompanyRepository
//===============================================================

public class CompanyRepository
    : ICompanyRepository
{

    //===========================================================
    // DbContext
    //===========================================================

    private readonly AppDbContext
        _context;


    //===========================================================
    // Constructor
    //===========================================================

    public CompanyRepository
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

    public async Task<IReadOnlyList<global::AppCore.Domain.Settings.GeneralSettings.Company>>
        GetAllAsync()
    {
        return await _context
            .Set<global::AppCore.Domain.Settings.GeneralSettings.Company>()
            .AsNoTracking()
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<global::AppCore.Domain.Settings.GeneralSettings.Company?>
        GetByIdAsync
    (
        long id
    )
    {
        return await _context
            .Set<global::AppCore.Domain.Settings.GeneralSettings.Company>()
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
        global::AppCore.Domain.Settings.GeneralSettings.Company entity
    )
    {
        await _context
            .Set<global::AppCore.Domain.Settings.GeneralSettings.Company>()
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
        global::AppCore.Domain.Settings.GeneralSettings.Company entity
    )
    {
        _context
            .Set<global::AppCore.Domain.Settings.GeneralSettings.Company>()
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
                .Set<global::AppCore.Domain.Settings.GeneralSettings.Company>()
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
            .Set<global::AppCore.Domain.Settings.GeneralSettings.Company>()
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