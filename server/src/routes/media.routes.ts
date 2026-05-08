import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.get('/', asyncHandler(async (req, res) => {
  const { clientId } = z.object({ clientId: z.string().optional() }).parse(req.query);
  const where: Record<string, unknown> = { agencyId: req.user!.agencyId };
  if (clientId) where.clientId = clientId;
  const assets = await prisma.mediaAsset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ data: assets });
}));

router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) { res.status(400).json({ error: 'No file provided' }); return; }

  const { clientId } = z.object({ clientId: z.string() }).parse(req.body);
  const client = await prisma.client.findFirst({ where: { id: clientId, agencyId: req.user!.agencyId } });
  if (!client) { res.status(404).json({ error: 'Client not found' }); return; }

  const isImage = file.mimetype.startsWith('image/');
  const uploadDir = path.join(process.env.UPLOAD_DIR ?? './uploads', 'media', clientId);
  await fs.mkdir(uploadDir, { recursive: true });

  const ext = isImage ? 'webp' : path.extname(file.originalname).toLowerCase().slice(1) || 'bin';
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(uploadDir, filename);

  let width: number | undefined;
  let height: number | undefined;
  let finalSize = file.size;

  if (isImage) {
    const result = await sharp(file.buffer)
      .rotate()
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(filePath);
    width = result.width;
    height = result.height;
    const stat = await fs.stat(filePath);
    finalSize = stat.size;
  } else {
    await fs.writeFile(filePath, file.buffer);
  }

  const url = `/uploads/media/${clientId}/${filename}`;
  const asset = await prisma.mediaAsset.create({
    data: {
      agencyId: req.user!.agencyId,
      clientId,
      filename,
      originalName: file.originalname,
      mimeType: isImage ? 'image/webp' : file.mimetype,
      size: finalSize,
      url,
      width,
      height,
    },
  });

  res.status(201).json({ data: asset });
}));

router.patch('/:id/alt', asyncHandler(async (req, res) => {
  const { altText } = z.object({ altText: z.string().max(500) }).parse(req.body);
  const asset = await prisma.mediaAsset.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
  if (!asset) { res.status(404).json({ error: 'Not found' }); return; }
  const updated = await prisma.mediaAsset.update({ where: { id: req.params.id }, data: { altText } });
  res.json({ data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const asset = await prisma.mediaAsset.findFirst({ where: { id: req.params.id, agencyId: req.user!.agencyId } });
  if (!asset) { res.status(404).json({ error: 'Not found' }); return; }
  const filePath = path.join(process.env.UPLOAD_DIR ?? './uploads', 'media', asset.clientId, asset.filename);
  await prisma.mediaAsset.delete({ where: { id: asset.id } });
  try { await fs.unlink(filePath); } catch { /* file already gone */ }
  res.json({ ok: true });
}));

export default router;
