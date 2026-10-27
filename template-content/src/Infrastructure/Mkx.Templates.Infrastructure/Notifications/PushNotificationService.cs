using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Mkx.Templates.Application.Notifications;
using Mkx.Templates.Contracts;
using Mkx.Templates.Domain;
using Mkx.Templates.Infrastructure.Persistence;
using WebPush;

namespace Mkx.Templates.Infrastructure.Notifications;

/// <summary>Authenticated device subscriptions and server-only delivery.</summary>
public sealed class PushNotificationService(AppDbContext db, IConfiguration config, ILogger<PushNotificationService> logger) : IPushNotificationSender
{
    public PushConfigurationResponse Configuration()
    {
        var enabled = config.GetValue<bool>("Push:Enabled") &&
            !string.IsNullOrWhiteSpace(config["Push:PublicKey"]) &&
            !string.IsNullOrWhiteSpace(config["Push:PrivateKey"]) &&
            (config["Push:Subject"]?.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase) == true ||
             Uri.TryCreate(config["Push:Subject"], UriKind.Absolute, out var subject) && subject.Scheme == Uri.UriSchemeHttps);
        return new(enabled, enabled ? config["Push:PublicKey"] : null);
    }

    public bool IsTrustedEndpoint(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps || uri.Port != 443 ||
            !string.IsNullOrEmpty(uri.UserInfo) || IPAddress.TryParse(uri.Host, out _))
            return false;
        var hosts = config.GetSection("Push:AllowedEndpointHosts").Get<string[]>() ??
            ["fcm.googleapis.com", ".push.services.mozilla.com", "web.push.apple.com", ".notify.windows.com"];
        return hosts.Any(host => !string.IsNullOrWhiteSpace(host) &&
            (host.StartsWith('.') ? uri.Host.EndsWith(host, StringComparison.OrdinalIgnoreCase)
                                   : uri.Host.Equals(host, StringComparison.OrdinalIgnoreCase)));
    }

    private static string Hash(string endpoint) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(endpoint)));

    public async Task RegisterAsync(Guid userId, RegisterPushSubscriptionRequest input, CancellationToken ct)
    {
        if (!Configuration().Enabled) throw new InvalidOperationException("Push is not configured.");
        if (!IsTrustedEndpoint(input.Endpoint) || string.IsNullOrWhiteSpace(input.P256dh) ||
            string.IsNullOrWhiteSpace(input.Auth) || input.Endpoint.Length > 2048 ||
            input.P256dh.Length > 256 || input.Auth.Length > 128 || input.DeviceName?.Length > 120)
            throw new ArgumentException("Invalid browser push subscription.");
        var hash = Hash(input.Endpoint);
        var existing = await db.Set<UserPushSubscription>().SingleOrDefaultAsync(s => s.EndpointHash == hash, ct);
        if (existing is null)
        {
            if (await db.Set<UserPushSubscription>().CountAsync(s => s.UserId == userId, ct) >= 20)
                throw new ArgumentException("Maximum subscriptions reached.");
            existing = new UserPushSubscription
            {
                UserId = userId, Endpoint = input.Endpoint, EndpointHash = hash,
                P256dh = input.P256dh, Auth = input.Auth
            };
            db.Add(existing);
        }
        existing.UserId = userId;
        existing.Endpoint = input.Endpoint;
        existing.P256dh = input.P256dh;
        existing.Auth = input.Auth;
        existing.DeviceName = input.DeviceName;
        existing.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task RevokeAsync(Guid userId, string endpoint, CancellationToken ct)
    {
        await db.Set<UserPushSubscription>()
            .Where(s => s.UserId == userId && s.EndpointHash == Hash(endpoint))
            .ExecuteDeleteAsync(ct);
    }

    public async Task<PushSendResult> SendToUserAsync(Guid userId, PushNotificationMessage message, CancellationToken ct = default)
    {
        if (!Configuration().Enabled) return new(0, 0, 0, 0);
        ArgumentException.ThrowIfNullOrWhiteSpace(message.Title);
        if (message.Title.Length > 200 || message.Body.Length > 1000)
            throw new ArgumentException("Push notification is too long.");
        var path = message.Url;
        var target = path is not null && path.StartsWith('/') && !path.StartsWith("//") &&
            !path.Contains('\\') && !path.Any(char.IsControl) ? path : "/";
        var payload = JsonSerializer.Serialize(new
        {
            title = message.Title, body = message.Body, url = target,
            tag = message.Tag is { Length: > 0 and <= 100 } ? message.Tag : null
        });
        var endpoints = await db.Set<UserPushSubscription>().Where(s => s.UserId == userId).ToListAsync(ct);
        if (endpoints.Count == 0) return new(0, 0, 0, 0);
        var vapid = new VapidDetails(config["Push:Subject"]!, config["Push:PublicKey"]!, config["Push:PrivateKey"]!);
        var options = new Dictionary<string, object> { ["vapidDetails"] = vapid, ["TTL"] = 86400 };
        using var sender = new WebPushClient();
        int accepted = 0, revoked = 0, rejected = 0, unknown = 0;
        foreach (var item in endpoints)
        {
            ct.ThrowIfCancellationRequested();
            if (!IsTrustedEndpoint(item.Endpoint)) { db.Remove(item); revoked++; continue; }
            try
            {
                await sender.SendNotificationAsync(
                    new WebPush.PushSubscription(item.Endpoint, item.P256dh, item.Auth), payload, options, ct);
                accepted++;
            }
            catch (WebPushException ex) when (ex.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound)
            { db.Remove(item); revoked++; }
            catch (WebPushException ex)
            {
                rejected++;
                logger.LogWarning("Web Push provider rejected notification: HTTP {Status}", (int)ex.StatusCode);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception ex) when (ex is HttpRequestException or OperationCanceledException)
            {
                unknown++;
                logger.LogWarning(ex, "Web Push outcome unknown; automatic retry could duplicate notification.");
            }
        }
        if (revoked > 0) await db.SaveChangesAsync(ct);
        return new(accepted, revoked, rejected, unknown);
    }
}