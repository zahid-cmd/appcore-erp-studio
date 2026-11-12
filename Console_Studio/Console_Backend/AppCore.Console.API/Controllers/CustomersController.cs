//===============================================================
// Customers (the businesses we serve) : api/customers
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Console.API.Data;
using AppCore.Console.API.Security;

namespace AppCore.Console.API.Controllers;


public record CustomerSave(
    string LegalName,
    string? DisplayName,
    string? Phone,
    string? Email,
    string? Address,
    string? Country,
    string? BinNo,
    string? TinNo,
    string? Remarks,
    string? Status);


[ApiController]
[Authorize]
[Route("api/customers")]
public class CustomersController : ControllerBase
{
    private readonly ControlDbContext _db;
    private readonly Audit _audit;

    public CustomersController(ControlDbContext db, Audit audit)
    {
        _db = db;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search)
    {
        IQueryable<Customer> query = _db.Customers;

        if (!string.IsNullOrWhiteSpace(search))
        {
            string s = $"%{search.Trim()}%";

            query = query.Where(x =>
                EF.Functions.ILike(x.CustomerCode, s) ||
                EF.Functions.ILike(x.LegalName, s) ||
                EF.Functions.ILike(x.DisplayName, s) ||
                EF.Functions.ILike(x.Phone ?? "", s));
        }

        var rows =
            await query
                .OrderBy(x => x.DisplayName)
                .Select(x => new
                {
                    x.PublicId,
                    x.CustomerCode,
                    x.LegalName,
                    x.DisplayName,
                    x.Phone,
                    x.Email,
                    x.Status,
                    Tenants = _db.Tenants.Count(t => t.CustomerId == x.CustomerId)
                })
                .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("{publicId:guid}")]
    public async Task<IActionResult> Get(Guid publicId)
    {
        Customer? x = await _db.Customers.FirstOrDefaultAsync(c => c.PublicId == publicId);

        return x is null ? NotFound() : Ok(x);
    }

    [HttpPost]
    [Authorize(Roles = StaffRoles.ManageTenants)]
    public async Task<IActionResult> Create([FromBody] CustomerSave request)
    {
        if (Problem(request) is string problem)
        {
            return BadRequest(new { message = problem });
        }

        int next = await _db.Customers.CountAsync() + 1;

        string code;

        do
        {
            code = $"CUS-{next:0000}";
            next++;
        }
        while (await _db.Customers.AnyAsync(x => x.CustomerCode == code));

        Customer customer = new()
        {
            CustomerCode = code,
            CreatedBy = User.StaffId()
        };

        Apply(customer, request);

        _db.Customers.Add(customer);

        _audit.Add("Customer.Create", "Customer", code);

        await _db.SaveChangesAsync();

        return Ok(new { customer.PublicId, customer.CustomerCode });
    }

    [HttpPut("{publicId:guid}")]
    [Authorize(Roles = StaffRoles.ManageTenants)]
    public async Task<IActionResult> Update(Guid publicId, [FromBody] CustomerSave request)
    {
        Customer? customer = await _db.Customers.FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (customer is null)
        {
            return NotFound();
        }

        if (Problem(request) is string problem)
        {
            return BadRequest(new { message = problem });
        }

        Apply(customer, request);

        customer.ModifiedDate = DateTime.UtcNow;
        customer.ModifiedBy = User.StaffId();

        _audit.Add("Customer.Update", "Customer", customer.CustomerCode);

        await _db.SaveChangesAsync();

        return Ok();
    }

    private static string? Problem(CustomerSave r)
    {
        if (string.IsNullOrWhiteSpace(r.LegalName))
        {
            return "Legal name is required.";
        }

        if (r.Status is not null && r.Status is not ("Active" or "Inactive"))
        {
            return "Status must be Active or Inactive.";
        }

        return null;
    }

    private static void Apply(Customer c, CustomerSave r)
    {
        c.LegalName = r.LegalName.Trim();
        c.DisplayName = string.IsNullOrWhiteSpace(r.DisplayName) ? c.LegalName : r.DisplayName.Trim();
        c.Phone = Clean(r.Phone);
        c.Email = Clean(r.Email);
        c.Address = Clean(r.Address);
        c.Country = Clean(r.Country) ?? c.Country;
        c.BinNo = Clean(r.BinNo);
        c.TinNo = Clean(r.TinNo);
        c.Remarks = Clean(r.Remarks);
        c.Status = r.Status ?? c.Status;
    }

    private static string? Clean(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
