//===============================================================
// Website requests (demo / purchase) : api/requests
// --------------------------------------------------------------
// The inbox behind the Console "Requests" page :
//   GET  api/requests                     list (+ count of New)
//   GET  api/requests/{publicId}          one request
//   PUT  api/requests/{publicId}          status + staff notes
//   POST api/requests/{publicId}/convert  make the Customer
// After converting, the Console opens Register tenant filled in
// from the request (product, code, web address).
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Console.API.Data;
using AppCore.Console.API.Security;

namespace AppCore.Console.API.Controllers;


public record SiteRequestUpdate(string Status, string? StaffNotes);


[ApiController]
[Authorize]
[Route("api/requests")]
public class RequestsController : ControllerBase
{
    public static readonly string[] Statuses = ["New", "Contacted", "DemoBooked", "Converted", "Closed"];

    private readonly ControlDbContext _db;
    private readonly Audit _audit;

    public RequestsController(ControlDbContext db, Audit audit)
    {
        _db = db;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var rows =
            await (
                from r in _db.SiteRequests
                join p in _db.Products on r.ProductCode equals p.ProductCode into pj
                from p in pj.DefaultIfEmpty()
                orderby r.CreatedDate descending
                select new
                {
                    r.PublicId,
                    r.RequestNo,
                    r.RequestType,
                    r.ProductCode,
                    ProductName = p != null ? p.ProductName : r.ProductCode,
                    r.LegalName,
                    r.ContactName,
                    r.Phone,
                    r.Email,
                    r.City,
                    r.Country,
                    r.PreferredDate,
                    r.Status,
                    r.CreatedDate
                })
                .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("new-count")]
    public async Task<IActionResult> NewCount()
        => Ok(new { Count = await _db.SiteRequests.CountAsync(x => x.Status == "New") });

    [HttpGet("{publicId:guid}")]
    public async Task<IActionResult> Get(Guid publicId)
    {
        SiteRequest? r = await _db.SiteRequests.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (r is null)
        {
            return NotFound();
        }

        string? productName = await _db.Products.Where(x => x.ProductCode == r.ProductCode).Select(x => x.ProductName).FirstOrDefaultAsync();

        var customer =
            r.CustomerId is null
                ? null
                : await _db.Customers.Where(x => x.CustomerId == r.CustomerId).Select(x => new { x.PublicId, x.CustomerCode, x.DisplayName }).FirstOrDefaultAsync();

        return Ok(new
        {
            r.PublicId,
            r.RequestNo,
            r.RequestType,
            r.ProductCode,
            ProductName = productName ?? r.ProductCode,
            r.LegalName,
            r.DisplayName,
            r.BinNo,
            r.TinNo,
            r.Address,
            r.City,
            r.Country,
            r.ContactName,
            r.Designation,
            r.Phone,
            r.Email,
            r.Branches,
            r.Users,
            r.PreferredSubdomain,
            PreferredHost = r.PreferredSubdomain is null ? null : $"{r.PreferredSubdomain}.{PublicController.Domain}",
            r.PreferredDate,
            r.PreferredTime,
            r.Message,
            r.HeardFrom,
            r.Status,
            r.StaffNotes,
            r.IpAddress,
            r.CreatedDate,
            r.ModifiedDate,
            CustomerPublicId = customer?.PublicId,
            CustomerCode = customer?.CustomerCode,
            CustomerName = customer?.DisplayName
        });
    }

    [HttpPut("{publicId:guid}")]
    public async Task<IActionResult> Update(Guid publicId, [FromBody] SiteRequestUpdate body)
    {
        SiteRequest? r = await _db.SiteRequests.FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (r is null)
        {
            return NotFound();
        }

        if (!Statuses.Contains(body.Status))
        {
            return BadRequest(new { message = "Unknown status." });
        }

        if (body.Status == "Converted" && r.CustomerId is null)
        {
            return BadRequest(new { message = "Use Convert to customer to mark it Converted." });
        }

        r.Status = body.Status;
        r.StaffNotes = string.IsNullOrWhiteSpace(body.StaffNotes) ? null : body.StaffNotes.Trim();
        r.ModifiedDate = DateTime.UtcNow;
        r.ModifiedBy = User.StaffId();

        _audit.Add("SiteRequest.Update", "SiteRequest", r.RequestNo, details: r.Status);

        await _db.SaveChangesAsync();

        return Ok();
    }

    [HttpPost("{publicId:guid}/convert")]
    [Authorize(Roles = StaffRoles.ManageTenants)]
    public async Task<IActionResult> Convert(Guid publicId)
    {
        SiteRequest? r = await _db.SiteRequests.FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (r is null)
        {
            return NotFound();
        }

        Customer? customer =
            r.CustomerId is null ? null : await _db.Customers.FirstOrDefaultAsync(x => x.CustomerId == r.CustomerId);

        if (customer is null)
        {
            int next = await _db.Customers.CountAsync() + 1;

            string code;

            do
            {
                code = $"CUS-{next:0000}";
                next++;
            }
            while (await _db.Customers.AnyAsync(x => x.CustomerCode == code));

            customer = new Customer
            {
                CustomerCode = code,
                LegalName = r.LegalName,
                DisplayName = r.DisplayName ?? r.LegalName,
                Phone = r.Phone,
                Email = r.Email,
                Address = string.Join(", ", new[] { r.Address, r.City }.Where(x => !string.IsNullOrWhiteSpace(x))) is { Length: > 0 } a ? a : null,
                Country = r.Country ?? "Bangladesh",
                BinNo = r.BinNo,
                TinNo = r.TinNo,
                Remarks = $"From website request {r.RequestNo} : contact {r.ContactName}{(r.Designation is null ? "" : $" ({r.Designation})")}",
                CreatedBy = User.StaffId()
            };

            _db.Customers.Add(customer);

            await _db.SaveChangesAsync();

            _audit.Add("Customer.Create", "Customer", code, details: $"from {r.RequestNo}");
        }

        r.CustomerId = customer.CustomerId;
        r.Status = "Converted";
        r.ModifiedDate = DateTime.UtcNow;
        r.ModifiedBy = User.StaffId();

        _audit.Add("SiteRequest.Convert", "SiteRequest", r.RequestNo, details: customer.CustomerCode);

        await _db.SaveChangesAsync();

        // for the Register tenant form
        string tenantCode =
            (r.PreferredSubdomain ?? new string((r.DisplayName ?? r.LegalName).Where(char.IsLetterOrDigit).ToArray()))
                .ToUpperInvariant();

        if (tenantCode.Length > 30)
        {
            tenantCode = tenantCode[..30];
        }

        return Ok(new
        {
            CustomerPublicId = customer.PublicId,
            customer.CustomerCode,
            CustomerName = customer.DisplayName,
            r.ProductCode,
            TenantCode = tenantCode,
            DisplayName = r.DisplayName ?? r.LegalName,
            HostName = r.PreferredSubdomain is null ? $"{tenantCode.ToLowerInvariant()}.{PublicController.Domain}" : $"{r.PreferredSubdomain}.{PublicController.Domain}",
            Status = r.RequestType == "Demo" ? "Trial" : "Provisioning"
        });
    }
}
