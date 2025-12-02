// Núcleo do mini-jogo de carreira: cria personagem, joga partidas por destaques,
// gere moral/formação/lesões e guarda progresso em localStorage.
// ============================
// Configuração base
// ============================

// Mini-calendário da época
// difficulty: 0 = fácil, 1 = médio, 2 = difícil
const fixtures = [
  { name: "Atlético do Bairro Velho", difficulty: 0 },
  { name: "União da Serra Alta", difficulty: 1 },
  { name: "AD Ribeirense", difficulty: 1 },
  { name: "Sporting da Foz", difficulty: 2 },
  { name: "Académico do Norte", difficulty: 2 }
];

// Estado global do jogo
const gameState = {
  player: null,
  phase: "creation",
  minute: 0,
  scorePlayer: 0,
  scoreOpponent: 0,
  highlightIndex: 0,

  currentRating: null,

  // estado de lesão
  injury: {
    isInjured: false,
    gamesToMiss: 0
  },

  // flags de eventos narrativos
  flags: {
    transferEventShown: false
  },

  // dados da época
  seasonNumber: 1,
  totalMatches: fixtures.length,
  wins: 0,
  draws: 0,
  losses: 0,
  points: 0,

  // estatísticas do jogador
  playerStats: {
    games: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    lastRating: null,
    ratingSum: 0
  }
};

const POSITION_PRESETS = {
  Forward: {
    label: "Avançado",
    attributes: {
      Tecnica: 4,
      Fisico: 3,
      Tactica: 2,
      Mental: 2,
      Social: 2
    }
  },
  Midfielder: {
    label: "Médio",
    attributes: {
      Tecnica: 3,
      Fisico: 2,
      Tactica: 4,
      Mental: 3,
      Social: 2
    }
  },
  Defender: {
    label: "Defesa",
    attributes: {
      Tecnica: 2,
      Fisico: 4,
      Tactica: 3,
      Mental: 3,
      Social: 1
    }
  },
  Goalkeeper: {
    label: "Guarda-redes",
    attributes: {
      Tecnica: 3,
      Fisico: 3,
      Tactica: 3,
      Mental: 4,
      Social: 1
    }
  }
};

const SAVE_KEY = "bt_career_v1";

// ============================
// Referências ao DOM
// ============================

const characterCreationSection = document.getElementById("character-creation");
const gameSection = document.getElementById("game");
const startGameBtn = document.getElementById("start-game-btn");
const continueCareerBtn = document.getElementById("continue-career-btn");
const creationError = document.getElementById("creation-error");

const playerNameInput = document.getElementById("player-name");
const playerPositionSelect = document.getElementById("player-position");
const playerAgeInput = document.getElementById("player-age");
const playerFootSelect = document.getElementById("player-foot");
const playerPersonalitySelect = document.getElementById("player-personality");

const infoName = document.getElementById("info-name");
const infoPosition = document.getElementById("info-position");
const infoAge = document.getElementById("info-age");
const infoFoot = document.getElementById("info-foot");
const infoPersonality = document.getElementById("info-personality");
const attributesList = document.getElementById("attributes-list");
const infoStamina = document.getElementById("info-stamina");
const infoMorale = document.getElementById("info-morale");
const infoForm = document.getElementById("info-form");
const infoInjury = document.getElementById("info-injury");
const infoInjuryRisk = document.getElementById("info-injury-risk");

const helpPanel = document.getElementById("help-panel");
const toggleHelpBtn = document.getElementById("toggle-help");

if (toggleHelpBtn && helpPanel) {
  toggleHelpBtn.addEventListener("click", () => {
    helpPanel.classList.toggle("hidden");
  });
}

const barStamina = document.getElementById("bar-stamina");
const barMorale = document.getElementById("bar-morale");
const barForm = document.getElementById("bar-form");
const barInjuryRisk = document.getElementById("bar-injury-risk");

const seasonMatchEl = document.getElementById("season-match");
const seasonRecordEl = document.getElementById("season-record");
const seasonPointsEl = document.getElementById("season-points");
const seasonOpponentEl = document.getElementById("season-opponent");
const seasonObjectivesEl = document.getElementById("season-objectives");
const seasonNumberEl = document.getElementById("season-number");

const statGamesEl = document.getElementById("stat-games");
const statGoalsEl = document.getElementById("stat-goals");
const statAssistsEl = document.getElementById("stat-assists");
const statCleanSheetsEl = document.getElementById("stat-cleansheets");
const statLastRatingEl = document.getElementById("stat-last-rating");
const statAvgRatingEl = document.getElementById("stat-avg-rating");

const scorePlayerEl = document.getElementById("score-player");
const scoreOpponentEl = document.getElementById("score-opponent");
const infoMinute = document.getElementById("info-minute");

const storyLog = document.getElementById("story-log");
const choicesContainer = document.getElementById("choices");

// ============================
// Utilitários de época / fixtures
// ============================

function getGamesPlayed() {
  // Soma vitórias/empates/derrotas para saber quantos jogos já decorreram
  return gameState.wins + gameState.draws + gameState.losses;
}

function getCurrentFixture() {
  // Devolve o adversário do jogo atual com base no número de partidas disputadas
  const gamesPlayed = getGamesPlayed();
  const index = Math.min(gamesPlayed, fixtures.length - 1);
  return fixtures[index];
}

// ============================
// UI geral
// ============================

