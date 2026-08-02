//===============================================================
// Namespaces
//===============================================================

using Microsoft.AspNetCore.Mvc;

using AppCore.Application.InfrastructureControl.NavigationManagement.Sidebar.Interfaces;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.API.Controllers.InfrastructureControl.NavigationManagement;

//===============================================================
// Sidebar Controller
//===============================================================

[ApiController]

[Route("api/infrastructure-control/navigation-management/sidebar")]

public class SidebarController : ControllerBase
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly ISidebarRepository _repository;

    //===========================================================
    // Constructor
    //===========================================================

    public SidebarController(
        ISidebarRepository repository)
    {
        _repository = repository;
    }

    //===========================================================
    // Get Sidebar
    //===========================================================

    [HttpGet]

    public async Task<IActionResult> GetSidebar()
    {
        var sidebar =
            await _repository.GetSidebarAsync();

        return Ok(sidebar);
    }

}