const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_DATA_FILE = 'catalog.json';
const DEFAULT_START_NUMBER = 1000;
const VALUE_PER_VIEW = 0.12;
const VALUE_PER_CREATOR_CHARACTER = 0.05;
const MAX_CREATOR_BONUS = 1.5;
const VALUE_PER_DESCRIPTION_CHARACTER = 0.01;
const MAX_DESCRIPTION_BONUS = 2;

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function clampPositiveNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function buildValueEstimate(nft) {
  const creator = String(nft.creator || '');
  const description = String(nft.description || '');
  const interestBoost = nft.views * VALUE_PER_VIEW;
  const creatorBoost = Math.min(
    creator.length * VALUE_PER_CREATOR_CHARACTER,
    MAX_CREATOR_BONUS
  );
  const descriptionBoost = Math.min(
    description.length * VALUE_PER_DESCRIPTION_CHARACTER,
    MAX_DESCRIPTION_BONUS
  );
  const estimate = nft.askingPrice + interestBoost + creatorBoost + descriptionBoost;
  return Number(estimate.toFixed(2));
}

function normalizeContactLink(value) {
  if (!value) {
    return '';
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('mailto:')) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    return '';
  }

  return '';
}

class CatalogStore {
  constructor({ dataDir }) {
    this.dataDir = dataDir;
    this.dataFile = path.join(dataDir, DEFAULT_DATA_FILE);
    ensureDirectory(dataDir);
  }

  readState() {
    return readJson(this.dataFile, {
      nextCatalogNumber: DEFAULT_START_NUMBER,
      nfts: []
    });
  }

  writeState(state) {
    writeJson(this.dataFile, state);
  }

  list() {
    const state = this.readState();
    return [...state.nfts].sort((left, right) => right.catalogNumber - left.catalogNumber);
  }

  create(input) {
    const state = this.readState();
    const catalogNumber = state.nextCatalogNumber;
    const uploadedAt = new Date().toISOString();
    const nft = {
      catalogNumber,
      title:
        String(input.title || '').trim() ||
        `Untitled #${catalogNumber}-${uploadedAt.slice(11, 19).replace(/:/g, '')}`,
      creator: String(input.creator || '').trim() || 'Anonymous Creator',
      description: String(input.description || '').trim(),
      askingPrice: clampPositiveNumber(input.askingPrice, 1),
      contactLink: normalizeContactLink(input.contactLink),
      imageUrl: input.imageUrl,
      imageName: input.imageName,
      uploadedAt,
      views: 0
    };

    nft.estimatedValue = buildValueEstimate(nft);
    state.nfts.push(nft);
    state.nextCatalogNumber += 1;
    this.writeState(state);
    return nft;
  }

  get(catalogNumber) {
    const state = this.readState();
    return state.nfts.find((nft) => nft.catalogNumber === Number(catalogNumber)) || null;
  }

  incrementViews(catalogNumber) {
    const state = this.readState();
    const nft = state.nfts.find((item) => item.catalogNumber === Number(catalogNumber));

    if (!nft) {
      return null;
    }

    nft.views += 1;
    nft.estimatedValue = buildValueEstimate(nft);
    this.writeState(state);
    return nft;
  }
}

module.exports = {
  CatalogStore,
  buildValueEstimate,
  normalizeContactLink,
  ensureDirectory
};
