// netlify/functions/stripe-payment.js
const Stripe = require('stripe');

exports.handler = async (event) => {
  // Refuser tout ce qui n'est pas POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Méthode non autorisée' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Corps de requête invalide' }) };
  }

  const { paymentMethodId, amount, currency, description, email } = body;

  if (!paymentMethodId || !amount) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Paramètres manquants' }) };
  }

  // Clé secrète Stripe — stockée dans les variables d'environnement Netlify
  // ⚠️ Ne jamais mettre sk_live_... directement ici
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    // Conversion XPF → EUR approximative (1 EUR ≈ 119.33 XPF)
    // Stripe EUR = centimes, donc on multiplie par 100
    const amountInCents = Math.round((amount / 119.33) * 100);

    // Créer et confirmer le PaymentIntent en une seule étape
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,       // en centimes EUR
      currency: 'eur',
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      description,
      receipt_email: email || undefined,
      return_url: 'https://fixcenter.lat/Nos%20services.html',
    });

    if (paymentIntent.status === 'succeeded') {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, paymentIntentId: paymentIntent.id })
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Paiement non finalisé : ' + paymentIntent.status })
      };
    }

  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message })
    };
  }
};
