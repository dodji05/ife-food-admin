# Désactivation du mode "Par zone" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retirer complètement le mode de calcul "Par zone" de l'interface admin et du profil livreur mobile.

**Architecture:** Modifications purement UI sur 2 fichiers — aucun changement backend. Le code backend `activeMode === 'zone'` est conservé mais ne sera plus jamais déclenché. Si le backend retourne encore `zone` comme mode actif (valeur DB existante), l'admin bascule automatiquement sur `km` et persiste ce choix.

**Tech Stack:** React 18 + TypeScript (admin) · Flutter/Dart (mobile)

---

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `ADMIN/src/pages/delivery/DeliveryFees.tsx` | Supprimer la carte "Par zone" du sélecteur, corriger les defaults, gérer la transition depuis `zone` |
| `MOBILE Serveur/lib/features/driver/screens/profile/driver_profile_screen.dart` | Supprimer l'entrée de menu "Zones de livraison" et l'import associé |

---

## Task 1 — Admin : retirer "Par zone" du sélecteur de mode

**Files:**
- Modify: `ADMIN/src/pages/delivery/DeliveryFees.tsx`

### Étape 1.1 — Corriger `loadModesConfig` (default `km` au lieu de `zone`)

- [ ] Dans `DeliveryFees.tsx`, repérer la fonction `loadModesConfig` (ligne ~72). Remplacer la valeur de retour par défaut :

```ts
// AVANT
return { zone: true, km: false, city: false }

// APRÈS
return { zone: false, km: true, city: false }
```

### Étape 1.2 — Corriger `activeModeFromConfig` (fallback `km` au lieu de `zone`)

- [ ] Repérer la fonction `activeModeFromConfig` (ligne ~89). Remplacer le retour final :

```ts
// AVANT
function activeModeFromConfig(cfg: ModesConfig): DeliveryMode {
  if (cfg.km) return 'km'
  if (cfg.city) return 'city'
  return 'zone'
}

// APRÈS
function activeModeFromConfig(cfg: ModesConfig): DeliveryMode {
  if (cfg.city) return 'city'
  return 'km'
}
```

### Étape 1.3 — Gérer la transition depuis `activeMode: 'zone'` (valeur DB existante)

- [ ] Repérer la `queryFn` du hook `useQuery` pour `delivery-mode-config` (ligne ~396). Modifier la logique pour basculer sur `km` si la DB retourne encore `zone` :

```ts
queryFn: () => api.get('/admin/config/delivery-mode').then((r: any) => {
  let m = (r?.data?.activeMode ?? r?.activeMode ?? 'km') as DeliveryMode
  // Zone mode désactivé — migration automatique vers km
  if (m === 'zone') m = 'km'
  const next: ModesConfig = { zone: false, km: m === 'km', city: m === 'city' }
  setModesConfig(next)
  setMode(m)
  saveModesConfig(next)
  // Persiste la migration en DB si la valeur était encore 'zone'
  if ((r?.data?.activeMode ?? r?.activeMode) === 'zone') {
    api.put('/admin/config/delivery-mode', { activeMode: 'km' })
  }
  return m
}),
```

### Étape 1.4 — Retirer la carte "Par zone" du sélecteur (grille 3→2 colonnes)

- [ ] Repérer le BLOC 2 "Mode de calcul actif" (ligne ~577). Remplacer :

```tsx
// AVANT
<div className="grid grid-cols-3 gap-2">
  {(['zone', 'km', 'city'] as DeliveryMode[]).map(m => {

// APRÈS
<div className="grid grid-cols-2 gap-2">
  {(['km', 'city'] as DeliveryMode[]).map(m => {
```

### Étape 1.5 — Commit admin

- [ ] Commit :

```bash
git add src/pages/delivery/DeliveryFees.tsx
git commit -m "feat(admin): disable zone delivery mode — remove card, fix defaults, auto-migrate DB"
```

- [ ] Push :

```bash
git push origin main
```

---

## Task 2 — Mobile : supprimer "Zones de livraison" du profil livreur

**Files:**
- Modify: `MOBILE Serveur/lib/features/driver/screens/profile/driver_profile_screen.dart`

### Étape 2.1 — Supprimer l'import

- [ ] Repérer la ligne (ligne ~30) :

```dart
import 'driver_zones_screen.dart';
```

La supprimer entièrement.

### Étape 2.2 — Supprimer l'entrée de menu

- [ ] Repérer le bloc (lignes ~149-152) dans la section `_Section('Compte', [...])` :

```dart
_Item(Icons.location_city_rounded, 'Zones de livraison',
    sub: 'Gérer mes zones d\'activité',
    onTap: () => Navigator.push(context,
      MaterialPageRoute(builder: (_) => const DriverZonesScreen()))),
```

Le supprimer entièrement.

### Étape 2.3 — Commit mobile

- [ ] Commit :

```bash
git add lib/features/driver/screens/profile/driver_profile_screen.dart
git commit -m "feat(mobile): remove driver zones screen — zone delivery mode disabled"
```

- [ ] Push :

```bash
git push origin main
```

---

## Vérification

- Admin : la page Frais de livraison n'affiche plus que 2 cartes ("Par km" et "Par ville"). Le mode actif ne peut plus être "Par zone".
- Mobile : le profil livreur n'affiche plus l'entrée "Zones de livraison". Le build ne génère plus d'avertissement sur `DriverZonesScreen` non référencée (le fichier reste présent mais n'est plus importé).