function initGameUI() {
  // Esconde o ecrã de criação e popula o painel principal com os dados do jogador
  characterCreationSection.classList.add("hidden");
  gameSection.classList.remove("hidden");

  const p = gameState.player;
  if (p && p.attributes) {
    attributesList.innerHTML = "";
    Object.entries(p.attributes).forEach(([attr, value]) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${attr}</span><span>${value}</span>`;
      attributesList.appendChild(li);
    });
  }

  updateStatus();
  clearStory();
}

function updateSeasonUI() {
  // Atualiza painel de época (jogo atual, registo, pontos, adversário, número da época)
  const gamesPlayed = getGamesPlayed();
  const currentMatchNumber = Math.min(gamesPlayed + 1, gameState.totalMatches);

  seasonMatchEl.textContent = `${currentMatchNumber} / ${gameState.totalMatches}`;
  seasonRecordEl.textContent = `${gameState.wins}V - ${gameState.draws}E - ${gameState.losses}D`;
  seasonPointsEl.textContent = `${gameState.points}`;

  const fixture = getCurrentFixture();
  if (fixture) {
    seasonOpponentEl.textContent = fixture.name;
  } else {
    seasonOpponentEl.textContent = "—";
  }

  if (seasonNumberEl) {
    seasonNumberEl.textContent = String(gameState.seasonNumber ?? 1);
  }
}

// Atualizar estado (stamina, moral, forma, resultado, minuto)
function updateStatus() {
  // Recalcula texto e barras de UI com info atual de jogador, marcador e minuto
  const p = gameState.player;
  if (p) {
    infoName.textContent = p.name || "";
    infoPosition.textContent = p.positionLabel || p.positionKey || "";
    infoAge.textContent = p.age != null ? String(p.age) : "—";
    infoFoot.textContent = p.foot || "—";
    infoPersonality.textContent = p.personality || "—";

    // risco de lesão default se faltar
    if (p.injuryRisk === undefined || p.injuryRisk === null) {
      p.injuryRisk = 25;
    }

    infoStamina.textContent = `${p.stamina}`;
    infoMorale.textContent = `${p.morale}`;
    infoForm.textContent = `${p.form}`;
    if (infoInjuryRisk) {
      infoInjuryRisk.textContent = `${p.injuryRisk}`;
    }
  }

  scorePlayerEl.textContent = gameState.scorePlayer;
  scoreOpponentEl.textContent = gameState.scoreOpponent;
  infoMinute.textContent = `${gameState.minute}'`;

  updateSeasonUI();
  updateStatsUI();
  updateInjuryUI();
  updateStatusBars();
  updateObjectivesUI();
}

function updateStatusBars() {
  const p = gameState.player;
  if (!p) return;

  // Barras horizontais para valores percentuais de stamina/moral/forma/risco de lesão
  if (barStamina) {
    barStamina.style.width = `${p.stamina}%`;
  }
  if (barMorale) {
    barMorale.style.width = `${p.morale}%`;
  }
  if (barForm) {
    barForm.style.width = `${p.form}%`;
  }
  if (barInjuryRisk) {
    const risk = Math.max(0, Math.min(100, p.injuryRisk ?? 25));
    barInjuryRisk.style.width = `${risk}%`;
  }
}

function updateStatsUI() {
  // Atualiza contadores de jogos/golos/assistências/balizas invioladas e notas
  const s = gameState.playerStats;
  statGamesEl.textContent = s.games;
  statGoalsEl.textContent = s.goals;
  statAssistsEl.textContent = s.assists;
  statCleanSheetsEl.textContent = s.cleanSheets;

  if (s.lastRating == null) {
    statLastRatingEl.textContent = "—";
  } else if (typeof s.lastRating === "number") {
    statLastRatingEl.textContent = s.lastRating.toFixed(1);
  } else {
    statLastRatingEl.textContent = s.lastRating;
  }

  if (s.games > 0 && s.ratingSum > 0) {
    const avg = s.ratingSum / s.games;
    statAvgRatingEl.textContent = avg.toFixed(1);
  } else {
    statAvgRatingEl.textContent = "—";
  }
}

function getAverageRating() {
  // Média das notas acumuladas, ou null se ainda não há base para cálculo
  const s = gameState.playerStats;
  if (!s || !s.games || s.games === 0) return null;
  if (!s.ratingSum || s.ratingSum <= 0) return null;
  return s.ratingSum / s.games;
}

/**
 * Devolve a lista de objetivos da época para o jogador atual,
 * com informação de progresso e se já estão concluídos.
 */
function getSeasonObjectivesForCurrentPlayer() {
  const p = gameState.player;
  const s = gameState.playerStats;
  if (!p || !s) return [];

  const avg = getAverageRating();

  const objectives = [];

  // Objetivos comuns a todas as posições
  // 1) Jogar pelo menos 4 jogos
  objectives.push({
    id: "games",
    text: "Jogar pelo menos 4 jogos",
    progress: `${s.games}/4`,
    done: s.games >= 4
  });

  // 2) Média de notas mínima 7.0
  let avgProgress = "—/7.0";
  let avgDone = false;
  if (avg !== null) {
    avgProgress = `${avg.toFixed(1)}/7.0`;
    avgDone = avg >= 7.0;
  }
  objectives.push({
    id: "avg",
    text: "Ter média de notas de pelo menos 7.0",
    progress: avgProgress,
    done: avgDone
  });

  // Objetivos específicos por posição
  if (p.positionKey === "Forward") {
    objectives.push({
      id: "goals",
      text: "Marcar pelo menos 3 golos",
      progress: `${s.goals}/3`,
      done: s.goals >= 3
    });
  } else if (p.positionKey === "Midfielder") {
    objectives.push({
      id: "assists",
      text: "Fazer pelo menos 3 assistências",
      progress: `${s.assists}/3`,
      done: s.assists >= 3
    });
  } else if (p.positionKey === "Goalkeeper") {
    objectives.push({
      id: "cleansheets",
      text: "Conseguir pelo menos 2 balizas invioladas",
      progress: `${s.cleanSheets}/2`,
      done: s.cleanSheets >= 2
    });
  } else if (p.positionKey === "Defender") {
    // Para já, usamos um objetivo extra genérico
    objectives.push({
      id: "solid",
      text: "Manter forma ≥ 60 no fim da época",
      progress: `${gameState.player.form}/60`,
      done: gameState.player.form >= 60
    });
  }

  return objectives;
}

function updateObjectivesUI() {
  // Preenche a lista de objetivos da época, marcando os já concluídos
  if (!seasonObjectivesEl) return;

  const objectives = getSeasonObjectivesForCurrentPlayer();
  seasonObjectivesEl.innerHTML = "";

  if (!objectives.length) {
    const li = document.createElement("li");
    li.textContent = "Sem objetivos definidos.";
    seasonObjectivesEl.appendChild(li);
    return;
  }

  objectives.forEach((obj) => {
    const li = document.createElement("li");
    if (obj.done) {
      li.classList.add("objective-done");
    }

    const textSpan = document.createElement("span");
    textSpan.classList.add("objective-text");
    textSpan.textContent = obj.text;

    const progressSpan = document.createElement("span");
    progressSpan.classList.add("objective-progress");
    progressSpan.textContent = obj.progress;

    li.appendChild(textSpan);
    li.appendChild(progressSpan);
    seasonObjectivesEl.appendChild(li);
  });
}

function updateInjuryUI() {
  // Mostra "Apto" ou quantos jogos o jogador ainda ficará de fora
  if (!infoInjury) return;

  const inj = gameState.injury;
  if (!inj || !inj.isInjured || inj.gamesToMiss <= 0) {
    infoInjury.textContent = "Apto";
  } else {
    const jogos = inj.gamesToMiss;
    infoInjury.textContent = `Lesionado (${jogos} jogo(s) de fora)`;
  }
}

function clearStory() {
  // Limpa o feed de narrativa
  storyLog.innerHTML = "";
}

function addStoryLine(text, type = "narrator") {
  // Adiciona uma nova linha de narrativa ao log e faz scroll para o fim
  const div = document.createElement("div");
  div.classList.add("story-entry", type);
  div.textContent = text;
  storyLog.appendChild(div);
  storyLog.scrollTop = storyLog.scrollHeight;
}

function setChoices(choices) {
  // Constrói o grupo de botões de escolha para a decisão atual
  choicesContainer.innerHTML = "";
  choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.textContent = choice.label;
    if (choice.secondary) {
      btn.classList.add("secondary");
    }
    btn.addEventListener("click", () => {
      choice.onSelect();
    });
    choicesContainer.appendChild(btn);
  });
}

// ============================
// Rolls / estado
// ============================

function rollSkill(baseValue, difficulty) {
  // Simula um d12 ajustado ao adversário; devolve outcome e valores usados
  const roll = Math.floor(Math.random() * 12) + 1; // 1-12
  const fixture = getCurrentFixture();
  const difficultyMod = fixture ? fixture.difficulty : 0;
  const target = difficulty + difficultyMod;

  const total = baseValue + roll;

  if (total >= target + 6) return { outcome: "greatSuccess", roll, total };
  if (total >= target) return { outcome: "success", roll, total };
  if (total >= target - 4) return { outcome: "fail", roll, total };
  return { outcome: "badFail", roll, total };
}

function clampPlayerStatus() {
  // Garante que stamina/moral/forma/risco se mantêm dentro de 0-100
  const p = gameState.player;
  if (!p) return;

  p.stamina = Math.max(0, Math.min(100, p.stamina));
  p.morale = Math.max(0, Math.min(100, p.morale));
  p.form = Math.max(0, Math.min(100, p.form));

  if (p.injuryRisk === undefined || p.injuryRisk === null) {
    p.injuryRisk = 25;
  }
  p.injuryRisk = Math.max(0, Math.min(100, p.injuryRisk));
}

function applyAttributeGrowth(finalRating) {
  // Aumenta atributos após jogo bom (>=8), escolhendo pool relevante à posição
  const p = gameState.player;
  if (!p || !p.attributes) return [];

  const att = p.attributes;

  // Quantos pontos de evolução ganha neste jogo
  let points = 0;
  if (finalRating >= 9) {
    points = 2;
  } else if (finalRating >= 8) {
    points = 1;
  } else {
    return []; // nota normal/baixa, não há evolução visível
  }

  // Atributos mais relevantes por posição
  let pool;
  switch (p.positionKey) {
    case "Forward":
      pool = ["Tecnica", "Fisico", "Mental"];
      break;
    case "Midfielder":
      pool = ["Tecnica", "Tactica", "Mental"];
      break;
    case "Defender":
      pool = ["Fisico", "Tactica", "Mental"];
      break;
    case "Goalkeeper":
      pool = ["Mental", "Tactica", "Tecnica", "Fisico"];
      break;
    default:
      pool = ["Tecnica", "Fisico", "Tactica", "Mental", "Social"];
  }

  const improved = [];
  const available = [...pool];

  for (let i = 0; i < points && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    const attrName = available.splice(idx, 1)[0];
    att[attrName] = (att[attrName] ?? 1) + 1;
    improved.push(attrName);
  }

  return improved;
}

function applyRatingChange(delta) {
  // Ajusta nota corrente do jogo com limites 1–10
  if (gameState.currentRating == null) {
    gameState.currentRating = 6; // base neutra
  }
  gameState.currentRating = Math.max(
    1,
    Math.min(10, gameState.currentRating + delta)
  );
}

function applyRatingFromOutcome(outcome) {
  // Traduz um outcome (greatSuccess, etc.) em variação de nota do jogo
  if (outcome === "greatSuccess") {
    applyRatingChange(1.0);
  } else if (outcome === "success") {
    applyRatingChange(0.5);
  } else if (outcome === "fail") {
    applyRatingChange(-0.5);
  } else if (outcome === "badFail") {
    applyRatingChange(-1.0);
  }
}

// ============================
// Guardar / carregar carreira
// ============================

function saveGame() {
  // Persiste estado principal (jogador, época, stats, lesão, flags) no localStorage
  if (!gameState.player) return;

  const data = {
    player: gameState.player,
    career: {
      seasonNumber: gameState.seasonNumber,
      totalMatches: gameState.totalMatches,
      wins: gameState.wins,
      draws: gameState.draws,
      losses: gameState.losses,
      points: gameState.points
    },
    stats: gameState.playerStats,
    injury: gameState.injury,
    flags: gameState.flags
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Erro ao guardar carreira:", e);
  }
}

