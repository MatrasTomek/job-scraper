// KONFIGURACJA - skopiuj jako config.js i dostosuj do swoich potrzeb

export const CONFIG = {
  // 🔍 Słowa kluczowe do wyszukiwania
  keywords: [
    'angular',
    'react',
    'typescript',
    'frontend developer'
  ],

  // 💰 Minimalny budżet (dla platform które to pokazują)
  minBudget: 50,

  // 📁 Plik wyjściowy
  outputFile: './jobs.json',

  // 🌐 User Agent
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',

  // ⏱️ Timeout dla żądań (ms)
  timeout: 10000,

  // 🔒 Opcje logowania
  debug: false,
  verbose: true,

  // 📧 Opcjonalne powiadomienia (Discord/Email)
  notifications: {
    enabled: false,
    discordWebhook: '', // Wklej URL z Discord
    minJobsToNotify: 5
  },

  // 📊 Filtrowanie wyników
  filters: {
    minPrice: 0,
    onlyWithBudget: false,
    excludeKeywords: ['beginner', 'low budget']
  }
};

export default CONFIG;
