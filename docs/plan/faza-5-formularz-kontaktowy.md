# Faza 5: Podpięcie formularza kontaktowego

> **Status:** ⚪ nie rozpoczęta (wymaga ukończenia fazy 4)
> **Poprzednia:** [Faza 4](./faza-4-podstrony-i-tresci.md) · **Następna (opcjonalna):** [Faza 6](./faza-6-minigra-kaplay.md)

## Warunek ukończenia (z briefu)

Podpięty **darmowy** formularz kontaktowy, np. EmailJS albo inny, który zmieści się w limicie.

## Cel

Formularz „Zgłoś się po stronę” z fazy 4 naprawdę wysyła zgłoszenie. Autor dostaje e-mail, osoba zgłaszająca dostaje
automatyczne potwierdzenie, a boty nie są w stanie zużyć darmowego limitu.

## Wybór usługi

| Usługa | Darmowy limit | Plusy | Minusy |
|---|---|---|---|
| **EmailJS** (rekomendacja, zgodnie z briefem) | 200 e-maili/mies., 2 szablony | Szablony HTML, **automatyczna odpowiedź** do klienta (drugi szablon), REST API | Klucz publiczny w przeglądarce można nadużyć, jeśli nie ma ochrony |
| Web3Forms (zapas) | 250 zgłoszeń/mies. | hCaptcha, bez szablonów do utrzymania | Brak automatycznej odpowiedzi w planie Free, historia tylko 30 dni |

Przy portfolio (kilka do kilkunastu zgłoszeń miesięcznie) oba limity wystarczą z dużym zapasem, **pod warunkiem**, że boty go nie zjedzą.

## Architektura (rekomendowana)

```
Formularz (faza 4)
   │  POST /api/contact  { name, email, siteType, budget?, deadline?, message, consent, website, turnstileToken }
   ▼
Worker „cv”
   1. Walidacja Zod (contactRequestSchema z @cv/shared)
   2. Honeypot: pole „website” niepuste → udajemy sukces, nic nie wysyłamy
   3. Pułapka czasowa: formularz wysłany < 3 s od otwarcia → odrzucamy
   4. Cloudflare Turnstile: weryfikacja tokenu (siteverify)
   5. INSERT do D1 „contact_requests” (kopia zapasowa: zgłoszenie nie przepadnie nawet przy błędzie e-maila)
   6. EmailJS REST API: szablon „nowe zgłoszenie” do autora + szablon „automatyczna odpowiedź” do klienta
   7. Odpowiedź { ok: true } albo ApiError
```

**Dlaczego przez Workera, a nie prosto z przeglądarki:** klucz publiczny EmailJS jest widoczny w kodzie strony.
Bot mógłby wysłać 200 wiadomości i zablokować formularz do końca miesiąca. Turnstile i reguła WAF w Workerze chronią limit,
a kopia w D1 gwarantuje, że żadne zgłoszenie nie zginie.

**Wariant uproszczony** (jeśli autor nie chce backendu dla formularza): `@emailjs/browser` wprost z przeglądarki,
wbudowana w EmailJS obsługa reCAPTCHA i ograniczenie do własnej domeny w panelu EmailJS.
Mniej kodu, ale słabsza ochrona i brak kopii zgłoszeń.

### Migracja D1: `apps/api/migrations/0002_contact_requests.sql`

```sql
CREATE TABLE contact_requests (
  id         TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,          -- ISO 8601 UTC
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  site_type  TEXT NOT NULL,
  budget     TEXT,
  deadline   TEXT,
  message    TEXT NOT NULL,
  email_sent INTEGER NOT NULL DEFAULT 0  -- 1 gdy EmailJS potwierdził wysyłkę
);
```

### Typ w `packages/shared/src/types.ts`

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
  website: string; // honeypot, musi być pusty
  turnstileToken: string;
}

export interface ContactResponse {
  ok: true;
}
```

### Sekrety i konfiguracja

| Nazwa | Gdzie | Uwagi |
|---|---|---|
| `EMAILJS_SERVICE_ID` | `wrangler secret` | |
| `EMAILJS_TEMPLATE_OWNER` | `wrangler secret` | szablon „nowe zgłoszenie” |
| `EMAILJS_TEMPLATE_AUTOREPLY` | `wrangler secret` | szablon „dziękuję, odezwę się” |
| `EMAILJS_PUBLIC_KEY` | `wrangler secret` | |
| `EMAILJS_PRIVATE_KEY` | `wrangler secret` | w panelu EmailJS trzeba włączyć dostęp do API spoza przeglądarki |
| `TURNSTILE_SECRET_KEY` | `wrangler secret` | |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | zmienna buildu frontu | klucz publiczny, może być jawny |

### RODO

- Checkbox zgody i klauzula informacyjna pod formularzem (z fazy 4).
- **Retencja:** codzienny Cron Trigger w Workerze (darmowy) usuwa zgłoszenia starsze niż 12 miesięcy.
- Na prośbę o usunięcie danych: `wrangler d1 execute cv-db --remote --command "DELETE FROM contact_requests WHERE email = '…'"`.

### Pilnowanie limitu

- Worker liczy wysłane e-maile w bieżącym miesiącu (`SELECT COUNT(*) … WHERE email_sent = 1`).
  Powyżej 180 przestaje wołać EmailJS i tylko zapisuje zgłoszenie w D1. Użytkownik nadal widzi sukces.
- Gdy EmailJS zwróci błąd lub przekroczony limit: zgłoszenie zostaje w D1 z `email_sent = 0`, a użytkownik widzi sukces.

---

## Etapy

| # | Etap | Wynik |
|---|---|---|
| 5.1 | Konto EmailJS, podpięcie skrzynki, 2 szablony (do autora i automatyczna odpowiedź) | Testowy e-mail z panelu EmailJS dochodzi |
| 5.2 | Turnstile: widżet w formularzu, klucze | Token generuje się w formularzu |
| 5.3 | Migracja `0002`, trasa `/api/contact` w Workerze, zabezpieczenia, wywołanie EmailJS | Zgłoszenie z formularza trafia na skrzynkę |
| 5.4 | Front: zamiana atrapy na `useContactMutation()` (TanStack Query), obsługa błędów | Pełny przepływ z UI |
| 5.5 | Retencja (Cron Trigger) i pilnowanie limitu | Zgodność z RODO |
| 5.6 | Testy i przegląd z autorem | Akceptacja |

## Kryteria ukończenia

- [ ] Zgłoszenie z formularza dociera na skrzynkę autora, a automatyczna odpowiedź do klienta
- [ ] Każde zgłoszenie jest zapisane w D1, nawet gdy e-mail się nie wyśle
- [ ] Honeypot, pułapka czasowa i Turnstile blokują boty (sprawdzone ręcznie i testem)
- [ ] Koszt nadal = domena: wszystkie usługi w darmowych planach, bez karty
- [ ] Testy: Vitest (walidacja, honeypot, limit), Playwright (wysyłka z zamockowanym EmailJS, ścieżka błędu)
- [ ] Autor zaakceptował treść obu e-maili

## Pytania do autora

1. Na jaki adres mają przychodzić zgłoszenia?
2. Treść automatycznej odpowiedzi, np. „Dzięki! Odezwę się w ciągu 48 h”.
3. Rekomendowana architektura z Workerem czy wariant uproszczony?
