const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../app');

function makeTempApp() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nft-market-test-'));
  const app = createApp({
    rootDir: tempRoot,
    publicDir: path.join(tempRoot, 'public'),
    uploadsDir: path.join(tempRoot, 'uploads'),
    dataDir: path.join(tempRoot, 'data')
  });
  return { app, tempRoot };
}

test('creates an NFT with a unique catalog number and persists it', async () => {
  const { app, tempRoot } = makeTempApp();

  await request(app)
    .post('/api/nfts')
    .field('title', 'Northern Lights')
    .field('creator', 'Sky Studio')
    .field('description', 'Aurora-inspired image asset.')
    .field('askingPrice', '2.50')
    .field('contactLink', 'https://example.com/trade')
    .attach('image', Buffer.from('fake-image'), {
      filename: 'artwork.png',
      contentType: 'image/png'
    })
    .expect(201)
    .expect((response) => {
      assert.equal(response.body.item.catalogNumber, 1000);
      assert.equal(response.body.item.views, 0);
      assert.equal(response.body.item.hasContactLink, true);
    });

  await request(app)
    .get('/api/nfts')
    .expect(200)
    .expect((response) => {
      assert.equal(response.body.items.length, 1);
      assert.equal(response.body.items[0].catalogNumber, 1000);
    });

  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('increments view count and updates value on detail view', async () => {
  const { app, tempRoot } = makeTempApp();

  await request(app)
    .post('/api/nfts')
    .field('title', 'Pulse')
    .field('creator', 'Nova')
    .field('askingPrice', '1.00')
    .attach('image', Buffer.from('fake-image'), {
      filename: 'pulse.png',
      contentType: 'image/png'
    })
    .expect(201);

  const initial = await request(app).get('/api/nfts/1000').expect(200);
  const viewed = await request(app).post('/api/nfts/1000/view').expect(200);

  assert.equal(initial.body.item.views, 0);
  assert.equal(viewed.body.item.views, 1);
  assert.ok(viewed.body.item.estimatedValue > initial.body.item.estimatedValue);

  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('rejects non-image uploads', async () => {
  const { app, tempRoot } = makeTempApp();

  await request(app)
    .post('/api/nfts')
    .field('title', 'Bad Upload')
    .attach('image', Buffer.from('not-an-image'), {
      filename: 'bad.txt',
      contentType: 'text/plain'
    })
    .expect(400)
    .expect((response) => {
      assert.match(response.body.error, /Only image uploads are supported/);
    });

  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test('rate limits repeated upload attempts', async () => {
  const { app, tempRoot } = makeTempApp();

  for (let index = 0; index < 12; index += 1) {
    await request(app)
      .post('/api/nfts')
      .field('title', `Art ${index}`)
      .attach('image', Buffer.from('fake-image'), {
        filename: `piece-${index}.png`,
        contentType: 'image/png'
      })
      .expect(201);
  }

  await request(app)
    .post('/api/nfts')
    .field('title', 'Art overflow')
    .attach('image', Buffer.from('fake-image'), {
      filename: 'overflow.png',
      contentType: 'image/png'
    })
    .expect(429)
    .expect((response) => {
      assert.match(response.body.error, /Too many requests/);
    });

  fs.rmSync(tempRoot, { recursive: true, force: true });
});
