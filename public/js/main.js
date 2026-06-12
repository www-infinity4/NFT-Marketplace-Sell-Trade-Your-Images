const marketGrid = document.getElementById('market-grid');
const feedback = document.getElementById('feedback');
const emptyTemplate = document.getElementById('empty-state');

function formatEth(value) {
  return `${Number(value).toFixed(2)} ETH`;
}

function setFeedback(message) {
  if (!message) {
    feedback.className = 'status-card hidden';
    feedback.textContent = '';
    return;
  }

  feedback.className = 'status-card error';
  feedback.textContent = message;
}

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'card';
  const image = document.createElement('img');
  image.className = 'card-image';
  image.src = item.imageUrl;
  image.alt = item.title;

  const body = document.createElement('div');
  body.className = 'card-body';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = `Catalog #${item.catalogNumber}`;

  const title = document.createElement('h3');
  title.textContent = item.title;

  const creator = document.createElement('p');
  creator.className = 'muted';
  creator.textContent = `by ${item.creator}`;

  const metaGrid = document.createElement('div');
  metaGrid.className = 'meta-grid';
  metaGrid.appendChild(createMetaChip('Views', String(item.views)));
  metaGrid.appendChild(createMetaChip('Value', formatEth(item.estimatedValue)));

  const actions = document.createElement('div');
  actions.className = 'detail-actions';

  const link = document.createElement('a');
  link.className = 'button';
  link.href = `/nft.html?catalog=${item.catalogNumber}`;
  link.textContent = 'Open Listing';
  actions.appendChild(link);

  body.append(eyebrow, title, creator, metaGrid, actions);
  card.append(image, body);
  return card;
}

function createMetaChip(label, value) {
  const chip = document.createElement('div');
  chip.className = 'meta-chip';

  const metaLabel = document.createElement('div');
  metaLabel.className = 'meta-label';
  metaLabel.textContent = label;

  const strong = document.createElement('strong');
  strong.textContent = value;

  chip.append(metaLabel, strong);
  return chip;
}

async function loadMarket() {
  setFeedback('');
  marketGrid.innerHTML = '';

  try {
    const response = await fetch('/api/nfts');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Unable to load marketplace.');
    }

    if (!payload.items.length) {
      marketGrid.appendChild(emptyTemplate.content.cloneNode(true));
      return;
    }

    payload.items.forEach((item) => {
      marketGrid.appendChild(createCard(item));
    });
  } catch (error) {
    setFeedback(error.message);
  }
}

loadMarket();
