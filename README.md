# NFT Marketplace — Sell & Trade Your Images

A polished NFT marketplace MVP where creators can upload artwork, receive a unique catalog number, track marketplace views, display an estimated value, and share a direct trader contact link.

## Features

- image uploads with validation
- automatic catalog numbering
- persistent JSON-backed catalog storage
- live view tracking per listing
- estimated value calculation based on interest
- seller contact link for direct trade discussions
- responsive marketplace, upload, and detail pages

## Run locally

```bash
npm install
npm start
```

The app starts on `http://localhost:3000`.

## Test

```bash
npm test
```

## Real trader connectivity path

This MVP supports direct seller-to-buyer contact via a listing contact link, which is the safest working option without embedding secrets or adding payment custody. To evolve this into a real trading product, the next steps are:

1. add wallet-based authentication for creators and buyers
2. mint or reference on-chain assets instead of only local catalog records
3. integrate escrowed checkout or marketplace smart contracts
4. store listings in a shared database instead of local JSON storage
5. add moderation, identity checks, and fraud controls