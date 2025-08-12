using Microsoft.EntityFrameworkCore;
using Api.Data.Entities;

namespace Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> o) : base(o) { }

    public DbSet<TaskItem> Tasks => Set<TaskItem>();

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var e in ChangeTracker.Entries<TaskItem>())
            if (e.State == EntityState.Modified)
                e.Entity.UpdatedAt = DateTimeOffset.UtcNow;
        return base.SaveChangesAsync(ct);
    }

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<TaskItem>(eb =>
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
        });
    }
}
