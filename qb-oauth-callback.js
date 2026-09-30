// Relais du retour OAuth d'Intuit vers l'application de bureau.
// Fichier séparé (plutôt qu'un <script> en ligne) pour que la politique
// CSP de la page puisse s'en tenir à script-src 'self'.
// MAA Gestion est une app de bureau : Intuit n'autorise pas
// http://localhost comme URI de redirection en production (seulement en
// sandbox), donc cette page publique reçoit le retour d'Intuit ici, puis
// relaie IMMÉDIATEMENT vers le petit serveur local que l'app a démarré
// sur ce même ordinateur (voir Services/QuickBooksService.cs, LocalPort).
// C'est le NAVIGATEUR DU CLIENT qui fait cette deuxième requête, pas ce
// serveur web — il peut donc atteindre localhost sans problème.
var LOCAL_PORT = 51728;
var params = window.location.search; // déjà "?code=...&state=...&realmId=..."
if (params) {
  window.location.replace("http://localhost:" + LOCAL_PORT + "/callback/" + params);
} else {
  document.getElementById("msg").textContent = "Aucune information de connexion reçue — retournez dans MAA Gestion et réessayez.";
}
