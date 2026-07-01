# Supabase-oppsett for Dodge Run

## 1. Opprett prosjekt (~5 min)

1. Gå til [supabase.com](https://supabase.com) og logg inn
2. **New project** → velg navn (f.eks. `dodge-run`) og passord
3. Vent til prosjektet er klart

## 2. Hent API-nøkler

1. **Settings → API**
2. Kopier **Project URL** og **anon public** key
3. Lim inn i [`js/config.js`](js/config.js):

```javascript
window.SUPABASE_CONFIG = {
    url: 'https://xxxxx.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

## 3. Slå på e-post-innlogging

1. **Authentication → Providers → Email**
2. Slå på **Enable Email provider**
3. **Confirm email** kan være på eller av (av = raskere for venner under testing)

## 4. URL for lokal testing

1. **Authentication → URL Configuration**
2. **Site URL:** `http://localhost:3000`
3. **Redirect URLs:** legg til `http://localhost:3000`

## 5. Kjør databaseskjema

1. **SQL Editor → New query**
2. Lim inn hele innholdet fra [`supabase/schema.sql`](supabase/schema.sql)
3. Klikk **Run**

## 6. Test

```bash
cd spacedodgers
npx serve .
```

Åpne `http://localhost:3000` → registrer bruker → spill → sjekk leaderboard.

## Når du går live (senere)

Oppdater **Site URL** og **Redirect URLs** i Supabase til din GitHub Pages-URL, f.eks.  
`https://fredrikstad-kommune.github.io/spacedodgers/`
