//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.WarrantyManagement.SalesWarranty;
using AppCore.Domain.Entities.WarrantyManagement.WarrantyControl;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;
using AppCore.Infrastructure.Repositories.ServiceOperations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.WarrantyManagement.SalesWarranty;


//===============================================================
// Sales Warranty Records (read-only, hand-written page, 2026-11-16;
// NEVER run Code Sync). Nothing is written : the records are made
// when a bike is delivered.
//===============================================================

public class SalesWarrantyRecordsRepository
    : ISalesWarrantyRecordsRepository
{
    // An end date this near is "Expiring"
    private const int ExpiringDays = 30;

    private readonly AppDbContext _context;

    public SalesWarrantyRecordsRepository(AppDbContext context)
    {
        _context = context;
    }

    private static SalesWarrantyRecordDto Head(SalesWarrantyRecords x, Dictionary<long, string> branches, DateOnly today)
    {
        int? daysLeft = x.ExpiryDate == null ? null : x.ExpiryDate.Value.DayNumber - today.DayNumber;

        string state =
            x.Status == "Void" || x.Status == "Claimed" ? x.Status
            : daysLeft < 0 || x.Status == "Expired" ? "Expired"
            : daysLeft <= ExpiringDays ? "Expiring"
            : "In Warranty";

        return new SalesWarrantyRecordDto
        {
            Id = x.SalesWarrantyRecordId,
            PublicId = x.PublicId,
            Code = x.Code,
            BranchName = branches.TryGetValue(x.BranchId, out string? name) ? name : string.Empty,
            SalesInvoiceNo = x.SalesInvoiceNo,
            CustomerName = x.CustomerName,
            CustomerPhone = x.CustomerPhone,
            ProductName = x.ProductName,
            ChassisNo = x.ChassisNo,
            EngineNo = x.EngineNo,
            PolicyCode = x.PolicyCode,
            PolicyName = x.PolicyName,
            StartDate = HrCalendar.Day(x.StartDate),
            ExpiryDate = x.ExpiryDate == null ? string.Empty : HrCalendar.Day(x.ExpiryDate.Value),
            KmLimit = x.KmLimit,
            Status = x.Status,
            State = state,
            DaysLeft = daysLeft,
            VoidReason = x.VoidReason
        };
    }

    public async Task<List<SalesWarrantyRecordDto>> GetAllAsync()
    {
        DateOnly today = HrCalendar.Today();

        Dictionary<long, string> branches = await Ws.BranchNamesAsync(_context);

        return (await _context.Set<SalesWarrantyRecords>().AsNoTracking().Where(x => !x.IsDeleted).OrderByDescending(x => x.SalesWarrantyRecordId).ToListAsync())
            .Select(x => Head(x, branches, today))
            .ToList();
    }

    public async Task<SalesWarrantyRecordDto> GetAsync(Guid publicId)
    {
        DateOnly today = HrCalendar.Today();

        SalesWarrantyRecords record =
            await _context.Set<SalesWarrantyRecords>().AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The warranty record was not found.");

        SalesWarrantyRecordDto dto = Head(record, await Ws.BranchNamesAsync(_context), today);

        dto.Parts =
            (await _context.Set<SalesWarrantyRecordParts>().AsNoTracking()
                .Where(x => x.SalesWarrantyRecordId == record.SalesWarrantyRecordId)
                .OrderBy(x => x.SalesWarrantyRecordPartId)
                .ToListAsync())
            .Select(x => new SalesWarrantyPartDto
            {
                PartName = x.PartName,
                ExpiryDate = x.ExpiryDate == null ? string.Empty : HrCalendar.Day(x.ExpiryDate.Value),
                KmLimit = x.KmLimit,
                Notes = x.Notes,
                State = x.ExpiryDate != null && x.ExpiryDate.Value < today ? "Expired" : "Covered"
            })
            .ToList();

        return dto;
    }
}
