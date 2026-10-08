# CV / Portfolio

Interaktywne portfolio. Na starcie siatka cyfr reaguje na kursor, a po kliknięciu „wybucha” i układa się w portret autora
z opisem „O mnie”. Niżej pole migających kwadratów: jego wybuch odsłania linki do innych CV i zapisuje w API datę wybuchu.
Do tego kursor z emoji zmieniającym się między sekcjami, podstrony (doświadczenie, stack, portfolio) i formularz „Zgłoś się po stronę”.

**Założenie kosztowe:** płacimy tylko za domenę.

## Plan projektu

| Faza | Zakres | Status |
|---|---|---|
| [1. Stack i architektura](docs/plan/faza-1-stack-i-architektura.md) | Technologie, hosting za koszt domeny, struktura monorepo, konwencje | 🟡 czeka na akceptację |
| [2. Animacja startowa](docs/plan/faza-2-animacja-startowa.md) | Intro z cyframi → portret → zdjęcie i „O mnie” | ⚪ |
| [3. Kursor, pole pikseli, nawigacja](docs/plan/faza-3-kursor-pole-pikseli-nawigacja.md) | Kursor z emoji, wybuch z zapisem do API, sekcje jako karty | ⚪ |
| [4. Podstrony i treści](docs/plan/faza-4-podstrony-i-tresci.md) | Doświadczenie, stack, portfolio, interfejs formularza | ⚪ |
| [5. Formularz kontaktowy](docs/plan/faza-5-formularz-kontaktowy.md) | EmailJS, antyspam, kopia w D1 | ⚪ |
| [6. Minigra (opcjonalna)](docs/plan/faza-6-minigra-kaplay.md) | KAPLAY (następca Kaboom.js) | 🔒 |

## Stack w skrócie

TypeScript · React 19 · Next.js 16 (statyczny eksport) · SCSS Modules · GSAP + Lenis · własny silnik Canvas 2D ·
TanStack Query · Zod · Cloudflare Workers + D1 · EmailJS + Turnstile · pnpm monorepo

Szczegóły i uzasadnienia w [fazie 1](docs/plan/faza-1-stack-i-architektura.md).
