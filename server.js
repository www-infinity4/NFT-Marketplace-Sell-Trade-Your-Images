const path = require('node:path');
const { createApp } = require('./app');

const port = Number.parseInt(process.env.PORT || '3000', 10);
const app = createApp({
  rootDir: __dirname,
  publicDir: path.join(__dirname, 'public'),
  uploadsDir: path.join(__dirname, 'uploads'),
  dataDir: path.join(__dirname, 'data')
});

app.listen(port, () => {
  console.log(`NFT Marketplace running at http://localhost:${port}`);
});
