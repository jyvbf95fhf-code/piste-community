# V10.28 — validation beta multicomptes

Utiliser uniquement des donnees fictives. Tester d'abord avec deux comptes, dans deux navigateurs ou profils prives differents.

## Avant fusion

1. Executer `PISTE_V10.28_BETA_SECURITY.sql` dans le SQL Editor Supabase.
2. Creer le compte test A puis le compte test B.
3. Pour chaque compte : creer/modifier son profil, son chien, un trace libre et un trace prepare.
4. Verifier que A ne voit ni ne modifie les donnees privees de B, et inversement.
5. Envoyer une invitation d'ami de A vers B, l'accepter avec B, puis verifier les noms et activites marquees « amis ».
6. Tester ajout/suppression d'un like et d'un commentaire avec chaque compte.
7. Verifier le partage explicite d'une fiche chien, sans exposition des notes medicales non partagees.
8. Tester suppression du compte B, puis verifier que le compte A fonctionne toujours.
9. Relancer les conseillers Supabase Security et Performance.
10. Valider la Preview Vercel sur telephone avant de rendre la PR prete.

## Ouverture aux quatre testeurs

- Creer les quatre comptes individuellement avec une adresse valide et un mot de passe unique.
- Ne jamais reutiliser un mot de passe personnel.
- Activer la confirmation d'adresse e-mail et conserver les limites anti-abus Supabase.
- Desactiver ensuite les nouvelles inscriptions publiques pendant la beta.
- Ne communiquer que le lien de production, jamais une cle Supabase ni un secret GraphHopper.
