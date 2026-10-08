# Faza 1: Stack technologiczny i architektura

> **Status:** 🟡 czeka na akceptację autora
> **Poprzednia faza:** brak · **Następna:** [Faza 2: animacja startowa](./faza-2-animacja-startowa.md)

## Warunek ukończenia (z briefu)

Faza jest gotowa, gdy autor w pełni zaakceptuje stack i architekturę oraz gdy zostanie przedstawiona kwestia hostingu.
Docelowo strona ma działać **w koszcie samej domeny**. Jeśli to niemożliwe, trzeba przedstawić najtańsze rozwiązanie roczne:
jednorazowa opłata, **bez podpinania karty** i bez płacenia za API.

**Wynik:** wariant „tylko domena” jest możliwy. Opis w sekcji [2. Hosting i koszty](#2-hosting-i-koszty).

---

## 1. Odpowiedzi na pytania z briefu

### 1.1 Jak zrobiona jest animacja na aino.agency? three.js? Video?

**Ani video, ani three.js.** Opisy projektu (Awwwards, case study Visuelle, analiza Offscreen Canvas) mówią to samo:

- to **siatka znaków (ASCII) w czystym HTML**, przeliczana w każdej klatce. Na stronie nie ma WebGL,
- zespół napisał od zera własny mikro-framework („White”) na Vite. Ma ok. 2 kB runtime i nie używa virtual DOM,
- znaki są „punktami”, które morfują, odbijają się (prosta fizyka 2D), malują obraz i piszą tekst w czasie rzeczywistym,
- cała strona waży ok. **30 kB JS**. Inspiracją było kodowanie maszynowe lat 80. i „lo-fi” matematyka fizyki.

> ⚠️ Z mojego środowiska nie dało się otworzyć aino.agency ani craft.wild.as (blokada sieci), więc opieram się na opisach.
> Możesz to potwierdzić sam: DevTools → *Elements* (jest `<canvas>` czy wiersze tekstu?) → *Performance* (co dzieje się w jednej klatce).

**Wniosek dla nas:** to efekt proceduralny, czyli kod, nie film. Video odpada z trzech powodów: jest ciężkie, nie reaguje na klik
ani dotyk i rozmywa się na ekranach o innej rozdzielczości. Odtwarzamy **ten sam pomysł** (siatka cyfr, fizyka, morphing w zdjęcie),
ale rysujemy go na **Canvas 2D**. Przy portrecie z tysięcy znaków canvas jest wydajniejszy od tysięcy węzłów DOM, zwłaszcza na telefonach.

### 1.2 Czy potrzebuję three.js?

**Nie.** three.js to silnik scen 3D (kamery, siatki, światła). Waży dziesiątki do setek kB, a my nie mamy żadnego 3D.
Oba efekty (cyfry i migające kwadraty) są płaskie:

| Opcja | Kiedy |
|---|---|
| **Canvas 2D + własny silnik w TS** (domyślnie) | Wystarcza na kilka do kilkunastu tysięcy komórek, zero zależności |
| **OGL** (mała biblioteka WebGL, MIT) | Plan B, jeśli pomiar na telefonie da < 50 fps. Jedno wywołanie rysowania z atlasem glifów |
| three.js / React Three Fiber | Tylko gdyby kiedyś doszło prawdziwe 3D |

Silnik ma interfejs `GlyphRenderer`, więc zamiana Canvas 2D na OGL nie dotyka reszty kodu.

### 1.3 Czy potrzebuję Terraforma?

**Nie.** W rekomendowanym wariancie (Cloudflare) całą infrastrukturę opisuje plik `wrangler.jsonc` (Worker, baza D1,
domena, zmienne) plus migracje SQL w repo. To infrastruktura jako kod w zupełności wystarczająca dla jednej osoby.
Terraform miałby sens dopiero w wariancie AWS (DynamoDB + IAM) albo przy wielu środowiskach, i nawet wtedy jest opcją, nie wymogiem.

### 1.4 Gdzie za darmo tworzyć takie efekty?

Wszystko powstaje w kodzie, lokalnie (VS Code + serwer deweloperski). Darmowe narzędzia pomocnicze:

- **CodePen / StackBlitz**: szybki prototyp efektu w izolacji,
- **GSAP**: od 2025 r. w 100% darmowy, razem z dawnymi płatnymi pluginami (SplitText, ScrambleText, ...),
- **Shadertoy**: tylko jeśli pójdziemy w plan B (shader),
- **Figma (Free)**: makiety; **Squoosh**: kompresja zdjęcia do AVIF/WebP; **Photopea**: wycięcie tła i skala szarości.

### 1.5 Czy dwa repo da się hostować na jednej domenie za darmo?

**Tak, na dwa sposoby:**

1. **Subdomena:** `twojadomena.pl` → frontend, `api.twojadomena.pl` → backend. Działa na Cloudflare, Netlify i z DNS OVH.
2. **Ścieżka:** `twojadomena.pl/api/*` → backend (route Workera Cloudflare albo proxy w Netlify: `/api/* https://… 200`).

**Rekomendacja: monorepo i jeden Cloudflare Worker**, który serwuje statyczny frontend oraz `/api/*`.
Daje to jedną domenę, jeden deploy i brak problemów z CORS. Dwa repo przy jednej osobie i dwóch endpointach oznaczają
podwójne CI i ręczne pilnowanie zgodności kontraktu API. Monorepo pozwala trzymać **jeden wspólny `types.ts`** dla frontu i API.

### 1.6 OVH czy Netlify?

- **OVH:** tu kupujemy **domenę**. Hosting OVH nie jest potrzebny (zostaje jako plan B, sekcja 2.4).
- **Netlify:** konta założone po 4.09.2025 mają plan kredytowy: 300 kredytów miesięcznie, ok. 15 za każdy deploy produkcyjny,
  do tego transfer i funkcje. Po wyczerpaniu kredytów **wszystkie strony konta są pauzowane** do następnego miesiąca.
  Przy vibecodingu (dużo deployów) i ciężkich assetach to realne ryzyko.
- **Cloudflare (rekomendacja):** plan Free bez karty. Statyczne pliki bez limitu transferu, Worker 100 000 żądań dziennie,
  baza D1 5 GB. Po przekroczeniu limitu usługa zwraca błędy do północy UTC i nic nie dolicza.

---

## 2. Hosting i koszty

### 2.1 Wariant rekomendowany: „koszt = domena”

| Element | Usługa | Koszt | Karta? |
|---|---|---|---|
| Domena `.pl` | OVH | ok. **20,53 zł brutto** za 1. rok, odnowienie ok. **72,56 zł brutto/rok** ¹ | nie (przelew/PayPal ²) |
| DNS, CDN, SSL | Cloudflare Free | 0 zł | nie |
| Frontend (pliki statyczne) | Cloudflare Workers Static Assets | 0 zł, bez limitu żądań | nie |
| API (wybuchy, kontakt) | Cloudflare Worker | 0 zł (100 000 żądań/dzień) | nie |
| Baza wybuchów i zgłoszeń | Cloudflare D1 (SQLite) | 0 zł (5 GB; 5 mln odczytów i 100 tys. zapisów dziennie) | nie |
| Wysyłka e-maili z formularza | EmailJS Free | 0 zł (200 e-maili/mies., 2 szablony) | nie |
| Antyspam formularza | Cloudflare Turnstile | 0 zł | nie |
| CI/CD | GitHub Actions | 0 zł (publiczne repo; prywatne 2000 min/mies.) | nie |
| Analityka (opcjonalnie) | Cloudflare Web Analytics (bez cookies) | 0 zł | nie |

**Razem: koszt domeny.**

¹ Ceny z oferty OVH, do sprawdzenia w koszyku. Uwaga na pułapkę: odnowienie jest ok. 3,5× droższe niż pierwszy rok.
² Formy płatności bez karty do potwierdzenia w koszyku OVH.

Konfiguracja domeny: w panelu OVH zmieniamy serwery DNS (NS) na Cloudflare, co jest darmowe. Jest to wymagane,
żeby podpiąć domenę główną pod Workera.

### 2.2 DynamoDB: co z nim?

Brief: zapis wybuchu „najlepiej w darmowej wersji DynamoDB”. DynamoDB ma darmowy pakiet *Always Free* (25 GB)
i nasz ruch zmieściłby się w nim w całości. **Są jednak trzy problemy:**

- konto AWS **wymaga podpięcia ważnej karty**, nawet w planie Free. To łamie warunek tej fazy,
- konta założone od 15.07.2025 dostają plan Free na 6 miesięcy plus kredyty. Usługi *Always Free* działają dalej,
  ale trzeba pilnować przejścia na plan Paid i ustawić budżet z alertem,
- API Gateway nie jest *Always Free*, więc w tym wariancie i tak go omijamy.

**Rekomendacja: D1 jako baza domyślna.** Zapis idzie przez wzorzec Repository (`ExplosionRepository`),
więc przejście na DynamoDB to podmiana jednej klasy w Workerze: `DynamoExplosionRepository` z biblioteką `aws4fetch`.
Worker sam podpisuje żądanie (SigV4) i woła DynamoDB bezpośrednio, bez Lambdy i bez API Gateway. Frontend się nie zmienia.

> **Decyzja autora:** ☐ D1 (rekomendowane) ☐ DynamoDB (akceptuję kartę na koncie AWS)

### 2.3 Supabase?

Plan Free daje **500 MB** bazy na projekt (nie 5 GB) i **pauzuje projekt po 7 dniach bez aktywności**.
Rzadko odwiedzane portfolio „zasypia”, a API przestaje działać do ręcznego wybudzenia. Odrzucone jako baza produkcyjna.

### 2.4 Plan B: najtańsza roczna opłata jednorazowa

Na wypadek, gdyby wariant darmowy z jakiegoś powodu upadł (np. zmiana warunków Cloudflare):
**hosting współdzielony OVH z domeną w pakiecie**, ok. 8 do 11 zł brutto miesięcznie płatne z góry za rok (ok. 100 do 135 zł/rok;
w promocji rok domeny gratis, do weryfikacji w koszyku). Płatność bez karty, brak opłat za API.
Wtedy wrzucamy statyczny eksport Next przez FTP, a API to endpoint PHP z MySQL zamiast Workera i D1.
Frontend się nie zmienia, zmienia się tylko adres API.

---

## 3. Stack technologiczny

Wersje według npm z października 2026. Przy starcie projektu bierzemy najnowsze w tych liniach.

| Warstwa | Wybór | Wersja | Po co |
|---|---|---|---|
| Język | **TypeScript** (`strict`) | 6.0.x | obowiązkowy. TS 7 (natywny kompilator) dopiero, gdy obsłuży go typescript-eslint (dziś wymaga `<6.1`) |
| UI | **React** | 19.x | |
| Framework | **Next.js** (App Router, `output: 'export'`) | 16.x | routing plikowy w stylu Next, statyczny HTML każdej podstrony (SEO i podglądy linków), `next/font`, wspólny layout, który trzyma kursor i canvas przy przejściach |
| Style | **Sass (SCSS) + CSS Modules** | sass 1.x | `index.module.scss` per komponent |
| Animacje UI | **GSAP** + ScrollTrigger + SplitText + ScrambleText | 3.15 | sekwencje intro, animacje przy scrollu, „dekodowanie” tekstu |
| Płynny scroll | **Lenis** | 1.3 | zsynchronizowany z ScrollTrigger |
| Efekty (cyfry, piksele) | **własny silnik TS na Canvas 2D** | n/d | pełna kontrola, zero wagi. Plan B: **OGL** 1.x |
| Dane z API | **TanStack Query** | 5.x | mutacja „wybuchu” z ponawianiem, licznik wybuchów z cache |
| Walidacja | **Zod** | 4.x | jeden schemat dla frontu i API |
| Backend | **Cloudflare Worker** + Wrangler | 4.x | `/api/*` i serwowanie statycznego frontu |
| Baza | **Cloudflare D1** | n/d | wpisy z datą wybuchu, kopia zgłoszeń z formularza |
| E-mail | **EmailJS** | 5.x | formularz (faza 5) |
| Monorepo | **pnpm workspaces** | wersja przypięta w `packageManager` | |
| Środowisko | **Node.js 24 LTS** | | |
| Jakość | ESLint + typescript-eslint, Prettier, Stylelint (SCSS), **Vitest**, **Playwright** | | lint, testy silnika, testy e2e |
| Minigra (faza 6) | **KAPLAY** | 3001.x | następca Kaboom.js, który nie jest już rozwijany (komunikat w npm) |

**Dlaczego Next.js, a nie sam Vite:** w briefie jest struktura w stylu Next. Statyczny eksport daje gotowy HTML dla
`/doswiadczenie`, `/stack` i `/portfolio`, co pomaga w SEO i podglądach na LinkedInie. Wspólny `layout.tsx` utrzymuje kursor
przy przejściach między podstronami. Koszt: trochę więcej JS frameworka. Ciężki silnik animacji ładujemy osobno (`next/dynamic`, bez SSR).

### Czego świadomie nie używamy

| Odrzucone | Powód |
|---|---|
| **jQuery** | React zarządza DOM-em, a jQuery dubluje to i dodaje ok. 30 kB. Wszystko, co daje, mamy natywnie: `querySelector`, `fetch`, `classList` |
| **GraphQL** | Mamy 2 do 3 endpointów. REST plus wspólne typy z `packages/shared` daje to samo bez serwera schematów i klienta (Apollo/urql to 30 do 50 kB) |
| **three.js / R3F** | Brak 3D (pkt 1.2) |
| **Terraform** | `wrangler.jsonc` wystarcza (pkt 1.3) |
| **Turborepo** | Przy 3 paczkach wystarczą `pnpm -r` / `--filter`. Można dodać później bez przebudowy |
| **Tailwind** | Brief: SCSS per komponent |
| **Motion (Framer Motion)** | Dublowałby GSAP. Trzymamy jedną bibliotekę animacji |

---

## 4. Architektura

```
 Przeglądarka (desktop / telefon)
          │  https://twojadomena.pl
          ▼
 ┌──────────────────────── Cloudflare, plan Free ────────────────────────────┐
 │  Worker „cv”                                                              │
 │   ├── /*                  → Static Assets (apps/web/out)   [bez limitu]   │
 │   ├── /api/explosions     → POST zapis wybuchu, GET statystyki ─► D1      │
 │   ├── /api/contact        → Turnstile → D1 (kopia) → EmailJS   (faza 5)   │
 │   └── /api/health         → test działania                               │
 └───────────────────────────────────────────────────────────────────────────┘
 OVH: rejestracja domeny, NS wskazują na Cloudflare
```

### 4.1 Przepływ „wybuchu”

1. Użytkownik klika albo dotyka pole kwadratów. Animacja startuje **od razu** i nie czeka na sieć.
2. Hook `useExplodeMutation` (TanStack Query) wysyła `POST /api/explosions` z `{ origin: { x, y }, device }`.
3. Worker waliduje dane (Zod), sprawdza limit żądań, wykonuje `INSERT` z datą **nadaną przez serwer** (UTC, ISO 8601)
   i zwraca `{ explosion, total }`.
4. UI pokazuje np. „Wybuch #1234 · 08.10.2026, 11:32” i karty z linkami do innych CV.
5. Błąd sieci nie psuje UX: animacja i linki działają, zapis jest ponawiany do 2 razy.

### 4.2 Kontrakt API: `packages/shared/src/types.ts`

```ts
export type DeviceKind = 'mobile' | 'desktop';

export interface Point01 {
  x: number; // 0..1 względem pola pikseli
  y: number;
}

export interface ExplosionCreateRequest {
  origin: Point01;
  device: DeviceKind;
}

export interface Explosion {
  id: string;
  createdAt: string; // ISO 8601 UTC, nadawane przez serwer
  device: DeviceKind;
  origin: Point01;
}

export interface ExplosionCreateResponse {
  explosion: Explosion;
  total: number;
}

export interface ExplosionStats {
  total: number;
  today: number;
  lastAt: string | null;
}

export interface ApiError {
  error: { code: string; message: string };
}
```

Schematy Zod odpowiadające tym typom leżą obok, w `packages/shared/src/schemas.ts`. Typ kontaktu dochodzi w fazie 5.

### 4.3 Baza D1: `apps/api/migrations/0001_explosions.sql`

```sql
CREATE TABLE explosions (
  id         TEXT PRIMARY KEY,         -- crypto.randomUUID()
  created_at TEXT NOT NULL,            -- ISO 8601 UTC, nadawane w Workerze
  device     TEXT NOT NULL CHECK (device IN ('mobile', 'desktop')),
  origin_x   REAL NOT NULL,
  origin_y   REAL NOT NULL,
  country    TEXT                      -- opcjonalnie, z nagłówka Cloudflare (bez IP)
);

CREATE INDEX idx_explosions_created_at ON explosions (created_at);
```

Indeks podwaja koszt zapisu (2 zapisy wierszy na wybuch), więc darmowy limit to ok. 50 000 wybuchów dziennie. Z zapasem.

### 4.4 Bezpieczeństwo i RODO

- **Nie zapisujemy IP ani cookies.** Kraj z nagłówka Cloudflare jest zgrubny i opcjonalny.
- Limit żądań: reguła Rate Limiting w WAF Cloudflare (plan Free ma 1 regułę, do potwierdzenia przy konfiguracji)
  plus ograniczenie po stronie klienta (1 wybuch na 3 s). Chroni darmowe limity przed botami.
- Ten sam origin dla frontu i API, więc CORS nie jest potrzebny. W trybie deweloperskim dopuszczamy tylko `localhost`.
- Brak śledzenia oznacza brak banera cookies (Cloudflare Web Analytics działa bez cookies).
- Sekrety (klucze EmailJS i Turnstile) tylko jako `wrangler secret`, nigdy w repo.

---

## 5. Struktura monorepo

```
cv/
├── apps/
│   ├── web/                              # Next.js 16, statyczny eksport → out/
│   │   ├── public/
│   │   │   ├── img/portrait/             # zdjęcie: AVIF/WebP + wersja szara
│   │   │   └── og/                       # obrazy podglądu linków
│   │   ├── src/
│   │   │   ├── app/                      # TYLKO routing
│   │   │   │   ├── layout.tsx            # fonty, main.scss, Cursor, Providers
│   │   │   │   ├── page.tsx              # /  (intro → o mnie → sekcje)
│   │   │   │   ├── doswiadczenie/page.tsx
│   │   │   │   ├── stack/page.tsx
│   │   │   │   ├── portfolio/page.tsx
│   │   │   │   ├── not-found.tsx
│   │   │   │   ├── sitemap.ts
│   │   │   │   └── robots.ts
│   │   │   ├── components/
│   │   │   │   ├── ui/                   # prymitywy: Button, Tag, Card, Field
│   │   │   │   │   └── Button/
│   │   │   │   │       ├── index.tsx
│   │   │   │   │       └── index.module.scss
│   │   │   │   ├── layout/               # Header, Footer, Cursor, PageTransition
│   │   │   │   └── sections/             # Intro, About, PixelField, Experience,
│   │   │   │                             # TechStack, Education, PortfolioLinks, Contact
│   │   │   ├── engine/                   # czysty TypeScript, bez Reacta
│   │   │   │   ├── core/                 # Ticker, PointerTracker, QualityGovernor
│   │   │   │   ├── glyph/                # siatka cyfr, atlas glifów, portret ASCII
│   │   │   │   └── pixels/               # pole kwadratów, wybuch
│   │   │   ├── hooks/                    # useTicker, useReducedMotion, useSectionEmoji…
│   │   │   ├── api/                      # klient fetch + hooki TanStack Query
│   │   │   ├── content/                  # treści jako typowane pliki TS (PL)
│   │   │   ├── styles/                   # architektura Sass (sekcja 6.3)
│   │   │   └── types/index.ts            # typy domenowe frontu
│   │   ├── next.config.ts
│   │   └── package.json
│   └── api/                              # Cloudflare Worker
│       ├── src/
│       │   ├── index.ts                  # router: /api/*
│       │   ├── routes/                   # explosions.ts, contact.ts, health.ts
│       │   ├── repositories/             # ExplosionRepository + D1… (+ Dynamo… opcjonalnie)
│       │   └── lib/                      # json(), errors, rateLimit
│       ├── migrations/                   # *.sql dla D1
│       ├── wrangler.jsonc                # Worker + D1 + assets: ../web/out
│       └── package.json
├── packages/
│   └── shared/                           # @cv/shared: wspólne typy i schematy Zod
│       └── src/{types.ts, schemas.ts, index.ts}
├── docs/plan/                            # te dokumenty
├── .github/workflows/                    # ci.yml, deploy.yml
├── package.json                          # skrypty: dev, build, lint, typecheck, test, deploy
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── .editorconfig, .prettierrc, eslint.config.mjs, .stylelintrc.json
```

Szkic `apps/api/wrangler.jsonc` (szczegóły do weryfikacji w etapie 1.4):

```jsonc
{
  "name": "cv",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-01",
  "assets": {
    "directory": "../web/out",
    "not_found_handling": "404-page",
    "run_worker_first": ["/api/*"]
  },
  "d1_databases": [{ "binding": "DB", "database_name": "cv-db", "database_id": "<id>" }],
  "routes": [{ "pattern": "twojadomena.pl", "custom_domain": true }]
}
```

---

## 6. Konwencje

### 6.1 Nazewnictwo

| Co | Konwencja | Przykład |
|---|---|---|
| Komponent React | folder PascalCase + `index.tsx` + `index.module.scss` | `components/sections/PixelField/index.tsx` |
| Pliki pomocnicze komponentu | obok, w tym samym folderze | `types.ts`, `usePixelField.ts`, `PixelField.test.tsx` |
| Hooki | `useCamelCase.ts` | `hooks/useReducedMotion.ts` |
| Silnik (czysty TS) | klasa PascalCase w pliku PascalCase | `engine/glyph/GlyphField.ts` |
| Trasy Next | po polsku, bez znaków diakrytycznych | `app/doswiadczenie/page.tsx` |
| Klasy CSS w modułach | camelCase, stany z prefiksem `is` | `.heroTitle`, `.isActive`, `.isExploded` |
| Tokeny | CSS: `--gray-900`, SCSS: `$space-4` | |
| Stałe | `SCREAMING_SNAKE_CASE` | `MAX_DPR_MOBILE` |
| Commity | Conventional Commits | `feat(intro): explode glyphs on click` |

Język kodu i nazw: angielski. Treści na stronie: polski (EN do decyzji, pytanie 4).

### 6.2 Typy

- **Props komponentu:** `interface <Nazwa>Props` na górze `index.tsx`, nad komponentem.
- **Więcej niż 2 typy w komponencie:** `types.ts` obok komponentu.
- **Typy domenowe frontu** (`ExperienceItem`, `SkillItem`, `EducationItem`, `PortfolioLink`): `apps/web/src/types/index.ts`, import `@/types`.
- **Kontrakt API** (wspólny dla frontu i Workera): `packages/shared/src/types.ts`, import `@cv/shared`.
- `import type` dla typów, `strict: true`, `noUncheckedIndexedAccess: true`, zakaz `any` (ESLint).

### 6.3 Architektura Sass

```
src/styles/
├── abstracts/
│   ├── _tokens.scss       # skala szarości, odstępy, typografia, z-index, czasy animacji
│   ├── _mixins.scss       # mq(), hover-only(), reduced-motion(), visually-hidden()
│   ├── _functions.scss    # rem(), fluid()
│   └── _index.scss        # @forward wszystkiego powyżej
├── base/
│   ├── _reset.scss
│   ├── _root.scss         # :root { --gray-…, --font-… } (tokeny czytane też przez canvas)
│   └── _typography.scss
└── main.scss              # importowany tylko w app/layout.tsx
```

- Tylko `@use` / `@forward`, bo `@import` jest przestarzały w Dart Sass.
- Każdy `index.module.scss` zaczyna się od `@use '@/styles/abstracts' as *;`.
- Paleta: skala szarości `--gray-0` do `--gray-1000`. Ewentualny jeden akcent kolorystyczny do decyzji (pytanie 6).
- Breakpointy mobile-first: `sm 480`, `md 768`, `lg 1024`, `xl 1440`.
- **Dlaczego `index.module.scss`, a nie `index.scss`:** Next pozwala importować globalny CSS w komponentach,
  ale wtedy klasy z różnych komponentów ze sobą kolidują. Moduł nadaje klasom unikalne nazwy, a plik dalej nazywa się `index.*`.

### 6.4 Zasady wydajności animacji (wspólne dla faz 2 do 4)

- **Jedna pętla `requestAnimationFrame`** (`Ticker`) dla całej strony. Efekty subskrybują ją, zamiast uruchamiać własne pętle.
- **Zero `setState` w klatce.** Stan animacji żyje w klasach silnika i `useRef`. React tylko montuje i odmontowuje.
- Dane cząstek w `Float32Array` / `Uint8Array`, **bez alokacji w pętli**.
- **Atlas glifów:** cyfry rysujemy raz do offscreen canvas, potem tylko kopiujemy (`drawImage`).
- DPR ograniczony (2 na desktopie, 1,5 na telefonie). Adaptacyjna jakość: przy spadku fps rośnie rozmiar komórki.
- **Pauza**, gdy karta jest ukryta (`visibilitychange`) albo canvas jest poza ekranem (`IntersectionObserver`).
- `prefers-reduced-motion` → wersja statyczna.
- **Pointer Events**: mysz, dotyk i rysik obsługiwane jednym API.

---

## 7. Środowiska i CI/CD

- `pnpm dev` uruchamia razem Next (`:3000`) i `wrangler dev` (`:8787`) z lokalną bazą D1.
  Front w trybie dev woła API pod `NEXT_PUBLIC_API_URL=http://localhost:8787`.
- **GitHub Actions:**
  - PR: lint, typecheck, test, build,
  - push na `main`: `wrangler d1 migrations apply --remote` i `wrangler deploy`.
- Sekrety w GitHubie: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Sekrety Workera (`wrangler secret put`) dochodzą w fazie 5.

---

## 8. Etapy fazy 1

| # | Etap | Status |
|---|---|---|
| 1.1 | Research referencji i odpowiedzi na pytania z briefu (ten dokument) | ✅ |
| 1.2 | Akceptacja stacku (sekcja 3) i architektury (sekcje 4 do 6) przez autora | ⏳ |
| 1.3 | Decyzje hostingowe: nazwa domeny, D1 czy DynamoDB, zakup domeny, konto Cloudflare bez karty, NS w OVH → Cloudflare | ⏳ |
| 1.4 | Szkielet aplikacji: monorepo, narzędzia, pusty layout, `/api/health`, deploy na docelową domenę z HTTPS (dowód, że koszt = domena) | ⏳ |

## 9. Kryteria ukończenia

- [ ] Autor zaakceptował stack (sekcja 3)
- [ ] Autor zaakceptował architekturę, strukturę i konwencje (sekcje 4 do 6)
- [ ] Autor wybrał wariant hostingu i bazy (sekcja 2)
- [ ] Domena kupiona, testowa strona działa pod `https://twojadomena.pl`, a `/api/health` odpowiada
- [ ] Żadna usługa nie ma podpiętej karty (albo autor świadomie wybrał wariant AWS)

## 10. Pytania do autora

1. Jaka domena i końcówka (`.pl`, `.dev`, `.com`)?
2. D1 czy DynamoDB?
3. Jakie „inne CV/portfolia” pokazujemy po wybuchu? Potrzebna lista adresów.
4. Tylko polski, czy polski i angielski?
5. Czy masz zdjęcie w dobrej rozdzielczości, na jednolitym tle, z wyraźnym światłem? To ważne dla portretu z cyfr.
6. 100% skali szarości, czy jeden kolor akcentu?
7. Repo publiczne czy prywatne? (Od tego zależą darmowe minuty GitHub Actions.)

## Źródła

- [aino.agency: Awwwards SOTD](https://www.awwwards.com/sites/aino-agency)
- [aino.agency: case study Visuelle](https://visuelle.co.uk/aino-agency/)
- [Offscreen Canvas: WebGL ASCII (analiza efektu aino)](https://offscreencanvas.com/issues/webgl-ascii/)
- [Design Everywhere: Aino](https://designeverywhere.co/work/aino)
- [Cloudflare D1: cennik i limity](https://developers.cloudflare.com/d1/platform/pricing/)
- [Cloudflare: egzekwowanie limitów D1 Free (09.2026)](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/)
- [Porównanie darmowych hostingów (09.2026)](https://flaviocopes.com/hosting-free-tiers.md)
- [Netlify: limity planu Free 2026](https://netli.fyi/blog/netlify-free-plan-limits-2026)
- [AWS Free Tier 2026: co się zmieniło](https://tech-insider.org/what-changed-in-the-aws-free-tier-for-2026/)
- [Supabase: cennik 2026](https://makerkit.dev/blog/saas/supabase-pricing)
- [OVHcloud: domeny .pl](https://www.ovhcloud.com/pl/domains/tld/pl/)
- [Webflow: GSAP jest w 100% darmowy](https://webflow.com/blog/gsap-becomes-free)
- [EmailJS: plan Free](https://freetier.co/directory/products/emailjs)