function loadGame() {
  // Recupera dados do localStorage e repõe defaults em falta; devolve sucesso/falha
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      creationError.textContent = "Não foi encontrada nenhuma carreira guardada.";
      return false;
    }
    const data = JSON.parse(raw);
    if (!data.player) {
      creationError.textContent = "Dados de carreira inválidos.";
      return false;
    }

    gameState.player = data.player;
    const p = gameState.player;
    if (p && (p.injuryRisk === undefined || p.injuryRisk === null)) {
      p.injuryRisk = 25;
    }

    if (data.career) {
      gameState.seasonNumber = data.career.seasonNumber ?? 1;
      gameState.totalMatches = data.career.totalMatches ?? fixtures.length;
      gameState.wins = data.career.wins ?? 0;
      gameState.draws = data.career.draws ?? 0;
      gameState.losses = data.career.losses ?? 0;
      gameState.points = data.career.points ?? 0;
    } else {
      gameState.seasonNumber = 1;
      gameState.totalMatches = fixtures.length;
      gameState.wins = 0;
      gameState.draws = 0;
      gameState.losses = 0;
      gameState.points = 0;
    }

    if (data.stats) {
      gameState.playerStats = {
        games: data.stats.games ?? 0,
        goals: data.stats.goals ?? 0,
        assists: data.stats.assists ?? 0,
        cleanSheets: data.stats.cleanSheets ?? 0,
        lastRating: data.stats.lastRating ?? null,
        ratingSum: data.stats.ratingSum ?? 0
      };
    } else {
      gameState.playerStats = {
        games: 0,
        goals: 0,
        assists: 0,
        cleanSheets: 0,
        lastRating: null,
        ratingSum: 0
      };
    }

    if (data.injury) {
      gameState.injury = {
        isInjured: !!data.injury.isInjured,
        gamesToMiss: data.injury.gamesToMiss ?? 0
      };
    } else {
      gameState.injury = {
        isInjured: false,
        gamesToMiss: 0
      };
    }
    if (data.flags) {
      gameState.flags = {
        transferEventShown: !!data.flags.transferEventShown
      };
    } else {
      gameState.flags = {
        transferEventShown: false
      };
    }

    creationError.textContent = "";
    return true;
  } catch (e) {
    console.error("Erro ao carregar carreira:", e);
    creationError.textContent = "Ocorreu um erro ao carregar a carreira.";
    return false;
  }
}

function checkForSavedGame() {
  // Se existir save no storage, mostra botão de continuar carreira
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    continueCareerBtn.classList.remove("hidden");
  }
}

function newCareer() {
  // Limpa save atual e recarrega a página para recomeçar
  localStorage.removeItem(SAVE_KEY);
  window.location.reload();
}

function startNewSeason() {
  // Reinicia estatísticas e estado para uma nova época mantendo o jogador
  const p = gameState.player;
  if (!p) return;

  // próxima época
  gameState.seasonNumber = (gameState.seasonNumber ?? 1) + 1;

  // envelhecer jogador (máximo 40)
  if (typeof p.age === "number") {
    p.age = Math.min(p.age + 1, 40);
  }

  // reset época
  gameState.totalMatches = fixtures.length;
  gameState.wins = 0;
  gameState.draws = 0;
  gameState.losses = 0;
  gameState.points = 0;

  // reset stats da época
  gameState.playerStats = {
    games: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    lastRating: null,
    ratingSum: 0
  };

  // limpar lesões
  gameState.injury = {
    isInjured: false,
    gamesToMiss: 0
  };

  // reativar eventos narrativos para a nova época
  gameState.flags = {
    transferEventShown: false
  };

  // recuperar estado físico para início de época
  p.stamina = 80;
  p.morale = Math.max(p.morale, 60);
  p.form = Math.max(p.form, 55);
    // risco de lesão baixa um bocado com a pré-época e trabalho estruturado
  p.injuryRisk = Math.max(10, (p.injuryRisk ?? 25) - 15);

  clampPlayerStatus();
  clearStory();

  addStoryLine(
    `Uma nova época começa. Esta será a tua época ${gameState.seasonNumber} no futebol sénior.`,
    "system"
  );
  addStoryLine(
    "Depois da pré-época, sentes que tens mais responsabilidade e experiência.",
    "narrator"
  );

  updateStatus();
  saveGame();

  setChoices([
    {
      label: "Avançar para o primeiro jogo da nova época",
      onSelect: () => startPreMatch()
    }
  ]);
}

// ============================
// Fluxo: criação de jogador
// ============================

startGameBtn.addEventListener("click", () => {
  // Valida inputs de criação, aplica preset da posição e inicia a carreira
  const name = playerNameInput.value.trim();
  const positionKey = playerPositionSelect.value;
  const ageRaw = playerAgeInput.value.trim();
  const foot = playerFootSelect.value;
  const personality = playerPersonalitySelect.value;

  if (!name) {
    creationError.textContent = "Por favor, escreve o nome do jogador.";
    return;
  }
  if (!positionKey) {
    creationError.textContent = "Escolhe uma posição para o jogador.";
    return;
  }
  if (!foot) {
    creationError.textContent = "Escolhe o pé preferido.";
    return;
  }
  if (!personality) {
    creationError.textContent = "Escolhe um tipo de personalidade.";
    return;
  }

  let age = parseInt(ageRaw, 10);
  if (Number.isNaN(age)) {
    age = 17;
  }
  if (age < 14) age = 14;
  if (age > 40) age = 40;

  const preset = POSITION_PRESETS[positionKey];

  const baseAttributes = { ...preset.attributes };

  // Ajustes pela personalidade
  switch (personality) {
    case "Trabalhador silencioso":
      baseAttributes.Fisico = (baseAttributes.Fisico ?? 1) + 1;
      baseAttributes.Mental = (baseAttributes.Mental ?? 1) + 1;
      break;
    case "Líder calmo":
      baseAttributes.Mental = (baseAttributes.Mental ?? 1) + 2;
      baseAttributes.Social = (baseAttributes.Social ?? 1) + 1;
      break;
    case "Showman confiante":
      baseAttributes.Social = (baseAttributes.Social ?? 1) + 2;
      baseAttributes.Mental = (baseAttributes.Mental ?? 1) - 1;
      break;
  }

  // Garantir que nenhum atributo fica abaixo de 1
  for (const key in baseAttributes) {
    if (Object.prototype.hasOwnProperty.call(baseAttributes, key)) {
      if (baseAttributes[key] < 1) {
        baseAttributes[key] = 1;
      }
    }
  }

  gameState.player = {
    name,
    age,
    foot,
    personality,
    positionKey,
    positionLabel: preset.label,
    attributes: baseAttributes,
    stamina: 100,
    morale: 60,
    form: 50,
    injuryRisk: 25
  };

  gameState.seasonNumber = 1;

  // reset época
  gameState.totalMatches = fixtures.length;
  gameState.wins = 0;
  gameState.draws = 0;
  gameState.losses = 0;
  gameState.points = 0;

  gameState.playerStats = {
    games: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    lastRating: null,
    ratingSum: 0
  };

  gameState.injury = {
    isInjured: false,
    gamesToMiss: 0
  };

  gameState.flags = {
    transferEventShown: false
  };

  creationError.textContent = "";

  initGameUI();
  saveGame();
  startPreMatch();
});

continueCareerBtn.addEventListener("click", () => {
  // Carrega save existente e salta direto para o pré-jogo
  const ok = loadGame();
  if (!ok) return;
  initGameUI();
  startPreMatch();
});

// ============================
// Pré-jogo
// ============================

function startPreMatch() {
  // Configura novo jogo; se estiver lesionado, simula a partida automaticamente
  // se estiver lesionado e ainda tiver jogos para falhar, simula um jogo sem te meter em campo
  const inj = gameState.injury;
  if (inj && inj.isInjured && inj.gamesToMiss > 0) {
    handleInjuredMatch();
    return;
  }

  gameState.phase = "preMatch";
  gameState.minute = 0;
  gameState.scorePlayer = 0;
  gameState.scoreOpponent = 0;
  gameState.highlightIndex = 0;
  updateStatus();
  clearStory();

  const gamesPlayed = getGamesPlayed();
  const matchNumber = gamesPlayed + 1;
  const fixture = getCurrentFixture();

  if (matchNumber === 1) {
    addStoryLine(
      "É o início da tua carreira profissional. Hoje é o teu primeiro jogo oficial pelo clube.",
      "narrator"
    );
  } else {
    addStoryLine(
      `Estamos no jogo ${matchNumber} de ${gameState.totalMatches} desta época.`,
      "narrator"
    );
  }

  if (fixture) {
    addStoryLine(`O adversário de hoje é o ${fixture.name}.`, "narrator");
  }

  addStoryLine(
    "O treinador reúne a equipa no balneário antes do jogo. Olha para ti com um leve sorriso.",
    "narrator"
  );

  setChoices([
    {
      label: "Ouvir o discurso em silêncio, concentrado",
      onSelect: () => handlePreMatchChoice("silent")
    },
    {
      label: "Motivar os colegas com algumas palavras",
      onSelect: () => handlePreMatchChoice("motivate")
    },
    {
      label: "Fingir confiança, mas estás cheio de nervos",
      onSelect: () => handlePreMatchChoice("nervous")
    }
  ]);
}

