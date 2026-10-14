namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;

public class PageCloningResultDto
{
    public bool Success { get; set; }
    public List<string> Messages { get; set; } = new();
    public string BuildOutput { get; set; } = string.Empty;
    public string RunStatus { get; set; } = string.Empty;
    public long PageCloningId { get; set; }
}