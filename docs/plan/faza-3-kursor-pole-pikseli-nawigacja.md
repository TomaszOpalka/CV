# Faza 3: Kursor z emoji, pole pikseli z „wybuchem” i nawigacja

> **Status:** 🟡 w toku (branch `feat/phase-3-cursor-pixels-nav`, bazuje na `develop` z ukończoną fazą 2)
> **Poprzednia:** [Faza 2](./faza-2-animacja-startowa.md) · **Następna:** [Faza 4](./faza-4-podstrony-i-tresci.md)

## Warunek ukończenia (z briefu)

Faza jest gotowa po stworzeniu **nawigacji**. Może działać przez scroll i karty, z **doświadczeniem**,
**stackiem technologicznym**, **uczelnią** oraz **linkami do innych portfoliów**.
Do tego animowany kursor i pozostałe animacje.

## Cel

Druga część strony głównej, pod profilem ze zdjęciem:

1. **Pole migających kwadratów** w odcieniach szarości (inspiracja: craft.wild.as). Kliknięcie wywołuje **„wybuch”**,
   który odsłania linki do innych CV. **Wybuch jest wyłącznie kliencki: nic nie zapisujemy w API ani w bazie, nie ma licznika wybuchów**
   (decyzja autora z 10.10.2026: szkoda czasu, strona ma być gotowa jak najszybciej).
2. **Animowany kursor** z emoji, które **zmienia się przy przechodzeniu między sekcjami**.
3. **Nawigacja** przez scroll i karty: doświadczenie, stack, uczelnia, linki do portfolio.
4. Efekty przy **dotyku** na telefonach.

## Kontekst dla sesji AI

- Referencja craft.wild.as nie dała się otworzyć z mojego środowiska, więc efekt opisuję na podstawie briefu.
  Jeśli jakiś szczegół jest ważny, **nagraj krótki film ekranu** albo zrób zrzuty, a dopasujemy efekt.
