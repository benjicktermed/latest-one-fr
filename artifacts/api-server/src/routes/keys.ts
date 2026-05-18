import { Router } from "express";
import { db, keysTable, keyHwidsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import {
  notifyKeySuccess,
  notifyKeyBlocked,
  notifyKeyExpired,
  notifyKeyInvalid,
  notifyHwidReset,
  notifyKeyCreated,
} from "../lib/discord";

const keysRouter = Router();

type Duration = "1day" | "1week" | "1month" | "1year" | "lifetime";

function generateKey(): string {
  const segment = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${segment()}${segment()}-${segment()}${segment()}-${segment()}${segment()}-${segment()}${segment()}`;
}

function calcExpiry(duration: Duration): Date | null {
  if (duration === "lifetime") return null;
  const now = new Date();
  switch (duration) {
    case "1day":   now.setDate(now.getDate() + 1); break;
    case "1week":  now.setDate(now.getDate() + 7); break;
    case "1month": now.setMonth(now.getMonth() + 1); break;
    case "1year":  now.setFullYear(now.getFullYear() + 1); break;
  }
  return now;
}

function formatDurationLabel(duration: string): string {
  switch (duration) {
    case "1day":   return "1 Day";
    case "1week":  return "1 Week";
    case "1month": return "1 Month";
    case "1year":  return "1 Year";
    default:       return "Lifetime";
  }
}

keysRouter.get("/keys/verify", async (req, res) => {
  const { key, hwid } = req.query;
  if (!key || typeof key !== "string") {
    res.status(400).json({ error: "key is required" });
    return;
  }
  if (!hwid || typeof hwid !== "string") {
    res.status(400).json({ error: "hwid is required" });
    return;
  }

  const keyStr  = key.trim();
  const hwidStr = hwid.trim();

  try {
    const [keyRow] = await db.select().from(keysTable).where(eq(keysTable.key, keyStr)).limit(1);

    if (!keyRow) {
      void notifyKeyInvalid({ key: keyStr, hwid: hwidStr });
      res.status(404).json({ valid: false, error: "Invalid key" });
      return;
    }

    if (keyRow.expiresAt && new Date() > keyRow.expiresAt) {
      void notifyKeyExpired({
        key: keyRow.key,
        hwid: hwidStr,
        label: keyRow.label,
        expiresAt: keyRow.expiresAt,
      });
      res.status(403).json({ valid: false, error: "Key has expired", expired: true });
      return;
    }

    const hwids = await db.select().from(keyHwidsTable).where(eq(keyHwidsTable.keyId, keyRow.id));

    if (hwids.length > 0 && !hwids.some((h) => h.hwid === hwidStr)) {
      void notifyKeyBlocked({
        key: keyRow.key,
        hwid: hwidStr,
        label: keyRow.label,
        registeredHwid: hwids[0].hwid,
      });
      res.status(403).json({
        valid: false,
        locked: true,
        error: "Key is already bound to another device. Contact admin to reset HWID.",
      });
      return;
    }

    const isNewDevice = hwids.length === 0;
    if (isNewDevice) {
      await db.insert(keyHwidsTable).values({ keyId: keyRow.id, hwid: hwidStr });
    }

    void notifyKeySuccess({
      key: keyRow.key,
      hwid: hwidStr,
      label: keyRow.label,
      durationLabel: formatDurationLabel(keyRow.duration),
      expiresAt: keyRow.expiresAt ?? null,
      deviceCount: hwids.length + (isNewDevice ? 1 : 0),
      isNewDevice,
    });

    res.json({
      valid: true,
      key: keyRow.key,
      label: keyRow.label,
      duration: keyRow.duration,
      durationLabel: formatDurationLabel(keyRow.duration),
      expiresAt: keyRow.expiresAt ?? null,
      deviceCount: hwids.length + (isNewDevice ? 1 : 0),
      createdAt: keyRow.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

keysRouter.post("/keys/reset-hwid", async (req, res) => {
  const { key } = req.body as { key?: string };
  if (!key || typeof key !== "string") {
    res.status(400).json({ error: "key is required" });
    return;
  }

  try {
    const [keyRow] = await db.select().from(keysTable).where(eq(keysTable.key, key.trim())).limit(1);

    if (!keyRow) {
      res.status(404).json({ error: "Key not found" });
      return;
    }

    await db.delete(keyHwidsTable).where(eq(keyHwidsTable.keyId, keyRow.id));

    void notifyHwidReset({ key: keyRow.key, label: keyRow.label });

    res.json({ success: true, message: "All HWIDs reset for this key" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

keysRouter.post("/keys/create", async (req, res) => {
  const { label, adminSecret, duration } = req.body as {
    label?: string;
    adminSecret?: string;
    duration?: string;
  };

  if (process.env.ADMIN_SECRET && adminSecret !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const validDurations: Duration[] = ["1day", "1week", "1month", "1year", "lifetime"];
  const dur: Duration = validDurations.includes(duration as Duration)
    ? (duration as Duration)
    : "lifetime";

  try {
    const key = generateKey();
    const expiresAt = calcExpiry(dur);

    const [newKey] = await db
      .insert(keysTable)
      .values({ key, label: label ?? null, duration: dur, maxDevices: 0, expiresAt })
      .returning();

    void notifyKeyCreated({
      key: newKey.key,
      label: newKey.label,
      durationLabel: formatDurationLabel(newKey.duration),
      expiresAt: newKey.expiresAt ?? null,
    });

    res.json({
      success: true,
      key: newKey.key,
      id: newKey.id,
      duration: newKey.duration,
      durationLabel: formatDurationLabel(newKey.duration),
      expiresAt: newKey.expiresAt ?? null,
      createdAt: newKey.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

keysRouter.get("/keys/info", async (req, res) => {
  const { key } = req.query;
  if (!key || typeof key !== "string") {
    res.status(400).json({ error: "key is required" });
    return;
  }

  try {
    const [keyRow] = await db.select().from(keysTable).where(eq(keysTable.key, key.trim())).limit(1);

    if (!keyRow) {
      res.status(404).json({ error: "Key not found" });
      return;
    }

    const hwids = await db.select().from(keyHwidsTable).where(eq(keyHwidsTable.keyId, keyRow.id));
    const expired = keyRow.expiresAt ? new Date() > keyRow.expiresAt : false;

    res.json({
      key: keyRow.key,
      label: keyRow.label,
      duration: keyRow.duration,
      durationLabel: formatDurationLabel(keyRow.duration),
      expiresAt: keyRow.expiresAt ?? null,
      expired,
      deviceCount: hwids.length,
      registeredHwid: hwids[0]?.hwid ?? null,
      createdAt: keyRow.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

keysRouter.get("/keys/list", async (req, res) => {
  const { adminSecret } = req.query;

  if (process.env.ADMIN_SECRET && adminSecret !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const keys = await db.select().from(keysTable).orderBy(keysTable.createdAt);
    const now = new Date();

    const result = await Promise.all(
      keys.map(async (k) => {
        const hwids = await db.select().from(keyHwidsTable).where(eq(keyHwidsTable.keyId, k.id));
        return {
          id: k.id,
          key: k.key,
          label: k.label,
          duration: k.duration,
          expiresAt: k.expiresAt ?? null,
          expired: k.expiresAt ? now > k.expiresAt : false,
          deviceCount: hwids.length,
          registeredHwid: hwids[0]?.hwid ?? null,
          createdAt: k.createdAt,
        };
      })
    );

    res.json({ keys: result });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

keysRouter.delete("/keys/:id", async (req, res) => {
  const { adminSecret } = req.body as { adminSecret?: string };

  if (process.env.ADMIN_SECRET && adminSecret !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    await db.delete(keysTable).where(eq(keysTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default keysRouter;
