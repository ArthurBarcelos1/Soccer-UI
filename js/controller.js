// Dados globais do painel
let data = {
    timer: "00:00",
    homeName: "---",
    homeAbbr: "---",
    homeColor: "#1565ff",
    homeLogo: "",
    homeRedCards: 0,
    awayName: "---",
    awayAbbr: "---",
    awayColor: "#ff2b2b",
    awayLogo: "",
    awayRedCards: 0,
    homeScore: 0,
    awayScore: 0,
    competitionLogo: "",
    half: 1,
    injuryTime: 0,
    injuryTimeConfirmed: 0, // Enviado somente ao apertar o botão de confirmação
    showIntro: false,
    introTitle: "",
    subTrigger: null,
    cardTrigger: null
};

let timerInterval = null;
let seconds = 0;

// Salva o estado atual no localStorage
function save() {
    localStorage.setItem("overlay", JSON.stringify(data));
}

// Sincroniza dados dos inputs/botões de volta ao estado global e salva
function syncAndSave() {
    data.timer = document.getElementById("timer").value || "00:00";
    
    data.homeName = document.getElementById("homeName").value.trim() || "---";
    data.homeAbbr = document.getElementById("homeAbbr").value.trim().toUpperCase() || "---";
    data.homeColor = document.getElementById("homeColor").value;
    data.homeRedCards = parseInt(document.getElementById("homeRedCards").value) || 0;
    
    data.awayName = document.getElementById("awayName").value.trim() || "---";
    data.awayAbbr = document.getElementById("awayAbbr").value.trim().toUpperCase() || "---";
    data.awayColor = document.getElementById("awayColor").value;
    data.awayRedCards = parseInt(document.getElementById("awayRedCards").value) || 0;
    
    data.homeScore = parseInt(document.getElementById("homeScore").value) || 0;
    data.awayScore = parseInt(document.getElementById("awayScore").value) || 0;
    
    data.half = parseInt(document.getElementById("half").value) || 1;
    data.injuryTime = parseInt(document.getElementById("injuryTime").value) || 0;
    data.showIntro = document.getElementById("showIntro").checked;
    data.introTitle = document.getElementById("introTitle").value.trim();
    
    save();
}

// Atualiza o preview de cor (tanto visual quanto a borda do card)
function updateColorPreview(team, color) {
    const preview = document.getElementById(`${team}ColorPreview`);
    if (preview) {
        preview.style.backgroundColor = color;
    }
    const cardHeader = document.querySelector(`.card-${team} .card-header`);
    if (cardHeader) {
        cardHeader.style.borderLeftColor = color;
    }
}

// Atualiza o preview de escudo/logo carregado
function updateImagePreview(key, base64) {
    const container = document.getElementById(`${key}PreviewContainer`);
    const img = document.getElementById(`${key}Preview`);
    if (container && img) {
        if (base64) {
            img.src = base64;
            container.style.display = "flex";
        } else {
            img.src = "";
            container.style.display = "none";
        }
    }
}

// Carrega os dados salvos do localStorage
function loadSavedData() {
    const saved = localStorage.getItem("overlay");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            data = { ...data, ...parsed };
        } catch (e) {
            console.error("Erro ao ler os dados salvos no localStorage:", e);
        }
    }
}

