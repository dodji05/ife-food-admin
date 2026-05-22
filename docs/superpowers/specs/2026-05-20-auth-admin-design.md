# Sprint 1 — Authentification Admin IFE FOOD

**Date :** 2026-05-20
**Périmètre :** Dashboard admin uniquement. Le flux OTP mobile (clients, professionnels, livreurs) n'est pas modifié.
**Stack :** NestJS (backend) + React/TypeScript + Zustand + Axios (frontend)

---

## Contexte

L'espace admin utilise actuellement le même flux OTP téléphone que les clients mobiles (SMS Bénin). Ce flux est inadapté à un dashboard desktop : dépendance SMS, pas de reset autonome, token JWT stocké en `localStorage` (vulnérable XSS).

Le flux OTP sur `/auth/otp/*` reste intact et exclusivement utilisé par les apps mobiles.

---

## Architecture

Deux flux d'authentification **totalement séparés** dans le backend :

```
Mobile (inchangé)           Admin (nouveau)
─────────────────           ────────────────
POST /auth/otp/send         POST /auth/admin/login
POST /auth/otp/verify       POST /auth/admin/refresh
                            POST /auth/admin/logout
                            POST /auth/admin/request-reset
                            POST /auth/admin/confirm-reset
                            GET  /auth/admin/me
```

Les tokens admin sont transmis exclusivement via cookies `HttpOnly; Secure; SameSite=Strict` — jamais exposés au JavaScript.

---

## Backend

### Fichiers créés (aucun fichier existant modifié)

```
src/auth/admin-auth.controller.ts
src/auth/admin-auth.service.ts
src/auth/dto/admin-auth.dto.ts
src/common/decorators/admin-level.decorator.ts
src/common/guards/admin-level.guard.ts
prisma/seed-admin.ts
```

### Endpoints

#### `POST /auth/admin/login`
- **Body :** `{ email: string, password: string }`
- **Logique :**
  1. Cherche `User` par `email` avec `role = ADMIN`
  2. Vérifie `user.status === ACTIVE`
  3. `bcrypt.compare(password, user.pinHash)` — réutilise le champ existant, aucune migration
  4. Émet `accessToken` (JWT 15 min) + `refreshToken` (JWT 7 jours)
  5. Sette les deux cookies `HttpOnly; Secure; SameSite=Strict`
  6. Retourne `{ user: { id, email, name, firstName, role, admin: { level } } }`
- **Erreurs :** `401` si email inconnu, password incorrect, ou compte non-ADMIN. Message générique unique ("Identifiants invalides") pour éviter l'énumération.

#### `POST /auth/admin/refresh`
- Lit le cookie `refreshToken`
- Vérifie la signature JWT + `user.status === ACTIVE`
- Émet un nouveau `accessToken` en cookie
- Retourne `{ ok: true }`

#### `POST /auth/admin/logout`
- Clear les deux cookies (maxAge=0)
- Retourne `{ ok: true }`

#### `POST /auth/admin/request-reset`
- **Body :** `{ email: string }`
- Vérifie que l'email correspond à un admin ACTIVE
- Envoie OTP SMS au numéro de téléphone du compte (réutilise `OtpService` existant)
- Retourne `{ ok: true, sessionId: string }` — message générique même si email inconnu (anti-énumération)

#### `POST /auth/admin/confirm-reset`
- **Body :** `{ email: string, sessionId: string, code: string, newPassword: string }`
- Vérifie OTP via `OtpService`
- Valide `newPassword` : min 8 caractères, au moins 1 chiffre
- `bcrypt.hash(newPassword, 12)` → `user.pinHash`
- Retourne `{ ok: true }`

#### `GET /auth/admin/me`
- Protégé par `JwtAuthGuard` + `@Roles('ADMIN')`
- Retourne le profil complet de l'admin connecté (depuis le cookie accessToken)

### Système de permissions par niveau

**Décorateur `@AdminLevel(...levels)`** sur les routes sensibles.
**Guard `AdminLevelGuard`** lit `user.admin.level` depuis le payload JWT.

| Action backend | Niveaux autorisés |
|---|---|
| Login, me, refresh, logout | tous niveaux ADMIN |
| Valider pros/livreurs | SUPER_ADMIN, ADMIN, MODERATOR |
| Suspendre/bannir users | SUPER_ADMIN, ADMIN, MODERATOR |
| Gérer codes promo | SUPER_ADMIN, ADMIN |
| Modifier config commission | SUPER_ADMIN, ADMIN |
| Mode maintenance | SUPER_ADMIN uniquement |
| Créer/supprimer admins | SUPER_ADMIN uniquement |
| Analytics (lecture seule) | tous niveaux ADMIN |

