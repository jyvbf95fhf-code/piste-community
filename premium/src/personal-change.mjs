// Stores announce successful local writes; the account worker decides when to send.
export function personalChanged(ownerId){if(ownerId&&typeof globalThis.dispatchEvent==='function'&&typeof Event==='function')globalThis.dispatchEvent(new Event('piste:personal-change'));}
