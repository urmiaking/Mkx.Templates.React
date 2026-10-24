using System.Text.Json;
using System.Buffers.Binary;
using System.Security.Cryptography;
using Mkx.Templates.Server.Endpoints;
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
using Mkx.Templates.Server.Services;
using Microsoft.AspNetCore.WebUtilities;
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
                    new { userName = "qa@example.com", password = "Sample-Testing-Password-123!" }, ct);
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
                    "/api/auth/login", new { userName = "root@example.com", password = "Strong-Testing-Password-123!" }, ct)).StatusCode);
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
                    "/api/auth/login", new { userName = "member@example.com", password = "Member-Testing-Password-123!" }, ct)).StatusCode);
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

    [Fact]
    public async Task AccountLifecycle_ProtectsAdministratorsAndSelf_AndEnforcesPolicies()
    {
        var file = Path.Combine(Path.GetTempPath(), $"mkx-lifecycle-{Guid.NewGuid():N}.db");
        var ct = TestContext.Current.CancellationToken;
        try
        {
            await using var factory = new AppFactory(file);
            using var admin = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false, HandleCookies = true
            });
            using (var scope = factory.Services.CreateScope())
            {
                var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
                var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
                Assert.True((await roles.CreateAsync(new IdentityRole<Guid>("Administrators"))).Succeeded);
                var root = new AppUser { UserName = "root@example.com", Email = "root@example.com", EmailConfirmed = true };
                Assert.True((await users.CreateAsync(root, "Strong-Testing-Password-123!")).Succeeded);
                Assert.True((await users.AddToRoleAsync(root, "Administrators")).Succeeded);
                var viewer = new AppUser { UserName = "viewer@example.com", Email = "viewer@example.com" };
                Assert.True((await users.CreateAsync(viewer, "Viewer-Testing-Password-123!")).Succeeded);
                Assert.True((await users.AddClaimAsync(viewer, new Claim(AppPolicies.Users.View, "true"))).Succeeded);
            }
            await UseCsrfAsync(admin, ct);
            Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsJsonAsync(
                "/api/auth/login", new { userName = "root@example.com", password = "Strong-Testing-Password-123!" }, ct)).StatusCode);
            await UseCsrfAsync(admin, ct);

            var created = await admin.PostAsJsonAsync("/api/admin/users",
                new CreateUserRequest("member@example.com", "Member-Testing-Password-123!"), ct);
            Assert.Equal(HttpStatusCode.Created, created.StatusCode);
            var user = await created.Content.ReadFromJsonAsync<UserSummary>(cancellationToken: ct);
            Assert.NotNull(user);

            var usersPage = await admin.GetFromJsonAsync<UsersPage>("/api/admin/users", ct);
            var rootSummary = Assert.Single(usersPage!.Items, x => x.Email == "root@example.com");
            var selfDelete = await admin.DeleteAsync($"/api/admin/users/{rootSummary.Id}", ct);
            Assert.Equal(HttpStatusCode.Forbidden, selfDelete.StatusCode);
            var protectedEdit = await admin.PutAsJsonAsync($"/api/admin/users/{rootSummary.Id}/account",
                new UpdateUserAccountRequest("renamed-root@example.com"), ct);
            Assert.Equal(HttpStatusCode.Forbidden, protectedEdit.StatusCode);

            var invalidRole = await admin.PutAsJsonAsync($"/api/admin/users/{user.Id}/roles",
                new UpdateUserRolesRequest(["Administrators"]), ct);
            Assert.Equal(HttpStatusCode.BadRequest, invalidRole.StatusCode);

            var edited = await admin.PutAsJsonAsync($"/api/admin/users/{user.Id}/account",
                new UpdateUserAccountRequest("changed@example.com"), ct);
            Assert.Equal(HttpStatusCode.OK, edited.StatusCode);
            var summary = await edited.Content.ReadFromJsonAsync<UserSummary>(cancellationToken: ct);
            Assert.Equal("changed@example.com", summary!.Email);
            Assert.False(summary.EmailConfirmed);

            var duplicate = await admin.PutAsJsonAsync($"/api/admin/users/{user.Id}/account",
                new UpdateUserAccountRequest("root@example.com"), ct);
            Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

            var noMembership = await admin.PutAsJsonAsync($"/api/admin/users/{user.Id}/roles",
                new UpdateUserRolesRequest([]), ct);
            Assert.Equal(HttpStatusCode.OK, noMembership.StatusCode);
            var member = await noMembership.Content.ReadFromJsonAsync<UserSummary>(cancellationToken: ct);
            Assert.DoesNotContain("Users", member!.Roles);
            var membership = await admin.PutAsJsonAsync($"/api/admin/users/{user.Id}/roles",
                new UpdateUserRolesRequest(["Users"]), ct);
            Assert.Equal(HttpStatusCode.OK, membership.StatusCode);

            var locked = await admin.PutAsJsonAsync($"/api/admin/users/{user.Id}/lock",
                new UpdateUserLockRequest(true), ct);
            Assert.Equal(HttpStatusCode.OK, locked.StatusCode);
            Assert.True((await locked.Content.ReadFromJsonAsync<UserSummary>(cancellationToken: ct))!.IsLocked);
            using var memberClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            await UseCsrfAsync(memberClient, ct);
            Assert.Equal(HttpStatusCode.Unauthorized, (await memberClient.PostAsJsonAsync(
                "/api/auth/login", new { userName = "changed@example.com", password = "Member-Testing-Password-123!" }, ct)).StatusCode);

            var unlocked = await admin.PutAsJsonAsync($"/api/admin/users/{user.Id}/lock",
                new UpdateUserLockRequest(false), ct);
            Assert.Equal(HttpStatusCode.OK, unlocked.StatusCode);
            Assert.False((await unlocked.Content.ReadFromJsonAsync<UserSummary>(cancellationToken: ct))!.IsLocked);

            using var viewerClient = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            await UseCsrfAsync(viewerClient, ct);
            Assert.Equal(HttpStatusCode.NoContent, (await viewerClient.PostAsJsonAsync(
                "/api/auth/login", new { userName = "viewer@example.com", password = "Viewer-Testing-Password-123!" }, ct)).StatusCode);
            await UseCsrfAsync(viewerClient, ct);
            Assert.Equal(HttpStatusCode.OK, (await viewerClient.GetAsync("/api/admin/users", ct)).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await viewerClient.PutAsJsonAsync($"/api/admin/users/{user.Id}/lock",
                new UpdateUserLockRequest(true), ct)).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await viewerClient.DeleteAsync($"/api/admin/users/{user.Id}", ct)).StatusCode);

            Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/users/{user.Id}", ct)).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await admin.DeleteAsync($"/api/admin/users/{user.Id}", ct)).StatusCode);
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            if (File.Exists(file)) File.Delete(file);
        }
    }

    [Fact]
    public async Task DevelopmentDemoAdmin_SignsInByUserName_WithUnchangedCredentials()
    {
        var file = Path.Combine(Path.GetTempPath(), $"mkx-devadmin-{Guid.NewGuid():N}.db");
        var ct = TestContext.Current.CancellationToken;
        try
        {
            await using var factory = new AppFactory(file, enableDemo: true);
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
                { AllowAutoRedirect = false, HandleCookies = true });
            using (var scope = factory.Services.CreateScope())
            {
                var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
                var account = await users.FindByNameAsync("admin");
                Assert.NotNull(account);
                Assert.True(await users.IsInRoleAsync(account, "Administrators"));
            }
            await UseCsrfAsync(client, ct);
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await client.PostAsJsonAsync("/api/auth/login", new { userName = "admin", password = "wrong" }, ct)).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent,
                (await client.PostAsJsonAsync("/api/auth/login", new { userName = "admin", password = "admin" }, ct)).StatusCode);
            var me = await client.GetFromJsonAsync<JsonElement>("/api/auth/me", ct);
            Assert.Equal("admin", me.GetProperty("userName").GetString());
            Assert.True(me.GetProperty("authenticated").GetBoolean());
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            if (File.Exists(file)) File.Delete(file);
        }
    }

    [Fact]
    public async Task MemberLogin_UsesUsernameNotEmail_AndKeepsAccountFieldsIndependent()
    {
        var file = Path.Combine(Path.GetTempPath(), $"mkx-username-{Guid.NewGuid():N}.db");
        var ct = TestContext.Current.CancellationToken;
        try
        {
            await using var factory = new AppFactory(file);
            using var admin = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            using (var scope = factory.Services.CreateScope())
            {
                var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
                var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
                Assert.True((await roles.CreateAsync(new IdentityRole<Guid>("Administrators"))).Succeeded);
                var root = new AppUser { UserName = "root", Email = "root@example.com", EmailConfirmed = true };
                Assert.True((await users.CreateAsync(root, "Strong-Testing-Password-123!")).Succeeded);
                Assert.True((await users.AddToRoleAsync(root, "Administrators")).Succeeded);
            }
            await UseCsrfAsync(admin, ct);
            Assert.Equal(HttpStatusCode.NoContent,
                (await admin.PostAsJsonAsync("/api/auth/login", new { userName = "root", password = "Strong-Testing-Password-123!" }, ct)).StatusCode);
            await UseCsrfAsync(admin, ct);
            var response = await admin.PostAsJsonAsync("/api/admin/users",
                new CreateUserRequest("member@example.com", "Member-Testing-Password-123!", "member01"), ct);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var user = await response.Content.ReadFromJsonAsync<UserSummary>(cancellationToken: ct);
            Assert.Equal("member01", user?.UserName);
            var updated = await admin.PutAsJsonAsync($"/api/admin/users/{user!.Id}/account",
                new UpdateUserAccountRequest("changed@example.com", "member02"), ct);
            Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
            var edited = await updated.Content.ReadFromJsonAsync<UserSummary>(cancellationToken: ct);
            Assert.Equal("member02", edited?.UserName);
            Assert.Equal("changed@example.com", edited?.Email);
            using var member = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            await UseCsrfAsync(member, ct);
            Assert.Equal(HttpStatusCode.Unauthorized, (await member.PostAsJsonAsync("/api/auth/login",
                new { userName = "changed@example.com", password = "Member-Testing-Password-123!" }, ct)).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, (await member.PostAsJsonAsync("/api/auth/login",
                new { userName = "member02", password = "Member-Testing-Password-123!" }, ct)).StatusCode);
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            if (File.Exists(file)) File.Delete(file);
        }
    }

    [Fact]
    public async Task SelfService_RequiresAuthentication_AndSupportsPasswordAndVerifiedRecovery()
    {
        var file = Path.Combine(Path.GetTempPath(), $"mkx-account-{Guid.NewGuid():N}.db");
        var ct = TestContext.Current.CancellationToken;
        var sender = new RecordingAccountMailer();
        try
        {
            await using var factory = new AppFactory(file, sender: sender);
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await client.GetAsync("/api/account/profile", ct)).StatusCode);
            using (var scope = factory.Services.CreateScope())
            {
                var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
                var person = new AppUser { UserName = "member", Email = "member@example.com", EmailConfirmed = false };
                Assert.True((await users.CreateAsync(person, "Original-Testing-123!")).Succeeded);
            }

            await UseCsrfAsync(client, ct);
            Assert.Equal(HttpStatusCode.NoContent,
                (await client.PostAsJsonAsync("/api/auth/login", new { userName = "member", password = "Original-Testing-123!" }, ct)).StatusCode);
            await UseCsrfAsync(client, ct);
            var profile = await client.GetFromJsonAsync<JsonElement>("/api/account/profile", ct);
            Assert.Equal("member", profile.GetProperty("userName").GetString());
            Assert.False(profile.GetProperty("emailConfirmed").GetBoolean());

            Assert.Equal(HttpStatusCode.BadRequest,
                (await client.PostAsJsonAsync("/api/account/password", new {
                    currentPassword = "bad", newPassword = "Changed-Testing-456!"
                }, ct)).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent,
                (await client.PostAsJsonAsync("/api/account/password", new {
                    currentPassword = "Original-Testing-123!", newPassword = "Changed-Testing-456!"
                }, ct)).StatusCode);
            await UseCsrfAsync(client, ct);
            Assert.Equal(HttpStatusCode.OK,
                (await client.PutAsJsonAsync("/api/account/profile", new {
                    userName = "member-renamed", email = "new-member@example.com"
                }, ct)).StatusCode);
            await UseCsrfAsync(client, ct);
            Assert.Equal(HttpStatusCode.Accepted,
                (await client.PostAsync("/api/account/verify-email/request", null, ct)).StatusCode);
            Assert.Single(sender.Messages);
            var link = new Uri(sender.Messages[0].Body.Split('\n').Last().Trim());
            var query = QueryHelpers.ParseQuery(link.Query);
            Assert.Equal(HttpStatusCode.NoContent,
                (await client.PostAsJsonAsync("/api/account/verify-email",
                    new { userId = query["userId"].ToString(), token = query["token"].ToString() }, ct)).StatusCode);

            Assert.Equal(HttpStatusCode.Accepted,
                (await client.PostAsJsonAsync("/api/account/forgot-password",
                    new { email = "unknown@example.com" }, ct)).StatusCode);
            Assert.Single(sender.Messages);
            Assert.Equal(HttpStatusCode.Accepted,
                (await client.PostAsJsonAsync("/api/account/forgot-password",
                    new { email = "new-member@example.com" }, ct)).StatusCode);
            Assert.Equal(2, sender.Messages.Count);
            var resetLink = new Uri(sender.Messages[1].Body.Split('\n').Last().Trim());
            var resetQuery = QueryHelpers.ParseQuery(resetLink.Query);
            Assert.Equal(HttpStatusCode.BadRequest,
                (await client.PostAsJsonAsync("/api/account/reset-password", new {
                    email = "new-member@example.com", token = "invalid", newPassword = "Last-Testing-789!"
                }, ct)).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent,
                (await client.PostAsJsonAsync("/api/account/reset-password", new {
                    email = resetQuery["email"].ToString(),
                    token = resetQuery["token"].ToString(),
                    newPassword = "Last-Testing-789!"
                }, ct)).StatusCode);

            using var fresh = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
            await UseCsrfAsync(fresh, ct);
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await fresh.PostAsJsonAsync("/api/auth/login",
                    new { userName = "member-renamed", password = "Changed-Testing-456!" }, ct)).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent,
                (await fresh.PostAsJsonAsync("/api/auth/login",
                    new { userName = "member-renamed", password = "Last-Testing-789!" }, ct)).StatusCode);
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            if (File.Exists(file)) File.Delete(file);
        }
    }

    private sealed class RecordingAccountMailer : IAccountEmailSender
    {
        public bool IsConfigured => true;
        public List<(string To, string Body)> Messages { get; } = [];
        public Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken)
        {
            Messages.Add((to, body));
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task AuthenticatorMfa_RequiresPasswordAndCode_AndRecoveryCodesWorkOnce()
    {
        var file = Path.Combine(Path.GetTempPath(), $"mkx-mfa-{Guid.NewGuid():N}.db");
        var ct = TestContext.Current.CancellationToken;
        try
        {
            await using var factory = new AppFactory(file);
            using (var scope = factory.Services.CreateScope())
            {
                var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
                var member = new AppUser { UserName = "mfa-member", Email = "mfa@example.com", EmailConfirmed = true };
                Assert.True((await users.CreateAsync(member, "Mfa-Testing-Password-123!")).Succeeded);
            }
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false, HandleCookies = true });
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/account/mfa/status", ct)).StatusCode);
            await UseCsrfAsync(client, ct);
            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/auth/login",
                new { userName = "mfa-member", password = "Mfa-Testing-Password-123!" }, ct)).StatusCode);
            await UseCsrfAsync(client, ct);

            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/account/mfa/setup",
                new { currentPassword = "incorrect" }, ct)).StatusCode);
            var setupResponse = await client.PostAsJsonAsync("/api/account/mfa/setup",
                new { currentPassword = "Mfa-Testing-Password-123!" }, ct);
            Assert.Equal(HttpStatusCode.OK, setupResponse.StatusCode);
            var setup = await setupResponse.Content.ReadFromJsonAsync<MfaSetup>(cancellationToken: ct);
            Assert.NotNull(setup);
            Assert.StartsWith("otpauth://totp/", setup.AuthenticatorUri);
            var token = CurrentTotp(setup.SharedKey);
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/account/mfa/enable",
                new { currentPassword = "incorrect", code = token }, ct)).StatusCode);
            var enabledResponse = await client.PostAsJsonAsync("/api/account/mfa/enable",
                new { currentPassword = "Mfa-Testing-Password-123!", code = token }, ct);
            Assert.Equal(HttpStatusCode.OK, enabledResponse.StatusCode);
            var enabled = await enabledResponse.Content.ReadFromJsonAsync<MfaRecoveryCodes>(cancellationToken: ct);
            Assert.NotNull(enabled);
            Assert.Equal(10, enabled.Codes.Length);
            var status = await client.GetFromJsonAsync<MfaStatus>("/api/account/mfa/status", ct);
            Assert.True(status!.Enabled);
            Assert.Equal(10, status.RecoveryCodesLeft);

            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/logout", null, ct)).StatusCode);
            await UseCsrfAsync(client, ct);
            var login = await client.PostAsJsonAsync("/api/auth/login", new {
                userName = "mfa-member", password = "Mfa-Testing-Password-123!"
            }, ct);
            Assert.Equal(HttpStatusCode.Accepted, login.StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/account/mfa/status", ct)).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/2fa",
                new { code = "000000" }, ct)).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/auth/2fa",
                new { code = CurrentTotp(setup.SharedKey) }, ct)).StatusCode);
            Assert.True((await client.GetFromJsonAsync<MfaStatus>("/api/account/mfa/status", ct))!.Enabled);
            await UseCsrfAsync(client, ct);
            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/logout", null, ct)).StatusCode);
            await UseCsrfAsync(client, ct);
            Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/auth/login",
                new { userName = "mfa-member", password = "Mfa-Testing-Password-123!" }, ct)).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/auth/2fa",
                new { code = enabled.Codes[0], useRecoveryCode = true }, ct)).StatusCode);
            var afterRecovery = await client.GetFromJsonAsync<MfaStatus>("/api/account/mfa/status", ct);
            Assert.Equal(9, afterRecovery!.RecoveryCodesLeft);

            await UseCsrfAsync(client, ct);
            var replacedResponse = await client.PostAsJsonAsync("/api/account/mfa/recovery-codes",
                new { currentPassword = "Mfa-Testing-Password-123!", code = CurrentTotp(setup.SharedKey) }, ct);
            Assert.Equal(HttpStatusCode.OK, replacedResponse.StatusCode);
            var replacement = await replacedResponse.Content.ReadFromJsonAsync<MfaRecoveryCodes>(cancellationToken: ct);
            Assert.NotNull(replacement);
            Assert.Equal(10, replacement.Codes.Length);
            Assert.DoesNotContain(enabled.Codes[0], replacement.Codes);
            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/account/mfa/disable",
                new { currentPassword = "Mfa-Testing-Password-123!", code = CurrentTotp(setup.SharedKey) }, ct)).StatusCode);
            Assert.False((await client.GetFromJsonAsync<MfaStatus>("/api/account/mfa/status", ct))!.Enabled);
            await UseCsrfAsync(client, ct);
            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/logout", null, ct)).StatusCode);
            await UseCsrfAsync(client, ct);
            Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/auth/login", new {
                userName = "mfa-member", password = "Mfa-Testing-Password-123!"
            }, ct)).StatusCode);
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            if (File.Exists(file)) File.Delete(file);
        }
    }

    [Fact]
    public async Task Passkeys_RequireReauthentication_AndStayOwnedByCurrentUser()
    {
        var file = Path.Combine(Path.GetTempPath(), $"mkx-passkey-{Guid.NewGuid():N}.db");
        var ct = TestContext.Current.CancellationToken;
        try
        {
            await using var factory = new AppFactory(file);
            using (var scope = factory.Services.CreateScope())
            {
                var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
                var member = new AppUser { UserName = "passkey-member", Email = "pk@example.com", EmailConfirmed = true };
                var outsider = new AppUser { UserName = "other-member", Email = "other-pk@example.com", EmailConfirmed = true };
                Assert.True((await users.CreateAsync(member, "Passkey-Testing-Password-123!")).Succeeded);
                Assert.True((await users.CreateAsync(outsider, "Other-Testing-Password-123!")).Succeeded);
                // A synthetic stored public credential tests the EF Identity v3
                // schema and ownership checks; browser WebAuthn signatures remain
                // validated by the ASP.NET Core Identity passkey handler.
                var sample = new UserPasskeyInfo([1, 2, 3, 4], [5, 6, 7], DateTimeOffset.UtcNow,
                    0, [], true, false, false, [], []) { Name = "Laptop" };
                Assert.True((await users.AddOrUpdatePasskeyAsync(member, sample)).Succeeded);
            }
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
                { AllowAutoRedirect = false, HandleCookies = true });
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await client.GetAsync("/api/auth/passkeys", ct)).StatusCode);
            await UseCsrfAsync(client, ct);
            Assert.Equal(HttpStatusCode.Unauthorized,
                (await client.PostAsJsonAsync("/api/auth/passkeys/create-options",
                    new { currentPassword = "Passkey-Testing-Password-123!" }, ct)).StatusCode);
            var options = await client.PostAsync("/api/auth/passkeys/request-options", null, ct);
            Assert.Equal(HttpStatusCode.OK, options.StatusCode);
            Assert.Equal("application/json", options.Content.Headers.ContentType?.MediaType);
            Assert.False((await client.GetFromJsonAsync<JsonElement>("/api/auth/me", ct))
                .GetProperty("authenticated").GetBoolean());

            Assert.Equal(HttpStatusCode.NoContent,
                (await client.PostAsJsonAsync("/api/auth/login",
                    new { userName = "passkey-member", password = "Passkey-Testing-Password-123!" }, ct)).StatusCode);
            await UseCsrfAsync(client, ct);
            var listed = await client.GetFromJsonAsync<PasskeySummary[]>("/api/auth/passkeys", ct);
            var own = Assert.Single(listed!);
            Assert.Equal("Laptop", own.Name);
            Assert.Equal(WebEncoders.Base64UrlEncode([1, 2, 3, 4]), own.CredentialId);

            Assert.Equal(HttpStatusCode.BadRequest,
                (await client.PostAsJsonAsync("/api/auth/passkeys/create-options",
                    new { currentPassword = "wrong" }, ct)).StatusCode);
            var create = await client.PostAsJsonAsync("/api/auth/passkeys/create-options",
                new { currentPassword = "Passkey-Testing-Password-123!" }, ct);
            Assert.Equal(HttpStatusCode.OK, create.StatusCode);
            var creationOptions = await create.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
            Assert.True(creationOptions.TryGetProperty("challenge", out _));
            Assert.Equal(HttpStatusCode.BadRequest,
                (await client.PostAsJsonAsync("/api/auth/passkeys/register",
                    new { credentialJson = "{}", name = "Untrusted" }, ct)).StatusCode);

            Assert.Equal(HttpStatusCode.BadRequest,
                (await client.PostAsJsonAsync("/api/auth/passkeys/remove",
                    new { credentialId = own.CredentialId, currentPassword = "wrong" }, ct)).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound,
                (await client.PostAsJsonAsync("/api/auth/passkeys/remove",
                    new { credentialId = WebEncoders.Base64UrlEncode([8, 9]), currentPassword = "Passkey-Testing-Password-123!" }, ct)).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent,
                (await client.PostAsJsonAsync("/api/auth/passkeys/remove",
                    new { credentialId = own.CredentialId, currentPassword = "Passkey-Testing-Password-123!" }, ct)).StatusCode);
            Assert.Empty((await client.GetFromJsonAsync<PasskeySummary[]>("/api/auth/passkeys", ct))!);
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            if (File.Exists(file)) File.Delete(file);
        }
    }

    private static string CurrentTotp(string base32)
    {
        const string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        var secret = new List<byte>();
        var buffer = 0;
        var bits = 0;
        foreach (var digit in base32.TrimEnd('=').ToUpperInvariant())
        {
            var value = alphabet.IndexOf(digit);
            if (value < 0) throw new FormatException("Invalid authenticator secret.");
            buffer = (buffer << 5) | value;
            bits += 5;
            if (bits >= 8)
            {
                bits -= 8;
                secret.Add((byte)(buffer >> bits));
                buffer &= (1 << bits) - 1;
            }
        }
        Span<byte> step = stackalloc byte[8];
        BinaryPrimitives.WriteInt64BigEndian(step, DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 30);
        var hash = HMACSHA1.HashData(secret.ToArray(), step);
        var offset = hash[^1] & 15;
        var number = ((hash[offset] & 127) << 24) | (hash[offset + 1] << 16) |
            (hash[offset + 2] << 8) | hash[offset + 3];
        return (number % 1_000_000).ToString("D6", System.Globalization.CultureInfo.InvariantCulture);
    }

    private static async Task UseCsrfAsync(HttpClient client, CancellationToken ct)
    {
        var token = await client.GetFromJsonAsync<TokenResponse>("/api/auth/csrf", ct);
        Assert.False(string.IsNullOrWhiteSpace(token?.Token));
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", token!.Token);
    }

    private sealed class AppFactory(string file, bool enableDemo = false, RecordingAccountMailer? sender = null) : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.ConfigureAppConfiguration((_, config) =>
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Database:Provider"] = "Sqlite",
                    ["Database:ApplyMigrationsOnStartup"] = "true",
                    ["Bootstrap:Enabled"] = "false",
                    ["Bootstrap:DevelopmentAdmin:Enabled"] = enableDemo ? "true" : "false",
                    ["AccountEmail:PublicBaseUrl"] = "http://localhost:5173"
                }));
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=" + file));
                if (sender is not null)
                {
                    services.RemoveAll<IAccountEmailSender>();
                    services.AddSingleton<IAccountEmailSender>(sender);
                }
            });
        }
    }
}
