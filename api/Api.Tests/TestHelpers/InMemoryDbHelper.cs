using Microsoft.EntityFrameworkCore;
using Api.Data;

namespace Api.Tests.TestHelpers;

public static class InMemoryDbHelper
{
    public static AppDbContext CreateDb(string? dbName = null)
    {
        var opts = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
            .EnableSensitiveDataLogging()
            .Options;

        return new AppDbContext(opts);
    }
}
