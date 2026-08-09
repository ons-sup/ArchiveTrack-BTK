/* ==========================================================================
   BTK ArchiveTrack — logique applicative
   Stockage : localStorage
   ========================================================================== */

const KEYS = {
  DOSSIERS: "btk_dossiers",
  MOUVEMENTS: "btk_mouvements",
  INTROUVABLES: "btk_introuvables",
  EMPLOYEES: "btk_employees",
  CURRENT_USER: "btk_current_user"
};

const PAGE_TITLES = {
  dashboard: { title: "Tableau de bord", crumb: "Accueil" },
  search:    { title: "Rechercher un dossier", crumb: "Accueil &rsaquo; Rechercher un dossier" },
  checkout:  { title: "Sortir un dossier", crumb: "Accueil &rsaquo; Sortir un dossier" },
  return:    { title: "Retourner un dossier", crumb: "Accueil &rsaquo; Retourner un dossier" },
  history:   { title: "Historique", crumb: "Accueil &rsaquo; Historique" },
  missing:   { title: "Dossiers introuvables", crumb: "Accueil &rsaquo; Dossiers introuvables" },
  reports:   { title: "Rapports", crumb: "Accueil &rsaquo; Rapports" },
  settings:  { title: "Paramètres", crumb: "Accueil &rsaquo; Paramètres" }
};

let historyPage = 1;
const HISTORY_PAGE_SIZE = 5;

/* ---------------------------------------------------------------------- */
/* Stockage                                                                 */
/* ---------------------------------------------------------------------- */

function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error("Erreur de lecture du stockage :", key, err);
    return fallback;
  }
}

function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedIfEmpty() {
  if (!localStorage.getItem(KEYS.DOSSIERS)) {
    saveData(KEYS.DOSSIERS, [
      { code: "0612567", nom: "Ahmed Ben Ali", boite: "612", rayon: "A3", statut: "Disponible", dateArchivage: "12/05/2024" },
      { code: "0613001", nom: "Sana Trabelsi", boite: "340", rayon: "B1", statut: "Sorti", dateArchivage: "03/02/2023" },
      { code: "0612890", nom: "Mohamed Kefi", boite: "210", rayon: "C2", statut: "Disponible", dateArchivage: "22/11/2022" },
      { code: "0614001", nom: "Hichem Belaid", boite: "501", rayon: "A1", statut: "Sorti", dateArchivage: "15/06/2024" },
      { code: "0612050", nom: "Leila Gharbi", boite: "118", rayon: "D4", statut: "Introuvable", dateArchivage: "08/09/2021" },
      { code: "0611433", nom: "Youssef Hammami", boite: "275", rayon: "B2", statut: "Disponible", dateArchivage: "30/01/2023" }
    ]);
  }
  if (!localStorage.getItem(KEYS.MOUVEMENTS)) {
    saveData(KEYS.MOUVEMENTS, [
      { code: "0612567", nom: "Ahmed Ben Ali", action: "Sortie", employe: "Ali Jerbi", date: "10/05/2024 09:00", observation: "Ouverture initiale du dossier" },
      { code: "0612567", nom: "Ahmed Ben Ali", action: "Retour", employe: "Ali Jerbi", date: "12/05/2024 09:45", observation: "Dossier complet" },
      { code: "0613001", nom: "Sana Trabelsi", action: "Sortie", employe: "Meriem Ben", date: "20/07/2026 11:20", observation: "Étude de dossier de crédit" },
      { code: "0612890", nom: "Mohamed Kefi", action: "Retour", employe: "Ali Jerbi", date: "19/07/2026 16:30", observation: "Retour après traitement" },
      { code: "0614001", nom: "Hichem Belaid", action: "Sortie", employe: "Meriem Ben", date: "19/07/2026 14:10", observation: "Vérification de conformité" }
    ]);
  }
  if (!localStorage.getItem(KEYS.INTROUVABLES)) {
    saveData(KEYS.INTROUVABLES, [
      { code: "0612050", nom: "Leila Gharbi", dateSignalement: "19/07/2026 16:45", signalePar: "Meriem Ben", observation: "Fiche manquante dans la boîte 118", statut: "Non résolu" }
    ]);
  }
  if (!localStorage.getItem(KEYS.EMPLOYEES)) {
    saveData(KEYS.EMPLOYEES, ["Ali Jerbi", "Meriem Ben"]);
  }
  if (!localStorage.getItem(KEYS.CURRENT_USER)) {
    saveData(KEYS.CURRENT_USER, "Ali Jerbi");
  }
}

