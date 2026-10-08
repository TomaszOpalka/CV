# Faza 2: Animacja startowa → zdjęcie i „O mnie”

> **Status:** 🟢 zbudowana i przetestowana lokalnie, czeka na przegląd autora (PR do `main`)
> **Poprzednia:** [Faza 1](./faza-1-stack-i-architektura.md) · **Następna:** [Faza 3](./faza-3-kursor-pole-pikseli-nawigacja.md)

## Warunek ukończenia (z briefu)

Faza jest ukończona po akceptacji autora, gdy projekt **buduje się prawidłowo**, **obsługuje telefony** i jest
**zoptymalizowany tak, żeby nic się nie zacinało**. Faza **kończy się na widoku ze zdjęciem i opisem „O mnie”**.

## Cel

Odtworzyć klimat intro z aino.agency: siatkę cyfr, która żyje, reaguje na kursor i rozpada się po kliknięciu.
Po kliknięciu cyfry **układają się w portret autora po prawej stronie**, który przechodzi w prawdziwe zdjęcie,
a po lewej pojawia się tekst „O mnie”.

## Stan wdrożenia (08.10.2026)

Zbudowane i działające (desktop i telefon): siatka cyfr reagująca na wskaźnik → wybuch → seria blueprintów (silnik, F1, reaktor, Gwiazda Śmierci, piłka) → zoom i wstrząs → portret z cyfr → pikselowe przejście w zdjęcie →
tekst „O mnie” z nazwiskiem „odkodowującym się” z cyfr. Zdjęcie jest na razie **placeholderem** (sylwetka), podmiana opisana w [`docs/ASSETS.md`](../ASSETS.md).

Odstępstwa od pierwotnego scenariusza (świadome):

| Plan                                                     | Zrobione                                                                                                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lewa połowa cyfr układa się w nagłówek                   | Cyfry formują tylko portret. Nagłówek „odkodowuje się” z cyfr w nazwisko (GSAP ScrambleText). Nagłówek z cyfr przy jednej wielkości siatki byłby nieczytelny                |
| Napis „KLIKNIJ” złożony z cyfr                           | Przycisk `[ click ]` (na telefonie `[ touch ]`) w ramce, dostępny z klawiatury                                                                                              |
| Dotknięcie = kliknięcie                                  | Mysz startuje wybuch od razu. Palec **po stuknięciu** (puszczenie bez przesunięcia), dzięki czemu można najpierw przeciągnąć po cyfrach                                     |
| Powrót na stronę: flaga w `sessionStorage`               | Stan intro w pamięci modułu: nawigacja wewnątrz strony pomija intro, pełne przeładowanie odtwarza je od nowa (wygodne przy pracy nad animacją). `sessionStorage` do decyzji |
| Maszyna stanów w `hooks/useIntroState.ts`                | `engine/intro/introMachine.ts` (czysta) + `introStore.ts` (mały store czytany przez `useSyncExternalStore`)                                                                 |
| `components/sections/About/`, `components/ui/SkipIntro/` | Jeden komponent `sections/Intro/` (tekst i zdjęcie to część tego samego widoku, bo canvas musi znać położenie ramki zdjęcia)                                                |

Przegląd adwersarialny (5 recenzentów, 45 agentów): 20 znalezisk, 19 potwierdzonych. Naprawione w tej fazie (poza „powrotem na stronę”, które jest świadomym odstępstwem z tabeli wyżej), m.in.: oscylacja kontrolera jakości,
fizyka zależna od liczby klatek, treść ukryta przed czytnikami ekranu, pusta strona przy awarii skryptu, utrata fokusu klawiatury, układ telefonu poziomo,
rozmycie przy przejściu na zdjęcie na ekranach 2×, prawy i środkowy klik startujące wybuch.

## Sekwencja po kliknięciu (wersja rozszerzona, 08.10.2026)

