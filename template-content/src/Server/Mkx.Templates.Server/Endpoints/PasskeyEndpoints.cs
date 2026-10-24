using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Mkx.Templates.Infrastructure.Persistence;

namespace Mkx.Templates.Server.Endpoints;

public sealed record PasskeyEnrollmentRequest(string CurrentPassword);
public sealed record PasskeyCredentialRequest(string CredentialJson, string? Name = null);
public sealed record PasskeyRemovalRequest(string CredentialId, string CurrentPassword);
public sealed record PasskeySummary(string CredentialId, string Name, DateTimeOffset CreatedAt, bool IsBackedUp);

/// <summary>Account-bound WebAuthn registration and discoverable passkey sign-in.</summary>
public static class PasskeyEndpoints
{
    public static RouteGroupBuilder MapPasskeyEndpoints(this IEndpointRouteBuilder app)
    {
        // ASP.NET Core Identity stores the one-use WebAuthn ceremony state in the
        // TwoFactorUserIdScheme cookie, whose path is /api/auth in this template.
        var group = app.MapGroup("/api/auth/passkeys").WithTags("Passkeys");

        group.MapPost("/request-options", async (SignInManager<AppUser> signIn,
            IHostEnvironment environment, IConfiguration configuration) =>
        {
            if (!IsConfigured(environment, configuration)) return Unconfigured();
            var json = await signIn.MakePasskeyRequestOptionsAsync(user: null);
            return Results.Content(json, "application/json");
        }).RequireRateLimiting("login");

        group.MapPost("/login", async (PasskeyCredentialRequest request, SignInManager<AppUser> signIn,
            IHostEnvironment environment, IConfiguration configuration) =>
        {
            if (!IsConfigured(environment, configuration)) return Unconfigured();
            if (!IsValidCredentialJson(request.CredentialJson))
                return Results.BadRequest(new { title = "Invalid passkey credential." });
            try
            {
                // Identity verifies origin, challenge, user presence and signature,
                // updates the sign counter and creates the application session.
                var result = await signIn.PasskeySignInAsync(request.CredentialJson);
                return result.Succeeded ? Results.NoContent() :
                    Results.Problem(statusCode: 401, title: "Passkey sign-in failed.");
            }
            catch (InvalidOperationException)
            {
                return Results.BadRequest(new { title = "Passkey challenge has expired. Please retry." });
            }
        }).RequireRateLimiting("login");

        var self = group.MapGroup("").RequireAuthorization();
        self.MapGet("", async (ClaimsPrincipal principal, UserManager<AppUser> users) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            var passkeys = await users.GetPasskeysAsync(user);
            return Results.Ok(passkeys.Select(key => new PasskeySummary(
                WebEncoders.Base64UrlEncode(key.CredentialId),
                key.Name ?? "Passkey", key.CreatedAt, key.IsBackedUp)).ToArray());
        });

        self.MapPost("/create-options", async (PasskeyEnrollmentRequest request, ClaimsPrincipal principal,
            UserManager<AppUser> users, SignInManager<AppUser> signIn,
            IHostEnvironment environment, IConfiguration configuration) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            if (!IsConfigured(environment, configuration)) return Unconfigured();
            if (string.IsNullOrWhiteSpace(request.CurrentPassword) || await users.IsLockedOutAsync(user) ||
                !await users.CheckPasswordAsync(user, request.CurrentPassword))
                return Results.BadRequest(new { title = "Invalid current password." });
            var userId = await users.GetUserIdAsync(user);
            var name = await users.GetUserNameAsync(user) ?? "User";
            var json = await signIn.MakePasskeyCreationOptionsAsync(new PasskeyUserEntity
            {
                Id = userId,
                Name = name,
                DisplayName = name
            });
            return Results.Content(json, "application/json");
        }).RequireRateLimiting("mfa");

        self.MapPost("/register", async (PasskeyCredentialRequest request, ClaimsPrincipal principal,
            UserManager<AppUser> users, SignInManager<AppUser> signIn,
            IHostEnvironment environment, IConfiguration configuration) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            if (!IsConfigured(environment, configuration)) return Unconfigured();
            if (!IsValidCredentialJson(request.CredentialJson) || request.Name?.Length > 80)
                return Results.BadRequest(new { title = "Invalid passkey credential or name." });
            try
            {
                var attestation = await signIn.PerformPasskeyAttestationAsync(request.CredentialJson);
                if (!attestation.Succeeded || attestation.Passkey is null || attestation.UserEntity is null ||
                    !string.Equals(attestation.UserEntity.Id, await users.GetUserIdAsync(user), StringComparison.Ordinal))
                    return Results.BadRequest(new { title = "Passkey registration failed." });
                attestation.Passkey.Name = string.IsNullOrWhiteSpace(request.Name) ? "Passkey" : request.Name.Trim();
                var saved = await users.AddOrUpdatePasskeyAsync(user, attestation.Passkey);
                return saved.Succeeded ? Results.NoContent() : IdentityErrors(saved);
            }
            catch (InvalidOperationException)
            {
                return Results.BadRequest(new { title = "Passkey challenge has expired. Please retry." });
            }
        }).RequireRateLimiting("mfa");

        self.MapPost("/remove", async (PasskeyRemovalRequest request, ClaimsPrincipal principal,
            UserManager<AppUser> users) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(request.CurrentPassword) || await users.IsLockedOutAsync(user) ||
                !await users.CheckPasswordAsync(user, request.CurrentPassword))
                return Results.BadRequest(new { title = "Invalid current password." });
            byte[] credentialId;
            try { credentialId = WebEncoders.Base64UrlDecode(request.CredentialId ?? ""); }
            catch (Exception ex) when (ex is FormatException or ArgumentException)
            { return Results.BadRequest(new { title = "Invalid passkey id." }); }
            var existing = await users.GetPasskeyAsync(user, credentialId);
            if (existing is null) return Results.NotFound();
            var removed = await users.RemovePasskeyAsync(user, credentialId);
            return removed.Succeeded ? Results.NoContent() : IdentityErrors(removed);
        }).RequireRateLimiting("mfa");

        return group;
    }

    private static bool IsConfigured(IHostEnvironment environment, IConfiguration configuration) =>
        environment.IsDevelopment() || !string.IsNullOrWhiteSpace(configuration["Passkeys:ServerDomain"]);

    private static IResult Unconfigured() => Results.Problem(statusCode: 503,
        title: "Passkeys require Passkeys:ServerDomain configuration outside Development.");

    private static bool IsValidCredentialJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json) || json.Length > 65536) return false;
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            return root.ValueKind == JsonValueKind.Object &&
                root.TryGetProperty("id", out var id) && id.ValueKind == JsonValueKind.String &&
                root.TryGetProperty("response", out var response) && response.ValueKind == JsonValueKind.Object &&
                root.TryGetProperty("type", out var type) && type.ValueKind == JsonValueKind.String &&
                type.GetString() == "public-key";
        }
        catch (JsonException) { return false; }
    }

    private static IResult IdentityErrors(IdentityResult result) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { ["passkeys"] =
            result.Errors.Select(error => error.Description).ToArray() });
}