// Preenche os campos do painel com os dados atuais
function populateDOM() {
    document.getElementById("homeName").value = data.homeName === "---" ? "" : data.homeName;
    document.getElementById("homeAbbr").value = data.homeAbbr === "---" ? "" : data.homeAbbr;
    document.getElementById("homeRedCards").value = data.homeRedCards || 0;
    
    document.getElementById("awayName").value = data.awayName === "---" ? "" : data.awayName;
    document.getElementById("awayAbbr").value = data.awayAbbr === "---" ? "" : data.awayAbbr;
    document.getElementById("awayRedCards").value = data.awayRedCards || 0;
    
    document.getElementById("homeScore").value = data.homeScore;
    document.getElementById("awayScore").value = data.awayScore;
    
    document.getElementById("homeColor").value = data.homeColor;
    document.getElementById("awayColor").value = data.awayColor;
    updateColorPreview("home", data.homeColor);
    updateColorPreview("away", data.awayColor);
    
    document.getElementById("timer").value = data.timer;
    const halfValue = data.half || 1;
    document.getElementById("half").value = halfValue;
    document.getElementById("injuryTime").value = data.injuryTime || 0;
    document.getElementById("showIntro").checked = !!data.showIntro;
    document.getElementById("introTitle").value = data.introTitle || "";
    
    // Atualiza botões do período ativo
    document.querySelectorAll(".period-btn").forEach(btn => {
        if (btn.getAttribute("data-value") == halfValue) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    
    // Converte tempo string "MM:SS" em segundos inteiros
    const timeParts = data.timer.split(":");
    if (timeParts.length === 2) {
        const min = parseInt(timeParts[0]) || 0;
        const sec = parseInt(timeParts[1]) || 0;
        seconds = min * 60 + sec;
    } else {
        seconds = 0;
    }
    
    // Imagens Previews
    updateImagePreview("homeLogo", data.homeLogo);
    updateImagePreview("awayLogo", data.awayLogo);
    updateImagePreview("competitionLogo", data.competitionLogo);
}

// Registra listeners de upload de imagem
function loadImage(input, key) {
    input.addEventListener("change", () => {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = e => {
            data[key] = e.target.result;
            updateImagePreview(key, e.target.result);
            syncAndSave();
        };
        reader.readAsDataURL(file);
    });
}

// Inicializa os escudos e campeonato
loadImage(document.getElementById("homeLogo"), "homeLogo");
loadImage(document.getElementById("awayLogo"), "awayLogo");
loadImage(document.getElementById("competitionLogo"), "competitionLogo");

// Listeners para remoção de imagens
document.querySelectorAll(".btn-remove-logo").forEach(btn => {
    btn.addEventListener("click", () => {
        const targetKey = btn.getAttribute("data-target");
        data[targetKey] = "";
        
        // Limpa input file
        document.getElementById(targetKey).value = "";
        updateImagePreview(targetKey, "");
        syncAndSave();
    });
});

// Auto-sincronização nos inputs de texto e número
const textInputs = ["homeName", "homeAbbr", "awayName", "awayAbbr", "introTitle"];
textInputs.forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
        if (id === "homeAbbr" || id === "awayAbbr") {
            const input = document.getElementById(id);
            input.value = input.value.toUpperCase();
        }
        syncAndSave();
    });
});

const numberInputs = ["homeScore", "awayScore", "homeRedCards", "awayRedCards"];
numberInputs.forEach(id => {
    document.getElementById(id).addEventListener("input", syncAndSave);
});

// Checkbox de Apresentação
document.getElementById("showIntro").addEventListener("change", syncAndSave);

// Auto-sincronização e preview de cores instantâneo
document.getElementById("homeColor").addEventListener("input", (e) => {
    updateColorPreview("home", e.target.value);
    syncAndSave();
});
document.getElementById("awayColor").addEventListener("input", (e) => {
    updateColorPreview("away", e.target.value);
    syncAndSave();
});

// Botões de ajuste rápido de placar (+ e -)
document.querySelectorAll(".score-adjust-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        const input = document.getElementById(targetId);
        let val = parseInt(input.value) || 0;
        
        if (btn.classList.contains("inc")) {
            val++;
        } else if (btn.classList.contains("dec")) {
            val = Math.max(0, val - 1);
        }
        
        input.value = val;
        syncAndSave();
    });
});

// Zerar placar
document.getElementById("resetScores").addEventListener("click", () => {
    if (confirm("Deseja realmente zerar o placar?")) {
        document.getElementById("homeScore").value = 0;
        document.getElementById("awayScore").value = 0;
        document.getElementById("homeRedCards").value = 0;
        document.getElementById("awayRedCards").value = 0;
        syncAndSave();
    }
});

// ==========================================================================
// Lógica do Cronômetro & Acréscimos
// ==========================================================================
function formatTime() {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function updateTimer() {
    const formatted = formatTime();
    document.getElementById("timer").value = formatted;
    data.timer = formatted;
    save();
}

function startTimerLogic() {
    if (timerInterval) return;

    document.querySelector(".timer-display-wrapper").classList.add("running");

    const limit = document.getElementById("half").value == "1"
        ? 45 * 60
        : 90 * 60;

    timerInterval = setInterval(() => {
        if (seconds >= limit) {
            clearInterval(timerInterval);
            timerInterval = null;
            document.querySelector(".timer-display-wrapper").classList.remove("running");
            return;
        }

        seconds++;
        updateTimer();
    }, 1000);
}

function pauseTimerLogic() {
    clearInterval(timerInterval);
    timerInterval = null;
    document.querySelector(".timer-display-wrapper").classList.remove("running");
}

document.getElementById("startTimer").onclick = () => {
    startTimerLogic();
};

document.getElementById("pauseTimer").onclick = () => {
    pauseTimerLogic();
};

document.getElementById("resetTimer").onclick = () => {
    pauseTimerLogic();
    const halfVal = document.getElementById("half").value;
    seconds = halfVal == "1" ? 0 : 45 * 60;
    updateTimer();
};

// Seletor de Período (1º Tempo / 2º Tempo) com tabs customizadas
document.querySelectorAll(".period-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".period-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        const val = btn.getAttribute("data-value");
        document.getElementById("half").value = val;
        
        pauseTimerLogic();
        seconds = val == "1" ? 0 : 45 * 60;
        updateTimer();
        syncAndSave();
    });
});

