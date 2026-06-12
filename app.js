const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { CatalogStore, ensureDirectory } = require('./src/catalogStore');
const IMAGE_UPLOAD_ERROR = 'Only image uploads are supported.';

function createUploadMiddleware(uploadsDir) {
  ensureDirectory(uploadsDir);

  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, uploadsDir);
    },
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname) || '.png';
      const safeBase = path
        .basename(file.originalname, extension)
        .replace(/[^a-z0-9_-]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'nft-image';
      callback(null, `${Date.now()}-${safeBase}${extension.toLowerCase()}`);
    }
  });

  return multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024
    },
    fileFilter: (_req, file, callback) => {
      if (file.mimetype.startsWith('image/')) {
        callback(null, true);
        return;
      }

      callback(new Error(IMAGE_UPLOAD_ERROR));
    }
  });
}

function createRateLimiter({ windowMs, maxRequests }) {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const entry = requests.get(key);

    if (!entry || now > entry.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
      return;
    }

    entry.count += 1;
    next();
  };
}

function mapNft(nft) {
  return {
    ...nft,
    hasContactLink: Boolean(nft.contactLink)
  };
}

function createApp(options = {}) {
  const rootDir = options.rootDir || __dirname;
  const publicDir = options.publicDir || path.join(rootDir, 'public');
  const uploadsDir = options.uploadsDir || path.join(rootDir, 'uploads');
  const dataDir = options.dataDir || path.join(rootDir, 'data');
  const indexFile = path.join(publicDir, 'index.html');
  const store = options.store || new CatalogStore({ dataDir });
  const upload = createUploadMiddleware(uploadsDir);
  const uploadLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 12 });
  const viewLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 120 });
  const app = express();

  ensureDirectory(publicDir);
  ensureDirectory(uploadsDir);
  ensureDirectory(dataDir);

  app.use(express.json());
  app.use('/uploads', express.static(uploadsDir, { fallthrough: false }));
  app.use(express.static(publicDir));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/nfts', (_req, res) => {
    res.json({ items: store.list().map(mapNft) });
  });

  app.get('/api/nfts/:catalogNumber', (req, res) => {
    const nft = store.get(req.params.catalogNumber);
    if (!nft) {
      res.status(404).json({ error: 'NFT not found.' });
      return;
    }

    res.json({ item: mapNft(nft) });
  });

  app.post('/api/nfts/:catalogNumber/view', viewLimiter, (req, res) => {
    const nft = store.incrementViews(req.params.catalogNumber);
    if (!nft) {
      res.status(404).json({ error: 'NFT not found.' });
      return;
    }

    res.json({ item: mapNft(nft) });
  });

  app.post('/api/nfts', uploadLimiter, upload.single('image'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'An image is required.' });
      return;
    }

    const nft = store.create({
      title: req.body.title,
      creator: req.body.creator,
      description: req.body.description,
      askingPrice: req.body.askingPrice,
      contactLink: req.body.contactLink,
      imageUrl: `/uploads/${req.file.filename}`,
      imageName: req.file.originalname
    });

    res.status(201).json({ item: mapNft(nft) });
  });

  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found.' });
      return;
    }

    res.sendFile(indexFile, (error) => {
      if (!error) {
        return;
      }

      res.status(404).send('Not found.');
    });
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError || error.message === IMAGE_UPLOAD_ERROR) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Unexpected server error.' });
  });

  return app;
}

module.exports = {
  createApp
};
