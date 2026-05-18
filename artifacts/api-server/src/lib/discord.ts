const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

type Color = number;
const GREEN  = 0x57f287;
const RED    = 0xed4245;
const ORANGE = 0xfee75c;
const GRAY   = 0x95a5a6;

interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

interface NotifyOptions {
  title: string;
  description: string;
  color: Color;
  fields: DiscordField[];
}

export async function sendDiscordNotification(opts: NotifyOptions): Promise<void> {
  if (!WEBHOOK_URL) return;

  const payload = {
    embeds: [
      {
        title: opts.title,
        description: opts.description,
        color: opts.color,
        fields: opts.fields,
        footer: { text: "Adonis HuB Key System" },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Never let Discord failures break the main flow
  }
}

export function notifyKeySuccess(opts: {
  key: string;
  hwid: string;
  label: string | null;
  durationLabel: string;
  expiresAt: Date | null;
  deviceCount: number;
  isNewDevice: boolean;
}) {
  const title = opts.isNewDevice ? "🔑 New Device Registered" : "✅ Key Verified (Known Device)";
  return sendDiscordNotification({
    title,
    description: opts.isNewDevice
      ? "A key was used on a **new device** and has been locked to it."
      : "A known device re-verified their key.",
    color: GREEN,
    fields: [
      { name: "Key",      value: `\`${opts.key}\``,                        inline: false },
      { name: "Label",    value: opts.label ?? "—",                         inline: true  },
      { name: "Duration", value: opts.durationLabel,                        inline: true  },
      { name: "Device ID",value: `\`${opts.hwid}\``,                       inline: false },
      { name: "Expires",  value: opts.expiresAt ? opts.expiresAt.toUTCString() : "Never", inline: true },
      { name: "Devices",  value: String(opts.deviceCount),                  inline: true  },
    ],
  });
}

export function notifyKeyBlocked(opts: {
  key: string;
  hwid: string;
  label: string | null;
  registeredHwid: string;
}) {
  return sendDiscordNotification({
    title: "🚫 Blocked — Wrong Device",
    description: "Someone tried to use a key from an **unauthorized device**. Admin must reset HWID to allow.",
    color: RED,
    fields: [
      { name: "Key",               value: `\`${opts.key}\``,            inline: false },
      { name: "Label",             value: opts.label ?? "—",            inline: true  },
      { name: "Blocked Device",    value: `\`${opts.hwid}\``,           inline: false },
      { name: "Registered Device", value: `\`${opts.registeredHwid}\``, inline: false },
    ],
  });
}

export function notifyKeyExpired(opts: {
  key: string;
  hwid: string;
  label: string | null;
  expiresAt: Date;
}) {
  return sendDiscordNotification({
    title: "⏰ Expired Key Used",
    description: "Someone tried to use an **expired key**.",
    color: ORANGE,
    fields: [
      { name: "Key",       value: `\`${opts.key}\``,              inline: false },
      { name: "Label",     value: opts.label ?? "—",              inline: true  },
      { name: "Device ID", value: `\`${opts.hwid}\``,             inline: false },
      { name: "Expired At",value: opts.expiresAt.toUTCString(),   inline: true  },
    ],
  });
}

export function notifyKeyInvalid(opts: { key: string; hwid: string }) {
  return sendDiscordNotification({
    title: "❌ Invalid Key Attempt",
    description: "Someone tried to use a **key that doesn't exist**.",
    color: GRAY,
    fields: [
      { name: "Key Entered", value: `\`${opts.key}\``, inline: false },
      { name: "Device ID",   value: `\`${opts.hwid}\``, inline: false },
    ],
  });
}

export function notifyKeyCreated(opts: {
  key: string;
  label: string | null;
  durationLabel: string;
  expiresAt: Date | null;
}) {
  return sendDiscordNotification({
    title: "🔐 New Key Generated",
    description: "A new access key has been created.",
    color: 0x9b59b6,
    fields: [
      { name: "Key",        value: `\`\`\`${opts.key}\`\`\``, inline: false },
      { name: "Expiration", value: opts.expiresAt
          ? opts.expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
          : "Never (Lifetime)",
        inline: false },
    ],
  });
}

export function notifyHwidReset(opts: { key: string; label: string | null }) {
  return sendDiscordNotification({
    title: "🔄 HWID Reset by Admin",
    description: "Admin reset all device bindings for a key.",
    color: 0x5865f2,
    fields: [
      { name: "Key",   value: `\`${opts.key}\``, inline: false },
      { name: "Label", value: opts.label ?? "—", inline: true  },
    ],
  });
}
