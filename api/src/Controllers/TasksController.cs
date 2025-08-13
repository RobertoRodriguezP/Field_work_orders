using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

using Api.Authorization;
using Api.Data;
using Api.Data.Entities;
using Api.Hubs;

namespace Api.Controllers;


[ApiController]
[Route("api/tasks")]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationsHub> _hub;

    public TasksController(AppDbContext db, IHubContext<NotificationsHub> hub)
    { _db = db; _hub = hub; }

    [HttpGet]
    [Authorize(Policy = Policies.CanRead)]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = _db.Tasks.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(t => t.Status == status);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(t => t.Id)
                           .Skip(Math.Max(0, (page - 1) * pageSize))
                           .Take(pageSize)
                           .ToListAsync();
        return Ok(new { total, items });
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = Policies.CanRead)]
    public async Task<IActionResult> Get(int id)
        => (await _db.Tasks.FindAsync(id)) is { } e ? Ok(e) : NotFound();

    [HttpPost]
    [Authorize(Policy = Policies.CanWrite)]
    public async Task<IActionResult> Create([FromBody] TaskItem input)
    {
        if (string.IsNullOrWhiteSpace(input.Title)) return BadRequest("Title required");
        input.Id = 0;
        input.CreatedBySub = User.FindFirst("sub")?.Value ?? "unknown";
        _db.Tasks.Add(input);
        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync("status", $"Task {input.Id} created");
        return CreatedAtAction(nameof(Get), new { id = input.Id }, input);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = Policies.CanWrite)]
    public async Task<IActionResult> Update(int id, [FromBody] TaskItem input)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return NotFound();

        if (input.Title is not null) task.Title = input.Title;
        if (input.Description is not null) task.Description = input.Description;
        if (input.DueDate.HasValue) task.DueDate = input.DueDate; 
        if (input.Status is not null) task.Status = input.Status;
        if (input.AssignedToSub is not null) task.AssignedToSub = input.AssignedToSub;

        await _db.SaveChangesAsync();
        return NoContent();
    }



    [HttpDelete("{id:int}")]
    [Authorize(Policy = Policies.Admin)]
    public async Task<IActionResult> Delete(int id)
    {
        var e = await _db.Tasks.FindAsync(id);
        if (e is null) return NotFound();
        _db.Tasks.Remove(e);
        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync("status", $"Task {id} deleted");
        return NoContent();
    }
}
