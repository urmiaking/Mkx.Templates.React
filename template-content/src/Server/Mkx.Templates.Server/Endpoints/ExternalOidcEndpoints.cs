using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Mkx.Templates.Infrastructure.Persistence;

namespace Mkx.Templates.Server.Endpoints;

// An OIDC subject is trusted only as a key for an explicitly linked Identity user.
// Never match by email, create accounts, or import remote roles and permissions.
public static class ExternalOidcEndpoints
{
    public const string Scheme = "ExternalOidc";

    public static IEndpointRouteBuilder MapExternalOidcEndpoints(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/api/auth/external").WithTags("External authentication");
        auth.MapGet("/config", (IConfiguration configuration) => Results.Ok(new
        {
            enabled = configuration.GetValue<bool>("ExternalOidc:Enabled"),
            displayName = DisplayName(configuration)
        }));
        auth.MapGet("/start", async (HttpContext context, IConfiguration configuration,
            SignInManager<AppUser> signIn) =>
        {
            if (!configuration.GetValue<bool>("ExternalOidc:Enabled")) return Results.NotFound();
            await context.SignOutAsync(IdentityConstants.ExternalScheme);
            var properties = signIn.ConfigureExternalAuthenticationProperties(Scheme, "/api/auth/external/callback");
            return Results.Challenge(properties, [Scheme]);
        }).RequireRateLimiting("login");

        auth.MapGet("/callback", async (HttpContext context, IConfiguration configuration,
            SignInManager<AppUser> signIn) =>
        {
            if (!configuration.GetValue<bool>("ExternalOidc:Enabled")) return Results.NotFound();
            var info = await signIn.GetExternalLoginInfoAsync();
            if (info is null || info.LoginProvider != Scheme)
                return Results.Redirect("/login?externalError=failed");
            var result = await signIn.ExternalLoginSignInAsync(
                info.LoginProvider, info.ProviderKey, isPersistent: false, bypassTwoFactor: false);
            await context.SignOutAsync(IdentityConstants.ExternalScheme);
            if (result.Succeeded) return Results.Redirect("/");
            if (result.RequiresTwoFactor) return Results.Redirect("/login/2fa");
            return Results.Redirect("/login?externalError=" + (result.IsLockedOut ? "locked" : "not-linked"));
        }).RequireRateLimiting("login");

        var account = app.MapGroup("/api/account/external").WithTags("External account").RequireAuthorization();
        account.MapGet("/", async (ClaimsPrincipal principal, UserManager<AppUser> users, IConfiguration configuration) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            var linked = (await users.GetLoginsAsync(user)).Any(login => login.LoginProvider == Scheme);
            return Results.Ok(new
            {
                enabled = configuration.GetValue<bool>("ExternalOidc:Enabled"),
                displayName = DisplayName(configuration),
                linked
            });
        });

        // Browser form POST, not fetch: the challenge navigates the top-level window.
        // Global antiforgery middleware verifies the form's request-verification token.
        account.MapPost("/link", async (HttpContext context, IConfiguration configuration,
            UserManager<AppUser> users, SignInManager<AppUser> signIn) =>
        {
            if (!configuration.GetValue<bool>("ExternalOidc:Enabled")) return Results.NotFound();
            var user = await users.GetUserAsync(context.User);
            if (user is null) return Results.Unauthorized();
            if (!context.Request.HasFormContentType)
                return Results.StatusCode(StatusCodes.Status415UnsupportedMediaType);
            var form = await context.Request.ReadFormAsync(context.RequestAborted);
            var password = form["currentPassword"].ToString();
            if (string.IsNullOrEmpty(password) || !await users.CheckPasswordAsync(user, password))
                return Results.Redirect("/account?external=invalid-password");
            if ((await users.GetLoginsAsync(user)).Any(login => login.LoginProvider == Scheme))
                return Results.Redirect("/account?external=already-linked");
            await context.SignOutAsync(IdentityConstants.ExternalScheme);
            var properties = signIn.ConfigureExternalAuthenticationProperties(
                Scheme, "/api/auth/external/link-callback", user.Id.ToString());
            return Results.Challenge(properties, [Scheme]);
        }).RequireRateLimiting("mfa");

        auth.MapGet("/link-callback", async (HttpContext context, IConfiguration configuration,
            UserManager<AppUser> users, SignInManager<AppUser> signIn) =>
        {
            if (!configuration.GetValue<bool>("ExternalOidc:Enabled")) return Results.NotFound();
            var user = await users.GetUserAsync(context.User);
            if (user is null) return Results.Redirect("/login?externalError=failed");
            var info = await signIn.GetExternalLoginInfoAsync(user.Id.ToString());
            if (info is null || info.LoginProvider != Scheme)
                return Results.Redirect("/account?external=failed");
            var existing = await users.FindByLoginAsync(info.LoginProvider, info.ProviderKey);
            if (existing is not null)
            {
                await context.SignOutAsync(IdentityConstants.ExternalScheme);
                return Results.Redirect("/account?external=" +
                    (existing.Id == user.Id ? "already-linked" : "unavailable"));
            }
            if ((await users.GetLoginsAsync(user)).Any(login => login.LoginProvider == Scheme))
            {
                await context.SignOutAsync(IdentityConstants.ExternalScheme);
                return Results.Redirect("/account?external=already-linked");
            }
            var linked = await users.AddLoginAsync(user, info);
            await context.SignOutAsync(IdentityConstants.ExternalScheme);
            if (!linked.Succeeded) return Results.Redirect("/account?external=failed");
            await signIn.RefreshSignInAsync(user);
            return Results.Redirect("/account?external=linked");
        }).RequireAuthorization().RequireRateLimiting("login");

        account.MapPost("/unlink", async (UnlinkExternalRequest request, ClaimsPrincipal principal,
            UserManager<AppUser> users, SignInManager<AppUser> signIn) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            if (string.IsNullOrEmpty(request.CurrentPassword) ||
                !await users.CheckPasswordAsync(user, request.CurrentPassword))
                return Results.BadRequest(new { title = "Invalid current password." });
            var login = (await users.GetLoginsAsync(user)).SingleOrDefault(entry => entry.LoginProvider == Scheme);
            if (login is null) return Results.NotFound();
            var result = await users.RemoveLoginAsync(user, login.LoginProvider, login.ProviderKey);
            if (!result.Succeeded) return Results.Problem(statusCode: 400, title: "Unable to remove external login.");
            await signIn.RefreshSignInAsync(user);
            return Results.NoContent();
        }).RequireRateLimiting("mfa");

        return app;
    }

    private static string DisplayName(IConfiguration configuration) =>
        string.IsNullOrWhiteSpace(configuration["ExternalOidc:DisplayName"])
            ? "حساب سازمانی" : configuration["ExternalOidc:DisplayName"]!.Trim();
}

public sealed record UnlinkExternalRequest(string CurrentPassword);
