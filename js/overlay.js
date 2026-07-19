// Estado anterior para detectar mudanças de placar e eventos
let prevHomeScore = null;
let prevAwayScore = null;
let prevSubTimestamp = null;
let prevCardTimestamp = null;

// Timers para esconder banners
let subBannerTimer = null;
let cardBannerTimer = null;

// Segundos extras contados no acréscimo (para exibição na injury-strip)
// A contagem é derivada do timer salvo vs. o limite do tempo regular
const HALF_LIMITS = { 1: 45 * 60, 2: 90 * 60 };

// ==========================================================================
// Funções Utilitárias
// ==========================================================================
function parseTimerToSeconds(timerStr) {
    if (!timerStr) return 0;
    const parts = timerStr.split(":");
    if (parts.length !== 2) return 0;
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
}

function formatSeconds(sec) {
    const m = Math.floor(Math.abs(sec) / 60);
    const s = Math.abs(sec) % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function setBorderColor(element, color) {
    if (!color) return;
    const hex = color.replace("#", "");
    if (hex.length < 6) return;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    element.style.border = brightness >= 128 ? "2px solid #000" : "2px solid #FFF";
}

// ==========================================================================
// Atualização Principal do Overlay
// ==========================================================================
function updateOverlay() {
    const raw = localStorage.getItem("overlay");
    if (!raw) return;

    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        return;
    }
    if (!data) return;

    // --- Timer principal + Injury Strip ---
    updateTimerDisplay(data);

    // --- Nomes/Siglas ---
    document.getElementById("homeNameAbbr").textContent = data.homeAbbr || "---";
    document.getElementById("awayNameAbbr").textContent = data.awayAbbr || "---";

    // --- Placares + Detecção de Gol ---
    const homeScore = data.homeScore ?? 0;
    const awayScore = data.awayScore ?? 0;

    if (prevHomeScore !== null && homeScore > prevHomeScore) {
        triggerGoalAnimation("home", data);
    }
    if (prevAwayScore !== null && awayScore > prevAwayScore) {
        triggerGoalAnimation("away", data);
    }

    prevHomeScore = homeScore;
    prevAwayScore = awayScore;

    document.getElementById("homeScoreBoard").textContent = homeScore;
    document.getElementById("awayScoreBoard").textContent = awayScore;

    // --- Cores dos Shirts ---
    const homeShirt = document.querySelector(".shirt.home");
    const awayShirt = document.querySelector(".shirt.away");
    if (homeShirt) {
        homeShirt.style.background = data.homeColor || "#1565ff";
        setBorderColor(homeShirt, data.homeColor || "#1565ff");
    }
    if (awayShirt) {
        awayShirt.style.background = data.awayColor || "#ff2b2b";
        setBorderColor(awayShirt, data.awayColor || "#ff2b2b");
    }

    // --- Logos ---
    setLogo("homeLogoImg", data.homeLogo);
    setLogo("awayLogoImg", data.awayLogo);
    setLogo("compLogoImg", data.competitionLogo);

    // --- Cartões Vermelhos Acima do Logo ---
    renderRedCards("homeRedCardsContainer", data.homeRedCards || 0);
    renderRedCards("awayRedCardsContainer", data.awayRedCards || 0);

    // --- Intro/Apresentação ---
    updateIntroPopup(data);

    // --- Substituição (por timestamp) ---
    if (data.subTrigger && data.subTrigger.timestamp !== prevSubTimestamp) {
        prevSubTimestamp = data.subTrigger.timestamp;
        showSubBanner(data);
    }

    // --- Cartão (por timestamp) ---
    if (data.cardTrigger && data.cardTrigger.timestamp !== prevCardTimestamp) {
        prevCardTimestamp = data.cardTrigger.timestamp;
        showCardBanner(data);
    }
}

