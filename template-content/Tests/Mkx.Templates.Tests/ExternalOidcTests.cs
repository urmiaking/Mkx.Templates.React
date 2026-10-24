using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Mkx.Templates.Infrastructure.Persistence;
using Mkx.Templates.Server.Endpoints;
using Xunit;

namespace Mkx.Templates.Tests;

public sealed class ExternalOidcTests
{
    private sealed record CsrfResponse(string Token);
    private sealed record Status(bool Enabled, string DisplayName, bool Linked);
    private sealed record Session(bool Authenticated, string? UserName, string[] Roles, string[] Permissions);

    [Fact]
    public async Task Oidc_OnlySignsInLinkedUsers_AndGuardsLinkAndUnlink()
    {
        var file = Path.Combine(Path.GetTempPath(), $"mkx-oidc-{Guid.NewGuid():N}.db");
        var ct = TestContext.Current.CancellationToken;
        try
        {
            await using var factory = new OidcFactory(file);
            using var alice = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true, AllowAutoRedirect = false });
            Guid aliceId, bobId;
            using (var scope = factory.Services.CreateScope())
            {
                var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
                var first = new AppUser { UserName = "alice", Email = "alice@example.test", EmailConfirmed = true };
                var second = new AppUser { UserName = "bob", Email = "bob@example.test", EmailConfirmed = true };
                Assert.True((await users.CreateAsync(first, "Alice-Testing-Password-123!")).Succeeded);
                Assert.True((await users.CreateAsync(second, "Bob-Testing-Password-123!")).Succeeded);
                aliceId = first.Id;
                bobId = second.Id;
            }
            Assert.True((await alice.GetFromJsonAsync<Status>("/api/auth/external/config", ct))!.Enabled);
            Assert.Equal(HttpStatusCode.Unauthorized, (await alice.GetAsync("/api/account/external", ct)).StatusCode);
            await alice.GetAsync("/__test/oidc?sub=external-1", ct);
            Assert.Equal("/login?externalError=not-linked", (await alice.GetAsync("/api/auth/external/callback", ct)).Headers.Location?.ToString());
            Assert.False((await alice.GetFromJsonAsync<Session>("/api/auth/me", ct))!.Authenticated);
            await Csrf(alice, ct);
            Assert.Equal(HttpStatusCode.NoContent, (await alice.PostAsJsonAsync("/api/auth/login",
                new { userName = "alice", password = "Alice-Testing-Password-123!" }, ct)).StatusCode);
            await Csrf(alice, ct);
            alice.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
            Assert.Equal(HttpStatusCode.BadRequest, (await alice.PostAsync("/api/account/external/link", Form("Alice-Testing-Password-123!"), ct)).StatusCode);
            var formToken = await Csrf(alice, ct);
            Assert.Equal("/account?external=invalid-password", (await alice.PostAsync("/api/account/external/link", Form("wrong"), ct)).Headers.Location?.ToString());
            alice.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
            var challenged = await alice.PostAsync("/api/account/external/link", Form("Alice-Testing-Password-123!", formToken), ct);
            Assert.Equal(HttpStatusCode.Redirect, challenged.StatusCode);
            Assert.Equal("issuer.example.test", challenged.Headers.Location?.Host);
            await alice.GetAsync($"/__test/oidc?sub=external-2&xsrf={bobId}", ct);
            Assert.Equal("/account?external=failed", (await alice.GetAsync("/api/auth/external/link-callback", ct)).Headers.Location?.ToString());
            Assert.False((await alice.GetFromJsonAsync<Status>("/api/account/external", ct))!.Linked);
            await alice.GetAsync($"/__test/oidc?sub=external-1&xsrf={aliceId}", ct);
            Assert.Equal("/account?external=linked", (await alice.GetAsync("/api/auth/external/link-callback", ct)).Headers.Location?.ToString());
            Assert.True((await alice.GetFromJsonAsync<Status>("/api/account/external", ct))!.Linked);

