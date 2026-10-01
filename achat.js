// Page Tarifs : achat en ligne (Stripe Checkout).
//
// Le site n'envoie qu'un forfait, un intervalle, un nombre d'utilisateurs,
// l'option IA et le courriel : les prix viennent du serveur (secret
// STRIPE_PRICES de la fonction creer-paiement), jamais de cette page.
// La fonction répond { ok: true, url } (page de paiement Stripe) ou
// { ok: false, message }.

// ====================================================================
// Interrupteur de la vente en ligne. Tant qu'il vaut false, la page
// affiche « Bientôt disponible » à la place du formulaire. Avant de le
// passer à true : voir STRIPE.md (dépôt gestion-app) — prix Stripe créés,
// secrets STRIPE_* et SITE_URL, fonctions déployées, webhook, courriel
// d'invitation, et prix réels inscrits dans tarifs.html.
var VENTE_EN_LIGNE_ACTIVE = false;
// ====================================================================

(function () {
  var URL_PAIEMENT = "https://fquwpdzceuqlxvewacxz.supabase.co/functions/v1/creer-paiement";
  var FORFAIT = "essentiel";
  var SIEGES_MAX = 50;

  var form = document.getElementById("achat-form");
  var bientot = document.getElementById("vente-bientot");
  if (!form || !bientot) return;

  if (!VENTE_EN_LIGNE_ACTIVE) return; // « Bientôt disponible » reste affiché.
  bientot.hidden = true;
  form.hidden = false;

  var seatsInput = document.getElementById("a-seats");
  var iaInput = document.getElementById("a-ia");
  var emailInput = document.getElementById("a-email");
  var consentInput = document.getElementById("a-consent");
  var erreur = document.getElementById("achat-erreur");
  var bouton = document.getElementById("achat-bouton");
  var texteBouton = bouton.textContent;

  function intervalle() {
    var choisi = form.querySelector('input[name="interval"]:checked');
    return choisi && choisi.value === "annee" ? "annee" : "mois";
  }

  function afficherPrix() {
    var annuel = intervalle() === "annee";
    document.getElementById("prix-mois").hidden = annuel;
    document.getElementById("prix-annee").hidden = !annuel;
    document.getElementById("prix-ia-mois").hidden = annuel;
    document.getElementById("prix-ia-annee").hidden = !annuel;
  }
  form.querySelectorAll('input[name="interval"]').forEach(function (r) {
    r.addEventListener("change", afficherPrix);
  });
  afficherPrix();

  function montrerErreur(message, champ) {
    erreur.textContent = message;
    erreur.hidden = false;
    if (champ) champ.focus();
  }
  function cacherErreur() {
    erreur.hidden = true;
    erreur.textContent = "";
  }
  function occupe(oui) {
    bouton.disabled = oui;
    bouton.textContent = oui ? "Ouverture de la page de paiement…" : texteBouton;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    cacherErreur();

    var seatsTexte = seatsInput.value.trim();
    var seats = Number(seatsTexte);
    if (!seatsTexte || !Number.isInteger(seats) || seats < 1 || seats > SIEGES_MAX) {
      montrerErreur("Indiquez un nombre d'utilisateurs entier entre 1 et " + SIEGES_MAX + ". Pour plus d'utilisateurs, demandez une soumission.", seatsInput);
      return;
    }
    var email = emailInput.value.trim();
    if (!email) {
      montrerErreur("Indiquez le courriel du titulaire de la licence.", emailInput);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      montrerErreur("Ce courriel ne semble pas valide. Vérifiez-le (exemple : nom@entreprise.ca).", emailInput);
      return;
    }
    if (!consentInput.checked) {
      montrerErreur("Pour continuer, cochez la case confirmant que vous acceptez les conditions d'utilisation, la politique de confidentialité et le contrat de licence.", consentInput);
      return;
    }
    if (location.protocol === "file:") {
      montrerErreur("Le paiement ne fonctionne que depuis le site Web (pas depuis un fichier ouvert sur votre ordinateur).");
      return;
    }

    occupe(true);
    fetch(URL_PAIEMENT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: FORFAIT,
        interval: intervalle(),
        seats: seats,
        ai_addon: iaInput.checked,
        email: email
      })
    })
      .then(function (res) {
        return res.json().catch(function () { return { ok: false }; });
      })
      .then(function (data) {
        if (data && data.ok && typeof data.url === "string" && /^https:\/\//.test(data.url)) {
          window.location.href = data.url;
          return; // le bouton reste désactivé pendant la redirection
        }
        occupe(false);
        montrerErreur((data && data.message) || "La page de paiement n'a pas pu être ouverte. Réessayez dans quelques minutes ou écrivez-nous à alexandrepoupart@ggestionmaa.com.");
      })
      .catch(function () {
        occupe(false);
        montrerErreur("Impossible de joindre le service de paiement. Vérifiez votre connexion Internet et réessayez.");
      });
  });

  // Retour depuis Stripe avec le bouton Précédent : réactiver le bouton.
  window.addEventListener("pageshow", function () { occupe(false); });
})();
