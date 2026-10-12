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
│   └── portrait.webp              # zdjęcie profilowe (800 × 1067, ok. 110 kB)
├── cv/              # CV w PDF (dodamy, gdy je podeślesz)
├── projects/        # zrzuty ekranu projektów (faza 4)
└── og/              # obrazy podglądu linków (LinkedIn, komunikatory)
```

## Jak podmienić zdjęcie na inne (jedna zmiana)

1. Zrób zdjęcie **pionowe, proporcje 4:5** (np. 1200 × 1500 px), z twarzą w górnych 2/3 kadru, na jednolitym, najlepiej jasnym lub ciemnym tle,
   z wyraźnym światłem. Od kontrastu zależy, jak czytelny będzie portret ułożony z cyfr.
2. Skompresuj do **AVIF albo WebP, ≤ 120 kB** ([Squoosh](https://squoosh.app), za darmo w przeglądarce). Zostaw wersję kolorową,
   do skali szarości zamieni ją kod.
3. Wrzuć plik do `public/assets/portrait/`, np. `portrait.webp`.
4. W `src/content/profile.ts` zmień jedną linię: `portrait.src` na `/assets/portrait/portrait.webp`.
5. `npm run dev` i kliknij w intro. Nic więcej nie trzeba zmieniać: cyfry układają się w portret i przechodzą w to zdjęcie.

## Animacja startowa nie używa obrazów

Film po kliknięciu (V8, F1, piłka, hala, reaktor, Gwiazda Śmierci) jest w całości rysowany kodem (`src/engine/scene/`), więc nie ma tu żadnych plików do podmiany
ani praw autorskich do sprawdzania. Jedyny obraz, który animacja wczytuje, to zdjęcie profilowe z `public/assets/portrait/`.

## Limity (dlatego pilnujemy rozmiarów)

- GitHub **odrzuca pojedynczy plik > 100 MB** (ostrzega od 50 MB). Oryginały, RAW i PSD zostają u Ciebie na dysku, do repo idą tylko pliki zoptymalizowane.
- Netlify liczy transfer w kredytach (20 kredytów za GB z 300 miesięcznie), więc lekkie obrazy to też oszczędność limitu.
- Całe `out/` po buildzie powinno mieć kilka MB. Skrypt kontrolny rozmiarów dodamy przed pierwszym deployem
  (lista „przed deployem” w [fazie 1](plan/faza-1-stack-i-architektura.md#12-lista-kontrolna-przed-pierwszym-deployem)).
