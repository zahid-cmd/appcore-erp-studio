//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Contracts.Persistence.HumanResource.HumanResourceSetup;
using AppCore.Application.HumanResource.HumanResourceSetup.Department.DTOs;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResource.HumanResourceSetup;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResource.HumanResourceSetup;

//===============================================================
// Department Repository
//===============================================================

public class DepartmentRepository : IDepartmentRepository
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;

    //===========================================================
    // Constructor
    //===========================================================

    public DepartmentRepository(AppDbContext context)
    {
        _context = context;
    }

    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<DepartmentDefaultsDto> GetDefaultsAsync()
    {
        int nextSequenceNo = await GetNextSequenceNoAsync();

        return new DepartmentDefaultsDto
        {
            Code = CodeGenerator.GenerateDepartmentCode(nextSequenceNo),
            CompanyId = 1,
            IsActive = true
        };
    }

    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<DepartmentDto>> GetAllAsync()
    {
        return await _context.Departments
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Code)
            .Select(x => new DepartmentDto
            {
                Id = x.Id,
                Code = x.Code,
                Name = x.Name,
                ShortName = x.ShortName,
                DepartmentHead = x.DepartmentHead,
                Email = x.Email,
                Phone = x.Phone,
                CompanyId = x.CompanyId,
                CompanyName = string.Empty,
                Remarks = x.Remarks,
                IsActive = x.IsActive
            })
            .ToListAsync();
    }
    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<DepartmentDto?> GetByIdAsync(long id)
    {
        return await _context.Departments
            .Where(x => x.Id == id && !x.IsDeleted)
            .Select(x => new DepartmentDto
            {
                Id = x.Id,
                Code = x.Code,
                Name = x.Name,
                ShortName = x.ShortName,
                DepartmentHead = x.DepartmentHead,
                Email = x.Email,
                Phone = x.Phone,
                CompanyId = x.CompanyId,
                CompanyName = string.Empty,
                Remarks = x.Remarks,
                IsActive = x.IsActive
            })
            .FirstOrDefaultAsync();
    }

    //===========================================================
    // Create
    //===========================================================

    public async Task<long> CreateAsync(CreateDepartmentDto dto)
    {
        const long userId = 1;

        int nextSequenceNo =
            await GetNextSequenceNoAsync();

        var department =
            new Department
            {
                SequenceNo =
                    nextSequenceNo,

                Code =
                    CodeGenerator.GenerateDepartmentCode(
                        nextSequenceNo),

                Name =
                    dto.Name,

                ShortName =
                    dto.ShortName,

                DepartmentHead =
                    dto.DepartmentHead,

                Email =
                    dto.Email,

                Phone =
                    dto.Phone,

                CompanyId =
                    dto.CompanyId,

                Remarks =
                    dto.Remarks,

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };

        _context.Departments.Add(department);

        await _context.SaveChangesAsync();


        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Human Resource",

                EntityName =
                    "Department",

                EntityId =
                    department.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Department Created",

                ActivityDescription =
                    $"Department '{department.Name}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return department.Id;
    }
    //===========================================================
    // Update
    //===========================================================

    public async Task<bool> UpdateAsync(UpdateDepartmentDto dto)
    {
        const long userId = 1;

        var department =
            await _context.Departments

                .FirstOrDefaultAsync(x =>
                    x.Id == dto.Id
                    &&
                    !x.IsDeleted);

        if (department == null)
        {
            return false;
        }

        department.Name =
            dto.Name;

        department.ShortName =
            dto.ShortName;

        department.DepartmentHead =
            dto.DepartmentHead;

        department.Email =
            dto.Email;

        department.Phone =
            dto.Phone;

        department.CompanyId =
            dto.CompanyId;

        department.Remarks =
            dto.Remarks;

        department.IsActive =
            dto.IsActive;

        department.ModifiedBy =
            userId;

        department.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();


        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Human Resource",

                EntityName =
                    "Department",

                EntityId =
                    department.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Department Updated",

                ActivityDescription =
                    $"Department '{department.Name}' updated.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return true;
    }
    
    //===========================================================
    // Delete
    //===========================================================

    public async Task<bool> DeleteAsync(long id)
    {
        const long userId = 1;

        var department =
            await _context.Departments

                .FirstOrDefaultAsync(x =>
                    x.Id == id
                    &&
                    !x.IsDeleted);

        if (department == null)
        {
            return false;
        }

        department.IsDeleted =
            true;

        department.DeletedBy =
            userId;

        department.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();


        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Human Resource",

                EntityName =
                    "Department",

                EntityId =
                    department.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Department Deleted",

                ActivityDescription =
                    $"Department '{department.Name}' deleted.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return true;
    }

    //===============================================================
    // Get Next Sequence No
    //===============================================================

    private async Task<int> GetNextSequenceNoAsync()
    {
        return await _context.Departments.AnyAsync()
            ? await _context.Departments.MaxAsync(x => x.SequenceNo) + 1
            : 1;
    }

    //===========================================================
    // Exists By Name
    //===========================================================

    public async Task<bool> ExistsByNameAsync(string name, long? excludeId = null)
    {
        return await _context.Departments.AnyAsync(x =>
            !x.IsDeleted &&
            x.Name == name &&
            (!excludeId.HasValue || x.Id != excludeId.Value));
    }
}