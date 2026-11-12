//===============================================================
// Products (industries) : api/products
//===============================================================

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Console.API.Data;

namespace AppCore.Console.API.Controllers;


[ApiController]
[Authorize]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly ControlDbContext _db;

    public ProductsController(ControlDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var tenants =
            await _db.Tenants
                .GroupBy(x => x.ProductId)
                .Select(g => new { ProductId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ProductId, x => x.Count);

        var modules =
            await _db.ProductModules
                .GroupBy(x => x.ProductId)
                .Select(g => new { ProductId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.ProductId, x => x.Count);

        var products =
            await _db.Products
                .OrderBy(x => x.DisplayOrder)
                .ToListAsync();

        return Ok(products.Select(x => new
        {
            x.PublicId,
            x.ProductCode,
            x.ProductName,
            x.Industry,
            x.Description,
            x.Status,
            Tenants = tenants.GetValueOrDefault(x.ProductId),
            Modules = modules.GetValueOrDefault(x.ProductId)
        }));
    }
}
