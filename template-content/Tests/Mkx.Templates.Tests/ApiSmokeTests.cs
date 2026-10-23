using System.Net;
using Microsoft.Data.Sqlite;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Mkx.Templates.Infrastructure.Persistence;
using Xunit;

namespace Mkx.Templates.Tests;

public sealed class ApiSmokeTests
{
    [Fact]
    public async Task Api_IsAvailable_AndMutationsRequireAntiforgery()
    {
        var databaseFile = Path.Combine(Path.GetTempPath(), "mkx-test-" + Guid.NewGuid().ToString("N") + ".db");
        var ct = TestContext.Current.CancellationToken;
        try
        {
            await using (var factory = new AppFactory(databaseFile))
            {
            using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
            var live = await client.GetAsync("/health/live", ct);
            Assert.Equal(HttpStatusCode.OK, live.StatusCode);

            var list = await client.GetAsync("/api/work-items/", ct);
            Assert.Equal(HttpStatusCode.OK, list.StatusCode);

            var noToken = await client.PostAsJsonAsync("/api/work-items/", new { title = "Should fail" }, ct);
            Assert.Equal(HttpStatusCode.Unauthorized, noToken.StatusCode);

            var tokens = await client.GetFromJsonAsync<TokenResponse>("/api/auth/csrf", ct);
            Assert.NotNull(tokens?.Token);
            }
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            if (File.Exists(databaseFile)) File.Delete(databaseFile);
        }
    }

    private sealed record TokenResponse(string Token);

    private sealed class AppFactory(string databaseFile) : WebApplicationFactory<Program>
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
                services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=" + databaseFile));
            });
        }
    }
}
