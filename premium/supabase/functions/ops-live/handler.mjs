// premium/src/server/ops-live-http.mjs
var uuid = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
var hash = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), (x) => x.toString(16).padStart(2, "0")).join("");
var sign = async (keyText, value) => {
  if (typeof keyText !== "string" || keyText.length < 32) throw Error("Signing unavailable");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(keyText), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))), (x) => x.toString(16).padStart(2, "0")).join("");
};
var equal = (a, b) => {
  if (typeof a !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};
function createOpsLiveProposedHandler({ authClient, admin, isAccountEnabled, isSessionActive = null, enabled = false, allowedOrigins = [], invitationKey = null, clock = Date.now, emitSignal = null } = {}) {
  if (!authClient || !admin || typeof isAccountEnabled !== "function") throw Error("Explicit server dependencies required.");
  return async (request) => {
    const origin = request.headers.get("origin"), allowed = !origin || allowedOrigins.includes(origin);
    const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin", ...allowed && origin ? { "Access-Control-Allow-Origin": origin } : {}, "Access-Control-Allow-Headers": "authorization,content-type,apikey", "Access-Control-Allow-Methods": "POST,OPTIONS" };
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (!enabled) return reply({ error: "Live OPS indisponible." }, 503);
    if (!allowed) return reply({ error: "Origine refus\xE9e." }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply({ error: "M\xE9thode refus\xE9e." }, 405);
    const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply({ error: "Connexion requise." }, 401);
    try {
      const { data, error } = await authClient.auth.getUser(token);
      const actor = data?.user?.id;
      if (error || !uuid(actor)) return reply({ error: "Connexion expir\xE9e." }, 401);
      if (isSessionActive && !await isSessionActive(actor, token)) return reply({ error: "Connexion expir\xE9e." }, 401);
      if (!await isAccountEnabled(actor)) return reply({ error: "Acc\xE8s refus\xE9." }, 403);
      if (Number(request.headers.get("content-length") || 0) > 2e5) return reply({ error: "Requ\xEAte trop volumineuse." }, 413);
      const reader = request.body?.getReader();
      let size = 0, chunks = [];
      if (reader) for (; ; ) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2e5) {
          await reader.cancel();
          return reply({ error: "Requ\xEAte trop volumineuse." }, 413);
        }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      let body;
      try {
        body = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        return reply({ error: "Requ\xEAte invalide." }, 400);
      }
      if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "Requ\xEAte invalide." }, 400);
      const call = async (name, args) => {
        const result2 = await admin.rpc(name, args);
        if (result2.error) throw result2.error;
        return result2.data;
      };
      let result;
      if (body.operation === "prepare-publication") {
        if (typeof body.localMissionId !== "string" || !body.localMissionId || body.localMissionId.length > 160) return reply({ error: "Mission invalide." }, 400);
        const id = body.id || crypto.randomUUID();
        if (!uuid(id)) return reply({ error: "Identifiant invalide." }, 400);
        const existing = body.id ? await call("ops_live_prepare", { p_id: id, p_actor: actor }) : null;
        const creationPurpose = body.id ? "republish" : "create", creationExpectedVersion = existing?.version ?? -1;
        const creationExpiresAt = new Date(clock() + 3e5).toISOString();
        result = { id, creationExpiresAt, creationPurpose, creationExpectedVersion, ticket: await sign(invitationKey, JSON.stringify([creationPurpose, actor, id, body.localMissionId, creationExpiresAt, creationExpectedVersion])) };
      } else if (body.operation === "directory") {
        const directory = await admin.from("coaching_remote_users").select("id,display_name").eq("enabled", true).neq("id", actor).limit(100);
        if (directory.error) throw directory.error;
        result = directory.data;
      } else if (body.operation === "invitations") result = await call("ops_live_pending_invites", { p_actor: actor });
      else if (body.operation === "list") result = await call("ops_live_list", { p_actor: actor });
      else if (body.operation === "notifications") result = await call("ops_live_notifications", { p_actor: actor });
      else if (body.operation === "habitual") {
        if (!uuid(body.userId) || typeof body.enabled !== "boolean") return reply({ error: "Autorisation invalide." }, 400);
        result = await call("ops_live_habitual", { p_actor: actor, p_owner: actor, p_user: body.userId, p_enabled: body.enabled });
      } else {
        if (!uuid(body.id)) return reply({ error: "Identifiant invalide." }, 400);
        if (body.operation === "head") result = await call("ops_live_head", { p_id: body.id, p_actor: actor });
        else if (body.operation === "accept-invite") {
          if (!uuid(body.commandId)) return reply({ error: "Commande invalide." }, 400);
          result = await call("ops_live_accept_invite", { p_id: body.id, p_actor: actor, p_command: body.commandId });
        } else if (body.operation === "read") result = await call("ops_live_read", { p_id: body.id, p_actor: actor, p_after: body.after ?? 0, p_version: body.version ?? null });
        else if (body.operation === "delete-live") result = await call("ops_live_delete", { p_id: body.id, p_actor: actor });
        else if (body.operation === "command") {
          if (!uuid(body.commandId) || !Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < -1 || typeof body.type !== "string" || !body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) return reply({ error: "Commande invalide." }, 400);
          let payload = structuredClone(body.payload), invitationToken = null;
          if (body.type === "publish") {
            const expires = Date.parse(payload.creationExpiresAt);
            if (!Number.isFinite(expires) || expires > clock() + 3e5 || !["create", "republish"].includes(payload.creationPurpose) || !Number.isSafeInteger(payload.creationExpectedVersion) || !equal(payload.ticket, await sign(invitationKey, JSON.stringify([payload.creationPurpose, actor, body.id, payload.localMissionId, payload.creationExpiresAt, payload.creationExpectedVersion])))) return reply({ error: "Autorisation de publication expir\xE9e ou invalide." }, 403);
            delete payload.ticket;
          } else if (body.type === "invite") {
            if (typeof invitationKey !== "string" || invitationKey.length < 32) return reply({ error: "Invitations indisponibles." }, 503);
            const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(invitationKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
            invitationToken = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(actor + ":" + body.id + ":" + body.commandId))), (x) => x.toString(16).padStart(2, "0")).join("");
            payload = { recipientId: payload.recipientId, tokenHash: await hash(invitationToken), expiresAt: payload.expiresAt };
          } else if (body.type === "join") {
            if (!/^[0-9a-f]{64}$/.test(payload.token || "")) return reply({ error: "Invitation invalide." }, 400);
            payload = { tokenHash: await hash(payload.token) };
          }
          result = await call("ops_live_commit", { p_id: body.id, p_actor: actor, p_command: body.commandId, p_expected: body.expectedVersion, p_type: body.type, p_payload: payload });
          if (invitationToken) result = { ...result, invitationToken };
          if (typeof emitSignal === "function" && body.type !== "join" && body.type !== "mark-notification-read") {
            try {
              const targets = await call("ops_live_signal_targets", { p_id: body.id, p_actor: actor });
              if (targets) for (const user of targets.users || []) await emitSignal({ topic: "ops-live:" + targets.id + ":" + targets.generation + ":" + targets.epoch + ":" + user, event: "version", payload: { id: targets.id, generation: targets.generation, version: targets.version, epoch: targets.epoch } });
            } catch {
            }
          }
        } else return reply({ error: "Op\xE9ration invalide." }, 400);
      }
      return reply({ result });
    } catch (error) {
      const status = error.code === "42501" ? 403 : error.code === "40001" || error.code === "23505" ? 409 : error.code === "22023" || error.code === "23514" || error.code === "23503" ? 400 : 503;
      return reply({ error: status === 403 ? "Acc\xE8s refus\xE9." : status === 409 ? "Conflit de synchronisation." : status === 400 ? "Commande refus\xE9e." : "Service temporairement indisponible." }, status);
    }
  };
}
export {
  createOpsLiveProposedHandler
};
