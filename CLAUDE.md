# CLAUDE.md: reguły pracy w tym repozytorium

Portfolio z animacjami (cyfry → portret, pole pikseli z "wybuchem", kursor z emoji). Pełny plan jest w [`docs/plan/`](docs/plan/),
a przegląd faz w [`README.md`](README.md). Przed rozpoczęciem pracy przeczytaj plik fazy, której dotyczy zadanie.

## Przepływ pracy (git i deploy)

1. **Nigdy nie pracujemy bezpośrednio na `main`.** Każda zmiana powstaje na osobnym branchu
   (`feat/...`, `fix/...`, `docs/...`, `chore/...`).
2. **Przed commitem testujemy lokalnie:** `npm run lint`, `npm run typecheck`, `npm test` i `npm run build`.
   Commit powstaje dopiero, gdy wszystko przechodzi.
3. **Do `main` trafia gotowa, przetestowana praca** (merge z brancha po zakończeniu funkcji lub etapu fazy).
   Commity robimy małe, w stylu Conventional Commits (`feat(intro): ...`).
4. **Deploy robi autor po napisaniu aplikacji** (Netlify, produkcyjnie z `main`). Nie uruchamiamy deployów w trakcie
   pisania i nie wypychamy niedokończonych rzeczy na `main`. Limity kredytów Netlify nie są problemem, bo budujemy i testujemy lokalnie.
5. Pull requesta tworzymy tylko na wyraźną prośbę autora.
6. Gdy sesja ma wyznaczony branch, pracujemy i pushujemy tylko na nim.

## Zasady kosztowe

- Koszt całości = **tylko domena** (OVH). Nie dodajemy płatnych usług ani takich, które wymagają podpięcia karty,
  bez wyraźnej zgody autora.
- Hosting: Netlify (plan Free). Funkcje API: Netlify Functions. Szczegóły i decyzje: `docs/plan/faza-1-stack-i-architektura.md`.

## Stack (skrót)

TypeScript (`strict`) · React 19 · Next.js 16 (App Router, `output: 'export'`) · SCSS Modules · GSAP + Lenis ·
własny silnik Canvas 2D · TanStack Query · Zod · npm. Nie używamy jQuery, GraphQL, three.js ani Terraforma (uzasadnienie w fazie 1).

## Konwencje

- **Komponenty:** folder PascalCase z `index.tsx` i `index.module.scss` obok (`components/sections/About/index.tsx`).
- **Typy:** props jako `interface <Nazwa>Props` nad komponentem. Typy domenowe w `src/types/index.ts`,
  kontrakt API (front i funkcje) w `src/shared/types.ts`. Zawsze `import type`. Zakaz `any`.
- **Sass:** tylko `@use` / `@forward`. Tokeny w `src/styles/abstracts/`. Klasy w modułach: camelCase, stany z prefiksem `is`.
- **Wydajność animacji:** jedna pętla `requestAnimationFrame` (`Ticker`), zero `setState` w klatce, bez alokacji w pętli,
  pauza poza ekranem i w ukrytej karcie, obsługa `prefers-reduced-motion`.
- **Język:** kod, nazwy i komentarze po angielsku. Treści na stronie i dokumentacja po polsku.
- Next.js 16 różni się od starszych wersji. Zanim użyjesz API, sprawdź dokumentację w `node_modules/next/dist/docs/`.

## Czego nie robić

- Nie commitujemy sekretów (`.env*`), kluczy ani tokenów. Sekrety trafiają do zmiennych środowiskowych Netlify.
- Nie zapisujemy IP ani nie stawiamy cookies śledzących (brak baneru cookies to cel projektu).
- Nie pomijamy ani nie wyłączamy testów, żeby uzyskać zielony wynik.
