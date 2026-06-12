const detailShell = document.getElementById('detail-shell');
const feedback = document.getElementById('detail-feedback');
const catalogNumber = new URLSearchParams(window.location.search).get('catalog');

function formatEth(value) {
  return `${Number(value).toFixed(2)} ETH`;
}

function showFeedback(message) {
  if (!message) {
    feedback.className = 'status-card hidden';
    feedback.textContent = '';
    return;
  }

  feedback.className = 'status-card error';
  feedback.textContent = message;
}

function renderItem(item) {
  detailShell.innerHTML = '';

  const image = document.createElement('img');
  image.className = 'detail-image glass';
  image.src = item.imageUrl;
  image.alt = item.title;

  const article = document.createElement('article');
  article.className = 'detail-card';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = `Catalog #${item.catalogNumber}`;

  const title = document.createElement('h1');
  title.textContent = item.title;

  const creator = document.createElement('p');
  creator.className = 'muted';
  creator.textContent = `Created by ${item.creator}`;

  const description = document.createElement('p');
  description.textContent = item.description || 'No description was added for this NFT yet.';

  const metaGrid = document.createElement('div');
  metaGrid.className = 'meta-grid';
  metaGrid.appendChild(createMetaChip('Asking price', formatEth(item.askingPrice)));
  metaGrid.appendChild(createMetaChip('Estimated value', formatEth(item.estimatedValue)));
  metaGrid.appendChild(createMetaChip('Views', String(item.views)));

  const actions = document.createElement('div');
  actions.className = 'detail-actions';
  if (item.hasContactLink) {
    const link = document.createElement('a');
    link.className = 'button';
    link.href = item.contactLink;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'Connect with trader';
    actions.appendChild(link);
  } else {
    const missing = document.createElement('span');
    missing.className = 'muted';
    missing.textContent = 'No contact link supplied yet.';
    actions.appendChild(missing);
  }

  article.append(eyebrow, title, creator, description, metaGrid, actions);
  detailShell.append(image, article);
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

async function loadDetail() {
  if (!catalogNumber) {
    showFeedback('Missing catalog number.');
    return;
  }

  try {
    const viewResponse = await fetch(`/api/nfts/${catalogNumber}/view`, { method: 'POST' });
    const viewPayload = await viewResponse.json();
    if (!viewResponse.ok) {
      throw new Error(viewPayload.error || 'Unable to update view count.');
    }

    renderItem(viewPayload.item);
    document.title = `${viewPayload.item.title} • NFT Details`;
  } catch (error) {
    showFeedback(error.message);
  }
}

loadDetail();
