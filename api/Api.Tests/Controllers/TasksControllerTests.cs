using System.Security.Claims;
using Api.Controllers;
using Api.Data;
using Api.Data.Entities;
using Api.Hubs;
using Api.Tests.TestHelpers;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace Api.Tests.Controllers;

public class TasksControllerTests
{
    private static (TasksController ctrl, AppDbContext db, Mock<IHubContext<NotificationsHub>> hubMock, Mock<IClientProxy> clientsAllMock)
        CreateControllerWithContext(IEnumerable<Claim>? claims = null)
    {
        var db = InMemoryDbHelper.CreateDb();

        var clientsAllMock = new Mock<IClientProxy>();
        clientsAllMock
            .Setup(c => c.SendCoreAsync("status", It.IsAny<object?[]>(), default))
            .Returns(Task.CompletedTask);

        var clients = new Mock<IHubClients>();
        clients.Setup(c => c.All).Returns(clientsAllMock.Object);

        var hubMock = new Mock<IHubContext<NotificationsHub>>();
        hubMock.Setup(h => h.Clients).Returns(clients.Object);

        var ctrl = new TasksController(db, hubMock.Object);

        if (claims != null)
        {
            var ctx = new Microsoft.AspNetCore.Http.DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
            };
            ctrl.ControllerContext = new ControllerContext { HttpContext = ctx };
        }

        return (ctrl, db, hubMock, clientsAllMock);
    }

    [Fact]
    public async Task List_returns_filtered_and_paged()
    {
        var (ctrl, db, _, _) = CreateControllerWithContext();

        db.Tasks.AddRange(new[]
        {
            new TaskItem { Title = "A", Status = "Pending" },
            new TaskItem { Title = "B", Status = "Done" },
            new TaskItem { Title = "C", Status = "Pending" },
        });
        await db.SaveChangesAsync();

        var action = await ctrl.List(status: "Pending", page: 1, pageSize: 10) as OkObjectResult;

        action.Should().NotBeNull();
        dynamic body = action!.Value!;
        int total = body.total;
        IEnumerable<TaskItem> items = body.items;

        total.Should().Be(2);
        items.Should().OnlyContain(t => t.Status == "Pending");
    }

    [Fact]
    public async Task Create_sets_createdBySub_and_broadcasts()
    {
        var (ctrl, db, _, clientsAllMock) = CreateControllerWithContext(new[]
        {
            new Claim("sub", "user-xyz")
        });

        var input = new TaskItem { Title = "New task", Description = "desc" };

        var result = await ctrl.Create(input) as CreatedAtActionResult;

        result.Should().NotBeNull();
        result!.ActionName.Should().Be(nameof(TasksController.Get));
        var saved = (TaskItem)result.Value!;
        saved.Id.Should().BeGreaterThan(0);
        saved.CreatedBySub.Should().Be("user-xyz");

        // verificamos que se emitió por SignalR
        clientsAllMock.Verify(
            c => c.SendCoreAsync("status",
                                 It.Is<object?[]>(args => args.Length == 1 && args[0]!.ToString()!.Contains("created")),
                                 default),
            Times.Once);
    }

    [Fact]
    public async Task Update_modifies_fields()
    {
        var (ctrl, db, _, _) = CreateControllerWithContext();
        var task = new TaskItem { Title = "Old", Status = "Pending" };
        db.Tasks.Add(task);
        await db.SaveChangesAsync();

        var input = new TaskItem { Title = "New", Status = "Done", Description = "Updated" };

        var result = await ctrl.Update(task.Id, input);

        (result as NoContentResult).Should().NotBeNull();

        var updated = await db.Tasks.SingleAsync(t => t.Id == task.Id);
        updated.Title.Should().Be("New");
        updated.Status.Should().Be("Done");
        updated.Description.Should().Be("Updated");
    }

    [Fact]
    public async Task Delete_returns_notfound_when_missing()
    {
        var (ctrl, db, _, _) = CreateControllerWithContext();

        var result = await ctrl.Delete(999);

        (result as NotFoundResult).Should().NotBeNull();
    }
}