function handleInjuredMatch() {
  // Simula resultado quando o jogador está lesionado e reduz contagem de jogos de fora
  gameState.phase = "postMatch";
  clearStory();

  const gamesPlayedBefore = getGamesPlayed();
  const matchNumber = gamesPlayedBefore + 1;
  const fixture = getCurrentFixture();
  const opponentName = fixture ? fixture.name : "o adversário";

  addStoryLine(
    `Estás a recuperar de uma lesão e ficas de fora do jogo ${matchNumber} contra o ${opponentName}.`,
    "narrator"
  );

  // Simular resultado do jogo sem o jogador
  const diff = fixture ? fixture.difficulty : 1;
  let winProb = 0.4 - 0.05 * diff;
  if (winProb < 0.2) winProb = 0.2;
  const drawProb = 0.3;
  const r = Math.random();

  let resultText;
  let goalsFor = 0;
  let goalsAgainst = 0;

  if (r < winProb) {
    goalsFor = 1;
    goalsAgainst = 0;
    gameState.wins += 1;
    gameState.points += 3;
    resultText = "Mesmo sem ti, a equipa consegue ganhar o jogo.";
    gameState.player.morale += 1;
  } else if (r < winProb + drawProb) {
    goalsFor = 1;
    goalsAgainst = 1;
    gameState.draws += 1;
    gameState.points += 1;
    resultText = "A equipa empata. Não é mau, mas gostavas de ter ajudado em campo.";
  } else {
    goalsFor = 0;
    goalsAgainst = 1;
    gameState.losses += 1;
    resultText = "A equipa perde o jogo, e ficas a sentir que podias ter feito a diferença.";
    gameState.player.morale -= 2;
    gameState.player.form -= 1;
  }

  gameState.minute = 90;
  gameState.scorePlayer = goalsFor;
  gameState.scoreOpponent = goalsAgainst;

  // reduzir jogos de fora
  if (gameState.injury) {
    gameState.injury.gamesToMiss -= 1;
    if (gameState.injury.gamesToMiss <= 0) {
      gameState.injury.isInjured = false;
      gameState.injury.gamesToMiss = 0;
      addStoryLine(
        "Boas notícias do departamento médico: estás novamente apto para competir no próximo jogo.",
        "system"
      );
    }
  }

  clampPlayerStatus();
  updateStatus();
  saveGame();

  addStoryLine(resultText, "system");

  const gamesPlayedAfter = getGamesPlayed();
  const isSeasonOver = gamesPlayedAfter >= gameState.totalMatches;

  if (isSeasonOver) {
    endSeason();
  } else {
    setChoices([
      {
        label: "Gerir dias entre jogos",
        onSelect: () => betweenMatches()
      },
      {
        label: "Voltar ao início (nova personagem)",
        secondary: true,
        onSelect: () => newCareer()
      }
    ]);
  }
}

function handlePreMatchChoice(option) {
  // Resolve impacto das escolhas de balneário antes de começar o jogo
  const p = gameState.player;
  const pers = p.personality || "";

  if (option === "silent") {
    addStoryLine(
      "Ficas em silêncio, a ouvir cada palavra do treinador. Queres mostrar em campo o que vales.",
      "player"
    );
    p.morale += 5;
    p.form += 2;

    if (pers === "Trabalhador silencioso") {
      addStoryLine(
        "Este silêncio encaixa com a tua forma de ser: deixas o trabalho falar por ti.",
        "narrator"
      );
      p.form += 1;
    } else if (pers === "Showman confiante") {
      addStoryLine(
        "Conténs-te mais do que é natural para ti. Quase te apetece dizer algo para aliviar a tensão.",
        "narrator"
      );
      p.morale -= 1;
    }
  } else if (option === "motivate") {
    addStoryLine(
      "Levantas-te e dizes a toda a equipa que este é só o início, que vão surpreender o campeonato.",
      "player"
    );

    const social = p.attributes.Social ?? 1;
    let baseSocial = social;

    if (pers === "Showman confiante") {
      baseSocial += 1; // mais à vontade a falar
    } else if (pers === "Trabalhador silencioso") {
      baseSocial -= 1; // menos confortável a discursar
    }

    const result = rollSkill(baseSocial, 8);
    if (result.outcome === "greatSuccess" || result.outcome === "success") {
      addStoryLine(
        "O balneário explode em gritos de motivação. O treinador parece satisfeito.",
        "narrator"
      );
      p.morale += 10;
      p.form += 4;

      if (pers === "Líder calmo") {
        addStoryLine(
          "Os colegas olham para ti como alguém que mantém a calma mesmo nos grandes momentos.",
          "narrator"
        );
        p.morale += 2;
      }
    } else {
      addStoryLine(
        "Alguns colegas sorriem, mas o discurso sai meio forçado. Nada de grave, mas também não inspirou muito.",
        "narrator"
      );
      p.morale += 1;

      if (pers === "Showman confiante") {
        addStoryLine(
          "Ficas a pensar que, desta vez, as palavras não soaram tão naturais como costumas sentir.",
          "narrator"
        );
        p.form -= 1;
      }
    }
  } else if (option === "nervous") {
    addStoryLine(
      "Tentras brincar e fazer piadas, mas por dentro estás cheio de nervos. Só queres que o jogo comece.",
      "player"
    );
    p.morale -= 3;
    p.form -= 2;

    if (pers === "Líder calmo") {
      addStoryLine(
        "Apesar dos nervos, a tua natureza mais calma ajuda-te a não entrar em pânico.",
        "narrator"
      );
      p.morale += 2;
    } else if (pers === "Trabalhador silencioso") {
      addStoryLine(
        "Sabes que, quando a bola rolar, o foco no trabalho em campo vai acabar por falar mais alto.",
        "narrator"
      );
      p.form += 1;
    }
  }

  clampPlayerStatus();
  updateStatus();
  startMatch();
}

// ============================
// Jogo: destaques
// ============================

function startMatch() {
  // Marca início do jogo e avança para o primeiro destaque
  gameState.phase = "matchHighlight";
  gameState.highlightIndex = 0;
  gameState.minute = 5;
  gameState.currentRating = 6; // nota base no início do jogo
  updateStatus();

  addStoryLine(
    "Entram em campo. As bancadas não estão cheias, mas ouve-se claramente o teu nome vindo de alguns adeptos.",
    "narrator"
  );
  proceedHighlight();
}

function proceedHighlight() {
  // Mostra o destaque atual (3 por jogo) e apresenta escolhas conforme posição
  const p = gameState.player;
  const index = gameState.highlightIndex;

  choicesContainer.innerHTML = "";

  if (index === 0) {
    gameState.minute = 18;
    updateStatus();
    addStoryLine(
      "Minuto 18. A bola vem longa do guarda-redes, o teu médio ganha de cabeça e a bola sobra para ti com espaço.",
      "narrator"
    );

    if (p.positionKey === "Forward") {
      setChoices([
        {
          label: "Atacar o defesa em corrida e tentar o drible",
          onSelect: () => handleHighlight0("drible")
        },
        {
          label: "Segurar a bola e esperar apoio",
          onSelect: () => handleHighlight0("hold")
        }
      ]);
    } else if (p.positionKey === "Midfielder") {
      setChoices([
        {
          label: "Virar o jogo para o flanco oposto",
          onSelect: () => handleHighlight0("switch")
        },
        {
          label: "Arriscar passe em profundidade",
          onSelect: () => handleHighlight0("through")
        }
      ]);
    } else if (p.positionKey === "Defender") {
      addStoryLine(
        "O adversário lança um contra-ataque rápido. És o último defesa entre o avançado e a baliza.",
        "narrator"
      );
      setChoices([
        {
          label: "Sair ao portador da bola e tentar o desarme",
          onSelect: () => handleHighlight0("tackle")
        },
        {
          label: "Recuar e tentar ganhar tempo até a equipa fechar",
          onSelect: () => handleHighlight0("delay")
        }
      ]);
    } else if (p.positionKey === "Goalkeeper") {
      addStoryLine(
        "O adversário foge em velocidade pela esquerda e cruza tenso para a área.",
        "narrator"
      );
      setChoices([
        {
          label: "Sair dos postes e tentar agarrar o cruzamento",
          onSelect: () => handleHighlight0("claim")
        },
        {
          label: "Ficar na linha e reagir ao cabeceamento",
          onSelect: () => handleHighlight0("stay")
        }
      ]);
    }
  } else if (index === 1) {
    gameState.minute = 55;
    updateStatus();
    addStoryLine(
      "Minuto 55. O jogo está equilibrado, mas as pernas começam a pesar.",
      "narrator"
    );
    setChoices([
      {
        label: "Pedir bola e assumir o protagonismo",
        onSelect: () => handleHighlight1("takeLead")
      },
      {
        label: "Jogar simples e seguro",
        onSelect: () => handleHighlight1("playSafe")
      }
    ]);
  } else if (index === 2) {
    gameState.minute = 82;
    updateStatus();
    addStoryLine(
      "Minuto 82. O resultado continua aberto. O treinador olha para o banco e depois para ti.",
      "narrator"
    );
    setChoices([
      {
        label: "Dar tudo num último sprint/jogada",
        onSelect: () => handleHighlight2("allIn")
      },
      {
        label: "Gerir esforço e não arriscar lesão",
        onSelect: () => handleHighlight2("conserve")
      }
    ]);
  } else {
    endMatch();
  }
}

