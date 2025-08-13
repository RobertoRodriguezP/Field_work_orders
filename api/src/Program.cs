// Program.cs
using System.Net.Http;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;




builder.Services.AddDbContext<Api.Data.AppDbContext>(o =>
    o.UseNpgsql(cfg.GetConnectionString("Default"))
     .UseSnakeCaseNamingConvention()
);


var allowedOrigins = cfg.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? new[] { "http://localhost:5173", "http://localhost:8085" };

builder.Services.AddCors(o =>
{
    o.AddPolicy("default", p =>
        p.WithOrigins(allowedOrigins)
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials());
});


string publicAuthority = cfg["Auth:Authority"] ?? "http://keycloak:8080/realms/workops";
string metadataBase    = cfg["Auth:MetadataBase"] ?? "http://keycloak:8080";
bool validateAudience  = bool.TryParse(cfg["Auth:ValidateAudience"], out var va) ? va : true;
string expectedAud     = cfg["Auth:Audience"] ?? "workops-api";
string clientId        = cfg["Auth:ClientId"] ?? "workops-api";
string clientSecret    = cfg["Auth:ClientSecret"] ?? "dev-secret";


System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.DefaultMapInboundClaims = false;

builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = "Smart";
    options.DefaultChallengeScheme = "Smart";
  //options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
})
.AddPolicyScheme("Smart", "Smart scheme", options =>
{
    options.ForwardDefaultSelector = ctx =>
     {

        if (ctx.Request.Headers.ContainsKey("Authorization"))
            return JwtBearerDefaults.AuthenticationScheme;
        var isApi = ctx.Request.Path.StartsWithSegments("/api");
        var isJson = ctx.Request.Headers.Accept.Any(h => h.Contains("application/json", StringComparison.OrdinalIgnoreCase));
        var isXhr = string.Equals(ctx.Request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.OrdinalIgnoreCase);

        return (isApi || isJson || isXhr)
            ? JwtBearerDefaults.AuthenticationScheme
            : CookieAuthenticationDefaults.AuthenticationScheme;
    };
      //ctx.Request.Headers.ContainsKey("Authorization")
      //    ? JwtBearerDefaults.AuthenticationScheme
      //    : CookieAuthenticationDefaults.AuthenticationScheme;
})
.AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, o =>
{
  o.Cookie.Name = "workops.auth";
  o.SlidingExpiration = true;
  o.Events = new CookieAuthenticationEvents
  {
    OnRedirectToLogin = ctx =>
    {

      if (IsApiRequest(ctx.Request))
      {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        ctx.Response.ContentType = "application/json";
        return ctx.Response.WriteAsync(JsonSerializer.Serialize(new { error = "unauthorized", message = "No autenticado." }));
      }
      ctx.Response.Redirect(ctx.RedirectUri);
      return Task.CompletedTask;
    }
  };
})
.AddOpenIdConnect(OpenIdConnectDefaults.AuthenticationScheme, o =>
{
  o.Authority = publicAuthority;
  o.MetadataAddress = $"{metadataBase.TrimEnd('/')}/realms/{GetRealm(publicAuthority)}/.well-known/openid-configuration";
  o.RequireHttpsMetadata = false;

  o.ClientId = clientId;
  o.ClientSecret = clientSecret;
  o.ResponseType = "code";
  o.SaveTokens = true;
  o.GetClaimsFromUserInfoEndpoint = true;

  o.Scope.Clear();
  o.Scope.Add("openid");
  o.Scope.Add("profile");
  o.Scope.Add("email");
  o.Scope.Add("roles");

  o.TokenValidationParameters = new TokenValidationParameters
  {
    NameClaimType = "preferred_username",
    RoleClaimType = "roles",
    ValidateIssuer = true,
    ValidIssuer = publicAuthority,
    ValidateAudience = validateAudience,
    ValidAudience = expectedAud
  };

  o.BackchannelHttpHandler = new KeycloakBackchannelRewriteHandler("http://localhost:8080", metadataBase)
  {
    InnerHandler = new HttpClientHandler()
  };


  o.Events = new OpenIdConnectEvents
{
    OnTokenValidated = ctx =>
    {
        var id = (ClaimsIdentity)ctx.Principal!.Identity!;
        var add = new List<Claim>();

        void AddRolesFromJwt(System.IdentityModel.Tokens.Jwt.JwtSecurityToken jwt)
        {

            var realmAccess = jwt.Claims.FirstOrDefault(c => c.Type == "realm_access")?.Value;
            if (!string.IsNullOrEmpty(realmAccess))
            {
                try
                {
                    using var doc = JsonDocument.Parse(realmAccess);
                    if (doc.RootElement.TryGetProperty("roles", out var arr) && arr.ValueKind == JsonValueKind.Array)
                        foreach (var r in arr.EnumerateArray())
                        {
                            var role = r.GetString();
                            if (!string.IsNullOrWhiteSpace(role))
                            {
                                add.Add(new Claim("roles", role));
                                add.Add(new Claim(ClaimTypes.Role, role));
                            }
                        }
                } catch {}
            }

            var resAccess = jwt.Claims.FirstOrDefault(c => c.Type == "resource_access")?.Value;
            if (!string.IsNullOrEmpty(resAccess))
            {
                try
                {
                    using var doc = JsonDocument.Parse(resAccess);
                    foreach (var clientName in new[] { "workops-api", "workops-spa" })
                    {
                        if (doc.RootElement.TryGetProperty(clientName, out var ce) &&
                            ce.TryGetProperty("roles", out var arr) &&
                            arr.ValueKind == JsonValueKind.Array)
                            foreach (var r in arr.EnumerateArray())
                            {
                                var role = r.GetString();
                                if (!string.IsNullOrWhiteSpace(role))
                                {
                                    add.Add(new Claim("roles", role));
                                    add.Add(new Claim(ClaimTypes.Role, role));
                                }
                            }
                    }
                } catch {}
            }
        }

        if (ctx.SecurityToken is System.IdentityModel.Tokens.Jwt.JwtSecurityToken idTokenJwt)
            AddRolesFromJwt(idTokenJwt);

        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var accessToken = ctx.ProtocolMessage.AccessToken;
        if (!string.IsNullOrEmpty(accessToken) && handler.CanReadToken(accessToken))
        {
            try
            {
                var atJwt = handler.ReadJwtToken(accessToken);
                AddRolesFromJwt(atJwt);
            } catch {}
        }

        if (add.Count > 0) id.AddClaims(add);
        return Task.CompletedTask;
    }
};

})


.AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, o =>
{
    o.Authority = publicAuthority;
    o.MetadataAddress = $"{metadataBase.TrimEnd('/')}/realms/{GetRealm(publicAuthority)}/.well-known/openid-configuration";
    o.RequireHttpsMetadata = false;

    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = publicAuthority,
        ValidateAudience = validateAudience,
        ValidAudience = expectedAud,
        NameClaimType = "preferred_username",
        RoleClaimType = "roles"
    };

    o.Events = new JwtBearerEvents
    {
        OnMessageReceived = ctx =>
        {
            var at = ctx.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(at) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                ctx.Token = at;
            return Task.CompletedTask;
        },
        OnTokenValidated = ctx =>
        {
            var identity = ctx.Principal?.Identity as ClaimsIdentity;
            if (identity == null) return Task.CompletedTask;

            var jwt = ctx.SecurityToken as System.IdentityModel.Tokens.Jwt.JwtSecurityToken;
            var toAdd = new List<Claim>();

            string? realmAccess = jwt?.Claims.FirstOrDefault(c => c.Type == "realm_access")?.Value;
            if (!string.IsNullOrEmpty(realmAccess))
            {
                try
                {
                    using var doc = JsonDocument.Parse(realmAccess);
                    if (doc.RootElement.TryGetProperty("roles", out var arr) && arr.ValueKind == JsonValueKind.Array)
                        foreach (var r in arr.EnumerateArray())
                        {
                            var role = r.GetString();
                            if (!string.IsNullOrWhiteSpace(role))
                            {
                                toAdd.Add(new Claim("roles", role));
                                toAdd.Add(new Claim(ClaimTypes.Role, role));
                            }
                        }
                } catch {}
            }

            string? resAccess = jwt?.Claims.FirstOrDefault(c => c.Type == "resource_access")?.Value;
            if (!string.IsNullOrEmpty(resAccess))
            {
                try
                {
                    using var doc = JsonDocument.Parse(resAccess);
                    foreach (var clientName in new[] { clientId, "workops-spa" })
                    {
                        if (doc.RootElement.TryGetProperty(clientName, out var ce) &&
                            ce.TryGetProperty("roles", out var arr) &&
                            arr.ValueKind == JsonValueKind.Array)
                            foreach (var r in arr.EnumerateArray())
                            {
                                var role = r.GetString();
                                if (!string.IsNullOrWhiteSpace(role))
                                {
                                    toAdd.Add(new Claim("roles", role));
                                    toAdd.Add(new Claim(ClaimTypes.Role, role));
                                }
                            }
                    }
                } catch {}
            }

            if (toAdd.Count > 0) identity.AddClaims(toAdd);
            return Task.CompletedTask;
        },
        OnChallenge = async ctx =>
        {
            ctx.HandleResponse();
            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsJsonAsync(new { error = "unauthorized", path = ctx.Request.Path.ToString() });
        },
        OnForbidden = async ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsJsonAsync(new { error = "forbidden", path = ctx.Request.Path.ToString() });
        }
    };

    o.BackchannelHttpHandler = new KeycloakBackchannelRewriteHandler("http://localhost:8080", metadataBase)
    {
        InnerHandler = new HttpClientHandler()
    };
});


