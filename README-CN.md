# vite-plugin-vitepress-auto-nav

[English](./README.md) · [中文文档](./README-CN.md)

自动生成 `VitePress` 的 `nav` 与 `sidebar` 配置

## ✨ 功能

- 将一级文件夹作为 `nav`，将次级文件夹和文件作为 `sidebar`
- 修改插件配置或 `frontmatter` 后自动刷新
- 支持自定义读取范围（基于 `srcDir` 与 `srcExclude` 配置）
- 支持自定义子文件夹下的 `index.md` 是单独展示还是点击文件夹名称展示
- 支持自定义显示名称，文章还支持一级标题作为名称
- 支持自定义排序方法
- 支持自定义隐藏文件或文件夹
- 支持插件选项与文章 `frontmatter` 配置两种方式自定义文章配置（配置属性名还支持添加前缀）
- 支持使用同 `Gitbook` 的 `SUMMARY.md` 文件作为 `sidebar` 配置
- 支持一键迁移 `GitBook` 项目到 `VitePress`，包括多语言文档
- 支持将 `README.md` 映射为首页 `/`（`readmeAsIndex`）

## 🕯️ 使用

### 1. 安装

```sh
# 使用 ts 时推荐安装 vite，否则会有类型错误
npm i vite-plugin-vitepress-auto-nav vite -D
# 或
pnpm i vite-plugin-vitepress-auto-nav vite -D
# 或
yarn add vite-plugin-vitepress-auto-nav vite -D
```

### 2. 添加插件

#### 模式 A：基于文件系统（默认）

```ts
// .vitepress/config.ts
import AutoNav from 'vite-plugin-vitepress-auto-nav'

export default defineConfig({
  vite: {
    plugins: [
      AutoNav({
        // 自定义配置
      }),
    ],
  },
})
```

#### 模式 B：基于 GitBook `SUMMARY.md`

非常适合从 GitBook 迁移的用户，或倾向于在单一 `SUMMARY.md` 文件中维护文档结构的用户。

```ts
// .vitepress/config.ts
import AutoNav from 'vite-plugin-vitepress-auto-nav'

export default defineConfig({
  vite: {
    plugins: [
      AutoNav({
        summary: {
          target: './SUMMARY.md',
          // 可选：将 SUMMARY 中引用的 README.md 映射为首页 /，默认 true
          readmeAsIndex: true,
          // 可选：是否可折叠
          collapsed: false,
        },
      }),
    ],
  },
})
```

`SUMMARY.md` 示例：

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

#### 多语言 i18n

```ts
import AutoNav from 'vite-plugin-vitepress-auto-nav'

export default defineConfig({
  locales: {
    root: { label: '简体中文', lang: 'zh-CN' },
    en: { label: 'English', lang: 'en', link: '/en/' },
  },
  themeConfig: {
    locales: {
      root: { nav: [], sidebar: {} },
      en: { nav: [], sidebar: {} },
    },
  },
  // 对非根 locale 可用 rewrites 将各语言目录映射到对应路径
  // （如 root locale 的内容放在 zh/ 目录，en 内容放在 en/ 目录）
  rewrites: {
    'zh/:path(.*)': ':path',
  },
  vite: {
    plugins: [
      AutoNav({
        summary: {
          target: {
            root: './zh/SUMMARY.md',  // 对应 locales.root
            en: './en/SUMMARY.md',     // 对应 locales.en
          },
          readmeAsIndex: true,
        },
      }),
    ],
  },
})
```

推荐的目录结构：

```
project/
├── .vitepress/config.ts
├── zh/                       # 根 locale 的内容（中文）
│   ├── SUMMARY.md
│   ├── README.md             # → 映射到 /
│   ├── installation.md       # → 映射到 /installation
│   └── ...
└── en/                       # 英文 locale 的内容
    ├── SUMMARY.md
    ├── README.md             # → 映射到 /en/
    ├── installation.md       # → 映射到 /en/installation
    └── ...
```

3. 正常启动项目即可使用

## 配置

请参考 TypeScript 类型提示 — [types/index.d.ts](./types/index.d.ts)

### summary 配置项

| 配置项 | 类型 | 默认值 | 说明 |
| ------ | ---- | ------ | ---- |
| `target` | `string \| Record<string, string>` | — | `SUMMARY.md` 文件路径。多语言时使用对象形式，键名需与 VitePress `locales` 一致（`root` 代表默认语言） |
| `readmeAsIndex` | `boolean` | `true` | 将 SUMMARY 中引用的 `README.md` 映射为首页 `/`（GitBook 习惯用 `README.md`，VitePress 使用 `index.md`） |
| `collapsed` | `boolean` | — | sidebar 分类是否可折叠 |
| `removeEscape` | `boolean` | `true` | 去掉 SUMMARY 文本中的转义字符 `\` |

## License

[MIT](./LICENSE) License © 2023-2026 [Xaviw](https://github.com/Xaviw)
