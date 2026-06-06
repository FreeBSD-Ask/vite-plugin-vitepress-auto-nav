import type { DefaultTheme, SiteConfig } from 'vitepress'
import type { AutoNavPluginOptions } from '../types/plugin'
import type {
  EffectiveItemMeta,
  PageContentMeta,
  ResolvedPage,
} from '../types/model'
import { resolve, sep } from 'path'
import { readFile, stat } from 'fs/promises'
import { createHash } from 'crypto'
import matter from 'gray-matter'

interface ParsedContentMeta {
  frontmatter: Record<string, unknown>
  h1?: string
}

interface ContentMetaStats {
  pagesCount: number
  hiddenPagesCount: number
  inlineContentCount: number
  dynamicTemplateFallbackCount: number
  missingTemplateCount: number
}

interface ContentMetaResult {
  pages: PageContentMeta[]
  stats: ContentMetaStats
}

interface ResolveContentMetaOptions {
  warn?: (message: string) => void
}

type DomainContentOptions = AutoNavPluginOptions

interface DomainItemSetting {
  visible?: boolean
  order?: number
  displayName?: string
  collapsed?: boolean
  preferArticleTitle?: boolean
}

const warnedKeys = new Set<string>()

function warnOnce(
  key: string,
  message: string,
  warn?: (message: string) => void
) {
  if (!warn || warnedKeys.has(key)) return
  warnedKeys.add(key)
  warn(message)
}

function getBasename(path: string) {
  const normalized = path.replace(/\\/g, '/').replace(/\/$/, '')
  return normalized.split('/').pop() || ''
}

function getParentDir(path: string) {
  const normalized = path.replace(/\\/g, '/').replace(/\/$/, '')
  const parts = normalized.split('/')
  parts.pop()
  return parts.join('/') || undefined
}

function removeMdExtension(name: string) {
  return name.replace(/\.md$/i, '')
}

function getArticleTitle(
  content: string,
  frontmatter: Record<string, unknown>
): string | undefined {
  if (frontmatter.title) return undefined
  const match = content.match(/^#\s+(.+)/m)
  return match ? match[1].trim() : undefined
}

function parseBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    if (lower === 'true' || lower === '1') return true
    if (lower === 'false' || lower === '0') return false
  }
  if (typeof value === 'number') return value !== 0
  return undefined
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return undefined
}

function parseString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  return undefined
}

function resolveFrontmatterField<T>(
  frontmatter: Record<string, unknown>,
  prefix: string,
  keys: string[],
  parser: (value: unknown) => T | undefined
): T | undefined {
  for (const key of keys) {
    if (prefix) {
      const prefixedValue = frontmatter[`${prefix}${key}`]
      if (prefixedValue !== undefined) {
        return parser(prefixedValue)
      }
    }
    const rawValue = frontmatter[key]
    if (rawValue !== undefined) {
      return parser(rawValue)
    }
  }
  return undefined
}