/* ---------------------------------------------------------------------- */
/* Utilitaires                                                              */
/* ---------------------------------------------------------------------- */

function findDossier(code) {
  const dossiers = loadData(KEYS.DOSSIERS, []);
  return dossiers.find(d => d.code.toLowerCase() === code.trim().toLowerCase());
}

function nowFR() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isoToFR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}

function statutBadgeClass(statut) {
  if (statut === "Disponible") return "disponible";
  if (statut === "Sorti") return "sorti";
  if (statut === "Introuvable") return "introuvable";
  return "";
}

function missingBadgeClass(statut) {
  if (statut === "Résolu") return "resolu";
  if (statut === "En cours") return "encours";
  return "nonresolu";
}

function parseFRDateForSort(str) {
  // "dd/mm/yyyy hh:mm" -> timestamp (best effort, missing time = 00:00)
  const [datePart, timePart] = str.split(" ");
  const [d, m, y] = datePart.split("/").map(Number);
  const [h, min] = (timePart || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, h || 0, min || 0).getTime();
}

/* ---------------------------------------------------------------------- */
/* Navigation                                                               */
/* ---------------------------------------------------------------------- */

function navigateTo(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.dataset.page === page);
  });

  const meta = PAGE_TITLES[page];
  if (meta) {
    document.getElementById("pageTitle").textContent = meta.title;
    document.getElementById("pageBreadcrumb").innerHTML = meta.crumb;
  }

  closeDossierModal();

  if (page === "dashboard") renderDashboard();
  if (page === "history") renderHistory();
  if (page === "missing") renderMissingList();
  if (page === "reports") renderReports();
  if (page === "settings") renderSettings();
  if (page === "checkout") prepareCheckoutForm();
  if (page === "return") prepareReturnForm();
}

function setupNavigation() {
  document.querySelectorAll("[data-page]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(el.dataset.page);
    });
  });
}

/* ---------------------------------------------------------------------- */
/* Horloge                                                                  */
/* ---------------------------------------------------------------------- */

