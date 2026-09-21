# 🚀 Job Scraper - Automatyczne Ściąganie Ofert Pracy

Aplikacja Node.js do automatycznego ściągania ofert pracy z wielu platform bez logowania.

## 📋 Obsługiwane platformy

- ✅ **Upwork** - remote prace
- ✅ **Freelancer.com** - projekty freelancerskie
- ✅ **Pracuj.pl** - polskie oferty pracy
- ✅ **OLX** - ogłoszenia usług IT

## 🎯 Funkcje

- 🔄 Jednorazowe ściąganie lub automatyczne co 30 minut
- 🎯 Filtrowanie po słowach kluczowych (Angular, React, etc.)
- 📁 Zapis wyników do JSON
- 📊 Archiwizacja historii
- 🔒 Bez logowania - nie narusza ToS
- ⚡ Szybkie - asynchroniczne żądania

## 📦 Instalacja

### 1. Klonuj lub skopiuj folder

```bash
cd job-scraper
```

### 2. Zainstaluj zależności

```bash
npm install
```

## 🚀 Użycie

### Jednorazowe ściąganie

```bash
npm start
```

Wynik pojawi się w pliku `jobs.json`

### Automatyczne (co 30 minut)

```bash
npm run schedule
```

Aplikacja będzie:
- Ściągać oferty co 30 minut
- Zapisywać do `jobs.json`
- Archiwizować wyniki w folderze `./archive`

## ⚙️ Konfiguracja

1. Skopiuj `config.example.js` na `config.js`:
```bash
cp config.example.js config.js
```

2. Edytuj `config.js`:
```javascript
export const CONFIG = {
  keywords: ['angular', 'react', 'typescript'],  // Twoje słowa kluczowe
  minBudget: 50,                                  // Minimalny budżet
  outputFile: './jobs.json',                      // Plik wyjściowy
  timeout: 10000                                  // Timeout (ms)
};
```

## 📊 Format wyjścia (JSON)

```json
{
  "summary": {
    "totalJobs": 45,
    "platforms": ["Upwork", "Freelancer.com", "Pracuj.pl"],
    "scrapedAt": "2026-09-21T16:52:00.000Z"
  },
  "jobs": [
    {
      "platform": "Upwork",
      "title": "Angular Developer Needed",
      "description": "We need experienced Angular developer...",
      "budget": "$5000-$10000",
      "link": "https://www.upwork.com/jobs/...",
      "keyword": "angular",
      "scrapedAt": "2026-09-21T16:52:00.000Z"
    },
    // ... więcej ofert
  ],
  "errors": []
}
```

## 🔧 Zaawansowane

### Zmiana częstotliwości (schedule.js)

```javascript
// Co godzinę
const SCHEDULE = '0 * * * *';

// Co 30 minut
const SCHEDULE = '*/30 * * * *';

// Co 15 minut
const SCHEDULE = '*/15 * * * *';
```

### Discord notifications

1. Utwórz Webhook na serwerze Discord
2. Wklej URL do `config.js`:
```javascript
notifications: {
  enabled: true,
  discordWebhook: 'https://discord.com/api/webhooks/...'
}
```

### Filtrowanie wyników

```javascript
filters: {
  minPrice: 1000,                    // Minimum cena
  onlyWithBudget: true,              // Tylko z budżetem
  excludeKeywords: ['beginner']      // Wyklucz słowa
}
```

## 📁 Struktura projektu

```
job-scraper/
├── index.js                 # Main scraper
├── schedule.js             # Scheduler (cron)
├── config.example.js       # Przykład konfiguracji
├── config.js              # Twoja konfiguracja (git ignored)
├── package.json           # Zależności
├── jobs.json             # Bieżące oferty
├── archive/              # Historia (auto-tworzona)
└── README.md            # Ten plik
```

## ⚡ Performance

- Upwork: ~3-5s
- Freelancer: ~3-5s  
- Pracuj.pl: ~2-3s
- OLX: ~2-3s
- **Razem: ~10-15s** za pełne skanowanie

## 🆘 Troubleshooting

### "Cannot find module 'axios'"
```bash
npm install
```

### Żadne oferty się nie ściągają
- Sprawdź internet
- Może ulegać zmianom selektory CSS - śledź zmiany na stronach
- Spróbuj `npm run schedule` do debugowania

### Zbyt wiele błędów
- Aplikacja respectuje ratelimit i nie powinna być banowana
- Jeśli będzie problem, spróbuj zwiększyć timeout w config.js

## 📝 Legalność

- ✅ Ściąganie publicznych danych (bez logowania)
- ✅ Zwyczajowe użycie do szukania pracy
- ⚠️ Nie używaj do массового spamowania
- ⚠️ Przestrzegaj ToS każdej platformy

## 🤝 Wsparcie

Problemy? Sprawdź:
1. Czy Node.js jest zainstalowany (`node -v`)
2. Czy są zależności (`npm install`)
3. Czy selektor CSS nie zmienił się na platformie
4. Czy internet działa

## 📜 Licencja

MIT - możesz używać i modyfikować swobodnie

---

**Szybki start:**
```bash
npm install && npm start
```

Wyniki w `jobs.json` ✅
