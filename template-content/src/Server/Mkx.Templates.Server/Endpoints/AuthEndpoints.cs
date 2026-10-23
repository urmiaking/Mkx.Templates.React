using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Mkx.Templates.Infrastructure.Persistence;
using Mkx.Templates.Contracts.Authorization;

namespace Mkx.Templates.Server.Endpoints;

public sealed record LoginRequest(string Email, string Password, bool RememberMe = false);

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Authentication");
        group.MapGet("/csrf", (IAntiforgery antiforgery, HttpContext ctx) =>
        {
            ctx.Response.Headers.CacheControl = "no-store";
            return Results.Ok(new { token = antiforgery.GetAndStoreTokens(ctx).RequestToken });
        });
        group.MapGet("/me", async (ClaimsPrincipal principal, UserManager<AppUser> users) =>
        {
            if (principal.Identity?.IsAuthenticated != true)
                return Results.Ok(new { authenticated = false, email = (string?)null, permissions = Array.Empty<string>(), roles = Array.Empty<string>() });
            var user = await users.GetUserAsync(principal);
            var roles = user is null ? Array.Empty<string>() : (await users.GetRolesAsync(user)).ToArray();
            var permissions = roles.Contains("Administrators", StringComparer.Ordinal) ? AppPolicies.All.ToArray() :
                principal.Claims.Where(c => AppPolicies.IsKnown(c.Type)).Select(c => c.Type)
                    .Where(AppPolicies.IsKnown).Distinct().ToArray();
            return Results.Ok(new { authenticated = user is not null, email = user?.Email, permissions, roles });
        });
        group.MapPost("/login", async (LoginRequest request, SignInManager<AppUser> signIn, UserManager<AppUser> users) =>
        {
            var user = await users.FindByEmailAsync(request.Email ?? "");
            if (user is null) return Results.Problem(statusCode: 401, title: "Invalid credentials.");
            var result = await signIn.PasswordSignInAsync(user, request.Password ?? "", request.RememberMe, lockoutOnFailure: true);
            return result.Succeeded ? Results.NoContent() : Results.Problem(statusCode: 401, title: "Invalid credentials.");
        }).RequireRateLimiting("login");
        group.MapPost("/logout", async (SignInManager<AppUser> signIn) =>
        {
            await signIn.SignOutAsync();
            return Results.NoContent();
        }).RequireAuthorization();
        return group;
    }
}
