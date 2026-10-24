using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Mkx.Templates.Infrastructure.Persistence;

namespace Mkx.Templates.Server.Endpoints;

public sealed record MfaStatus(bool Enabled, int RecoveryCodesLeft);
public sealed record MfaPasswordRequest(string CurrentPassword);
public sealed record MfaCodeRequest(string CurrentPassword, string Code);
public sealed record MfaSetup(string SharedKey, string AuthenticatorUri);
public sealed record MfaRecoveryCodes(string[] Codes);

/// <summary>Time-based authenticator enrollment and one-time recovery codes.</summary>
public static class MfaEndpoints
{
    public static RouteGroupBuilder MapMfaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/account/mfa").WithTags("Multi-factor authentication")
            .RequireAuthorization();
        group.MapGet("/status", async (ClaimsPrincipal principal, UserManager<AppUser> users) =>
        {
            var user = await users.GetUserAsync(principal);
            return user is null ? Results.Unauthorized() :
                Results.Ok(new MfaStatus(await users.GetTwoFactorEnabledAsync(user),
                    await users.CountRecoveryCodesAsync(user)));
        });

        group.MapPost("/setup", async (MfaPasswordRequest request, ClaimsPrincipal principal,
            UserManager<AppUser> users, IConfiguration config) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            if (await users.GetTwoFactorEnabledAsync(user)) return Results.Conflict(new { title = "MFA is already enabled." });
            if (!await ValidPassword(users, user, request.CurrentPassword)) return Results.BadRequest(new { title = "Invalid current password." });
            var key = await users.GetAuthenticatorKeyAsync(user);
            if (string.IsNullOrWhiteSpace(key))
            {
                var result = await users.ResetAuthenticatorKeyAsync(user);
                if (!result.Succeeded) return IdentityErrors(result);
                key = await users.GetAuthenticatorKeyAsync(user);
            }
            var issuer = config["Mfa:Issuer"] ?? "Mkx Workspace";
            var label = Uri.EscapeDataString(issuer + ":" + user.UserName);
            var uri = "otpauth://totp/" + label +
                "?secret=" + Uri.EscapeDataString(key!) +
                "&issuer=" + Uri.EscapeDataString(issuer) + "&algorithm=SHA1&digits=6&period=30";
            return Results.Ok(new MfaSetup(key!, uri));
        }).RequireRateLimiting("mfa");

        group.MapPost("/enable", async (MfaCodeRequest request, ClaimsPrincipal principal,
            UserManager<AppUser> users, SignInManager<AppUser> signIn) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            if (await users.GetTwoFactorEnabledAsync(user)) return Results.Conflict(new { title = "MFA is already enabled." });
            if (!await ValidPassword(users, user, request.CurrentPassword)) return Results.BadRequest(new { title = "Invalid current password." });
            if (string.IsNullOrWhiteSpace(await users.GetAuthenticatorKeyAsync(user)) ||
                !await users.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, Normalize(request.Code)))
                return Results.BadRequest(new { title = "Invalid authenticator code." });
            var enabled = await users.SetTwoFactorEnabledAsync(user, true);
            if (!enabled.Succeeded) return IdentityErrors(enabled);
            var codes = await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
            if (codes is null) return Results.Problem(statusCode: 500, title: "Could not generate recovery codes.");
            await signIn.RefreshSignInAsync(user);
            return Results.Ok(new MfaRecoveryCodes(codes.ToArray()));
        }).RequireRateLimiting("mfa");

        group.MapPost("/recovery-codes", async (MfaCodeRequest request, ClaimsPrincipal principal,
            UserManager<AppUser> users) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            if (!await users.GetTwoFactorEnabledAsync(user)) return Results.Conflict(new { title = "MFA is disabled." });
            if (!await ValidPassword(users, user, request.CurrentPassword) || !await ValidFactor(users, user, request.Code))
                return Results.BadRequest(new { title = "Invalid password or verification code." });
            var codes = await users.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
            return codes is null ? Results.Problem(statusCode: 500, title: "Could not generate recovery codes.") :
                Results.Ok(new MfaRecoveryCodes(codes.ToArray()));
        }).RequireRateLimiting("mfa");

        group.MapPost("/disable", async (MfaCodeRequest request, ClaimsPrincipal principal,
            UserManager<AppUser> users, SignInManager<AppUser> signIn) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            if (!await users.GetTwoFactorEnabledAsync(user)) return Results.NoContent();
            if (!await ValidPassword(users, user, request.CurrentPassword) || !await ValidFactor(users, user, request.Code))
                return Results.BadRequest(new { title = "Invalid password or verification code." });
            var disabled = await users.SetTwoFactorEnabledAsync(user, false);
            if (!disabled.Succeeded) return IdentityErrors(disabled);
            var keyReset = await users.ResetAuthenticatorKeyAsync(user);
            if (!keyReset.Succeeded) return IdentityErrors(keyReset);
            await signIn.RefreshSignInAsync(user);
            return Results.NoContent();
        }).RequireRateLimiting("mfa");
        return group;
    }

    private static async Task<bool> ValidPassword(UserManager<AppUser> users, AppUser user, string? password) =>
        !string.IsNullOrWhiteSpace(password) && !await users.IsLockedOutAsync(user) &&
        await users.CheckPasswordAsync(user, password);

    private static async Task<bool> ValidFactor(UserManager<AppUser> users, AppUser user, string? code)
    {
        var normalized = Normalize(code);
        if (string.IsNullOrWhiteSpace(normalized)) return false;
        if (await users.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultAuthenticatorProvider, normalized))
            return true;
        return (await users.RedeemTwoFactorRecoveryCodeAsync(user, normalized)).Succeeded;
    }

    private static string Normalize(string? code) =>
        new string((code ?? "").Trim().Where(c => !char.IsWhiteSpace(c)).Select(c =>
            c is >= '۰' and <= '۹' ? (char)('0' + c - '۰') :
            c is >= '٠' and <= '٩' ? (char)('0' + c - '٠') : c).ToArray());

    private static IResult IdentityErrors(IdentityResult result) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { ["mfa"] =
            result.Errors.Select(error => error.Description).ToArray() });
}