// ==========================================================================
// Timer Display + Injury Strip Logic
// ==========================================================================
function updateTimerDisplay(data) {
    const timerEl = document.getElementById("timerDisplay");
    const injuryStrip = document.getElementById("injuryStrip");
    const injuryExtraDisplay = document.getElementById("injuryExtraDisplay");
    const injuryExtraBadge = document.getElementById("injuryExtraBadge");

    const totalSec = parseTimerToSeconds(data.timer);
    const half = parseInt(data.half) || 1;
    const limit = HALF_LIMITS[half] || HALF_LIMITS[1];
    const injuryTimeConfirmed = parseInt(data.injuryTimeConfirmed) || 0;

    if (totalSec > limit) {
        // Tempo passou do regular: congela o timer no limite e mostra acréscimo abaixo
        timerEl.textContent = formatSeconds(limit);
        injuryStrip.classList.add("visible");

        const extraSec = totalSec - limit;
        injuryExtraDisplay.textContent = formatSeconds(extraSec);

        // Mostra badge "+X" somente se acréscimo foi confirmado
        if (injuryTimeConfirmed > 0) {
            injuryExtraBadge.textContent = `+${injuryTimeConfirmed}`;
            injuryExtraBadge.classList.add("visible");
        } else {
            injuryExtraBadge.textContent = "";
            injuryExtraBadge.classList.remove("visible");
        }
    } else {
        // Tempo normal
        timerEl.textContent = data.timer || "00:00";
        injuryStrip.classList.remove("visible");
        injuryExtraBadge.classList.remove("visible");
    }
}

// ==========================================================================
// Logo Helper
// ==========================================================================
function setLogo(id, src) {
    const el = document.getElementById(id);
    if (!el) return;
    if (src) {
        el.src = src;
        el.style.display = "";
    } else {
        el.src = "";
        el.style.display = "none";
    }
}

// ==========================================================================
// Cartões Vermelhos Acumulados (acima dos logos)
// ==========================================================================
function renderRedCards(containerId, count) {
    const container = document.getElementById(containerId);
    if (!container) return;
    // Só re-renderiza se mudou
    const current = container.children.length;
    if (current === count) return;

    container.innerHTML = "";
    const max = Math.min(Math.max(count, 0), 5);
    for (let i = 0; i < max; i++) {
        const chip = document.createElement("div");
        chip.className = "red-card-chip";
        container.appendChild(chip);
    }
}

// ==========================================================================
// Animação de GOL
// ==========================================================================
function triggerGoalAnimation(team, data) {
    const scoreBoardEl = team === "home"
        ? document.getElementById("homeScoreBoard")
        : document.getElementById("awayScoreBoard");

    // Flash no quadrado do placar
    scoreBoardEl.classList.remove("goal-flash");
    void scoreBoardEl.offsetWidth; // reflow
    scoreBoardEl.classList.add("goal-flash");
    setTimeout(() => scoreBoardEl.classList.remove("goal-flash"), 950);

    // Banner central de GOL
    const goalAlert = document.getElementById("goalAlert");
    const goalTeamName = document.getElementById("goalTeamName");
    const goalTeamLogoEl = document.getElementById("goalTeamLogo");

    if (team === "home") {
        goalTeamName.textContent = (data.homeName && data.homeName !== "---") ? data.homeName.toUpperCase() : (data.homeAbbr || "CASA");
        goalTeamLogoEl.src = data.homeLogo || "";
    } else {
        goalTeamName.textContent = (data.awayName && data.awayName !== "---") ? data.awayName.toUpperCase() : (data.awayAbbr || "VISITANTE");
        goalTeamLogoEl.src = data.awayLogo || "";
    }

    goalTeamLogoEl.style.display = goalTeamLogoEl.src ? "" : "none";

    goalAlert.classList.remove("show");
    void goalAlert.offsetWidth;
    goalAlert.classList.add("show");

    setTimeout(() => goalAlert.classList.remove("show"), 5200);
}

