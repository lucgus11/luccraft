# Luccraft

Un **sandbox 2D inspiré de Minecraft**, en JavaScript vanilla (Canvas), jouable en local.

## Fonctionnalités incluses
- Génération procédurale du monde (plaines, forêts, désert, montagnes)
- Blocs texturés, meilleure échelle visuelle et rendu pixel-art
- Cavernes, minerais, arbres, cactus, eau
- Minage / placement de blocs
- Inventaire + artisanat
- Mobs (slimes, squelettes) + projectiles
- Vie / faim
- Cycle jour-nuit ralenti (journées plus longues)
- Sauvegarde / chargement via `localStorage`

## Lancer le jeu
```bash
python3 -m http.server 8000
```
Puis ouvrir `http://localhost:8000`.

## Contrôles
- `Q / D` : se déplacer
- `Z` ou `Espace` : sauter / nager vers le haut
- `S` : descendre dans l'eau
- `Clic gauche` : casser un bloc
- `Clic droit` : placer un bloc
- `F` : attaque de mêlée
- `I` : afficher/masquer l'inventaire
- `K` : sauvegarder
- `L` : charger
- `R` : recommencer après une défaite
