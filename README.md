# Luccraft

Un petit **Minecraft-like 2D** en JavaScript vanilla (canvas), jouable en local.

## Fonctionnalités incluses
- Génération procédurale de monde (biomes: plaines, forêts, désert, montagnes)
- Couches de blocs (herbe, terre, pierre, sable, minerais)
- Arbres, cactus, cavernes, eau
- Minage et placement de blocs
- Inventaire dynamique
- Système de craft
- Mobs (slimes, squelettes) + projectiles
- Vie / faim
- Cycle jour-nuit
- Sauvegarde / chargement via `localStorage`

## Lancer le jeu
```bash
python3 -m http.server 8000
```
Puis ouvrir `http://localhost:8000`.

## Contrôles
- `A / D` : déplacement
- `Espace` : saut
- `Clic gauche` : casser un bloc
- `Clic droit` : placer un bloc
- `F` : attaque de mêlée
- `I` : afficher/masquer inventaire
- `K` : sauvegarder
- `L` : charger
- `R` : recommencer après game over
