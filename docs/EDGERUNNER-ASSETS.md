# Edgerunner: motyw graficzny, grafiki i formaty

## Jak to działa (stan na 27.10.2026)

Przycisk „Edgerunner” w nagłówku (obok imienia) przełącza całą stylistykę strony. Po kliknięciu:

1. z przycisku strzelają czerwone błyskawice, coraz gęstsze, aż pokryją ekran (`engine/edgerunner/LightningTransition.ts`),
2. pod białym błyskiem zmienia się motyw (`html[data-theme='edgerunner']`) i strona wraca na górę,
3. hero pokazuje ilustrację na tle: na PC napisy po lewej i prawej stronie postaci, na telefonie napisy u góry,
4. kursor zamienia się w laserową kropkę z trzaskającymi błyskawicami (`engine/edgerunner/LaserCursor.ts`; tylko myszka, nie dotyk).

Reszta strony zmienia kolory (żółty akcent, granatowe tło), ma linie skanowania i podzielone kolorystycznie tytuły (`styles/base/_edgerunner.scss`).
Ponowne kliknięcie przycisku wraca do zwykłego wyglądu. Przy `prefers-reduced-motion` zmiana jest natychmiastowa, bez błyskawic i bez laserowego kursora.
Grafiki i kod efektów ładują się dopiero przy najechaniu na przycisk, więc zwykły odwiedzający nic nie pobiera.

Pliki w repo (zoptymalizowane z oryginałów `.jfif` po ok. 3 MB każdy):

| Plik                                               | Rozmiar | Rola                                                  |
| -------------------------------------------------- | ------- | ----------------------------------------------------- |
| `public/assets/edgerunner/logo/edgerunner.webp`    | 95 kB   | przycisk w nagłówku (tło wycięte do przezroczystości) |
| `public/assets/edgerunner/images/hero-pc.webp`     | 201 kB  | hero na PC, 1920 × 1072                               |
| `public/assets/edgerunner/images/hero-mobile.webp` | 166 kB  | hero na telefon, 900 × 1613                           |

**Jak to wycofać:** usuń `components/layout/EdgerunnerFx/`, `components/layout/EdgerunnerButton/`, `engine/edgerunner/`, `content/edgerunner.ts`,
`styles/base/_edgerunner.scss` (i jego linię w `styles/main.scss`), `public/assets/edgerunner/`, oraz części „edge” w `Header`, `Intro` i `Cursor`
(`useTheme`, `<EdgerunnerButton />`, `data-edge`, `<picture>`, blok „Edgerunner” w `Intro/index.module.scss`).

## Gdzie wrzucać nowe grafiki i w jakim formacie

Branch: `edgerunner` (z `develop`). Przycisk „Edgerunner” w nagłówku ma przełączać szatę graficzną strony.
Wszystkie pliki trafiają do **`public/assets/edgerunner/`** (serwowane pod `/assets/edgerunner/...`).

## Foldery

```
public/assets/edgerunner/
├── logo/       # sam przycisk „Edgerunner” (kolczasta ramka z napisem), stan zwykły i hover
├── images/     # statyczne tła, tekstury, nakładki (glitch, szum, kratka), zdjęcie w ramce
├── sprites/    # animacje klatkowe: jeden arkusz klatek + mały plik JSON (patrz niżej)
├── video/      # krótkie pętle wideo (tła, glitch na pełny ekran)
├── icons/      # małe ozdoby i ikony interfejsu (strzałki, kreski, kursor)
└── fonts/      # czcionki (tylko WOFF2)
```

Nie wiesz, do którego folderu coś pasuje? Wrzuć do `images/`, przeniosę.
Pliki nazywaj małymi literami, bez spacji i polskich znaków, np. `button-edgerunner.svg`, `glitch-flicker.webp`.

## Formaty

