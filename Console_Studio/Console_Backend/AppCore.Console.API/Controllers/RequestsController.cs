//===============================================================
// Website requests (demo / purchase) : api/requests
// --------------------------------------------------------------
// The inbox behind the Console "Requests" page :
//   GET  api/requests                     list (+ count of New)
//   GET  api/requests/{publicId}          one request
//   PUT  api/requests/{publicId}          status + staff notes
//   GET  api/requests/{publicId}/customer-matches
//                                         customers that look the same
//   POST api/requests/{publicId}/convert  make the Customer, or use
//                                         an existing one
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

// Convert (2026-11-20, review B5) : NewCustomer = make the customer
// from the request; CustomerPublicId = this request is from a
// customer the Console already has. One of the two is needed while
// the request has no customer.
public record SiteRequestConvert(bool? NewCustomer, Guid? CustomerPublicId);


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

    // Customers with the same phone, email or VAT number as the
    // request : shown before Convert, so a returning client is not
    // made twice (2026-11-20, review B5)
    [HttpGet("{publicId:guid}/customer-matches")]
    public async Task<IActionResult> CustomerMatches(Guid publicId)
    {
        SiteRequest? r = await _db.SiteRequests.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId);

        if (r is null)
        {
            return NotFound();
        }

        string phone = (r.Phone ?? string.Empty).Trim();
        string email = (r.Email ?? string.Empty).Trim().ToLower();
        string bin = (r.BinNo ?? string.Empty).Trim().ToLower();

        var rows =
            await _db.Customers.AsNoTracking()
                .Where(x =>
                    (phone != "" && x.Phone != null && x.Phone.Trim() == phone) ||
                    (email != "" && x.Email != null && x.Email.Trim().ToLower() == email) ||
                    (bin != "" && x.BinNo != null && x.BinNo.Trim().ToLower() == bin))
                .OrderBy(x => x.CustomerCode)
                .Select(x => new { x.PublicId, x.CustomerCode, x.DisplayName, x.Phone, x.Email, x.BinNo })
                .Take(10)
                .ToListAsync();

        return Ok(rows.Select(x => new
        {
            x.PublicId,
            x.CustomerCode,
            x.DisplayName,
            Same = string.Join(", ", new[]
            {
                phone != "" && x.Phone?.Trim() == phone ? "phone" : null,
                email != "" && x.Email?.Trim().ToLower() == email ? "email" : null,
                bin != "" && x.BinNo?.Trim().ToLower() == bin ? "VAT no." : null
            }.Where(v => v != null))
        }));
    }

    [HttpPost("{publicId:guid}/convert")]
    [Authorize(Roles = StaffRoles.ManageTenants)]
    public async Task<IActionResult> Convert(Guid publicId, [FromBody] SiteRequestConvert? body)
    {
        // One at a time per request (review B5) : the request row is
        // locked until this ends, so a double click or two staff
        // members make one customer; the second sees the first's.
        await using var tx = await _db.Database.BeginTransactionAsync();

        SiteRequest? r =
            await _db.SiteRequests
                .FromSqlInterpolated($"SELECT * FROM public.\"SiteRequests\" WHERE \"PublicId\" = {publicId} FOR UPDATE")
                .FirstOrDefaultAsync();

        if (r is null)
        {
            return NotFound();
        }

        Customer? customer =
            r.CustomerId is null ? null : await _db.Customers.FirstOrDefaultAsync(x => x.CustomerId == r.CustomerId);

        if (customer is null && r.Status == "Closed")
        {
            return BadRequest(new { message = "This request is Closed : it cannot be converted. Set its status back to New or Contacted first." });
        }

        if (customer is null && body?.CustomerPublicId is Guid existing)
        {
            // a customer the Console already has
            customer = await _db.Customers.FirstOrDefaultAsync(x => x.PublicId == existing);

            if (customer is null)
            {
                return BadRequest(new { message = "Pick the customer from the list." });
            }
        }
        else if (customer is null && body?.NewCustomer != true)
        {
            return BadRequest(new { message = "Choose first : a new customer, or a customer that is already in the Console." });
        }

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

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // nothing was saved : another request was converted at
                // the same moment and took the customer code
                return Conflict(new { message = "The customer was not made : another customer was created at the same moment. Press Convert again." });
            }

            _audit.Add("Customer.Create", "Customer", code, details: $"from {r.RequestNo}");
        }

        if (r.CustomerId != customer.CustomerId)
        {
            r.CustomerId = customer.CustomerId;
            r.Status = "Converted";
            r.ModifiedDate = DateTime.UtcNow;
            r.ModifiedBy = User.StaffId();

            _audit.Add("SiteRequest.Convert", "SiteRequest", r.RequestNo,
                details: body?.CustomerPublicId is null ? customer.CustomerCode : $"{customer.CustomerCode} (existing customer)");
        }

        await _db.SaveChangesAsync();

        await tx.CommitAsync();

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

            // what the client asked for on the website (review B4) :
            // put in the Register form, staff can change them
            MaxBranches = r.Branches,
            MaxUsers = r.Users,
            HostName = r.PreferredSubdomain is null ? $"{tenantCode.ToLowerInvariant()}.{PublicController.Domain}" : $"{r.PreferredSubdomain}.{PublicController.Domain}",
            Status = r.RequestType == "Demo" ? "Trial" : "Provisioning"
        });
    }
}
