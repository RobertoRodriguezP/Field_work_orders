using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Api.Data.Entities;

namespace Api.Data.Configurations;

public class TaskItemConfig : IEntityTypeConfiguration<TaskItem>
{
    public void Configure(EntityTypeBuilder<TaskItem> eb)
    {
        eb.ToTable("tasks");
        eb.HasKey(x => x.Id);
        eb.Property(x => x.Title).IsRequired();
        eb.Property(x => x.Status).HasDefaultValue("Pending");
        eb.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
        eb.Property(x => x.UpdatedAt).HasDefaultValueSql("now()");
        eb.HasIndex(x => x.Status);
        eb.HasIndex(x => x.DueDate);
        eb.HasIndex(x => x.AssignedToSub);
    }
}
