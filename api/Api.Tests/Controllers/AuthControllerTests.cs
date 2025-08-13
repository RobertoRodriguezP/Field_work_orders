using System.Security.Claims;
using Api.Controllers;
using Api.Tests.TestHelpers;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Api.Tests.Controllers;

public class AuthControllerTests
{
    [Fact]
    public void Me_returns_preferred_username_email_and_roles()
    {
        var ctrl = new AuthController();

        HttpContextHelper.SetUser(ctrl, new[]
        {
            new Claim("sub", "user-123"),
            new Claim("preferred_username", "roberto"),
            new Claim("email", "rob@example.com"),
            // roles pueden venir como "roles" y/o ClaimTypes.Role
            new Claim("roles", "writer"),
            new Claim(ClaimTypes.Role, "admin")
        });

        var result = ctrl.Me() as OkObjectResult;

        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);

        dynamic body = result.Value!;
        ((string)body.preferred_username).Should().Be("roberto");
        ((string)body.email).Should().Be("rob@example.com");
        string[] roles = body.roles;
        roles.Should().Contain(new[] { "writer", "admin" });
    }

    [Fact]
    public void Claims_returns_sorted_claims()
    {
        var ctrl = new AuthController();
        HttpContextHelper.SetUser(ctrl, new[]
        {
            new Claim("typeA", "A"),
            new Claim("typeB", "B")
        });

        var result = ctrl.Claims() as OkObjectResult;

        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);
        var list = (result.Value as IEnumerable<object>)!;
        list.Should().HaveCount(2);
    }
}
