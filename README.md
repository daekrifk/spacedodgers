# Dodge Run

Et enkelt arkadespill i nettleseren – perfekt for intern utviklerkonkurranse.

## Spill

Åpne `index.html` i nettleseren (dobbelklikk eller `npx serve .`).

**Mål:** Unngå hindringene så lenge du kan. Jo lenger du overlever, jo høyere score.

### Kontroller

| Tast | Handling |
|------|----------|
| `←` `→` `↑` `↓` | Beveg spilleren |
| `W` `A` `S` `D` | Alternativ bevegelse |
| `Space` | Start / spill igjen |

### Levels

Hvert **400 poeng** gir nytt level:

| Level | Tema | Endring |
|-------|------|---------|
| 1 | By | Standard hastighet |
| 2 | Skog | Raskere, grønn bakgrunn |
| 3 | Lava | Enda raskere |
| 4 | Rom | Stjerner i bakgrunnen |
| 5 | Neon | Maks hastighet |

Flere hindringer spawner, og de beveger seg raskere for hvert level.

### Score & konkurranse

Når du taper vises scoren stort på skjermen – ta **screenshot** og del i Slack/Teams.

## Konkurranseidéer

- Høyeste score innen fredag kl. 16:00 vinner
- Bonuspoeng for å nå Level 4+
- «Clean run» – ingen skade på 60 sekunder
- Lag-turnering: beste snitt av 3 forsøk

## Teknologi

Ren HTML, CSS og JavaScript – ingen avhengigheter.

```
.
├── index.html
├── css/game.css
├── js/game.js
└── README.md
```

## Utvidelser (ideer til PR)

- [ ] Online leaderboard med Firebase/Supabase
- [ ] Power-ups (skjold, slow-mo)
- [ ] Touch-styring for mobil
- [ ] Lyd og musikk
- [ ] Daglig challenge-modus

---

Laget for intern konkurranse. Lykke til, og may the best dev win.
