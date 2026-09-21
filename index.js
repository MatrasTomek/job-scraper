import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Domyślna konfiguracja (używana gdy brak pliku config.js)
const DEFAULT_CONFIG = {
  keywords: ['angular', 'react', 'frontend'],
  minBudget: 50,
  outputFile: './jobs.json',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  timeout: 10000,
  debug: false,
  verbose: true,
  filters: {
    minPrice: 0,
    onlyWithBudget: false,
    excludeKeywords: []
  }
};

// Wczytaj config.js jeśli istnieje (patrz config.example.js)
let userConfig = {};
try {
  const configPath = path.join(__dirname, 'config.js');
  if (fs.existsSync(configPath)) {
    const mod = await import(pathToFileURL(configPath).href);
    userConfig = mod.CONFIG || mod.default || {};
    console.log('⚙️  Wczytano ustawienia z config.js');
  }
} catch (err) {
  console.log(`⚠️  Nie udało się wczytać config.js: ${err.message}`);
}

const CONFIG = {
  ...DEFAULT_CONFIG,
  ...userConfig,
  filters: { ...DEFAULT_CONFIG.filters, ...(userConfig.filters || {}) },
  notifications: { ...(DEFAULT_CONFIG.notifications || {}), ...(userConfig.notifications || {}) }
};

// Wyciąga pierwszą liczbę z tekstu typu "$153", "8000 - 12000 PLN" itp.
function extractNumericValue(str) {
  if (!str) return null;
  const match = String(str).replace(/\s/g, '').match(/[\d.,]+/);
  if (!match) return null;
  const normalized = match[0].replace(/,/g, '');
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? null : num;
}

class JobScraper {
  constructor(config = {}) {
    this.config = { ...CONFIG, ...config };
    this.jobs = [];
    this.errors = [];
    this.duration = null;
  }

  async scrapeUpwork() {
    console.log('📍 Ściąganie Upwork...');
    const before = this.jobs.length;
    try {
      for (const keyword of this.config.keywords) {
        const url = `https://www.upwork.com/nx/search/jobs?q=${keyword}&sort=recency`;

        const response = await axios.get(url, {
          headers: { 'User-Agent': this.config.userAgent },
          timeout: this.config.timeout
        });

        const $ = cheerio.load(response.data);

        $('[data-test="JobCard"]').each((i, el) => {
          const title = $(el).find('[data-test="JobTitle"]')?.text()?.trim();
          const description = $(el).find('[data-test="JobDescription"]')?.text()?.slice(0, 200)?.trim();
          const budget = $(el).find('[data-test="BudgetAmount"]')?.text()?.trim();
          const jobLink = $(el).find('a')?.attr('href');

          if (title && budget) {
            this.jobs.push({
              platform: 'Upwork',
              title,
              description,
              budget,
              link: jobLink ? `https://www.upwork.com${jobLink}` : '',
              keyword,
              scrapedAt: new Date().toISOString()
            });
          }
        });
      }
      console.log(`✅ Znaleziono ${this.jobs.length - before} ofert na Upwork`);
    } catch (error) {
      // Upwork zwraca stronę "Challenge" (403) dla żądań bez przeglądarki —
      // samo axios+cheerio tego nie ominie, potrzebny byłby headless browser lub oficjalne API.
      const isBotWall = error.response?.status === 403;
      this.errors.push({
        platform: 'Upwork',
        error: error.message,
        hint: isBotWall ? 'Upwork blokuje żądania botów (ochrona anty-scrapingowa) — wymaga headless browsera lub API.' : undefined
      });
      console.log(`⚠️  Błąd Upwork: ${error.message}${isBotWall ? ' (blokada anty-bot)' : ''}`);
    }
  }