function handleHighlight0(action) {
  // Resolve primeiro destaque (minuto ~18), contextualizado pela posição
  const p = gameState.player;
  const att = p.attributes;

  if (p.positionKey === "Forward") {
    if (action === "drible") {
      addStoryLine(
        "Baixas o centro de gravidade e levas a bola em direção ao defesa.",
        "player"
      );
      const result = rollSkill(att.Tecnica + 1, 9);
      resolveAttackResult(result);
    } else {
      addStoryLine(
        "Seguras a bola, esperas aproximação dos colegas e tentas uma tabela.",
        "player"
      );
      const result = rollSkill(att.Tactica + 1, 8);
      resolveBuildUpResult(result);
    }
  } else if (p.positionKey === "Midfielder") {
    if (action === "switch") {
      addStoryLine(
        "Levantas a cabeça e tentas mudar o flanco com um passe longo.",
        "player"
      );
      const result = rollSkill(att.Tecnica + att.Tactica, 10);
      resolveSwitchPlay(result);
    } else {
      addStoryLine(
        "Vês uma linha de passe em profundidade nas costas da defesa.",
        "player"
      );
      const result = rollSkill(att.Tecnica + 1, 11);
      resolveThroughBall(result);
    }
  } else if (p.positionKey === "Defender") {
    if (action === "tackle") {
      addStoryLine(
        "Aceleras para o avançado e tentas o desarme no momento certo.",
        "player"
      );
      const result = rollSkill(att.Fisico + att.Tactica, 11);
      resolveDefensiveDuel(result);
    } else {
      addStoryLine(
        "Recuas, manténs a posição e tentas obrigar o avançado a decidir cedo.",
        "player"
      );
      const result = rollSkill(att.Tactica + 1, 9);
      resolveDelay(result);
    }
  } else if (p.positionKey === "Goalkeeper") {
    if (action === "claim") {
      addStoryLine(
        "Dás dois passos à frente, saltas e tentas agarrar o cruzamento no ar.",
        "player"
      );
      const result = rollSkill(att.Mental + att.Tecnica, 11);
      resolveCrossClaim(result);
    } else {
      addStoryLine(
        "Manténs-te na linha, focado na bola e no avançado que ataca o primeiro poste.",
        "player"
      );
      const result = rollSkill(att.Mental + 1, 9);
      resolveShotReaction(result);
    }
  }

  clampPlayerStatus();
  updateStatus();

  gameState.highlightIndex++;
  proceedHighlight();
}

function handleHighlight1(action) {
  // Resolve segundo destaque (minuto ~55), focado em assumir ou jogar simples
  const p = gameState.player;
  const att = p.attributes;

  if (action === "takeLead") {
    addStoryLine(
      "Pedes bola com confiança, queres ser tu a fazer a diferença.",
      "player"
    );
    const base = att.Tecnica + Math.floor(p.form / 30);
    const result = rollSkill(base, 11);
    applyRatingFromOutcome(result.outcome);

    if (result.outcome === "greatSuccess") {
      addStoryLine(
        "Recebes, driblas um adversário e finalizas para golo. A equipa sente que pode ganhar.",
        "narrator"
      );
      gameState.scorePlayer++;
      gameState.playerStats.goals += 1;
      p.morale += 8;
      p.form += 6;
    } else if (result.outcome === "success") {
      addStoryLine(
        "Consegues levar perigo e obrigas o guarda-redes a uma boa defesa. Os adeptos aplaudem.",
        "narrator"
      );
      p.morale += 4;
      p.form += 3;
    } else if (result.outcome === "fail") {
      addStoryLine(
        "Perdes a bola na tentativa de jogada individual. Nada de dramático, mas o treinador reclama.",
        "narrator"
      );
      p.morale -= 4;
      p.form -= 3;
    } else {
      addStoryLine(
        "Tentativa muito forçada. Perdes a bola num sítio perigoso e quase sofrem golo no contra-ataque.",
        "narrator"
      );
      p.morale -= 8;
      p.form -= 6;
    }
  } else {
    addStoryLine(
      "Decides jogar simples, sem inventar. Toque curto, apoios e circulação de bola.",
      "player"
    );
    const base = att.Tactica + 1;
    const result = rollSkill(base, 8);
    applyRatingFromOutcome(result.outcome);

    if (result.outcome === "greatSuccess" || result.outcome === "success") {
      addStoryLine(
        "A equipa ganha controlo do jogo. Não criam uma oportunidade clara, mas mandam no ritmo.",
        "narrator"
      );
      p.morale += 3;
      p.form += 2;
    } else {
      addStoryLine(
        "Mesmo a jogar simples, a equipa parece desligada. Passes falhados e pouca confiança.",
        "narrator"
      );
      p.morale -= 2;
      p.form -= 1;
    }
  }

  clampPlayerStatus();
  updateStatus();

  gameState.highlightIndex++;
  proceedHighlight();
}

function handleHighlight2(action) {
  // Resolve terceiro destaque (minuto ~82), decidindo entre arriscar tudo ou gerir esforço
  const p = gameState.player;
  const att = p.attributes;

  if (action === "allIn") {
    addStoryLine(
      "Decides dar tudo o que resta nas pernas. Um último sprint, uma última jogada.",
      "player"
    );
    p.stamina -= 15;
    const base = att.Fisico + att.Mental;
    const result = rollSkill(base, 11);
    applyRatingFromOutcome(result.outcome);

    if (result.outcome === "greatSuccess") {
      addStoryLine(
        "Rompes a defesa, crias a jogada decisiva e a bola acaba no fundo das redes!",
        "narrator"
      );
      gameState.scorePlayer++;
      gameState.playerStats.goals += 1;
      p.morale += 10;
      p.form += 8;
    } else if (result.outcome === "success") {
      addStoryLine(
        "Ganhas espaço e consegues um remate perigoso, mas o guarda-redes defende. Mesmo assim, mostras personalidade.",
        "narrator"
      );
      p.morale += 5;
      p.form += 4;
    } else if (result.outcome === "fail") {
      addStoryLine(
        "O corpo já não responde como querias. Perdes a bola e ficas a arfar no relvado.",
        "narrator"
      );
      p.morale -= 5;
      p.form -= 5;
    } else {
      addStoryLine(
        "Sentes uma fisgada na perna a meio do sprint e tens de abrandar. Parece uma lesão mais séria.",
        "narrator"
      );
      p.morale -= 10;
      p.form -= 10;

      const risk = Math.max(0, Math.min(100, p.injuryRisk ?? 25));

      let extraGames = 0;
      if (risk >= 70) {
        extraGames = 2;
      } else if (risk >= 40) {
        extraGames = 1;
      }

      let gamesOut = 1 + Math.floor(Math.random() * 3) + extraGames; // base 1–3 + extra
      if (gamesOut > 5) gamesOut = 5;

      gameState.injury.isInjured = true;
      gameState.injury.gamesToMiss = gamesOut;

      // depois da lesão, o risco desce um pouco (mais cuidado e trabalho de prevenção)
      p.injuryRisk = Math.max(10, risk - 20);

      addStoryLine(
        `O departamento médico indica que vais falhar aproximadamente ${gamesOut} jogo(s).`,
        "system"
      );
    }
  } else {
    addStoryLine(
      "Decides gerir esforço, escolhendo bem os momentos em que corres e intervéns.",
      "player"
    );
    const result = rollSkill(att.Tactica + 1, 9);
    applyRatingFromOutcome(result.outcome);

    if (result.outcome === "greatSuccess" || result.outcome === "success") {
      addStoryLine(
        "Com inteligência, evitas riscos desnecessários e ajudas a equipa a segurar o resultado.",
        "narrator"
      );
      p.morale += 2;
      p.form += 1;
    } else {
      addStoryLine(
        "Talvez tenhas jogado demasiado pelo seguro. O treinador queria ver mais iniciativa.",
        "narrator"
      );
      p.morale -= 2;
    }
  }

  clampPlayerStatus();
  updateStatus();

  gameState.highlightIndex++;
  proceedHighlight();
}

// ============================
// Resolução de lances auxiliares
// ============================

function resolveAttackResult(result) {
  // Interpretar roll do avançado quando tenta drible final
  const p = gameState.player;
  applyRatingFromOutcome(result.outcome);

  if (result.outcome === "greatSuccess") {
    addStoryLine(
      "Passas pelo defesa com facilidade e entras na área com muito perigo!",
      "narrator"
    );
    gameState.scorePlayer++;
    gameState.playerStats.goals += 1;
    p.morale += 6;
    p.form += 4;
  } else if (result.outcome === "success") {
    addStoryLine(
      "Consegues passar pelo defesa, mas o ângulo fica apertado e o remate sai à figura do guarda-redes.",
      "narrator"
    );
    p.morale += 3;
    p.form += 2;
  } else if (result.outcome === "fail") {
    addStoryLine(
      "Tentas o drible, mas a bola fica presa no pé do defesa. A jogada perde-se.",
      "narrator"
    );
    p.morale -= 2;
  } else {
    addStoryLine(
      "O defesa rouba-te a bola com um carrinho perfeito. Ficas frustrado.",
      "narrator"
    );
    p.morale -= 5;
    p.form -= 3;
  }

  clampPlayerStatus();
  updateStatus();
}

