// Page « Bienvenue » : lien du courriel Supabase « Invite user » (envoyé à
// l'acheteur sans compte par le webhook Stripe) ou d'un courriel de
// réinitialisation. Deux formes de lien sont acceptées :
//   - flux implicite (gabarit par défaut) : #access_token=…&refresh_token=…&type=invite
//     → supabase.auth.setSession ;
//   - gabarit personnalisé : ?token_hash=…&type=invite|recovery
//     → supabase.auth.verifyOtp.
// Puis l'utilisateur choisit son mot de passe (supabase.auth.updateUser).
// Clé publique (publishable) : publique par conception, protégée par les
// règles RLS ; la même que dans le logiciel et l'appli mobile.

(function () {
  var SUPABASE_URL = "https://fquwpdzceuqlxvewacxz.supabase.co";
  var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_M6FUId2WUSj6tidr0rGeeQ_h6Qt0YFD";
  var MDP_MIN = 10;

  var etats = {
    verif: document.getElementById("etat-verif"),
    form: document.getElementById("mdp-form"),
    fini: document.getElementById("etat-fini"),
    erreur: document.getElementById("etat-erreur")
  };
  if (!etats.verif || !etats.form) return;

  function montrer(nom) {
    Object.keys(etats).forEach(function (k) { etats[k].hidden = k !== nom; });
  }
  function erreurLien(message) {
    document.getElementById("erreur-message").textContent = message;
    montrer("erreur");
  }

  var MSG_EXPIRE = "Ce lien a expiré ou a déjà été utilisé.";
  var MSG_INVALIDE = "Ce lien est incomplet ou invalide. Assurez-vous d'ouvrir le lien complet reçu par courriel.";

  // Lecture des paramètres, puis effacement de l'adresse : les jetons ne
  // doivent rester ni dans l'historique ni dans un éventuel signet.
  var hash = new URLSearchParams(location.hash.replace(/^#/, ""));
  var query = new URLSearchParams(location.search);
  try { history.replaceState(null, "", location.pathname); } catch (e) { /* sans effet */ }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    erreurLien("La page n'a pas pu se charger correctement. Rechargez-la à partir du lien reçu par courriel.");
    return;
  }

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,     // rien n'est conservé dans ce navigateur
      autoRefreshToken: false,
      detectSessionInUrl: false  // lecture de l'adresse faite ci-dessus
    }
  });

  function messageErreurLien(code, description) {
    code = (code || "").toLowerCase();
    if (code === "otp_expired" || /expired|invalid/i.test(description || "")) return MSG_EXPIRE;
    return MSG_INVALIDE;
  }

  function ouvrirSession() {
    var codeErreur = hash.get("error_code") || query.get("error_code") || hash.get("error") || query.get("error");
    if (codeErreur) {
      return Promise.reject(new Error(messageErreurLien(codeErreur, hash.get("error_description") || query.get("error_description"))));
    }

    var accessToken = hash.get("access_token");
    var refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      return client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(function (r) {
          if (r.error || !r.data || !r.data.session) throw new Error(MSG_EXPIRE);
          return r.data.session.user;
        });
    }

    var tokenHash = query.get("token_hash");
    var type = (query.get("type") || "invite").toLowerCase();
    if (tokenHash) {
      if (["invite", "recovery", "signup", "email", "magiclink"].indexOf(type) < 0) type = "invite";
      return client.auth.verifyOtp({ token_hash: tokenHash, type: type })
        .then(function (r) {
          if (r.error || !r.data || !r.data.session) throw new Error(MSG_EXPIRE);
          return r.data.session.user;
        });
    }

    return Promise.reject(new Error("Cette page s'ouvre à partir du lien reçu par courriel (invitation ou réinitialisation du mot de passe). Aucun lien n'a été détecté."));
  }

  var utilisateur = null;

  ouvrirSession()
    .then(function (user) {
      utilisateur = user;
      document.getElementById("compte-courriel").textContent = (user && user.email) || "";
      montrer("form");
      document.getElementById("mdp").focus();
    })
    .catch(function (err) {
      var msg = err && err.message;
      // Erreur réseau (fetch) : message technique en anglais → message clair.
      if (!msg || /fetch|network|load failed/i.test(msg)) {
        msg = "Impossible de joindre le serveur. Vérifiez votre connexion Internet, puis rouvrez le lien reçu par courriel.";
      }
      erreurLien(msg);
    });

  var form = etats.form;
  var mdp = document.getElementById("mdp");
  var mdp2 = document.getElementById("mdp2");
  var erreur = document.getElementById("mdp-erreur");
  var bouton = document.getElementById("mdp-bouton");
  var texteBouton = bouton.textContent;

  function montrerErreur(message, champ) {
    erreur.textContent = message;
    erreur.hidden = false;
    if (champ) champ.focus();
  }

  function messageMiseAJour(error) {
    var code = (error && (error.code || "")).toLowerCase();
    var texte = (error && error.message) || "";
    if (code === "weak_password" || /weak|pwned|leaked/i.test(texte)) {
      return "Ce mot de passe est trop faible ou figure dans des listes de mots de passe connus. Choisissez-en un autre, plus long.";
    }
    if (code === "same_password" || /different from the old/i.test(texte)) {
      return "Choisissez un mot de passe différent de l'ancien.";
    }
    if (/session|jwt|expired|not_authenticated|token/i.test(code + " " + texte)) {
      return "Votre lien a expiré pendant que la page était ouverte. Utilisez « Mot de passe oublié » dans le logiciel pour recevoir un nouveau code.";
    }
    if (/rate|too many/i.test(code + " " + texte)) {
      return "Trop de tentatives. Patientez quelques minutes, puis réessayez.";
    }
    if (/fetch|network|load failed/i.test(texte)) {
      return "Impossible de joindre le serveur. Vérifiez votre connexion Internet et réessayez.";
    }
    return "Le mot de passe n'a pas pu être enregistré. Réessayez, ou utilisez « Mot de passe oublié » dans le logiciel.";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    erreur.hidden = true;

    var v1 = mdp.value;
    var v2 = mdp2.value;
    if (v1.length < MDP_MIN) {
      montrerErreur("Le mot de passe doit contenir au moins " + MDP_MIN + " caractères.", mdp);
      return;
    }
    if (v1.trim() !== v1) {
      montrerErreur("Le mot de passe ne doit pas commencer ni se terminer par une espace.", mdp);
      return;
    }
    if (v1 !== v2) {
      montrerErreur("Les deux mots de passe ne sont pas identiques.", mdp2);
      return;
    }

    bouton.disabled = true;
    bouton.textContent = "Enregistrement…";
    client.auth.updateUser({ password: v1 })
      .then(function (r) {
        if (r.error) throw r.error;
        var user = (r.data && r.data.user) || utilisateur;
        terminer(user);
      })
      .catch(function (err) {
        bouton.disabled = false;
        bouton.textContent = texteBouton;
        montrerErreur(messageMiseAJour(err), mdp);
      });
  });

  function terminer(user) {
    mdp.value = "";
    mdp2.value = "";
    var email = user && user.email;
    if (email) document.getElementById("fini-courriel").textContent = email;
    var cle = user && user.user_metadata && user.user_metadata.license_key;
    if (cle) {
      document.getElementById("cle-licence").textContent = String(cle);
      document.getElementById("bloc-cle").hidden = false;
    }
    montrer("fini");
    // Fin de la session web : la connexion se fait ensuite dans le logiciel.
    client.auth.signOut({ scope: "local" }).catch(function () { /* sans effet */ });
  }
})();