  async scrapeFreelancer() {
    console.log('📍 Ściąganie Freelancer.com...');
    const before = this.jobs.length;
    try {
      for (const keyword of this.config.keywords) {
        const url = `https://www.freelancer.com/jobs/${keyword}/?sort=time-entered,desc`;

        const response = await axios.get(url, {
          headers: { 'User-Agent': this.config.userAgent },
          timeout: this.config.timeout
        });

        const $ = cheerio.load(response.data);

        $('.JobSearchCard-item').each((i, el) => {
          const titleEl = $(el).find('.JobSearchCard-primary-heading-link');
          const title = titleEl.text()?.trim();
          const description = $(el).find('.JobSearchCard-primary-description')?.text()?.trim()?.slice(0, 200);
          const budget = $(el).find('.JobSearchCard-primary-price')?.text()?.replace(/\s+/g, ' ')?.trim();
          const jobLink = titleEl.attr('href');

          if (title) {
            this.jobs.push({
              platform: 'Freelancer.com',
              title,
              description: description || '',
              budget: budget || 'N/A',
              link: jobLink ? `https://www.freelancer.com${jobLink}` : '',
              keyword,
              scrapedAt: new Date().toISOString()
            });
          }
        });
      }
      console.log(`✅ Znaleziono ${this.jobs.length - before} ofert na Freelancer`);
    } catch (error) {
      this.errors.push({
        platform: 'Freelancer.com',
        error: error.message
      });
      console.log(`⚠️  Błąd Freelancer: ${error.message}`);
    }
  }

  async scrapePracujPl() {
    console.log('📍 Ściąganie Pracuj.pl...');
    const before = this.jobs.length;
    try {
      for (const keyword of this.config.keywords) {
        const url = `https://www.pracuj.pl/praca/${keyword}`;

        const response = await axios.get(url, {
          headers: { 'User-Agent': this.config.userAgent },
          timeout: this.config.timeout
        });

        const $ = cheerio.load(response.data);

        // Pracuj.pl to aplikacja Next.js — oferty nie są w statycznym HTML,
        // tylko w danych __NEXT_DATA__ dołączonych do strony.
        const nextDataRaw = $('#__NEXT_DATA__').html();
        if (!nextDataRaw) {
          throw new Error('Nie znaleziono __NEXT_DATA__ na stronie Pracuj.pl (struktura strony mogła się zmienić)');
        }

        const nextData = JSON.parse(nextDataRaw);
        const queries = nextData?.props?.pageProps?.dehydratedState?.queries || [];

        for (const query of queries) {
          const groupedOffers = query?.state?.data?.groupedOffers;
          if (!Array.isArray(groupedOffers)) continue;

          for (const offer of groupedOffers) {
            const title = offer.jobTitle?.trim();
            if (!title) continue;

            const firstOffer = offer.offers?.[0];

            this.jobs.push({
              platform: 'Pracuj.pl',
              title,
              company: offer.companyName || '',
              description: offer.jobDescription?.slice(0, 200)?.trim() || '',
              budget: offer.salaryDisplayText || 'N/A',
              location: firstOffer?.displayWorkplace || '',
              link: firstOffer?.offerAbsoluteUri || '',
              keyword,
              scrapedAt: new Date().toISOString()
            });
          }
        }
      }
      console.log(`✅ Znaleziono ${this.jobs.length - before} ofert na Pracuj.pl`);
    } catch (error) {
      this.errors.push({
        platform: 'Pracuj.pl',
        error: error.message
      });
      console.log(`⚠️  Błąd Pracuj.pl: ${error.message}`);
    }
  }

