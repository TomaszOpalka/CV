# Faza 5: Podpięcie formularza kontaktowego

> **Status:** ⚪ nie rozpoczęta (wymaga ukończenia fazy 4)
> **Poprzednia:** [Faza 4](./faza-4-podstrony-i-tresci.md) · **Następna (opcjonalna):** [Faza 6](./faza-6-minigra-kaplay.md)

## Warunek ukończenia (z briefu)

Podpięty **darmowy** formularz kontaktowy (EmailJS albo inny), który zmieści się w limicie.

## Cel

Formularz „Zgłoś się po stronę” z fazy 4 naprawdę wysyła zgłoszenie. Autor dostaje e-mail, a boty nie zalewają skrzynki.

## Wybór usługi

Hosting jest w Netlify, więc najprostsze jest **Netlify Forms**: bez dodatkowego konta, bez klucza w kodzie strony i bez limitu zgłoszeń.

| Usługa                                    | Darmowy limit                                       | Plusy                                                                                                                                  | Minusy                                                                                                   |
| ----------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Netlify Forms** (rekomendacja)          | **bez limitu zgłoszeń** (od 14.04.2026), 0 kredytów | To samo konto i panel. Akismet, honeypot i opcjonalnie reCAPTCHA. Powiadomienie e-mail, Slack lub webhook. Zgłoszenia zostają w panelu | Brak automatycznej odpowiedzi do zgłaszającego (wymaga małej funkcji). Działa tylko na wdrożonej stronie |
| EmailJS (jako dodatek do auto-odpowiedzi) | 200 wiadomości/mies., 2 szablony                    | Szablony HTML, REST API wołane z funkcji                                                                                               | Dodatkowe konto, klucze w zmiennych środowiskowych                                                       |
| Web3Forms                                 | 250 zgłoszeń/mies.                                  | hCaptcha                                                                                                                               | Dodatkowa usługa bez przewagi nad Netlify Forms                                                          |

