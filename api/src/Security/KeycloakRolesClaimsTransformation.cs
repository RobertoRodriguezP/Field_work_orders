using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;

namespace Api.Security;

public sealed class KeycloakRolesClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity id || !id.IsAuthenticated)
            return Task.FromResult(principal);

        // ¿Ya hay roles útiles? (roles o ClaimTypes.Role)
        var hasUsefulRoles =
            id.FindFirst(id.RoleClaimType) is not null ||
            id.FindFirst(ClaimTypes.Role)   is not null ||
            id.FindFirst("roles")           is not null;

        // Siempre intentamos aplanar (idempotente): evitamos duplicados
        var existing = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var c in id.FindAll(id.RoleClaimType)) existing.Add(c.Value);
        foreach (var c in id.FindAll(ClaimTypes.Role))  existing.Add(c.Value);
        foreach (var c in id.FindAll("roles"))          existing.Add(c.Value);

        void AddRole(string? role)
        {
            if (string.IsNullOrWhiteSpace(role)) return;
            if (existing.Add(role))
            {
                // Para IsInRole (usa id.RoleClaimType) y para librerías que usan ClaimTypes.Role
                id.AddClaim(new Claim("roles", role));
                id.AddClaim(new Claim(ClaimTypes.Role, role));
            }
        }

        // 1) realm_access.roles (JSON)
        var realmAccess = id.FindFirst("realm_access")?.Value;
        if (!string.IsNullOrEmpty(realmAccess))
        {
            try
            {
                using var doc = JsonDocument.Parse(realmAccess);
                if (doc.RootElement.TryGetProperty("roles", out var arr) && arr.ValueKind == JsonValueKind.Array)
                    foreach (var r in arr.EnumerateArray()) AddRole(r.GetString());
            }
            catch { /* ignore parse errors */ }
        }

        // 2) resource_access.{client}.roles (JSON)
        var resourceAccess = id.FindFirst("resource_access")?.Value;
        if (!string.IsNullOrEmpty(resourceAccess))
        {
            try
            {
                using var doc = JsonDocument.Parse(resourceAccess);
                foreach (var clientName in doc.RootElement.EnumerateObject())
                {
                    if (clientName.Value.TryGetProperty("roles", out var arr) && arr.ValueKind == JsonValueKind.Array)
                        foreach (var r in arr.EnumerateArray()) AddRole(r.GetString());
                }
            }
            catch { /* ignore */ }
        }

        return Task.FromResult(principal);
    }
}
