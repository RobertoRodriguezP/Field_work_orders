using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;

// auth
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;

namespace Api.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public class AuthController : ControllerBase
{

    [HttpGet("login")]
    [AllowAnonymous]
    public IActionResult Login([FromQuery] string? returnUrl = "/", [FromQuery] string? provider = null, [FromQuery] string? prompt = null)
    {
        var props = new AuthenticationProperties { RedirectUri = string.IsNullOrWhiteSpace(returnUrl) ? "/" : returnUrl };
        if (!string.IsNullOrWhiteSpace(provider))
        {
            props.Parameters["kc_idp_hint"] = provider;
            props.Items["kc_idp_hint"] = provider;
        }
        if (!string.IsNullOrWhiteSpace(prompt))
        {
            props.Parameters["prompt"] = prompt;
            props.Items["prompt"] = prompt;
        }
        return Challenge(props, OpenIdConnectDefaults.AuthenticationScheme);
    }


    [HttpGet("logout")]
    [AllowAnonymous]
    public IActionResult Logout([FromQuery] string? returnUrl = "/")
        => SignOut(new AuthenticationProperties { RedirectUri = string.IsNullOrWhiteSpace(returnUrl) ? "/" : returnUrl },
                   CookieAuthenticationDefaults.AuthenticationScheme,
                   OpenIdConnectDefaults.AuthenticationScheme);


    [HttpGet("me")]
    [Authorize(Policy = "read")]
    public IActionResult Me()
    {
        var u = HttpContext.User;
        var roles = new HashSet<string>(StringComparer.OrdinalIgnoreCase);


        foreach (var c in u.FindAll("roles")) roles.Add(c.Value);
        foreach (var c in u.FindAll(ClaimTypes.Role)) roles.Add(c.Value);

        void TryParseJsonClaim(string type, Action<JsonElement> handle)
        {
            var v = u.FindFirst(type)?.Value;
            if (string.IsNullOrEmpty(v)) return;
            try { using var doc = JsonDocument.Parse(v); handle(doc.RootElement); } catch {}
        }

        TryParseJsonClaim("realm_access", root => {
            if (root.TryGetProperty("roles", out var arr) && arr.ValueKind == JsonValueKind.Array)
                foreach (var x in arr.EnumerateArray())
                    roles.Add(x.GetString() ?? "");
        });

        TryParseJsonClaim("resource_access", root => {
            foreach (var client in new[] { "workops-api", "workops-spa" })
                if (root.TryGetProperty(client, out var ce) &&
                    ce.TryGetProperty("roles", out var arr) &&
                    arr.ValueKind == JsonValueKind.Array)
                    foreach (var x in arr.EnumerateArray())
                        roles.Add(x.GetString() ?? "");
        });

        var body = new
        {
            sub = u.FindFirst("sub")?.Value,
            preferred_username = u.FindFirst("preferred_username")?.Value ?? u.Identity?.Name,
            email = u.FindFirst("email")?.Value,
            roles = roles.Where(r => !string.IsNullOrWhiteSpace(r))
                         .Distinct(StringComparer.OrdinalIgnoreCase)
                         .OrderBy(r => r)
                         .ToArray()
        };
        return Ok(body);
    }


    [HttpGet("claims")]
    [Authorize(Policy = "read")]
    public IActionResult Claims()
    {
        var list = HttpContext.User.Claims
            .Select(c => new { type = c.Type, value = c.Value })
            .OrderBy(c => c.type)
            .ToList();
        return Ok(list);
    }


    public record RegisterDto(string Email, string FirstName, string? LastName);

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {

        await Task.CompletedTask;
        return Ok(new { message = "Account created / invitation sent" });
    }
}
