# Changelog — Corrections & Améliorations IFE FOOD Admin

> Sprint de corrections transverses — Mai 2026

---

## 1. Rubrique Clients — Filtres & Recherche

**Fichiers modifiés :**
- `ADMIN/src/pages/users/Users.tsx`
- `BACKEND/src/admin/admin.service.ts`
- `BACKEND/src/admin/admin.controller.ts`

**Ce qui a été fait :**
- Correction des filtres région/ville qui ne déclenchaient pas de refetch (ajout de `region` et `city` dans le `queryKey`)
- Ajout d'une recherche textuelle par nom, prénom, téléphone ou email (champ avec icône loupe, `w-56`)
- Paramètre `search` propagé jusqu'au backend (OR filter Prisma, insensible à la casse)
- Ajout du champ `deletedAt: null` dans la requête pour exclure les comptes supprimés
- Affichage de **Dernière connexion** (`lastLoginAt`) et **Langue** dans l'onglet info du détail client

---

## 2. Commissions — Suppression du taux global Professionnels

**Fichiers modifiés :**
- `ADMIN/src/pages/payments/Payments.tsx`

**Ce qui a été fait :**
- Suppression du champ "Taux global Professionnels" (le taux par palier RPO suffit)
- Le bloc `CommRateForm label="Professionnels"` retiré de l'UI
- La variable `proRate` et ses références entièrement supprimées
- Le titre "Taux globaux (par défaut)" renommé en "Configuration des commissions"
- La structure de sauvegarde `professional` ne contient plus que `{ tiers: [...] }`

---

## 3. Champs Pays — Remplacement par des selects complets

**Fichiers modifiés :**
- `ADMIN/src/pages/delivery/DeliveryFees.tsx`
- `ADMIN/src/pages/promos/PromoCodes.tsx`
- `ADMIN/src/pages/payments/Payments.tsx`
- `ADMIN/src/pages/drivers/Drivers.tsx`
- `ADMIN/src/pages/professionals/Professionals.tsx`
- `ADMIN/src/pages/users/Users.tsx`

**Ce qui a été fait :**
- Tous les champs texte libres pour les codes pays remplacés par des `<select>` alimentés par la constante `COUNTRIES`
- Surcharges commissions par pays : remplacement des boutons toggle (limités à quelques pays actifs) par un `<select>` + bouton "Ajouter" permettant de choisir parmi tous les pays
- Codes promo : remplacement des 4 boutons toggle codés en dur par un `<select multiple>` avec badges de sélection et bouton "tout effacer"

---

## 4. Bug Focus — Perte de focus à chaque frappe dans les formulaires

**Fichiers modifiés :**
- `ADMIN/src/pages/delivery/DeliveryFees.tsx`
- `ADMIN/src/pages/drivers/Drivers.tsx`
- `ADMIN/src/pages/professionals/Professionals.tsx`

**Cause :** Les sous-composants (`F`, `Field`, `ProductForm`, `PromoForm`) étaient définis à l'intérieur d'autres composants. React les recrée à chaque rendu, provoquant un unmount/remount DOM de tous leurs enfants → perte de focus.

**Corrections appliquées :**

| Composant | Solution |
|---|---|
| `F` dans `DeliveryFees` | Déplacé au niveau du fichier |
| `Field` dans `Drivers` | Déplacé au niveau du fichier |
| `ProductForm` dans `Professionals` | JSX inliné directement dans le rendu |
| `PromoForm` dans `Professionals` | Converti en helper `promoFormJsx(isEdit: boolean)` |

---

## 5. Création Admin — Code PIN → Mot de passe

**Fichiers modifiés :**
- `ADMIN/src/pages/settings/Settings.tsx`
- `BACKEND/src/admin/admin.service.ts`

**Ce qui a été fait :**
- Le champ "Code PIN" remplacé par un champ "Mot de passe" (`type="password"`, `autoComplete="new-password"`)
- Validation frontend : minimum 8 caractères (au lieu de 4 chiffres)
- Validation backend : `password.length < 8` → `BadRequestException`
- Le champ DB `pinHash` continue de stocker le hash bcrypt (pas de migration nécessaire)

---

## 6. Liste des Pays — ISO 3166-1 alpha-2 exhaustive (195 pays)

**Fichiers modifiés :**
- `ADMIN/src/constants/countries.ts`
- `BACKEND/src/admin/admin.service.ts`

**Ce qui a été fait :**

### Frontend (`countries.ts`)
- Réécriture complète avec **195 pays** reconnus par l'ONU
- Union type `region` étendu à **16 régions** : Afrique (Ouest, Centrale, Est, Nord, Australe), Moyen-Orient, Europe, Amérique (Nord, Centrale, Caraïbes, Sud), Asie (Centrale, Sud, Est, Sud-Est), Océanie
- `REGION_LABELS` mis à jour avec les 16 labels en français
- Exports préservés : `UEMOA_CODES`, `CEMAC_CODES`, `getCountryByCode`

### Backend (`admin.service.ts`)
- `DEFAULT_COUNTRIES` étendu aux 195 pays avec emoji et devise
- `getCountries()` modifié : exécute `createMany({ skipDuplicates: true })` à **chaque appel** (et non plus seulement si la table est vide) → les pays manquants sont insérés automatiquement sans écraser les configurations existantes

---

## 7. Onglet Pays (Settings) — Tri de la liste

**Fichiers modifiés :**
- `ADMIN/src/pages/settings/Settings.tsx`

**Ce qui a été fait :**
- Ajout d'un sélecteur de tri en haut de la liste des pays
- 4 options disponibles :
  - **Actifs en premier** (défaut)
  - **Inactifs en premier**
  - **Nom A → Z**
  - **Nom Z → A**
- Tri secondaire alphabétique pour les pays au même niveau de statut
- Tri 100 % côté client, aucune requête supplémentaire

---

## Récapitulatif des commits

| Repo | Commit | Description |
|---|---|---|
| `ife-food-admin` | `fcc2a45` | feat(ref-data): liste pays exhaustive ISO 3166-1 alpha-2 (195 pays) |
| `ife-food-admin` | `45af2d3` | feat(settings/pays): tri de la liste des pays |
| `ife-food-backend` | `4adcc60` | feat(countries): liste pays exhaustive + seed automatique |
| `ife-food-backend` | (sprint précédent) | fix(users): recherche textuelle + lastLoginAt |
| `ife-food-backend` | (sprint précédent) | fix(admin): mot de passe à la place du code PIN |
| `ife-food-admin` | (sprint précédent) | fix(payments): suppression taux global professionnels |
| `ife-food-admin` | (sprint précédent) | fix(forms): correction perte de focus (composants inline) |
| `ife-food-admin` | (sprint précédent) | feat(forms): selects pays dans tous les formulaires |
