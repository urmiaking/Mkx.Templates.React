using System.Net;
using System.Security.Claims;
using Mkx.Templates.Contracts.Authorization;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Mkx.Templates.Contracts;
using Mkx.Templates.Infrastructure.Persistence;
using Xunit;

namespace Mkx.Templates.Tests;

public sealed class AuthenticatedCrudTests
{
    private sealed record TokenResponse(string Token);

    [Fact]
    public async Task CookieLogin_WithCsrf_AllowsWorkItemCreateUpdateDelete_AndRejectsStaleVersion()
    {
        var file = Path.Combine(Path.GetTempPath(), $"mkx-auth-{Guid.NewGuid():N}.db");
        var ct = TestContext.Current.CancellationToken;
        try
        {
            await using (var factory = new AppFactory(file))
            {
                using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
                {
                    AllowAutoRedirect = false, HandleCookies = true
                });
                using (var scope = factory.Services.CreateScope())
                {
                    var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
                    var result = await users.CreateAsync(new AppUser
                    { UserName = "qa@example.com", Email = "qa@example.com", EmailConfirmed = true },
                    "Sample-Testing-Password-123!");
                    Assert.True(result.Succeeded, string.Join("; ", result.Errors.Select(x => x.Description)));
                    Assert.True((await users.AddClaimsAsync(
                        await users.FindByEmailAsync("qa@example.com") ?? throw new Exception("Test user missing"),
                        [
                            new Claim(AppPolicies.SampleItems.View, "true"),
                            new Claim(AppPolicies.SampleItems.Manage, "true")
                        ])).Succeeded);
                }
                var anonymous = await client.PostAsJsonAsync("/api/work-items/", new CreateWorkItemRequest("Forbidden"), ct);
                Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

                await UseCsrfAsync(client, ct);
                var signedIn = await client.PostAsJsonAsync("/api/auth/login",
                    new { email = "qa@example.com", password = "Sample-Testing-Password-123!" }, ct);
                Assert.Equal(HttpStatusCode.NoContent, signedIn.StatusCode);

                client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
                var noToken = await client.PostAsJsonAsync("/api/work-items/", new CreateWorkItemRequest("Rejected"), ct);
                Assert.Equal(HttpStatusCode.BadRequest, noToken.StatusCode);

                await UseCsrfAsync(client, ct);
                var create = await client.PostAsJsonAsync("/api/work-items/", new CreateWorkItemRequest("First"), ct);
                Assert.Equal(HttpStatusCode.Created, create.StatusCode);
                var item = await create.Content.ReadFromJsonAsync<WorkItemDto>(cancellationToken: ct);
                Assert.NotNull(item);

                var update = await client.PutAsJsonAsync($"/api/work-items/{item.Id}",
                    new UpdateWorkItemRequest("Second", true, item.Version), ct);
                Assert.Equal(HttpStatusCode.OK, update.StatusCode);
                var updated = await update.Content.ReadFromJsonAsync<WorkItemDto>(cancellationToken: ct);
                Assert.NotNull(updated);
                Assert.Equal(item.Version + 1, updated.Version);
                Assert.True(updated.IsComplete);

                var stale = await client.PutAsJsonAsync($"/api/work-items/{item.Id}",
                    new UpdateWorkItemRequest("Stale", false, item.Version), ct);
                Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);

                var delete = await client.DeleteAsync($"/api/work-items/{item.Id}?version={updated.Version}", ct);
                Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
                var remaining = await client.GetFromJsonAsync<WorkItemsPage>("/api/work-items/", ct);
                Assert.Equal(0, remaining?.Total);
            }
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            if (File.Exists(file)) File.Delete(file);
        }
    }

    [Fact]
    public async Task AdminPolicies_AreEnforced_WithSafeMemberCreationAndClaims()
    {
        var file = Path.Combine(Path.GetTempPath(), $"mkx-admin-{Guid.NewGuid():N}.db");
        var ct = TestContext.Current.CancellationToken;
        try
        {
            await using (var factory = new AppFactory(file))
            {
                using var adminClient = factory.CreateClient(new WebApplicationFactoryClientOptions
                {
                    AllowAutoRedirect = false, HandleCookies = true
                });
                using (var scope = factory.Services.CreateScope())
                {
                    var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
                    var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
                    Assert.True((await roles.CreateAsync(new IdentityRole<Guid>("Administrators"))).Succeeded);
                    var admin = new AppUser { UserName = "root@example.com", Email = "root@example.com" };
                    Assert.True((await users.CreateAsync(admin, "Strong-Testing-Password-123!")).Succeeded);
                    Assert.True((await users.AddToRoleAsync(admin, "Administrators")).Succeeded);
                }

                Assert.Equal(HttpStatusCode.Unauthorized,
                    (await adminClient.GetAsync("/api/admin/users", ct)).StatusCode);
                await UseCsrfAsync(adminClient, ct);
                Assert.Equal(HttpStatusCode.NoContent, (await adminClient.PostAsJsonAsync(
                    "/api/auth/login", new { email = "root@example.com", password = "Strong-Testing-Password-123!" }, ct)).StatusCode);
                await UseCsrfAsync(adminClient, ct);
                Assert.Equal(HttpStatusCode.OK, (await adminClient.GetAsync("/api/admin/users", ct)).StatusCode);

                var createdResponse = await adminClient.PostAsJsonAsync("/api/admin/users",
                    new CreateUserRequest("member@example.com", "Member-Testing-Password-123!"), ct);
                Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
                var member = await createdResponse.Content.ReadFromJsonAsync<UserSummary>(cancellationToken: ct);
                Assert.NotNull(member);
                Assert.Contains("Users", member.Roles);
                Assert.DoesNotContain("Administrators", member.Roles);

                var deniedRole = await adminClient.PutAsJsonAsync("/api/admin/roles/Administrators/permissions",
                    new UpdatePermissionsRequest([AppPolicies.Users.Manage]), ct);
                Assert.Equal(HttpStatusCode.Forbidden, deniedRole.StatusCode);

                var badClaim = await adminClient.PutAsJsonAsync($"/api/admin/users/{member.Id}/permissions",
                    new UpdatePermissionsRequest(["unregistered.permission"]), ct);
                Assert.Equal(HttpStatusCode.BadRequest, badClaim.StatusCode);

                var claimsResponse = await adminClient.PutAsJsonAsync($"/api/admin/users/{member.Id}/permissions",
                    new UpdatePermissionsRequest([AppPolicies.SampleItems.View]), ct);
                Assert.Equal(HttpStatusCode.NoContent, claimsResponse.StatusCode);
                using var memberClient = factory.CreateClient(new WebApplicationFactoryClientOptions
                {
                    AllowAutoRedirect = false, HandleCookies = true
                });
                await UseCsrfAsync(memberClient, ct);
                Assert.Equal(HttpStatusCode.NoContent, (await memberClient.PostAsJsonAsync(
                    "/api/auth/login", new { email = "member@example.com", password = "Member-Testing-Password-123!" }, ct)).StatusCode);
                await UseCsrfAsync(memberClient, ct);

                Assert.Equal(HttpStatusCode.OK, (await memberClient.GetAsync("/api/work-items/", ct)).StatusCode);
                Assert.Equal(HttpStatusCode.Forbidden, (await memberClient.GetAsync("/api/admin/users", ct)).StatusCode);
                Assert.Equal(HttpStatusCode.Forbidden, (await memberClient.PostAsJsonAsync(
                    "/api/work-items/", new CreateWorkItemRequest("Not allowed"), ct)).StatusCode);
                Assert.Equal(HttpStatusCode.Forbidden, (await memberClient.PutAsJsonAsync(
                    "/api/admin/users/" + member.Id + "/permissions",
                    new UpdatePermissionsRequest([AppPolicies.Users.ManageClaims]), ct)).StatusCode);
            }
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            if (File.Exists(file)) File.Delete(file);
        }
    }

    private static async Task UseCsrfAsync(HttpClient client, CancellationToken ct)
    {
        var token = await client.GetFromJsonAsync<TokenResponse>("/api/auth/csrf", ct);
        Assert.False(string.IsNullOrWhiteSpace(token?.Token));
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", token!.Token);
    }

    private sealed class AppFactory(string file) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Database:Provider"] = "Sqlite",
                    ["Database:ApplyMigrationsOnStartup"] = "true",
                    ["Bootstrap:Enabled"] = "false"
                }));
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=" + file));
            });
        }
    }
}
