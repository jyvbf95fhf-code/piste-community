# PISTE V10.40 — Matrice de droits Coaching

Cette matrice doit être appliquée à la fois :
1. dans l’interface ;
2. dans la logique JavaScript ;
3. côté Supabase/RLS/RPC lorsque la donnée est sensible.

Ne jamais considérer le masquage CSS comme une protection suffisante.

## Double aveugle complet

| Action / donnée | Coach | Traceur | Conducteur | Observateur |
|---|---:|---:|---:|---:|
| Voir tracé prévu/posé pendant passage | NON | OUI | NON | NON |
| Voir GPS Conducteur | selon besoin sans révéler piste | OUI | propre GPS | positions autorisées non révélatrices |
| Poser la piste | si Coach=Traceur | OUI | NON | NON |
| Démarrer son GPS terrain | selon phase/rôle | OUI | OUI au départ | NON |
| Messages | OUI | OUI | OUI | OUI |
| Écran noir | OUI | OUI | OUI | OUI |
| Terminer session globale | OUI si autorisé | NON | NON | NON |
| Annuler / supprimer | propriétaire autorisé uniquement | NON | NON | NON |

Note importante :
le Coach en double aveugle ne doit pas obtenir de couche ou indicateur qui lui révèle le tracé réel pendant le passage.

## Simple aveugle

- Conducteur : tracé masqué.
- Coach : tracé visible.
- Traceur : tracé visible.
- Observateur : choisit lui-même `Voir la piste / Rester aveugle`.

## Partagé

- couches visibles selon droits normaux ;
- aucune action de pilotage supplémentaire pour Observateur ou Conducteur.

## Coach + Traceur

Ne pas forcément créer un rôle SQL combiné.

Préférer :
- rôle principal `coach`;
- champ/capacité de session indiquant que le Coach est le poseur ;
- fonctions de pose accessibles seulement pendant les phases concernées.

## Démarrage

Différencier impérativement :
- activation globale / ouverture de session ;
- début de pose ;
- fin de pose ;
- Coach en place ;
- départ Conducteur ;
- fin de parcours Conducteur ;
- fin globale.

