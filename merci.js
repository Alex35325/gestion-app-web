// Page « Merci » : Stripe y renvoie après le paiement
// (merci.html?session_id=cs_...). La licence est créée par le webhook Stripe
// quelques secondes plus tard : on demande à creer-paiement où elle en est,
// toutes les 3 secondes, pendant environ une minute.
// Réponse : { ok, ready, license_key?, email? } ou { ok: false, message }.

(function () {
  var URL_PAIEMENT = "https://fquwpdzceuqlxvewacxz.supabase.co/functions/v1/creer-paiement";
  var INTERVALLE_MS = 3000;
  var ESSAIS_MAX = 20; // ≈ 1 minute

  var attente = document.getElementById("etat-attente");
  var pret = document.getElementById("etat-pret");
  var delai = document.getElementById("etat-delai");
  if (!attente || !pret || !delai) return;

  var sessionId = (new URLSearchParams(location.search).get("session_id") || "").trim();
  var essais = 0;
  var minuterie = null;

  function montrer(el) {
    [attente, pret, delai].forEach(function (x) { x.hidden = x !== el; });
  }

  function lienSoutien() {
    var corps = "Bonjour,\r\n\r\nJ'ai payé un abonnement MAA Gestion mais la clé de licence ne s'est pas affichée.\r\n\r\n"
      + "Courriel utilisé lors de l'achat : \r\n"
      + (sessionId ? "Référence de paiement : " + sessionId + "\r\n" : "")
      + "\r\nMerci!";
    document.getElementById("lien-soutien").href = "mailto:alexandrepoupart@ggestionmaa.com"
      + "?subject=" + encodeURIComponent("Clé de licence non reçue")
      + "&body=" + encodeURIComponent(corps);
  }

  function echec(titre, message, peutReessayer) {
    document.getElementById("delai-titre").textContent = titre;
    document.getElementById("delai-message").textContent = message;
    document.getElementById("reessayer").hidden = !peutReessayer;
    lienSoutien();
    montrer(delai);
  }

  function afficherCle(cle, email) {
    document.getElementById("cle-licence").textContent = cle;
    if (email) {
      document.getElementById("courriel-valeur").textContent = email;
      document.getElementById("courriel-achat").hidden = false;
    }
    montrer(pret);
  }

  function delaiDepasse() {
    echec(
      "Votre licence prend plus de temps que prévu",
      "Pas d'inquiétude : si votre paiement a été accepté, votre licence sera créée et votre clé vous sera envoyée par courriel. Vous pouvez vérifier de nouveau dans quelques instants, ou nous écrire.",
      true
    );
  }

  function suivant() {
    if (essais >= ESSAIS_MAX) { delaiDepasse(); return; }
    minuterie = setTimeout(verifier, INTERVALLE_MS);
  }

  function verifier() {
    minuterie = null;
    essais++;
    fetch(URL_PAIEMENT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId })
    })
      .then(function (res) {
        return res.json().catch(function () { return null; });
      })
      .then(function (data) {
        if (data && data.ok && data.ready && data.license_key) {
          afficherCle(String(data.license_key), data.email ? String(data.email) : "");
          return;
        }
        if (data && data.ok === false) {
          // Erreur définitive (session inconnue, paiement non abouti…) :
          // inutile d'insister.
          echec(
            "Nous n'avons pas pu confirmer votre achat",
            (data.message ? data.message + " " : "") + "Si vous avez été facturé, écrivez-nous : nous vous enverrons votre clé de licence.",
            false
          );
          return;
        }
        suivant();
      })
      .catch(function () {
        // Problème réseau passager : on réessaie jusqu'à la limite.
        suivant();
      });
  }

  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    echec(
      "Aucun achat à afficher",
      "Cette page s'affiche après un paiement sur la page Tarifs. Si vous venez de payer et voyez ce message, votre clé de licence vous sera envoyée par courriel ; sinon, écrivez-nous.",
      false
    );
    return;
  }

  document.getElementById("reessayer").addEventListener("click", function () {
    if (minuterie) return;
    essais = 0;
    montrer(attente);
    verifier();
  });

  verifier();
})();
