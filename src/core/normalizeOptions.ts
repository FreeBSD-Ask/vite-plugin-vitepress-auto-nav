import type { AutoNavPluginOptions } from '../types/plugin'
import type { Item } from '../types/public'

function safeCompare(
  compareFn: (a: Item, b: Item, frontmatterKeyPrefix?: string) => number
): (a: Item, b: Item, frontmatterKeyPrefix?: string) => number {
  return (a, b, prefix) => {
    try {
      const result = compareFn(a, b, prefix)
      if (typeof result === 'number' && !Number.isNaN(result)) {
        return result
      }
      return 0
    } catch {
      return 0
    }
  }
}

export function normalizeOptions(options: AutoNavPluginOptions = {}) {
  const include = !options.include
    ? undefined
    : Array.isArray(options.include)
      ? options.include
      : [options.include]

  const exclude = !options.exclude
    ? undefined
    : Array.isArray(options.exclude)
      ? options.exclude
      : [options.exclude]

  const standaloneIndex = options.standaloneIndex ?? false

  const overrides: Record<
    string,
    Required<{ visible: boolean; preferArticleTitle: boolean }> & {
      order?: number
      displayName?: string
      collapsed?: boolean
    }
  > = {}

  for (const key of Object.keys(options.overrides ?? {})) {
    const override = options.overrides?.[key]
    if (!override) continue
    overrides[key] = {
      visible: override.visible ?? true,
      order: override.order,
      displayName: override.displayName,
      collapsed: override.collapsed,
      preferArticleTitle: override.preferArticleTitle ?? false,
    }
  }

  const frontmatterKeyPrefix = options.frontmatterKeyPrefix ?? ''

  const defaultSort = (a: Item, b: Item) => {
    const orderA = a.options.order ?? a.index
    const orderB = b.options.order ?? b.index
    return orderA - orderB
  }

  const sorter = options.sorter ? safeCompare(options.sorter) : defaultSort

  const preferArticleTitle = options.preferArticleTitle ?? false

  return {
    include,
    exclude,
    standaloneIndex,
    overrides,
    frontmatterKeyPrefix,
    sorter,
    preferArticleTitle,
    dev: options.dev,
  }
}
