---
title: How This Map Works
description: How the public Factory Brain map is generated from Obsidian-style Markdown.
---

# How This Map Works

Factory Brain은 Obsidian에서 쓰는 Markdown 문서를 Quartz로 웹에 게시한다.

## Link creates a relationship

```md
관련 프로젝트: [[Project Portfolio]]
실험 결과: [[Dragon Blog]]
```

이렇게 쓰면 문서 사이에 링크가 생기고, Quartz가 백링크와 Graph view를 자동으로 만든다.

## Privacy boundary

공개 사이트에는 공개용 프로젝트 설명만 복사한다. 원본 Factory-Brain vault의 일기, 서버 정보, 개인 메모는 이 사이트와 연결하지 않는다.

## Publishing

이 사이트는 Quartz 정적 사이트다. 빌드 결과물은 GitHub Pages나 Vercel 같은 정적 호스팅에 배포할 수 있다.