function resolveBuildUpResult(result) {
  // Interpretar roll de segurar/jogar simples no primeiro destaque
  const p = gameState.player;
  applyRatingFromOutcome(result.outcome);
  if (result.outcome === "greatSuccess" || result.outcome === "success") {
    addStoryLine(
      "Jogas simples, a equipa aproxima-se e criam uma jogada coletiva de qualidade.",
      "narrator"
    );
    p.morale += 4;
    p.form += 2;
  } else {
    addStoryLine(
      "Seguras demasiado a bola e acabas encurralado. O lance perde força.",
      "narrator"
    );
    p.morale -= 2;
  }
  clampPlayerStatus();
  updateStatus();
}

function resolveSwitchPlay(result) {
  // Interpreta o passe longo do médio para mudar flanco
  const p = gameState.player;
  applyRatingFromOutcome(result.outcome);

  if (result.outcome === "greatSuccess") {
    addStoryLine(
      "O passe longo sai perfeito, encontra o extremo em ótima posição.",
      "narrator"
    );
    p.morale += 5;
    p.form += 4;
  } else if (result.outcome === "success") {
    addStoryLine(
      "Consegues mudar o flanco, mas a receção é um pouco apertada. Ainda assim, bom lance.",
      "narrator"
    );
    p.morale += 3;
  } else {
    addStoryLine(
      "O passe sai demasiado tenso e vai para fora. O treinador abana a cabeça.",
      "narrator"
    );
    p.morale -= 3;
  }
  clampPlayerStatus();
  updateStatus();
}

function resolveThroughBall(result) {
  // Interpreta tentativa de passe em profundidade do médio
  const p = gameState.player;
  applyRatingFromOutcome(result.outcome);

  if (result.outcome === "greatSuccess") {
    addStoryLine(
      "Passe perfeito nas costas da defesa, isolando o avançado, que não perdoa!",
      "narrator"
    );
    gameState.scorePlayer++;
    gameState.playerStats.assists += 1;
    p.morale += 6;
    p.form += 4;
  } else if (result.outcome === "success") {
    addStoryLine(
      "Passe em profundidade com boa intenção, mas o avançado chega um pouco tarde.",
      "narrator"
    );
    p.morale += 2;
  } else {
    addStoryLine(
      "O passe é forte demais e vai direto para o guarda-redes.",
      "narrator"
    );
    p.morale -= 2;
  }
  clampPlayerStatus();
  updateStatus();
}

function resolveDefensiveDuel(result) {
  // Interpreta desarme direto do defesa no 1º destaque
  const p = gameState.player;
  applyRatingFromOutcome(result.outcome);

  if (result.outcome === "greatSuccess") {
    addStoryLine(
      "Desarme limpo e firme. O avançado cai, mas levas a bola contigo. Os adeptos aplaudem.",
      "narrator"
    );
    p.morale += 6;
    p.form += 4;
  } else if (result.outcome === "success") {
    addStoryLine(
      "Consegues travar o avançado, mesmo que a bola ainda fique jogável.",
      "narrator"
    );
    p.morale += 3;
  } else if (result.outcome === "fail") {
    addStoryLine(
      "Falhas o tempo do carrinho, mas consegues atrapalhar o suficiente para o remate sair fraco.",
      "narrator"
    );
    p.morale -= 2;
  } else {
    addStoryLine(
      "Chegas atrasado, fazes falta perigosa à entrada da área. Levas amarelo.",
      "narrator"
    );
    gameState.scoreOpponent++;
    p.morale -= 6;
    p.form -= 4;
  }
  clampPlayerStatus();
  updateStatus();
}

function resolveDelay(result) {
  // Interpreta decisão do defesa de temporizar/fechar espaço
  const p = gameState.player;
  applyRatingFromOutcome(result.outcome);

  if (result.outcome === "greatSuccess" || result.outcome === "success") {
    addStoryLine(
      "Recuas bem, fechas a linha de passe e ganhas tempo para a equipa recuperar.",
      "narrator"
    );
    p.morale += 3;
  } else {
    addStoryLine(
      "Dás demasiado espaço e o adversário ganha um remate perigoso.",
      "narrator"
    );
    gameState.scoreOpponent++;
    p.morale -= 4;
  }
  clampPlayerStatus();
  updateStatus();
}

function resolveCrossClaim(result) {
  // Interpreta saída do GR a um cruzamento tenso
  const p = gameState.player;
  applyRatingFromOutcome(result.outcome);

  if (result.outcome === "greatSuccess") {
    addStoryLine(
      "Sais no tempo certo, saltas no meio de todos e agarras a bola em segurança.",
      "narrator"
    );
    p.morale += 6;
    p.form += 4;
  } else if (result.outcome === "success") {
    addStoryLine(
      "Consegues tocar na bola e afastar o perigo, mesmo que não seja bonito.",
      "narrator"
    );
    p.morale += 3;
  } else if (result.outcome === "fail") {
    addStoryLine(
      "Sais um pouco tarde e acabas por chocar com um colega, mas a bola sai pela linha lateral.",
      "narrator"
    );
    p.morale -= 2;
  } else {
    addStoryLine(
      "Calculas mal o voo da bola, ficas a meio caminho e o avançado cabeceia para golo.",
      "narrator"
    );
    gameState.scoreOpponent++;
    p.morale -= 7;
    p.form -= 5;
  }
  clampPlayerStatus();
  updateStatus();
}

function resolveShotReaction(result) {
  // Interpreta reação do GR a remate/cabeceamento dentro da área
  const p = gameState.player;
  applyRatingFromOutcome(result.outcome);

  if (result.outcome === "greatSuccess") {
    addStoryLine(
      "Reflexo incrível! Defendes à queima-roupa e salvas a equipa.",
      "narrator"
    );
    p.morale += 7;
    p.form += 5;
  } else if (result.outcome === "success") {
    addStoryLine(
      "Boa defesa. Seguras a bola e acalmas o jogo.",
      "narrator"
    );
    p.morale += 4;
  } else if (result.outcome === "fail") {
    addStoryLine(
      "Tocas na bola, mas não o suficiente. Ela ainda bate no poste antes de sair.",
      "narrator"
    );
    p.morale -= 2;
  } else {
    addStoryLine(
      "Sem reação possível. O cabeceamento é forte e colocado, e a bola entra.",
      "narrator"
    );
    gameState.scoreOpponent++;
    p.morale -= 6;
    p.form -= 4;
  }
  clampPlayerStatus();
  updateStatus();
}

// ============================
// Fim do jogo + entrevista + entre jogos
// ============================

function endMatch() {
  // Fecha o jogo, aplica impacto no resultado, calcula nota final e inicia pós-jogo
  gameState.phase = "postMatch";
  gameState.minute = 90;

  const p = gameState.player;
  let resultText;

  if (gameState.scorePlayer > gameState.scoreOpponent) {
    resultText = "Vitória neste jogo!";
    p.form += 6;
    p.morale += 8;
    gameState.wins += 1;
    gameState.points += 3;
  } else if (gameState.scorePlayer < gameState.scoreOpponent) {
    resultText = "Derrota dura, mas faz parte da aprendizagem.";
    p.form -= 4;
    p.morale -= 6;
    gameState.losses += 1;
  } else {
    resultText = "Empate. Não é mau, mas queres mais.";
    p.form += 1;
    p.morale += 1;
    gameState.draws += 1;
    gameState.points += 1;
  }

  // ajustar nota pela influência do resultado
  if (gameState.currentRating == null) {
    gameState.currentRating = 6;
  }
  if (gameState.scorePlayer > gameState.scoreOpponent) {
    applyRatingChange(0.5);
  } else if (gameState.scorePlayer < gameState.scoreOpponent) {
    applyRatingChange(-0.5);
  }

  // nota final do jogo (1 casa decimal)
  const clampedRating = Math.max(1, Math.min(10, gameState.currentRating));
  const finalRating = Math.round(clampedRating * 10) / 10;
  gameState.playerStats.lastRating = finalRating;

  // acumular soma de notas para média
  gameState.playerStats.ratingSum += finalRating;

  // evolução de atributos com base na nota
  const improvedAttrs = applyAttributeGrowth(finalRating);

  // atualizar estatísticas de jogos e balizas invioladas
  gameState.playerStats.games += 1;
  if (
    gameState.player.positionKey === "Goalkeeper" &&
    gameState.scoreOpponent === 0
  ) {
    gameState.playerStats.cleanSheets += 1;
  }

  clampPlayerStatus();
  updateStatus();
  saveGame();

  addStoryLine(`A tua nota neste jogo foi ${finalRating.toFixed(1)}.`, "system");

  if (improvedAttrs && improvedAttrs.length > 0) {
    const lista = improvedAttrs.join(", ");
    addStoryLine(
      `À medida que os jogos passam, sentes-te a evoluir em: ${lista}.`,
      "system"
    );
  }

  addStoryLine("O árbitro apita para o final do jogo.", "narrator");
  addStoryLine(resultText, "narrator");

  const gamesPlayed = getGamesPlayed();
  const isSeasonOver = gamesPlayed >= gameState.totalMatches;

  if (isSeasonOver) {
    endSeason();
  } else {
    postMatchPress();
  }
}

