import cron from 'node-cron';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Uruchamia scraper co godzinę i dodaje wyniki do archiwum
const HOUR = '0 * * * *'; // Co godzinę o :00
const EVERY_30_MIN = '*/30 * * * *'; // Co 30 minut

console.log('⏰ Scheduler uruchomiony');
console.log('📅 Następne uruchomienie: za kilka sekund\n');

// Uruchom scraper co 30 minut
cron.schedule(EVERY_30_MIN, () => {
  const timestamp = new Date().toLocaleString('pl-PL');
  console.log(`\n🔄 [${timestamp}] Uruchamiam ściąganie...\n`);

  exec('node index.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Błąd: ${error.message}`);
      return;
    }
    console.log(stdout);

    // Archiwizuj wynik
    if (fs.existsSync('./jobs.json')) {
      const data = JSON.parse(fs.readFileSync('./jobs.json', 'utf8'));
      const archiveDir = './archive';

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
});

// Możesz też uruchomić teraz
exec('node index.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Błąd: ${error.message}`);
    return;
  }
  console.log(stdout);
});

// Keep process alive
console.log('\n💡 Scheduler działa. Naciśnij Ctrl+C aby zatrzymać.\n');
process.on('SIGINT', () => {
  console.log('\n👋 Zamykam scheduler...');
  process.exit(0);
});
