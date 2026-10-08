# Faza 3: Kursor z emoji, pole pikseli z „wybuchem” i nawigacja

> **Status:** ⚪ nie rozpoczęta (wymaga ukończenia fazy 2)
> **Poprzednia:** [Faza 2](./faza-2-animacja-startowa.md) · **Następna:** [Faza 4](./faza-4-podstrony-i-tresci.md)

## Warunek ukończenia (z briefu)

Faza jest gotowa po stworzeniu **nawigacji**. Może działać przez scroll i karty, z **doświadczeniem**,
**stackiem technologicznym**, **uczelnią** oraz **linkami do innych portfoliów**.
Do tego animowany kursor i pozostałe animacje.

## Cel

Druga część strony głównej, pod profilem ze zdjęciem:

1. **Pole migających kwadratów** w odcieniach szarości (inspiracja: craft.wild.as). Kliknięcie wywołuje **„wybuch”**,
   który odsłania linki do innych CV i **zapisuje w API wpis z datą wybuchu**.
2. **Animowany kursor** z emoji, które **zmienia się przy przechodzeniu między sekcjami**.
3. **Nawigacja** przez scroll i karty: doświadczenie, stack, uczelnia, linki do portfolio.
4. Efekty przy **dotyku** na telefonach.

## Kontekst dla sesji AI

- Referencja craft.wild.as nie dała się otworzyć z mojego środowiska, więc efekt opisuję na podstawie briefu.
  Jeśli jakiś szczegół jest ważny, **nagraj krótki film ekranu** albo zrób zrzuty, a dopasujemy efekt.
