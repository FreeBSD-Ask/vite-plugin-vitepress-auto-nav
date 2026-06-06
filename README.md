# vite-plugin-vitepress-auto-nav

[中文文档](./README-CN.md) · [English](./README.md)

Auto-generate `VitePress` `nav` and `sidebar` configurations.

## ✨ Features

- Use primary folder as `nav` and secondary folder and files as `sidebar`
- Automatic refresh after changing plugin configuration or `frontmatter`
- Support for customizing read ranges (based on `srcDir` and `srcExclude` configurations)
- Support to customize whether the `index.md` under the sub-folder is displayed separately or by clicking the folder name
- Support for customizing the display name, articles also support the first level of the title as the name
- Support for customizing the sorting method
- Support for customizing hidden files or folders
- Supports both plugin options and article `frontmatter` configurations to customize article configurations (configured attribute names also support adding prefixes)
- Support for using the same `Gitbook` `SUMMARY.md` file as the `sidebar` configuration
- Support for migrating `GitBook` projects to `VitePress` with one click, including multi-language documentation
- Support mapping `README.md` to homepage `/` (`readmeAsIndex`)

## 🕯️ Usage

### 1. Install

```sh
# Installing vite is recommended when using ts, otherwise you will get type errors.
npm i vite-plugin-vitepress-auto-nav vite -D
# or
pnpm i vite-plugin-vitepress-auto-nav vite -D
# or
yarn add vite-plugin-vitepress-auto-nav vite -D
```

### 2. Add the plugin

#### Mode A: File-system based (default)

```ts
// .vitepress/config.ts
import AutoNav from 'vite-plugin-vitepress-auto-nav'

export default defineConfig({
  vite: {
    plugins: [
      AutoNav({
        // Custom configurations
      })
    ]
  }
})
```

#### Mode B: GitBook `SUMMARY.md` based

Perfect for migrating from GitBook, or for users who prefer to maintain documentation structure in a single `SUMMARY.md` file.

```ts
// .vitepress/config.ts
import AutoNav from 'vite-plugin-vitepress-auto-nav'

export default defineConfig({
  vite: {
    plugins: [
      AutoNav({
        summary: {
          target: './SUMMARY.md',
          // Optional: map README.md in SUMMARY to homepage /, default true
          readmeAsIndex: true,
          // Optional: foldable, default not specified
          collapsed: false
        }
      })
    ]
  }
})
```

A `SUMMARY.md` example:

```markdown
# Table of Contents

## Getting Started

* [Introduction](README.md)
* [Installation](installation.md)
* [Quick Start](quick-start.md)

## Guide

* [Configuration](configuration.md)
* [Deployment](deployment.md)

## API

* [Plugin Options](api/options.md)
* [Summary Config](api/summary.md)
```

#### Multi-language i18n

```ts
import AutoNav from 'vite-plugin-vitepress-auto-nav'

export default defineConfig({
  locales: {
    root: { label: '简体中文', lang: 'zh-CN' },
    en: { label: 'English', lang: 'en', link: '/en/' }
  },
  themeConfig: {
    locales: {
      root: { nav: [], sidebar: {} },
      en: { nav: [], sidebar: {} }
    }
  },
  // For non-root locales, you can use rewrites to map each language folder
  // to its own path (e.g. root locale content in zh/ folder, en content in en/ folder).
  rewrites: {
    'zh/:path(.*)': ':path'
  },
  vite: {
    plugins: [
      AutoNav({
        summary: {
          target: {
            root: './zh/SUMMARY.md',  // Matches locales.root
            en: './en/SUMMARY.md'      // Matches locales.en
          },
          readmeAsIndex: true
        }
      })
    ]
  }
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

3. Start the project normally and it's ready to use

## Configuration

Please refer to the TypeScript type hints — [types/index.d.ts](./types/index.d.ts)

### summary options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `target` | `string \| Record<string, string>` | — | Path to `SUMMARY.md`. Use object form for multi-language; keys must match `locales` in VitePress config (`root` for the default locale) |
| `readmeAsIndex` | `boolean` | `true` | Map `README.md` references in SUMMARY to homepage `/` (GitBook habit, VitePress uses `index.md`) |
| `collapsed` | `boolean` | — | Whether sidebar groups are collapsible |
| `removeEscape` | `boolean` | `true` | Strip escape characters `\` from SUMMARY text |

## License

[MIT](./LICENSE) License © 2023-2026 [Xaviw](https://github.com/Xaviw)