// Controle de acréscimo (só ajusta o valor, NÃO envia ainda)
document.getElementById("decInjury").addEventListener("click", () => {
    const input = document.getElementById("injuryTime");
    let val = parseInt(input.value) || 0;
    val = Math.max(0, val - 1);
    input.value = val;
    data.injuryTime = val; // Salva localmente mas não confirma
    save();
});

document.getElementById("incInjury").addEventListener("click", () => {
    const input = document.getElementById("injuryTime");
    let val = parseInt(input.value) || 0;
    val = Math.min(15, val + 1);
    input.value = val;
    data.injuryTime = val; // Salva localmente mas não confirma
    save();
});

// Confirmar Acréscimos — só aqui o badge aparece no overlay
document.getElementById("confirmInjury").addEventListener("click", () => {
    const val = parseInt(document.getElementById("injuryTime").value) || 0;
    data.injuryTimeConfirmed = val;
    save();

    const btn = document.getElementById("confirmInjury");
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check-double"></i> Confirmado!';
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = orig;
        btn.disabled = false;
    }, 2000);
});

// Botões de ajuste fino de tempo (+1 min, -1 min, +10s, -10s)
document.getElementById("adjustSub1m").addEventListener("click", () => {
    seconds = Math.max(0, seconds - 60);
    updateTimer();
});

document.getElementById("adjustAdd1m").addEventListener("click", () => {
    seconds += 60;
    updateTimer();
});

document.getElementById("adjustSub10s").addEventListener("click", () => {
    seconds = Math.max(0, seconds - 10);
    updateTimer();
});

document.getElementById("adjustAdd10s").addEventListener("click", () => {
    seconds += 10;
    updateTimer();
});

// ==========================================================================
// Edição manual direta do Cronômetro
// ==========================================================================
function parseTimerInput(value) {
    value = value.trim().replace(/[,.]/g, ":");
    
    let currentMin = Math.floor(seconds / 60);
    
    if (value.includes(":")) {
        const parts = value.split(":");
        let min = parseInt(parts[0]);
        let sec = parseInt(parts[1]);
        
        if (isNaN(min)) min = currentMin;
        if (isNaN(sec)) sec = 0;
        
        if (sec >= 60) {
            min += Math.floor(sec / 60);
            sec = sec % 60;
        }
        return min * 60 + sec;
    } else {
        const min = parseInt(value);
        if (isNaN(min)) return seconds; // Mantém o atual se for inválido
        return min * 60;
    }
}

const timerInput = document.getElementById("timer");

timerInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        timerInput.blur();
    }
});

timerInput.addEventListener("change", () => {
    const val = timerInput.value;
    seconds = parseTimerInput(val);
    updateTimer();
});

// ==========================================================================
// Lógica de Abas de Eventos de Transmissão
// ==========================================================================
document.querySelectorAll(".event-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".event-tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".event-tab-content").forEach(c => c.classList.remove("active"));
        
        btn.classList.add("active");
        const tabId = btn.getAttribute("data-tab");
        document.getElementById(tabId).classList.add("active");
    });
});

// Disparo de Evento de Substituição
document.getElementById("triggerSub").addEventListener("click", () => {
    data.subTrigger = {
        team: document.getElementById("subTeam").value,
        playerOut: document.getElementById("subOut").value.trim(),
        playerIn: document.getElementById("subIn").value.trim(),
        timestamp: Date.now()
    };
    save();
    
    // Feedback visual no botão
    const btn = document.getElementById("triggerSub");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Enviado!';
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 1500);
});

// Disparo de Evento de Cartão
document.getElementById("triggerCard").addEventListener("click", () => {
    data.cardTrigger = {
        team: document.getElementById("cardTeam").value,
        player: document.getElementById("cardPlayer").value.trim(),
        type: document.getElementById("cardType").value,
        timestamp: Date.now()
    };
    save();
    
    // Feedback visual no botão
    const btn = document.getElementById("triggerCard");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Enviado!';
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }, 1500);
});

// ==========================================================================
// Botão manual de Sincronização (Forçar)
// ==========================================================================
document.getElementById("apply").addEventListener("click", () => {
    syncAndSave();
    
    // Feedback visual temporário de sincronizado
    const statusText = document.querySelector(".status-text");
    statusText.textContent = "Sincronizado!";
    statusText.style.color = "#10b981";
    setTimeout(() => {
        statusText.textContent = "Sincronizado em tempo real";
        statusText.style.color = "";
    }, 2000);
});

// ==========================================================================
// Inicialização do Painel
// ==========================================================================
loadSavedData();
populateDOM();
// Sincroniza uma primeira vez para garantir consistência
save();