Zgłoszenia przestają przychodzić, jeśli zespół Netlify wyczerpie 300 kredytów i zostanie wstrzymany ([faza 1, pkt 1.6](./faza-1-stack-i-architektura.md#16-netlify-limity-kredyty-i-co-zrobić-żeby-ich-nie-przekroczyć)).
Zgłoszenia, które nie dojdą, nie wracają. To kolejny powód, by trzymać stronę lekką.

## Architektura

```
Formularz React (faza 4)
   │  1. walidacja Zod w przeglądarce
   │  2. pułapka czasowa: wysyłka < 3 s od otwarcia → udajemy sukces, nie wysyłamy
   │  3. POST (application/x-www-form-urlencoded) na /__forms.html, z polem form-name
   ▼
Netlify Forms
   │  honeypot „bot-field” → odrzucenie po cichu
   │  Akismet → Verified / Spam
   ├──► powiadomienie e-mail do autora (Forms → Submission notifications)
   ├──► zgłoszenie zapisane w panelu Netlify (eksport CSV)
   └──► (opcjonalnie) funkcja submission-created → EmailJS → automatyczna odpowiedź do klienta
```

### Szczegóły wdrożenia

1. **Plik szkieletu** `public/__forms.html`: Netlify wykrywa formularze, czytając statyczny HTML. Plik musi zawierać **każde pole dokładnie pod taką nazwą, jaką wysyła komponent**:

   ```html
   <form name="contact" data-netlify="true" netlify-honeypot="bot-field" hidden>
     <input type="hidden" name="form-name" value="contact" />
     <input name="name" />
     <input name="email" />
     <input name="siteType" />
     <input name="budget" />
     <input name="deadline" />
     <textarea name="message"></textarea>
     <input name="bot-field" />
   </form>
   ```

2. **Komponent** zawiera ukryte pole `<input type="hidden" name="form-name" value="contact" />` oraz ukryte (CSS) pole `bot-field`.
3. **Wysyłka** (`src/api/contact.ts`): `fetch('/__forms.html', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(formData).toString() })`.
   Sukces tylko dla `res.status === 200`. **JSON nie jest obsługiwany**, ciało musi być kodowane jak formularz.
4. **Włącz wykrywanie formularzy** w panelu: _Forms → Enable form detection_. Zadziała od następnego deploya.
5. **Powiadomienie e-mail**: _Forms → Submission notifications → Add notification → Email_. Mail przychodzi z `formresponses@netlify.com`,
   a pole o nazwie `email` staje się adresem do odpowiedzi (Reply-To). Temat ustawia ukryte pole `subject`.
6. **Antyspam**: honeypot i Akismet wystarczą na start. Zgłoszenia oznaczone jako spam trafiają do osobnej listy w panelu (możesz je zatwierdzić).
   reCAPTCHA dodaje widoczny widżet, więc włączamy ją tylko, jeśli pojawi się spam.
7. **Nie używamy** Server Actions ani route handlerów Next (nie działają z eksportem statycznym).

### Automatyczna odpowiedź do zgłaszającego (opcjonalna)

Netlify Forms nie wysyła potwierdzeń. Jeśli chcesz „Dzięki, odezwę się w ciągu 48 h”, dodajemy funkcję zdarzeniową
`netlify/functions/submission-created.ts` (uruchamia się po każdym poprawnym, niebędącym spamem zgłoszeniu). Woła ona REST API EmailJS
(`POST https://api.emailjs.com/api/v1.0/email/send`) z kluczem prywatnym. Wymagania:

- w koncie EmailJS włączony dostęp API dla aplikacji spoza przeglądarki,
- zmienne środowiskowe w Netlify: `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_AUTOREPLY`, `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`
  (wartości z `netlify.toml` nie są dostępne w funkcjach; ustawiasz je w panelu lub przez `netlify env:set`),
- licznik: 200 wiadomości/mies. na planie Free. Funkcja nie wysyła nic po przekroczeniu 180 i nie przerywa przyjmowania zgłoszeń.

Bez tego dodatku formularz nadal w pełni działa. To tylko komfort dla klienta.

### Typ w `src/shared/types.ts`

```ts
export type SiteType = 'business-card' | 'portfolio' | 'landing' | 'shop' | 'other';

export interface ContactRequest {
  name: string;
  email: string;
  siteType: SiteType;
  budget?: string;
  deadline?: string;
  message: string;
  consent: true;
}
```

### RODO

- Checkbox zgody i klauzula informacyjna pod formularzem (z fazy 4).
- Netlify **nie usuwa** zgłoszeń automatycznie. Ustaw cykliczne przypomnienie (co 12 miesięcy): eksport CSV i usunięcie starych zgłoszeń w panelu.
  Na prośbę o usunięcie danych usuwasz pojedyncze zgłoszenie w panelu _Forms_.
- Uwaga: usunięcie całego formularza w panelu jest nieodwracalne i kasuje wszystkie zgłoszenia.

### Test przed produkcją (bez zużywania kredytów)

Formularze działają dopiero na wdrożonej stronie. **Deploy brancha i Deploy Preview kosztują 0 kredytów**, więc przed merge do `main`
robimy jeden testowy deploy brancha, wysyłamy zgłoszenie i sprawdzamy: panel, powiadomienie, spam (pole `bot-field` wypełnione).
Lokalnie (Playwright) testujemy komponent z zamockowanym endpointem.

---

## Etapy

| #   | Etap                                                                                | Wynik                                      |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------ |
| 5.1 | `public/__forms.html`, pola ukryte, honeypot i pułapka czasowa w komponencie        | Formularz gotowy do wykrycia przez Netlify |
| 5.2 | `src/api/contact.ts` i hook `useContactMutation()` (TanStack Query), obsługa błędów | Pełny przepływ w interfejsie z mockiem     |
| 5.3 | Test deployu brancha: włączenie wykrywania, powiadomienie e-mail, test spamu        | Zgłoszenie dochodzi na skrzynkę            |
| 5.4 | (opcjonalnie) `submission-created.ts` + EmailJS                                     | Klient dostaje automatyczną odpowiedź      |
| 5.5 | Testy i przegląd z autorem                                                          | Akceptacja                                 |

## Kryteria ukończenia

- [ ] Zgłoszenie z formularza dociera na skrzynkę autora i jest widoczne w panelu Netlify
- [ ] Honeypot i Akismet blokują boty (sprawdzone ręcznie)
- [ ] Koszt nadal = domena: żadnych płatnych usług ani karty
- [ ] Testy: Vitest (walidacja), Playwright (wysyłka z zamockowanym endpointem, ścieżka błędu)
- [ ] Autor zaakceptował treść powiadomienia (oraz auto-odpowiedzi, jeśli wdrażamy)

## Pytania do autora

1. Na jaki adres mają przychodzić zgłoszenia?
2. Czy chcesz automatyczną odpowiedź do klienta (wymaga konta EmailJS)? Treść np. „Dzięki! Odezwę się w ciągu 48 h”.
3. Czy zgłoszenia mają też trafiać na Slacka lub inny webhook?
