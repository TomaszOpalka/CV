# Zasoby: gdzie wkładać zdjęcia, CV i grafiki

## Czym jest `.gitkeep`?

Git zapisuje w historii **pliki**, nie foldery. Pusty folder nie trafia do commita, więc po `git clone` by go nie było.
`.gitkeep` to umowna, pusta „zaślepka”: plik bez treści, którego jedyną rolą jest zmusić Gita do zapamiętania folderu.
To **konwencja**, nie funkcja Gita ani Next.js. Nic nie robi i możesz go bezpiecznie usunąć, gdy w folderze pojawią się prawdziwe pliki
(w tym projekcie usuwam je sam, gdy folder dostaje zawartość).

## Mapa folderów

W Next.js dwa miejsca na pliki to nie to samo:

| Miejsce          | Do czego                                                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `public/assets/` | **Tu wkładasz zdjęcia i PDF-y.** Pliki są serwowane bez zmian pod adresem `/assets/...` (np. `public/assets/cv/cv.pdf` → `/assets/cv/cv.pdf`) |
| `src/`           | Kod, style i treści tekstowe (`src/content/*.ts`). Obrazy importowane w kodzie przetwarza bundler, my używamy do tego `public/`               |

```
public/assets/
├── portrait/        # zdjęcie profilowe (to, w co „zamieniają się” cyfry)
│   └── portrait-placeholder.svg   # tymczasowa sylwetka, do zastąpienia
├── blueprints/      # maski rysunków z animacji startowej (silnik, F1, reaktor, Gwiazda Śmierci, piłka)
├── cv/              # CV w PDF (dodamy, gdy je podeślesz)
├── projects/        # zrzuty ekranu projektów (faza 4)
└── og/              # obrazy podglądu linków (LinkedIn, komunikatory)
```

## Jak podmienić placeholder na swoje zdjęcie (jedna zmiana)

1. Zrób zdjęcie **pionowe, proporcje 4:5** (np. 1200 × 1500 px), z twarzą w górnych 2/3 kadru, na jednolitym, najlepiej jasnym lub ciemnym tle,
   z wyraźnym światłem. Od kontrastu zależy, jak czytelny będzie portret ułożony z cyfr.
2. Skompresuj do **AVIF albo WebP, ≤ 120 kB** ([Squoosh](https://squoosh.app), za darmo w przeglądarce). Zostaw wersję kolorową,
   do skali szarości zamieni ją kod.
3. Wrzuć plik do `public/assets/portrait/`, np. `portrait.webp`.
4. W `src/content/profile.ts` zmień jedną linię: `portrait.src` na `/assets/portrait/portrait.webp`.
5. `npm run dev` i kliknij w intro. Nic więcej nie trzeba zmieniać: cyfry układają się w portret i przechodzą w to zdjęcie.

## Blueprinty z animacji startowej

Pliki `public/assets/blueprints/*.webp` to małe maski (białe linie na czarnym tle, ok. 340 px, 10 do 20 kB każda).
Powstały z grafik dostarczonych przez autora skryptem `scripts/make-blueprint-masks.py` (kadrowanie, usunięcie napisów i znaków wodnych,
zwiększenie kontrastu). Oryginałów nie ma w repo.

- **Zmiana jednego rysunku** (np. lepsza piłka): zapisz oryginał jako `basketball.png` (lub `.jpg`) w dowolnym folderze, ustaw ramkę kadrowania w `SPECS`
  w skrypcie i uruchom `python scripts/make-blueprint-masks.py <folder>` (wymaga `pip install pillow`). Albo wrzuć gotową maskę pod tą samą nazwą.
  Kod działa na dowolnym obrazie (mierzy odległość od koloru tła), ale najlepiej wyglądają wyraźne, jasne linie na ciemnym tle.
- **Prawa autorskie:** pierwsze grafiki pochodzą z internetu (m.in. zdjęcie sklepowe z Etsy i obraz z widocznym znakiem wodnym stocka). Cyfry tworzą tylko
  mocno uproszczony kształt, ale zanim strona trafi do publicznego użytku, upewnij się, że masz prawo do użycia tych obrazów, albo zastąp je własnymi lub licencjonowanymi.

## Limity (dlatego pilnujemy rozmiarów)

- GitHub **odrzuca pojedynczy plik > 100 MB** (ostrzega od 50 MB). Oryginały, RAW i PSD zostają u Ciebie na dysku, do repo idą tylko pliki zoptymalizowane.
- Netlify liczy transfer w kredytach (20 kredytów za GB z 300 miesięcznie), więc lekkie obrazy to też oszczędność limitu.
- Całe `out/` po buildzie powinno mieć kilka MB. Skrypt kontrolny rozmiarów dodamy przed pierwszym deployem
  (lista „przed deployem” w [fazie 1](plan/faza-1-stack-i-architektura.md#12-lista-kontrolna-przed-pierwszym-deployem)).
