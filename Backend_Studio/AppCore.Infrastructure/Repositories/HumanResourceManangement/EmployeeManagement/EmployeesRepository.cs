//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using Microsoft.EntityFrameworkCore;
using AppCore.Application.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Entities.SecurityPermission.UserManagement;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.EmployeeManagement;


//===============================================================
// Employees Repository (hand-written page, 2026-11-13; NEVER run
// Code Sync for it)
//
//   Code EMP-0001 (deleted rows count, never reused).
//   Full name, branch, department, designation, shift and joining
//   date are required. A mobile number / national id / login can
//   belong to one live employee only.
//   Salary : the profile takes the gross salary (Tk a month) and
//   one salary structure (Human Resource Setup > Salary
//   Structures : a percent of the gross for each salary head).
//   The employee's lines (HrEmployeeSalaryLines, read by payroll)
//   are worked out from the two by
//   SalaryStructuresRepository.ApplyToEmployeeAsync. A gross
//   salary needs a structure. A profile saved before salary
//   structures existed keeps its old lines while its gross is not
//   changed and no structure is picked.
//===============================================================

public class EmployeesRepository
    : IEmployeesRepository
{
    private const string HistoryModule = "Human Resource";

    public const string HistoryEntity = "HrEmployees";

    private static readonly string[] Genders = { "Male", "Female", "Other" };

    private static readonly string[] MaritalStatuses = { "Single", "Married", "Other" };

    private static readonly string[] BloodGroups = { "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-" };

    private static readonly string[] EmploymentTypes = { "Permanent", "Probation", "Contract", "Part Time", "Intern" };

    private static readonly string[] PaymentModes = { "Cash", "Bank", "MFS" };

    private readonly AppDbContext _context;

    public EmployeesRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<HrEmployees> Employees => _context.Set<HrEmployees>();

    private DbSet<HrEmployeeSalaryLines> SalaryLines => _context.Set<HrEmployeeSalaryLines>();

    private DbSet<HrSalaryStructures> Structures => _context.Set<HrSalaryStructures>();


    //===========================================================
    // Helpers
    //===========================================================

    private static string Clean(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

    private static string Limited(string? value, int max, string label)
    {
        string text = Clean(value);

        if (text.Length > max)
        {
            throw new InvalidOperationException($"{label} cannot be longer than {max} characters.");
        }

        return text;
    }

    // '' is allowed; anything else must be on the list
    private static string Optional(string? value, string[] allowed, string label)
    {
        string text = Clean(value);

        if (text.Length == 0)
        {
            return string.Empty;
        }

        return allowed.FirstOrDefault(x => string.Equals(x, text, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"{label} \"{text}\" is not on the list.");
    }

    private static string Day(DateOnly? date) =>
        date?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) ?? string.Empty;

    private static DateOnly? ParseDay(string? value, string label)
    {
        string text = (value ?? string.Empty).Trim();

        if (text.Length == 0)
        {
            return null;
        }

        // the first 10 letters : a full date-time text is accepted too
        if (text.Length > 10)
        {
            text = text.Substring(0, 10);
        }

        return DateOnly.TryParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly date)
            ? date
            : throw new InvalidOperationException($"{label} is not a valid date.");
    }

    private static string NextCode(IEnumerable<string> codes)
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if (value.StartsWith("EMP-", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(4), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return $"EMP-{highest + 1:D4}";
    }

    private void AddHistory(long id, string type, string title, string description, long userId)
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = id,
                ActivityType = type,
                ActivityTitle = title,
                ActivityDescription = description.Length > 1000 ? description.Substring(0, 1000) : description,
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }

    private async Task<HrEmployees> FindAsync(Guid publicId)
    {
        return await Employees.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The employee was not found.");
    }


    //===========================================================
    // Read
    //===========================================================

    public async Task<List<EmployeeListItemDto>> GetListAsync()
    {
        var rows =
            await (
                from e in Employees.AsNoTracking()
                where !e.IsDeleted
                join b in _context.Set<Branches>().AsNoTracking() on e.BranchId equals b.BranchId into bj
                from b in bj.DefaultIfEmpty()
                join d in _context.Set<Department>().AsNoTracking() on e.DepartmentId equals d.DepartmentId into dj
                from d in dj.DefaultIfEmpty()
                join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                from g in gj.DefaultIfEmpty()
                join s in _context.Set<HrShifts>().AsNoTracking() on e.ShiftId equals s.ShiftId into sj
                from s in sj.DefaultIfEmpty()
                orderby e.Code
                select new
                {
                    e.PublicId,
                    e.Code,
                    e.FullName,
                    e.MobileNo,
                    e.BranchId,
                    BranchName = b != null ? b.BranchName : string.Empty,
                    e.DepartmentId,
                    DepartmentName = d != null ? d.DepartmentName : string.Empty,
                    DesignationName = g != null ? g.DesignationName : string.Empty,
                    ShiftName = s != null ? s.Name : string.Empty,
                    e.EmploymentType,
                    e.JoiningDate,
                    e.GrossSalary,
                    e.UserProfileId,
                    e.IsActive
                })
            .ToListAsync();

        return rows
            .Select(x => new EmployeeListItemDto
            {
                PublicId = x.PublicId,
                Code = x.Code,
                FullName = x.FullName,
                MobileNo = x.MobileNo,
                BranchId = x.BranchId,
                BranchName = x.BranchName,
                DepartmentId = x.DepartmentId,
                DepartmentName = x.DepartmentName,
                DesignationName = x.DesignationName,
                ShiftName = x.ShiftName,
                EmploymentType = x.EmploymentType,
                JoiningDate = Day(x.JoiningDate),
                GrossSalary = x.GrossSalary,
                HasLogin = x.UserProfileId != null,
                IsActive = x.IsActive
            })
            .ToList();
    }

    private async Task<EmployeeDto> ReadAsync(HrEmployees e)
    {
        string branch =
            await _context.Set<Branches>().AsNoTracking()
                .Where(x => x.BranchId == e.BranchId).Select(x => x.BranchName).FirstOrDefaultAsync() ?? string.Empty;

        string department =
            await _context.Set<Department>().AsNoTracking()
                .Where(x => x.DepartmentId == e.DepartmentId).Select(x => x.DepartmentName).FirstOrDefaultAsync() ?? string.Empty;

        string designation =
            await _context.Set<Designation>().AsNoTracking()
                .Where(x => x.DesignationId == e.DesignationId).Select(x => x.DesignationName).FirstOrDefaultAsync() ?? string.Empty;

        string shift =
            await _context.Set<HrShifts>().AsNoTracking()
                .Where(x => x.ShiftId == e.ShiftId).Select(x => x.Name).FirstOrDefaultAsync() ?? string.Empty;

        string login = string.Empty;

        if (e.UserProfileId != null)
        {
            login =
                await _context.Set<UserProfile>().AsNoTracking()
                    .Where(x => x.UserProfileId == e.UserProfileId)
                    .Select(x => x.DisplayName != string.Empty ? x.DisplayName : x.UserName)
                    .FirstOrDefaultAsync() ?? string.Empty;
        }

        string structure = string.Empty;

        if (e.SalaryStructureId != null)
        {
            structure =
                await Structures.AsNoTracking()
                    .Where(x => x.SalaryStructureId == e.SalaryStructureId)
                    .Select(x => x.Code + "  " + x.Name)
                    .FirstOrDefaultAsync() ?? string.Empty;
        }

        var lines =
            await (
                from line in SalaryLines.AsNoTracking()
                where line.EmployeeId == e.EmployeeId
                join head in _context.Set<HrSalaryHeads>().AsNoTracking() on line.SalaryHeadId equals head.SalaryHeadId
                orderby (head.HeadType == "Earning" ? 0 : 1), head.DisplayOrder, head.Code
                select new { line.SalaryHeadId, head.Name, head.HeadType, line.Amount })
            .ToListAsync();

        return new EmployeeDto
        {
            PublicId = e.PublicId,
            Code = e.Code,
            FullName = e.FullName,
            FatherName = e.FatherName,
            MotherName = e.MotherName,
            Gender = e.Gender,
            DateOfBirth = Day(e.DateOfBirth),
            BloodGroup = e.BloodGroup,
            MaritalStatus = e.MaritalStatus,
            NationalId = e.NationalId,
            MobileNo = e.MobileNo,
            Email = e.Email,
            PresentAddress = e.PresentAddress,
            PermanentAddress = e.PermanentAddress,
            EmergencyContactName = e.EmergencyContactName,
            EmergencyContactPhone = e.EmergencyContactPhone,
            BranchId = e.BranchId,
            BranchName = branch,
            DepartmentId = e.DepartmentId,
            DepartmentName = department,
            DesignationId = e.DesignationId,
            DesignationName = designation,
            ShiftId = e.ShiftId,
            ShiftName = shift,
            WeeklyOffDays = e.WeeklyOffDays,
            EmploymentType = e.EmploymentType,
            JoiningDate = Day(e.JoiningDate),
            ConfirmationDate = Day(e.ConfirmationDate),
            UserProfileId = e.UserProfileId ?? 0,
            LoginName = login,
            SalaryStructureId = e.SalaryStructureId ?? 0,
            SalaryStructureName = structure,
            SalaryLines = lines
                .Select(x => new EmployeeSalaryLineDto { SalaryHeadId = x.SalaryHeadId, HeadName = x.Name, HeadType = x.HeadType, Amount = x.Amount })
                .ToList(),
            GrossSalary = e.GrossSalary,
            TotalDeductions = lines.Where(x => x.HeadType == "Deduction").Sum(x => x.Amount),
            OvertimeAllowed = e.OvertimeAllowed,
            OvertimeStructureId = e.OvertimeStructureId ?? 0,
            OvertimeStructureName =
                e.OvertimeStructureId == null
                    ? string.Empty
                    : await _context.Set<HrOvertimeStructures>().AsNoTracking()
                        .Where(x => x.OvertimeStructureId == e.OvertimeStructureId)
                        .Select(x => x.Code + "  " + x.Name)
                        .FirstOrDefaultAsync() ?? string.Empty,
            OvertimeRate = e.OvertimeRate,
            PaymentMode = e.PaymentMode,
            BankName = e.BankName,
            BankAccountNo = e.BankAccountNo,
            MfsName = e.MfsName,
            MfsNo = e.MfsNo,
            Remarks = e.Remarks,
            IsActive = e.IsActive
        };
    }

    public async Task<EmployeeDto> GetAsync(Guid publicId)
    {
        HrEmployees e =
            await Employees.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The employee was not found.");

        return await ReadAsync(e);
    }

    public async Task<EmployeeDefaultsDto> GetDefaultsAsync()
    {
        EmployeeDefaultsDto defaults = new()
        {
            NextCode = NextCode(await Employees.AsNoTracking().Select(x => x.Code).ToListAsync())
        };

        defaults.Branches =
            await _context.Set<Branches>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.BranchName)
                .Select(x => new EmployeeLookupDto { Id = x.BranchId, Name = x.BranchName })
                .ToListAsync();

        defaults.Departments =
            await _context.Set<Department>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.DepartmentName)
                .Select(x => new EmployeeLookupDto { Id = x.DepartmentId, Name = x.DepartmentName })
                .ToListAsync();

        defaults.Designations =
            await _context.Set<Designation>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.DesignationName)
                .Select(x => new EmployeeLookupDto { Id = x.DesignationId, Name = x.DesignationName })
                .ToListAsync();

        defaults.Shifts =
            (await _context.Set<HrShifts>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.Code)
                .Select(x => new { x.ShiftId, x.Name, x.StartTime, x.EndTime, x.BreakMinutes })
                .ToListAsync())
            .Select(x => new EmployeeLookupDto
            {
                Id = x.ShiftId,
                Name = x.Name,
                Note = x.StartTime + " - " + x.EndTime,
                Hours = HrCalendar.ShiftHours(x.StartTime, x.EndTime, x.BreakMinutes)
            })
            .ToList();

        var linked =
            await Employees.AsNoTracking()
                .Where(x => !x.IsDeleted && x.UserProfileId != null)
                .Select(x => new { x.UserProfileId, x.Code })
                .ToListAsync();

        var users =
            await _context.Set<UserProfile>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.DisplayName)
                .Select(x => new { x.UserProfileId, x.DisplayName, x.UserName })
                .ToListAsync();

        defaults.Users =
            users
                .Select(u => new EmployeeLookupDto
                {
                    Id = u.UserProfileId,
                    Name = string.IsNullOrWhiteSpace(u.DisplayName) ? u.UserName : $"{u.DisplayName} ({u.UserName})",
                    Note = linked.FirstOrDefault(l => l.UserProfileId == u.UserProfileId)?.Code ?? string.Empty
                })
                .ToList();

        // active structures with their lines (the profile shows the
        // gross salary split by them)
        List<HrSalaryStructures> structures =
            await Structures.AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.Code)
                .ToListAsync();

        List<long> structureIds = structures.Select(x => x.SalaryStructureId).ToList();

        var structureLines =
            await (
                from line in _context.Set<HrSalaryStructureLines>().AsNoTracking()
                where structureIds.Contains(line.SalaryStructureId)
                join head in _context.Set<HrSalaryHeads>().AsNoTracking() on line.SalaryHeadId equals head.SalaryHeadId
                orderby (head.HeadType == "Earning" ? 0 : 1), head.DisplayOrder, head.Code
                select new { line.SalaryStructureId, line.SalaryHeadId, head.Name, head.HeadType, head.SystemKey, line.Percent, line.Basis, line.FixedAmount })
            .ToListAsync();

        defaults.DefaultWeeklyOffDays = await HrCalendar.DefaultOffDaysAsync(_context);

        defaults.OvertimeStructures =
            await _context.Set<HrOvertimeStructures>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.Code)
                .Select(x => new EmployeeOvertimeStructureDto
                {
                    Id = x.OvertimeStructureId,
                    Code = x.Code,
                    Name = x.Name,
                    IsDefault = x.IsDefault,
                    RateBase = x.RateBase,
                    FixedHourRate = x.FixedHourRate,
                    MonthDaysMode = x.MonthDaysMode,
                    MonthDays = x.MonthDays,
                    PayExtraHours = x.PayExtraHours,
                    HourMultiplier = x.HourMultiplier,
                    HolidayHourMultiplier = x.HolidayHourMultiplier,
                    PayExtraDays = x.PayExtraDays,
                    DayMultiplier = x.DayMultiplier
                })
                .ToListAsync();

        defaults.SalaryStructures =
            structures
                .Select(x => new EmployeeSalaryStructureDto
                {
                    Id = x.SalaryStructureId,
                    Code = x.Code,
                    Name = x.Name,
                    IsDefault = x.IsDefault,
                    Lines =
                        structureLines
                            .Where(l => l.SalaryStructureId == x.SalaryStructureId)
                            .Select(l => new EmployeeSalaryStructureLineDto
                            {
                                SalaryHeadId = l.SalaryHeadId,
                                HeadName = l.Name,
                                HeadType = l.HeadType,
                                IsBasic = l.SystemKey == "BASIC",
                                Percent = l.Percent,
                                Basis = l.Basis,
                                FixedAmount = l.FixedAmount
                            })
                            .ToList()
                })
                .ToList();

        return defaults;
    }


    //===========================================================
    // Check + write
    //===========================================================

    // Checks the form and copies it to the entity; returns the
    // salary structure picked (null = none) and the gross salary
    private async Task<(long? StructureId, decimal Gross)> ApplyAsync(HrEmployees entity, EmployeeDto dto)
    {
        Guid self = entity.PublicId;

        // ---------- Personal ----------
        string fullName = Limited(dto.FullName, 150, "Full Name");

        if (fullName.Length == 0)
        {
            throw new InvalidOperationException("Full Name is required.");
        }

        DateOnly? birth = ParseDay(dto.DateOfBirth, "Date of Birth");

        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));

        if (birth != null && birth > today)
        {
            throw new InvalidOperationException("Date of Birth cannot be in the future.");
        }

        string nationalId = Limited(dto.NationalId, 30, "National ID");

        if (nationalId.Length > 0
            && await Employees.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.NationalId == nationalId && x.PublicId != self))
        {
            throw new InvalidOperationException($"National ID {nationalId} belongs to another employee.");
        }

        // ---------- Contact ----------
        string mobile = Limited(dto.MobileNo, 20, "Mobile No");

        if (mobile.Length > 0
            && await Employees.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.MobileNo == mobile && x.PublicId != self))
        {
            throw new InvalidOperationException($"Mobile No {mobile} belongs to another employee.");
        }

        string email = Limited(dto.Email, 150, "Email");

        if (email.Length > 0 && (!email.Contains('@') || email.Contains(' ')))
        {
            throw new InvalidOperationException("Email is not a valid address.");
        }

        // ---------- Job ----------
        if (!await _context.Set<Branches>().AsNoTracking().AnyAsync(x => x.BranchId == dto.BranchId && !x.IsDeleted))
        {
            throw new InvalidOperationException("Pick the branch.");
        }

        if (!await _context.Set<Department>().AsNoTracking().AnyAsync(x => x.DepartmentId == dto.DepartmentId && !x.IsDeleted))
        {
            throw new InvalidOperationException("Pick the department.");
        }

        if (!await _context.Set<Designation>().AsNoTracking().AnyAsync(x => x.DesignationId == dto.DesignationId && !x.IsDeleted))
        {
            throw new InvalidOperationException("Pick the designation.");
        }

        if (!await _context.Set<HrShifts>().AsNoTracking().AnyAsync(x => x.ShiftId == dto.ShiftId && !x.IsDeleted))
        {
            throw new InvalidOperationException("Pick the shift.");
        }

        DateOnly joining =
            ParseDay(dto.JoiningDate, "Joining Date")
            ?? throw new InvalidOperationException("Joining Date is required.");

        if (birth != null && joining <= birth)
        {
            throw new InvalidOperationException("Joining Date must be after the Date of Birth.");
        }

        DateOnly? confirmation = ParseDay(dto.ConfirmationDate, "Confirmation Date");

        if (confirmation != null && confirmation < joining)
        {
            throw new InvalidOperationException("Confirmation Date cannot be before the Joining Date.");
        }

        long? userProfileId = dto.UserProfileId > 0 ? dto.UserProfileId : null;

        if (userProfileId != null)
        {
            if (!await _context.Set<UserProfile>().AsNoTracking().AnyAsync(x => x.UserProfileId == userProfileId && !x.IsDeleted))
            {
                throw new InvalidOperationException("The login was not found.");
            }

            string? other =
                await Employees.AsNoTracking()
                    .Where(x => !x.IsDeleted && x.UserProfileId == userProfileId && x.PublicId != self)
                    .Select(x => x.Code + " " + x.FullName)
                    .FirstOrDefaultAsync();

            if (other != null)
            {
                throw new InvalidOperationException($"That login is already linked to {other}.");
            }
        }

        // ---------- Salary ----------
        if (dto.OvertimeRate < 0)
        {
            throw new InvalidOperationException("Overtime Rate cannot be negative.");
        }

        string paymentMode =
            PaymentModes.FirstOrDefault(x => string.Equals(x, Clean(dto.PaymentMode), StringComparison.OrdinalIgnoreCase))
            ?? "Cash";

        // How the salary is paid is no longer asked on the profile
        // (payment is handled by payment management) : the columns
        // stay, nothing is required of them

        string bankName = Limited(dto.BankName, 100, "Bank Name");
        string bankAccount = Limited(dto.BankAccountNo, 40, "Bank Account No");
        string mfsName = Limited(dto.MfsName, 30, "MFS");
        string mfsNo = Limited(dto.MfsNo, 20, "MFS No");

        long? structureId = dto.SalaryStructureId > 0 ? dto.SalaryStructureId : null;

        if (structureId != null
            && !await Structures.AsNoTracking().AnyAsync(x => x.SalaryStructureId == structureId && !x.IsDeleted))
        {
            throw new InvalidOperationException("The salary structure was not found : pick another one.");
        }

        decimal gross = Math.Round(dto.GrossSalary, 2);

        if (gross < 0)
        {
            throw new InvalidOperationException("Gross Salary cannot be negative.");
        }

        // a profile from before salary structures, left as it was
        bool untouchedOldSalary =
            structureId == null && entity.SalaryStructureId == null && gross == entity.GrossSalary;

        if (gross > 0 && structureId == null && !untouchedOldSalary)
        {
            throw new InvalidOperationException("Pick the salary structure : it splits the gross salary into the salary heads.");
        }

        // ---------- Copy ----------
        entity.FullName = fullName;
        entity.FatherName = Limited(dto.FatherName, 150, "Father's Name");
        entity.MotherName = Limited(dto.MotherName, 150, "Mother's Name");
        entity.Gender = Optional(dto.Gender, Genders, "Gender");
        entity.DateOfBirth = birth;
        entity.BloodGroup = Optional(dto.BloodGroup, BloodGroups, "Blood Group");
        entity.MaritalStatus = Optional(dto.MaritalStatus, MaritalStatuses, "Marital Status");
        entity.NationalId = nationalId;

        entity.MobileNo = mobile;
        entity.Email = email;
        entity.PresentAddress = Limited(dto.PresentAddress, 300, "Present Address");
        entity.PermanentAddress = Limited(dto.PermanentAddress, 300, "Permanent Address");
        entity.EmergencyContactName = Limited(dto.EmergencyContactName, 150, "Emergency Contact");
        entity.EmergencyContactPhone = Limited(dto.EmergencyContactPhone, 20, "Emergency Phone");

        entity.BranchId = dto.BranchId;
        entity.DepartmentId = dto.DepartmentId;
        entity.DesignationId = dto.DesignationId;
        entity.ShiftId = dto.ShiftId;

        // '' = the weekly holiday of everyone
        entity.WeeklyOffDays = HrCalendar.CleanOffDays(dto.WeeklyOffDays);

        string employmentType = Optional(dto.EmploymentType, EmploymentTypes, "Employment Type");

        entity.EmploymentType = employmentType.Length == 0 ? "Permanent" : employmentType;
        entity.JoiningDate = joining;
        entity.ConfirmationDate = confirmation;
        entity.UserProfileId = userProfileId;

        // Overtime : allowed needs an overtime structure. A profile
        // from before overtime structures (a typed rate, no
        // structure) stays as it is until a structure is picked.
        long? overtimeStructureId =
            dto.OvertimeAllowed && dto.OvertimeStructureId > 0 ? dto.OvertimeStructureId : null;

        if (overtimeStructureId != null
            && !await _context.Set<HrOvertimeStructures>().AsNoTracking()
                .AnyAsync(x => x.OvertimeStructureId == overtimeStructureId && !x.IsDeleted))
        {
            throw new InvalidOperationException("The overtime structure was not found : pick another one.");
        }

        bool oldTypedRate = entity.OvertimeStructureId == null && entity.OvertimeRate > 0;

        if (dto.OvertimeAllowed && overtimeStructureId == null && !oldTypedRate)
        {
            throw new InvalidOperationException("Overtime is allowed : pick the overtime structure.");
        }

        entity.OvertimeAllowed = dto.OvertimeAllowed;
        entity.OvertimeStructureId = overtimeStructureId;

        // the typed rate goes once a structure is picked (or overtime
        // is switched off)
        if (!dto.OvertimeAllowed || overtimeStructureId != null)
        {
            entity.OvertimeRate = 0;
        }
        entity.PaymentMode = paymentMode;
        entity.BankName = bankName;
        entity.BankAccountNo = bankAccount;
        entity.MfsName = mfsName;
        entity.MfsNo = mfsNo;

        entity.Remarks = Limited(dto.Remarks, 500, "Remarks");
        entity.IsActive = dto.IsActive;

        return (structureId, gross);
    }

    // The employee's salary lines are worked out from the gross
    // salary and the structure. A profile that never had a structure
    // and still has none keeps the lines it has (saved before salary
    // structures existed).
    private async Task ApplyStructureAsync(HrEmployees entity, long? structureId, decimal gross)
    {
        if (structureId == null && entity.SalaryStructureId == null)
        {
            return;
        }

        await SalaryStructuresRepository.ApplyToEmployeeAsync(_context, entity, structureId, gross);

        await _context.SaveChangesAsync();
    }

    private static string Summary(HrEmployees e) =>
        $"joined {Day(e.JoiningDate)}, {e.EmploymentType}, gross Tk {e.GrossSalary:#,0.##}.";

    public async Task<EmployeeDto> CreateAsync(EmployeeDto dto, long userId)
    {
        HrEmployees entity = new();

        (long? structureId, decimal gross) = await ApplyAsync(entity, dto);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        entity.Code = NextCode(await Employees.AsNoTracking().Select(x => x.Code).ToListAsync());
        entity.IsDeleted = false;
        entity.CreatedBy = userId;
        entity.CreatedDate = DateTime.UtcNow;

        Employees.Add(entity);

        await _context.SaveChangesAsync();

        await ApplyStructureAsync(entity, structureId, gross);

        AddHistory(entity.EmployeeId, "Create", "Employee Created", $"{entity.Code} {entity.FullName} : {Summary(entity)}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await ReadAsync(entity);
    }

    public async Task UpdateAsync(Guid publicId, EmployeeDto dto, long userId)
    {
        HrEmployees entity = await FindAsync(publicId);

        (long? structureId, decimal gross) = await ApplyAsync(entity, dto);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await ApplyStructureAsync(entity, structureId, gross);

        AddHistory(entity.EmployeeId, "Update", "Employee Updated", $"{entity.Code} {entity.FullName} : {Summary(entity)}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        HrEmployees entity = await FindAsync(publicId);

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity.EmployeeId, "Delete", "Employee Deleted", $"{entity.Code} {entity.FullName}", userId);

        await _context.SaveChangesAsync();
    }

    public async Task<string?> RestoreAsync(long userId)
    {
        HrEmployees? entity =
            await Employees.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (entity == null)
        {
            return null;
        }

        Guid self = entity.PublicId;

        if (entity.MobileNo.Length > 0
            && await Employees.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.MobileNo == entity.MobileNo && x.PublicId != self))
        {
            throw new InvalidOperationException($"{entity.Code} cannot be restored : Mobile No {entity.MobileNo} now belongs to another employee.");
        }

        if (entity.NationalId.Length > 0
            && await Employees.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.NationalId == entity.NationalId && x.PublicId != self))
        {
            throw new InvalidOperationException($"{entity.Code} cannot be restored : National ID {entity.NationalId} now belongs to another employee.");
        }

        // a login taken by another employee meanwhile is let go
        if (entity.UserProfileId != null
            && await Employees.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.UserProfileId == entity.UserProfileId && x.PublicId != self))
        {
            entity.UserProfileId = null;
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.EmployeeId, "Restore", "Employee Restored", $"{entity.Code} {entity.FullName}", userId);

        await _context.SaveChangesAsync();

        return entity.Code;
    }
}