function postMatchPress() {
  // Apresenta entrevista pós-jogo com 3 estilos de resposta
  const gamesPlayed = getGamesPlayed();
  const remaining = Math.max(gameState.totalMatches - gamesPlayed, 0);

  addStoryLine(
    `Já levas ${gamesPlayed} jogos nesta época. Faltam ${remaining} jogos.`,
    "system"
  );

  addStoryLine(
    "Depois do jogo, um repórter aproxima-se de ti na zona mista com o microfone na mão.",
    "narrator"
  );
  addStoryLine(
    "Ele pergunta o que achaste da tua exibição e do resultado.",
    "narrator"
  );

  setChoices([
    {
      label: "Ser humilde e elogiar a equipa",
      onSelect: () => handlePressChoice("humble")
    },
    {
      label: "Ser confiante e destacar o teu desempenho",
      onSelect: () => handlePressChoice("confident")
    },
    {
      label: "Culpar fatores externos (árbitro, relvado, sorte)",
      onSelect: () => handlePressChoice("blame")
    }
  ]);
}

function handlePressChoice(option) {
  // Resolve consequências narrativas e estatísticas da resposta escolhida na entrevista
  const p = gameState.player;
  const att = p.attributes;
  const social = att.Social !== undefined ? att.Social : 1;
  const mental = att.Mental !== undefined ? att.Mental : 1;
  const pers = p.personality || "";

  if (option === "humble") {
    addStoryLine(
      "Dizes que o mérito é da equipa e da forma como trabalharam juntos.",
      "player"
    );
    let base = social + mental;
    if (pers === "Trabalhador silencioso") {
      base += 1; // este tipo de resposta é natural para ti
    }

    const result = rollSkill(base, 8);
    if (result.outcome === "greatSuccess" || result.outcome === "success") {
      addStoryLine(
        "A imprensa gosta da tua postura. Ganhas respeito no balneário e entre os adeptos.",
        "narrator"
      );
      p.morale += 4;
      p.form += 2;

      if (pers === "Líder calmo") {
        addStoryLine(
          "A tua calma ao responder reforça a imagem de líder discreto da equipa.",
          "narrator"
        );
        p.morale += 2;
      }
    } else {
      addStoryLine(
        "A resposta passa um pouco ao lado, mas pelo menos não crias polémicas.",
        "narrator"
      );
      p.morale += 1;
    }
  } else if (option === "confident") {
    addStoryLine(
      "Assumes que estiveste bem e que és capaz de decidir jogos.",
      "player"
    );

    let base = social + mental;
    if (pers === "Showman confiante") {
      base += 1; // confortável a assumir esse papel
    } else if (pers === "Trabalhador silencioso") {
      base -= 1; // não é a praia deste perfil
    }

    const result = rollSkill(base, 10);
    if (result.outcome === "greatSuccess") {
      addStoryLine(
        "As declarações soam a confiança e ambição saudável. A opinião pública fica curiosa contigo.",
        "narrator"
      );
      p.morale += 6;
      p.form += 3;
    } else if (result.outcome === "success") {
      addStoryLine(
        "As tuas palavras passam como confiança normal de jogador competitivo.",
        "narrator"
      );
      p.morale += 3;
    } else if (result.outcome === "fail") {
      addStoryLine(
        "Alguns comentadores dizem que talvez estejas a falar demais para quem ainda provou pouco.",
        "narrator"
      );
      p.morale -= 2;
      if (pers === "Showman confiante") {
        addStoryLine(
          "Mesmo assim, no fundo acreditas que faz parte da tua maneira de ser falar alto.",
          "narrator"
        );
      }
    } else {
      addStoryLine(
        "As tuas palavras caem mal. Manchetes falam em arrogância e ego.",
        "narrator"
      );
      p.morale -= 5;
      p.form -= 3;
    }
  } else if (option === "blame") {
    addStoryLine(
      "Apontas o dedo ao árbitro, ao relvado e à falta de sorte.",
      "player"
    );

    let base = mental;
    if (pers === "Líder calmo") {
      base -= 1; // não combina muito com o teu perfil
    }

    const result = rollSkill(base, 9);
    if (result.outcome === "greatSuccess") {
      addStoryLine(
        "Consegues explicar-te sem atacar ninguém diretamente. Alguns adeptos até concordam contigo.",
        "narrator"
      );
      p.morale += 2;
    } else if (result.outcome === "success") {
      addStoryLine(
        "As declarações passam, mas o treinador não fica especialmente contente.",
        "narrator"
      );
      p.morale -= 1;
    } else {
      addStoryLine(
        "As declarações geram polémica. Parece que arranjaste problemas desnecessários.",
        "narrator"
      );
      p.morale -= 4;
      p.form -= 2;
      if (pers === "Trabalhador silencioso") {
        addStoryLine(
          "Não te sentes confortável com a confusão criada. Preferias ter ficado calado.",
          "narrator"
        );
        p.morale -= 1;
      }
    }
  }

  clampPlayerStatus();
  updateStatus();
  saveGame();

  addStoryLine(
    "A entrevista termina e vais para o balneário pensar no que vem a seguir.",
    "system"
  );

  setChoices([
    {
      label: "Gerir dias entre jogos",
      onSelect: () => betweenMatches()
    },
    {
      label: "Voltar ao início (nova personagem)",
      secondary: true,
      onSelect: () => newCareer()
    }
  ]);
}

function betweenMatches() {
  // Menu intermédio entre jogos: reabilitação se lesionado ou eventos de treino/transferência
  gameState.phase = "betweenMatches";
  clearStory();

  const gamesPlayed = getGamesPlayed();
  const nextMatchNumber = gamesPlayed + 1;
  const inj = gameState.injury;

  // Se estiver lesionado, mostrar menu de reabilitação
  if (inj && inj.isInjured && inj.gamesToMiss > 0) {
    addStoryLine(
      `Entre o jogo ${gamesPlayed} e o jogo ${nextMatchNumber}, o foco é a tua recuperação física.`,
      "narrator"
    );
    addStoryLine(
      "Os médicos e fisioterapeutas apresentam-te diferentes opções de reabilitação.",
      "narrator"
    );

    setChoices([
      {
        label: "Reabilitação intensiva (tentar voltar mais rápido, mas exigente)",
        onSelect: () => chooseRehab("intense")
      },
      {
        label: "Reabilitação equilibrada (progresso estável)",
        onSelect: () => chooseRehab("balanced")
      },
      {
        label: "Descanso total (priorizar bem-estar mental)",
        onSelect: () => chooseRehab("rest")
      }
    ]);
  } else {
    // jogador apto: podemos ter evento de interesse de outros clubes
    maybeTriggerTransferEvent();
  }
}

function chooseBetweenMatches(option) {
  // Aplica efeitos dos 3 tipos de treino/descanso entre jogos
  const p = gameState.player;
  const att = p.attributes;

  if (option === "physical") {
    addStoryLine(
      "Passas os dias focado em trabalho físico: corrida, ginásio, explosão.",
      "player"
    );
    att.Fisico += 1;
    p.stamina -= 10;
    p.morale += 1;
    p.injuryRisk += 8; // carga física aumenta risco
  } else if (option === "technical") {
    addStoryLine(
      "Dedicas-te a treinar técnica: receção, passe, remate, jogadas combinadas.",
      "player"
    );
    att.Tecnica += 1;
    p.stamina -= 10;
    p.form += 2;
    p.injuryRisk += 4; // carga moderada
  } else if (option === "rest") {
    addStoryLine(
      "Aproveitas para descansar o corpo e a cabeça, dormir bem e desligar um pouco.",
      "player"
    );
    p.stamina += 20;
    p.morale += 3;
    p.injuryRisk -= 10; // descanso reduz risco
  }

  clampPlayerStatus();
  updateStatus();
  saveGame();

  addStoryLine(
    "Depois destes dias, aproximam-se as horas do próximo jogo.",
    "system"
  );

  setChoices([
    {
      label: "Seguir para o próximo jogo",
      onSelect: () => startPreMatch()
    },
    {
      label: "Voltar ao início (nova personagem)",
      secondary: true,
      onSelect: () => newCareer()
    }
  ]);
}

function showBetweenMatchesTrainingMenu() {
  // Mostra escolhas de treino/descanso quando o jogador está apto
  const gamesPlayed = getGamesPlayed();
  const nextMatchNumber = gamesPlayed + 1;

  addStoryLine(
    `Entre o fim do jogo ${gamesPlayed} e o início do jogo ${nextMatchNumber}, tens alguns dias para te preparar.`,
    "narrator"
  );
  addStoryLine("Como queres aproveitar este período?", "narrator");

  setChoices([
    {
      label: "Treinar físico (mais força e resistência)",
      onSelect: () => chooseBetweenMatches("physical")
    },
    {
      label: "Treinar técnica (toque de bola e criatividade)",
      onSelect: () => chooseBetweenMatches("technical")
    },
    {
      label: "Descansar e recuperar",
      onSelect: () => chooseBetweenMatches("rest")
    }
  ]);
}

