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
