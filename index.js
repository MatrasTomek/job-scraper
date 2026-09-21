import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Konfiguracja
const CONFIG = {
  keywords: ['angular', 'react'],
  minBudget: 50,
  outputFile: './jobs.json',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

class JobScraper {
  constructor(config = {}) {
    this.config = { ...CONFIG, ...config };
    this.jobs = [];
    this.errors = [];
  }

  async scrapeUpwork() {
    console.log('📍 Ściąganie Upwork...');
    try {
      for (const keyword of this.config.keywords) {
        const url = `https://www.upwork.com/nx/search/jobs?q=${keyword}&sort=recency`;

        const response = await axios.get(url, {
          headers: { 'User-Agent': this.config.userAgent },
          timeout: 10000
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
      console.log(`✅ Znaleziono ${this.jobs.length} ofert na Upwork`);
    } catch (error) {
      this.errors.push({
        platform: 'Upwork',
        error: error.message
      });
      console.log(`⚠️  Błąd Upwork: ${error.message}`);
    }
  }

  async scrapeFreelancer() {
    console.log('📍 Ściąganie Freelancer.com...');
    try {
      for (const keyword of this.config.keywords) {
        const url = `https://www.freelancer.com/jobs/${keyword}/?sort=time-entered,desc`;

        const response = await axios.get(url, {
          headers: { 'User-Agent': this.config.userAgent },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);

        $('[data-qa="freelancer-project-card"]').each((i, el) => {
          const title = $(el).find('.project-info h4, .project-info a')?.text()?.trim();
          const description = $(el).find('.project-description')?.text()?.slice(0, 200)?.trim();
          const budget = $(el).find('.bid-range, .project-type')?.text()?.trim();
          const jobLink = $(el).find('a')?.attr('href');

          if (title) {
            this.jobs.push({
              platform: 'Freelancer.com',
              title,
              description,
              budget: budget || 'N/A',
              link: jobLink ? `https://www.freelancer.com${jobLink}` : '',
              keyword,
              scrapedAt: new Date().toISOString()
            });
          }
        });
      }
      console.log(`✅ Znaleziono ofert na Freelancer`);
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
    try {
      for (const keyword of this.config.keywords) {
        const url = `https://www.pracuj.pl/praca/${keyword}`;

        const response = await axios.get(url, {
          headers: { 'User-Agent': this.config.userAgent },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);

        $('[data-test="jobCard"]').each((i, el) => {
          const titleEl = $(el).find('h2, .jobTitle, [data-test="jobCardTitle"]');
          const title = titleEl.text()?.trim();
          const companyEl = $(el).find('.company, [data-test="companyName"]');
          const company = companyEl.text()?.trim();
          const salaryEl = $(el).find('.salary, [data-test="salary"]');
          const salary = salaryEl.text()?.trim();
          const jobLink = $(el).find('a')?.attr('href');

          if (title) {
            this.jobs.push({
              platform: 'Pracuj.pl',
              title,
              company: company || '',
              budget: salary || 'N/A',
              link: jobLink || '',
              keyword,
              scrapedAt: new Date().toISOString()
            });
          }
        });
      }
      console.log(`✅ Znaleziono ofert na Pracuj.pl`);
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
    try {
      for (const keyword of this.config.keywords) {
        const url = `https://www.olx.pl/oferty/q-${keyword}/?category=uslugi`;

        const response = await axios.get(url, {
          headers: { 'User-Agent': this.config.userAgent },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);

        $('[data-testid="listing-ad"]').each((i, el) => {
          const title = $(el).find('a h2, a h3, h2, h3')?.text()?.trim();
          const price = $(el).find('[data-testid="listing-price"]')?.text()?.trim();
          const location = $(el).find('[data-testid="listing-location"]')?.text()?.trim();
          const jobLink = $(el).find('a')?.attr('href');

          if (title) {
            this.jobs.push({
              platform: 'OLX',
              title,
              location: location || '',
              price: price || 'N/A',
              link: jobLink || '',
              keyword,
              scrapedAt: new Date().toISOString()
            });
          }
        });
      }
      console.log(`✅ Znaleziono ofert na OLX`);
    } catch (error) {
      this.errors.push({
        platform: 'OLX',
        error: error.message
      });
      console.log(`⚠️  Błąd OLX: ${error.message}`);
    }
  }

  async scrapeAll() {
    console.log('\n🚀 Rozpoczynam ściąganie ofert...\n');

    const startTime = Date.now();

    // Ściągamy sekwencyjnie
    await this.scrapeUpwork();
    await this.scrapeFreelancer();
    await this.scrapePracujPl();
    await this.scrapeOLX();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Gotowe! Ączas: ${duration}s`);
    console.log(`📊 Łącznie znaleziono: ${this.jobs.length} ofert`);
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
        duration: 'check timestamps'
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
  // Możesz zmienić słowa kluczowe tutaj
  const scraper = new JobScraper({
    keywords: ['angular', 'react', 'frontend'],
    outputFile: './jobs.json'
  });

  const results = await scraper.scrapeAll();
  await scraper.saveToFile();

  // Wyświetl próbkę wyników
  console.log('\n📋 Pierwsze 3 oferty:');
  console.log(JSON.stringify(results.jobs.slice(0, 3), null, 2));
}

main().catch(console.error);