function normalizePath(input: string) {
  return input.replace(/\\/g, '/').replace(/^\.?\//, '')
}

function normalizeItemsSetting(
  options: DomainContentOptions
): Record<string, DomainItemSetting> {
  const result: Record<string, DomainItemSetting> = {}
  for (const key of Object.keys(options.overrides ?? {})) {
    const override = options.overrides?.[key]
    if (!override) continue
    result[normalizePath(key)] = {
      visible: override.visible,
      order: override.order,
      displayName: override.displayName,
      collapsed: override.collapsed,
      preferArticleTitle: override.preferArticleTitle,
    }
  }
  return result
}

function resolveItemSetting(
  page: ResolvedPage,
  normalizedSettings: Record<string, DomainItemSetting>
): DomainItemSetting | undefined {
  const candidates: string[] = []

  candidates.push(
    normalizePath(page.sourcePage),
    normalizePath(page.resolvedPage),
    normalizePath(page.rewrittenPage)
  )

  const sourceDir = getParentDir(page.sourcePage)
  const resolvedDir = getParentDir(page.resolvedPage)
  const rewrittenDir = getParentDir(page.rewrittenPage)

  if (sourceDir || resolvedDir || rewrittenDir) {
    const sourceDirBase = sourceDir ? getBasename(sourceDir) : ''
    const resolvedDirBase = resolvedDir ? getBasename(resolvedDir) : ''
    const rewrittenDirBase = rewrittenDir ? getBasename(rewrittenDir) : ''

    if (sourceDir) candidates.push(sourceDir)
    if (resolvedDir) candidates.push(resolvedDir)
    if (rewrittenDir) candidates.push(rewrittenDir)
    if (sourceDirBase) candidates.push(sourceDirBase)
    if (resolvedDirBase) candidates.push(resolvedDirBase)
    if (rewrittenDirBase) candidates.push(rewrittenDirBase)
  }

  for (const candidate of candidates) {
    if (normalizedSettings[candidate]) {
      return normalizedSettings[candidate]
    }
  }

  return undefined
}

function resolveItemMeta(
  frontmatter: Record<string, unknown>,
  itemSetting: DomainItemSetting | undefined,
  options: DomainContentOptions
): EffectiveItemMeta {
  const prefix = options.frontmatterKeyPrefix ?? ''
  const globalPreferArticleTitle = options.preferArticleTitle ?? false

  const visible =
    resolveFrontmatterField(frontmatter, prefix, ['visible'], parseBool) ??
    itemSetting?.visible ??
    true

  const order =
    resolveFrontmatterField(frontmatter, prefix, ['order'], parseNumber) ??
    itemSetting?.order

  const displayName =
    resolveFrontmatterField(
      frontmatter,
      prefix,
      ['displayName'],
      parseString
    ) ?? itemSetting?.displayName

  const preferArticleTitle =
    resolveFrontmatterField(
      frontmatter,
      prefix,
      ['preferArticleTitle'],
      parseBool
    ) ??
    itemSetting?.preferArticleTitle ??
    globalPreferArticleTitle

  const collapsed =
    resolveFrontmatterField(
      frontmatter,
      prefix,
      ['collapsed'],
      parseBool
    ) ?? itemSetting?.collapsed

  return {
    visible,
    order,
    displayName,
    preferArticleTitle,
    collapsed,
  }
}

function getContentSignature(content: string) {
  return createHash('sha1').update(content).digest('hex')
}

const parsedContentCache = new Map<string, ParsedContentMeta>()

function pruneContentCache(activeCacheKeys: Set<string>) {
  for (const key of parsedContentCache.keys()) {
    if (!activeCacheKeys.has(key)) {
      parsedContentCache.delete(key)
    }
  }
}

async function readParsedContent(
  absolutePath: string,
  inlineContent: string | undefined,
  useCache: boolean,
  activeCacheKeys: Set<string>,
  warn?: (message: string) => void
): Promise<{ parsed: ParsedContentMeta; missingTemplate: boolean }> {
  if (inlineContent != null) {
    const signature = `inline:${absolutePath}:${getContentSignature(inlineContent)}`
    activeCacheKeys.add(signature)
    if (useCache) {
      const cached = parsedContentCache.get(signature)
      if (cached) {
        return { parsed: cached, missingTemplate: false }
      }
    }

    const { content, data } = matter(inlineContent)
    const parsed: ParsedContentMeta = {
      frontmatter: data as Record<string, unknown>,
      h1: getArticleTitle(content, data as Record<string, unknown>),
    }
    if (useCache) {
      parsedContentCache.set(signature, parsed)
    }
    return { parsed, missingTemplate: false }
  }

  try {
    const { mtimeMs, size } = await stat(absolutePath)
    const signature = `file:${absolutePath}:${mtimeMs}`
    const cacheKey = `${signature}:${size}`
    activeCacheKeys.add(cacheKey)
    if (useCache) {
      const cached = parsedContentCache.get(cacheKey)
      if (cached) {
        return { parsed: cached, missingTemplate: false }
      }
    }

    const raw = await readFile(absolutePath, 'utf-8')
    const { content, data } = matter(raw)
    const parsed: ParsedContentMeta = {
      frontmatter: data as Record<string, unknown>,
      h1: getArticleTitle(content, data as Record<string, unknown>),
    }
    if (useCache) {
      parsedContentCache.set(cacheKey, parsed)
    }
    return { parsed, missingTemplate: false }
  } catch {
    warnOnce(
      `missing-template:${absolutePath}`,
      `[vite-plugin-vitepress-auto-nav] missing template markdown: ${absolutePath}`,
      warn
    )
    return {
      parsed: {
        frontmatter: {},
        h1: undefined,
      },
      missingTemplate: true,
    }
  }
}

function resolveDisplayText(
  page: ResolvedPage,
  parsed: ParsedContentMeta,
  meta: EffectiveItemMeta
) {
  if (meta.displayName) return meta.displayName
  if (meta.preferArticleTitle && parsed.h1) return parsed.h1

  const basename = getBasename(page.rewrittenPage)
  if (basename !== 'index.md') {
    return removeMdExtension(basename)
  }

  const parentDir = getParentDir(page.rewrittenPage)
  if (!parentDir) return 'index'
  return getBasename(parentDir)
}

export async function resolveContentMeta(
  pages: ResolvedPage[],
  siteConfig: SiteConfig<DefaultTheme.Config>,
  options: AutoNavPluginOptions = {},
  resolveOptions: ResolveContentMetaOptions = {}
): Promise<ContentMetaResult> {
  const srcDir = siteConfig.srcDir.split(sep).join('/')
  const useCache = options.dev?.cache !== false
  const activeCacheKeys = new Set<string>()
  const normalizedItemsSetting = normalizeItemsSetting(options)

  if (!useCache) {
    parsedContentCache.clear()
  }

  let inlineContentCount = 0
  let dynamicTemplateFallbackCount = 0
  let missingTemplateCount = 0

  const mapped = await Promise.all(
    pages.map(async (page, sourceOrder) => {
      const absolutePath = resolve(srcDir, page.sourcePage)
      const { parsed, missingTemplate } = await readParsedContent(
        absolutePath,
        page.content,
        useCache,
        activeCacheKeys,
        resolveOptions.warn
      )

      if (page.content != null) {
        inlineContentCount += 1
      } else if (page.params) {
        dynamicTemplateFallbackCount += 1
      }
      if (missingTemplate) {
        missingTemplateCount += 1
      }

      const itemSetting = resolveItemSetting(page, normalizedItemsSetting)
      const itemMeta = resolveItemMeta(
        parsed.frontmatter,
        itemSetting,
        options
      )
      const displayText = resolveDisplayText(page, parsed, itemMeta)

      const result: PageContentMeta = {
        ...page,
        sourceOrder,
        absolutePath,
        frontmatter: parsed.frontmatter,
        h1: parsed.h1,
        itemMeta,
        displayText,
      }

      return result
    })
  )

  const hiddenPagesCount = mapped.filter(
    (page) => !page.itemMeta.visible
  ).length
  if (useCache) {
    pruneContentCache(activeCacheKeys)
  }

  return {
    pages: mapped,
    stats: {
      pagesCount: mapped.length,
      hiddenPagesCount,
      inlineContentCount,
      dynamicTemplateFallbackCount,
      missingTemplateCount,
    },
  }
}

export function formatContentMetaStats(stats: ContentMetaStats) {
  return `meta pages=${stats.pagesCount}, hidden=${stats.hiddenPagesCount}, inline=${stats.inlineContentCount}, fallback=${stats.dynamicTemplateFallbackCount}, missingTemplate=${stats.missingTemplateCount}`
}