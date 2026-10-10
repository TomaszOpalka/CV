# CLAUDE.md: reguły pracy w tym repozytorium

Portfolio z animacjami (cyfry → portret, pole pikseli z "wybuchem", kursor z emoji). Pełny plan jest w [`docs/plan/`](docs/plan/),
a przegląd faz w [`README.md`](README.md). Przed rozpoczęciem pracy przeczytaj plik fazy, której dotyczy zadanie.

## Przepływ pracy (git i deploy)

Gałęzie: `main` (produkcja, stan zaakceptowany przez autora) ← `develop` (zintegrowana, przetestowana praca) ← gałęzie robocze.

1. **Nigdy nie pracujemy bezpośrednio na `main` ani na `develop`.** Każda zmiana powstaje na osobnym branchu
   (`feat/...`, `fix/...`, `docs/...`, `chore/...`), tworzonym z `develop`.
2. **Przed commitem testujemy lokalnie:** `npm run lint`, `npm run typecheck`, `npm test` i `npm run build`.
   Commit powstaje dopiero, gdy wszystko przechodzi.
3. **Do `develop` trafia gotowa, przetestowana praca** (merge gałęzi roboczej, na prośbę autora robi to też Claude). Commity robimy małe,
   w stylu Conventional Commits (`feat(intro): ...`).
4. **Do `main` trafia wyłącznie `develop`, przez Pull Request.** Autor sam go przegląda i zatwierdza (merge). My nie mergujemy PR-ów do `main`.
   W opisie PR: co zrobiono, jak sprawdzić lokalnie, co świadomie odłożono.
5. **Po ukończeniu każdego etapu (fazy lub jej wyraźnej części) wypychamy branch** i wystawiamy PR do `develop` (albo scalamy go, jeśli autor tak zdecyduje).
6. **Deploy robi autor po napisaniu aplikacji** (Netlify, produkcyjnie z `main`). Nie uruchamiamy deployów w trakcie
   pisania i nie wypychamy niedokończonych rzeczy na `main`. Limity kredytów Netlify nie są problemem, bo budujemy i testujemy lokalnie.
7. Gdy sesja ma wyznaczony branch, pracujemy i pushujemy tylko na nim, chyba że autor poleci inaczej (np. utworzy `develop` albo nową gałąź fazy).

## Zasoby (zdjęcia, CV, grafiki)

- Wszystkie pliki statyczne leżą w `public/assets/` (serwowane pod `/assets/...`). Mapa folderów: [`docs/ASSETS.md`](docs/ASSETS.md).
- Do repo trafiają tylko **zoptymalizowane** pliki (zdjęcie AVIF/WebP ≤ 120 kB, obrazy projektów ≤ 200 kB). Oryginały, RAW i PSD zostają poza repo
  (GitHub odrzuca pojedyncze pliki > 100 MB, a Netlify liczy transfer w kredytach).

## Zasady kosztowe

- Koszt całości = **tylko domena** (OVH). Nie dodajemy płatnych usług ani takich, które wymagają podpięcia karty,
  bez wyraźnej zgody autora.
- **Bez bazy danych** (decyzja z 10.10.2026): wybuchy nie są zapisywane, nie ma licznika. Nie dodajemy magazynów ani funkcji tylko po to, żeby coś zapisywać.
- Adresy podstron (trasy Next) po angielsku: `/experience`, `/stack`, `/portfolio`, `/education`.
- Hosting: Netlify (plan Free). Funkcje API: Netlify Functions. Szczegóły i decyzje: `docs/plan/faza-1-stack-i-architektura.md`.

## Stack (skrót)

TypeScript (`strict`) · React 19 · Next.js 16 (App Router, `output: 'export'`) · SCSS Modules · GSAP + Lenis ·
własny silnik Canvas 2D · TanStack Query · Zod · npm. Nie używamy jQuery, GraphQL, three.js ani Terraforma (uzasadnienie w fazie 1).

## Konwencje

- **Komponenty:** folder PascalCase z `index.tsx` i `index.module.scss` obok (`components/sections/About/index.tsx`).
- **Typy:** props jako `interface <Nazwa>Props` nad komponentem. Typy domenowe w `src/types/index.ts`,
  kontrakt API (front i funkcje) w `src/shared/types.ts`. Zawsze `import type`. Zakaz `any`.
- **Sass:** tylko `@use` / `@forward`. Tokeny w `src/styles/abstracts/`. Klasy w modułach: camelCase, stany z prefiksem `is`.
  Importy między plikami SCSS zawsze jako **jawne ścieżki względne** (`@forward '../abstracts/tokens'`). Goły `@forward 'tokens'`
  buduje się na Linuksie, ale na Windowsie z Turbopackiem kończy się błędem „Can't find stylesheet to import”.
- **Wydajność animacji:** jedna pętla `requestAnimationFrame` (`Ticker`), zero `setState` w klatce, bez alokacji w pętli,
  pauza poza ekranem i w ukrytej karcie, obsługa `prefers-reduced-motion`.
- **Język:** kod, nazwy i komentarze po angielsku. **Treści na stronie po angielsku** (autor zmienił teksty na angielskie 08.10.2026,
  `<html lang="en">`), dokumentacja i rozmowa po polsku.
- Next.js 16 różni się od starszych wersji. Zanim użyjesz API, sprawdź dokumentację w `node_modules/next/dist/docs/`.

## Czego nie robić

- Nie commitujemy sekretów (`.env*`), kluczy ani tokenów. Sekrety trafiają do zmiennych środowiskowych Netlify.
- Nie zapisujemy IP ani nie stawiamy cookies śledzących (brak baneru cookies to cel projektu).
- Nie pomijamy ani nie wyłączamy testów, żeby uzyskać zielony wynik.
