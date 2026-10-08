# Uruchomienie projektu lokalnie (VS Code)

Repozytorium: `https://github.com/TomaszOpalka/CV`

## 1. Wymagania

| Narzędzie   | Wersja                                               | Po co                               |
| ----------- | ---------------------------------------------------- | ----------------------------------- |
| **Node.js** | **24 LTS** (minimum 20.9, plik `.nvmrc` wskazuje 24) | uruchamia Next.js, ESLint, testy    |
| **npm**     | dołączony do Node.js                                 | instalacja paczek                   |
| **Git**     | dowolny aktualny                                     | wersjonowanie                       |
| **VS Code** | aktualny                                             | edytor (rozszerzenia podpowie repo) |

Sprawdź, co masz teraz:

```bash
node -v
npm -v
git --version
```

## 2. Aktualizacja Node.js

Projekt używa **Node 24 LTS** (plik `.nvmrc`, `netlify.toml`). Minimum to 22.12 (wymaga go Vitest 5).
Node 24 jest teraz Active LTS, a 28.10.2026 LTS zostaje Node 26. Po tej dacie komendy typu „zainstaluj najnowszy LTS” (np. `winget`)
dadzą Ci już **26**. To działa z projektem, ale najlepiej mieć lokalnie tę samą wersję co na Netlify, więc instaluj **24** wprost.

### Windows (rekomendowane: winget)

```powershell
# jeśli Node jest już zainstalowany:
winget upgrade --id OpenJS.NodeJS.LTS -e
# jeśli nie:
winget install --id OpenJS.NodeJS.LTS -e

# zamknij i otwórz terminal, potem:
node -v    # oczekiwane: v24.x
npm -v     # oczekiwane: 11.x
```

> **Dlaczego winget, a nie menedżer wersji:** aplikacja desktopowa Claude na Windows czyta zmienne systemowe i użytkownika,
> ale **nie czyta profilu PowerShell**. Node zainstalowany tylko przez `fnm` (hook w profilu) może być dla niej niewidoczny.
> Jeśli winget zainstaluje 26 (po 28.10.2026): `winget install OpenJS.NodeJS --version 24.21.0` albo `nvm-windows` (`winget install CoreyButler.NVMforWindows`, potem `nvm install 24` i `nvm use 24`).
> Starą wersję z nodejs.org odinstaluj w „Aplikacje i funkcje”, jeśli winget zgłosi konflikt.

### macOS

```bash
brew install fnm
echo 'eval "$(fnm env --use-on-cd --shell zsh)"' >> ~/.zshrc
source ~/.zshrc
fnm install 24
fnm default 24
node -v
```

(Alternatywa bez menedżera wersji: `brew install node@24` i dopisz `export PATH="$(brew --prefix node@24)/bin:$PATH"` do `~/.zshrc`.)

### Linux

```bash
curl -fsSL https://fnm.vercel.app/install | bash
# nowy terminal:
fnm install 24
fnm default 24
node -v
```

> Dzięki plikowi `.nvmrc` w repo, `fnm` (przy `--use-on-cd`) sam przełączy wersję Node po wejściu do folderu projektu.

## 3. Pobranie repozytorium i start

```bash
git clone https://github.com/TomaszOpalka/CV.git
cd CV
code .            # otwiera VS Code (przy pierwszym uruchomieniu zaakceptuj polecane rozszerzenia)

npm install       # instaluje WSZYSTKO z package.json (patrz sekcja 5)
npm run dev       # serwer deweloperski: http://localhost:3000
```

## 4. Codzienna praca (zgodnie z regułami z `CLAUDE.md`)

```bash
git switch main
git pull
git switch -c feat/nazwa-zmiany      # praca zawsze na osobnym branchu

# ... edycje w VS Code ...

npm run check                        # lint + style + typy + testy + build, jedną komendą
git add -A
git commit -m "feat(intro): opis zmiany"
git push -u origin feat/nazwa-zmiany

# gdy gotowe i przetestowane:
git switch main
git merge feat/nazwa-zmiany
git push
```

Deploy na Netlify robisz dopiero po napisaniu aplikacji (patrz [faza 1](plan/faza-1-stack-i-architektura.md)).

### Skrypty npm

