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

module.exports = {
  sendVerificationEmail,
  generateVerificationCode,
  DEV_MODE
}