// ==========================================================================
// Banner Lateral de Substituição (Centro-Esquerdo)
// ==========================================================================
function showSubBanner(data) {
    const sub = data.subTrigger;
    const banner = document.getElementById("subBanner");
    const accent = document.getElementById("subBannerAccent");

    document.getElementById("subOutPlayer").textContent = (sub.playerOut || "---").toUpperCase();
    document.getElementById("subInPlayer").textContent = (sub.playerIn || "---").toUpperCase();

    // Acento na cor do time
    const color = sub.team === "home" ? (data.homeColor || "#1565ff") : (data.awayColor || "#ff2b2b");
    if (accent) accent.style.background = color;

    banner.classList.remove("show");
    clearTimeout(subBannerTimer);
    void banner.offsetWidth;
    banner.classList.add("show");

    subBannerTimer = setTimeout(() => banner.classList.remove("show"), 7000);
}

// ==========================================================================
// Banner Lateral de Cartão (Centro-Esquerdo)
// ==========================================================================
function showCardBanner(data) {
    const ev = data.cardTrigger;
    const banner = document.getElementById("cardBanner");
    const cardGraphic = document.getElementById("cardGraphic");
    const accent = document.getElementById("cardBannerAccent");

    document.getElementById("cardBannerPlayer").textContent = (ev.player || "---").toUpperCase();
    document.getElementById("cardBannerTitle").textContent =
        ev.type === "yellow" ? "CARTÃO AMARELO" : "CARTÃO VERMELHO";

    // Cor da ficha
    cardGraphic.className = "card-referee-graphic";
    void cardGraphic.offsetWidth;
    cardGraphic.classList.add(ev.type === "yellow" ? "yellow" : "red");

    // Acento na cor do time
    const teamColor = ev.team === "home" ? (data.homeColor || "#1565ff") : (data.awayColor || "#ff2b2b");
    if (accent) accent.style.background = teamColor;

    banner.classList.remove("show");
    clearTimeout(cardBannerTimer);
    void banner.offsetWidth;
    banner.classList.add("show");

    // Anima o gráfico do cartão após aparecer
    setTimeout(() => cardGraphic.classList.add("wave"), 300);

    cardBannerTimer = setTimeout(() => banner.classList.remove("show"), 7000);
}

// ==========================================================================
// Popup de Apresentação Central (slim, flutuando)
// ==========================================================================
function updateIntroPopup(data) {
    const popup = document.getElementById("introPopup");

    if (data.showIntro) {
        popup.classList.add("show");

        document.getElementById("introHomeName").textContent =
            (data.homeName && data.homeName !== "---") ? data.homeName.toUpperCase() : (data.homeAbbr || "CASA");
        document.getElementById("introAwayName").textContent =
            (data.awayName && data.awayName !== "---") ? data.awayName.toUpperCase() : (data.awayAbbr || "VISITANTE");

        document.getElementById("introHomeScore").textContent = data.homeScore ?? 0;
        document.getElementById("introAwayScore").textContent = data.awayScore ?? 0;

        // Muda "VS" para ":" quando há gols
        const hasGoals = (data.homeScore || 0) > 0 || (data.awayScore || 0) > 0;
        const divider = document.getElementById("introVsOrColon");
        if (divider) divider.textContent = hasGoals ? ":" : "VS";

        // Label inferior (campeonato / título customizado)
        const label = document.getElementById("introCompetitionTitle");
        if (label) {
            label.textContent = (data.introTitle && data.introTitle.trim())
                ? data.introTitle.toUpperCase()
                : (data.half == 2 ? "2º TEMPO • AO VIVO" : "1º TEMPO • AO VIVO");
        }

        // Logos nos times do popup
        setLogo("introHomeLogo", data.homeLogo);
        setLogo("introAwayLogo", data.awayLogo);
    } else {
        popup.classList.remove("show");
    }
}

// ==========================================================================
// Inicialização
// ==========================================================================
updateOverlay();
window.addEventListener("storage", updateOverlay);
setInterval(updateOverlay, 100);
