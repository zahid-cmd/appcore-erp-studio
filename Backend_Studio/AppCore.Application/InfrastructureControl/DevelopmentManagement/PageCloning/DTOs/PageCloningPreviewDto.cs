namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;

public class PageCloningPreviewDto
{
    public long PageCloningId { get; set; }
    public List<PageCloningFileChangeDto> Files { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}