# Faza 6 (opcjonalna): Minigra w KAPLAY

> **Status:** 🔒 zablokowana. Planowanie dopiero po ukończeniu faz 1 do 5.
> **Poprzednia:** [Faza 5](./faza-5-formularz-kontaktowy.md)

## Warunek startu (z briefu)

Faza jest opcjonalna. Szczegółowy plan przygotowujemy **po ukończeniu produktu**.
Ten plik zbiera tylko założenia, żeby wcześniejsze fazy niczego nie zablokowały.

## Ważne: Kaboom.js → KAPLAY

Kaboom.js **nie jest już rozwijany**. Komunikat w npm: *„Kaboom is no longer maintained. Please use KAPLAY,
the new game library built as its successor, by its developers.”* KAPLAY ma niemal to samo API
(`kaplay()` zamiast `kaboom()`), więc tutoriale do Kaboom w większości nadal działają.

```bash
pnpm --filter web add kaplay
```

## Założenia, które pilnujemy już teraz

- Gra żyje na osobnej trasie (np. `/gra`), ładowana **dynamicznie**. KAPLAY nie trafia do głównej paczki JS.
- Estetyka spójna ze stroną: skala szarości, kwadraty i cyfry z silnika z faz 2 i 3.
- Sterowanie klawiaturą **i dotykiem**. Pauza po utracie fokusu karty.
- Zero wpływu na wydajność reszty strony: kursor i canvasy strony są wyłączone, gdy gra działa.
- Ewentualne wyniki zapisujemy w tym samym Workerze i D1 (`/api/scores`), więc koszt nadal = domena.

## Pomysły do wyboru przy planowaniu

1. **Pixel Breaker:** arkanoid, w którym cegłami są kwadraty z pola pikseli. Wybuch to „power-up”.
2. **ASCII Runner:** endless runner z awatarem z cyfr (portret z fazy 2 w małej skali).
3. **Rozbrój bombę:** szybka gra zręcznościowa nawiązująca do „wybuchu”. Wynik zapisujemy obok wybuchów.

## Lista do zaplanowania (po fazie 5)

- [ ] Wybór koncepcji i zasad gry
- [ ] Sterowanie: desktop i telefon
- [ ] Grafiki pikselowe (darmowe narzędzia: Piskel, LibreSprite)
- [ ] Punktacja, ewentualna tabela wyników i podstawowa ochrona przed oszustwami
- [ ] Endpointy API i migracja D1
- [ ] Dostępność: możliwość pominięcia, opis zasad
- [ ] Kryteria ukończenia i szacunek czasu
