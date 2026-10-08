# Faza 4: Podstrony, treści i interfejs formularza kontaktowego

> **Status:** ⚪ nie rozpoczęta (wymaga ukończenia fazy 3)
> **Poprzednia:** [Faza 3](./faza-3-kursor-pole-pikseli-nawigacja.md) · **Następna:** [Faza 5](./faza-5-formularz-kontaktowy.md)

## Warunek ukończenia (z briefu)

Formularz kontaktowy i uzupełnione podstrony: **doświadczenie, stack technologiczny, portfolio**.
Faza jest zaliczona, jeśli każda podstrona **prawidłowo reaguje na kursor**, **nie powoduje lagów**
i **spełnia oczekiwania estetyczne** z prawidłowym tekstem.

> W tej fazie budujemy **wygląd i walidację** formularza. Wysyłka (EmailJS) to [faza 5](./faza-5-formularz-kontaktowy.md).

## Cel

Zamienić robocze karty z fazy 3 na pełne podstrony z prawdziwą treścią. Do tego płynne przejścia między stronami
i formularz „Zgłoś się po stronę” na dole strony głównej.

## Kontekst dla sesji AI

- Treści leżą w `apps/web/src/content/*.ts` jako typowane dane (typy w `@/types`). Komponenty niczego nie zakodowują na sztywno.
- Kursor i jego stany (`data-cursor`, `data-cursor-label`, `data-emoji`) pochodzą z [fazy 3](./faza-3-kursor-pole-pikseli-nawigacja.md#31-kursor-z-emoji-desktop).
- Statyczny eksport Next ma swoje ograniczenia: `images.unoptimized: true`, zdjęcia generujemy sami (AVIF/WebP), nie ma przekierowań po stronie serwera.

## Zakres

**W zakresie:** podstrony `/doswiadczenie`, `/stack`, `/portfolio`, przejścia między stronami, SEO (metadane, podglądy, mapa strony),
interfejs i walidacja formularza kontaktowego.

**Poza zakresem:** faktyczna wysyłka formularza (faza 5), minigra (faza 6).

---

## 4.1 Podstrony

### `/doswiadczenie` (emoji 💼)

- Oś czasu stanowisk: firma, rola, okres, 2 do 3 zdań opisu, osiągnięcia w punktach (najlepiej mierzalne), użyte technologie.
- Tagi technologii prowadzą do `/stack#<technologia>`.
- Nad kartą firmy kursor pokazuje „Szczegóły”, a karta rozwija się płynnie (animacja wysokości przez GSAP).
- Uczelnia jako osobny blok na końcu (albo osobna podstrona `/uczelnia`, do decyzji).

### `/stack` (emoji 🛠️)

- Grupy: Frontend, Backend, Bazy danych, DevOps i chmura, Narzędzia.
- Każda technologia ma nazwę, ikonę (Simple Icons, licencja CC0, w skali szarości), **gdzie była używana** (firma lub projekt) i od kiedy.
- **Bez pasków „procent umiejętności”.** Nic nie mówią rekruterowi, a „gdzie i jak długo” mówi dużo.
- Nad kaflem: ikona przechodzi w pełny kolor, a kursor pokazuje liczbę lat lub projektów.

### `/portfolio` (emoji 🔗)

- Karty projektów: nazwa, zrzut ekranu (szary, kolorowy po najechaniu), rola, stack, linki (strona, repozytorium), krótkie case study.
- Odsłonięcie zrzutu przez pikselizację, czyli ponowne użycie silnika z fazy 3.
- Linki do innych CV i portfoliów te same co po wybuchu (wspólne źródło: `content/portfolioLinks.ts`).

### Wspólne dla podstron

- **Przejścia między stronami:** komponent `TransitionLink` najpierw odgrywa animację wyjścia (kwadraty zakrywają ekran), potem zmienia stronę.
  Animacja wejścia (kwadraty się rozpraszają) startuje po zamontowaniu nowej strony. Kursor przeżywa przejście, bo siedzi w `layout.tsx`.
- Ten sam nagłówek, stopka i licznik wybuchów co na stronie głównej.
- Każda podstrona ma `generateMetadata`: tytuł, opis i obraz podglądu.

## 4.2 Formularz „Zgłoś się po stronę” (interfejs)

Na dole strony głównej, sekcja **Kontakt** (emoji ✉️).

| Pole | Typ | Wymagane |
|---|---|---|
| Imię | tekst | ✔ |
| E-mail | e-mail | ✔ |
| Rodzaj strony | wybór: wizytówka, portfolio, landing page, sklep, inne | ✔ |
| Budżet | wybór przedziału | — |
| Termin | tekst lub data | — |
| Wiadomość | textarea, 20 do 2000 znaków | ✔ |
| Zgoda na przetwarzanie danych (RODO) | checkbox | ✔ |
| `website` | **honeypot**, ukryte pole na boty | (musi zostać puste) |

- Walidacja Zod ze schematu w `@cv/shared` (`contactRequestSchema`). Ten sam schemat sprawdzi Worker w fazie 5.
- Stany: `idle → sending → success | error`. W tej fazie wysyłka jest **atrapą** (opóźnienie, potem sukces).
- Kursor: nad polami etykieta „Pisz”, nad przyciskiem „Wyślij ✉️”.
- Sukces: kwadraty układają się w ✓ albo kursor pokazuje 🎉.
- Dostępność: etykiety `<label>`, komunikaty błędów przez `aria-describedby`, poprawna kolejność fokusu, działa bez myszy.
- Pod formularzem klauzula informacyjna RODO: kto przetwarza dane, w jakim celu, jak długo, jak zażądać usunięcia.

## 4.3 SEO i udostępnianie

- `app/sitemap.ts` i `app/robots.ts` (działają przy statycznym eksporcie).
- Obrazy podglądu linków (OG) dla każdej podstrony, w stylistyce cyfr lub pikseli.
- Dane strukturalne JSON-LD typu `Person` (imię, rola, linki do profili).
- Zdjęcia: `<picture>` z AVIF i WebP, `loading="lazy"` poniżej pierwszego ekranu, podane wymiary (brak skoków układu).

---

## Etapy

| # | Etap | Wynik |
|---|---|---|
| 4.1 | Zebranie treści od autora (CV, opisy projektów, zrzuty) i szkice tekstów | Zaakceptowane treści w `content/` |
| 4.2 | `/doswiadczenie` (z uczelnią) | Gotowa podstrona |
| 4.3 | `/stack` | Gotowa podstrona |
| 4.4 | `/portfolio` | Gotowa podstrona |
| 4.5 | `TransitionLink` i przejścia między stronami | Płynne przejścia, kursor bez przerw |
| 4.6 | Interfejs i walidacja formularza (atrapa wysyłki) | Formularz gotowy do podpięcia |
| 4.7 | SEO: metadane, OG, mapa strony, JSON-LD | Poprawne podglądy linków |
| 4.8 | Wydajność, korekta tekstów, przegląd z autorem | Akceptacja |

## Kryteria ukończenia

- [ ] Każda podstrona reaguje na kursor: emoji, etykiety i stany hover
- [ ] Brak lagów: ≥ 50 fps przy scrollu i przejściach na średnim telefonie, Lighthouse mobile Performance ≥ 85
- [ ] Autor zaakceptował wygląd i **wszystkie teksty** (bez lorem ipsum, bez literówek)
- [ ] Formularz waliduje dane, pokazuje błędy i stany, działa z klawiatury
- [ ] Podgląd linku do każdej podstrony poprawnie wyświetla się na LinkedInie i w komunikatorach

## Pytania do autora

1. Pełne CV: stanowiska, daty, opisy, osiągnięcia.
2. Lista projektów do portfolio, ze zrzutami ekranu i linkami.
3. Uczelnia jako blok w `/doswiadczenie` czy osobna podstrona?
4. Przedziały budżetu w formularzu, albo czy w ogóle pytać o budżet?
