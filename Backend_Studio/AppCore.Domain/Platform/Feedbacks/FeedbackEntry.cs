//===============================================================
// Feedback (2026-11-09)
//
// Sent from the topbar Feedback button by any signed-in user;
// seen by developers only (Developer role).
//===============================================================

namespace AppCore.Domain.Platform.Feedbacks;

public class FeedbackEntry
{
    public long FeedbackId { get; set; }

    public Guid PublicId { get; set; } = Guid.NewGuid();

    // Bug / Idea / Question / Praise
    public string Kind { get; set; } = "Bug";

    public string Message { get; set; } = string.Empty;

    // /uploads/feedback/xxx.jpg ('' = none)
    public string ScreenshotPath { get; set; } = string.Empty;

    // where it was sent from (added by the app)
    public string PageUrl { get; set; } = string.Empty;

    public string PageTitle { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string AppVersion { get; set; } = string.Empty;

    // who sent it
    public long UserProfileId { get; set; }

    public string UserName { get; set; } = string.Empty;

    // New / In progress / Done
    public string Status { get; set; } = "New";

    // private to developers
    public string DeveloperNote { get; set; } = string.Empty;

    // the answer the sender sees ("My feedback" + bell)
    public string ReplyToUser { get; set; } = string.Empty;

    public string HandledByName { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
