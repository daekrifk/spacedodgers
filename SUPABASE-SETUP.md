# Supabase-oppsett for Dodge Run

## Kort svar på vanlige spørsmål

| Spørsmål | Svar |
|----------|------|
| Må jeg lage tabeller manuelt? | **Nei** – kjør [`supabase/schema.sql`](supabase/schema.sql) i SQL Editor. Den lager alt. |
| Er det trygt i `config.js`? | **Publishable/anon key: ja** (designet for nettleser). **Secret/service_role: aldri.** |
| Trenger jeg `.env`? | Ikke lokalt uten build-verktøy. Vi bruker `config.js` som er **gitignored**. |
| Hva med GitHub Pages? | Se [Produksjon / GitHub Pages](#produksjon--github-pages) – nøkler injiseres via GitHub Secrets. |

---

## Sikkerhetsmodell (viktig)

Supabase skiller mellom to typer nøkler:

| Nøkkel i dashboard | Trygg i frontend? | Hva den gjør |
|---------------------|-------------------|--------------|
| **Publishable key** / **anon public** | ✅ Ja | Leser/skriver data **innenfor** Row Level Security (RLS) |
| **Secret key** / **service_role** | ❌ Aldri | Full database-tilgang – kun på server |

Sikkerheten ligger i **RLS-reglene** i `schema.sql`, ikke i at du skjuler anon/publishable key. Alle som åpner nettsiden din kan uansett se den i nettleseren.

**Dette prosjektet:**
- `js/config.js` er i `.gitignore` – dine nøkler pushes ikke til GitHub
- `js/config.example.js` ligger i repo som mal (uten ekte nøkler)
- Ved GitHub Pages-deploy genereres `config.js` fra **GitHub Secrets** (se nederst)

---

## 1. Opprett prosjekt

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Velg navn (f.eks. `dodge-run`), region, database-passord
3. Vent til prosjektet er klart

---

## 2. Finn Project URL og nøkkel

### Project URL

Hvis du ikke ser «Project URL» under API:

1. **Project Settings** (tannhjul) → **General**
2. Se **Reference ID** (f.eks. `abcdefghijklmnop`)
3. URL er da: `https://abcdefghijklmnop.supabase.co`

Eller under **API Keys** / **API** – noen ganger står URL øverst på siden.

### Nøkkel du skal bruke

Under **Project Settings → API Keys**:

- Bruk **Publishable key** (nytt navn) **eller** **anon public** (gammelt navn)
- **Ikke** bruk **Secret key** eller **service_role**

---

## 3. Lag lokal config (ikke i Git)

I PowerShell fra `spacedodgers`-mappen:

```powershell
copy js\config.example.js js\config.js
```

Åpne `js/config.js` og fyll inn:

```javascript
window.SUPABASE_CONFIG = {
    url: 'https://DIN-REFERENCE-ID.supabase.co',
    publishableKey: 'sb_publishable_... eller eyJ...'
};
```

---

## 4. Slå på e-post-innlogging

1. **Authentication → Providers → Email**
2. Slå på **Enable Email provider**
3. For venner/testing: slå **av** «Confirm email»

---

## 5. URL for lokal testing

1. **Authentication → URL Configuration**
2. **Site URL:** `http://localhost:3000`
3. **Redirect URLs:** `http://localhost:3000`

---

## 6. Lag tabeller (SQL – ikke manuelt i UI)

1. **SQL Editor → New query**
2. Kopier **hele** [`supabase/schema.sql`](supabase/schema.sql)
3. Klikk **Run**

Dette oppretter:
- `profiles` – visningsnavn
- `scores` – personlig rekord per spiller
- `submit_score()` – lagrer kun høyere score
- RLS-policies – brukere kan ikke endre andres data
- Trigger – oppretter profil ved registrering

Du kan verifisere under **Table Editor** – da skal `profiles` og `scores` vises.

### Spillerstatistikk (valgfritt, for statistikk-panelet)

1. **SQL Editor → New query**
2. Kopier **hele** [`supabase/stats.sql`](supabase/stats.sql)
3. Klikk **Run**

Dette oppretter `player_stats` og `finish_game_run()` som lagrer både leaderboard og aggregert statistikk per runde.

### Chat (valgfritt)

1. **SQL Editor → New query**
2. Kopier **hele** [`supabase/chat.sql`](supabase/chat.sql)
3. Klikk **Run**

---

## Nullstill spilldata (start leaderboard/stats/chat på nytt)

1. **SQL Editor → New query**
2. Kopier **hele** [`supabase/reset-data.sql`](supabase/reset-data.sql)
3. Klikk **Run**

Dette tømmer scores, statistikk og chat. **Innlogging beholdes** – samme brukere kan registrere seg og spille igjen.

For å slette **alle brukere** også: **Authentication → Users** → slett brukerne der (cascade sletter alt i databasen).

---

## 7. Test lokalt

```powershell
cd c:\Github\test\spacedodgers
python -m http.server 3000
```

Åpne http://localhost:3000 → Registrer → Spill → Sjekk leaderboard.

---

## Produksjon / GitHub Pages

Ren statisk hosting har **ingen server** – `.env` fungerer ikke uten build-steg.

**Anbefalt flyt:**

1. Legg secrets i GitHub repo → **Settings → Secrets and variables → Actions**:
   - `SUPABASE_URL` = `https://xxx.supabase.co`
   - `SUPABASE_PUBLISHABLE_KEY` = publishable/anon key

2. Workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) genererer `config.js` ved deploy – nøkkelen ligger aldri i git-historikk.

3. Oppdater Supabase **Site URL** og **Redirect URLs** til live-URL, f.eks.  
   `https://fredrikstad-kommune.github.io/spacedodgers/`

**Alternativ (enklere, også OK):** Commit `config.js` med kun publishable key. Supabase er designet for dette med RLS. Vi anbefaler GitHub Secrets for ekstra trygghet.

---

## Feilsøking

| Problem | Løsning |
|---------|---------|
| Gul «ikke konfigurert»-advarsel | Lag `config.js` fra `config.example.js` |
| `config.js` 404 i nettleser | Kjør `copy js\config.example.js js\config.js` |
| Tabeller finnes ikke | Kjør `schema.sql` på nytt i SQL Editor |
| Må bekrefte e-post | Slå av confirm email, eller klikk lenke i e-post |
