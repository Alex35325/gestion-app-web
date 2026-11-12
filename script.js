// Mouvement réduit demandé par le système : aucune animation déclenchée
// d'ici (le CSS coupe déjà transitions et animations).
var mouvementReduit = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

// Rejoue la petite pulsation de confirmation (.pulse-ok, style.css) sur un
// élément.
function pulserConfirmation(el) {
  if (!el || mouvementReduit) return;
  el.classList.remove("pulse-ok");
  void el.offsetWidth; // relance l'animation si elle vient déjà de jouer
  el.classList.add("pulse-ok");
  el.addEventListener("animationend", function fin() {
    el.classList.remove("pulse-ok");
    el.removeEventListener("animationend", fin);
  });
}

// Menu mobile (hamburger) — partagé par toutes les pages du site.
(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("nav.main-nav");
  if (!toggle || !nav) return;

  // Deuxième icône (croix) superposée au hamburger : le CSS fait le fondu
  // enchaîné entre les deux selon aria-expanded.
  var burger = toggle.querySelector("svg");
  if (burger) {
    burger.classList.add("icon-burger");
    burger.setAttribute("aria-hidden", "true");
    toggle.insertAdjacentHTML("beforeend",
      '<svg class="icon-close" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>');
  }

  toggle.addEventListener("click", function () {
    // Le menu grandit à partir du bouton qui l'ouvre (et y retourne).
    // (bord gauche du menu mesuré sans son échelle 0,95 en cours)
    var parent = nav.offsetParent;
    var t = toggle.getBoundingClientRect();
    if (parent) {
      var gauche = parent.getBoundingClientRect().left + nav.offsetLeft;
      nav.style.setProperty("--menu-origin-x", Math.round(t.left + t.width / 2 - gauche) + "px");
    }
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

    pulserConfirmation(form.querySelector('button[type="submit"]'));

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
        el.classList.add("is-updated"); // fondu d'arrivée (style.css)
      }
    })
    .catch(function () { /* silencieux — le bouton fonctionne sans ça */ });
})();

// Boutons « Copier » (pages Merci et Bienvenue) : <button data-copy-target="id"
// data-copy-status="id">. Sans accès au presse-papiers, le texte est
// sélectionné pour un Ctrl+C manuel.
(function () {
  document.querySelectorAll("[data-copy-target]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cible = document.getElementById(btn.getAttribute("data-copy-target"));
      var statut = document.getElementById(btn.getAttribute("data-copy-status"));
      if (!cible) return;
      function dire(t) { if (statut) statut.textContent = t; }
      function manuel() {
        var range = document.createRange();
        range.selectNodeContents(cible);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        dire("Copie automatique impossible : le texte est sélectionné, faites Ctrl+C.");
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cible.textContent).then(function () { dire("Copié dans le presse-papiers."); pulserConfirmation(btn); }, manuel);
      } else {
        manuel();
      }
    });
  });
})();

// Pastille de la page active dans le menu (bureau) : un élément à part,
// placé sous le lien actif, pour que seule la pastille — pas le texte —
// glisse d'un lien à l'autre lors du changement de page (View Transitions,
// voir style.css). Sans JavaScript, le fond de .is-active reste affiché.
(function () {
  var nav = document.querySelector("nav.main-nav");
  var actif = nav && nav.querySelector("a.nav-link.is-active");
  if (!actif) return;
  var pastille = document.createElement("span");
  pastille.className = "nav-indicator";
  pastille.setAttribute("aria-hidden", "true");
  nav.appendChild(pastille);
  nav.classList.add("has-indicator");
  function placer() {
    pastille.style.width = actif.offsetWidth + "px";
    pastille.style.height = actif.offsetHeight + "px";
    pastille.style.transform = "translate(" + actif.offsetLeft + "px, " + actif.offsetTop + "px)";
  }
  placer();
  window.addEventListener("resize", placer);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placer);
})();

// Apparition au défilement : cartes, étapes et titres de section montent
// doucement en place, les éléments d'un même groupe à 30 ms d'écart.
// Seuls les éléments encore SOUS l'écran au chargement sont masqués, et
// seulement ici : sans JavaScript (ou sans IntersectionObserver), tout le
// contenu reste visible. Rien sur les pages légales.
(function () {
  if (mouvementReduit || !("IntersectionObserver" in window)) return;
  if (document.querySelector("main.legal")) return;
  var cibles = document.querySelectorAll(
    "main .section-head, main .pillar, main .feature-card, main .step, main .module, " +
    "main .factor, main .note-card, main .contact-card, main .cta-band, main .checklist li, " +
    "main .download-card, main .badge-list"
  );
  var hauteur = window.innerHeight || document.documentElement.clientHeight;
  var DECALAGE_MAX = 8; // au-delà, les suivants partent avec le 8e

  function terminer(el) {
    el.classList.remove("reveal-pending", "reveal-in");
    el.style.removeProperty("--reveal-delay");
  }

  var observateur = new IntersectionObserver(function (entrees) {
    var rang = 0;
    entrees.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      observateur.unobserve(el);
      el.style.setProperty("--reveal-delay", "calc(var(--stagger) * " + Math.min(rang++, DECALAGE_MAX) + ")");
      el.classList.add("reveal-in");
      void el.offsetWidth; // fixe l'état de départ avant de lancer la transition
      el.classList.remove("reveal-pending");
      // Retire les classes une fois l'apparition finie : les transitions
      // propres à l'élément (survol des cartes) redeviennent immédiates.
      setTimeout(function () { terminer(el); }, 1000);
    });
  }, { rootMargin: "0px 0px -8% 0px" });

  Array.prototype.forEach.call(cibles, function (el) {
    if (el.getBoundingClientRect().top < hauteur) return; // déjà visible : on n'y touche pas
    el.classList.add("reveal-pending");
    observateur.observe(el);
  });
})();
