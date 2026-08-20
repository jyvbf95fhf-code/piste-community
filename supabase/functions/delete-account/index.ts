import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return Response.json({ error: 'Méthode non autorisée.' }, { status: 405, headers: corsHeaders })

  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return Response.json({ error: 'Authentification requise.' }, { status: 401, headers: corsHeaders })
    }

    const url = Deno.env.get('SUPABASE_URL')
    const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')
    const secretKey = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !publishableKey || !secretKey) throw new Error('Configuration serveur incomplète.')

    const body = await req.json().catch(() => ({}))
    if (body?.confirmation !== 'SUPPRIMER') {
      return Response.json({ error: 'Confirmation invalide.' }, { status: 400, headers: corsHeaders })
    }

    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return Response.json({ error: 'Session invalide ou expirée. Reconnecte-toi.' }, { status: 401, headers: corsHeaders })
    }

    const admin = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Les photos sont stockées sous <user_id>/... ; elles ne sont pas supprimées
    // automatiquement par la suppression de auth.users.
    const { data: files, error: listError } = await admin.storage.from('dog-photos').list(user.id, { limit: 1000 })
    if (listError) throw listError
    const paths = (files ?? []).filter((file) => file.name).map((file) => `${user.id}/${file.name}`)
    if (paths.length) {
      const { error: storageError } = await admin.storage.from('dog-photos').remove(paths)
      if (storageError) throw storageError
    }

    // Les tables applicatives référencent auth.users avec ON DELETE CASCADE.
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false)
    if (deleteError) throw deleteError

    return Response.json({ deleted: true }, { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('delete-account', error)
    return Response.json({ error: 'Suppression impossible. Aucune confirmation de suppression n’a été reçue.' }, { status: 500, headers: corsHeaders })
  }
})
