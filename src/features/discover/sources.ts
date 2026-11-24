import type { Section } from '@/types'

/**
 * How a launchpad link is built:
 * - query:  the search text is placed where {q} is.
 * - domain: a website address typed by the person is cleaned to a plain
 *           domain (example.com) and placed where {domain} is.
 * - link:   a fixed page that needs no input.
 */
export type SourceKind = 'query' | 'domain' | 'link'

export interface DiscoverSource {
  id: string
  name: string
  /** One short line on what the source is good for. */
  note: string
  kind: SourceKind
  url: string
}

export interface ResearchType {
  section: Exclude<Section, 'general'>
  summary: string
  queryLabel: string
  queryPlaceholder: string
  sources: DiscoverSource[]
  /** Directory categories whose tools support this kind of research. */
  categoryIds: string[]
}

const GOOGLE = 'https://www.google.com/search?q={q}'
const TRENDS = 'https://trends.google.com/trends/explore?q={q}'
const REDDIT = 'https://www.reddit.com/search/?q={q}'
const YOUTUBE = 'https://www.youtube.com/results?search_query={q}'
const AMAZON = 'https://www.amazon.com/s?k={q}'
const META_ADS =
  'https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q={q}&search_type=keyword_unordered'

export const RESEARCH_TYPES: ResearchType[] = [
  {
    section: 'market',
    summary: 'Spot demand, trends and opportunities before you commit to an idea.',
    queryLabel: 'Topic or niche',
    queryPlaceholder: 'e.g. standing desks',
    categoryIds: [
      'market-trend-research',
      'business-industry-intelligence',
      'ai-emerging-search-intelligence',
    ],
    sources: [
      { id: 'google-trends', name: 'Google Trends', note: 'How interest in the topic changes over time.', kind: 'query', url: TRENDS },
      { id: 'google-news', name: 'Google News', note: 'Recent coverage and announcements.', kind: 'query', url: 'https://news.google.com/search?q={q}' },
      { id: 'reddit', name: 'Reddit', note: 'What communities say about the topic.', kind: 'query', url: REDDIT },
      { id: 'youtube', name: 'YouTube', note: 'How much content exists and how it performs.', kind: 'query', url: YOUTUBE },
      { id: 'google', name: 'Google search', note: 'Who already serves this market.', kind: 'query', url: GOOGLE },
      { id: 'pinterest-trends', name: 'Pinterest Trends', note: 'Rising searches, especially for visual niches.', kind: 'link', url: 'https://trends.pinterest.com/' },
    ],
  },
  {
    section: 'competitor',
    summary: 'Study who you are up against: their reviews, ads, traffic and history.',
    queryLabel: 'Competitor name or website',
    queryPlaceholder: 'e.g. example.com',
    categoryIds: ['competitor-brand-research', 'website-traffic-intelligence'],
    sources: [
      { id: 'google', name: 'Google search', note: 'How they present themselves.', kind: 'query', url: GOOGLE },
      { id: 'google-alternatives', name: 'Google: alternatives', note: 'Who gets compared with them.', kind: 'query', url: 'https://www.google.com/search?q={q}%20alternatives' },
      { id: 'google-reviews', name: 'Google: reviews', note: 'What customers say about them.', kind: 'query', url: 'https://www.google.com/search?q={q}%20reviews' },
      { id: 'meta-ads', name: 'Meta Ad Library', note: 'Ads they run on Facebook and Instagram.', kind: 'query', url: META_ADS },
      { id: 'trustpilot', name: 'Trustpilot', note: 'Public reviews of the business.', kind: 'query', url: 'https://www.trustpilot.com/search?query={q}' },
      { id: 'linkedin-companies', name: 'LinkedIn companies', note: 'Company size, people and updates.', kind: 'query', url: 'https://www.linkedin.com/search/results/companies/?keywords={q}' },
      { id: 'similarweb', name: 'Similarweb', note: 'Estimated traffic and where it comes from.', kind: 'domain', url: 'https://www.similarweb.com/website/{domain}/' },
      { id: 'builtwith', name: 'BuiltWith', note: 'The technology their website uses.', kind: 'domain', url: 'https://builtwith.com/{domain}' },
      { id: 'wayback', name: 'Wayback Machine', note: 'Older versions of their website.', kind: 'domain', url: 'https://web.archive.org/web/*/{domain}' },
    ],
  },
  {
    section: 'advertising',
    summary: 'See which ads are running, and which hooks and offers they use.',
    queryLabel: 'Brand, product or topic',
    queryPlaceholder: 'e.g. meal prep delivery',
    categoryIds: [
      'advertising-intelligence-ad-libraries',
      'landing-pages-funnel-research',
      'copywriting-persuasion-research',
    ],
    sources: [
      { id: 'meta-ads', name: 'Meta Ad Library', note: 'Active and past Facebook and Instagram ads.', kind: 'query', url: META_ADS },
      { id: 'youtube-ads', name: 'YouTube: ads', note: 'Video ads and sponsored content.', kind: 'query', url: 'https://www.youtube.com/results?search_query={q}%20ad' },
      { id: 'google-ads-transparency', name: 'Google Ads Transparency Center', note: 'Search by advertiser or website once it opens.', kind: 'link', url: 'https://adstransparency.google.com/' },
      { id: 'tiktok-top-ads', name: 'TikTok Creative Center: Top Ads', note: 'Best-performing TikTok ads by industry.', kind: 'link', url: 'https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en' },
      { id: 'linkedin-ad-library', name: 'LinkedIn Ad Library', note: 'Search LinkedIn ads once it opens.', kind: 'link', url: 'https://www.linkedin.com/ad-library/' },
    ],
  },
  {
    section: 'customer',
    summary: 'Find what real people complain about, ask for and wish existed.',
    queryLabel: 'Topic, product or audience',
    queryPlaceholder: 'e.g. freelance invoicing',
    categoryIds: ['customer-pain-points-voice-of-customer', 'audience-research-surveys'],
    sources: [
      { id: 'reddit', name: 'Reddit', note: 'Honest discussions, questions and complaints.', kind: 'query', url: REDDIT },
      { id: 'quora', name: 'Quora', note: 'Questions people ask in their own words.', kind: 'query', url: 'https://www.quora.com/search?q={q}' },
      { id: 'google-problems', name: 'Google: problems and complaints', note: 'Pages where people describe what goes wrong.', kind: 'query', url: 'https://www.google.com/search?q={q}%20problems%20OR%20complaints' },
      { id: 'amazon', name: 'Amazon', note: 'Product reviews, including the critical ones.', kind: 'query', url: AMAZON },
      { id: 'x', name: 'X (Twitter)', note: 'Recent opinions and frustrations.', kind: 'query', url: 'https://x.com/search?q={q}' },
      { id: 'youtube', name: 'YouTube', note: 'Comments under videos on the topic.', kind: 'query', url: YOUTUBE },
    ],
  },
  {
    section: 'product',
    summary: 'See what already sells, how it is priced and how it is reviewed.',
    queryLabel: 'Product or niche',
    queryPlaceholder: 'e.g. budgeting spreadsheet',
    categoryIds: ['digital-product-product-research', 'affiliate-partnership-research'],
    sources: [
      { id: 'amazon', name: 'Amazon', note: 'Best sellers, prices and reviews.', kind: 'query', url: AMAZON },
      { id: 'etsy', name: 'Etsy', note: 'Handmade and digital download products.', kind: 'query', url: 'https://www.etsy.com/search?q={q}' },
      { id: 'ebay', name: 'eBay', note: 'What is listed and what it goes for.', kind: 'query', url: 'https://www.ebay.com/sch/i.html?_nkw={q}' },
      { id: 'aliexpress', name: 'AliExpress', note: 'Sourcing options and wholesale prices.', kind: 'query', url: 'https://www.aliexpress.com/wholesale?SearchText={q}' },
      { id: 'google-shopping', name: 'Google Shopping', note: 'Prices across many sellers.', kind: 'query', url: 'https://www.google.com/search?tbm=shop&q={q}' },
      { id: 'gumroad', name: 'Gumroad', note: 'Digital products from independent creators.', kind: 'query', url: 'https://gumroad.com/discover?query={q}' },
      { id: 'udemy', name: 'Udemy', note: 'Online courses on the topic.', kind: 'query', url: 'https://www.udemy.com/courses/search/?q={q}' },
      { id: 'product-hunt', name: 'Product Hunt', note: 'New software and app launches.', kind: 'query', url: 'https://www.producthunt.com/search?q={q}' },
    ],
  },
  {
    section: 'keyword',
    summary: 'Check what people search for and what ranks today.',
    queryLabel: 'Keyword or phrase',
    queryPlaceholder: 'e.g. best budget laptop',
    categoryIds: ['seo-keyword-research', 'content-publishing-research'],
    sources: [
      { id: 'google', name: 'Google search', note: 'The results page, related searches and questions.', kind: 'query', url: GOOGLE },
      { id: 'google-trends', name: 'Google Trends', note: 'Popularity over time and by region.', kind: 'query', url: TRENDS },
      { id: 'bing', name: 'Bing', note: 'A second look at who ranks.', kind: 'query', url: 'https://www.bing.com/search?q={q}' },
      { id: 'youtube', name: 'YouTube', note: 'Video search results and suggestions.', kind: 'query', url: YOUTUBE },
      { id: 'amazon', name: 'Amazon', note: 'What shoppers type into the search box.', kind: 'query', url: AMAZON },
      { id: 'keyword-planner', name: 'Google Keyword Planner', note: 'Search volumes. Needs a free Google Ads account.', kind: 'link', url: 'https://ads.google.com/home/tools/keyword-planner/' },
      { id: 'search-console', name: 'Google Search Console', note: 'Your own site’s search data.', kind: 'link', url: 'https://search.google.com/search-console' },
      { id: 'answer-the-public', name: 'AnswerThePublic', note: 'Questions people ask about a topic.', kind: 'link', url: 'https://answerthepublic.com/' },
    ],
  },
]