function startClock() {
  const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  function tick() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    const label = `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]} ${d.getFullYear()} — ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    document.getElementById("clock").textContent = label.charAt(0).toUpperCase() + label.slice(1);
  }
  tick();
  setInterval(tick, 30000);
}

/* ---------------------------------------------------------------------- */
/* Tableau de bord                                                          */
/* ---------------------------------------------------------------------- */

function renderDashboard() {
  const dossiers = loadData(KEYS.DOSSIERS, []);
  const mouvements = loadData(KEYS.MOUVEMENTS, []);

  document.getElementById("statTotal").textContent = dossiers.length;
  document.getElementById("statAvailable").textContent = dossiers.filter(d => d.statut === "Disponible").length;
  document.getElementById("statOut").textContent = dossiers.filter(d => d.statut === "Sorti").length;
  document.getElementById("statMissing").textContent = dossiers.filter(d => d.statut === "Introuvable").length;

  const recent = [...mouvements].sort((a, b) => parseFRDateForSort(b.date) - parseFRDateForSort(a.date)).slice(0, 5);
  const tbody = document.getElementById("recentActivityTable");
  tbody.innerHTML = recent.length
    ? recent.map(m => `
        <tr>
          <td class="mono">${escapeHtml(m.code)}</td>
          <td>${escapeHtml(m.nom)}</td>
          <td><span class="badge ${m.action === 'Sortie' ? 'sorti' : 'disponible'}">${escapeHtml(m.action)}</span></td>
          <td>${escapeHtml(m.employe)}</td>
          <td>${escapeHtml(m.date)}</td>
        </tr>`).join("")
    : `<tr><td colspan="5" class="empty-state">Aucune activité récente.</td></tr>`;

  updateNotifBadge();
}

function dashboardSearch() {
  const query = document.getElementById("dashSearchInput").value.trim();
  navigateTo("search");
  document.getElementById("searchInput").value = query;
  performSearch();
}

/* ---------------------------------------------------------------------- */
/* Recherche                                                                */
/* ---------------------------------------------------------------------- */

function performSearch() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const resultsDiv = document.getElementById("searchResults");

  if (!query) {
    resultsDiv.innerHTML = `<p class="empty-state">Veuillez saisir un code client ou un nom.</p>`;
    return;
  }

  const dossiers = loadData(KEYS.DOSSIERS, []);
  const matches = dossiers.filter(d =>
    d.code.toLowerCase().includes(query) || d.nom.toLowerCase().includes(query)
  );

  if (matches.length === 0) {
    resultsDiv.innerHTML = `<p class="empty-state">Aucun dossier trouvé pour "${escapeHtml(query)}".</p>`;
    return;
  }

  resultsDiv.innerHTML = matches.map(d => `
    <div class="result-card">
      <div class="detail-grid">
        <div><label>Code client</label><strong>${escapeHtml(d.code)}</strong></div>
        <div><label>Nom complet</label><strong>${escapeHtml(d.nom)}</strong></div>
        <div><label>Boîte attendue</label><strong>${escapeHtml(d.boite)}</strong></div>
        <div><label>Statut</label><span class="badge ${statutBadgeClass(d.statut)}">${escapeHtml(d.statut)}</span></div>
      </div>
      <div class="info-box">Le dossier du client ${escapeHtml(d.code)} doit se trouver dans la boîte ${escapeHtml(d.boite)}, rayon ${escapeHtml(d.rayon)}.</div>
      <div class="actions-row" style="margin-top:14px;">
        <button class="btn-primary" onclick="openDossierModal('${escapeJs(d.code)}')">Voir le dossier</button>
      </div>
    </div>
  `).join("");
}

function escapeJs(str) {
  return String(str).replace(/'/g, "\\'");
}

/* ---------------------------------------------------------------------- */
/* Modale détail dossier                                                    */
/* ---------------------------------------------------------------------- */

function openDossierModal(code) {
  const d = findDossier(code);
  if (!d) return;

  document.getElementById("modalCode").textContent = d.code;
  document.getElementById("modalNom").textContent = d.nom;
  document.getElementById("modalBoite").textContent = d.boite;
  document.getElementById("modalDate").textContent = d.dateArchivage;
  const statutEl = document.getElementById("modalStatut");
  statutEl.textContent = d.statut;
  statutEl.className = `badge ${statutBadgeClass(d.statut)}`;

  const mouvements = loadData(KEYS.MOUVEMENTS, []).filter(m => m.code === d.code);
  const last = mouvements.sort((a, b) => parseFRDateForSort(b.date) - parseFRDateForSort(a.date))[0];
  document.getElementById("modalLastMovement").innerHTML = last
    ? `<span class="badge ${last.action === 'Sortie' ? 'sorti' : 'disponible'}">${escapeHtml(last.action)}</span>
       &nbsp; ${escapeHtml(last.employe)} — ${escapeHtml(last.date)}<br>${escapeHtml(last.observation || "")}`
    : "Aucun mouvement enregistré.";

  document.getElementById("modalCheckoutBtn").disabled = d.statut === "Sorti";
  document.getElementById("modalReturnBtn").disabled = d.statut !== "Sorti";

  document.getElementById("dossierModal").classList.add("open");
  document.getElementById("dossierModal").dataset.code = d.code;
}

function closeDossierModal() {
  document.getElementById("dossierModal").classList.remove("open");
}

function goToCheckoutFromModal() {
  const code = document.getElementById("dossierModal").dataset.code;
  navigateTo("checkout");
  document.getElementById("outCode").value = code;
  fillNameFromCode("outCode", "outNom");
}

function goToReturnFromModal() {
  const code = document.getElementById("dossierModal").dataset.code;
  navigateTo("return");
  document.getElementById("retCode").value = code;
  fillReturnInfo();
}

function goToMissingFromModal() {
  const code = document.getElementById("dossierModal").dataset.code;
  navigateTo("missing");
  document.getElementById("missCode").value = code;
}

/* ---------------------------------------------------------------------- */
/* Sortir un dossier                                                        */
/* ---------------------------------------------------------------------- */

function populateEmployeeSelects() {
  const employees = loadData(KEYS.EMPLOYEES, []);
  ["outEmploye", "retEmploye"].forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    const current = select.value;
    select.innerHTML = employees.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
    if (employees.includes(current)) select.value = current;
  });
}

function prepareCheckoutForm() {
  populateEmployeeSelects();
  document.getElementById("outDate").value = todayISO();
  const currentUser = loadData(KEYS.CURRENT_USER, "");
  if (currentUser && loadData(KEYS.EMPLOYEES, []).includes(currentUser)) {
    document.getElementById("outEmploye").value = currentUser;
  }
}

function fillNameFromCode(codeId, nomId) {
  const code = document.getElementById(codeId).value.trim();
  const nomInput = document.getElementById(nomId);
  const d = findDossier(code);
  nomInput.value = d ? d.nom : "";
}

function submitCheckout() {
  const code = document.getElementById("outCode").value.trim();
  const employe = document.getElementById("outEmploye").value;
  const motif = document.getElementById("outMotif").value.trim();
  const dateIso = document.getElementById("outDate").value;
  const message = document.getElementById("checkoutMessage");

  const d = findDossier(code);
  if (!d) {
    message.textContent = `Aucun dossier trouvé pour le code "${code}".`;
    message.className = "form-message error";
    return;
  }
  if (d.statut === "Sorti") {
    message.textContent = `Le dossier ${code} est déjà sorti.`;
    message.className = "form-message error";
    return;
  }
  if (!motif) {
    message.textContent = "Le motif de sortie est obligatoire.";
    message.className = "form-message error";
    return;
  }

  const dossiers = loadData(KEYS.DOSSIERS, []);
  const idx = dossiers.findIndex(x => x.code === d.code);
  dossiers[idx].statut = "Sorti";
  saveData(KEYS.DOSSIERS, dossiers);

  const mouvements = loadData(KEYS.MOUVEMENTS, []);
  mouvements.push({
    code: d.code,
    nom: d.nom,
    action: "Sortie",
    employe,
    date: dateIso ? `${isoToFR(dateIso)} ${nowFR().split(" ")[1]}` : nowFR(),
    observation: motif
  });
  saveData(KEYS.MOUVEMENTS, mouvements);

  message.textContent = `Sortie du dossier ${code} enregistrée avec succès.`;
  message.className = "form-message ok";
  resetCheckoutForm();
}

function resetCheckoutForm() {
  document.getElementById("outCode").value = "";
  document.getElementById("outNom").value = "";
  document.getElementById("outMotif").value = "";
  prepareCheckoutForm();
}

/* ---------------------------------------------------------------------- */
/* Retourner un dossier                                                     */
/* ---------------------------------------------------------------------- */

function prepareReturnForm() {
  populateEmployeeSelects();
  document.getElementById("retDate").value = todayISO();
  const currentUser = loadData(KEYS.CURRENT_USER, "");
  if (currentUser && loadData(KEYS.EMPLOYEES, []).includes(currentUser)) {
    document.getElementById("retEmploye").value = currentUser;
  }
}

function fillReturnInfo() {
  const code = document.getElementById("retCode").value.trim();
  const d = findDossier(code);
  const nomInput = document.getElementById("retNom");
  const dateSortieInput = document.getElementById("retDateSortie");
  const message = document.getElementById("returnMessage");

  if (!d) {
    nomInput.value = "";
    dateSortieInput.value = "";
    return;
  }
  nomInput.value = d.nom;

  const mouvements = loadData(KEYS.MOUVEMENTS, []).filter(m => m.code === d.code && m.action === "Sortie");
  const lastSortie = mouvements.sort((a, b) => parseFRDateForSort(b.date) - parseFRDateForSort(a.date))[0];
  dateSortieInput.value = lastSortie ? lastSortie.date : "";

  if (d.statut !== "Sorti") {
    message.textContent = `Le dossier ${d.code} n'est pas actuellement enregistré comme sorti.`;
    message.className = "form-message error";
  } else {
    message.textContent = "";
  }
}

