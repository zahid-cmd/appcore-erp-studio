//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Infrastructure.Persistence;

using global::{{ApplicationNamespace}};


//===============================================================
// Namespace
//===============================================================

namespace {{InfrastructureNamespace}};


//===============================================================
// {{RepositoryName}}
//===============================================================

public class {{RepositoryName}}
    : {{RepositoryInterfaceName}}
{

    //===========================================================
    // DbContext
    //===========================================================

    private readonly AppDbContext
        _context;


    //===========================================================
    // Constructor
    //===========================================================

    public {{RepositoryName}}
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

    public async Task<IReadOnlyList<global::{{DomainNamespace}}.{{EntityName}}>>
        GetAllAsync()
    {
        return await _context
            .Set<global::{{DomainNamespace}}.{{EntityName}}>()
            .AsNoTracking()
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<global::{{DomainNamespace}}.{{EntityName}}?>
        GetByIdAsync
    (
        long id
    )
    {
        return await _context
            .Set<global::{{DomainNamespace}}.{{EntityName}}>()
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
        global::{{DomainNamespace}}.{{EntityName}} entity
    )
    {
        await _context
            .Set<global::{{DomainNamespace}}.{{EntityName}}>()
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
        global::{{DomainNamespace}}.{{EntityName}} entity
    )
    {
        _context
            .Set<global::{{DomainNamespace}}.{{EntityName}}>()
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
                .Set<global::{{DomainNamespace}}.{{EntityName}}>()
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
            .Set<global::{{DomainNamespace}}.{{EntityName}}>()
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