            using var remote = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true, AllowAutoRedirect = false });
            await remote.GetAsync("/__test/oidc?sub=external-1", ct);
            Assert.Equal("/", (await remote.GetAsync("/api/auth/external/callback", ct)).Headers.Location?.ToString());
            var session = await remote.GetFromJsonAsync<Session>("/api/auth/me", ct);
            Assert.Equal("alice", session!.UserName);
            Assert.Empty(session.Roles);
            Assert.Empty(session.Permissions);

            using var bob = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true, AllowAutoRedirect = false });
            await Csrf(bob, ct);
            Assert.Equal(HttpStatusCode.NoContent, (await bob.PostAsJsonAsync("/api/auth/login",
                new { userName = "bob", password = "Bob-Testing-Password-123!" }, ct)).StatusCode);
            await bob.GetAsync($"/__test/oidc?sub=external-1&xsrf={bobId}", ct);
            Assert.Equal("/account?external=unavailable", (await bob.GetAsync("/api/auth/external/link-callback", ct)).Headers.Location?.ToString());
            Assert.False((await bob.GetFromJsonAsync<Status>("/api/account/external", ct))!.Linked);

            await Csrf(alice, ct);
            Assert.Equal(HttpStatusCode.BadRequest, (await alice.PostAsJsonAsync("/api/account/external/unlink",
                new { currentPassword = "wrong" }, ct)).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, (await alice.PostAsJsonAsync("/api/account/external/unlink",
                new { currentPassword = "Alice-Testing-Password-123!" }, ct)).StatusCode);
            Assert.False((await alice.GetFromJsonAsync<Status>("/api/account/external", ct))!.Linked);
            using var removed = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true, AllowAutoRedirect = false });
            await removed.GetAsync("/__test/oidc?sub=external-1", ct);
            Assert.Equal("/login?externalError=not-linked",
                (await removed.GetAsync("/api/auth/external/callback", ct)).Headers.Location?.ToString());
        }
        finally { SqliteConnection.ClearAllPools(); if (File.Exists(file)) File.Delete(file); }
    }

    [Fact]
    public async Task Oidc_DisabledByDefault()
    {
        var file = Path.Combine(Path.GetTempPath(), $"mkx-oidc-off-{Guid.NewGuid():N}.db");
        var ct = TestContext.Current.CancellationToken;
        try
        {
            await using var factory = new OidcFactory(file, false);
            using var client = factory.CreateClient();
            Assert.False((await client.GetFromJsonAsync<Status>("/api/auth/external/config", ct))!.Enabled);
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/auth/external/start", ct)).StatusCode);
        }
        finally { SqliteConnection.ClearAllPools(); if (File.Exists(file)) File.Delete(file); }
    }

    private static FormUrlEncodedContent Form(string password, string? token = null) => new(
        token is null ? [new("currentPassword", password)] :
        [new("currentPassword", password), new("__RequestVerificationToken", token)]);
    private static async Task<string> Csrf(HttpClient client, CancellationToken ct)
    {
        var token = await client.GetFromJsonAsync<CsrfResponse>("/api/auth/csrf", ct);
        Assert.NotNull(token);
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", token.Token);
        return token.Token;
    }

    private sealed class OidcFactory(string file, bool enabled = true) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.UseSetting("ExternalOidc:Enabled", enabled ? "true" : "false");
            builder.UseSetting("ExternalOidc:Authority", "https://issuer.example.test");
            builder.UseSetting("ExternalOidc:ClientId", "test-client");
            builder.UseSetting("ExternalOidc:ClientSecret", "test-secret");
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string,string?>
            {
                ["Database:Provider"] = "Sqlite", ["Database:ApplyMigrationsOnStartup"] = "true",
                ["Bootstrap:Enabled"] = "false", ["Bootstrap:DevelopmentAdmin:Enabled"] = "false",
                ["ExternalOidc:Enabled"] = enabled.ToString(), ["ExternalOidc:Authority"] = "https://issuer.example.test",
                ["ExternalOidc:ClientId"] = "test-client", ["ExternalOidc:ClientSecret"] = "test-secret",
                ["ExternalOidc:DisplayName"] = "Test OIDC"
            }));
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=" + file));
                if (enabled)
                {
                    services.AddTransient<IStartupFilter, TestExternalCookieFilter>();
                    services.Configure<OpenIdConnectOptions>(ExternalOidcEndpoints.Scheme, options =>
                        options.Configuration = new OpenIdConnectConfiguration {
                            Issuer = "https://issuer.example.test",
                            AuthorizationEndpoint = "https://issuer.example.test/connect/authorize",
                            TokenEndpoint = "https://issuer.example.test/connect/token"
                        });
                }
            });
        }
    }

    // Test-only trusted temporary external principal; production obtains it from
    // the OIDC middleware after provider token and correlation validation.
    private sealed class TestExternalCookieFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Use(async (context, proceed) =>
            {
                if (context.Request.Path == "/__test/oidc")
                {
                    var sub = context.Request.Query["sub"].ToString();
                    if (string.IsNullOrWhiteSpace(sub)) { context.Response.StatusCode = 400; return; }
                    var claims = new[] {
                        new Claim(ClaimTypes.NameIdentifier, sub),
                        new Claim(ClaimTypes.Email, "untrusted@example.test"),
                        new Claim(ClaimTypes.Role, "Administrators")
                    };
                    var properties = new AuthenticationProperties();
                    properties.Items["LoginProvider"] = ExternalOidcEndpoints.Scheme;
                    var xsrf = context.Request.Query["xsrf"].ToString();
                    if (xsrf.Length != 0) properties.Items["XsrfId"] = xsrf;
                    await context.SignInAsync(IdentityConstants.ExternalScheme,
                        new ClaimsPrincipal(new ClaimsIdentity(claims, "test")), properties);
                    context.Response.StatusCode = 204;
                    return;
                }
                await proceed();
            });
            next(app);
        };
    }
}
