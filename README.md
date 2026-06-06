# vite-plugin-vitepress-auto-nav

[中文文档](./README-CN.md) · [English](./README.md)

Auto-generate `VitePress` `nav` and `sidebar` configurations.

## ✨ Features

- **Auto-nav (new)**: zero-config auto-generation from VitePress runtime pages, supports dynamic routes
- **Pattern-based**: customize navigation with glob patterns (`pattern`)
- **GitBook SUMMARY**: use `SUMMARY.md` to generate sidebar, perfect for GitBook migration
- **Multi-language (i18n)**: automatically generate per-locale `nav` and `sidebar`
- Auto-refresh when plugin config or `frontmatter` changes
- Customize display names, sorting, visibility per file/folder via `overrides` or `itemsSetting`
- Article H1 title as display name (`preferArticleTitle` / `useArticleTitle`)
- `frontmatter` based configuration with prefix support

## 🕯️ Usage

### 1. Install

```sh
npm i vite-plugin-vitepress-auto-nav vite -D
# or
pnpm i vite-plugin-vitepress-auto-nav vite -D
# or
yarn add vite-plugin-vitepress-auto-nav vite -D
```

### 2. Add the plugin

#### Mode A: Auto-nav (zero-config, recommended)

No configuration needed — automatically reads VitePress runtime pages and generates `nav` and `sidebar`.

```ts
// .vitepress/config.ts
import AutoNav from 'vite-plugin-vitepress-auto-nav'

export default defineConfig({
  vite: {
    plugins: [AutoNav()],
  },
})
```

With custom options:

```ts
AutoNav({
  include: ['guide/**', 'api/**'],
  exclude: ['**/internal/**'],
  standaloneIndex: false, // index.md acts as folder link (default)
  preferArticleTitle: true, // use H1 as display name
  frontmatterKeyPrefix: 'nav_', // frontmatter fields prefixed with nav_
  overrides: {
    guide: { displayName: 'User Guide', collapsed: true },
    'api/old-endpoint': { visible: false },
  },
  sorter: (a, b) => (a.options.order ?? 0) - (b.options.order ?? 0),
  dev: {
    watchDebounceMs: 2000, // file watch debounce (ms)
    logLevel: 'debug', // 'silent' | 'info' | 'debug'
  },
})
```

#### Mode B: Pattern-based (legacy)

Use glob patterns (`pattern`) to match files. Supports `itemsSetting`, `compareFn`, `useArticleTitle`, `indexAsFolderLink`.

```ts
AutoNav({
  pattern: 'docs/**/*.md',
  indexAsFolderLink: true,
  useArticleTitle: false,
  frontmatterPrefix: 'nav_',
  itemsSetting: {
    guide: { title: 'Getting Started', sort: 1 },
    internal: { hide: true },
  },
})
```

#### Mode C: GitBook `SUMMARY.md` based

Perfect for migrating from GitBook, or for users who prefer to maintain documentation structure in a single `SUMMARY.md` file.

```ts
AutoNav({
  summary: {
    target: './SUMMARY.md',
    readmeAsIndex: true, // map README.md in SUMMARY to homepage /
    collapsed: false,
  },
})
```

A `SUMMARY.md` example:

```markdown
# Table of Contents

## Getting Started

- [Introduction](README.md)
- [Installation](installation.md)
- [Quick Start](quick-start.md)

## Guide

- [Configuration](configuration.md)
- [Deployment](deployment.md)

## API

- [Plugin Options](api/options.md)
- [Summary Config](api/summary.md)
```

#### Multi-language i18n

```ts
import AutoNav from 'vite-plugin-vitepress-auto-nav'

export default defineConfig({
  locales: {
    root: { label: '简体中文', lang: 'zh-CN' },
    en: { label: 'English', lang: 'en', link: '/en/' },
  },
  // For non-root locales, use rewrites to map language folders
  rewrites: {
    'zh/:path(.*)': ':path',
  },
  vite: {
    plugins: [
      AutoNav({
        summary: {
          target: {
            root: './zh/SUMMARY.md', // Matches locales.root
            en: './en/SUMMARY.md', // Matches locales.en
          },
          readmeAsIndex: true,
        },
      }),
    ],
  },
})
```

Suggested directory structure:

```
project/
├── .vitepress/config.ts
├── zh/                       # Root locale content (Chinese)
│   ├── SUMMARY.md
│   ├── README.md             # → maps to /
│   ├── installation.md       # → maps to /installation
│   └── ...
└── en/                       # English locale content
    ├── SUMMARY.md
    ├── README.md             # → maps to /en/
    ├── installation.md       # → maps to /en/installation
    └── ...
```

