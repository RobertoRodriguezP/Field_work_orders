// src/Data/Configurations/TaskItemConfig.cs
using Api.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Api.Data.Configurations;

public class TaskItemConfig : IEntityTypeConfiguration<TaskItem>
{
    public void Configure(EntityTypeBuilder<TaskItem> b)
    {
        // TaskItemConfig.cs
        b.ToTable("tasks"); // minúscula
        b.Property(x => x.Id).HasColumnName("id");
        b.Property(x => x.Title).HasColumnName("title");
        b.Property(x => x.Description).HasColumnName("description");
        b.Property(x => x.Status).HasColumnName("status");
        b.Property(x => x.CreatedBySub).HasColumnName("created_by_sub");
        b.Property(x => x.AssignedToSub).HasColumnName("assigned_to_sub");
        b.Property(x => x.DueDate).HasColumnType("timestamp without time zone");
        b.Property(x => x.CreatedAt).HasColumnType("timestamp without time zone").HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
        b.Property(x => x.UpdatedAt).HasColumnType("timestamp without time zone").HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");
}
}
