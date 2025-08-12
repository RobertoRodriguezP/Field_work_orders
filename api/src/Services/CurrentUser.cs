using System.Security.Claims;

namespace Api.Services;

public class CurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _ctx;
    public CurrentUser(IHttpContextAccessor ctx) { _ctx = ctx; }

    public string? Sub => _ctx.HttpContext?.User.FindFirstValue("sub");
    public string? Username =>
        _ctx.HttpContext?.User.FindFirstValue("preferred_username")
        ?? _ctx.HttpContext?.User.Identity?.Name;

    public bool IsInRole(string role)
    {
        var roles = _ctx.HttpContext?.User.FindAll("roles").Select(c => c.Value).ToArray()
                    ?? Array.Empty<string>();
        return roles.Contains(role, StringComparer.OrdinalIgnoreCase);
    }
}