Zamiast od razu układać portret, cyfry przechodzą przez serię „blueprintów” rysowanych tym samym silnikiem (jeden canvas, ta sama siatka znaków).
Łącznie ok. 13,5 s, w każdej chwili można pominąć („skip intro”).

| Stan                 | Czas   | Co się dzieje                                                                                                                                    |
| -------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `exploding`          | 0,65 s | Wybuch od miejsca kliknięcia                                                                                                                     |
| `morphingEngine`     | 2,1 s  | Cyfry zbiegają się w silnik V8                                                                                                                   |
| `morphingF1`         | 2,6 s  | Silnik płynnie zamienia się w bolid F1 z lotu ptaka. Cele **przesuwają się** z lewej na prawą (na wąskim ekranie: bolid obrócony, jedzie w górę) |
| `morphingReactor`    | 1,8 s  | Bolid → reaktor łukowy                                                                                                                           |
| `morphingDeathStar`  | 1,8 s  | Reaktor → Gwiazda Śmierci                                                                                                                        |
| `morphingBasketball` | 1,5 s  | Gwiazda Śmierci → piłka do koszykówki                                                                                                            |
| `zooming`            | 1,4 s  | Piłka rośnie (cele i same cyfry skalują się 5,5×), jak lot prosto w kamerę                                                                       |
| `impact`             | 0,8 s  | Wstrząs ekranu (camera shake) i biały błysk. Cyfry **błyskawicznie** (sprężyna 3× sztywniejsza) zbiegają się w portret                           |
| `revealing`          | 1,1 s  | Pikselowe przejście w zdjęcie i tekst „O mnie” (jak wcześniej)                                                                                   |

Jak to działa technicznie:

- Rysunki to małe maski (białe linie na czarnym, `public/assets/blueprints/*.webp`, razem ok. 80 kB), przycięte z grafik od autora skryptem
  `scripts/make-blueprint-masks.py` (usuwa napisy i znaki wodne, odwraca bolid dziobem w prawo). Oryginały **nie** są w repo.
- Próbkowanie (`sampleInk`) mierzy odległość każdego piksela od koloru tła, więc działa dla białych linii na niebieskim, cyjanu na czarnym i odwrotnie.
  Komórka bierze średnią i maksimum, dzięki czemu cienkie linie nie znikają przy zgrubnej siatce.
- Przydział cząstek (`rankAssign`): n-ty cel w kolejności czytania dostaje cząstkę o tej samej randze pozycji, więc lewa część silnika zamienia się w lewą część bolidu
  i morf płynie, zamiast się krzyżować.
- Jeśli któryś obraz się nie wczyta, ten etap jest pomijany; bez zdjęcia profilowego sekwencja przechodzi od razu do widoku końcowego.
- Podmiana obrazów: wrzuć własne maski o tych samych nazwach albo uruchom skrypt na nowych oryginałach (instrukcja w `docs/ASSETS.md`).

## Kontekst dla sesji AI

