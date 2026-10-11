namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;

public class PageCloningFileChangeDto
{
    public string LogicalKey { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string Before { get; set; } = string.Empty;
    public string After { get; set; } = string.Empty;
    public bool EditedSinceBaseline { get; set; }
}