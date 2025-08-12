using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Api.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    [HttpGet("me")]
    [Authorize(Policy = "read")]
    [ProducesResponseType(typeof(object), 200)]
    [ProducesResponseType(typeof(object), 401)]
    public IActionResult Me()
    {
        var user = HttpContext.User;

        var roles = user.FindAll("roles").Select(c => c.Value).ToArray();
        // a veces Keycloak usa "roles", otras "role"/ClaimTypes.Role, nos quedamos con ambos
        roles = roles.Concat(user.FindAll(ClaimTypes.Role).Select(c => c.Value)).Distinct().ToArray();

        var username = user.FindFirst("preferred_username")?.Value
                       ?? user.Identity?.Name
                       ?? "unknown";

        var body = new
        {
            message = $"Hola {username}, autenticación OK ✅",
            sub = user.FindFirst("sub")?.Value,
            preferred_username = username,
            email = user.FindFirst("email")?.Value,
            roles
        };

        return Ok(body);
    }
}
