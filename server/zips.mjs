import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import { Router } from "express";

const MAX_BYTES = Number(process.env.ZIP_MAX_BYTES || 80 * 1024 * 1024); // 80 MB
const ID_LEN = 10;

/**
 * Public zip share routes (no login).
 *
 * POST   /upload-zip          — upload .zip, returns share URLs
 * GET    /zips/:id            — metadata JSON (public)
 * GET    /zips/:id/download   — download the zip (public)
 * GET    /zips                — list recent uploads (optional, capped)
 */
export function createZipRouter(uploadsRoot) {
  const router = Router();
  const zipDir = path.join(uploadsRoot, "zips");
  const metaPath = path.join(uploadsRoot, "manifest.json");

  fs.mkdirSync(zipDir, { recursive: true });

  function readManifest() {
    try {
      if (!fs.existsSync(metaPath)) return {};
      return JSON.parse(fs.readFileSync(metaPath, "utf8"));
    } catch {
      return {};
    }
  }

  function writeManifest(data) {
    fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
  }

  function makeId() {
    return crypto.randomBytes(8).toString("base64url").slice(0, ID_LEN);
  }

  function isZipBuffer(buf) {
    // ZIP local file header magic: PK\x03\x04 (also allow empty zip PK\x05\x06)
    return (
      buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)
    );
  }

  function sanitizeFilename(name) {
    const base = path.basename(String(name || "project.zip"));
    return base.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 120) || "project.zip";
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, zipDir),
    filename: (_req, file, cb) => {
      const id = makeId();
      // temp name; we'll rename after we know the id is unique
      cb(null, `${id}.zip`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: MAX_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      const name = (file.originalname || "").toLowerCase();
      const okExt = name.endsWith(".zip");
      const okMime =
        !file.mimetype ||
        /zip|octet-stream|x-zip/i.test(file.mimetype);
      if (okExt && okMime) cb(null, true);
      else cb(new Error("Hanya file .zip yang diizinkan"));
    },
  });

  function publicUrls(req, id) {
    const proto = req.get("x-forwarded-proto") || req.protocol;
    const host = req.get("x-forwarded-host") || req.get("host");
    const apiBase = `${proto}://${host}`;
    const frontend =
      process.env.PUBLIC_FRONTEND_URL ||
      process.env.ALLOWED_ORIGINS?.split(",")[0]?.trim() ||
      "";
    return {
      downloadUrl: `${apiBase}/zips/${id}/download`,
      infoUrl: `${apiBase}/zips/${id}`,
      shareUrl: frontend
        ? `${frontend.replace(/\/$/, "")}/zip/${id}`
        : `${apiBase}/zips/${id}/download`,
    };
  }

  router.post("/upload-zip", (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        const msg =
          err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
            ? `File terlalu besar (maks ${Math.round(MAX_BYTES / 1024 / 1024)} MB)`
            : err.message || "Upload gagal";
        return res.status(400).json({ error: { message: msg } });
      }
      if (!req.file) {
        return res
          .status(400)
          .json({ error: { message: "Tidak ada file. Kirim field 'file'." } });
      }

      const storedName = req.file.filename; // {id}.zip
      const id = storedName.replace(/\.zip$/i, "");
      const abs = path.join(zipDir, storedName);

      try {
        const fd = fs.openSync(abs, "r");
        const buf = Buffer.alloc(4);
        fs.readSync(fd, buf, 0, 4, 0);
        fs.closeSync(fd);
        if (!isZipBuffer(buf)) {
          fs.unlinkSync(abs);
          return res
            .status(400)
            .json({ error: { message: "File bukan ZIP yang valid." } });
        }
      } catch (e) {
        try {
          fs.unlinkSync(abs);
        } catch {
          /* ignore */
        }
        return res
          .status(500)
          .json({ error: { message: "Gagal memvalidasi ZIP." } });
      }

      const originalName = sanitizeFilename(req.file.originalname);
      const title =
        (typeof req.body?.title === "string" && req.body.title.trim()) ||
        originalName.replace(/\.zip$/i, "");
      const description =
        typeof req.body?.description === "string"
          ? req.body.description.trim().slice(0, 500)
          : "";

      const entry = {
        id,
        originalName,
        title,
        description,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
        // optional label for golang projects
        kind: "golang-zip",
      };

      const manifest = readManifest();
      manifest[id] = entry;
      writeManifest(manifest);

      const urls = publicUrls(req, id);
      return res.status(201).json({
        ok: true,
        ...entry,
        ...urls,
        message:
          "Upload berhasil. Bagikan shareUrl ke orang lain — tanpa login.",
      });
    });
  });

  router.get("/zips", (_req, res) => {
    const manifest = readManifest();
    const list = Object.values(manifest)
      .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)))
      .slice(0, 50)
      .map(({ id, title, originalName, size, uploadedAt, description }) => ({
        id,
        title,
        originalName,
        size,
        uploadedAt,
        description,
      }));
    res.json({ object: "list", data: list });
  });

  router.get("/zips/:id", (req, res) => {
    const id = String(req.params.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
    const manifest = readManifest();
    const entry = manifest[id];
    if (!entry) {
      return res.status(404).json({ error: { message: "ZIP tidak ditemukan." } });
    }
    const filePath = path.join(zipDir, `${id}.zip`);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ error: { message: "File ZIP hilang dari storage." } });
    }
    res.json({
      ok: true,
      ...entry,
      ...publicUrls(req, id),
    });
  });

  router.get("/zips/:id/download", (req, res) => {
    const id = String(req.params.id || "").replace(/[^a-zA-Z0-9_-]/g, "");
    const manifest = readManifest();
    const entry = manifest[id];
    const filePath = path.join(zipDir, `${id}.zip`);
    if (!entry || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: { message: "ZIP tidak ditemukan." } });
    }
    const downloadName = entry.originalName || `${entry.title || id}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    );
    res.setHeader("Cache-Control", "public, max-age=3600");
    fs.createReadStream(filePath).pipe(res);
  });

  return router;
}