function submitReturn() {
  const code = document.getElementById("retCode").value.trim();
  const employe = document.getElementById("retEmploye").value;
  const observation = document.getElementById("retObservation").value.trim();
  const dateIso = document.getElementById("retDate").value;
  const message = document.getElementById("returnMessage");

  const d = findDossier(code);
  if (!d) {
    message.textContent = `Aucun dossier trouvé pour le code "${code}".`;
    message.className = "form-message error";
    return;
  }
  if (d.statut !== "Sorti") {
    message.textContent = `Le dossier ${code} n'est pas actuellement sorti.`;
    message.className = "form-message error";
    return;
  }

  const dossiers = loadData(KEYS.DOSSIERS, []);
  const idx = dossiers.findIndex(x => x.code === d.code);
  dossiers[idx].statut = "Disponible";
  saveData(KEYS.DOSSIERS, dossiers);

  const mouvements = loadData(KEYS.MOUVEMENTS, []);
  mouvements.push({
    code: d.code,
    nom: d.nom,
    action: "Retour",
    employe,
    date: dateIso ? `${isoToFR(dateIso)} ${nowFR().split(" ")[1]}` : nowFR(),
    observation: observation || "—"
  });
  saveData(KEYS.MOUVEMENTS, mouvements);

  message.textContent = `Retour du dossier ${code} confirmé avec succès.`;
  message.className = "form-message ok";
  resetReturnForm();
}

