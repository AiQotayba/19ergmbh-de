function emailLayout(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1a2b4a;max-width:560px;margin:0 auto;padding:24px">
  <div style="border-bottom:3px solid #f47920;padding-bottom:12px;margin-bottom:20px">
    <strong style="font-size:18px">19er GmbH</strong>
  </div>
  <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
  <div style="white-space:pre-line">${body}</div>
  <p style="margin-top:32px;font-size:12px;color:#6b7a90">19er GmbH — Logistik &amp; Transport</p>
</body>
</html>`;
}

export function scheduleNotificationEmail(input: {
  employeeName: string;
  shiftTitle: string;
  scheduleLabel: string;
  timeLabel: string;
}) {
  const subject = "Neue Schicht – 19er GmbH";
  const text = `Hallo ${input.employeeName},

Sie sind für folgende Schicht eingeplant:

${input.shiftTitle}
Zeitraum: ${input.scheduleLabel}
Zeiten: ${input.timeLabel}

19er GmbH`;

  const html = emailLayout(
    subject,
    `Hallo <strong>${input.employeeName}</strong>,<br><br>
Sie sind für folgende Schicht eingeplant:<br><br>
<strong>${input.shiftTitle}</strong><br>
Zeitraum: ${input.scheduleLabel}<br>
Zeiten: ${input.timeLabel}`,
  );

  return { subject, text, html };
}

export function salaryNotificationEmail(input: {
  employeeName: string;
  periodLabel: string;
  salary: number;
  hours: number;
}) {
  const subject = "Gehaltsabrechnung – 19er GmbH";
  const amount = `€${input.salary.toFixed(2)}`;
  const text = `Hallo ${input.employeeName},

Ihre Gehaltsabrechnung für ${input.periodLabel}:
Arbeitsstunden: ${input.hours.toFixed(2)}
Betrag: ${amount}

19er GmbH`;

  const html = emailLayout(
    subject,
    `Hallo <strong>${input.employeeName}</strong>,<br><br>
Ihre Gehaltsabrechnung für <strong>${input.periodLabel}</strong>:<br>
Arbeitsstunden: ${input.hours.toFixed(2)}<br>
Betrag: <strong>${amount}</strong>`,
  );

  return { subject, text, html };
}

export function genericNotificationEmail(title: string, message: string) {
  return {
    subject: title,
    text: message,
    html: emailLayout(title, message.replace(/\n/g, "<br>")),
  };
}
