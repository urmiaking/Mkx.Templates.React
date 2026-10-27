using System.ComponentModel.DataAnnotations;
namespace Mkx.Templates.Contracts;
public sealed record PushConfigurationResponse(bool Enabled, string? PublicKey);
public sealed record RegisterPushSubscriptionRequest([Required, MaxLength(2048)] string Endpoint,
    [Required, MaxLength(256)] string P256dh, [Required, MaxLength(128)] string Auth,
    [MaxLength(120)] string? DeviceName);
public sealed record RevokePushSubscriptionRequest([Required, MaxLength(2048)] string Endpoint);
public sealed record PushNotificationMessage(string Title, string Body, string? Url = null, string? Tag = null);
public sealed record PushSendResult(int Accepted, int Revoked, int Rejected, int Unknown);