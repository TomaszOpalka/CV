# Faza 2: Animacja startowa → zdjęcie i „O mnie”

> **Status:** ⚪ nie rozpoczęta (wymaga ukończenia fazy 1)
> **Poprzednia:** [Faza 1](./faza-1-stack-i-architektura.md) · **Następna:** [Faza 3](./faza-3-kursor-pole-pikseli-nawigacja.md)

## Warunek ukończenia (z briefu)

Faza jest ukończona po akceptacji autora, gdy projekt **buduje się prawidłowo**, **obsługuje telefony** i jest
**zoptymalizowany tak, żeby nic się nie zacinało**. Faza **kończy się na widoku ze zdjęciem i opisem „O mnie”**.

## Cel

Odtworzyć klimat intro z aino.agency: siatkę cyfr, która żyje, reaguje na kursor i rozpada się po kliknięciu.
Po kliknięciu cyfry **układają się w portret autora po prawej stronie**, który przechodzi w prawdziwe zdjęcie,
a po lewej pojawia się tekst „O mnie”.

## Kontekst dla sesji AI

- Referencja: aino.agency. Siatka znaków przeliczana co klatkę, prosta fizyka 2D, morphing; bez WebGL i bez video.
  Szczegóły w [fazie 1, pkt 1.1](./faza-1-stack-i-architektura.md#11-jak-zrobiona-jest-animacja-na-ainoagency-threejs-video).
- My rysujemy na **Canvas 2D** własnym silnikiem w TypeScript (`apps/web/src/engine/`), bez Reacta w pętli.
- Obowiązują [zasady wydajności z fazy 1, pkt 6.4](./faza-1-stack-i-architektura.md#64-zasady-wydajności-animacji-wspólne-dla-faz-2-do-4).
- Konwencje nazw, typów i Sass: [faza 1, sekcja 6](./faza-1-stack-i-architektura.md#6-konwencje).

## Zakres

**W zakresie:** intro z cyframi, reakcja na kursor i dotyk, wybuch po kliknięciu, morphing w portret, przejście w zdjęcie,
sekcja „O mnie”, przycisk „Pomiń intro”, wersja `prefers-reduced-motion`, optymalizacja na telefony.

**Poza zakresem:** kursor z emoji, pole migających kwadratów, zapis do API (faza 3), podstrony (faza 4), formularz (faza 5).

---

## Scenariusz animacji

| Scena | Czas (orient.) | Co się dzieje |
|---|---|---|
| **S0 Start** | 0 do ok. 1,2 s | Ciemnoszare tło. Siatka losowych cyfr pojawia się kaskadą, wiersz po wierszu. Licznik `000 → 100` pokazuje **prawdziwy** postęp ładowania (zdjęcie, font). Nie przeciągamy sztucznie powyżej ok. 1,5 s |
| **S1 Zaproszenie** | do kliknięcia | Cyfry „oddychają”: w każdej klatce zmienia się ok. 5% komórek. Kursor albo palec **odpycha** cyfry w promieniu R. Na środku z cyfr złożony jest napis zachęty, np. `[ KLIKNIJ ]` |
| **S2 Wybuch** | ok. 0 do 0,6 s po kliknięciu | Impuls od punktu kliknięcia: cyfry rozlatują się, prędkość maleje z odległością. Lekkie tarcie i grawitacja |
| **S3 Morph** | ok. 0,6 do 1,8 s | Każda cyfra dostaje cel. **Prawa połowa** układa się w portret z cyfr (jasność zdjęcia → gęstość cyfry). **Lewa połowa** układa się w nagłówek (imię i nazwisko) efektem „dekodowania”. Sprężyny ściągają cyfry do celów, nadmiarowe gasną |
| **S4 Odsłonięcie** | ok. 1,8 do 2,6 s | Portret z cyfr przechodzi w **prawdziwe zdjęcie**: pikselizacja maleje od 24 px do 1 px. Tekst „O mnie” wjeżdża linia po linii (GSAP SplitText). Canvas wygasza się i **zatrzymuje pętlę**, żeby oszczędzać baterię |
| **S5 Widok końcowy** | n/d | Desktop: tekst po lewej, zdjęcie po prawej. Telefon: zdjęcie nad tekstem. Strzałka „przewiń” prowadzi do fazy 3 |

**Opcjonalnie, jeśli zostanie zapas wydajności:** po odsłonięciu, przy najechaniu na zdjęcie, wokół kursora na chwilę
wracają cyfry (efekt „soczewki”).

**Powrót na stronę:** flaga w `sessionStorage` włącza skróconą wersję intro (ok. 0,6 s) albo od razu widok końcowy.

---

## Technika

### Moduły silnika: `apps/web/src/engine/`

| Plik | Odpowiedzialność |
|---|---|
| `core/Ticker.ts` | Jedna pętla `requestAnimationFrame`, czas między klatkami, pauza i wznowienie |
| `core/PointerTracker.ts` | Pointer Events: pozycja w układzie canvasu, prędkość ruchu, dotyk |
| `core/QualityGovernor.ts` | Średni fps (wygładzony). Przy spadku powiększa komórkę i zmniejsza liczbę cząstek |
| `glyph/GlyphAtlas.ts` | Raz rysuje cyfry `0` do `9` fontem monospace w kilku odcieniach szarości. Liczy „ilość tuszu” każdej cyfry, żeby zbudować rampę jasności |
| `glyph/GlyphField.ts` | Cząstki w `Float32Array`: pozycja, prędkość, cel, indeks glifu, przezroczystość |
| `glyph/PortraitSampler.ts` | Rysuje zdjęcie w siatce `kolumny × wiersze`, liczy jasność (`0.2126R + 0.7152G + 0.0722B`), stosuje krzywą kontrastu i dobiera cyfrę z rampy |
| `glyph/forces.ts` | Czyste funkcje: odpychanie, impuls wybuchu, sprężyna do celu (całkowanie semi-implicit Euler) |
| `glyph/Canvas2DRenderer.ts` | Rysowanie z atlasu przez `drawImage`. Implementuje `GlyphRenderer`, żeby w planie B podmienić go na OGL |

### Komponenty React

| Komponent / hook | Rola |
|---|---|
| `components/sections/Intro/` | Komponent kliencki. Ładuje silnik dynamicznie (`next/dynamic`, `ssr: false`), montuje canvas |
| `components/sections/About/` | Tekst „O mnie” i zdjęcie (`<picture>` z AVIF i WebP) |
| `components/ui/SkipIntro/` | Przycisk „Pomiń intro”, dostępny też z klawiatury |
| `hooks/useIntroState.ts` | Maszyna stanów: `boot → idle → exploding → morphing → revealed` |
| `hooks/useReducedMotion.ts` | Odczyt `prefers-reduced-motion` |

### Rozmiary siatki (punkt wyjścia do strojenia)

| Ekran | Komórka | Siatka | Komórek |
|---|---|---|---|
| Desktop 1440×900 | 12 px | 120 × 75 | ok. 9 000 |
| Telefon 390×844 | 10 px | 39 × 84 | ok. 3 300 |

### Zdjęcie

- Plik `public/img/portrait/portrait.avif` (+ `.webp` jako zapas), maks. ok. 120 kB.
- Tło jednolite albo wycięte (Photopea). Wysoki kontrast twarzy, bo od tego zależy czytelność portretu z cyfr.
- Ten sam plik zasila `PortraitSampler` (próbkowanie w przeglądarce trwa milisekundy, więc nie trzeba niczego generować przy buildzie).

### Dostępność i SEO

- Canvas ma `aria-hidden="true"`. Prawdziwy `<h1>` i tekst „O mnie” są **w DOM od początku** (ukryte wizualnie do sceny S4).
  Dzięki temu czytniki ekranu i wyszukiwarki widzą treść.
- Wybuch można uruchomić z klawiatury: `Enter` lub `Spacja`, z widocznym fokusem.
- `prefers-reduced-motion`: od razu widok końcowy z łagodnym pojawieniem się zdjęcia.

### Telefony

- Dotknięcie działa jak kliknięcie, a przesuwanie palcem odpycha cyfry.
- `touch-action: none` **tylko na canvasie intro i tylko do kliknięcia**. Potem przywracamy normalny scroll.
- Obrót ekranu i zmiana rozmiaru przebudowują siatkę z opóźnieniem (debounce).
- Wysokość sekcji w `100svh`, żeby nie skakała przy chowającym się pasku adresu w Safari na iOS.
- Wibracja przy wybuchu (`navigator.vibrate?.(30)`) działa tylko na Androidzie. iOS jej nie obsługuje i to jest w porządku.

### Budżet wydajności

| Metryka | Cel |
|---|---|
| Płynność na desktopie | 60 fps |
| Płynność na średnim telefonie z Androidem | **≥ 50 fps**, bez widocznych przycięć przy kliknięciu |
| Długie zadania na głównym wątku | < 50 ms |
| LCP (tekst lub zdjęcie) | < 2,5 s |
| Paczka JS intro (bez Reacta i Next) | ≤ 40 kB gzip |
| Lighthouse mobile | Performance ≥ 85, Accessibility ≥ 95 |

Pomiar: Chrome DevTools (Performance, spowolnienie CPU 4×) **oraz prawdziwy telefon**.
Gdy Canvas 2D nie spełni budżetu, przechodzimy na renderer OGL (plan B z fazy 1).
Kolejną opcją jest `OffscreenCanvas` w Web Workerze.

### Testy

- **Vitest:** `PortraitSampler` (rampa jasności), `forces.ts` (sprężyna się stabilizuje, impuls maleje z odległością), maszyna stanów.
- **Playwright:** wejście → klik → widoczne „O mnie” i zdjęcie; ścieżka „Pomiń intro”; ścieżka reduced-motion; zrzut ekranu w 2 rozdzielczościach.

---

## Etapy

| # | Etap | Wynik |
|---|---|---|
| 2.1 | **Prototyp w izolacji** (`/lab/intro`, tylko w dev): siatka cyfr, odpychanie, wybuch | Pomiar fps na desktopie i telefonie, decyzja Canvas 2D czy OGL |
| 2.2 | **Portret z cyfr**: próbkowanie zdjęcia, rampa cyfr, strojenie kontrastu | Autor akceptuje wygląd twarzy z cyfr |
| 2.3 | **Choreografia**: maszyna stanów i timeline GSAP (S0 do S5) | Pełna sekwencja na desktopie |
| 2.4 | **Sekcja „O mnie”**: layout, typografia, tekst od autora | Gotowy widok końcowy |
| 2.5 | **Telefony i dostępność**: dotyk, obrót, reduced-motion, „Pomiń intro”, powrót na stronę | Działa na iOS i Androidzie |
| 2.6 | **Optymalizacja**: QualityGovernor, pauza poza ekranem, lazy-load, Lighthouse, test na telefonie | Spełniony budżet wydajności |
| 2.7 | **Przegląd z autorem** i poprawki | Akceptacja |

## Kryteria ukończenia

- [ ] Autor zaakceptował wygląd i tempo animacji
- [ ] `pnpm build` przechodzi bez błędów TypeScript i ESLint, a deploy na domenę działa
- [ ] Działa w Chrome, Firefox, Safari (macOS i iOS) oraz Chrome na Androidzie
- [ ] Spełniony budżet wydajności: 60 fps desktop, ≥ 50 fps średni telefon, brak przycięć przy kliknięciu
- [ ] Widok końcowy: zdjęcie po prawej i tekst po lewej (desktop), poprawny układ na telefonie
- [ ] Działają „Pomiń intro”, klawiatura i `prefers-reduced-motion`

## Ryzyka

| Ryzyko | Co robimy |
|---|---|
| Portret z cyfr nieczytelny | Mocniejszy kontrast, mniejsza komórka tylko w obszarze twarzy, inne zdjęcie |
| Spadki fps na słabych telefonach | QualityGovernor, renderer OGL, mniej cząstek na mobile |
| Font monospace ładuje się po starcie animacji | `next/font` z `preload`. Atlas glifów budujemy dopiero po `document.fonts.ready` |

## Pytania do autora

1. Treść „O mnie”: 2 do 4 zdań plus rola/tytuł. Mogę przygotować szkic, jeśli podeślesz CV lub link do LinkedIna.
2. Napis zachęty w scenie S1: „KLIKNIJ”, „ENTER” czy coś własnego?
3. Czy intro ma pokazywać się przy każdej wizycie, czy tylko przy pierwszej w sesji?
