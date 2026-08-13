# Factory Brain Web

Public-facing Quartz view of the Factory Brain project map.

## Boundary

The Obsidian vault at `/home/sy/Obsidian/Factory-Brain` is the source of truth for
the full private record. This repository contains only deliberately curated
public notes. Never symlink the whole vault into `content/`.

- Public site content: `content/`
- Private/local material: `content-private/` (ignored)
- Build output: `public/` (ignored)

## Local preview

```sh
npm ci
npx quartz build --serve
```

## Before publishing

```sh
node scripts/check-public-boundary.mjs
npx quartz build
```

The boundary check rejects private-looking paths, credentials, and local
machine paths from the public content tree.

## Updating content

Write complete work records and project details in the private Obsidian vault.
Copy only sanitized summaries into `content/`, preserving `[[internal links]]`
between public notes so Quartz can render backlinks and Graph view.

---

> “[One] who works with the door open gets all kinds of interruptions, but [they] also occasionally gets clues as to what the world is and what might be important.” — Richard Hamming

Quartz is a set of tools that helps you publish your [digital garden](https://jzhao.xyz/posts/networked-thought) and notes as a website for free.

🔗 Read the documentation and get started: https://quartz.jzhao.xyz/

[Join the Discord Community](https://discord.gg/cRFFHYye7t)

## Sponsors

<p align="center">
  <a href="https://github.com/sponsors/jackyzha0">
    <img src="https://cdn.jsdelivr.net/gh/jackyzha0/jackyzha0/sponsorkit/sponsors.svg" />
  </a>
</p>
