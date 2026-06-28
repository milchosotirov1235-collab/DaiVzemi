// ---------------------------------------------------------------------------
// Shared layout wrapper
// ---------------------------------------------------------------------------

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="bg">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Header -->
        <tr>
          <td style="background:#0f172a;border-radius:16px 16px 0 0;padding:28px 36px;">
            <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">DaiVzemi</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 36px 28px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:20px 36px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              Това е автоматично съобщение от DaiVzemi. Не отговаряйте на него.<br/>
              Въпроси? Пишете ни на
              <a href="mailto:support@daivzemi.bg" style="color:#3b82f6;">support@daivzemi.bg</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Reusable button
function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;background:#0f172a;color:#ffffff;font-size:14px;font-weight:700;padding:13px 28px;border-radius:12px;text-decoration:none;">${label}</a>`;
}

// Reusable heading
function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;">${text}</h1>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;color:#475569;line-height:1.65;">${text}</p>`;
}

// ---------------------------------------------------------------------------
// Template: listing approved
// ---------------------------------------------------------------------------

export function listingApprovedEmail(opts: {
  listingTitle: string;
  listingId: number;
  baseUrl: string;
}): { subject: string; html: string } {
  const subject = `Обявата ви „${opts.listingTitle}" е одобрена`;
  const html = layout(
    subject,
    `
    ${heading("Обявата ви е одобрена ✓")}
    ${p(`Обявата <strong>${opts.listingTitle}</strong> премина успешно модерацията и вече е видима публично в DaiVzemi.`)}
    ${p("Купувачите вече могат да я намерят и да се свържат с вас.")}
    ${btn(`${opts.baseUrl}/listing/${opts.listingId}`, "Виж обявата")}
  `,
  );
  return { subject, html };
}

// ---------------------------------------------------------------------------
// Template: listing rejected
// ---------------------------------------------------------------------------

export function listingRejectedEmail(opts: {
  listingTitle: string;
  listingId: number;
  baseUrl: string;
}): { subject: string; html: string } {
  const subject = `Обявата ви „${opts.listingTitle}" не е одобрена`;
  const html = layout(
    subject,
    `
    ${heading("Обявата изисква корекция")}
    ${p(`Обявата <strong>${opts.listingTitle}</strong> не беше одобрена от нашите модератори.`)}
    ${p("Моля, прегледайте я и се уверете, че:")}
    <ul style="margin:0 0 12px;padding-left:20px;font-size:15px;color:#475569;line-height:2;">
      <li>Заглавието и описанието ясно описват продукта/услугата</li>
      <li>Снимките са реални и ясни</li>
      <li>Съдържанието спазва <a href="${opts.baseUrl}/terms" style="color:#3b82f6;">правилата на DaiVzemi</a></li>
    </ul>
    ${p("Можете да редактирате и публикувате обявата отново.")}
    ${btn(`${opts.baseUrl}/my-listings`, "Моите обяви")}
    ${p(`<span style="font-size:13px;color:#94a3b8;">Ако смятате, че решението е грешно, пишете ни на <a href="mailto:support@daivzemi.bg" style="color:#3b82f6;">support@daivzemi.bg</a></span>`)}
  `,
  );
  return { subject, html };
}

// ---------------------------------------------------------------------------
// Template: new message
// ---------------------------------------------------------------------------

export function newMessageEmail(opts: {
  senderUsername: string;
  messagePreview: string;
  conversationId: string;
  baseUrl: string;
}): { subject: string; html: string } {
  const subject = `Ново съобщение от ${opts.senderUsername}`;
  const html = layout(
    subject,
    `
    ${heading("Имате ново съобщение")}
    ${p(`<strong>${opts.senderUsername}</strong> ви изпрати съобщение в DaiVzemi:`)}
    <blockquote style="margin:16px 0;padding:14px 18px;background:#f8fafc;border-left:3px solid #e2e8f0;border-radius:0 8px 8px 0;font-size:15px;color:#475569;font-style:italic;">
      ${opts.messagePreview}
    </blockquote>
    ${btn(`${opts.baseUrl}/messages/${opts.conversationId}`, "Отговори на съобщението")}
    ${p(`<span style="font-size:13px;color:#94a3b8;margin-top:16px;display:block;">За да спрете имейл известията за съобщения, може да го направите от настройките на профила си.</span>`)}
  `,
  );
  return { subject, html };
}