function resetReturnForm() {
  document.getElementById("retCode").value = "";
  document.getElementById("retNom").value = "";
  document.getElementById("retDateSortie").value = "";
  document.getElementById("retObservation").value = "";
  document.getElementById("returnMessage").textContent = "";
  prepareReturnForm();
}

/* ---------------------------------------------------------------------- */
/* Historique                                                               */
/* ---------------------------------------------------------------------- */

function renderHistory() {
  const query = (document.getElementById("histFilterQuery").value || "").trim().toLowerCase();
  const action = document.getElementById("histFilterAction").value;
  const from = document.getElementById("histFilterFrom").value;
  const to = document.getElementById("histFilterTo").value;

  let mouvements = loadData(KEYS.MOUVEMENTS, []);

  if (query) {
    mouvements = mouvements.filter(m => m.code.toLowerCase().includes(query) || m.nom.toLowerCase().includes(query));
  }
  if (action) {
    mouvements = mouvements.filter(m => m.action === action);
  }
  if (from) {
    const fromTs = new Date(from).getTime();
    mouvements = mouvements.filter(m => parseFRDateForSort(m.date) >= fromTs);
  }
  if (to) {
    const toTs = new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1;
    mouvements = mouvements.filter(m => parseFRDateForSort(m.date) <= toTs);
  }

  mouvements.sort((a, b) => parseFRDateForSort(b.date) - parseFRDateForSort(a.date));

  const totalPages = Math.max(1, Math.ceil(mouvements.length / HISTORY_PAGE_SIZE));
  if (historyPage > totalPages) historyPage = totalPages;
  const start = (historyPage - 1) * HISTORY_PAGE_SIZE;
  const pageItems = mouvements.slice(start, start + HISTORY_PAGE_SIZE);

  const tbody = document.getElementById("historyTable");
  const emptyState = document.getElementById("historyEmpty");

  if (pageItems.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    tbody.innerHTML = pageItems.map(m => `
      <tr>
        <td class="mono">${escapeHtml(m.code)}</td>
        <td>${escapeHtml(m.nom)}</td>
        <td><span class="badge ${m.action === 'Sortie' ? 'sorti' : 'disponible'}">${escapeHtml(m.action)}</span></td>
        <td>${escapeHtml(m.employe)}</td>
        <td>${escapeHtml(m.date)}</td>
        <td>${escapeHtml(m.observation || "")}</td>
      </tr>`).join("");
  }

  renderHistoryPagination(totalPages);
}

