using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using System.Net;
using Microsoft.AspNetCore.Authorization;
using Mkx.Templates.Contracts.Authorization;
using Mkx.Templates.Server.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Mkx.Templates.Application.WorkItems;
using Mkx.Templates.Infrastructure.Persistence;
using Mkx.Templates.Server.Endpoints;
using Mkx.Templates.Server.Services;
using Mkx.Templates.Application.Notifications;
using Mkx.Templates.Infrastructure.Notifications;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Push.local.json", optional: true, reloadOnChange: true);
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    foreach (var proxy in builder.Configuration.GetSection("ReverseProxy:KnownProxies").Get<string[]>() ?? [])
        options.KnownProxies.Add(IPAddress.Parse(proxy));
});
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<Mkx.Templates.Server.ApiExceptionHandler>();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();
builder.Services.AddScoped<WorkItemService>();
builder.Services.AddScoped<PushNotificationService>();
builder.Services.AddScoped<IPushNotificationSender>(sp => sp.GetRequiredService<PushNotificationService>());
builder.Services.AddScoped<IWorkItemStore, WorkItemStore>();
builder.Services.AddScoped<IAccountEmailSender, SmtpAccountEmailSender>();

var provider = builder.Configuration["Database:Provider"] ?? "Sqlite";
var connection = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Missing ConnectionStrings:Default.");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        options.UseSqlServer(connection);
    else if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
        options.UseSqlite(connection);
    else throw new InvalidOperationException("Unsupported Database:Provider.");
});

builder.Services.AddIdentityCore<AppUser>(options =>
{
    options.User.RequireUniqueEmail = true;
    options.Stores.SchemaVersion = IdentitySchemaVersions.Version3;
    options.Password.RequiredLength = 12;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
})
.AddRoles<IdentityRole<Guid>>()
.AddSignInManager()
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

builder.Services.Configure<IdentityPasskeyOptions>(options =>
{
    options.UserVerificationRequirement = "required";
    options.ResidentKeyRequirement = "required";
    options.ServerDomain = builder.Configuration["Passkeys:ServerDomain"];
});

builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddCookie(IdentityConstants.ApplicationScheme, options =>
    {
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        options.LoginPath = "/login";
        options.Events.OnRedirectToLogin = context =>
        {
            if (context.Request.Path.StartsWithSegments("/api"))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }
            context.Response.Redirect(context.RedirectUri);
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            if (context.Request.Path.StartsWithSegments("/api"))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            }
            context.Response.Redirect(context.RedirectUri);
            return Task.CompletedTask;
        };
    })
    .AddCookie(IdentityConstants.TwoFactorUserIdScheme, options =>
    {
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        options.Cookie.Path = "/api/auth";
        options.ExpireTimeSpan = TimeSpan.FromMinutes(5);
        options.SlidingExpiration = false;
    })
    .AddCookie(IdentityConstants.ExternalScheme, options =>
    {
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
        options.Cookie.Path = "/api/auth/external";
        options.ExpireTimeSpan = TimeSpan.FromMinutes(5);
        options.SlidingExpiration = false;
    });

// OIDC is entirely opt-in. An external subject becomes a local Identity login
// only after a signed-in user explicitly links it with password reauthentication.
if (builder.Configuration.GetValue<bool>("ExternalOidc:Enabled"))
{
    var authority = builder.Configuration["ExternalOidc:Authority"];
    var clientId = builder.Configuration["ExternalOidc:ClientId"];
    var secret = builder.Configuration["ExternalOidc:ClientSecret"];
    if (!Uri.TryCreate(authority, UriKind.Absolute, out var issuer) ||
        (issuer.Scheme != Uri.UriSchemeHttps && !(builder.Environment.IsDevelopment() && issuer.Scheme == Uri.UriSchemeHttp)) ||
        string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(secret))
        throw new InvalidOperationException("ExternalOidc is enabled but Authority, ClientId or ClientSecret is missing or invalid.");
    builder.Services.AddAuthentication().AddOpenIdConnect(ExternalOidcEndpoints.Scheme, options =>
    {
        options.Authority = authority;
        options.ClientId = clientId;
        options.ClientSecret = secret;
        options.SignInScheme = IdentityConstants.ExternalScheme;
        options.CallbackPath = "/signin-oidc";
        options.ResponseType = OpenIdConnectResponseType.Code;
        options.UsePkce = true;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.SaveTokens = false;
        options.GetClaimsFromUserInfoEndpoint = false;
        options.Events = new OpenIdConnectEvents
        {
            OnRemoteFailure = context =>
            {
                context.HandleResponse();
                context.Response.Redirect("/login?externalError=failed");
                return Task.CompletedTask;
            }
        };
    });
}
builder.Services.AddSingleton<IAuthorizationHandler, PermissionHandler>();
builder.Services.AddAuthorization(options => options.AddAppPolicies());
builder.Services.Configure<SecurityStampValidatorOptions>(options => options.ValidationInterval = TimeSpan.FromMinutes(5));
builder.Services.AddAntiforgery(options => {
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
});
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("login", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 8, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
    options.AddPolicy("account-recovery", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 8, Window = TimeSpan.FromMinutes(10), QueueLimit = 0 }));
    options.AddPolicy("mfa", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(10), QueueLimit = 0 }));
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

var app = builder.Build();

