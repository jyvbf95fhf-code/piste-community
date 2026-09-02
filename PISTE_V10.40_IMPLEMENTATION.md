# V10.40 — architecture d’implémentation locale

La branche réutilise le moteur Terrain existant (`TerrainEngine`) pour OPS,
Entraînement et Coaching. Les points GPS bruts restent dans leurs tables
respectives ; les tracés prévu, posé et conducteur sont affichés comme couches
distinctes. Les compteurs de durée et d’âge sont recalculés localement depuis
les horodatages, sans requête Supabase par seconde.

Le rôle et la phase sont résolus séparément du statut SQL historique. Les
commandes Observateur sont masquées dans l’interface et les fonctions sensibles
continuent de vérifier propriétaire/rôle. Le mode double aveugle conserve le
masquage des couches au Conducteur.

La météo actuelle est indépendante de la météo historique. Cette dernière est
calculée en UTC entre la fin de pose et le départ conducteur quand des
horodatages fiables sont disponibles. Le couloir olfactif est explicitement une
heuristique visuelle et aucun pourcentage d’odeur restante n’est affiché.

L’IA dispose d’un fallback local ; aucune Edge Function ni secret n’est déployé.
Les éventuelles adaptations RLS sont décrites dans
`PISTE_V10.40_RLS_PROPOSITION.sql` et restent non exécutées.

Le ZIP fourni ne contenait pas `README.md` ni un fichier
`PISTE_V10.40_IMPLEMENTATION.md`; ce document est le compte rendu local ajouté
pour rendre l’architecture traçable.
