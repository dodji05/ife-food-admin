# ifè FOOD Admin — Dashboard React Web

> Ets SWK FAKEYE, Bénin | Stack : React 18 + Vite + TailwindCSS + Recharts + TanStack Query

## 🚀 Démarrage

```bash
npm install
npm run dev        # → http://localhost:3001
npm run build      # Production build
```

## 📄 Pages

| Route | Description |
|-------|-------------|
| `/login` | Auth OTP admin |
| `/dashboard` | KPIs, graphiques, commandes live |
| `/orders` | Toutes les commandes avec filtres |
| `/analytics` | Revenus par pays, catégories, entonnoir |
| `/users` | Gestion clients |
| `/professionals` | File validation + liste tous pros |
| `/drivers` | File validation livreurs |
| `/catalogue` | Catalogue global |
| `/payments` | Config commission + passerelles |
| `/content` | Éditeur pages légales multilingues |
| `/settings` | Config OTP, délais métier, maintenance |

## 🎨 Design System (Dark Navy)

| Token | Valeur |
|-------|--------|
| `brand.green` | `#1A6B3C` |
| `brand.yellow` | `#F5C518` |
| `navy.950` | `#050D1A` (fond) |
| `navy.800` | `#0F2040` (sidebar) |
| `navy.700` | `#142A50` (cards) |
| Font | Nunito (Google Fonts) |

## 🔐 Auth
Connexion via OTP SMS/WhatsApp — rôle ADMIN requis.
Admin par défaut : téléphone configuré dans `ADMIN_PHONE` (`.env` back-end).

## 🔌 Proxy API
Vite proxie `/api` → `http://localhost:3000` en développement.
En production, configurer Nginx/Caddy pour router vers l'API back-end.
