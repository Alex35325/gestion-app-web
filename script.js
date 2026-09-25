// Menu mobile (hamburger) — partagé par toutes les pages du site.
(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("nav.main-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
})();

// Page Tarifs : le site est statique (GitHub Pages, aucun serveur pour
// recevoir un formulaire), donc la "soumission" ouvre un courriel déjà
// rempli dans la messagerie du visiteur plutôt que d'envoyer quoi que ce
// soit elle-même.
(function () {
  var form = document.getElementById("quote-form");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var modules = Array.prototype.map.call(
      form.querySelectorAll('input[name="module"]:checked'),
      function (cb) { return "- " + cb.value; }
    );
    var company = document.getElementById("q-company").value.trim();
    var users = parseInt(document.getElementById("q-users").value, 10);
    var message = document.getElementById("q-message").value.trim().replace(/\r?\n/g, "\r\n");

    var lines = [
      "Bonjour,",
      "",
      "J'aimerais recevoir une soumission pour MAA Gestion.",
      "",
      "Entreprise : " + (company || "(à préciser)"),
      "Nombre d'utilisateurs : " + (users > 0 ? users : "(à préciser)"),
      "",
      "Modules souhaités :"
    ];
    lines = lines.concat(modules.length ? modules : ["- À déterminer ensemble"]);
    if (message) lines.push("", "Précisions :", message);
    lines.push("", "Merci!");

    var subject = "Demande de soumission - MAA Gestion" + (company ? " (" + company + ")" : "");
    window.location.href = "mailto:alexandrepoupart@ggestionmaa.com"
      + "?subject=" + encodeURIComponent(subject)
      + "&body=" + encodeURIComponent(lines.join("\r\n"));
  });
})();

// Affiche le numéro de la dernière version disponible sur la page de
// téléchargement (purement informatif) — le bouton de téléchargement
// lui-même pointe vers une URL stable ("/releases/latest/download/...")
// qui fonctionne même si cet appel échoue (hors ligne, limite de débit de
// l'API GitHub, etc.), donc aucun repli n'est nécessaire ici : on affiche
// simplement rien si ça échoue plutôt que de bloquer le téléchargement.
(function () {
  var el = document.getElementById("latest-version");
  if (!el) return;
  fetch("https://api.github.com/repos/Alex35325/gestion-app-releases/releases/latest")
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (data && data.tag_name) {
        el.textContent = "Version actuelle : " + data.tag_name.replace(/^v/i, "v");
      }
    })
    .catch(function () { /* silencieux — le bouton fonctionne sans ça */ });
})();
