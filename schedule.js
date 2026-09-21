import cron from 'node-cron';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jobsFile = path.join(__dirname, 'jobs.json');
const archiveDir = path.join(__dirname, 'archive');

// Uruchamia scraper co godzinę i dodaje wyniki do archiwum
const HOUR = '0 * * * *'; // Co godzinę o :00
const EVERY_30_MIN = '*/30 * * * *'; // Co 30 minut

console.log('⏰ Scheduler uruchomiony');
console.log('📅 Następne uruchomienie: za kilka sekund\n');

function runScraperAndArchive() {
  // Uruchamiamy zawsze z katalogu tego skryptu — niezależnie od tego,
  // z jakiego katalogu wywołano `node schedule.js`.
  exec('node index.js', { cwd: __dirname }, (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    if (error) {
      console.error(`❌ Błąd: ${error.message}`);
      return;
    }

    // Archiwizuj wynik
    if (fs.existsSync(jobsFile)) {
      const data = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));

      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir);
      }

      const archiveFile = path.join(
        archiveDir,
        `jobs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      );

      fs.writeFileSync(archiveFile, JSON.stringify(data, null, 2));
      console.log(`📦 Zarchiwizowano: ${archiveFile}`);
    }
  });
}

// Uruchom scraper co 30 minut
cron.schedule(EVERY_30_MIN, () => {
  const timestamp = new Date().toLocaleString('pl-PL');
  console.log(`\n🔄 [${timestamp}] Uruchamiam ściąganie...\n`);
  runScraperAndArchive();
});

// Uruchom też od razu przy starcie (i zarchiwizuj ten pierwszy wynik)
runScraperAndArchive();

// Keep process alive
console.log('\n💡 Scheduler działa. Naciśnij Ctrl+C aby zatrzymać.\n');
process.on('SIGINT', () => {
  console.log('\n👋 Zamykam scheduler...');
  process.exit(0);
});