### Seed admin initial

`prisma/seed-admin.ts` — crée un compte SUPER_ADMIN depuis les variables d'environnement :
```
SEED_ADMIN_EMAIL=admin@ifefood.com
SEED_ADMIN_PASSWORD=...
SEED_ADMIN_PHONE=+229...
```
Commande : `npx ts-node prisma/seed-admin.ts`

---

## Frontend

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/pages/auth/Login.tsx` | Remplacé : form email+password, plus d'OTP |
| `src/store/auth.ts` | Suppression localStorage, store garde uniquement `user` |
| `src/services/api.ts` | Ajout `withCredentials: true` + intercepteur refresh |

**Backend — 1 fichier existant modifié (minimal) :**

| Fichier | Changement |
|---|---|
| `src/auth/strategies/jwt.strategy.ts` | Extraction du token depuis le cookie `accessToken` EN PLUS du header `Authorization: Bearer` (les deux sources supportées pour compatibilité) |

### Fichiers ajoutés

| Fichier | Rôle |
|---|---|
| `src/hooks/useAdminLevel.ts` | Hook retournant le niveau admin courant et les helpers `canDo('maintenance')` etc. |

### Login.tsx — nouveau flow

```
┌─────────────────────────────┐
│        ifè FOOD Admin       │
│                             │
│  Adresse e-mail             │
│  [___________________________]│
│                             │
│  Mot de passe           👁  │
│  [___________________________]│
│                             │
│  [ Se connecter            ]│
│                             │
│  Mot de passe oublié ?      │
└─────────────────────────────┘
```

Flow "Mot de passe oublié" :
1. Saisie email → `POST /auth/admin/request-reset` → OTP SMS
2. Saisie OTP + nouveau mot de passe → `POST /auth/admin/confirm-reset`
3. Redirect login

### auth.ts — migration

- Suppression de `localStorage.setItem/removeItem` pour le token
- `setAuth(user)` stocke uniquement le profil utilisateur en mémoire Zustand
- `logout()` appelle `POST /auth/admin/logout` puis vide le store
- Au montage de l'app : `GET /auth/admin/me` pour restaurer la session depuis le cookie (si valide)
- `ProtectedRoute` attend la réponse de `/me` avant de rediriger (état `initializing`)

### api.ts — intercepteur refresh

```
Requête → 401 reçu
  → Si pas déjà en train de refresh :
    → POST /auth/admin/refresh
    → Succès : rejoue la requête originale
    → Échec : logout() + redirect /login
  → Si déjà en train de refresh : queue la requête, attendre
```

Flag `_isRefreshing` + queue pour éviter les redirections multiples en cas de N requêtes parallèles expirées.

### useAdminLevel.ts

```typescript
// Retourne le niveau et des helpers booléens
const { level, can } = useAdminLevel()
can('manage-commission')  // true si SUPER_ADMIN ou ADMIN
can('maintenance')        // true si SUPER_ADMIN uniquement
```

Les boutons d'action destructifs sont **masqués** (non juste désactivés) si `can(...)` retourne false. Aucun écran entier n'est masqué.

---

## Sécurité

| Menace | Mitigation |
|---|---|
| XSS vol de token | Cookie HttpOnly — JS ne peut pas lire le token |
| CSRF | `SameSite=Strict` sur les cookies + vérification `Origin` header côté NestJS |
| Énumération emails | Message d'erreur générique "Identifiants invalides" pour login et request-reset |
| Brute force | Rate limiting sur `/auth/admin/login` (5 tentatives / 15 min par IP) via `@nestjs/throttler` |
| Token expiré | Refresh automatique transparent, logout si refresh échoue |

---

## Ce qui n'est PAS dans ce sprint

- Gestion de l'interface de création de comptes admin (sprint suivant — Gestion utilisateurs)
- 2FA TOTP (déclaré dans schema `twoFaSecret` mais hors scope)
- Session multi-device / révocation de sessions individuelles
- Logs d'audit des connexions (le model `LoginLog` existe mais n'est pas branché ici)

---

## Impacts

- **Mobile :** Aucun. Flux OTP `/auth/otp/*` intact.
- **Backend :** 5 nouveaux fichiers. Aucun fichier existant modifié.
- **Frontend :** 3 fichiers modifiés, 1 ajouté.
- **Base de données :** Aucune migration — `pinHash` et `email` existent déjà dans `User`.
- **Déploiement :** Ajouter `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_PHONE` aux variables d'environnement du VPS. Lancer le seed une fois.