function renderHistoryPagination(totalPages) {
  const container = document.getElementById("historyPagination");
  let html = "";
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === historyPage ? 'active' : ''}" onclick="goToHistoryPage(${i})">${i}</button>`;
  }
  container.innerHTML = html;
}

function goToHistoryPage(page) {
  historyPage = page;
  renderHistory();
}

/* ---------------------------------------------------------------------- */
/* Dossiers introuvables                                                    */
/* ---------------------------------------------------------------------- */

function reportMissing() {
  const code = document.getElementById("missCode").value.trim();
  const observation = document.getElementById("missObservation").value.trim();
  const message = document.getElementById("missMessage");

  if (!code || !observation) {
    message.textContent = "Le code client et l'observation sont obligatoires.";
    message.className = "form-message error";
    return;
  }

  const d = findDossier(code);
  const currentUser = loadData(KEYS.CURRENT_USER, "Employé");

  const introuvables = loadData(KEYS.INTROUVABLES, []);
  introuvables.push({
    code,
    nom: d ? d.nom : "Client inconnu",
    dateSignalement: nowFR(),
    signalePar: currentUser,
    observation,
    statut: "Non résolu"
  });
  saveData(KEYS.INTROUVABLES, introuvables);

  if (d) {
    const dossiers = loadData(KEYS.DOSSIERS, []);
    const idx = dossiers.findIndex(x => x.code === d.code);
    dossiers[idx].statut = "Introuvable";
    saveData(KEYS.DOSSIERS, dossiers);
  }

  message.textContent = `Dossier ${code} signalé comme introuvable.`;
  message.className = "form-message ok";
  document.getElementById("missCode").value = "";
  document.getElementById("missObservation").value = "";

  renderMissingList();
  updateNotifBadge();
}

function renderMissingList() {
  const introuvables = loadData(KEYS.INTROUVABLES, []);
  const tbody = document.getElementById("missingTable");
  const emptyState = document.getElementById("missingEmpty");

  if (introuvables.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    tbody.innerHTML = introuvables.map((item, index) => `
      <tr>
        <td class="mono">${escapeHtml(item.code)}</td>
        <td>${escapeHtml(item.nom)}</td>
        <td>${escapeHtml(item.dateSignalement)}</td>
        <td>${escapeHtml(item.signalePar)}</td>
        <td>${escapeHtml(item.observation)}</td>
        <td>
          <span class="badge ${missingBadgeClass(item.statut)}">${escapeHtml(item.statut)}</span>
          ${item.statut !== "Résolu" ? `<button class="btn-ghost" style="margin-left:6px;padding:3px 8px;font-size:0.72rem;" onclick="resolveMissing(${index})">Marquer résolu</button>` : ""}
        </td>
      </tr>`).join("");
  }
  updateNotifBadge();
}

function resolveMissing(index) {
  const introuvables = loadData(KEYS.INTROUVABLES, []);
  const item = introuvables[index];
  if (!item) return;
  item.statut = "Résolu";
  saveData(KEYS.INTROUVABLES, introuvables);

  const dossiers = loadData(KEYS.DOSSIERS, []);
  const idx = dossiers.findIndex(x => x.code === item.code);
  if (idx >= 0) {
    dossiers[idx].statut = "Disponible";
    saveData(KEYS.DOSSIERS, dossiers);
  }

  renderMissingList();
}

function updateNotifBadge() {
  const introuvables = loadData(KEYS.INTROUVABLES, []);
  const unresolved = introuvables.filter(i => i.statut !== "Résolu").length;
  document.getElementById("notifCount").textContent = unresolved;
}

/* ---------------------------------------------------------------------- */
/* Rapports                                                                 */
/* ---------------------------------------------------------------------- */

