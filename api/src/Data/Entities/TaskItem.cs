// src/Data/Entities/TaskItem.cs
namespace Api.Data.Entities;

public class TaskItem
{
    public int Id { get; set; }

    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public DateTime? DueDate { get; set; }

    // "Pending" | "In Progress" | "Done"
    public string Status { get; set; } = "Pending";

    // sub del creador/asignado (para mapear con Keycloak)
    public string? CreatedBySub { get; set; }
    public string? AssignedToSub { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
