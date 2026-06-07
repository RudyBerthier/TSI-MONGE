const { Resend } = require('resend')

// Initialiser Resend avec la clé API
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// Mode dev : affiche le code dans la console au lieu d'envoyer un email
const DEV_MODE = !process.env.RESEND_API_KEY

/**
 * Envoyer un email de vérification avec un code à 6 chiffres
 * @param {string} type - Type de vérification: 'inscription', 'connexion', 'activation 2FA'
 */
async function sendVerificationEmail(email, code, username, type = 'inscription') {
  // Messages personnalisés selon le type
  const messages = {
    'inscription': {
      subject: 'Code de vérification - TSI Monge',
      title: `Bienvenue ${username} !`,
      description: 'Pour activer votre compte, entrez le code de vérification ci-dessous :',
      expiry: '15 minutes'
    },
    'connexion': {
      subject: 'Code de connexion - TSI Monge',
      title: `Bonjour ${username} !`,
      description: 'Voici votre code de connexion pour accéder à votre compte :',
      expiry: '10 minutes'
    },
    'activation 2FA': {
      subject: 'Activation 2FA - TSI Monge',
      title: `${username}, confirmez l'activation`,
      description: 'Pour activer la double authentification, entrez ce code :',
      expiry: '10 minutes'
    },
    'reset': {
      subject: 'Réinitialisation du mot de passe - TSI Monge',
      title: `Bonjour ${username} !`,
      description: 'Vous avez demandé la réinitialisation de votre mot de passe. Voici votre code :',
      expiry: '15 minutes'
    }
  }

  const msg = messages[type] || messages['inscription']

  if (DEV_MODE) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📧 EMAIL DE VÉRIFICATION - ${type.toUpperCase()} (Mode Dev)`)
    console.log(`   À: ${email}`)
    console.log(`   Utilisateur: ${username}`)
    console.log(`   Code: ${code}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    return { success: true, dev: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'TSI Monge <noreply@tsi-monge.fr>',
      to: email,
      subject: msg.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 500px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">TSI Monge</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Classe préparatoire • Chambéry</p>
            </div>

            <!-- Content -->
            <div style="padding: 32px;">
              <h2 style="color: #1f2937; margin: 0 0 16px; font-size: 20px;">${msg.title}</h2>
              <p style="color: #4b5563; margin: 0 0 24px; line-height: 1.6;">
                ${msg.description}
              </p>

              <!-- Code -->
              <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e293b; font-family: monospace;">
                  ${code}
                </span>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">
                Ce code expire dans <strong>${msg.expiry}</strong>.
              </p>

              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Si vous n'avez pas demandé ce code, ignorez cet email.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} TSI Monge Chambéry
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    })

    if (error) {
      console.error('Erreur Resend:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Email envoyé:', data?.id)
    return { success: true, id: data?.id }
  } catch (err) {
    console.error('Erreur envoi email:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Générer un code de vérification à 6 chiffres
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendCarpoolEmail(email, type, data) {
  if (DEV_MODE) {
    console.log(`[DEV MODE] Email Covoiturage à ${email} : ${type}`)
    return { success: true, dev: true }
  }

  const templates = {
    'request': {
      subject: 'Nouvelle demande de covoiturage',
      title: 'Demande de place',
      description: `<b>${data.passengerName}</b> a demandé une place pour votre trajet.`
    },
    'accepted': {
      subject: 'Covoiturage accepté !',
      title: 'Place confirmée',
      description: `Votre demande de covoiturage a été acceptée par <b>${data.driverName}</b>.`
    },
    'rejected': {
      subject: 'Covoiturage refusé',
      title: 'Demande refusée',
      description: `Désolé, votre demande de covoiturage a été refusée par le conducteur.`
    },
    'cancelled': {
      subject: 'Un passager a annulé',
      title: 'Annulation de place',
      description: `<b>${data.passengerName}</b> a annulé sa demande ou sa place pour votre trajet.`
    }
  }

  const msg = templates[type]
  if (!msg) return { success: false, error: 'Invalid type' }

  let optionsHtml = '';
  let cleanMessage = data.message || '';
  
  if (data.message && data.message.startsWith('[Options : ')) {
    const endBracketIndex = data.message.indexOf(']');
    if (endBracketIndex !== -1) {
      const optionsString = data.message.substring(11, endBracketIndex);
      cleanMessage = data.message.substring(endBracketIndex + 1).trim();
      
      const optionsArray = optionsString.split(' | ');
      optionsHtml = `
        <div style="margin-bottom: 24px; text-align: center;">
          ${optionsArray.map(opt => `<span style="display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 20px; margin: 4px; border: 1px solid #e2e8f0;">${opt.trim()}</span>`).join('')}
        </div>
      `;
    }
  }

  const messageHtml = cleanMessage ? `
    <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 32px; text-align: left; border: 1px solid #f1f5f9;">
      <p style="margin: 0; font-size: 15px; color: #334155; white-space: pre-wrap; font-style: italic; line-height: 1.6;">"${cleanMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}"</p>
    </div>
  ` : (optionsHtml ? '<div style="margin-bottom: 32px;"></div>' : '');

  const itineraryHtml = `
    <div style="background-color: #ffffff; border-radius: 16px; padding: 24px; text-align: left; margin-bottom: 32px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="display: flex; align-items: flex-start;">
        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #4f46e5; margin-top: 6px; margin-right: 16px; flex-shrink: 0; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);"></div>
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Point de départ</div>
          <div style="font-size: 15px; color: #0f172a; font-weight: 600; line-height: 1.4;">${data.origin}</div>
        </div>
      </div>
      
      <div style="width: 2px; height: 24px; background-color: #cbd5e1; margin-left: 5px; margin-top: 4px; margin-bottom: 4px; border-radius: 2px;"></div>
      
      <div style="display: flex; align-items: flex-start;">
        <div style="width: 12px; height: 12px; border-radius: 50%; background-color: #10b981; margin-top: 6px; margin-right: 16px; flex-shrink: 0; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);"></div>
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Point d'arrivée</div>
          <div style="font-size: 15px; color: #0f172a; font-weight: 600; line-height: 1.4;">${data.destination}</div>
        </div>
      </div>
    </div>
  `;

  try {
    const res = await resend.emails.send({
      from: 'TSI Monge <noreply@tsi-monge.fr>',
      to: email,
      subject: msg.subject,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; text-align: center; color: #0f172a;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; text-align: center;">
            <table width="60" height="60" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 20px; background-color: #e0e7ff; border-radius: 30px;">
              <tr>
                <td align="center" valign="middle" style="width: 60px; height: 60px; text-align: center; vertical-align: middle;">
                  <img src="https://img.icons8.com/ios-filled/50/4f46e5/car.png" width="28" height="28" alt="Voiture" style="display: block; margin: 0 auto;" />
                </td>
              </tr>
            </table>
            <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #1e293b;">${msg.title}</h2>
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #475569;">${msg.description}</p>
            
            ${itineraryHtml}
            ${optionsHtml}
            ${messageHtml}

            ${data.rideId ? `
              <a href="https://tsi-monge.fr/covoiturage/${data.rideId}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                ${type === 'request' ? 'Répondre à la demande' : 'Voir le trajet'}
              </a>
            ` : ''}
            <p style="margin: 32px 0 0; font-size: 14px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 24px;">L'équipe TSI Monge</p>
          </div>
        </div>
      `
    })
    return { success: true, id: res.data?.id }
  } catch (err) {
    console.error('Erreur email covoiturage:', err)
    return { success: false, error: err.message }
  }
}

module.exports = {
  sendVerificationEmail,
  generateVerificationCode,
  sendCarpoolEmail,
  DEV_MODE
}
