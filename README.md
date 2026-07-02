# Dodge Run

Browser-basert arkadespill med online leaderboard.

## Spill

Unngå fallende hindringer og overlev så lenge som mulig. Poeng akkumuleres over tid; høyere nivå gir raskere hindringer og hyppigere spawns.

### Kontroller

| Tast | Handling |
|------|----------|
| Piltaster / WASD | Bevegelse |
| Space | Start / restart |

Innlogging kreves for å spille.

### Nivåer

Nytt nivå hvert 400. poeng. 6 nivåer med økende hastighet og visuelt tema.

### Power-ups

| Type | Effekt |
|------|--------|
| Skjold | Blokkerer ett treff |
| Mini | Redusert hitbox |
| God mode | Usårbar i begrenset periode |

Flere power-ups kan være aktive samtidig. Samme type forlenger varigheten.

### Score og leaderboard

- Poeng øker kontinuerlig under spill.
- Ved game over lagres score som personlig rekord (kun hvis ny score er høyere).
- Leaderboard viser topp 20 spillere med navn, score og nivå.
- Krever registrering med e-post og passord.

## Teknologi

| Lag | Stack |
|-----|-------|
| Frontend | HTML, CSS, JavaScript (Canvas) |
| Auth og database | Supabase (PostgreSQL, Auth, RLS) |
| Hosting | GitHub Pages |

```
index.html
css/game.css
js/game.js, auth.js, leaderboard.js
supabase/schema.sql
```

Lokal kjøring: `python -m http.server 3000` — se `SUPABASE-SETUP.md` for backend-oppsett.
