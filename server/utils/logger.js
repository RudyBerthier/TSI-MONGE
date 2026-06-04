const supabase = require('../config/supabase');

function maskIp(ip) {
  if (!ip) return null;
  const clean = ip.replace('::ffff:', '');
  if (clean === '::1' || clean === '127.0.0.1') return 'Localhost';
  const parts = clean.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.xxx.xxx`;
  return clean.slice(0, 10) + '...';
}

/**
 * Enregistre une action dans activity_logs.
 * Ne lève jamais d'erreur pour ne pas bloquer la requête principale.
 *
 * @param {object} opts
 * @param {string}  opts.actorId       - ID de l'utilisateur auteur de l'action
 * @param {string}  opts.actorUsername - Nom affiché de l'auteur
 * @param {string}  opts.action        - Clé ex: "auth.login", "forum.topic.create"
 * @param {string} [opts.targetType]   - Type de cible : "user", "topic", "event", …
 * @param {string} [opts.targetId]     - ID de la cible
 * @param {string} [opts.targetLabel]  - Libellé lisible de la cible
 * @param {object} [opts.details]      - Données supplémentaires (JSONB)
 * @param {object} [opts.req]          - Objet Express Request (pour l'IP)
 */
async function logActivity({ actorId, actorUsername, action, targetType, targetId, targetLabel, details, req }) {
  try {
    const rawIp = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip || '';
    const ip = maskIp(rawIp);

    await supabase.from('activity_logs').insert({
      actor_id:     actorId     || null,
      actor_username: actorUsername || 'System',
      action,
      target_type:  targetType  || null,
      target_id:    targetId    ? String(targetId) : null,
      target_label: targetLabel || null,
      details:      details     || null,
      ip,
    });
  } catch (err) {
    console.error('[Logger] Failed to log activity:', err.message);
  }
}

module.exports = { logActivity };
