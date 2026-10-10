# Faza 1: Stack technologiczny i architektura

> **Status:** ✅ zaakceptowana przez autora (08.10.2026). Do domknięcia: zakup domeny i wybór magazynu wybuchów (sekcja 3).
> **Poprzednia faza:** brak · **Następna:** [Faza 2: animacja startowa](./faza-2-animacja-startowa.md)

## Warunek ukończenia (z briefu)

Faza jest gotowa, gdy autor w pełni zaakceptuje stack i architekturę oraz gdy zostanie przedstawiona kwestia hostingu.
Docelowo strona ma działać **w koszcie samej domeny**. Jeśli to niemożliwe, trzeba przedstawić najtańsze rozwiązanie roczne:
jednorazowa opłata, **bez podpinania karty** i bez płacenia za API.

**Wynik:** wariant „tylko domena” jest możliwy: domena w OVH, hosting i funkcje API w Netlify (plan Free, bez karty).

---

## 0. Decyzje autora

| Temat                   | Decyzja                                                                                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domena                  | **OVH**                                                                                                                                                                                             |
| Hosting i API           | **Netlify** (plan Free) + Netlify Functions                                                                                                                                                         |
| Framework               | **Next.js 16** (nie Vite; wyjaśnienie w pkt 1.7)                                                                                                                                                    |
| Pakiety                 | **npm**                                                                                                                                                                                             |
| Praca z gitem           | Każda zmiana na osobnym branchu, testy lokalne przed commitem, PR do `develop`, a `develop` trafia do `main` po akceptacji etapu. **Deploy dopiero po napisaniu aplikacji.** Zapisane w `CLAUDE.md` |
| Magazyn wybuchów (baza) | **zrezygnowano 10.10.2026**: brak bazy i licznika wybuchów (sekcja 3 zostaje jako archiwum analizy)                                                                                                 |
| Formularz kontaktowy    | rekomendacja: Netlify Forms (faza 5)                                                                                                                                                                |

---

## 1. Odpowiedzi na pytania z briefu

### 1.1 Jak zrobiona jest animacja na aino.agency? three.js? Video?

**Ani video, ani three.js.** Opisy projektu (Awwwards, case study Visuelle, analiza Offscreen Canvas) mówią to samo:

- to **siatka znaków (ASCII) w czystym HTML**, przeliczana w każdej klatce. Na stronie nie ma WebGL,
- zespół napisał od zera własny mikro-framework („White”) na Vite. Ma ok. 2 kB runtime i nie używa virtual DOM,
- znaki są „punktami”, które morfują, odbijają się (prosta fizyka 2D), malują obraz i piszą tekst w czasie rzeczywistym,
- cała strona waży ok. **30 kB JS**. Inspiracją było kodowanie maszynowe lat 80. i „lo-fi” matematyka fizyki.