- Reużywamy z fazy 2: `Ticker`, `PointerTracker`, `QualityGovernor`.
- Bez API i bazy: faza 3 jest w całości kliencka.
- Obowiązują [zasady wydajności z fazy 1, pkt 7.4](./faza-1-stack-i-architektura.md#74-zasady-wydajności-animacji-wspólne-dla-faz-2-do-4).

## Zakres

**W zakresie:** kursor i emoji per sekcja, pole pikseli, wybuch i odsłonięcie linków, sekcje jako karty na stronie głównej,
nagłówek z nawigacją, płynny scroll, efekty dotyku.

**Zrezygnowano (10.10.2026):** funkcja `/api/explosions`, magazyn wybuchów (Netlify Blobs / DynamoDB), licznik „Wysadzone już N razy”,
podpis „Wybuch #N”. Strona nie ma żadnej bazy danych.

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

**Wybuch po kliknięciu lub dotknięciu:**

1. Od punktu kliknięcia rozchodzi się **fala uderzeniowa**: pierścień komórek błyska na biało i gaśnie.
2. Kwadraty z centrum **wylatują jak odłamki** (fizyka z fazy 2), ekran lekko drga (2 do 4 px przez ok. 200 ms; wyłączone przy reduced-motion).
3. Po ok. 800 ms w oczyszczonym miejscu **składają się karty z linkami do innych CV/portfoliów**
   (kwadraty „zlatują się” w karty albo karty pojawiają się kolejno).
4. Na Androidzie krótka wibracja (`navigator.vibrate?.(30)`).

**Moduły:** `engine/pixels/PixelField.ts`, `engine/pixels/Shockwave.ts`, `engine/pixels/Debris.ts`, `components/sections/PixelField/`.

## 3.3 Wybuch bez zapisu (zmiana planu z 10.10.2026)

Pierwotnie wybuch miał zapisywać wpis z datą w API (Netlify Functions + Blobs) i pokazywać licznik. Z tego **rezygnujemy**:
wybuch jest czysto kliencki, więc nie ma sieci, bazy, kosztów, limitów ani ochrony przed botami. Konsekwencje:

- Wybuch zawsze działa, także offline. Nie ma stanów ładowania ani błędów zapisu.
- Nie używamy TanStack Query w tej fazie (wróci przy formularzu, jeśli będzie potrzebny).
- Nie dodajemy `@netlify/blobs` ani żadnych kluczy. Dawny kontrakt API wybuchów został usunięty z `src/shared`.
- Jeśli kiedyś wrócimy do licznika, wystarczy dodać funkcję i klienta, nie zmieniając animacji.

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

| #   | Etap                                               | Wynik                            |
| --- | -------------------------------------------------- | -------------------------------- |
| 3.1 | Kursor: kropka, bąbel, stany, `CursorProvider`     | Kursor działa na stronie głównej |
| 3.2 | Emoji per sekcja i animacja zmiany                 | Emoji zmienia się przy scrollu   |
| 3.3 | Pole pikseli: migotanie, reakcja na kursor i dotyk | Efekt w spoczynku zaakceptowany  |
| 3.4 | Wybuch: fala, odłamki, odsłonięcie kart z linkami  | Pełna sekwencja wybuchu          |
| 3.5 | Sekcje i karty, nagłówek, Lenis i ScrollTrigger    | Działająca nawigacja             |
| 3.6 | Efekty dotyku na telefonie                         | Działa na iOS i Androidzie       |
| 3.7 | Wydajność, testy, przegląd z autorem               | Akceptacja                       |

## Stan realizacji (implementacja)

Zrobione na branchu `feat/phase-3-cursor-pixels-nav`: nagłówek z postępem i menu mobilnym, Lenis (jedna pętla przez `gsap.ticker`), blokada
scrolla w trakcie intro, kursor z emoji (desktop), pole pikseli z wybuchem i odsłanianiem linków (przycisk „Reveal links” dla klawiatury,
przycisk „Rebuild”), efekty dotyku, pojawianie się elementów przy scrollu, sekcje: Experience, Stack, Education, Contact (placeholder).

Świadomie odłożone na fazę 4 (razem z prawdziwą treścią CV): poziomy pin sekcji Experience (przy 3 kartach placeholderów dałby tylko ryzyko
dla dostępności i mobile), animacja rozwijania kart, fizyczny „tilt” kart i przyciski magnetyczne. Treści w `src/content/*` to **placeholdery**.

### Zmiana po przeglądzie autora (10.10.2026)

- **Motyw kolorystyczny (decyzja autora):** szarości i biel jako baza plus jeden akcent, pomarańcz z palety FIRE intro. Rampa ciepła (`HEAT_RAMP`):
  ciemnoszary, szary, biały, pomarańcz, gorący pomarańcz. Ikony kursora mogą mieć własne kolory (biały, zielony, cyjan, pomarańcz).
- **Pole pikseli** jest od ściany do ściany ekranu i składa się z cyfr jak intro (zimne cyfry to ledwo widoczna ściana liczb, rysowana raz do offscreen canvas).
  Najechanie rozgrzewa cyfry, przytrzymanie powiększa plamę, a pełne naładowanie (~1,8 s) uruchamia wybuch i odsłania linki. Brzegi plamy stygną nierówno.
  Silnik pozostaje Canvas 2D z atlasem cyfr z intro. PixiJS/WebGL: do decyzji dopiero po pomiarze fps na telefonie.
- **Kursor** jest z cyfr: pełnoekranowy, przezroczysty canvas z „kometą” z siatki ciepła, która stygnie i znika w pół sekundy. W spoczynku i nad linkami/kartami
  zamienia się w dużą ikonę z cyfr (siatka 13×9, jasny obrys i przygaszone wypełnienie, żeby treść pod spodem była czytelna) z etykietą.
  Nad polem pikseli komety nie ma (pole samo się rozgrzewa), jest mały krzyżyk z cyfr. Emoji zostały już tylko w efektach dotyku.
- **Dotyk:** przy wejściu w nową sekcję na górze (pod nagłówkiem) pojawia się na 0,9 s ta sama ikona z cyfr co przy kursorze (zamiast emoji).
- **Napisy dekodują się z cyfr** przy pierwszym wejściu w ekran (nagłówki sekcji i kart, nawigacja, „Hire me”), a potem rzadko (co kilka sekund,
  jeden napis naraz, 0,17 s) jedna litera zamienia się w cyfrę, nigdy obok drugiej cyfry. Kopia dla czytników ekranu zawsze ma prawdziwy tekst.
- **Przycisk „Hire me”** w nagłówku (schodkowe rogi), prowadzi do sekcji Contact.
- **Intro zawsze startuje od góry** (`scrollRestoration = 'manual'`): bez tego przeładowanie przywracało pozycję scrolla, blokada scrolla zamrażała stronę
  przesuniętą w dół i na dole intro pojawiał się czarny pas. Lenis i GSAP ładują się dopiero po intro.

## Kryteria ukończenia

- [x] Nawigacja działa przez scroll i karty: doświadczenie, stack, uczelnia, linki do portfoliów
- [x] Kursor z emoji zmienia się między sekcjami (desktop). Na telefonie działają efekty dotyku
- [x] Wybuch odsłania linki do innych CV (bez zapisu i bez licznika, działa także offline)
- [ ] Spełniony budżet wydajności z fazy 2 (60 fps desktop, ≥ 50 fps telefon), także w trakcie wybuchu
- [x] Testy: Vitest (silnik pikseli), Playwright (klik → linki widoczne, nawigacja, sekcje)
- [ ] Autor zaakceptował wygląd

## Ryzyka

| Ryzyko                                          | Co robimy                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| Konflikt Lenis i ScrollTrigger (skoki, poślizg) | Jedna pętla: `lenis.raf` wywoływany w tickerze GSAP                 |
| Za dużo naraz (dwa canvasy, kursor, scroll)     | Canvasy poza ekranem są pauzowane, a kursor używa tylko `transform` |

## Pytania do autora

1. Lista innych CV i portfoliów do kart po wybuchu (nazwa, adres, krótki opis).
2. Czy po wybuchu pole ma się odbudowywać (można wysadzać wielokrotnie), czy wybuch jest jednorazowy?
3. Emoji systemowe czy spójny zestaw SVG? (do czasu odpowiedzi: emoji systemowe, wymienialne jedną zmianą)