function renderReports() {
  const mouvements = loadData(KEYS.MOUVEMENTS, []);
  const dossiers = loadData(KEYS.DOSSIERS, []);

  const sorties = mouvements.filter(m => m.action === "Sortie").length;
  const retours = mouvements.filter(m => m.action === "Retour").length;

  document.getElementById("reportSummaryTable").innerHTML = `
    <tr><td>Sorties</td><td>${sorties}</td></tr>
    <tr><td>Retours</td><td>${retours}</td></tr>
    <tr><td>Total des mouvements</td><td>${mouvements.length}</td></tr>
  `;

  const boxCounts = {};
  dossiers.forEach(d => {
    boxCounts[d.boite] = (boxCounts[d.boite] || 0) + 1;
  });
  const maxCount = Math.max(1, ...Object.values(boxCounts));
  const chart = document.getElementById("reportBoxChart");
  chart.innerHTML = Object.entries(boxCounts).map(([boite, count]) => `
    <div class="bar-row">
      <span>Boîte ${escapeHtml(boite)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(count / maxCount) * 100}%"></div></div>
      <span>${count}</span>
    </div>
  `).join("") || `<p class="empty-state">Aucune donnée disponible.</p>`;
}

function exportCsv() {
  const dossiers = loadData(KEYS.DOSSIERS, []);
  const header = ["Code", "Nom", "Boite", "Rayon", "Statut", "Date archivage"];
  const rows = dossiers.map(d => [d.code, d.nom, d.boite, d.rayon, d.statut, d.dateArchivage]);
  const csv = [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dossiers_btk_archivetrack.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------------------- */
/* Paramètres                                                               */
/* ---------------------------------------------------------------------- */

function renderSettings() {
  document.getElementById("settingsUserName").value = loadData(KEYS.CURRENT_USER, "");
  renderEmployeeList();
}

function saveSettings() {
  const name = document.getElementById("settingsUserName").value.trim();
  const message = document.getElementById("settingsMessage");
  if (!name) {
    message.textContent = "Veuillez saisir un nom.";
    message.className = "form-message error";
    return;
  }
  saveData(KEYS.CURRENT_USER, name);
  updateSidebarUser();
  message.textContent = "Profil mis à jour.";
  message.className = "form-message ok";
}

function renderEmployeeList() {
  const employees = loadData(KEYS.EMPLOYEES, []);
  document.getElementById("employeeList").innerHTML = employees.map((e, i) => `
    <li>${escapeHtml(e)} <button onclick="deleteEmployee(${i})">Supprimer</button></li>
  `).join("");
}

function addEmployee() {
  const input = document.getElementById("newEmployeeName");
  const name = input.value.trim();
  if (!name) return;
  const employees = loadData(KEYS.EMPLOYEES, []);
  if (!employees.includes(name)) {
    employees.push(name);
    saveData(KEYS.EMPLOYEES, employees);
  }
  input.value = "";
  renderEmployeeList();
  populateEmployeeSelects();
}

function deleteEmployee(index) {
  const employees = loadData(KEYS.EMPLOYEES, []);
  employees.splice(index, 1);
  saveData(KEYS.EMPLOYEES, employees);
  renderEmployeeList();
  populateEmployeeSelects();
}

function updateSidebarUser() {
  const name = loadData(KEYS.CURRENT_USER, "Ali Jerbi");
  document.getElementById("currentUserName").textContent = name;
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  document.querySelector(".avatar").textContent = initials || "AJ";
}

function resetAllData() {
  const confirmed = confirm("Voulez-vous vraiment réinitialiser toutes les données de l'application ? Cette action est irréversible.");
  if (!confirmed) return;
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  seedIfEmpty();
  populateEmployeeSelects();
  updateSidebarUser();
  navigateTo("dashboard");
}

/* ---------------------------------------------------------------------- */
/* Initialisation                                                           */
/* ---------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  seedIfEmpty();
  setupNavigation();
  startClock();
  populateEmployeeSelects();
  updateSidebarUser();
  renderDashboard();

  document.getElementById("dashSearchInput").addEventListener("keydown", e => {
    if (e.key === "Enter") dashboardSearch();
  });
  document.getElementById("searchInput").addEventListener("keydown", e => {
    if (e.key === "Enter") performSearch();
  });
  document.getElementById("dossierModal").addEventListener("click", e => {
    if (e.target.id === "dossierModal") closeDossierModal();
  });
});