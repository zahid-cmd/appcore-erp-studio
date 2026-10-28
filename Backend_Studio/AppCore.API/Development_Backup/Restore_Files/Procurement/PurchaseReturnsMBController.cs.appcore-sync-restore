//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.Procurement.MotorBikePurchase;

using AppCore.Domain.Entities.Procurement.MotorBikePurchase;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Api.Controllers.Procurement.MotorBikePurchase;


//===============================================================
// PurchaseReturnsMbController
//===============================================================

[ApiController]

[Route("api/procurement/motor-bike-purchase/purchase-returns-mb")]

public class PurchaseReturnsMbController
    : ControllerBase
{
    //===========================================================
    // Repository
    //===========================================================

    private readonly IPurchaseReturnsMbRepository _repository;


    //===========================================================
    // Constructor
    //===========================================================

    public PurchaseReturnsMbController
    (
        IPurchaseReturnsMbRepository repository
    )
    {
        _repository =
            repository;
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task<IActionResult> GetAll()
    {
        var entities =
            await _repository
                .GetAllAsync();


        return Ok(
            entities
        );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task<IActionResult> GetById
    (
        long id
    )
    {
        var entity =
            await _repository
                .GetByIdAsync(
                    id
                );


        if
        (
            entity is null
        )
        {
            return NotFound();
        }


        return Ok(
            entity
        );
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<IActionResult> Create
    (
        [FromBody]
        CreatePurchaseReturnsMbDto dto
    )
    {
        var entity =
            new PurchaseReturnsMb
            {
                Name =
                    dto.Name,

                SampleSearchDropdownId =
                    dto.SampleSearchDropdownId,

                SampleField =
                    dto.SampleField,

                Status =
                    dto.Status,

                Remarks =
                    dto.Remarks
            };


        var id =
            await _repository
                .CreateAsync(
                    entity
                );


        return Ok(
            id
        );
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut("{id:long}")]

    public async Task<IActionResult> Update
    (
        long id,

        [FromBody]
        UpdatePurchaseReturnsMbDto dto
    )
    {
        if
        (
            id != dto.Id
        )
        {
            return BadRequest();
        }


        var entity =
            await _repository
                .GetByIdAsync(
                    id
                );


        if
        (
            entity is null
        )
        {
            return NotFound();
        }


        entity.Name =
            dto.Name;


        entity.SampleSearchDropdownId =
            dto.SampleSearchDropdownId;


        entity.SampleField =
            dto.SampleField;


        entity.Status =
            dto.Status;


        entity.Remarks =
            dto.Remarks;


        await _repository
            .UpdateAsync(
                entity
            );


        return NoContent();
    }


    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult> Delete
    (
        long id
    )
    {
        var entity =
            await _repository
                .GetByIdAsync(
                    id
                );


        if
        (
            entity is null
        )
        {
            return NotFound();
        }


        await _repository
            .DeleteAsync(
                id
            );


        return NoContent();
    }


    //===========================================================
    // Restore
    //===========================================================

    [HttpPut("{id:long}/restore")]

    public async Task<IActionResult> Restore
    (
        long id
    )
    {
        await _repository
            .RestoreAsync(
                id
            );


        return NoContent();
    }


    //===========================================================
    // Get History
    //===========================================================

    [HttpGet("history")]

    public async Task<IActionResult> GetHistory()
    {
        var history =
            await _repository
                .GetHistoryAsync();


        return Ok(
            history
        );
    }


    //===========================================================
    // Get Entity History
    //===========================================================

    [HttpGet("{id:long}/history")]

    public async Task<IActionResult> GetEntityHistory
    (
        long id
    )
    {
        var history =
            await _repository
                .GetEntityHistoryAsync(
                    id
                );


        return Ok(
            history
        );
    }
}