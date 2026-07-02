// Kopier denne filen til config.js og fyll inn dine verdier:
//   copy js\config.example.js js\config.js
//
// Supabase Dashboard → Project Settings (tannhjul) → API Keys
//
//   url            = Project URL  (f.eks. https://abcdefgh.supabase.co)
//   publishableKey = "publishable" / "anon public" key  ← BRUK DENNE i frontend
//
// ALDRI legg secret key / service_role i config.js – den bypasser all sikkerhet.

window.SUPABASE_CONFIG = {
    url: 'https://DITT-PROSJEKTREF.supabase.co',
    publishableKey: 'DIN_PUBLISHABLE_ELLER_ANON_KEY'
};
