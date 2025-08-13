using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Api.Tests.TestHelpers;

public static class HttpContextHelper
{
    public static void SetUser(ControllerBase controller, IEnumerable<Claim> claims)
    {
        var ctx = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = ctx
        };
    }
}