export function getResearchType(section: string | undefined): ResearchType | undefined {
  return RESEARCH_TYPES.find((t) => t.section === section)
}

/**
 * Turns whatever was typed (example.com, https://www.example.com/pricing?x=1)
 * into a plain domain, or null if it does not look like a website.
 */
export function normalizeDomain(input: string): string | null {
  const text = input.trim()
  if (!text || /\s/.test(text)) return null

  let host: string
  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text)
    host = new URL(hasScheme ? text : `https://${text}`).hostname
  } catch {
    return null
  }

  host = host.toLowerCase().replace(/\.$/, '').replace(/^www\./, '')
  const labels = host.split('.')
  if (labels.length < 2 || host.length > 253) return null
  if (!labels.every((l) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(l))) return null
  const tld = labels[labels.length - 1]
  if (!/^[a-z]{2,}$/.test(tld) && !/^xn--[a-z0-9-]+$/.test(tld)) return null
  return host
}

/** The address to open for this source, or null when it needs input that is missing. */
export function buildSourceUrl(source: DiscoverSource, rawQuery: string): string | null {
  if (source.kind === 'link') return source.url
  if (source.kind === 'query') {
    const query = rawQuery.trim()
    if (!query) return null
    return source.url.replace('{q}', () => encodeURIComponent(query))
  }
  const domain = normalizeDomain(rawQuery)
  return domain ? source.url.replace('{domain}', () => domain) : null
}

/** Why a link is unavailable, for showing next to it. */
export function missingInputHint(source: DiscoverSource): string {
  return source.kind === 'domain'
    ? 'Enter a website such as example.com'
    : 'Type something above first'
}
