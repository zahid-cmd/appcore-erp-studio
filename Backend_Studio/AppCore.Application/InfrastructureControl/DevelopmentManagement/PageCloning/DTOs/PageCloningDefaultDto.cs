
//===============================================================
// Namespaces
//===============================================================

namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;

//===============================================================
// Page Cloning Default DTO
//===============================================================

public class PageCloningDefaultDto
{
    //===========================================================
    // Cloning Configuration
    //===========================================================

    public string CloningType { get; set; } = "Page";

    public int NumberOfFiles { get; set; } = 15;

    public string Operation { get; set; } = "Clone";

    public string Status { get; set; } = "Pending";

    public bool IsActive { get; set; } = true;
}
