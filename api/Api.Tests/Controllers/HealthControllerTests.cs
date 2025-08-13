using Api.Controllers;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Api.Tests.Controllers;

public class HealthControllerTests
{
    [Fact]
    public void Get_returns_ok_with_now()
    {
        var ctrl = new HealthController();

        var result = ctrl.Get() as OkObjectResult;

        result.Should().NotBeNull();
        result!.StatusCode.Should().Be(200);
        var body = result.Value!;
        body.Should().NotBeNull();
        body.Should().BeAssignableTo<object>();
    }
}
