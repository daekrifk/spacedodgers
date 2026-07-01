# Dodge Run

Et enkelt arkadespill i nettleseren med **online leaderboard** via Supabase.

## Kom i gang

### 1. Supabase-oppsett

Følg [`SUPABASE-SETUP.md`](SUPABASE-SETUP.md) for å opprette prosjekt, kjøre SQL og fylle inn `js/config.js`.

### 2. Kjør lokalt

```bash
npx serve .
```

Åpne `http://localhost:3000`

### 3. Spill med venner

1. Registrer deg med e-post, passord og visningsnavn
2. Start spill (krever innlogging)
3. Score lagres automatisk på leaderboard ved game over

## Spill

**Mål:** Unngå hindringene så lenge du kan. Jo lenger du overlever, jo høyere score.

### Kontroller

| Tast | Handling |
|------|----------|
| `←` `→` `↑` `↓` | Beveg spilleren |
| `W` `A` `S` `D` | Alternativ bevegelse |
| `Space` | Start / spill igjen (krever innlogging) |

### Levels

Hvert **400 poeng** gir nytt level:

| Level | Tema | Endring |
|-------|------|---------|
| 1 | By | Standard hastighet |
| 2 | Skog | Raskere, grønn bakgrunn |
| 3 | Lava | Enda raskere |
| 4 | Rom | Stjerner i bakgrunnen |
| 5 | Neon | Maks hastighet |
| 6 | God Mode | Ultimate challenge |

### Power-ups (fallende stjerner)

| Stjerne | Effekt | Varighet |
|---------|--------|----------|
| Blå | Skjold – blokkerer **ett** treff | Maks 3 sek |
| Lilla | Mini – mindre hitbox | 5 sek |
| Gull | God Mode – usårbar, knuser kuber | 4 sek |

## Leaderboard

- Én **personlig rekord** per bruker (høyeste score telles)
- Topp 20 vises i sidepanelet
- Krever innlogging med e-post og passord

## Teknologi

```
.
├── index.html
├── css/game.css
├── js/
│   ├── config.js          ← Supabase URL + anon key
│   ├── auth.js            ← Innlogging
│   ├── leaderboard.js     ← Score + leaderboard
│   └── game.js
├── supabase/
│   └── schema.sql         ← Database-oppsett
└── SUPABASE-SETUP.md
```

- Frontend: ren HTML, CSS, JavaScript
- Backend: [Supabase](https://supabase.com) (gratis, open source PostgreSQL)

## Publisering (senere)

1. Push til GitHub
2. Aktiver **GitHub Pages** på `main`-branchen
3. Oppdater Supabase **Site URL** til din live-adresse
4. Hver `git push` oppdaterer spillet automatisk

## Utvidelser (ideer)

- [ ] Touch-styring for mobil
- [ ] Lyd og musikk
- [ ] Anti-juks validering (Edge Function)
- [ ] Ukentlig turnering-modus

---

Laget for vennekonkurranse. Lykke til!
