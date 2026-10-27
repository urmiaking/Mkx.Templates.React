using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Mkx.Templates.Contracts;
using Mkx.Templates.Infrastructure.Notifications;
using Mkx.Templates.Infrastructure.Persistence;
using Xunit;

namespace Mkx.Templates.Tests;

public class PushTests
{
    private static PushNotificationService Service(AppDbContext db) =>
        new(db, new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Push:Enabled"] = "true", ["Push:Subject"] = "mailto:test@example.org",
            ["Push:PublicKey"] = "public-test", ["Push:PrivateKey"] = "private-test"
        }).Build(), NullLogger<PushNotificationService>.Instance);

    [Theory]
    [InlineData("https://localhost/push")]
    [InlineData("https://127.0.0.1/push")]
    [InlineData("http://fcm.googleapis.com/push")]
    [InlineData("https://evil.invalid/push")]
    [InlineData("https://fcm.googleapis.com.evil.invalid/push")]
    [InlineData("https://fcm.googleapis.com:8443/push")]
    public async Task UnsafePushEndpointsAreRejected(string endpoint)
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync(TestContext.Current.CancellationToken);
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options);
        Assert.False(Service(db).IsTrustedEndpoint(endpoint));
        Assert.True(Service(db).IsTrustedEndpoint("https://fcm.googleapis.com/fcm/send/browser"));
        Assert.True(Service(db).IsTrustedEndpoint("https://updates.push.services.mozilla.com/wpush/v2/browser"));
    }

    [Fact]
    public async Task BrowserOwnershipAndRevocationAreIsolated()
    {
        var ct=TestContext.Current.CancellationToken;
        await using var connection=new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync(ct);
        await using var db=new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options);
        await db.Database.EnsureCreatedAsync(ct);
        var first=Guid.NewGuid();var second=Guid.NewGuid();
        db.Users.AddRange(new AppUser { Id=first, UserName="first" },new AppUser { Id=second, UserName="second" });
        await db.SaveChangesAsync(ct);
        var service=Service(db);
        const string endpoint="https://fcm.googleapis.com/fcm/send/device";
        var request=new RegisterPushSubscriptionRequest(endpoint,"p256dh","auth","Chrome");
        await service.RegisterAsync(first,request,ct);
        await service.RegisterAsync(second,request with { DeviceName="Edge" },ct);
        Assert.Equal(second,(await db.UserPushSubscriptions.SingleAsync(ct)).UserId);
        await service.RevokeAsync(first,endpoint,ct);
        Assert.Equal(1,await db.UserPushSubscriptions.CountAsync(ct));
        await service.RevokeAsync(second,endpoint,ct);
        Assert.Empty(await db.UserPushSubscriptions.ToListAsync(ct));
    }

    [Fact]
    public async Task AnonymousCannotAccessPushConfiguration()
    {
        using var factory=new WebApplicationFactory<Program>().WithWebHostBuilder(builder=>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_,config)=>config.AddInMemoryCollection(new Dictionary<string,string?>
            {
                ["Database:ApplyMigrationsOnStartup"]="false",
                ["Bootstrap:Enabled"]="false",
                ["ConnectionStrings:Default"]="Data Source=:memory:"
            }));
        });
        using var client=factory.CreateClient(new WebApplicationFactoryClientOptions{AllowAutoRedirect=false});
        using var response=await client.GetAsync("/api/push/configuration",TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Unauthorized,response.StatusCode);
    }
}