- Referencja: aino.agency. Siatka znaków przeliczana co klatkę, prosta fizyka 2D, morphing; bez WebGL i bez video.
  Szczegóły w [fazie 1, pkt 1.1](./faza-1-stack-i-architektura.md#11-jak-zrobiona-jest-animacja-na-ainoagency-threejs-video).
- My rysujemy na **Canvas 2D** własnym silnikiem w TypeScript (`src/engine/`), bez Reacta w pętli.
- Obowiązują [zasady wydajności z fazy 1, pkt 7.4](./faza-1-stack-i-architektura.md#74-zasady-wydajności-animacji-wspólne-dla-faz-2-do-4).
- Konwencje nazw, typów i Sass: [faza 1, sekcja 7](./faza-1-stack-i-architektura.md#7-konwencje).

## Zakres

**W zakresie:** intro z cyframi, reakcja na kursor i dotyk, wybuch po kliknięciu, morphing w portret, przejście w zdjęcie,
sekcja „O mnie”, przycisk „skip intro”, wersja `prefers-reduced-motion`, optymalizacja na telefony.

**Poza zakresem:** kursor z emoji, pole migających kwadratów, zapis do API (faza 3), podstrony (faza 4), formularz (faza 5).

---

## Scenariusz animacji

| Scena                | Czas (orient.)               | Co się dzieje                                                                                                                                                                                                                              |
| -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **S0 Start**         | 0 do ok. 1,2 s               | Ciemnoszare tło. Siatka losowych cyfr pojawia się kaskadą, wiersz po wierszu. Licznik `000 → 100` pokazuje **prawdziwy** postęp ładowania (zdjęcie, font). Nie przeciągamy sztucznie powyżej ok. 1,5 s                                     |
| **S1 Zaproszenie**   | do kliknięcia                | Cyfry „oddychają”: w każdej klatce zmienia się ok. 5% komórek. Kursor albo palec **odpycha** cyfry w promieniu R. Na środku z cyfr złożony jest napis zachęty, np. `[ KLIKNIJ ]`                                                           |
| **S2 Wybuch**        | ok. 0 do 0,6 s po kliknięciu | Impuls od punktu kliknięcia: cyfry rozlatują się, prędkość maleje z odległością. Lekkie tarcie i grawitacja                                                                                                                                |
| **S3 Morph**         | ok. 0,6 do 1,8 s             | Każda cyfra dostaje cel. **Prawa połowa** układa się w portret z cyfr (jasność zdjęcia → gęstość cyfry). **Lewa połowa** układa się w nagłówek (imię i nazwisko) efektem „dekodowania”. Sprężyny ściągają cyfry do celów, nadmiarowe gasną |
| **S4 Odsłonięcie**   | ok. 1,8 do 2,6 s             | Portret z cyfr przechodzi w **prawdziwe zdjęcie**: pikselizacja maleje od 24 px do 1 px. Tekst „O mnie” wjeżdża linia po linii (GSAP SplitText). Canvas wygasza się i **zatrzymuje pętlę**, żeby oszczędzać baterię                        |
| **S5 Widok końcowy** | n/d                          | Desktop: tekst po lewej, zdjęcie po prawej. Telefon: zdjęcie nad tekstem. Strzałka „przewiń” prowadzi do fazy 3                                                                                                                            |

**Opcjonalnie, jeśli zostanie zapas wydajności:** po odsłonięciu, przy najechaniu na zdjęcie, wokół kursora na chwilę
wracają cyfry (efekt „soczewki”).

**Powrót na stronę:** flaga w `sessionStorage` włącza skróconą wersję intro (ok. 0,6 s) albo od razu widok końcowy.

---

## Technika

### Moduły silnika: `src/engine/` (czyste TypeScript, bez Reacta)

| Plik                        | Odpowiedzialność                                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/Ticker.ts`            | Jedna pętla `requestAnimationFrame`, ograniczenie skoku czasu, samoczynne zatrzymanie bez subskrybentów                                                    |
| `core/PointerTracker.ts`    | Pointer Events: mysz (start od razu, tylko lewy przycisk), palec (start po stuknięciu, pierwszy palec), `data-intro-ignore`                                |
| `core/QualityGovernor.ts`   | Średnie fps w oknach, histereza, **nigdy nie wraca do poziomu, który był za wolny**, ponowne uzbrojenie po przebudowie                                     |
| `glyph/forces.ts`           | Czyste funkcje: opadanie wpływu, impuls wybuchu, tarcie niezależne od fps, krok sprężyny                                                                   |
| `glyph/portrait.ts`         | Siatka, kadrowanie `cover`, jasność komórek, autopoziomy, rampa cyfr wg „tuszu”, losowość doboru cyfry, przydział celów                                    |
| `glyph/GlyphField.ts`       | Cząstki w tablicach `Float32Array`/`Uint8Array`: fazy `idle`, `explode`, `morph`, `hold`; zero alokacji w klatce; ok. 0,2 ms na klatkę dla 15 tys. cząstek |
| `glyph/GlyphAtlas.ts`       | Cyfry `0`-`9` w 8 poziomach szarości narysowane raz; pomiar „tuszu” każdej cyfry                                                                           |
| `glyph/Canvas2DRenderer.ts` | Jedno `drawImage` na cyfrę, współrzędne w pikselach urządzenia                                                                                             |
| `intro/introMachine.ts`     | Czysta maszyna stanów `boot → idle → exploding → morphing → revealing → done` + czasy etapów                                                               |
| `intro/introStore.ts`       | Stan intro dla Reacta (`useSyncExternalStore`)                                                                                                             |
| `intro/PixelateReveal.ts`   | Zdjęcie od bloków 30 px do 1 px, ostatnia klatka rysowana wprost z pliku, dopasowana do pikseli urządzenia                                                 |
| `intro/IntroController.ts`  | Spina całość: rozmiar, jakość, obraz, cele portretu, pętla, resize, zwolnienie zasobów po zakończeniu                                                      |

### Komponenty React

| Komponent / hook              | Rola                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/sections/Intro/`  | Sekcja: canvas, tekst, ramka zdjęcia, przyciski. Treść w DOM i w drzewie dostępności od pierwszego renderu, animowana tylko przezroczystość |
| `hooks/useIntro.ts`           | Ładuje silnik leniwie, oznacza sekcję `data-armed`, limit 6 s na start silnika, zwalnia kontroler i canvas po zakończeniu                   |
| `hooks/useIntroFocus.ts`      | Oddaje fokus klawiatury po zniknięciu przycisku (do „skip intro”, a po zakończeniu do nagłówka)                                             |
| `hooks/useHeadingScramble.ts` | Nazwisko „odkodowuje się” z cyfr (GSAP ScrambleText); kod GSAP pobierany z wyprzedzeniem w stanie `idle`                                    |

### Rozmiary siatki

Komórka ma proporcje 0,6 : 1 (cyfry są wyższe niż szerokie). Rozmiar komórki zależy od poziomu jakości (mnożnik 1,0 / 1,2 / 1,5, DPR do 2 / 1,5 / 1)
i od ekranu (bazowo 12 px, na wąskich 11 px). Liczba cząstek jest ograniczona do 16 000: bardzo duże ekrany dostają większe cyfry, a nie więcej cyfr.

| Ekran                  | Komórka | Cząstek (przybl.) |
| ---------------------- | ------- | ----------------- |
| Desktop 1440×900       | 12 px   | ok. 15 000        |
| Telefon 393×851        | 13 px   | ok. 3 400         |
| Duży monitor 2560×1440 | 20 px   | ok. 15 400        |

### Zdjęcie

- Docelowo `public/assets/portrait/portrait.webp` (albo `.avif`), proporcje 4:5, ok. 120 kB. Jedna zmiana w `src/content/profile.ts`, instrukcja w [`docs/ASSETS.md`](../ASSETS.md).
- Tło jednolite albo wycięte (Photopea). Wysoki kontrast twarzy, bo od tego zależy czytelność portretu z cyfr (kod sam rozciąga jasność, ale płaskie zdjęcie da płaski portret).
- To samo zdjęcie zasila próbkowanie (w przeglądarce, milisekundy) i widok końcowy. Nic nie trzeba generować przy buildzie.

### Dostępność i SEO

- Canvas ma `aria-hidden="true"`. Prawdziwy `<h1>` i tekst „O mnie” są **w DOM od początku** (ukryte wizualnie do sceny S4).
  Dzięki temu czytniki ekranu i wyszukiwarki widzą treść.
- Wybuch można uruchomić z klawiatury: `Enter` lub `Spacja`, z widocznym fokusem.
- `prefers-reduced-motion`: od razu widok końcowy z łagodnym pojawieniem się zdjęcia.

### Telefony

- Palec: stuknięcie (krótkie, prawie bez ruchu) uruchamia wybuch, przeciągnięcie odpycha cyfry. Drugi palec jest ignorowany.
- `touch-action: none` tylko, gdy skrypt działa i tylko do końca intro. Bez skryptu albo po zakończeniu przewijanie działa normalnie.
- Zmiana rozmiaru lub obrót przed kliknięciem przebudowuje siatkę (z opóźnieniem 120 ms). Po rozpoczęciu animacji przeskakujemy od razu do widoku końcowego.
- Wysokość sekcji `min-height: 100svh`, więc chowający się pasek adresu nie zmienia układu.
- Telefon poziomo (wysokość ≤ 520 px): układ dwukolumnowy, mniejsze zdjęcie i tekst, żeby przycisk i portret mieściły się na ekranie.
- Wibracja przy wybuchu (`navigator.vibrate`) działa tylko na Androidzie.

### Budżet wydajności

| Metryka                                   | Cel                                                    | Wynik (08.10.2026)                                                                                                                      |
| ----------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Płynność na desktopie                     | 60 fps                                                 | Symulacja 0,2 ms/klatkę. Pomiar w Chromium bez GPU (rysowanie programowe): ok. 37 fps, **zaniżony**, do sprawdzenia na Twoim komputerze |
| Płynność na średnim telefonie z Androidem | **≥ 50 fps**                                           | Emulacja Pixel 5 w Chromium bez GPU: ok. 59 fps. **Do sprawdzenia na prawdziwym telefonie**                                             |
| Silnik intro (bez Reacta i Next)          | ≤ 40 kB gzip                                           | ok. 9 kB (silnik) + ok. 34 kB GSAP ładowany leniwie w czasie bezczynności. GSAP i tak potrzebny w fazie 3 (ScrollTrigger)               |
| Cały `out/` po buildzie                   | kilka MB                                               | 852 kB, największy plik 224 kB (framework)                                                                                              |
| Długie zadania, LCP, Lighthouse mobile    | < 50 ms, < 2,5 s, Performance ≥ 85, Accessibility ≥ 95 | Do zmierzenia na wdrożonej stronie (lista przed deployem w fazie 1)                                                                     |

Pomiar: Chrome DevTools (Performance, spowolnienie CPU 4×) **oraz prawdziwy telefon**. Liczby z Playwrighta (`npm run test:e2e`, test „frame pacing”) są informacyjne.
Gdy Canvas 2D nie spełni budżetu na prawdziwym urządzeniu, `QualityGovernor` obniża jakość w trakcie bezczynności (większe cyfry, mniejszy DPR). Dalsze opcje: renderer OGL albo `OffscreenCanvas` w workerze.

### Testy

- **Vitest (47 testów):** fizyka i próbkowanie portretu, symulacja cząstek (odpychanie, wybuch, zbieżność do celów niezależna od fps), maszyna stanów, kontroler jakości, śledzenie wskaźnika (mysz, stuknięcie, przeciągnięcie, prawy klik, drugi palec).
- **Playwright (`npm run test:e2e`, desktop i telefon):** pełna sekwencja ze zrzutami, „skip intro”, reduced-motion, klawiatura i fokus, dotyk (przeciągnięcie i stuknięcie), treść w drzewie dostępności, awaria skryptów (awaryjne ujawnienie treści), telefon poziomo.
  Lokalnie wystarczy `npx playwright install chromium` (jednorazowo), potem `npm run test:e2e`.

---

## Etapy

| #   | Etap                                                                          | Status                                                  |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| 2.1 | Siatka cyfr, odpychanie, wybuch                                               | ✅                                                      |
| 2.2 | Portret z cyfr: próbkowanie, rampa cyfr, autopoziomy                          | ✅ (na placeholderze; do oceny na Twoim zdjęciu)        |
| 2.3 | Choreografia i maszyna stanów                                                 | ✅                                                      |
| 2.4 | Sekcja „O mnie”: układ, typografia                                            | ✅ (teksty tymczasowe, czekają na Twoje)                |
| 2.5 | Telefony i dostępność: dotyk, obrót, reduced-motion, „skip intro”, klawiatura | ✅                                                      |
| 2.6 | Optymalizacja: kontroler jakości, leniwe ładowanie, zwalnianie zasobów        | ✅ (pomiar na prawdziwych urządzeniach czeka na Ciebie) |
| 2.7 | Przegląd z autorem i poprawki                                                 | ⏳ PR do `main`                                         |

## Kryteria ukończenia

- [ ] Autor zaakceptował wygląd i tempo animacji (na swoim zdjęciu)
- [x] `npm run check` przechodzi (lint, style, typy, testy, build), `npm run test:e2e` przechodzi
- [ ] Działa w Chrome, Firefox, Safari (macOS i iOS) oraz Chrome na Androidzie (sprawdzone: Chromium, w tym emulacja telefonu i dotyku)
- [ ] Spełniony budżet wydajności na prawdziwych urządzeniach: 60 fps desktop, ≥ 50 fps średni telefon
- [x] Widok końcowy: zdjęcie po prawej i tekst po lewej (desktop), poprawny układ na telefonie (także poziomo)
- [x] Działają „skip intro”, klawiatura i `prefers-reduced-motion`

## Ryzyka

| Ryzyko                                        | Co robimy                                                                        |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| Portret z cyfr nieczytelny                    | Mocniejszy kontrast, mniejsza komórka tylko w obszarze twarzy, inne zdjęcie      |
| Spadki fps na słabych telefonach              | QualityGovernor, renderer OGL, mniej cząstek na mobile                           |
| Font monospace ładuje się po starcie animacji | `next/font` z `preload`. Atlas glifów budujemy dopiero po `document.fonts.ready` |

## Materiały referencyjne od autora

Możesz mi wkleić albo wgrać materiały z obu stron, żebym dopasował efekt dokładniej. To przyspiesza strojenie i nic nie kosztuje.
Używamy ich **do zrozumienia techniki**. Nie kopiujemy cudzego kodu 1:1 (prawa autorskie), tylko piszemy własną implementację.

| Co                                   | Jak zdobyć (Chrome lub Edge, klawisz F12)                                                                                                     | Po co                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Nagranie ekranu (najcenniejsze)      | Windows: `Win+Shift+S`, tryb wideo, albo Xbox Game Bar `Win+G`. Mac: `Cmd+Shift+5`. 10 do 30 s intro i kliknięcia, najlepiej też na telefonie | Tempo, kolejność scen, łatwo ocenić efekt                   |
| Struktura strony po starcie animacji | _Elements_ → prawy klik na `<body>` → _Copy → Copy outerHTML_ (wklej pierwsze ok. 200 linii)                                                  | Czy to `<canvas>`, czy wiersze tekstu, jak nazwane elementy |
| Lista plików JS i ich waga           | _Network_ → filtr _JS_ → odśwież stronę → zrzut ekranu tabeli                                                                                 | Jakie biblioteki, ile ważą                                  |
| Wywołania rysowania w jednej klatce  | _Performance_ → nagraj 3 s → zrzut ekranu wykresu                                                                                             | Czy rysują co klatkę, ile trwa klatka                       |
| Kursor i kwadraty z craft.wild.as    | _Elements_ → zaznacz element kursora i pola kwadratów → _Copy → Copy element_ oraz zakładka _Styles_ (CSS animacji)                           | Jak zbudowany kursor, czy kwadraty to CSS czy canvas        |

## Pytania do autora

1. Treść „O mnie”: 2 do 4 zdań plus rola/tytuł. Mogę przygotować szkic, jeśli podeślesz CV lub link do LinkedIna.
2. Napis zachęty w scenie S1: „KLIKNIJ”, „ENTER” czy coś własnego?
3. Czy intro ma pokazywać się przy każdej wizycie, czy tylko przy pierwszej w sesji?
