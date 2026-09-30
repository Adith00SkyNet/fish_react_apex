import type { Product } from '../types/product'

export type ParsedRow = { emoji: string; nameMl: string; nameEn: string; price: number; unit: string; matchedProductId: number | null }

// Matches lines like: *🦪 കല്ലുമ്മേക്കായ = 750/500gm*
const PRICE_LINE = /\*\s*(\p{Emoji_Presentation}|\p{Emoji}️)?\s*([ഀ-ൿ\s]+?)\s*=\s*(\d+(?:\.\d+)?)\s*\/\s*(\w+)\s*\*/u

function matchProduct(nameMl: string, nameEn: string, catalog: Product[]): number | null {
  const normalizedMl = nameMl.trim()
  const normalizedEn = nameEn.trim().toLowerCase()
  const match = catalog.find((product) => product.malayalam.trim() === normalizedMl || product.name.trim().toLowerCase() === normalizedEn)
  return match?.id ?? null
}

export function parsePriceListText(rawText: string, catalog: Product[] = []): ParsedRow[] {
  const lines = rawText.split('\n').map((line) => line.trim()).filter(Boolean)
  const rows: ParsedRow[] = []

  for (let i = 0; i < lines.length; i += 1) {
    const priceMatch = lines[i].match(PRICE_LINE)
    if (!priceMatch) continue
    const [, emoji = '', nameMl, price, unit] = priceMatch
    const englishLine = lines[i + 1] ?? ''
    const nameEn = englishLine.replace(/\*/g, '').trim()
    rows.push({
      emoji: emoji.trim(),
      nameMl: nameMl.trim(),
      nameEn,
      price: Number(price),
      unit,
      matchedProductId: matchProduct(nameMl, nameEn, catalog),
    })
    if (englishLine) i += 1
  }

  return rows
}