  async scrapeOLX() {
    console.log('📍 Ściąganie OLX...');
    const before = this.jobs.length;
    // OLX serwuje listing wyłącznie po wykonaniu JS (React) i odrzuca zwykłe żądania
    // axios/cheerio (403/404), dlatego tu używamy prawdziwej przeglądarki (Playwright).
    // Sam URL też się zmienił: kategoria jest teraz segmentem ścieżki, nie ?category=.
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ userAgent: this.config.userAgent, locale: 'pl-PL' });

      for (const keyword of this.config.keywords) {
        const url = `https://www.olx.pl/uslugi/q-${encodeURIComponent(keyword)}/`;
        const page = await context.newPage();

        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeout * 3 });
          await page.locator('[data-cy="l-card"]').first().waitFor({ timeout: 10000 }).catch(() => {});

          const cards = await page.locator('[data-cy="l-card"]').evaluateAll(nodes =>
            nodes.map(node => {
              // innerText (nie textContent!) — karty OLX mają wstrzyknięte <style> (CSS-in-JS)
              // jako dzieci elementów; textContent zgarnia też ich treść, innerText respektuje
              // renderowanie i poprawnie je pomija.
              const titleEl = node.querySelector('[data-testid="ad-card-title"]');
              const linkEl = titleEl?.querySelector('a') || node.querySelector('a[href]');
              // Kontener tytułu bywa zawiera dodatkowy zagnieżdżony "badge" z ceną —
              // bierzemy tylko pierwszą linię tekstu, żeby cena nie dokleiła się do tytułu.
              const rawTitle = titleEl?.innerText || node.querySelector('h4, h6')?.innerText || '';
              return {
                title: rawTitle.split('\n')[0]?.trim() || '',
                price: node.querySelector('[data-testid="ad-price"]')?.innerText?.trim() || '',
                location: node.querySelector('[data-testid="location-date"]')?.innerText?.trim() || '',
                href: linkEl?.getAttribute('href') || ''
              };
            })
          );

          for (const card of cards) {
            if (!card.title) continue;
            // OLX dopełnia wyniki "podobnymi ogłoszeniami" niezwiązanymi ze słowem kluczowym,
            // gdy w kategorii usług brakuje trafień dla niszowej frazy (np. "angular") —
            // odsiewamy tytuły, które w ogóle nie zawierają szukanego słowa.
            if (!card.title.toLowerCase().includes(keyword.toLowerCase())) continue;

            this.jobs.push({
              platform: 'OLX',
              title: card.title,
              location: card.location || '',
              price: card.price || 'N/A',
              link: card.href ? new URL(card.href, 'https://www.olx.pl').href : '',
              keyword,
              scrapedAt: new Date().toISOString()
            });
          }
        } finally {
          await page.close();
        }
      }
      console.log(`✅ Znaleziono ${this.jobs.length - before} ofert na OLX`);
    } catch (error) {
      this.errors.push({ platform: 'OLX', error: error.message });
      console.log(`⚠️  Błąd OLX: ${error.message}`);
    } finally {
      if (browser) await browser.close();
    }
  }

  applyFilters(jobs) {
    const filters = this.config.filters || {};
    const excludeKeywords = (filters.excludeKeywords || []).map(k => k.toLowerCase());

    return jobs.filter(job => {
      const budgetText = job.budget ?? job.price;

      if (filters.onlyWithBudget && (!budgetText || budgetText === 'N/A')) {
        return false;
      }

      if (filters.minPrice) {
        const numericValue = extractNumericValue(budgetText);
        // Jeśli nie da się wyciągnąć liczby z budżetu, nie odrzucamy oferty —
        // po prostu nie wiemy, czy spełnia próg.
        if (numericValue !== null && numericValue < filters.minPrice) {
          return false;
        }
      }

      if (excludeKeywords.length) {
        const haystack = `${job.title} ${job.description || ''}`.toLowerCase();
        if (excludeKeywords.some(k => haystack.includes(k))) {
          return false;
        }
      }

      return true;
    });
  }

  async scrapeAll() {
    console.log('\n🚀 Rozpoczynam ściąganie ofert...\n');

    const startTime = Date.now();

    // Ściągamy sekwencyjnie
    await this.scrapeUpwork();
    await this.scrapeFreelancer();
    await this.scrapePracujPl();
    await this.scrapeOLX();

    const totalFound = this.jobs.length;
    this.jobs = this.applyFilters(this.jobs);
    const filteredOut = totalFound - this.jobs.length;

    this.duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Gotowe! Czas: ${this.duration}s`);
    console.log(`📊 Łącznie znaleziono: ${totalFound} ofert${filteredOut ? ` (odfiltrowano: ${filteredOut})` : ''}`);
    console.log(`📊 Po filtrach: ${this.jobs.length} ofert`);
    if (this.errors.length > 0) {
      console.log(`⚠️  Błędy: ${this.errors.length}`);
    }
    console.log('='.repeat(50) + '\n');

    return this.getResults();
  }

  getResults() {
    return {
      summary: {
        totalJobs: this.jobs.length,
        platforms: [...new Set(this.jobs.map(j => j.platform))],
        scrapedAt: new Date().toISOString(),
        durationSeconds: this.duration !== null ? Number(this.duration) : null
      },
      jobs: this.jobs,
      errors: this.errors
    };
  }

  async saveToFile(filename = this.config.outputFile) {
    const results = this.getResults();
    fs.writeFileSync(filename, JSON.stringify(results, null, 2), 'utf8');
    console.log(`💾 Zapisano do: ${path.resolve(filename)}`);
    return filename;
  }
}

// Główny kod
async function main() {
  const scraper = new JobScraper();

  const results = await scraper.scrapeAll();
  await scraper.saveToFile();

  // Wyświetl próbkę wyników
  console.log('\n📋 Pierwsze 3 oferty:');
  console.log(JSON.stringify(results.jobs.slice(0, 3), null, 2));
}

main().catch(console.error);

export { JobScraper };
