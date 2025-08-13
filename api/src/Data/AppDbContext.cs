// src/Data/AppDbContext.cs
using Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<TaskItem> Tasks => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        static DateTime ToUtcUnspecified(DateTime d)
        {
            // Llevamos el clock a UTC y lo marcamos Unspecified (UTC "naive" para timestamp)
            var utc = d.Kind switch
            {
                DateTimeKind.Utc => d,
                DateTimeKind.Local => d.ToUniversalTime(),
                DateTimeKind.Unspecified => d // asumimos que ya viene en UTC "naive"
            };
            return DateTime.SpecifyKind(utc, DateTimeKind.Unspecified);
        }

        foreach (var e in ChangeTracker.Entries<TaskItem>())
        {
            var ent = e.Entity;

            if (ent.DueDate.HasValue)
                ent.DueDate = ToUtcUnspecified(ent.DueDate.Value);

            if (e.State == EntityState.Added)
                ent.CreatedAt = ToUtcUnspecified(DateTime.UtcNow);

            ent.UpdatedAt = ToUtcUnspecified(DateTime.UtcNow);
        }

        return base.SaveChangesAsync(ct);
    }

}
