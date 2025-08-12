namespace Api.Data.Entities;

public class TaskItem
{
    public int Id { get; set; }
    public string Title { get; set; } = default!;
    public string? Description { get; set; }
    public DateTimeOffset? DueDate { get; set; }
    public string Status { get; set; } = "Pending";
    public string CreatedBySub { get; set; } = default!;
    public string? AssignedToSub { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