| Komenda               | Co robi                                                     |
| --------------------- | ----------------------------------------------------------- |
| `npm run dev`         | serwer deweloperski Next.js (sama strona)                   |
| `npm run dev:full`    | strona + funkcje API przez Netlify CLI (patrz sekcja 6)     |
| `npm run build`       | statyczny eksport do folderu `out/`                         |
| `npm run lint`        | ESLint                                                      |
| `npm run lint:styles` | Stylelint dla plików SCSS                                   |
| `npm run typecheck`   | sprawdzenie typów TypeScript                                |
| `npm test`            | testy jednostkowe (Vitest)                                  |
| `npm run format`      | formatowanie Prettierem                                     |
| `npm run check`       | wszystko powyżej po kolei, uruchamiaj przed każdym commitem |

## 5. Co instaluje `npm install`

Nie instalujesz niczego ręcznie. Wszystko jest w `package.json` i `package-lock.json`.

**Zależności aplikacji**

| Paczka                       | Rola                                          |
| ---------------------------- | --------------------------------------------- |
| `next`, `react`, `react-dom` | framework i UI (Next.js 16, React 19)         |
| `gsap`                       | animacje (w pełni darmowy, razem z wtyczkami) |
| `lenis`                      | płynny scroll                                 |
| `@tanstack/react-query`      | zapytania do API (zapis wybuchu, statystyki)  |
| `zod`                        | walidacja danych (front i funkcje API)        |

**Narzędzia deweloperskie**

| Paczka                                                          | Rola                          |
| --------------------------------------------------------------- | ----------------------------- |
| `typescript`, `@types/*`                                        | TypeScript 6 (tryb `strict`)  |
| `eslint`, `eslint-config-next`                                  | analiza kodu                  |
| `prettier`                                                      | formatowanie                  |
| `sass`                                                          | SCSS i moduły `*.module.scss` |
| `stylelint`, `stylelint-config-standard-scss`                   | lint stylów                   |
| `vitest`, `jsdom`, `@testing-library/*`, `@vitejs/plugin-react` | testy                         |
| `@netlify/functions`                                            | typy dla funkcji API          |

Dodamy w kolejnych fazach: `@playwright/test` (testy e2e), `@emailjs/browser` albo obsługę Netlify Forms (formularz),
klienta bazy danych (patrz decyzja w fazie 1) i `kaplay` (opcjonalna minigra).

## 6. Opcjonalnie: lokalne API (Netlify Functions)

Funkcje API leżą w `netlify/functions/`. Aby uruchomić je razem ze stroną:

```bash
npm install -g netlify-cli
netlify login          # raz, w przeglądarce (konto Netlify bez karty)
npm run dev:full       # strona + API pod http://localhost:8888
```

Sekrety (klucze do bazy, formularza) trzymasz w pliku `.env` (jest w `.gitignore`, nigdy nie trafia do repo).
Wzór zmiennych znajdzie się w `.env.example`.

## 7. Rozwiązywanie problemów

**`Can't find stylesheet to import` (Sass, np. `@forward 'tokens'`)**
Na Windowsie Turbopack nie znajduje pliku wskazanego „gołą” nazwą. Importy między plikami SCSS muszą mieć jawną ścieżkę względną,
np. `@forward '../abstracts/tokens'` (tak jest w repo od commita `50d83d6`). Nie dodawaj `includePaths` w `next.config`, to nie jest potrzebne.
Build z webpackiem (`npx next build --webpack`) i z Turbopackiem przechodzą na Linuksie, a CI sprawdza też Windowsa.

**Node starszy niż 22.12**
`npm install` zgłasza błędy wersji albo testy nie startują: zaktualizuj Node (sekcja 2).

## 8. Claude Code lokalnie

Tak, można pracować ze mną bezpośrednio na Twoim komputerze, na lokalnych plikach (wymagany płatny plan Claude: Pro, Max, Team lub Enterprise):

- **Aplikacja desktopowa Claude** → zakładka **Code** → środowisko **Local** → **Select folder** → wybierz sklonowany folder `CV`.
  Claude edytuje pliki, uruchamia `npm install`, `npm run check` i git, a serwer deweloperski możesz podejrzeć w wbudowanej przeglądarce.
  Do uruchamiania npm potrzebuje Node w `PATH` (patrz uwaga o winget w sekcji 2).
- **VS Code** → rozszerzenie **Claude Code** (`anthropic.claude-code`, wymaga VS Code 1.94+; jest w polecanych rozszerzeniach repo)
  → ikona Claude na pasku edytora → logowanie w przeglądarce.
- **Terminal** → `npm install -g @anthropic-ai/claude-code`, potem `claude` w folderze projektu.

Każda z tych sesji czyta `CLAUDE.md` (reguły pracy), widzi cały projekt i pracuje na tym samym lokalnym folderze co Ty.
Sesja w chmurze, w której pisałem szkielet, pracuje na kopii repozytorium i oddaje zmiany przez GitHub.
