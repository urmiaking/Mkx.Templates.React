using System.Net;
using System.Net.Mail;

namespace Mkx.Templates.Server.Services;

/// <summary>Replace through DI to use any transactional email provider.</summary>
public interface IAccountEmailSender
{
    bool IsConfigured { get; }
    Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken);
}

public sealed class SmtpAccountEmailSender(IConfiguration configuration) : IAccountEmailSender
{
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(configuration["AccountEmail:Host"]) &&
        !string.IsNullOrWhiteSpace(configuration["AccountEmail:FromAddress"]) &&
        !string.IsNullOrWhiteSpace(configuration["AccountEmail:PublicBaseUrl"]);

    public async Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken)
    {
        if (!IsConfigured) throw new InvalidOperationException("Account email provider is not configured.");
        using var smtp = new SmtpClient(configuration["AccountEmail:Host"]!,
            configuration.GetValue("AccountEmail:Port", 587)) { EnableSsl = true };
        var user = configuration["AccountEmail:UserName"];
        if (!string.IsNullOrWhiteSpace(user))
        {
            smtp.UseDefaultCredentials = false;
            smtp.Credentials = new NetworkCredential(user, configuration["AccountEmail:Password"] ?? "");
        }
        using var message = new MailMessage(new MailAddress(configuration["AccountEmail:FromAddress"]!),
            new MailAddress(to)) { Subject = subject, Body = body, IsBodyHtml = false };
        await smtp.SendMailAsync(message, cancellationToken);
    }
}
