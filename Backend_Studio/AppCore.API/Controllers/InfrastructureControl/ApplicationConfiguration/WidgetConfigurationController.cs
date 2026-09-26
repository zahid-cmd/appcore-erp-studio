//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using AppCore.Application.Common.ActivityHistory.DTOs;
using AppCore.Application.Common.ActivityHistory.Interfaces;

using AppCore.Application.InfrastructureControl.ApplicationConfiguration;
using AppCore.Application.InfrastructureControl.ApplicationConfiguration.WidgetConfiguration.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// Widget Configuration Controller
//===============================================================

[ApiController]

[Route("api/infrastructure-control/application-configuration/widget-configuration")]

public class WidgetConfigurationController
    : ControllerBase
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly IWidgetConfigurationRepository
        _repository;

    private readonly IActivityHistoryRepository
        _historyRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public WidgetConfigurationController
    (
        IWidgetConfigurationRepository repository,

        IActivityHistoryRepository historyRepository
    )
    {
        _repository =
            repository;

        _historyRepository =
            historyRepository;
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    [HttpGet("defaults")]

    public async Task
        <
            ActionResult<WidgetConfigurationDefaultsDto>
        >
        GetDefaults()
    {
        WidgetConfigurationDefaultsDto result =
            await _repository.GetDefaultsAsync();

        return Ok(
            result
        );
    }


    //===========================================================
    // Get All
    //===========================================================

    [HttpGet]

    public async Task
        <
            ActionResult<List<WidgetConfigurationDto>>
        >
        GetAll()
    {
        List<WidgetConfigurationDto> result =
            await _repository.GetAllAsync();

        return Ok(
            result
        );
    }


    //===========================================================
    // Get List History
    //===========================================================

    [HttpGet("history")]

    public async Task
        <
            ActionResult<List<ActivityHistoryDto>>
        >
        GetListHistory()
    {
        List<ActivityHistoryDto> history =
            await _historyRepository.GetListHistoryAsync
            (
                "Infrastructure Control",

                "Widget Configuration"
            );

        return Ok(
            history
        );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    [HttpGet("{id:long}")]

    public async Task
        <
            ActionResult<WidgetConfigurationDto>
        >
        GetById
        (
            long id
        )
    {
        WidgetConfigurationDto? result =
            await _repository.GetByIdAsync(
                id
            );

        if
        (
            result
            ==
            null
        )
        {
            return NotFound();
        }

        return Ok(
            result
        );
    }


    //===========================================================
    // Get By Dashboard Id
    //===========================================================

    [HttpGet("dashboard/{dashboardId:long}")]

    public async Task
        <
            ActionResult<WidgetConfigurationDto>
        >
        GetByDashboardId
        (
            long dashboardId
        )
    {
        WidgetConfigurationDto? result =
            await _repository.GetByDashboardIdAsync
            (
                dashboardId
            );

        if
        (
            result
            ==
            null
        )
        {
            return NotFound();
        }

        return Ok(
            result
        );
    }


    //===========================================================
    // Get Entity History
    //===========================================================

    [HttpGet("{id:long}/history")]

    public async Task
        <
            ActionResult<List<ActivityHistoryDto>>
        >
        GetHistory
        (
            long id
        )
    {
        List<ActivityHistoryDto> history =
            await _historyRepository.GetHistoryAsync
            (
                "Infrastructure Control",

                "Widget Configuration",

                id
            );

        return Ok(
            history
        );
    }


    //===========================================================
    // Create
    //===========================================================

    [HttpPost]

    public async Task<ActionResult<long>>
        Create
        (
            CreateWidgetConfigurationDto dto
        )
    {
        try
        {
            long id =
                await _repository.CreateAsync(
                    dto
                );

            return Ok(
                id
            );
        }
        catch
        (
            DbUpdateException ex
        )
        {
            //===================================================
            // Database Error
            //===================================================

            string message =
                ex.InnerException?.Message
                ??
                ex.Message;


            return StatusCode
            (
                StatusCodes.Status500InternalServerError,

                new
                {
                    success = false,

                    error =
                        "Database update failed.",

                    message =
                        message
                }
            );
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            //===================================================
            // Business / Validation Error
            //===================================================

            return BadRequest
            (
                new
                {
                    success = false,

                    error =
                        "Widget configuration validation failed.",

                    message =
                        ex.Message
                }
            );
        }
        catch
        (
            Exception ex
        )
        {
            //===================================================
            // General Error
            //===================================================

            string message =
                ex.InnerException?.Message
                ??
                ex.Message;


            return StatusCode
            (
                StatusCodes.Status500InternalServerError,

                new
                {
                    success = false,

                    error =
                        "Failed to create widget configuration.",

                    message =
                        message
                }
            );
        }
    }


    //===========================================================
    // Update
    //===========================================================

    [HttpPut]

    public async Task<IActionResult>
        Update
        (
            UpdateWidgetConfigurationDto dto
        )
    {
        try
        {
            bool updated =
                await _repository.UpdateAsync(
                    dto
                );

            if
            (
                !updated
            )
            {
                return NotFound();
            }

            return NoContent();
        }
        catch
        (
            DbUpdateException ex
        )
        {
            string message =
                ex.InnerException?.Message
                ??
                ex.Message;


            return StatusCode
            (
                StatusCodes.Status500InternalServerError,

                new
                {
                    success = false,

                    error =
                        "Database update failed.",

                    message =
                        message
                }
            );
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            return BadRequest
            (
                new
                {
                    success = false,

                    error =
                        "Widget configuration validation failed.",

                    message =
                        ex.Message
                }
            );
        }
        catch
        (
            Exception ex
        )
        {
            string message =
                ex.InnerException?.Message
                ??
                ex.Message;


            return StatusCode
            (
                StatusCodes.Status500InternalServerError,

                new
                {
                    success = false,

                    error =
                        "Failed to update widget configuration.",

                    message =
                        message
                }
            );
        }
    }


    //===========================================================
    // Delete
    //===========================================================

    [HttpDelete("{id:long}")]

    public async Task<IActionResult>
        Delete
        (
            long id
        )
    {
        try
        {
            bool deleted =
                await _repository.DeleteAsync(
                    id
                );

            if
            (
                !deleted
            )
            {
                return NotFound();
            }

            return NoContent();
        }
        catch
        (
            Exception ex
        )
        {
            string message =
                ex.InnerException?.Message
                ??
                ex.Message;


            return StatusCode
            (
                StatusCodes.Status500InternalServerError,

                new
                {
                    success = false,

                    error =
                        "Failed to delete widget configuration.",

                    message =
                        message
                }
            );
        }
    }


    //===========================================================
    // Restore Last Deleted
    //===========================================================

    [HttpPut("restore")]

    public async Task<IActionResult>
        Restore()
    {
        try
        {
            bool restored =
                await _repository.RestoreLastDeletedAsync();

            if
            (
                !restored
            )
            {
                return NotFound();
            }

            return NoContent();
        }
        catch
        (
            Exception ex
        )
        {
            string message =
                ex.InnerException?.Message
                ??
                ex.Message;


            return StatusCode
            (
                StatusCodes.Status500InternalServerError,

                new
                {
                    success = false,

                    error =
                        "Failed to restore widget configuration.",

                    message =
                        message
                }
            );
        }
    }
}