//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.EnquiryManagement.EnquiryProfiles;
using AppCore.Application.ServiceOperations;
using AppCore.Domain.Entities.ServiceOperations;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.ServiceOperations;


//===============================================================
// Observations (the problems of a bike) and diagnoses (what was
// found), hand-written 2026-11-16; NEVER run Code Sync; tables made
// by ServiceOperations_Diagnosis_Engine.sql.
//
// Both lists are kept in Workshop Configuration. A diagnosis can
// belong to one observation and can suggest labour and parts : with
// the switch DiagnosisSuggests on, picking it on an estimate puts
// them on the estimate.
//===============================================================

public class WorkshopDiagnosisRepository
    : IWorkshopDiagnosisRepository
{
    private const string ObservationPrefix = "OBS-";

    private const string DiagnosisPrefix = "DGN-";

    private const string Entity = "Workshop";

    private static readonly string[] ServiceKinds = { "Scheduled", "LaborChart", "Customized", "Membership" };

    private static readonly string[] PartKinds = { "SparePart", "Accessory" };

    private readonly AppDbContext _context;

    private readonly IServiceEnquiriesRepository _enquiries;

    public WorkshopDiagnosisRepository(AppDbContext context, IServiceEnquiriesRepository enquiries)
    {
        _context = context;
        _enquiries = enquiries;
    }

    private DbSet<WorkshopObservations> Observations => _context.Set<WorkshopObservations>();

    private DbSet<WorkshopDiagnoses> Diagnoses => _context.Set<WorkshopDiagnoses>();

    private DbSet<WorkshopDiagnosisItems> Items => _context.Set<WorkshopDiagnosisItems>();


    //===========================================================
    // Reading
    //===========================================================

    private static WorkshopObservationDto ToDto(WorkshopObservations x) =>
        new()
        {
            WorkshopObservationId = x.WorkshopObservationId,
            PublicId = x.PublicId,
            Code = x.Code,
            Name = x.Name,
            Remarks = x.Remarks,
            IsActive = x.IsActive,
            IsDefault = x.IsDefault
        };

    private static WorkshopDiagnosisDto ToDto(WorkshopDiagnoses x, string observationName, IEnumerable<WorkshopDiagnosisItems> items) =>
        new()
        {
            WorkshopDiagnosisId = x.WorkshopDiagnosisId,
            PublicId = x.PublicId,
            Code = x.Code,
            Name = x.Name,
            WorkshopObservationId = x.WorkshopObservationId,
            ObservationName = observationName,
            Remarks = x.Remarks,
            IsActive = x.IsActive,
            Items =
                items.OrderBy(i => i.LineNo)
                    .Select(i => new WorkshopDiagnosisItemDto { LineType = i.LineType, ItemKind = i.ItemKind, ItemId = i.ItemId, ItemCode = i.ItemCode, ItemName = i.ItemName, Quantity = i.Quantity })
                    .ToList()
        };

    private async Task<(List<WorkshopObservationDto> Observations, List<WorkshopDiagnosisDto> Diagnoses)> ListsAsync(bool activeOnly)
    {
        List<WorkshopObservations> observations =
            await Observations.AsNoTracking().Where(x => !x.IsDeleted && (!activeOnly || x.IsActive)).OrderBy(x => x.Name).ToListAsync();

        List<WorkshopDiagnoses> diagnoses =
            await Diagnoses.AsNoTracking().Where(x => !x.IsDeleted && (!activeOnly || x.IsActive)).OrderBy(x => x.Name).ToListAsync();

        List<long> ids = diagnoses.Select(x => x.WorkshopDiagnosisId).ToList();

        ILookup<long, WorkshopDiagnosisItems> items =
            (await Items.AsNoTracking().Where(x => ids.Contains(x.WorkshopDiagnosisId)).ToListAsync())
            .ToLookup(x => x.WorkshopDiagnosisId);

        // the name of an observation, also of a deleted one
        Dictionary<long, string> names =
            await Observations.AsNoTracking().ToDictionaryAsync(x => x.WorkshopObservationId, x => x.Name);

        return (
            observations.Select(ToDto).ToList(),
            diagnoses
                .Select(x => ToDto(x, x.WorkshopObservationId != null && names.TryGetValue(x.WorkshopObservationId.Value, out string? name) ? name : string.Empty, items[x.WorkshopDiagnosisId]))
                .ToList());
    }

    public async Task<WorkshopDiagnosisSetupDto> GetSetupAsync()
    {
        var lists = await ListsAsync(false);

        return new WorkshopDiagnosisSetupDto
        {
            Observations = lists.Observations,
            Diagnoses = lists.Diagnoses,
            NextObservationCode = Ws.NextCode(await Observations.AsNoTracking().Select(x => x.Code).ToListAsync(), ObservationPrefix),
            NextDiagnosisCode = Ws.NextCode(await Diagnoses.AsNoTracking().Select(x => x.Code).ToListAsync(), DiagnosisPrefix),
            ServiceItems = (await _enquiries.GetDefaultsAsync(HrCalendar.Today())).ServiceItems,
            Parts = await _enquiries.GetPartsAsync()
        };
    }

    public async Task<EstimateObservationListsDto> GetListsAsync(bool canAdd)
    {
        var lists = await ListsAsync(true);

        WorkshopConfiguration? row =
            await _context.Set<WorkshopConfiguration>().AsNoTracking().OrderBy(x => x.WorkshopConfigurationId).FirstOrDefaultAsync();

        return new EstimateObservationListsDto
        {
            Observations = lists.Observations,
            Diagnoses = lists.Diagnoses,
            Suggest = row?.DiagnosisSuggests ?? false,
            CanAdd = canAdd
        };
    }


    //===========================================================
    // Observations
    //===========================================================

    private async Task<WorkshopObservations> NewObservationAsync(string name, long userId)
    {
        var entity =
            new WorkshopObservations
            {
                Code = Ws.NextCode(await Observations.AsNoTracking().Select(x => x.Code).ToListAsync(), ObservationPrefix),
                Name = name,
                IsActive = true,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Observations.Add(entity);

        return entity;
    }

    public async Task<WorkshopObservationDto> SaveObservationAsync(Guid? publicId, WorkshopObservationDto dto, long userId)
    {
        string name = Ws.Clean(dto.Name, 150, "Observation");

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Observation is required.");
        }

        if (await Observations.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.PublicId != (publicId ?? Guid.Empty) && x.Name.ToLower() == name.ToLower()))
        {
            throw new InvalidOperationException($"The observations have \"{name}\" already.");
        }

        WorkshopObservations entity;

        if (publicId == null)
        {
            entity = await NewObservationAsync(name, userId);
        }
        else
        {
            entity =
                await Observations.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
                ?? throw new KeyNotFoundException("The observation was not found.");

            entity.Name = name;
            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;
        }

        entity.Remarks = Ws.Clean(dto.Remarks, 500, "Remarks");
        entity.IsActive = dto.IsActive;

        // The default : an active one, and one only - this one takes
        // it from the one that had it
        entity.IsDefault = dto.IsDefault && dto.IsActive;

        if (entity.IsDefault)
        {
            List<WorkshopObservations> others =
                await Observations.Where(x => x.IsDefault && x.PublicId != entity.PublicId).ToListAsync();

            others.ForEach(x => x.IsDefault = false);
        }

        await _context.SaveChangesAsync();

        Ws.AddHistory(_context, Entity, entity.WorkshopObservationId, publicId == null ? "Create" : "Update", publicId == null ? "Observation Created" : "Observation Updated", $"{entity.Code} {entity.Name}.{(entity.IsActive ? string.Empty : " Inactive.")}{(entity.IsDefault ? " Default." : string.Empty)}", userId);

        await _context.SaveChangesAsync();

        return ToDto(entity);
    }

    // A deleted observation stays on the estimates that have it
    public async Task DeleteObservationAsync(Guid publicId, long userId)
    {
        WorkshopObservations entity =
            await Observations.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The observation was not found.");

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, Entity, entity.WorkshopObservationId, "Delete", "Observation Deleted", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();
    }

    public async Task<WorkshopObservationDto> QuickObservationAsync(QuickObservationDto dto, long userId)
    {
        string name = Ws.Clean(dto.Name, 150, "Observation");

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Type the observation.");
        }

        WorkshopObservations? entity =
            await Observations.FirstOrDefaultAsync(x => !x.IsDeleted && x.Name.ToLower() == name.ToLower());

        if (entity != null)
        {
            if (!entity.IsActive)
            {
                throw new InvalidOperationException($"\"{entity.Name}\" is in the observations but it is inactive (Workshop Configuration).");
            }

            return ToDto(entity);
        }

        entity = await NewObservationAsync(name, userId);

        await _context.SaveChangesAsync();

        Ws.AddHistory(_context, Entity, entity.WorkshopObservationId, "Create", "Observation Created", $"{entity.Code} {entity.Name}. Added from a service estimate.", userId);

        await _context.SaveChangesAsync();

        return ToDto(entity);
    }


    //===========================================================
    // Diagnoses
    //===========================================================

    private async Task<WorkshopObservations?> ObservationOfAsync(long? id)
    {
        if (id == null)
        {
            return null;
        }

        return await Observations.AsNoTracking().FirstOrDefaultAsync(x => x.WorkshopObservationId == id && !x.IsDeleted)
               ?? throw new InvalidOperationException("The observation of the diagnosis was not found.");
    }

    private async Task<WorkshopDiagnoses> NewDiagnosisAsync(string name, long? observationId, long userId)
    {
        var entity =
            new WorkshopDiagnoses
            {
                Code = Ws.NextCode(await Diagnoses.AsNoTracking().Select(x => x.Code).ToListAsync(), DiagnosisPrefix),
                Name = name,
                WorkshopObservationId = observationId,
                IsActive = true,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        Diagnoses.Add(entity);

        return entity;
    }

    private static List<WorkshopDiagnosisItems> BuildItems(WorkshopDiagnosisDto dto)
    {
        var items = new List<WorkshopDiagnosisItems>();

        foreach (WorkshopDiagnosisItemDto line in dto.Items ?? new())
        {
            string type = (line.LineType ?? string.Empty).Trim();
            string kind = (line.ItemKind ?? string.Empty).Trim();
            string name = Ws.Clean(line.ItemName, 200, "Item");

            bool known =
                (type == Est.Service && ServiceKinds.Contains(kind))
                || (type == Est.Part && PartKinds.Contains(kind));

            if (!known || line.ItemId <= 0 || name.Length == 0)
            {
                throw new InvalidOperationException("A suggested labour or part is not right : pick it from the list again.");
            }

            if (line.Quantity <= 0m || line.Quantity > 9999m)
            {
                throw new InvalidOperationException($"{name} : give the quantity.");
            }

            if (items.Any(x => x.LineType == type && x.ItemKind == kind && x.ItemId == line.ItemId))
            {
                continue;
            }

            items.Add(
                new WorkshopDiagnosisItems
                {
                    LineNo = items.Count + 1,
                    LineType = type,
                    ItemKind = kind,
                    ItemId = line.ItemId,
                    ItemCode = Ws.Clean(line.ItemCode, 60, "Item Code"),
                    ItemName = name,
                    Quantity = type == Est.Service ? 1m : Math.Round(line.Quantity, 3)
                });
        }

        return items;
    }

    public async Task<WorkshopDiagnosisDto> SaveDiagnosisAsync(Guid? publicId, WorkshopDiagnosisDto dto, long userId)
    {
        string name = Ws.Clean(dto.Name, 150, "Diagnosis");

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Diagnosis is required.");
        }

        if (await Diagnoses.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.PublicId != (publicId ?? Guid.Empty) && x.WorkshopObservationId == dto.WorkshopObservationId && x.Name.ToLower() == name.ToLower()))
        {
            throw new InvalidOperationException($"The diagnoses have \"{name}\" already.");
        }

        WorkshopObservations? observation = await ObservationOfAsync(dto.WorkshopObservationId);

        List<WorkshopDiagnosisItems> items = BuildItems(dto);

        WorkshopDiagnoses entity;

        if (publicId == null)
        {
            entity = await NewDiagnosisAsync(name, observation?.WorkshopObservationId, userId);
        }
        else
        {
            entity =
                await Diagnoses.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
                ?? throw new KeyNotFoundException("The diagnosis was not found.");

            entity.Name = name;
            entity.WorkshopObservationId = observation?.WorkshopObservationId;
            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;
        }

        entity.Remarks = Ws.Clean(dto.Remarks, 500, "Remarks");
        entity.IsActive = dto.IsActive;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        await _context.SaveChangesAsync();

        long id = entity.WorkshopDiagnosisId;

        if (publicId != null)
        {
            Items.RemoveRange(await Items.Where(x => x.WorkshopDiagnosisId == id).ToListAsync());
        }

        items.ForEach(x => x.WorkshopDiagnosisId = id);

        Items.AddRange(items);

        Ws.AddHistory(_context, Entity, id, publicId == null ? "Create" : "Update", publicId == null ? "Diagnosis Created" : "Diagnosis Updated", $"{entity.Code} {entity.Name}{(observation != null ? " (" + observation.Name + ")" : string.Empty)}; suggests {items.Count(x => x.LineType == Est.Service)} labour, {items.Count(x => x.LineType == Est.Part)} parts.{(entity.IsActive ? string.Empty : " Inactive.")}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return ToDto(entity, observation?.Name ?? string.Empty, items);
    }

    // A deleted diagnosis stays on the estimates that have it
    public async Task DeleteDiagnosisAsync(Guid publicId, long userId)
    {
        WorkshopDiagnoses entity =
            await Diagnoses.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The diagnosis was not found.");

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, Entity, entity.WorkshopDiagnosisId, "Delete", "Diagnosis Deleted", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();
    }

    public async Task<WorkshopDiagnosisDto> QuickDiagnosisAsync(QuickObservationDto dto, long userId)
    {
        string name = Ws.Clean(dto.Name, 150, "Diagnosis");

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Type the diagnosis.");
        }

        WorkshopObservations? observation = await ObservationOfAsync(dto.WorkshopObservationId);

        long? observationId = observation?.WorkshopObservationId;

        WorkshopDiagnoses? entity =
            await Diagnoses.FirstOrDefaultAsync(x => !x.IsDeleted && x.WorkshopObservationId == observationId && x.Name.ToLower() == name.ToLower());

        if (entity != null)
        {
            if (!entity.IsActive)
            {
                throw new InvalidOperationException($"\"{entity.Name}\" is in the diagnoses but it is inactive (Workshop Configuration).");
            }

            return ToDto(entity, observation?.Name ?? string.Empty, await Items.AsNoTracking().Where(x => x.WorkshopDiagnosisId == entity.WorkshopDiagnosisId).ToListAsync());
        }

        entity = await NewDiagnosisAsync(name, observationId, userId);

        await _context.SaveChangesAsync();

        Ws.AddHistory(_context, Entity, entity.WorkshopDiagnosisId, "Create", "Diagnosis Created", $"{entity.Code} {entity.Name}{(observation != null ? " (" + observation.Name + ")" : string.Empty)}. Added from a service estimate.", userId);

        await _context.SaveChangesAsync();

        return ToDto(entity, observation?.Name ?? string.Empty, Array.Empty<WorkshopDiagnosisItems>());
    }
}
