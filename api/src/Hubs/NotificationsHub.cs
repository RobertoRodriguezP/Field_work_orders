using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Api.Hubs;

[Authorize]
public class NotificationsHub : Hub
{
    public async Task Ping(string m) =>
        await Clients.Caller.SendAsync("status", $"pong: {m}");
}
