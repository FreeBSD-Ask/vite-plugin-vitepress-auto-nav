# vite-plugin-vitepress-auto-nav

[English](./README.md) · [中文文档](./README-CN.md)

自动生成 `VitePress` 的 `nav` 与 `sidebar` 配置

## ✨ 功能

- **自动导航（新）**：零配置，从 VitePress 运行时页面自动生成，支持动态路由
- **模式匹配**：通过 glob 模式（`pattern`）自定义导航范围
- **GitBook SUMMARY**：使用 `SUMMARY.md` 生成侧边栏，完美支持 GitBook 迁移
- **多语言（i18n）**：自动为每个语言生成对应的 `nav` 和 `sidebar`
- 修改插件配置或 `frontmatter` 后自动刷新
- 通过 `overrides` 或 `itemsSetting` 自定义展示名称、排序、可见性
- 文章 H1 标题作为展示名称（`preferArticleTitle` / `useArticleTitle`）
- 基于 `frontmatter` 的配置，支持属性前缀

## 🕯️ 使用

### 1. 安装

```sh
npm i vite-plugin-vitepress-auto-nav vite -D
# 或
pnpm i vite-plugin-vitepress-auto-nav vite -D
# 或
yarn add vite-plugin-vitepress-auto-nav vite -D
```

### 2. 添加插件

#### 模式 A：自动导航（零配置，推荐）

无需任何配置，自动读取 VitePress 运行时页面并生成 `nav` 和 `sidebar`。

```ts
// .vitepress/config.ts
import AutoNav from 'vite-plugin-vitepress-auto-nav'

export default defineConfig({
  vite: {
    plugins: [AutoNav()],
  },
})
```

自定义配置：

```ts
AutoNav({
  include: ['guide/**', 'api/**'],
  exclude: ['**/internal/**'],
  standaloneIndex: false, // index.md 作为文件夹链接（默认）
  preferArticleTitle: true, // 使用 H1 作为展示名称
  frontmatterKeyPrefix: 'nav_', // frontmatter 字段前缀为 nav_
  overrides: {
    guide: { displayName: '用户指南', collapsed: true },
    'api/old-endpoint': { visible: false },
  },
  sorter: (a, b) => (a.options.order ?? 0) - (b.options.order ?? 0),
  dev: {
    watchDebounceMs: 2000, // 文件监听防抖（毫秒）
    logLevel: 'debug', // 'silent' | 'info' | 'debug'
  },
})
```

#### 模式 B：模式匹配（传统）

使用 glob 模式（`pattern`）匹配文件。支持 `itemsSetting`、`compareFn`、`useArticleTitle`、`indexAsFolderLink`。

```ts
AutoNav({
  pattern: 'docs/**/*.md',
  indexAsFolderLink: true,
  useArticleTitle: false,
  frontmatterPrefix: 'nav_',
  itemsSetting: {
    guide: { title: '快速入门', sort: 1 },
    internal: { hide: true },
  },
})
```

#### 模式 C：基于 GitBook `SUMMARY.md`

非常适合从 GitBook 迁移的用户，或倾向于在单一 `SUMMARY.md` 文件中维护文档结构的用户。

```ts
AutoNav({
  summary: {
    target: './SUMMARY.md',
    readmeAsIndex: true, // 将 SUMMARY 中引用的 README.md 映射为首页 /
    collapsed: false,
  },
})
```

`SUMMARY.md` 示例：

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

#### 多语言 i18n

