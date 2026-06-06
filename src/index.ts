import { normalize } from 'path'
import { existsSync } from 'fs'
import { readFile, writeFile, mkdir } from 'fs/promises'
import glob from 'fast-glob'
import matter from 'gray-matter'
import parseSummary from './parseSummary'
import { throttle, forceReload, updateCommitTimes } from './utils'
import {
  generateNav,
  generateSidebar,
  getArticleTitle,
  serializationPaths,
  sortStructuredData,
} from './parseArticle'
import { normalizeOptions } from './core/normalizeOptions'
import createAutoNavPlugin from './core/plugin'

import type {
  Frontmatter,
  ItemCacheOptions,
  Options,
  UserConfig,
} from '../types'
import type { CompatibleVitePlugin } from './types/viteCompatible'
import type { AutoNavPluginOptions } from './types/plugin'

// 缓存数据，减少读取 git 时间戳和读取文件内容的次数
export let cache: Record<
  string,
  { options: ItemCacheOptions; frontmatter: Frontmatter }
> = {}

// 记录访问过的缓存，用于删除不再需要的缓存
export const visitedCache = new Set<string>()

export default function AutoNav(
  options: Options = {}
): CompatibleVitePlugin {
  // SUMMARY 模式：使用 GitBook SUMMARY 工作流
  if (options.summary) {
    return createSummaryPlugin(options)
  }

  // 传统 pattern 模式：使用 fast-glob 匹配文件
  if (options.pattern) {
    return createLegacyAutoNavPlugin(options)
  }

  // 新的自动导航模式：使用 VitePress 运行时页面
  const normalized = normalizeOptions(options as AutoNavPluginOptions)
  return createAutoNavPlugin({
    include: normalized.include,
    exclude: normalized.exclude,
    standaloneIndex: normalized.standaloneIndex,
    overrides: normalized.overrides,
    frontmatterKeyPrefix: normalized.frontmatterKeyPrefix,
    sorter: normalized.sorter,
    preferArticleTitle: normalized.preferArticleTitle,
    dev: normalized.dev,
  })
}

/** SUMMARY 模式插件 */
function createSummaryPlugin(options: Options): CompatibleVitePlugin {
  return {
    name: 'vite-plugin-vitepress-auto-nav',
    async configureServer({ config, watcher }) {
      const {
        vitepress: { configPath },
      } = config as unknown as UserConfig

      const $configPath =
        configPath?.match(/(\.vitepress.*)/)?.[1] ||
        '.vitepress/config.ts'

      const throttleMdWatcher = throttle(
        mdWatcher.bind(null, $configPath),
        1500
      )
      watcher.on('all', (eventName, path) => {
        if (options.summary?.target) {
          const targetPaths =
            typeof options.summary.target === 'string'
              ? [options.summary.target]
              : Object.values(options.summary.target)
          if (
            targetPaths.some(
              (t) => normalize(path) === normalize(t)
            )
          ) {
            forceReload($configPath)
            return
          }
        }
        throttleMdWatcher(eventName, path)
      })
    },
    async config(config) {
      const {
        vitepress: {
          site: {
            themeConfig: { nav },
          },
        },
      } = config as unknown as UserConfig

      if (options.summary) {
        console.log('🎈 SUMMARY 解析中...')
        const { target } = options.summary
        const vpConfig = config as unknown as UserConfig

        if (typeof target === 'string') {
          const summaryOpts = { ...options.summary, target }
          const { sidebar, nav: _nav } =
            await parseSummary(summaryOpts)
          vpConfig.vitepress.site.themeConfig.sidebar =
            sidebar
          if (!nav) {
            vpConfig.vitepress.site.themeConfig.nav = _nav
          }
        } else {
          const multiSidebar: Record<string, any> = {}
          for (const [locale, filePath] of Object.entries(
            target
          )) {
            const localePrefix =
              locale === 'root' ? '' : locale
            const summaryOpts = {
              ...options.summary,
              target: filePath,
            }
            const { sidebar, nav: _nav } =
              await parseSummary(summaryOpts, localePrefix)
            const key =
              locale === 'root' ? '/' : `/${locale}/`
            multiSidebar[key] = sidebar
          }
          vpConfig.vitepress.site.themeConfig.sidebar =
            multiSidebar
        }
        console.log('🎈 SUMMARY 解析完成...')
        return config
      }

      return config
    },
  }
}

/** 传统 pattern 模式插件（使用 fast-glob） */
function createLegacyAutoNavPlugin(
  options: Options
): CompatibleVitePlugin {
  return {
    name: 'vite-plugin-vitepress-auto-nav',
    async configureServer({ config, watcher }) {
      const {
        vitepress: { configPath },
      } = config as unknown as UserConfig

      const $configPath =
        configPath?.match(/(\.vitepress.*)/)?.[1] ||
        '.vitepress/config.ts'

      const throttleMdWatcher = throttle(
        mdWatcher.bind(null, $configPath),
        1500
      )
      watcher.on('all', (eventName, path) => {
        throttleMdWatcher(eventName, path)
      })
    },
    async config(config) {
      const {
        vitepress: {
          userConfig: { srcExclude = [], srcDir = './' },
          site: {
            themeConfig: { nav },
          },
          cacheDir,
        },
      } = config as unknown as UserConfig

      console.log('🎈 auto-nav 生成中...')
      visitedCache.clear()
      if (!existsSync(cacheDir)) {
        await mkdir(cacheDir)
      }
      try {
        const cacheStr = await readFile(
          `${cacheDir}/auto-nav-cache.json`,
          {
            encoding: 'utf-8',
          }
        )
        cache = JSON.parse(cacheStr) || {}
      } catch {
        // 缓存文件不存在或解析失败
      }

      const pattern = options.pattern || '**.md'

      const paths = (
        await glob(pattern, {
          cwd: srcDir,
          ignore: [
            '**/node_modules/**',
            '**/dist/**',
            'index.md',
            ...srcExclude,
          ],
        })
      ).map((path) => normalize(path))

      let data = await serializationPaths(paths, options, srcDir)

      updateCommitTimes(data)

      data = sortStructuredData(data, options.compareFn)

      if (!nav) {
        ;(
          config as unknown as UserConfig
        ).vitepress.site.themeConfig.nav = generateNav(data)
      }

      const sidebar = generateSidebar(data, options)
      ;(
        config as unknown as UserConfig
      ).vitepress.site.themeConfig.sidebar = sidebar

      for (const key in cache) {
        if (!visitedCache.has(key)) {
          delete cache[key]
        }
      }
      writeFile(
        `${cacheDir}/auto-nav-cache.json`,
        JSON.stringify(cache)
      )

      console.log('🎈 auto-nav 生成完成')
      return config
    },
  }
}

/** 文件变动事件 */
async function mdWatcher(
  configPath: string,
  event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
  path: string
) {
  if (!path.endsWith('.md')) return

  if (event === 'change' && cache[path]) {
    const file = await readFile(path, {
      encoding: 'utf-8',
    })
    const { content, data } = matter(file)
    data.h1 = getArticleTitle(content, data)
    if (
      Object.keys(data).length !==
      Object.keys(cache[path].frontmatter).length
    ) {
      forceReload(configPath)
      return
    }
    for (const key in data) {
      if (cache[path].frontmatter[key] !== data[key]) {
        forceReload(configPath)
        return
      }
    }
  } else {
    forceReload(configPath)
  }
}