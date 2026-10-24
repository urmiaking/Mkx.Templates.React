using System.Net.Mail;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Mkx.Templates.Infrastructure.Persistence;
using Mkx.Templates.Server.Services;

namespace Mkx.Templates.Server.Endpoints;

public sealed record AccountProfile(string UserName, string? Email, bool EmailConfirmed);
public sealed record UpdateProfileRequest(string UserName, string Email);
public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public sealed record ForgotPasswordRequest(string Email);
public sealed record ResetPasswordRequest(string Email, string Token, string NewPassword);
public sealed record VerifyEmailRequest(string UserId, string Token);

/// <summary>Self-service account routes; never require administrator role/claims.</summary>
public static class AccountEndpoints
{
    public static RouteGroupBuilder MapAccountEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/account").WithTags("Account");
        group.MapGet("/profile", async (ClaimsPrincipal principal, UserManager<AppUser> users) =>
        {
            var user = await users.GetUserAsync(principal);
            return user is null ? Results.Unauthorized() : Results.Ok(Describe(user));
        }).RequireAuthorization();

        group.MapPut("/profile", async (UpdateProfileRequest request, ClaimsPrincipal principal,
            UserManager<AppUser> users, SignInManager<AppUser> signIn, IAccountEmailSender emailSender,
            IConfiguration config, IWebHostEnvironment env) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            var name = request.UserName?.Trim() ?? "";
            var email = request.Email?.Trim() ?? "";
            if (name.Length is < 1 or > 128 || !ValidEmail(email))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["profile"] = ["Valid username and email are required."] });
            var matchingName = await users.FindByNameAsync(name);
            if (matchingName is not null && matchingName.Id != user.Id)
                return Results.Conflict(new { title = "Username is already used." });
            var matchingEmail = await users.FindByEmailAsync(email);
            if (matchingEmail is not null && matchingEmail.Id != user.Id)
                return Results.Conflict(new { title = "Email is already used." });
            var changedEmail = !string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase);
            if (changedEmail && (!emailSender.IsConfigured || !ValidOrigin(config, env)))
                return Results.Problem(statusCode: 503, title: "Email changes require an account email provider.");
            user.UserName = name;
            if (changedEmail) { user.Email = email; user.EmailConfirmed = false; }
            var result = await users.UpdateAsync(user);
            if (!result.Succeeded) return IdentityErrors(result);
            await signIn.RefreshSignInAsync(user);
            return Results.Ok(Describe(user));
        }).RequireAuthorization();

        group.MapPost("/password", async (ChangePasswordRequest request, ClaimsPrincipal principal,
            UserManager<AppUser> users, SignInManager<AppUser> signIn) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
                return Results.BadRequest(new { title = "Both passwords are required." });
            var result = await users.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
            if (!result.Succeeded) return IdentityErrors(result);
            await signIn.RefreshSignInAsync(user);
            return Results.NoContent();
        }).RequireAuthorization();

        group.MapPost("/verify-email/request", async (ClaimsPrincipal principal, UserManager<AppUser> users,
            IAccountEmailSender sender, IConfiguration config, IWebHostEnvironment env,
            ILoggerFactory loggers, CancellationToken ct) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();
            if (user.EmailConfirmed) return Results.NoContent();
            if (!sender.IsConfigured || !ValidOrigin(config, env))
                return Results.Problem(statusCode: 503, title: "Account email is not configured.");
            var token = await users.GenerateEmailConfirmationTokenAsync(user);
            var link = Link(config, "verify-email", ("userId", user.Id.ToString()), ("token", token));
            try { await sender.SendAsync(user.Email!, "Confirm your email", "Open this link to confirm your email:\n" + link, ct); }
            catch (Exception ex)
            {
                loggers.CreateLogger("AccountEmail").LogError(ex, "Email confirmation delivery failed.");
                return Results.Problem(statusCode: 503, title: "Unable to send email. Try again later.");
            }
            return Results.Accepted();
        }).RequireAuthorization().RequireRateLimiting("account-recovery");

        group.MapPost("/verify-email", async (VerifyEmailRequest request, UserManager<AppUser> users) =>
        {
            if (!Guid.TryParse(request.UserId, out var id) || string.IsNullOrWhiteSpace(request.Token))
                return Results.BadRequest(new { title = "Invalid or expired verification link." });
            var user = await users.FindByIdAsync(id.ToString());
            if (user is null) return Results.BadRequest(new { title = "Invalid or expired verification link." });
            var result = await users.ConfirmEmailAsync(user, request.Token);
            return result.Succeeded ? Results.NoContent() :
                Results.BadRequest(new { title = "Invalid or expired verification link." });
        }).RequireRateLimiting("account-recovery");

        group.MapPost("/forgot-password", async (ForgotPasswordRequest request, UserManager<AppUser> users,
            IAccountEmailSender sender, IConfiguration config, IWebHostEnvironment env,
            ILoggerFactory loggers, CancellationToken ct) =>
        {
            // A syntactically valid address always gets the same response, whether present or not.
            if (!ValidEmail(request.Email)) return Results.BadRequest(new { title = "A valid email address is required." });
            if (!sender.IsConfigured || !ValidOrigin(config, env)) return Results.Accepted();
            var user = await users.FindByEmailAsync(request.Email.Trim());
            if (user is not null && user.EmailConfirmed)
            {
                var token = await users.GeneratePasswordResetTokenAsync(user);
                var link = Link(config, "reset-password", ("email", user.Email!), ("token", token));
                try { await sender.SendAsync(user.Email!, "Reset your password", "Open this link to reset your password:\n" + link, ct); }
                catch (Exception ex) { loggers.CreateLogger("AccountEmail").LogError(ex, "Password recovery delivery failed."); }
            }
            return Results.Accepted();
        }).RequireRateLimiting("account-recovery");

        group.MapPost("/reset-password", async (ResetPasswordRequest request, UserManager<AppUser> users) =>
        {
            if (!ValidEmail(request.Email) || string.IsNullOrWhiteSpace(request.Token) ||
                string.IsNullOrWhiteSpace(request.NewPassword))
                return Results.BadRequest(new { title = "Invalid reset request." });
            var user = await users.FindByEmailAsync(request.Email.Trim());
            if (user is null || !user.EmailConfirmed)
                return Results.BadRequest(new { title = "Invalid reset token or password." });
            var result = await users.ResetPasswordAsync(user, request.Token, request.NewPassword);
            return result.Succeeded ? Results.NoContent() :
                Results.BadRequest(new { title = "Invalid reset token or password." });
        }).RequireRateLimiting("account-recovery");
        return group;
    }

    private static AccountProfile Describe(AppUser user) =>
        new(user.UserName ?? "", user.Email, user.EmailConfirmed);

    private static bool ValidEmail(string? input)
    {
        var value = input?.Trim() ?? "";
        return value.Length is > 0 and <= 256 && MailAddress.TryCreate(value, out var parsed) &&
            string.Equals(parsed.Address, value, StringComparison.OrdinalIgnoreCase);
    }

    private static bool ValidOrigin(IConfiguration config, IWebHostEnvironment env) =>
        Uri.TryCreate(config["AccountEmail:PublicBaseUrl"], UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttps || (env.IsDevelopment() && uri.Scheme == Uri.UriSchemeHttp)) &&
        uri.UserInfo.Length == 0 && uri.Query.Length == 0 && uri.Fragment.Length == 0 &&
        uri.AbsolutePath == "/";

    private static string Link(IConfiguration config, string page, params (string Key, string Value)[] parameters) =>
        config["AccountEmail:PublicBaseUrl"]!.TrimEnd('/') + "/" + page + "?" +
        string.Join("&", parameters.Select(pair => Uri.EscapeDataString(pair.Key) + "=" + Uri.EscapeDataString(pair.Value)));

    private static IResult IdentityErrors(IdentityResult result) =>
        Results.ValidationProblem(new Dictionary<string, string[]> {
            ["account"] = result.Errors.Select(error => error.Description).ToArray()
        });
}