builder.Services.AddAuthorization(opts =>
{

    opts.AddPolicy("read",     p => p.RequireAuthenticatedUser());
    opts.AddPolicy("CanRead",  p => p.RequireAuthenticatedUser());


    opts.AddPolicy("write",    p => p.RequireRole("writer","admin")); // alias usado por algunos controladores
    opts.AddPolicy("CanWrite", p => p.RequireRole("writer","admin"));


    opts.AddPolicy("admin", p => p.RequireRole("admin"));
    opts.AddPolicy("Admin", p => p.RequireRole("admin"));
});


builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddTransient<Microsoft.AspNetCore.Authentication.IClaimsTransformation, Api.Security.KeycloakRolesClaimsTransformation>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "WorkOps API", Version = "v1" });

    var oidcBase = $"{publicAuthority.TrimEnd('/')}/protocol/openid-connect";
    c.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.OAuth2,
        Flows = new OpenApiOAuthFlows
        {
            AuthorizationCode = new OpenApiOAuthFlow
            {
                AuthorizationUrl = new Uri($"{oidcBase}/auth"),
                TokenUrl = new Uri($"{oidcBase}/token"),
                Scopes = new Dictionary<string, string> {
                    { "openid", "OpenID" }, { "profile", "Profile" }, { "email", "Email" }, { "roles", "Roles" }
                }
            }
        }
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement {
        { new OpenApiSecurityScheme {
            Reference = new OpenApiReference{ Type = ReferenceType.SecurityScheme, Id="oauth2"}
          }, new[]{"openid","profile","email","roles"}
        }
    });
});


var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(o =>
{
    o.SwaggerEndpoint("/swagger/v1/swagger.json", "WorkOps API v1");
    o.OAuthClientId(cfg["SwaggerOAuth:ClientId"] ?? "workops-spa");
    o.OAuthUsePkce();
    o.OAuthScopes(new[] { "openid", "profile", "email", "roles" });
});

app.UseCors("default");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();


app.MapHub<Api.Hubs.NotificationsHub>("/hubs/notifications").RequireAuthorization();

app.Run();


static bool IsApiRequest(HttpRequest req)
    => req.Path.StartsWithSegments("/api") || req.Headers.Accept.Any(h => h.Contains("application/json"));

static string GetRealm(string authority)
{
    var idx = authority.IndexOf("/realms/", StringComparison.OrdinalIgnoreCase);
    return idx >= 0 ? authority[(idx + "/realms/".Length)..].TrimEnd('/') : "workops";
}

sealed class KeycloakBackchannelRewriteHandler : DelegatingHandler
{
    private readonly string _from;
    private readonly string _to;
    public KeycloakBackchannelRewriteHandler(string from, string to)
        => (_from, _to) = (from.TrimEnd('/'), to.TrimEnd('/'));

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        if (request.RequestUri is not null)
        {
            var s = request.RequestUri.ToString();
            if (s.StartsWith(_from, StringComparison.OrdinalIgnoreCase))
                request.RequestUri = new Uri(_to + s[_from.Length..]);
        }
        return base.SendAsync(request, ct);
    }
}