if (app.Configuration.GetValue<bool>("Database:ApplyMigrationsOnStartup"))
{
    await using var scope = app.Services.CreateAsyncScope();
    var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await database.Database.MigrateAsync();
}
if (app.Configuration.GetValue<bool>("Bootstrap:Enabled"))
{
    await using var scope = app.Services.CreateAsyncScope();
    var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
    var adminName = app.Configuration["Bootstrap:AdminUserName"] ?? app.Configuration["Bootstrap:AdminEmail"];
    var email = app.Configuration["Bootstrap:AdminEmail"];
    var password = app.Configuration["Bootstrap:AdminPassword"];
    if (string.IsNullOrWhiteSpace(adminName) || string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        throw new InvalidOperationException("Bootstrap explicitly enabled but administrator credentials are missing.");
    if (!await users.Users.AnyAsync())
    {
        var created = await users.CreateAsync(new AppUser { UserName = adminName, Email = email, EmailConfirmed = true }, password);
        if (!created.Succeeded)
            throw new InvalidOperationException("Bootstrap account creation failed: " +
                string.Join(", ", created.Errors.Select(e => e.Code)));
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        const string roleName = "Administrators";
        if (!await roles.RoleExistsAsync(roleName))
        {
            var roleCreated = await roles.CreateAsync(new IdentityRole<Guid>(roleName));
            if (!roleCreated.Succeeded)
                throw new InvalidOperationException("Bootstrap role creation failed: " + string.Join(", ", roleCreated.Errors.Select(e => e.Code)));
        }
        var roleAssigned = await users.AddToRoleAsync(await users.FindByNameAsync(adminName) ?? throw new InvalidOperationException("Provisioned user not found."), roleName);
        if (!roleAssigned.Succeeded)
            throw new InvalidOperationException("Bootstrap role assignment failed: " + string.Join(", ", roleAssigned.Errors.Select(e => e.Code)));
        app.Logger.LogWarning("First administrator account provisioned. Disable Bootstrap:Enabled and remove the password secret.");
    }
}
// This preview-only account is never created in production. Do not reset existing
// accounts or assign administrator rights to a pre-existing user named admin.
if (app.Environment.IsDevelopment() && app.Configuration.GetValue<bool>("Bootstrap:DevelopmentAdmin:Enabled"))
{
    await using var scope = app.Services.CreateAsyncScope();
    var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
    var existing = await users.FindByNameAsync("admin");
    if (existing is null)
    {
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        if (!await roles.RoleExistsAsync("Administrators"))
        {
            var role = await roles.CreateAsync(new IdentityRole<Guid>("Administrators"));
            if (!role.Succeeded) throw new InvalidOperationException("Development administrator role creation failed.");
        }
        var admin = new AppUser { UserName = "admin", Email = "admin@localhost.invalid", EmailConfirmed = true };
        // Development compatibility: keep admin/admin without weakening Identity's
        // 12-character password policy for other users or production.
        admin.PasswordHash = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>()
            .HashPassword(admin, "admin");
        var created = await users.CreateAsync(admin);
        if (!created.Succeeded) throw new InvalidOperationException(
            "Development administrator creation failed: " + string.Join(", ", created.Errors.Select(e => e.Code)));
        var assigned = await users.AddToRoleAsync(admin, "Administrators");
        if (!assigned.Succeeded) throw new InvalidOperationException("Development administrator role assignment failed.");
        app.Logger.LogWarning("Development-only demo administrator provisioned. Never enable demo credentials in production.");
    }
}
app.UseExceptionHandler();
app.Use(async (context, next) =>
{
    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.Headers["Referrer-Policy"] =
        context.Request.Path.StartsWithSegments("/reset-password") ||
        context.Request.Path.StartsWithSegments("/verify-email") ? "no-referrer" : "strict-origin-when-cross-origin";
    if (context.Request.Path.StartsWithSegments("/api/auth") ||
        context.Request.Path.StartsWithSegments("/api/admin") ||
        context.Request.Path.StartsWithSegments("/api/account") ||
        context.Request.Path.StartsWithSegments("/api/push"))
        context.Response.Headers.CacheControl = "no-store";
    await next();
});
app.UseForwardedHeaders();
if (!app.Environment.IsDevelopment()) app.UseHsts();
if (!app.Environment.IsDevelopment()) app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api") &&
        !HttpMethods.IsGet(context.Request.Method) &&
        !HttpMethods.IsHead(context.Request.Method) &&
        !HttpMethods.IsOptions(context.Request.Method))
    {
        try { await context.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(context); }
        catch (AntiforgeryValidationException)
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsJsonAsync(new { title = "Invalid antiforgery token." });
            return;
        }
    }
    await next();
});
app.MapGet("/health/ready", async (AppDbContext db, CancellationToken ct) => (await db.Database.CanConnectAsync(ct)) ? Results.Ok(new { status = "ready" }) : Results.StatusCode(503));
app.MapGet("/health/live", () => Results.Ok(new { status = "alive" }));
if (app.Environment.IsDevelopment()) app.MapOpenApi();
app.MapAuthEndpoints();
app.MapAccountEndpoints();
app.MapMfaEndpoints();
app.MapPasskeyEndpoints();
app.MapExternalOidcEndpoints();
app.MapWorkItemEndpoints();
app.MapPushEndpoints();
app.MapAdministrationEndpoints();
app.Map("/api/{**path}", () => Results.NotFound());
app.MapFallbackToFile("index.html");
app.Run();

public partial class Program;