- Reużywamy z fazy 2: `Ticker`, `PointerTracker`, `QualityGovernor`.
- API i magazyn: kontrakt z [fazy 1, sekcja 5](./faza-1-stack-i-architektura.md#5-architektura).
- Obowiązują [zasady wydajności z fazy 1, pkt 7.4](./faza-1-stack-i-architektura.md#74-zasady-wydajności-animacji-wspólne-dla-faz-2-do-4).

## Zakres

**W zakresie:** kursor i emoji per sekcja, pole pikseli, wybuch i odsłonięcie linków, funkcja Netlify `/api/explosions`
z zapisem w magazynie (rekomendacja: Netlify Blobs), licznik wybuchów, sekcje jako karty na stronie głównej, nagłówek z nawigacją, płynny scroll, efekty dotyku.

**Poza zakresem:** pełne treści i podstrony (faza 4), wysyłka formularza (faza 5).

---

## 3.1 Kursor z emoji (desktop)

- Włączony tylko na urządzeniach z myszą: `(hover: hover) and (pointer: fine)`.
  Systemowy kursor chowamy dopiero wtedy, gdy własny jest gotowy, żeby nigdy nie zostać bez kursora.
- **Budowa:** kropka podąża 1:1, a większy „bąbel” z emoji podąża z opóźnieniem (interpolacja o współczynniku ok. 0,15 do 0,2).
- **Stany:** nad linkiem i kartą bąbel rośnie i pokazuje etykietę z atrybutu `data-cursor-label` (np. „Otwórz”, „Wysadź!”).
  Typ interakcji określa atrybut `data-cursor="link | card | explode | text"`.
- **Emoji per sekcja** z atrybutu `section[data-emoji]`. Sekcję „w środku ekranu” wykrywa `IntersectionObserver` z `rootMargin: -45% 0px`.

  | Sekcja            | Emoji              |
  | ----------------- | ------------------ |
  | O mnie            | 👋                 |
  | Pole pikseli      | 💥 (nad polem: 🧨) |
  | Doświadczenie     | 💼                 |
  | Stack             | 🛠️                 |
  | Uczelnia          | 🎓                 |
  | Portfolio / linki | 🔗                 |
  | Kontakt           | ✉️                 |

- **Zmiana emoji:** zmniejszenie z obrotem, podmiana, sprężyste powiększenie (GSAP, ok. 250 ms).
- **Implementacja:** `components/layout/Cursor/` plus `CursorProvider` (kontekst z `setCursorState`).
  Pozycja zmienia się przez `transform: translate3d()` w `Ticker`, bez ponownego renderowania Reacta w każdej klatce.
  Kursor siedzi w `app/layout.tsx`, więc przeżywa przejścia między podstronami.
- **Wygląd emoji:** emoji systemowe wyglądają inaczej na Windowsie, macOS i Androidzie. Opcje do decyzji:
  emoji systemowe (0 kB) albo spójny zestaw SVG, np. Fluent Emoji (MIT).
  Na szarej stronie kolorowe emoji mogą być jedynym akcentem kolorystycznym.

## 3.2 Pole pikseli i wybuch

**Wygląd w spoczynku:**

- Siatka kwadratów na canvasie: komórka 8 do 16 px, odstęp 1 do 2 px, 5 do 8 odcieni szarości.
- Każda komórka miga w swoim rytmie (losowa faza i prędkość). W każdej klatce zmienia się ok. 3 do 8% komórek.
- **Blisko kursora albo palca** komórki jaśnieją i lekko rosną (promień R). Co jakiś czas przez pole przechodzi fala.
- Nad polem widać licznik z API, np. „Wysadzone już 1 234 razy”.

**Wybuch po kliknięciu lub dotknięciu:**

1. Od punktu kliknięcia rozchodzi się **fala uderzeniowa**: pierścień komórek błyska na biało i gaśnie.
2. Kwadraty z centrum **wylatują jak odłamki** (fizyka z fazy 2), ekran lekko drga (2 do 4 px przez ok. 200 ms; wyłączone przy reduced-motion).
3. Po ok. 800 ms w oczyszczonym miejscu **składają się karty z linkami do innych CV/portfoliów**
   (kwadraty „zlatują się” w karty albo karty pojawiają się kolejno).
4. Pojawia się podpis „Wybuch #1235 · 08.10.2026, 11:32” z odpowiedzi API.
5. Na Androidzie krótka wibracja (`navigator.vibrate?.(30)`).

**Moduły:** `engine/pixels/PixelField.ts`, `engine/pixels/Shockwave.ts`, `engine/pixels/Debris.ts`, `components/sections/PixelField/`.

## 3.3 Zapis wybuchu w API

- Funkcja Netlify `netlify/functions/explosions.ts` (format `export default`, trasa `config.path = '/api/explosions'`):
  `POST` zapisuje wybuch, `GET` zwraca statystyki.
- Zapis idzie przez interfejs `ExplosionStore` ([faza 1, pkt 5.3](./faza-1-stack-i-architektura.md#53-magazyn-za-interfejsem)).
  Domyślna implementacja `BlobsExplosionStore` (`@netlify/blobs`): jeden obiekt na wybuch, klucz = data ISO + losowy sufiks.
  Zmiana magazynu (DynamoDB, Postgres) dotyka tylko tej klasy.
- `POST`: walidacja Zod (`@shared/schemas`), data nadawana na serwerze, odpowiedź `{ explosion, total }`.
- `GET`: statystyki (`total`, `lastAt`) z nagłówkiem `Cache-Control: public, max-age=60`, żeby nie liczyć wpisów przy każdej wizycie.
- **Front:** `src/api/explosions.ts` (klient `fetch`) oraz hooki `useExplosionStats()` (`useQuery`) i `useExplodeMutation()` (`useMutation`, 2 ponowienia).
- **Animacja nie czeka na sieć.** Licznik zwiększamy od razu (optymistycznie) i korygujemy po odpowiedzi.
- **Ochrona limitów:** klient wysyła maksymalnie 1 wybuch na 3 s, funkcja odrzuca nieprawidłowe dane. Kredyty Netlify są zużywane znikomo,
  a twardy limit planu Free chroni przed rachunkiem.
- **Lokalnie:** `npm run dev:full` (Netlify CLI) uruchamia stronę razem z funkcjami i lokalnym magazynem Blobs.
- **Weryfikacja zapisu:** panel Netlify → _Blobs_ (po deployu) albo `netlify blobs:list explosions` lokalnie.

## 3.4 Nawigacja i sekcje (karty)

**Kolejność na stronie głównej `/`:**

1. Intro → O mnie (faza 2)
2. Pole pikseli → linki do innych CV
3. Doświadczenie: karty na osi czasu
4. Stack: kafle technologii z informacją, gdzie były używane
5. Uczelnia
6. Kontakt: zaślepka (formularz w fazach 4 i 5)

**Nagłówek:**

- Przypięty, minimalistyczny. Linki prowadzą do sekcji (kotwice) i do podstron.
- Wskaźnik aktywnej sekcji (`IntersectionObserver`) i cienki pasek postępu scrolla.
- Na telefonie menu pełnoekranowe, pozycje pojawiają się kolejno.

**Scroll i karty:**

- Lenis (płynny scroll) zsynchronizowany z GSAP ScrollTrigger. Karty wjeżdżają kolejno przy wejściu sekcji w widok.
- **Doświadczenie:** desktop to poziomy pas kart przypięty podczas scrolla (pin + ScrollTrigger). Telefon to pionowa lista lub przesuwanie z `scroll-snap`.
- Karty lekko przechylają się w 3D za kursorem, a przyciski są „magnetyczne”.
- Każda karta prowadzi do szczegółów na podstronie (faza 4).

**Dane:** typowane pliki w `src/content/` (`experience.ts`, `skills.ts`, `education.ts`, `portfolioLinks.ts`).
Typy `ExperienceItem`, `SkillItem`, `EducationItem` i `PortfolioLink` leżą w `@/types`. W tej fazie mogą to być treści robocze.

## 3.5 Telefony (dotyk)

- Bez własnego kursora. Zamiast niego **fala w miejscu dotknięcia** (canvas albo CSS).
- Przy zmianie sekcji emoji „wyskakuje” na chwilę przy krawędzi ekranu, jako odpowiednik zmiany emoji w kursorze.
- Przesuwanie palcem po polu pikseli rozświetla komórki, a stuknięcie wywołuje wybuch.
- Przechylanie kart 3D wyłączone, efekty hover zastąpione stanem `:active`.

---

## Etapy

| #   | Etap                                                                        | Wynik                                     |
| --- | --------------------------------------------------------------------------- | ----------------------------------------- |
| 3.1 | Kursor: kropka, bąbel, stany, `CursorProvider`                              | Kursor działa na stronie głównej          |
| 3.2 | Emoji per sekcja i animacja zmiany                                          | Emoji zmienia się przy scrollu            |
| 3.3 | Pole pikseli: migotanie, reakcja na kursor i dotyk                          | Efekt w spoczynku zaakceptowany           |
| 3.4 | Wybuch: fala, odłamki, odsłonięcie kart z linkami                           | Pełna sekwencja wybuchu                   |
| 3.5 | Funkcja `/api/explosions` z `ExplosionStore`, hooki TanStack Query, licznik | Wpis z datą w magazynie po każdym wybuchu |
| 3.6 | Sekcje i karty, nagłówek, Lenis i ScrollTrigger                             | Działająca nawigacja                      |
| 3.7 | Efekty dotyku na telefonie                                                  | Działa na iOS i Androidzie                |
| 3.8 | Wydajność, testy, przegląd z autorem                                        | Akceptacja                                |

## Kryteria ukończenia

- [ ] Nawigacja działa przez scroll i karty: doświadczenie, stack, uczelnia, linki do portfoliów
- [ ] Kursor z emoji zmienia się między sekcjami (desktop). Na telefonie działają efekty dotyku
- [ ] Wybuch odsłania linki do innych CV, a **w magazynie powstaje wpis z datą** (sprawdzone lokalnie przez Netlify CLI, a po deployu w panelu)
- [ ] Brak sieci nie psuje animacji ani linków
- [ ] Spełniony budżet wydajności z fazy 2 (60 fps desktop, ≥ 50 fps telefon), także w trakcie wybuchu
- [ ] Testy: Vitest (silnik pikseli, walidacja API), Playwright (klik → linki widoczne, żądanie `POST` wysłane)
- [ ] Autor zaakceptował wygląd

## Ryzyka

| Ryzyko                                          | Co robimy                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Boty nabijają wybuchy                           | Ograniczenie po stronie klienta, walidacja w funkcji, licznik tylko informacyjny |
| Konflikt Lenis i ScrollTrigger (skoki, poślizg) | Jedna pętla: `lenis.raf` wywoływany w tickerze GSAP                              |
| Za dużo naraz (dwa canvasy, kursor, scroll)     | Canvasy poza ekranem są pauzowane, a kursor używa tylko `transform`              |

## Pytania do autora

1. Lista innych CV i portfoliów do kart po wybuchu (nazwa, adres, krótki opis).
2. Czy każde kliknięcie liczy się jako wybuch, czy tylko pierwsze w sesji?
3. Magazyn wybuchów: Netlify Blobs (rekomendowane) czy DynamoDB ([faza 1, sekcja 3](./faza-1-stack-i-architektura.md#3-magazyn-wybuchów-dynamodb-supabase-czy-coś-prostszego))?
4. Emoji systemowe czy spójny zestaw SVG?
5. Czy podpis „Wybuch #N” ma być publiczny?
