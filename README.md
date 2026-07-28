# Planning Sport

Application web de suivi de séances de course à pied. Calendrier mensuel, multi-séances par jour, statistiques hebdomadaires et mensuelles. Données stockées localement en SQLite.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Prisma + SQLite
- Tailwind CSS + shadcn/ui (Radix)
- react-hook-form + Zod pour la validation
- date-fns pour la gestion des dates (semaine ISO, locale `fr`)

## Démarrage

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

L'application est ensuite accessible sur [http://localhost:3000](http://localhost:3000).

> Le `postinstall` exécute déjà `prisma generate`. Si tu clones le projet pour la première fois, **la migration `prisma migrate dev` reste obligatoire** pour créer le fichier `prisma/dev.db`.

## Variables d'environnement

Une seule variable, déjà fournie dans `.env` :

```env
DATABASE_URL="file:./dev.db"
```

Le fichier SQLite est créé dans `prisma/dev.db` (ignoré par git).

## Arborescence

```
src/
├── app/
│   ├── page.tsx              page d'accueil (calendrier)
│   ├── layout.tsx            layout racine + Toaster
│   ├── actions.ts            Server Actions create / update / delete
│   └── globals.css           Tailwind + variables shadcn
├── components/
│   ├── calendar/             composants du calendrier
│   ├── session-form/         modal et formulaire d'une séance
│   └── ui/                   primitives shadcn
├── lib/
│   ├── date.ts               grille mensuelle, semaines ISO, fuseau Paris
│   ├── pace.ts               parsing/format mm:ss/km
│   ├── duration.ts           parsing/format HH:mm + durée
│   ├── stats.ts              agrégats semaine/mois
│   ├── format.ts             formatters fr-FR
│   ├── prisma.ts             singleton Prisma
│   └── utils.ts              cn()
└── server/
    ├── sessions.ts           requêtes Prisma typées (SessionDTO)
    └── validation.ts         schéma Zod partagé client/serveur
prisma/
└── schema.prisma             modèle RunningSession
```

## Modèle de données

Le modèle `RunningSession` (un seul, pas de relations) est défini dans `prisma/schema.prisma`. Le champ `runType` est stocké en `String` (SQLite ne supporte pas les enums natifs) et validé côté Zod parmi : `EF`, `FRACTIONNE`, `SORTIE_LONGUE`, `EVOLUTIVE`, `AUTRE`.

## Règles métier implémentées

- Distance > 0.
- FC moyenne > 0, FC max ≥ FC moyenne.
- Allure max ≤ allure moyenne (l'allure max est la plus *rapide*, donc la valeur `mm:ss/km` la plus petite).
- Si `runType = AUTRE`, le champ « Autre type de sortie » est obligatoire.
- Format `HH:mm` pour les heures de séance, format `mm:ss` pour les allures.
- Une séance peut traverser minuit : si `endTime < startTime`, la durée est calculée comme `endTime + 24h − startTime`.

## Modèle calendrier

- Semaine commençant le lundi (`weekStartsOn: 1`).
- Numéro de semaine ISO affiché dans la première colonne.
- Grille de 6 semaines (42 jours) couvrant le mois complet, avec débordement sur les mois adjacents (style discret).
- Stats hebdomadaires : somme distance + durée des séances visibles sur la ligne (y compris jours hors mois).
- Stats mensuelles : somme distance + durée des séances du mois calendaire uniquement.
- Mois piloté par l'URL : `/?month=2026-05`.

## Commandes utiles

```bash
npm run dev            # serveur de dev
npm run build          # build production
npm start              # serveur production
npm run lint           # lint
npx prisma studio      # explorer la base SQLite dans un navigateur
npx prisma migrate dev # nouvelle migration après modification du schéma
```