function maybeTriggerTransferEvent() {
  // Verifica se a época está boa o suficiente para disparar um evento de interesse de outros clubes
  const p = gameState.player;
  const s = gameState.playerStats;
  const flags = gameState.flags || {};
  const avg = getAverageRating();
  const gamesPlayed = getGamesPlayed();

  // já mostrámos este evento nesta carreira
  if (flags.transferEventShown) {
    showBetweenMatchesTrainingMenu();
    return;
  }

  // verificar se a época está a correr suficientemente bem
  let goodSeason = false;
  if (avg !== null && avg >= 7.5) {
    goodSeason = true;
  }

  if (p.positionKey === "Forward" && s.goals >= 3) {
    goodSeason = true;
  } else if (p.positionKey === "Midfielder" && s.assists >= 3) {
    goodSeason = true;
  } else if (p.positionKey === "Goalkeeper" && s.cleanSheets >= 2) {
    goodSeason = true;
  } else if (p.positionKey === "Defender" && p.form >= 65) {
    goodSeason = true;
  }

  // precisa de pelo menos alguns jogos para fazer sentido
  if (!goodSeason || gamesPlayed < 2) {
    showBetweenMatchesTrainingMenu();
    return;
  }

  // marcar como já mostrado
  gameState.flags.transferEventShown = true;

  addStoryLine(
    "As tuas exibições começam a chamar a atenção fora do clube.",
    "narrator"
  );
  addStoryLine(
    "O teu agente liga-te e fala em possíveis oportunidades para a próxima época.",
    "narrator"
  );

  setChoices([
    {
      label: "Focar-te totalmente no clube atual",
      onSelect: () => resolveTransferChoice("loyal")
    },
    {
      label: "Pedir ao agente para explorar clubes maiores",
      onSelect: () => resolveTransferChoice("ambitious")
    }
  ]);
}

function resolveTransferChoice(option) {
  // Ajusta moral/forma/atributos consoante a abordagem ao interesse de transferências
  const p = gameState.player;
  const att = p.attributes;

  if (option === "loyal") {
    addStoryLine(
      "Dizes ao agente que, por agora, o foco é respeitar o clube que apostou em ti.",
      "player"
    );
    p.morale += 4;
    att.Mental = (att.Mental ?? 1) + 1;
  } else if (option === "ambitious") {
    addStoryLine(
      "Dizes ao agente que, se surgir um salto na carreira, estás disponível para ouvir propostas.",
      "player"
    );
    p.form += 3;
    p.morale -= 1;
    att.Social = (att.Social ?? 1) + 1;
  }

  clampPlayerStatus();
  updateStatus();
  saveGame();

  addStoryLine(
    "Independentemente dos rumores, tens agora alguns dias para te preparares para o próximo jogo.",
    "system"
  );

  showBetweenMatchesTrainingMenu();
}

function chooseRehab(option) {
  // Lida com as 3 abordagens de recuperação quando o jogador está lesionado
  const p = gameState.player;
  const inj = gameState.injury;

  if (!inj || !inj.isInjured || inj.gamesToMiss <= 0) {
    // fallback: se por algum motivo não estiver lesionado, volta ao menu normal
    betweenMatches();
    return;
  }

  if (option === "intense") {
    addStoryLine(
      "Aceitas um plano de reabilitação intensivo: sessões longas de fisioterapia, ginásio e trabalho específico.",
      "player"
    );
    p.stamina -= 10;
    p.form -= 2;

    p.injuryRisk += 5; // plano duro, mais carga no corpo

    if (inj.gamesToMiss > 1) {
      inj.gamesToMiss -= 1;
      addStoryLine(
        "O plano é duro, mas os resultados aparecem: encurtas em um jogo o tempo previsto de ausência.",
        "narrator"
      );
    } else {
      addStoryLine(
        "Já estás perto do regresso. O plano intensivo ajuda-te a sentir mais confiante.",
        "narrator"
      );
      p.morale += 2;
    }
  } else if (option === "balanced") {
    addStoryLine(
      "Optas por uma reabilitação equilibrada, alternando entre fisioterapia, ginásio leve e descanso.",
      "player"
    );
    p.stamina -= 3;
    p.form += 1;

    // risco mantém-se mais estável ou desce ligeiramente
    p.injuryRisk -= 2;

    if (inj.gamesToMiss > 2) {
      inj.gamesToMiss -= 1;
      addStoryLine(
        "Ao longo dos dias, a dor começa a diminuir. Os médicos admitem que podes voltar um pouco mais cedo.",
        "narrator"
      );
    } else {
      addStoryLine(
        "A recuperação segue o plano. Não apressas nada, mas também não ficas para trás.",
        "narrator"
      );
    }
  } else if (option === "rest") {
    addStoryLine(
      "Decides respeitar totalmente o corpo: descanso, sono, alimentação e rotinas suaves.",
      "player"
    );
    p.stamina += 10;
    p.morale += 3;
    p.injuryRisk -= 8; // descanso ajuda o corpo a recuperar
    addStoryLine(
      "Fisicamente podes demorar o tempo previsto a voltar, mas mentalmente sentes-te mais estável.",
      "narrator"
    );
    // não mexe em gamesToMiss: recuperação segue o tempo normal
  }

  clampPlayerStatus();
  updateStatus();
  saveGame();

  addStoryLine(
    "Com o plano de recuperação definido, o próximo jogo aproxima-se.",
    "system"
  );

  setChoices([
    {
      label: "Seguir para o próximo jogo",
      onSelect: () => startPreMatch()
    },
    {
      label: "Voltar ao início (nova personagem)",
      secondary: true,
      onSelect: () => newCareer()
    }
  ]);
}

function getSeasonTitles() {
  // Gera títulos/resumos de reputação com base nas estatísticas atuais
  const titles = [];
  const p = gameState.player;
  const s = gameState.playerStats;
  const gamesPlayed = getGamesPlayed();
  const avg = getAverageRating();
  const points = gameState.points;

  if (!p || !s) return titles;

  // Revelação jovem: boa média e ainda novo
  if (
    gamesPlayed >= 3 &&
    avg !== null &&
    avg >= 7.5 &&
    p.age != null &&
    p.age <= 19
  ) {
    titles.push("Jogador Revelação");
  }

  // Especialistas por posição
  if (p.positionKey === "Forward" && s.goals >= 4) {
    titles.push("Matador da Área");
  }

  if (p.positionKey === "Midfielder" && s.assists >= 4) {
    titles.push("Maestro do Meio-Campo");
  }

  if (p.positionKey === "Goalkeeper" && s.cleanSheets >= 3) {
    titles.push("Muralha da Baliza");
  }

  // Pilar da equipa: muitos minutos e impacto geral
  if (
    gamesPlayed >= 4 &&
    avg !== null &&
    avg >= 7.0 &&
    points >= gamesPlayed * 2
  ) {
    titles.push("Pilar da Equipa");
  }

  // Perfil de líder
  if (
    p.personality === "Líder calmo" &&
    gamesPlayed >= 3 &&
    (p.morale ?? 0) >= 70
  ) {
    titles.push("Capitão Sem Braçadeira");
  }

  // Se nada encaixar, pelo menos marca como época de aprendizagem
  if (titles.length === 0) {
    titles.push("Época de Aprendizagem");
  }

  return titles;
}

function endSeason() {
  // Fecha época, mostra resumo de objetivos/títulos e oferece opções para continuar ou recomeçar
  const gamesPlayed = getGamesPlayed();

  addStoryLine(
    `A época chegou ao fim. Jogaste ${gamesPlayed} jogos: ${gameState.wins} vitórias, ${gameState.draws} empates e ${gameState.losses} derrotas.`,
    "system"
  );
  addStoryLine(
    `Terminaste com ${gameState.points} pontos e forma atual de ${gameState.player.form}.`,
    "system"
  );

  const s = gameState.playerStats;
  if (s.games > 0 && s.ratingSum > 0) {
    const avg = Math.round((s.ratingSum / s.games) * 10) / 10;
    addStoryLine(
      `A tua média de notas nesta época foi ${avg.toFixed(1)}.`,
      "system"
    );
  }

  // Resumo dos objetivos da época
  const objectives = getSeasonObjectivesForCurrentPlayer();
  if (objectives.length > 0) {
    const doneCount = objectives.filter((o) => o.done).length;
    addStoryLine(
      `Concluíste ${doneCount} de ${objectives.length} objetivo(s) da época.`,
      "system"
    );

    objectives.forEach((obj) => {
      const status = obj.done ? "✅ Cumprido" : "❌ Não cumprido";
      addStoryLine(
        `${status}: ${obj.text} (progresso: ${obj.progress})`,
        "system"
      );
    });
  }

  // Títulos de época com base no desempenho
  const titles = getSeasonTitles();
  if (titles.length > 0) {
    addStoryLine("Resumo da tua reputação nesta época:", "system");
    titles.forEach((t) => {
      addStoryLine(`• ${t}`, "system");
    });
  }

  addStoryLine(
    "Chegou a altura de decidir o que vem a seguir na tua carreira.",
    "system"
  );

  setChoices([
    {
      label: "Continuar com esta personagem (nova época)",
      onSelect: () => startNewSeason()
    },
    {
      label: "Começar uma nova carreira do zero",
      secondary: true,
      onSelect: () => newCareer()
    }
  ]);
}

// ============================
// Arranque
// ============================

checkForSavedGame();