> ⚠️ Z mojego środowiska nie dało się otworzyć aino.agency ani craft.wild.as (blokada sieci), więc opieram się na opisach.
> Jak przekazać mi więcej: [faza 2, sekcja „Materiały referencyjne”](./faza-2-animacja-startowa.md#materiały-referencyjne-od-autora).

**Wniosek dla nas:** to efekt proceduralny, czyli kod, nie film. Video odpada z trzech powodów: jest ciężkie, nie reaguje na klik
ani dotyk i rozmywa się na ekranach o innej rozdzielczości. Odtwarzamy **ten sam pomysł** (siatka cyfr, fizyka, morphing w zdjęcie),
ale rysujemy go na **Canvas 2D**. Przy portrecie z tysięcy znaków canvas jest wydajniejszy od tysięcy węzłów DOM, zwłaszcza na telefonach.

### 1.2 Czy potrzebuję three.js?

**Nie.** three.js to silnik scen 3D (kamery, siatki, światła). Waży dziesiątki do setek kB, a my nie mamy żadnego 3D.
Oba efekty (cyfry i migające kwadraty) są płaskie:

| Opcja                                          | Kiedy                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Canvas 2D + własny silnik w TS** (domyślnie) | Wystarcza na kilka do kilkunastu tysięcy komórek, zero zależności                         |
| **OGL** (mała biblioteka WebGL, MIT)           | Plan B, jeśli pomiar na telefonie da < 50 fps. Jedno wywołanie rysowania z atlasem glifów |
| three.js / React Three Fiber                   | Tylko gdyby kiedyś doszło prawdziwe 3D                                                    |

Silnik ma interfejs `GlyphRenderer`, więc zamiana Canvas 2D na OGL nie dotyka reszty kodu.

### 1.3 Czy potrzebuję Terraforma?

**Nie.** Infrastrukturę opisują dwa pliki w repo: `netlify.toml` (build, nagłówki, funkcje) i ustawienia projektu w panelu Netlify.
Terraform miałby sens dopiero przy wielu środowiskach albo przy AWS (DynamoDB + IAM), i nawet wtedy jest opcją, nie wymogiem.

### 1.4 Gdzie za darmo tworzyć takie efekty?

Wszystko powstaje w kodzie, lokalnie (VS Code + serwer deweloperski). Darmowe narzędzia pomocnicze:

- **CodePen / StackBlitz**: szybki prototyp efektu w izolacji,
- **GSAP**: od 2025 r. w 100% darmowy, razem z dawnymi płatnymi pluginami (SplitText, ScrambleText, ...),
- **Figma (Free)**: makiety; **Squoosh**: kompresja zdjęcia do AVIF/WebP; **Photopea**: wycięcie tła i skala szarości.

### 1.5 Czy dwa repo da się hostować na jednej domenie za darmo?

**Tak**, ale u nas nie jest to potrzebne. W Netlify frontend i funkcje API żyją w **jednym repo i pod jedną domeną**:
strona statyczna na `twojadomena.pl`, funkcje pod `twojadomena.pl/api/*`. Daje to jeden deploy, brak CORS
i **jeden wspólny `src/shared/types.ts`** dla frontu i API. Dwa repo oznaczałyby podwójne CI i ręczne pilnowanie zgodności typów.
Gdybyś kiedyś rozdzielił repo, subdomena `api.twojadomena.pl` też działa w Netlify.

### 1.6 Netlify: limity, kredyty i co zrobić, żeby ich nie przekroczyć

Konta Netlify założone po 4.09.2025 mają plan kredytowy: **300 kredytów miesięcznie, twardy limit, bez karty i bez możliwości dokupienia**.
Stawki (od 14.04.2026):

| Zasób                                          | Koszt w kredytach          |
| ---------------------------------------------- | -------------------------- |
| Deploy produkcyjny (tylko udany)               | 15                         |
| Transfer                                       | 20 za GB                   |
| Żądania HTTP (strony, pliki, funkcje)          | 2 za 10 000                |
| Funkcje (czas obliczeń)                        | 10 za GB-godzinę           |
| Deploy Preview, deploy brancha, wersje robocze | **0**                      |
| Formularze Netlify Forms (od 14.04.2026)       | **0**, bez limitu zgłoszeń |

**Po wyczerpaniu kredytów Netlify pauzuje wszystkie strony na koncie** do następnego cyklu rozliczeniowego (odwiedzający widzą „Site not available”).
Nic nie jest doliczane. Przykładowy miesiąc: 8 deployów (120) + 3 GB transferu (60) + 100 tys. żądań (20) = 200 kredytów.

Twoje podejście (testy lokalne, merge do `main`, deploy po napisaniu) jest dokładnie tym, co chroni limit. Dodatkowo:

1. W `netlify.toml` jest komenda `ignore`: zmiany tylko w `docs/` nie uruchamiają buildu (oszczędność 15 kredytów).
2. Do czasu ukończenia aplikacji możesz **nie podłączać repo do Netlify** albo ustawić „Build status: Stopped”.
3. Deploy Preview i deploy brancha są darmowe, ale i tak ich nie potrzebujemy. Wyłącz je w ustawieniach.
4. Lekka strona: początkowy ładunek ≤ 300 kB gzip, zdjęcie AVIF ≤ 120 kB, nagłówki cache z `netlify.toml`.
   Przy ok. 10 000 odwiedzin miesięcznie to ok. 5 GB transferu, czyli ok. 100 kredytów.
5. Wyłącz funkcje AI na poziomie zespołu (Agent Runners zużywają kredyty).

**Ustawienia, które zaskakują nowe konta (sprawdź po założeniu projektu):**

- **Nowe zespoły są domyślnie prywatne** (od 28.07.2026): trzeba świadomie ustawić projekt jako publiczny
  (_Team settings → General → Visitor access_ albo widoczność projektu).
- Na projektach Free pojawia się **plakietka „Powered by Netlify”**. Wyłączysz ją w _Project configuration → General_, bez redeployu.
- **Wykrywanie formularzy** jest domyślnie wyłączone (_Forms → Enable form detection_, działa od następnego deploya).
- Stare deploye są automatycznie usuwane po 30 dniach (opublikowany i ostatni produkcyjny zostają).
- Zdarzały się zgłoszenia użytkowników o błędnej fladze „operational credits”, która blokowała produkcyjne deploye mimo wolnych kredytów.
  Wsparcie Netlify resetuje ją na prośbę. To raporty z forum, bez oficjalnego potwierdzenia.

### 1.7 Czy lecimy na Vite?

**Nie, na Next.js 16** (zgodnie z Twoją prośbą o strukturę w stylu Next.js). Vite pojawia się w projekcie tylko „pod spodem”
jako silnik testów (Vitest). Next.js 16 buduje i serwuje aplikację własnym bundlerem Turbopack.
Vite byłby poprawnym wyborem dla czystego SPA, ale tracimy wtedy gotowy HTML każdej podstrony (SEO, podglądy linków na LinkedInie),
routing plikowy i wspólny layout, który utrzymuje kursor między podstronami.

---

## 2. Hosting, domena i koszty

### 2.1 Zestawienie: „koszt = domena”

| Element                     | Usługa                    | Koszt                                                                     | Karta?              |
| --------------------------- | ------------------------- | ------------------------------------------------------------------------- | ------------------- |
| Domena `.pl`                | OVH                       | ok. **20,53 zł brutto** za 1. rok, odnowienie ok. **72,56 zł brutto/rok** | PayPal albo karta ¹ |
| Frontend (pliki statyczne)  | Netlify Free              | 0 zł (kredyty, pkt 1.6)                                                   | nie                 |
| API                         | Netlify Functions (opcja) | 0 zł (kredyty); na razie tylko `/api/health`                              | nie                 |
| Formularz kontaktowy        | Netlify Forms             | 0 zł, bez limitu zgłoszeń                                                 | nie                 |
| HTTPS, CDN                  | Netlify (Let's Encrypt)   | 0 zł                                                                      | nie                 |
| Analityka wyszukiwarki      | Google Search Console     | 0 zł                                                                      | nie                 |
| Analityka odwiedzin (opcja) | Umami Cloud Hobby         | 0 zł (1 strona, 100 tys. zdarzeń/mies.)                                   | nie                 |

**Razem: koszt domeny.**

¹ OVH w Polsce zapisuje do odnawiania **kartę albo PayPala**. Przelew i BLIK nie są potwierdzone w oficjalnej dokumentacji,
więc najprościej: **PayPal**. Sprawdź w koszyku. Domena powstaje 24 do 48 h po płatności. Cena 16,69 zł netto jest oznaczona
jako „oferta wieloletnia”, więc sprawdź w koszyku, czy nie wymaga zakupu na kilka lat.

### 2.2 Czy OVH ma najtańsze odnowienia?

**Prawie.** NASK (rejestr `.pl`) pobiera od rejestratorów ok. 50 zł netto za odnowienie, więc żaden polski rejestrator nie zejdzie znacząco niżej.
OVH (58,99 zł netto) jest **najtańszym z dużych, znanych rejestratorów**. Najtańsze małe firmy (Simply.com, Hostido, Viperhost)
mają ok. 50 do 51 zł netto, czyli różnica to **8 do 10 zł brutto rocznie**. Dla porównania odnowienie kosztuje ok. 160 zł w LH.pl,
ok. 171 zł w dhosting, ok. 220 zł w cyber_Folks i Zenbox, powyżej 200 zł w home.pl i ok. 295 zł w nazwa.pl (ceny brutto z zestawień i blogów rejestratorów, orientacyjne i niezależnie niezweryfikowane; ceny OVH i opłatę NASK podają strony tych podmiotów). Zostajemy przy OVH. Cloudflare Registrar najpewniej nie sprzedaje `.pl`. Ostateczną cenę zawsze sprawdź w koszyku.

### 2.3 Podpięcie domeny z OVH do Netlify

Najpierw dodaj domenę w Netlify (_Domain management → Add a domain_). Potem wybierz jedną z dróg:

**A. DNS zostaje w OVH (rekomendowane, bez czekania na zmianę serwerów nazw)**

1. OVH: _Web Cloud → Nazwy domen → twoja domena → Strefa DNS_.
2. **Usuń domyślne wpisy OVH**: A i AAAA dla domeny głównej, wpis `www` oraz domyślne TXT. Pozostawione wpisy OVH to najczęstsza przyczyna,
   że strona nadal otwiera się z OVH.
3. Dodaj rekord **A** dla domeny głównej wskazujący na `75.2.60.5` (load balancer Netlify).
4. Dodaj rekord **CNAME** dla `www` wskazujący na `<nazwa-projektu>.netlify.app.` (z kropką na końcu).
5. Netlify zaleca ustawić `www` jako domenę główną przy zewnętrznym DNS. Druga wersja przekierowuje automatycznie.
6. HTTPS (Let's Encrypt) włącza się sam po propagacji DNS, zwykle do 24 do 48 h.

**B. Netlify DNS (serwery nazw Netlify)**: wymaga wyłączenia DNSSEC w OVH, zmiany serwerów DNS i odtworzenia rekordów
poczty i TXT. Całość trwa 48 do 72 h, a Netlify DNS nie obsługuje DNSSEC. Wybieramy ją tylko, jeśli A okaże się kłopotliwa.

Rekord TXT do **Google Search Console** (weryfikacja domeny) dodajesz w tej strefie DNS, która jest aktualnie autorytatywna
(przy drodze A to strefa w OVH).

### 2.4 Plan B: najtańsza roczna opłata jednorazowa

Gdyby Netlify zmieniło warunki: **hosting współdzielony OVH z domeną w pakiecie**, ok. 8 do 11 zł brutto miesięcznie płatne z góry
za rok (do weryfikacji w koszyku). Wrzucamy statyczny eksport (`out/`) przez FTP, a API zastępuje mały skrypt PHP.
Frontend się nie zmienia, zmienia się tylko adres API.

---

## 3. Magazyn wybuchów: DynamoDB, Supabase czy coś prostszego? (archiwum)

> **Zrezygnowano (10.10.2026).** Autor odstąpił od zapisu wybuchów i licznika, żeby dowieźć stronę jak najszybciej: strona nie ma bazy danych.
> Ta sekcja zostaje jako zapis analizy, gdyby kiedyś wrócił pomysł licznika. Poniższe punkty 5.1 i 5.3 dotyczą tej wersji i **nie są wdrażane**.

### 3.1 Czy w ogóle potrzebujemy bazy?

Wpis z datą wybuchu był w Twoim briefie, więc zostaje. Ale pamiętaj, co daje Google:

**Google Search Console** (darmowa, bez skryptu na stronie, nie blokują jej adblocki) pokazuje:
wyświetlenia, kliknięcia, CTR, pozycje, zapytania, strony i kraje **z wyszukiwarki Google**, stan indeksowania i mapy strony, Core Web Vitals.
**Nie pokazuje** tego, co ludzie robią po wejściu: kliknięć „wybuchu”, kliknięć w linki do CV, ruchu z LinkedIna, GitHuba czy bezpośredniego.
Zapytań z wyszukiwarki to nie zastąpi, ale **wybuchów nikt Ci nie policzy poza własnym wpisem**. Dlatego:

- **wybuchy zapisujemy** w prostym magazynie (rekomendacja poniżej), a animacja działa nawet wtedy, gdy zapis się nie uda,
- **opcjonalnie** dodajemy cookieless analitykę odwiedzin (Umami Cloud Hobby, patrz 3.4).

### 3.2 Porównanie opcji (zweryfikowane 08.10.2026)

| Opcja                      | Karta?                                        | Ryzyko pauzy lub usunięcia                                                                               | Uwagi                                                                                                                                                                                     |
| -------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Netlify Blobs** ✅       | nie                                           | brak udokumentowanego                                                                                    | To samo konto i panel co hosting. Magazyn klucz-wartość (jeden klucz na wybuch). Zużycie kredytów znikome. Bez SQL                                                                        |
| **AWS DynamoDB**           | **tak, przy rejestracji** (blokada ok. 1 USD) | brak (Always Free: 25 GB, 25 WCU, 25 RCU, **tylko tryb provisioned**; tryb on-demand jest płatny)        | Po **6 miesiącach** konto musi przejść na plan Paid (karta, płatność za użycie), inaczej AWS je zamyka. Zmienne muszą mieć prefiks `MY_AWS_`, bo `AWS_*` jest zarezerwowany przez Netlify |
| **Supabase Free**          | nie                                           | **pauza po 7 dniach bez ruchu bazy**, dane zostają, przywrócenie w panelu (okno 1 rok, wcześniej 90 dni) | Obejście: cykliczne zapytanie z GitHub Actions co kilka dni. Od 30.10.2026 nowe tabele wymagają jawnych `GRANT`. Limit 500 MB                                                             |
| **Neon Free** (region AWS) | nie                                           | skalowanie do zera po 5 min (zimny start 0,5 do 3 s), usuwanie nieaktywnych dotyczy tylko regionów Azure | Prawdziwy Postgres, 1 GB. Dodatkowe konto                                                                                                                                                 |
| **Netlify Database** (GA)  | nie                                           | uśpienie po 5 min                                                                                        | **Odradzam:** każde obudzenie bazy kosztuje ok. 0,83 kredytu z 300, a 100 zapisów rozproszonych w czasie to ok. 83 kredytów                                                               |
| Turso, Upstash             | nie                                           | archiwizacja po 10 (Turso) lub 30 (Upstash) dniach bez użycia                                            | Odrzucone                                                                                                                                                                                 |
| Cloudflare D1 (przez REST) | nie                                           | brak                                                                                                     | Wymaga drugiego konta, a REST API jest zalecane tylko do administracji. Odrzucone                                                                                                         |

### 3.3 Rekomendacja

**Netlify Blobs**, z dostępem przez interfejs `ExplosionStore`. Powody: zero dodatkowych kont, zero karty, brak pauz i resetów
(czego się obawiałeś w Supabase), minimalne zużycie kredytów, a wpis „data wybuchu” to dokładnie jeden mały obiekt.
Ograniczenie: to nie SQL, więc zapytania typu „wybuchy z ostatniego tygodnia po godzinach” robimy odczytem listy kluczy
(przy setkach wpisów miesięcznie to bez znaczenia).

- **Jeśli kiedyś potrzebujesz zapytań SQL:** wymiana jednej klasy na Neon (region AWS) albo Supabase z keep-alive. Frontend się nie zmienia.
- **Jeśli wolisz DynamoDB:** da się, ale zaakceptuj kartę na koncie AWS i konto płatne po 6 miesiącach (Always Free zostaje, więc przy tym ruchu
  rachunek będzie zerowy, a w AWS Budgets ustaw alert na 1 USD). Zapis idzie przez `DynamoExplosionStore` (SDK `@aws-sdk/client-dynamodb`,
  tabela w trybie provisioned 1 RCU i 1 WCU, klucze `pk = day#2026-10-08`, `sk = ts#<uuid>`).

> **Decyzja autora (10.10.2026):** ☑ żadna baza, rezygnacja z licznika i zapisu wybuchów.

### 3.4 Analityka odwiedzin (opcjonalna, faza 4)

| Narzędzie                 | Co daje                                                                                   | Uwagi                                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Google Search Console** | Ruch z Google, zapytania, indeksowanie                                                    | Weryfikacja domeny rekordem TXT w DNS                                                                                                                                                      |
| **Umami Cloud Hobby**     | Odwiedziny, źródła, własne zdarzenia (np. „wybuch”, „klik w CV”), bez cookies, bez banera | 1 strona, 100 tys. zdarzeń/mies., retencja 6 mies. Skrypt jest domyślnie blokowany przez adblocki (szacunkowo 20 do 40% ruchu). Obejście: proxy przez `netlify.toml` (`/stats.js` → Umami) |
| Netlify Web Analytics     | Odwiedziny z logów serwera (adblocki nie wpływają)                                        | Brak własnych zdarzeń. Historia na planie Free jest bardzo krótka (ok. doby, sprawdź w panelu po włączeniu)                                                                                |
| Google Analytics 4        | najwięcej danych                                                                          | Wymaga banera zgody na cookies (RODO, art. 399 PKE). **Odradzam**, bo psuje czysty design i ucina dane                                                                                     |

---

## 4. Stack technologiczny

Wersje według npm z 8.10.2026. Plik `package-lock.json` przypina dokładne wersje.

| Warstwa                 | Wybór                                                                  | Wersja                 | Po co                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Język                   | **TypeScript** (`strict`)                                              | **~6.0.3**             | obowiązkowy. TS 7 (natywny kompilator) dopiero, gdy obsłuży go typescript-eslint (dziś wymaga `<6.1`). **Nie rób `npm i typescript@latest`** |
| UI                      | **React**                                                              | 19.x                   |                                                                                                                                              |
| Framework               | **Next.js** (App Router, `output: 'export'`, Turbopack)                | 16.4                   | statyczny HTML każdej podstrony, wspólny layout z kursorem. `cacheComponents` musi być **wyłączone** (jest niezgodne z eksportem statycznym) |
| Style                   | **Sass (SCSS) + CSS Modules**                                          | sass 1.x               | `index.module.scss` per komponent                                                                                                            |
| Animacje UI             | **GSAP** (+ ScrollTrigger, SplitText, ScrambleText)                    | 3.15                   | sekwencje intro, scroll, „dekodowanie” tekstu                                                                                                |
| Płynny scroll           | **Lenis**                                                              | 1.3                    | zsynchronizowany z ScrollTrigger                                                                                                             |
| Efekty (cyfry, piksele) | **własny silnik TS na Canvas 2D**                                      | n/d                    | pełna kontrola, zero wagi. Plan B: **OGL**                                                                                                   |
| Dane z API              | **TanStack Query**                                                     | 5.x                    | na razie nieużywane; wróci przy wysyłce formularza, jeśli będzie potrzebny                                                                   |
| Walidacja               | **Zod**                                                                | 4.x                    | jeden schemat dla frontu i funkcji                                                                                                           |
| Backend                 | **Netlify Functions** (TypeScript, format `export default`)            | `@netlify/functions` 6 | `/api/*`                                                                                                                                     |
| Formularz               | **Netlify Forms** (faza 5)                                             | n/d                    | zgłoszenia na e-mail, antyspam Akismet                                                                                                       |
| Środowisko              | **Node.js 24 LTS**, npm 11                                             |                        | patrz uwaga o Node 26 niżej                                                                                                                  |
| Jakość                  | ESLint 10, Prettier, Stylelint, **Vitest 5**, **Playwright** (faza 2+) |                        | lint, testy silnika, testy e2e                                                                                                               |
| Minigra (faza 6)        | **KAPLAY**                                                             | 3001.x                 | następca Kaboom.js, który nie jest już rozwijany                                                                                             |

**Node 24 czy 26?** Node 24 jest teraz Active LTS (do 20.10.2026), potem Maintenance LTS aż do 30.04.2028. Node 26 zostaje LTS 28.10.2026.
Zostajemy przy **24** (`.nvmrc`, `netlify.toml`). Uwaga: po 28.10.2026 komenda `winget install OpenJS.NodeJS.LTS` zainstaluje już **26**.
To nie psuje projektu (wymagamy Node ≥ 22.12), ale najlepiej mieć lokalnie tę samą wersję co na Netlify. Przejście na 26 to zmiana
trzech miejsc naraz: `.nvmrc`, `netlify.toml`, `engines` w `package.json`.

### Czego świadomie nie używamy

| Odrzucone                      | Powód                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| **jQuery**                     | React zarządza DOM-em, a jQuery dubluje to i dodaje ok. 30 kB. Wszystko, co daje, mamy natywnie: `querySelector`, `fetch`, `classList`  |
| **GraphQL**                    | Mamy 2 do 3 endpointów. REST plus wspólne typy z `src/shared` daje to samo bez serwera schematów i klienta (Apollo/urql to 30 do 50 kB) |
| **three.js / R3F**             | Brak 3D (pkt 1.2)                                                                                                                       |
| **Terraform**                  | Infrastruktura to `netlify.toml` (pkt 1.3)                                                                                              |
| **pnpm workspaces, Turborepo** | Jedna aplikacja i jedna paczka. `npm install` wystarcza                                                                                 |
| **Tailwind**                   | Brief: SCSS per komponent                                                                                                               |
| **Motion (Framer Motion)**     | Dublowałby GSAP. Trzymamy jedną bibliotekę animacji                                                                                     |

---

## 5. Architektura

```
 Przeglądarka (desktop / telefon)
          │  https://twojadomena.pl
          ▼
 ┌──────────────────────────── Netlify, plan Free ──────────────────────────────┐
 │  CDN: strona statyczna (out/)                              [kredyty: transfer] │
 │  Netlify Functions  /api/*                                                    │
 │   └── GET  /api/health       → test działania (reszta wg potrzeb, faza 5)     │
 │  Netlify Forms   (formularz kontaktowy, faza 5)                               │
 └──────────────────────────────────────────────────────────────────────────────┘
 OVH: rejestracja domeny i strefa DNS (A → Netlify, CNAME www → Netlify)
```

### 5.1 Przepływ „wybuchu” (nie wdrażany, patrz sekcja 3)

1. Użytkownik klika albo dotyka pole kwadratów. Animacja startuje **od razu** i nie czeka na sieć.
2. Hook `useExplodeMutation` (TanStack Query) wysyła `POST /api/explosions` z `{ origin: { x, y }, device }`.
3. Funkcja waliduje dane (Zod), zapisuje wpis przez `ExplosionStore` z datą **nadaną przez serwer** (UTC, ISO 8601)
   i zwraca `{ explosion, total }`.
4. UI pokazuje np. „Wybuch #1234 · 08.10.2026, 11:32” i karty z linkami do innych CV.
5. Błąd sieci nie psuje UX: animacja i linki działają, zapis jest ponawiany do 2 razy.

### 5.2 Kontrakt API: `src/shared/types.ts` (wersja archiwalna, usunięta z repo 10.10.2026)

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
  lastAt: string | null;
}

export interface ApiError {
  error: { code: string; message: string };
}
```

Schematy Zod odpowiadające tym typom leżą obok, w `src/shared/schemas.ts`. Typ kontaktu dochodzi w fazie 5.

### 5.3 Magazyn za interfejsem (nie wdrażany)

```ts
// netlify/functions/lib/ExplosionStore.ts (faza 3)
export interface ExplosionStore {
  add(input: ExplosionCreateRequest): Promise<Explosion>;
  stats(): Promise<ExplosionStats>;
}
```

Implementacje: `BlobsExplosionStore` (domyślna, klucz = `ISO-data + losowy sufiks`, wartość = JSON) oraz opcjonalnie `DynamoExplosionStore`.
Wybór przez zmienną środowiskową `EXPLOSION_STORE=blobs|dynamo`. Test jednostkowy sprawdza oba zachowania na tym samym zestawie przypadków.

### 5.4 Bezpieczeństwo i RODO

- **Nie zapisujemy IP ani cookies.** Strona nie zapisuje też żadnych danych o wybuchach.
- Ten sam origin dla frontu i API, więc CORS nie jest potrzebny.
- Nagłówki bezpieczeństwa ustawia `netlify.toml`.
- Brak śledzenia oznacza brak banera cookies. (Umami i GoatCounter nie używają cookies, GA4 używa i wymagałby zgody.)
- Sekrety (jeśli kiedyś się pojawią, np. klucz EmailJS) wyłącznie jako zmienne środowiskowe Netlify, plik `.env` jest w `.gitignore`.

---

## 6. Struktura repozytorium (już utworzona)

```
CV/
├── src/
│   ├── app/                        # TYLKO routing
│   │   ├── layout.tsx              # fonty, main.scss, (później) Cursor i Providers
│   │   ├── page.tsx                # /  (intro → o mnie → sekcje)
│   │   ├── not-found.tsx
│   │   └── (później) experience/ stack/ portfolio/ page.tsx, sitemap.ts, robots.ts
│   ├── components/
│   │   ├── ui/                     # prymitywy: Button, Tag, Card, Field
│   │   ├── layout/                 # Header, Footer, Cursor, PageTransition
│   │   └── sections/               # Intro, About, PixelField, Experience,
│   │       └── Placeholder/        # TechStack, Education, PortfolioLinks, Contact
│   │           ├── index.tsx
│   │           └── index.module.scss
│   ├── engine/                     # czysty TypeScript, bez Reacta
│   │   ├── core/                   # Ticker (jest), PointerTracker, QualityGovernor
│   │   ├── glyph/                  # siatka cyfr, atlas glifów, portret ASCII
│   │   └── pixels/                 # pole kwadratów, wybuch
│   ├── hooks/                      # useTicker, useReducedMotion, useSectionEmoji…
│   ├── api/                        # (później) klient fetch formularza
│   ├── content/                    # treści jako typowane pliki TS (PL)
│   ├── shared/                     # kontrakt API (front + funkcje); dziś tylko typ błędu, schemat formularza dojdzie w fazie 4
│   ├── styles/                     # architektura Sass (sekcja 7.3)
│   └── types/index.ts              # typy domenowe frontu
├── netlify/functions/              # API: health.ts (jest); ewentualnie funkcja formularza (faza 5)
├── public/                         # statyczne: zdjęcie portretowe, OG, (faza 5) __forms.html
├── tests/e2e/                      # Playwright (od fazy 2)
├── docs/                           # plan faz i SETUP.md
├── netlify.toml                    # build, publish=out, nagłówki, funkcje
├── next.config.ts                  # output: 'export', trailingSlash, images.unoptimized
├── CLAUDE.md                       # reguły pracy (branch → main, testy lokalne, deploy po napisaniu)
└── package.json, tsconfig.json, eslint.config.mjs, .prettierrc.json, .stylelintrc.json, vitest.config.mts
```

Aliasy importu: `@/…` → `src/…`, `@shared/…` → `src/shared/…`.

---

## 7. Konwencje

### 7.1 Nazewnictwo

| Co                          | Konwencja                                             | Przykład                                              |
| --------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| Komponent React             | folder PascalCase + `index.tsx` + `index.module.scss` | `components/sections/PixelField/index.tsx`            |
| Pliki pomocnicze komponentu | obok, w tym samym folderze                            | `types.ts`, `usePixelField.ts`, `PixelField.test.tsx` |
| Hooki                       | `useCamelCase.ts`                                     | `hooks/useReducedMotion.ts`                           |
| Silnik (czysty TS)          | klasa PascalCase w pliku PascalCase                   | `engine/glyph/GlyphField.ts`                          |
| Trasy Next                  | po angielsku (zmiana z 10.10.2026)                    | `app/experience/page.tsx`                             |
| Klasy CSS w modułach        | camelCase, stany z prefiksem `is`                     | `.heroTitle`, `.isActive`, `.isExploded`              |
| Tokeny                      | CSS: `--gray-900`, SCSS: `$space-4`                   |                                                       |
| Stałe                       | `SCREAMING_SNAKE_CASE`                                | `MAX_DPR_MOBILE`                                      |
| Commity                     | Conventional Commits                                  | `feat(intro): explode glyphs on click`                |
| Branche                     | `feat/…`, `fix/…`, `docs/…`, `chore/…`                | `feat/intro-digit-grid`                               |

Język kodu i nazw: angielski. Treści na stronie: angielski (decyzja autora, 08.10.2026). Dokumentacja: polski.

### 7.2 Typy

- **Props komponentu:** `interface <Nazwa>Props` nad komponentem w `index.tsx`.
- **Więcej niż 2 typy w komponencie:** `types.ts` obok komponentu.
- **Typy domenowe frontu** (`ExperienceItem`, `SkillItem`, `EducationItem`, `PortfolioLink`): `src/types/index.ts`, import `@/types`.
- **Kontrakt API** (wspólny dla frontu i funkcji): `src/shared/types.ts`, import `@shared/types`.
- `import type` dla typów, `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, zakaz `any` (ESLint).

### 7.3 Architektura Sass (już utworzona)

```
src/styles/
├── abstracts/
│   ├── _tokens.scss       # odstępy, breakpointy, z-index, czasy animacji
│   ├── _mixins.scss       # mq(), hover-only, reduced-motion, visually-hidden
│   ├── _functions.scss    # rem()
│   └── _index.scss        # @forward wszystkiego powyżej
├── base/
│   ├── _reset.scss
│   ├── _root.scss         # :root { --gray-…, --font-… } (tokeny czytane też przez canvas)
│   └── _typography.scss
└── main.scss              # importowany tylko w app/layout.tsx
```

- Tylko `@use` / `@forward`, bo `@import` jest przestarzały w Dart Sass.
- Każdy `index.module.scss` zaczyna się od `@use '@/styles/abstracts' as *;`.
- Next.js 16 z Turbopack obsługuje moduły SCSS i `sassOptions.additionalData`, ale **nie** `sassOptions.functions`. Nie używamy też prefiksu `~` w importach.
- Paleta: skala szarości `--gray-0` do `--gray-1000`. Ewentualny jeden akcent kolorystyczny do decyzji (pytanie 6).
- Breakpointy mobile-first: `sm 480`, `md 768`, `lg 1024`, `xl 1440`.
- **Dlaczego `index.module.scss`, a nie `index.scss`:** zwykły plik globalny powoduje kolizje klas między komponentami.
  Moduł nadaje klasom unikalne nazwy, a plik dalej nazywa się `index.*`.

### 7.4 Zasady wydajności animacji (wspólne dla faz 2 do 4)

- **Jedna pętla `requestAnimationFrame`** (`Ticker`) dla całej strony. Efekty subskrybują ją, zamiast uruchamiać własne pętle.
- **Zero `setState` w klatce.** Stan animacji żyje w klasach silnika i `useRef`. React tylko montuje i odmontowuje.
- Dane cząstek w `Float32Array` / `Uint8Array`, **bez alokacji w pętli**.
- **Atlas glifów:** cyfry rysujemy raz do offscreen canvas, potem tylko kopiujemy (`drawImage`).
- DPR ograniczony (2 na desktopie, 1,5 na telefonie). Adaptacyjna jakość: przy spadku fps rośnie rozmiar komórki.
- **Pauza**, gdy karta jest ukryta (`visibilitychange`) albo canvas jest poza ekranem (`IntersectionObserver`).
- `prefers-reduced-motion` → wersja statyczna.
- **Pointer Events**: mysz, dotyk i rysik obsługiwane jednym API.

### 7.5 Wymagania eksportu statycznego (Next.js 16)

- `images.unoptimized: true` (bez tego `next/image` generuje adresy, których nie ma w `out/`).
- Pliki `sitemap.ts`, `robots.ts` i `opengraph-image.tsx` wymagają `export const dynamic = 'force-static'`, a w `layout.tsx` ustawionego `metadataBase`.
- Niedostępne: rewrites, redirects i headers w `next.config` (zastępuje je `netlify.toml`), Server Actions, `cookies()`, middleware/proxy.
- `trailingSlash: true` pasuje do „ładnych URL-i” Netlify (`/stack/`). Po pierwszym deployu sprawdź `curl -I` dla `/stack` i `/stack/`.
- `npm run start` serwuje folder `out/` (`npx serve out`), bo `next start` nie działa z eksportem.

---

## 8. Środowiska i CI/CD

- **Lokalnie:** `npm run dev` (sama strona) albo `npm run dev:full` (strona + funkcje przez Netlify CLI). Szczegóły w [`docs/SETUP.md`](../SETUP.md).
- **Przed commitem:** `npm run check` (lint, style, typy, testy, build).
- **Deploy:** Netlify buduje `main` (komenda `npm run build`, katalog publikacji `out/`). Zgodnie z Twoją decyzją **podłączamy repo i publikujemy dopiero po napisaniu aplikacji**.
- **GitHub Actions** (`.github/workflows/ci.yml`): `npm ci` i `npm run check` na PR-ach i na `main`, na **Linuksie i Windowsie**. Powód: błąd Sass „Can't find stylesheet" występował tylko na Windowsie. W publicznym repo darmowe, w prywatnym minuty Windows liczą się podwójnie (limit 2000 minut).

---

## 9. Etapy fazy 1

| #   | Etap                                                                                                                                                                                         | Status                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1.1 | Research referencji i odpowiedzi na pytania z briefu (ten dokument)                                                                                                                          | ✅                      |
| 1.2 | Akceptacja stacku i architektury przez autora                                                                                                                                                | ✅ (08.10.2026)         |
| 1.3 | Decyzje hostingowe: Netlify + OVH ✅. Do zrobienia: nazwa i zakup domeny. Magazyn wybuchów: zrezygnowano                                                                                     | ⏳                      |
| 1.4 | Szkielet aplikacji: Next 16, TypeScript, SCSS, testy, `/api/health`, `CLAUDE.md`, `docs/SETUP.md`. `npm run check` przechodzi                                                                | ✅ (lokalnie)           |
| 1.5 | Pierwszy deploy na domenę z HTTPS (dowód, że koszt = domena). **Po napisaniu aplikacji**, zgodnie z Twoim przepływem pracy ([lista kontrolna](#12-lista-kontrolna-przed-pierwszym-deployem)) | ⏸ odłożone do końca faz |

## 10. Kryteria ukończenia

- [x] Autor zaakceptował stack
- [x] Autor zaakceptował architekturę, strukturę i konwencje
- [x] Autor wybrał hosting (Netlify) i rejestratora domeny (OVH)
- [x] Magazyn wybuchów: zrezygnowano z bazy (10.10.2026)
- [ ] Domena kupiona
- [ ] Szkielet na `main` w GitHubie (czeka na uprawnienia zapisu dla Claude, patrz niżej)
- [ ] Żadna usługa nie ma podpiętej karty

## 11. Pytania do autora

1. Jaka domena i końcówka (`.pl`, `.dev`, `.com`)?
2. ~~Magazyn wybuchów~~ Rozstrzygnięte: brak bazy i licznika.
3. Jakie „inne CV/portfolia” pokazujemy po wybuchu? Potrzebna lista adresów.
4. ~~Tylko polski, czy polski i angielski?~~ Rozstrzygnięte: treści strony po angielsku.
5. Czy masz zdjęcie w dobrej rozdzielczości, na jednolitym tle, z wyraźnym światłem? To ważne dla portretu z cyfr.
6. 100% skali szarości, czy jeden kolor akcentu?
7. Czy chcesz opcjonalną analitykę odwiedzin (Umami Cloud Hobby), czy wystarczy Google Search Console?

## 12. Lista kontrolna przed pierwszym deployem

Wracamy do niej na koniec, przed podłączeniem repo do Netlify (zgodnie z Twoim przepływem pracy: deploy po napisaniu aplikacji).

**Rozmiary i limity (pytanie o „100 MB”)**

- GitHub **odrzuca pojedynczy plik > 100 MB** i ostrzega od 50 MB. Dziś największym plikiem w repo jest `package-lock.json` (kilkaset kB), więc jest bezpiecznie.
  Oryginalne zdjęcia (RAW, PSD, filmy z ekranu) trzymaj poza repo (zasady w [`docs/ASSETS.md`](../ASSETS.md)).
- Limity rozmiaru wdrożenia na planie Free w Netlify nie zostały przez nas sprawdzone w oficjalnej dokumentacji. Sprawdzimy je przed deployem.
  Dla porządku: cały `out/` ma dziś kilka MB, a budżet to początkowy ładunek ≤ 300 kB gzip.
- Przed deployem dodamy skrypt kontrolny (`npm run check` ostrzeże, gdy jakikolwiek plik w `public/` > 2 MB albo `out/` > 25 MB).

**Ustawienia w Netlify (po założeniu projektu)**

- [ ] Projekt ustawiony jako **publiczny** (nowe zespoły są domyślnie prywatne)
- [ ] Wyłączona plakietka „Powered by Netlify” i funkcje AI na poziomie zespołu
- [ ] Wyłączone Deploy Preview i deploye branchy (oszczędność kredytów, choć same nic nie kosztują)
- [ ] Włączone wykrywanie formularzy (faza 5)
- [ ] Komenda `ignore` z `netlify.toml` przetestowana na pierwszym deployu (przy pierwszym buildzie `CACHED_COMMIT_REF` może być pusty)
- [ ] Domena z OVH podpięta (rekordy A i CNAME, [pkt 2.3](#23-podpięcie-domeny-z-ovh-do-netlify)), HTTPS aktywne
- [ ] `curl -I` dla `/stack` i `/stack/` (trailing slash), 404 działa
- [ ] Rekord TXT i mapa strony w Google Search Console

**Wersje**

- [ ] Node: zostajemy przy 24 albo przechodzimy na 26 (po 28.10.2026). Zmiana w trzech miejscach: `.nvmrc`, `netlify.toml`, `engines`.

## Źródła

- [aino.agency: Awwwards SOTD](https://www.awwwards.com/sites/aino-agency)
- [aino.agency: case study Visuelle](https://visuelle.co.uk/aino-agency/)
- [Offscreen Canvas: WebGL ASCII (analiza efektu aino)](https://offscreencanvas.com/issues/webgl-ascii/)
- [Design Everywhere: Aino](https://designeverywhere.co/work/aino)
- [Netlify: aktualizacja cennika, kwiecień 2026](https://www.netlify.com/changelog/2026-04-14-pricing-updates-april-2026/)
- [Netlify: plany kredytowe](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Netlify: formularze, ustawienia](https://docs.netlify.com/manage/forms/setup/)
- [Netlify: zewnętrzny DNS](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/)
- [Netlify: prywatne projekty domyślnie](https://www.netlify.com/changelog/2026-07-28-start-with-private-project-urls/)
- [Netlify Database: rozliczanie](https://docs.netlify.com/build/data-and-storage/netlify-database/billing-and-usage/)
- [AWS: plany Free i Paid](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html)
- [AWS: DynamoDB, darmowy pakiet](https://aws.amazon.com/free/database/)
- [Supabase: pauzowanie projektów Free](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Neon: limity planu Free](https://neon.com/faqs/free-plan-limits-and-quotas)
- [OVHcloud: domeny .pl](https://www.ovhcloud.com/pl/domains/tld/pl/)
- [NASK: cennik dla rejestratorów](https://dns.pl/en/price_list_for_registrars)
- [Porównanie odnowień domen](https://kupnodomen.pl/najtansze-odnowienie-domen/)
- [Umami: cennik i FAQ](https://docs.umami.is/docs/cloud/faq)
- [Umami: omijanie adblocków](https://docs.umami.is/docs/bypass-ad-blockers)
- [Next.js: eksport statyczny](https://nextjs.org/docs/app/guides/static-exports)
- [Harmonogram wydań Node.js](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json)
- [Claude Code: aplikacja desktopowa](https://code.claude.com/docs/en/desktop)
- [Webflow: GSAP jest w 100% darmowy](https://webflow.com/blog/gsap-becomes-free)