| Co                                                   | Format                                                           | Limit                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Przycisk „Edgerunner”, ozdoby, ikony** (wektorowe) | **SVG**, tekst zamieniony na krzywe (outline), tło przezroczyste | ≤ 50 kB. Przycisk w dwóch plikach: `button.svg` i `button-hover.svg` |
| **Tła, tekstury, nakładki** (obrazy statyczne)       | **AVIF** (najlepszy) albo **WebP**, z kanałem alfa jeśli trzeba  | ≤ 200 kB na plik; szerokość = 2× wyświetlana (np. tło 1600–2400 px)  |
| **Animacje klatkowe** (rysowane, glitch, neon)       | **Arkusz klatek (sprite sheet): WebP albo PNG** + plik **JSON**  | ≤ 24 klatki, 12–24 fps, arkusz ≤ 4096 px szerokości, ≤ 500 kB        |
| **Pętle wideo** (tło, efekt na pełny ekran)          | **WebM (VP9)** + **MP4 (H.264)** jako zapas; bez dźwięku         | ≤ 6 s, ≤ 1280 px szerokości, 30 fps, ≤ 1 MB na plik                  |
| **Czcionki**                                         | **WOFF2**, tylko potrzebne znaki (łacińskie + ąćęłńóśźż)         | ≤ 60 kB na plik, licencja musi pozwalać na użycie na stronie         |

### Animacje: arkusz klatek (sprite sheet), czyli najlepszy wybór dla naszego silnika

Strona rysuje wszystko w Canvas 2D, więc animacje klatkowe są najwygodniejsze jako **jeden obraz z kratką klatek**:

1. Wszystkie klatki **tego samego rozmiaru**, ułożone **wierszami od lewej do prawej, od góry do dołu**.
2. Obok plik JSON o tej samej nazwie, np. `glitch-flicker.webp` + `glitch-flicker.json`:
   ```json
   { "frameWidth": 400, "frameHeight": 300, "frames": 12, "fps": 12, "loop": true }
   ```
3. Jeśli ułożenie arkusza jest kłopotliwe, wrzuć **numerowane klatki** (`glitch-flicker-001.png`, `-002.png`, ...) do
   `sprites/<nazwa>/frames/`. Złożę arkusz i JSON sam, a klatki usunę z repo.

### Czego unikać

- **GIF i APNG**: ciężkie i brzydkie kolory. Zamiast GIF użyj arkusza klatek albo WebM.
- **Wideo z przezroczystością**: w Safari działa tylko w specjalnym formacie (HEVC z alfą), a wiem, że Safari już sprawia nam problemy. Zrób tło **w arkuszu klatek albo SVG**, a wideo tylko pełnoekranowe, bez przezroczystości.
- **Lottie (JSON z After Effects)**: możliwe, ale wymaga dodatkowej biblioteki (ok. 60 kB). Użyjemy jej tylko, jeśli animacja jest zbyt złożona na inne formaty. Daj znać, zanim ją przygotujesz.
- **Gotowe grafiki z serialu „Cyberpunk: Edgerunners”** (kadry, oficjalne logo, czcionki): to cudze prawa autorskie i znaki towarowe. Własne rysunki w tym stylu (jak Twój szkic) są w porządku, ale nie wrzucaj niczego wyciętego z serialu na publiczne portfolio.

## Rozmiary (dlaczego pilnujemy limitów)

Wszystko z tego folderu ma ładować się dopiero **po kliknięciu przycisku**, żeby zwykły odwiedzający nie pobierał nic niepotrzebnie
(Netlify liczy transfer w kredytach). Cały folder `edgerunner/` powinien zmieścić się w **ok. 3 MB**.
Oryginały (PSD, Procreate, nagrania źródłowe) zostają u Ciebie, do repo idą tylko pliki zoptymalizowane.

Narzędzia do optymalizacji: [Squoosh](https://squoosh.app) (AVIF/WebP), [SVGOMG](https://jakearchibald.github.io/svgomg/) (SVG),
[HandBrake](https://handbrake.fr) lub `ffmpeg` (WebM/MP4).