```ts
import AutoNav from 'vite-plugin-vitepress-auto-nav'

export default defineConfig({
  locales: {
    root: { label: '简体中文', lang: 'zh-CN' },
    en: { label: 'English', lang: 'en', link: '/en/' },
  },
  // 对非根 locale 可用 rewrites 将各语言目录映射到对应路径
  rewrites: {
    'zh/:path(.*)': ':path',
  },
  vite: {
    plugins: [
      AutoNav({
        summary: {
          target: {
            root: './zh/SUMMARY.md', // 对应 locales.root
            en: './en/SUMMARY.md', // 对应 locales.en
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

> **注意**：自动导航模式（A）也原生支持 i18n，会自动检测 VitePress 的 `locales` 配置，为每个语言生成对应的 `nav` 和 `sidebar`。

### 3. 启动项目

正常启动 VitePress 即可，插件会自动生成 `nav` 和 `sidebar`。

## 配置

### 自动导航配置项

| 配置项                 | 类型                              | 默认值        | 说明                                                                 |
| ---------------------- | --------------------------------- | ------------- | -------------------------------------------------------------------- |
| `include`              | `string \| string[]`              | —             | 包含页面的 glob 匹配规则                                             |
| `exclude`              | `string \| string[]`              | —             | 排除页面的 glob 匹配规则                                             |
| `standaloneIndex`      | `boolean`                         | `false`       | 为 `true` 时，`index.md` 作为独立页面；为 `false` 时，作为文件夹链接 |
| `overrides`            | `Record<string, ItemMetaOptions>` | `{}`          | 按文件名、目录名或路径覆盖配置                                       |
| `frontmatterKeyPrefix` | `string`                          | `''`          | frontmatter 字段前缀（如 `nav_` → `nav_visible`）                    |
| `sorter`               | `(a, b, prefix?) => number`       | 按 order 排序 | 同级节点排序函数                                                     |
| `preferArticleTitle`   | `boolean`                         | `false`       | 使用 H1 作为页面展示名称                                             |
| `dev`                  | `AutoNavDevOptions`               | —             | 开发态行为配置                                                       |

#### `ItemMetaOptions`

| 配置项               | 类型      | 默认值  | 说明                       |
| -------------------- | --------- | ------- | -------------------------- |
| `visible`            | `boolean` | `true`  | 是否显示该条目             |
| `order`              | `number`  | —       | 排序权重（数值越小越靠前） |
| `displayName`        | `string`  | —       | 自定义展示名称             |
| `preferArticleTitle` | `boolean` | `false` | 使用 H1 作为展示名称       |
| `collapsed`          | `boolean` | —       | 目录节点是否默认折叠       |

#### `AutoNavDevOptions`

| 配置项            | 类型                            | 默认值   | 说明                     |
| ----------------- | ------------------------------- | -------- | ------------------------ |
| `watchDebounceMs` | `number`                        | `1500`   | 文件监听防抖时长（毫秒） |
| `cache`           | `boolean`                       | `true`   | 是否启用内容元数据缓存   |
| `logLevel`        | `'silent' \| 'info' \| 'debug'` | `'info'` | 日志级别                 |

### 模式匹配配置项（传统）

| 配置项              | 类型                          | 默认值     | 说明                                                                 |
| ------------------- | ----------------------------- | ---------- | -------------------------------------------------------------------- |
| `pattern`           | `string \| string[]`          | `'**.md'`  | glob 匹配表达式                                                      |
| `indexAsFolderLink` | `boolean`                     | `true`     | 为 `true` 时，`index.md` 作为文件夹链接；为 `false` 时，作为独立页面 |
| `itemsSetting`      | `Record<string, ItemOptions>` | `{}`       | 对特定文件或文件夹进行配置                                           |
| `frontmatterPrefix` | `string`                      | `''`       | frontmatter 配置属性前缀                                             |
| `compareFn`         | `(a, b, prefix?) => number`   | 按时间排序 | 自定义排序方法                                                       |
| `useArticleTitle`   | `boolean`                     | `false`    | 使用 H1 代替文件名                                                   |

#### `ItemOptions`

| 配置项            | 类型      | 默认值  | 说明                              |
| ----------------- | --------- | ------- | --------------------------------- |
| `hide`            | `boolean` | —       | 是否隐藏                          |
| `sort`            | `number`  | —       | 排序值（目标位置下标，从 0 开始） |
| `title`           | `string`  | —       | 自定义展示名称                    |
| `useArticleTitle` | `boolean` | —       | 使用 H1 作为展示名称              |
| `collapsed`       | `boolean` | `false` | 文件夹是否折叠                    |

### summary 配置项

| 配置项          | 类型                               | 默认值 | 说明                                                                                                  |
| --------------- | ---------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| `target`        | `string \| Record<string, string>` | —      | `SUMMARY.md` 文件路径。多语言时使用对象形式，键名需与 VitePress `locales` 一致（`root` 代表默认语言） |
| `readmeAsIndex` | `boolean`                          | `true` | 将 SUMMARY 中引用的 `README.md` 映射为首页 `/`                                                        |
| `collapsed`     | `boolean`                          | —      | sidebar 分类是否可折叠                                                                                |
| `removeEscape`  | `boolean`                          | `true` | 去掉 SUMMARY 文本中的转义字符 `\`                                                                     |

## License

[MIT](./LICENSE) License © 2023-2026 [Xaviw](https://github.com/Xaviw)