> **Note**: Auto-nav mode (A) also supports i18n natively — it automatically detects VitePress `locales` and generates per-locale `nav` and `sidebar`.

### 3. Start the project

Start VitePress normally and the plugin will generate `nav` and `sidebar` automatically.

## Configuration

### Auto-nav options

| Option                 | Type                              | Default     | Description                                                                            |
| ---------------------- | --------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| `include`              | `string \| string[]`              | —           | Glob patterns to include pages                                                         |
| `exclude`              | `string \| string[]`              | —           | Glob patterns to exclude pages                                                         |
| `standaloneIndex`      | `boolean`                         | `false`     | When `true`, `index.md` is a standalone page; when `false`, it acts as the folder link |
| `overrides`            | `Record<string, ItemMetaOptions>` | `{}`        | Per-file/folder overrides (by name, path, or directory)                                |
| `frontmatterKeyPrefix` | `string`                          | `''`        | Prefix for frontmatter fields (e.g. `nav_` → `nav_visible`)                            |
| `sorter`               | `(a, b, prefix?) => number`       | order-based | Sort function for sibling items                                                        |
| `preferArticleTitle`   | `boolean`                         | `false`     | Use H1 as display name for pages                                                       |
| `dev`                  | `AutoNavDevOptions`               | —           | Dev-mode behavior                                                                      |

#### `ItemMetaOptions`

| Option               | Type      | Default | Description                                |
| -------------------- | --------- | ------- | ------------------------------------------ |
| `visible`            | `boolean` | `true`  | Whether the item is visible                |
| `order`              | `number`  | —       | Sort weight (lower = first)                |
| `displayName`        | `string`  | —       | Custom display name                        |
| `preferArticleTitle` | `boolean` | `false` | Use H1 as display name                     |
| `collapsed`          | `boolean` | —       | Whether the folder is collapsed by default |

#### `AutoNavDevOptions`

| Option            | Type                            | Default  | Description                   |
| ----------------- | ------------------------------- | -------- | ----------------------------- |
| `watchDebounceMs` | `number`                        | `1500`   | File watch debounce (ms)      |
| `cache`           | `boolean`                       | `true`   | Enable content metadata cache |
| `logLevel`        | `'silent' \| 'info' \| 'debug'` | `'info'` | Log level                     |

### Pattern-based options (legacy)

| Option              | Type                          | Default    | Description                                                                       |
| ------------------- | ----------------------------- | ---------- | --------------------------------------------------------------------------------- |
| `pattern`           | `string \| string[]`          | `'**.md'`  | Glob patterns to match markdown files                                             |
| `indexAsFolderLink` | `boolean`                     | `true`     | When `true`, `index.md` acts as folder link; when `false`, it's a standalone page |
| `itemsSetting`      | `Record<string, ItemOptions>` | `{}`       | Per-file/folder configuration                                                     |
| `frontmatterPrefix` | `string`                      | `''`       | Prefix for frontmatter fields                                                     |
| `compareFn`         | `(a, b, prefix?) => number`   | time-based | Sort function for sibling items                                                   |
| `useArticleTitle`   | `boolean`                     | `false`    | Use H1 as display name                                                            |

#### `ItemOptions`

| Option            | Type      | Default | Description                     |
| ----------------- | --------- | ------- | ------------------------------- |
| `hide`            | `boolean` | —       | Hide the item                   |
| `sort`            | `number`  | —       | Sort position (0-based index)   |
| `title`           | `string`  | —       | Custom display name             |
| `useArticleTitle` | `boolean` | —       | Use H1 as display name          |
| `collapsed`       | `boolean` | `false` | Whether the folder is collapsed |

### summary options

| Option          | Type                               | Default | Description                                                                                                                             |
| --------------- | ---------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `target`        | `string \| Record<string, string>` | —       | Path to `SUMMARY.md`. Use object form for multi-language; keys must match `locales` in VitePress config (`root` for the default locale) |
| `readmeAsIndex` | `boolean`                          | `true`  | Map `README.md` references in SUMMARY to homepage `/`                                                                                   |
| `collapsed`     | `boolean`                          | —       | Whether sidebar groups are collapsible                                                                                                  |
| `removeEscape`  | `boolean`                          | `true`  | Strip escape characters `\` from SUMMARY text                                                                                           |

## License

[MIT](./LICENSE) License © 2023-2026 [Xaviw](https://github.com/Xaviw)
