# Débrief IA — proposition non déployée

Le ZIP fournit un exemple d’Edge Function `ai-debrief` qui envoie uniquement des
métriques agrégées à l’API OpenAI et prévoit un fallback local. Cette source n’est
pas déployée dans cette phase et aucune clé ou secret n’est ajouté au dépôt.

Avant toute activation : revue RLS/auth, secret `OPENAI_API_KEY` côté Supabase,
limitation des données transmises et test indépendant. L’application doit rester
fonctionnelle lorsque la fonction est absente.
