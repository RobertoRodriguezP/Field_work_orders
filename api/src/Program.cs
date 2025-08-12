// Program.cs
using System.Net.Http;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

// ==== Ajustes clave de OIDC/Keycloak ====
// Issuer EXACTO que viene en tus tokens (los estás pidiendo a http://localhost:8080)
const string PublicIssuer   = "http://host.docker.internal:8080/realms/workops";
// Base interna para resolver Keycloak dentro de la red de Docker
const string InternalBase   = "http://host.docker.internal:8080";
bool ValidateAudience = true;
const string ExpectedAudience = "workops-api";

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

builder.Services.AddDbContext<Api.Data.AppDbContext>(o =>
    o.UseNpgsql(cfg.GetConnectionString("Default")));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
  .AddJwtBearer(o =>
  {

    o.Authority = PublicIssuer;

    o.MetadataAddress = $"{InternalBase}/realms/workops/.well-known/openid-configuration";
    o.RequireHttpsMetadata = false;

    o.TokenValidationParameters = new TokenValidationParameters
    {
      ValidateIssuer = true,
      ValidIssuer    = PublicIssuer,

      ValidateAudience = ValidateAudience,
      ValidAudience    = ExpectedAudience
    };

    o.Events = new JwtBearerEvents
    {
     // o.Events.OnAuthenticationFailed = ctx =>       {        Console.WriteLine("JWT fail: " + ctx.Exception);        return Task.CompletedTask;      },


      OnMessageReceived = ctx =>
      {
        var at = ctx.Request.Query["access_token"];
        if (!string.IsNullOrEmpty(at) && ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
          ctx.Token = at;
        return Task.CompletedTask;
      },

      OnChallenge = async ctx =>
      {
        ctx.HandleResponse();
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        ctx.Response.ContentType = "application/json";
        var payload = new { error = "unauthorized", message = "Falta o es inválido el Bearer token. "+ builder.Configuration["AUTH_VALIDISSUER"], path = ctx.Request.Path.ToString() };
        await ctx.Response.WriteAsync(JsonSerializer.Serialize(payload));
      },

      OnForbidden = async ctx =>
      {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        ctx.Response.ContentType = "application/json";
        var payload = new { error = "forbidden", message = "No tienes permisos para acceder a este recurso.1", path = ctx.Request.Path.ToString() };
        await ctx.Response.WriteAsync(JsonSerializer.Serialize(payload));
      }
    };

    o.BackchannelHttpHandler = new KeycloakBackchannelRewriteHandler("http://localhost:8080", InternalBase)
    {
      InnerHandler = new HttpClientHandler()
    };
  });

builder.Services.AddAuthorization(opts =>
{

  opts.AddPolicy("read",  p => p.RequireAuthenticatedUser());
  opts.AddPolicy("write", p => p.RequireRole("admin", "user"));
  opts.AddPolicy("admin", p => p.RequireRole("admin"));
});


var allowedOrigins = cfg.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:5173", "http://localhost:8085" };
builder.Services.AddCors(o =>
{
  o.AddPolicy("default", p => p.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

builder.Services.AddControllers();
builder.Services.AddSignalR();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
  c.SwaggerDoc("v1", new OpenApiInfo { Title = "WorkOps API", Version = "v1" });

  var oidcBase = $"{PublicIssuer}/protocol/openid-connect";
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
          { "openid", "OpenID" }, { "profile", "Profile" }, { "email", "Email" }
        }
      }
    }
  });
  c.AddSecurityRequirement(new OpenApiSecurityRequirement {
    { new OpenApiSecurityScheme { Reference = new OpenApiReference{ Type = ReferenceType.SecurityScheme, Id="oauth2"}}, new[]{"openid","profile","email"} }
  });
});

var app = builder.Build();

// ===== Middleware =====
app.UseSwagger();
app.UseSwaggerUI(o =>
{
  o.SwaggerEndpoint("/swagger/v1/swagger.json", "WorkOps API v1");
  o.OAuthClientId(cfg["SwaggerOAuth:ClientId"] ?? "workops-spa");
  o.OAuthUsePkce();
  o.OAuthScopes(new[] { "openid", "profile", "email" });
});

app.UseCors("default");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapHub<Api.Hubs.NotificationsHub>("/hubs/notifications").RequireAuthorization();

app.Run();
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
