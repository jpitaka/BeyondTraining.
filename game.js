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
  phase: "creation", // "creation" | "preMatch" | "matchHighlight" | "betweenMatches" | "postMatch"
  minute: 0,
  scorePlayer: 0,
  scoreOpponent: 0,
  highlightIndex: 0,

  // dados da época
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
    cleanSheets: 0
  }
};

const positionPresets = {
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

const creationSection = document.getElementById("character-creation");
const gameMain = document.getElementById("game");
const startGameBtn = document.getElementById("start-game-btn");
const continueCareerBtn = document.getElementById("continue-career-btn");
const creationError = document.getElementById("creation-error");

const infoName = document.getElementById("info-name");
const infoPosition = document.getElementById("info-position");
const attributesList = document.getElementById("attributes-list");
const infoStamina = document.getElementById("info-stamina");
const infoMorale = document.getElementById("info-morale");
const infoForm = document.getElementById("info-form");

const seasonMatchEl = document.getElementById("season-match");
const seasonRecordEl = document.getElementById("season-record");
const seasonPointsEl = document.getElementById("season-points");
const seasonOpponentEl = document.getElementById("season-opponent");

const statGamesEl = document.getElementById("stat-games");
const statGoalsEl = document.getElementById("stat-goals");
const statAssistsEl = document.getElementById("stat-assists");
const statCleanSheetsEl = document.getElementById("stat-cleansheets");

const scorePlayerEl = document.getElementById("score-player");
const scoreOpponentEl = document.getElementById("score-opponent");
const infoMinute = document.getElementById("info-minute");

const storyLog = document.getElementById("story-log");
const choicesContainer = document.getElementById("choices");

// ============================
// Utilitários de época / fixtures
// ============================

function getGamesPlayed() {
  return gameState.wins + gameState.draws + gameState.losses;
}

function getCurrentFixture() {
  const gamesPlayed = getGamesPlayed();
  const index = Math.min(gamesPlayed, fixtures.length - 1);
  return fixtures[index];
}

// ============================
// UI geral
// ============================

function initGameUI() {
  creationSection.classList.add("hidden");
  gameMain.classList.remove("hidden");

  const p = gameState.player;
  infoName.textContent = p.name;
  infoPosition.textContent = p.positionLabel;

  attributesList.innerHTML = "";
  Object.entries(p.attributes).forEach(([attr, value]) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${attr}</span><span>${value}</span>`;
    attributesList.appendChild(li);
  });

  updateStatus();
  clearStory();
}

function updateSeasonUI() {
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
}

// Atualizar estado (stamina, moral, forma, resultado, minuto)
function updateStatus() {
  const p = gameState.player;
  if (p) {
    infoStamina.textContent = `${p.stamina}`;
    infoMorale.textContent = `${p.morale}`;
    infoForm.textContent = `${p.form}`;
  }

  scorePlayerEl.textContent = gameState.scorePlayer;
  scoreOpponentEl.textContent = gameState.scoreOpponent;
  infoMinute.textContent = `${gameState.minute}'`;

  updateSeasonUI();
  updateStatsUI();
}

function updateStatsUI() {
  const s = gameState.playerStats;
  statGamesEl.textContent = s.games;
  statGoalsEl.textContent = s.goals;
  statAssistsEl.textContent = s.assists;
  statCleanSheetsEl.textContent = s.cleanSheets;
}

function clearStory() {
  storyLog.innerHTML = "";
}

function addStoryLine(text, type = "narrator") {
  const div = document.createElement("div");
  div.classList.add("story-entry", type);
  div.textContent = text;
  storyLog.appendChild(div);
  storyLog.scrollTop = storyLog.scrollHeight;
}

function setChoices(choices) {
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
  const p = gameState.player;
  if (!p) return;

  p.stamina = Math.max(0, Math.min(100, p.stamina));
  p.morale = Math.max(0, Math.min(100, p.morale));
  p.form = Math.max(0, Math.min(100, p.form));
}

// ============================
// Guardar / carregar carreira
// ============================

function saveGame() {
  if (!gameState.player) return;

  const data = {
    player: gameState.player,
    career: {
      totalMatches: gameState.totalMatches,
      wins: gameState.wins,
      draws: gameState.draws,
      losses: gameState.losses,
      points: gameState.points
    },
    stats: gameState.playerStats
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Erro ao guardar carreira:", e);
  }
}

function loadGame() {
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

    if (data.career) {
      gameState.totalMatches = data.career.totalMatches ?? fixtures.length;
      gameState.wins = data.career.wins ?? 0;
      gameState.draws = data.career.draws ?? 0;
      gameState.losses = data.career.losses ?? 0;
      gameState.points = data.career.points ?? 0;
    } else {
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
        cleanSheets: data.stats.cleanSheets ?? 0
      };
    } else {
      gameState.playerStats = {
        games: 0,
        goals: 0,
        assists: 0,
        cleanSheets: 0
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
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    continueCareerBtn.classList.remove("hidden");
  }
}

function newCareer() {
  localStorage.removeItem(SAVE_KEY);
  window.location.reload();
}

// ============================
// Fluxo: criação de jogador
// ============================

startGameBtn.addEventListener("click", () => {
  const nameInput = document.getElementById("player-name");
  const positionSelect = document.getElementById("player-position");

  const name = nameInput.value.trim();
  const positionKey = positionSelect.value;

  if (!name || !positionKey) {
    creationError.textContent = "Preenche o nome e escolhe uma posição.";
    return;
  }

  const preset = positionPresets[positionKey];

  gameState.player = {
    name,
    positionKey,
    positionLabel: preset.label,
    attributes: { ...preset.attributes },
    stamina: 100,
    morale: 60,
    form: 50
  };

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
    cleanSheets: 0
  };

  creationError.textContent = "";
  saveGame();
  initGameUI();
  startPreMatch();
});

continueCareerBtn.addEventListener("click", () => {
  const ok = loadGame();
  if (!ok) return;
  initGameUI();
  startPreMatch();
});

// ============================
// Pré-jogo
// ============================

function startPreMatch() {
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

function handlePreMatchChoice(option) {
  const p = gameState.player;

  if (option === "silent") {
    addStoryLine(
      "Ficas em silêncio, a ouvir cada palavra do treinador. Queres mostrar em campo o que vales.",
      "player"
    );
    p.morale += 5;
    p.form += 2;
  } else if (option === "motivate") {
    addStoryLine(
      "Levantas-te e dizes a toda a equipa que este é só o início, que vão surpreender o campeonato.",
      "player"
    );
    const social = p.attributes.Social;
    const result = rollSkill(social, 8);
    if (result.outcome === "greatSuccess" || result.outcome === "success") {
      addStoryLine(
        "O balneário explode em gritos de motivação. O treinador parece satisfeito.",
        "narrator"
      );
      p.morale += 10;
      p.form += 4;
    } else {
      addStoryLine(
        "Alguns colegas sorriem, mas o discurso sai meio forçado. Nada de grave, mas também não inspirou muito.",
        "narrator"
      );
      p.morale += 1;
    }
  } else if (option === "nervous") {
    addStoryLine(
      "Tentras brincar e fazer piadas, mas por dentro estás cheio de nervos. Só queres que o jogo comece.",
      "player"
    );
    p.morale -= 3;
    p.form -= 2;
  }

  clampPlayerStatus();
  updateStatus();
  startMatch();
}

// ============================
// Jogo: destaques
// ============================

function startMatch() {
  gameState.phase = "matchHighlight";
  gameState.highlightIndex = 0;
  gameState.minute = 5;
  updateStatus();

  addStoryLine(
    "Entram em campo. As bancadas não estão cheias, mas ouve-se claramente o teu nome vindo de alguns adeptos.",
    "narrator"
  );
  proceedHighlight();
}

function proceedHighlight() {
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
  const p = gameState.player;
  const att = p.attributes;

  if (action === "takeLead") {
    addStoryLine(
      "Pedes bola com confiança, queres ser tu a fazer a diferença.",
      "player"
    );
    const base = att.Tecnica + Math.floor(p.form / 30);
    const result = rollSkill(base, 11);
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
        "Sentes uma fisgada na perna a meio do sprint e tens de abrandar. Parece uma pequena lesão.",
        "narrator"
      );
      p.morale -= 10;
      p.form -= 10;
    }
  } else {
    addStoryLine(
      "Decides gerir esforço, escolhendo bem os momentos em que corres e intervéns.",
      "player"
    );
    const result = rollSkill(att.Tactica + 1, 9);
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
  const p = gameState.player;

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
  const p = gameState.player;
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
  const p = gameState.player;
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
  const p = gameState.player;
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
  const p = gameState.player;
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
  const p = gameState.player;
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
  const p = gameState.player;
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
  const p = gameState.player;
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
  const p = gameState.player;
  const att = p.attributes;
  const social = att.Social !== undefined ? att.Social : 1;
  const mental = att.Mental !== undefined ? att.Mental : 1;

  if (option === "humble") {
    addStoryLine(
      "Dizes que o mérito é da equipa e da forma como trabalharam juntos.",
      "player"
    );
    const result = rollSkill(social + mental, 8);
    if (result.outcome === "greatSuccess" || result.outcome === "success") {
      addStoryLine(
        "A imprensa gosta da tua postura. Ganhas respeito no balneário e entre os adeptos.",
        "narrator"
      );
      p.morale += 4;
      p.form += 2;
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
    const result = rollSkill(social + mental, 10);
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
    const result = rollSkill(mental, 9);
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
  gameState.phase = "betweenMatches";
  clearStory();

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

function chooseBetweenMatches(option) {
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
  } else if (option === "technical") {
    addStoryLine(
      "Dedicas-te a treinar técnica: receção, passe, remate, jogadas combinadas.",
      "player"
    );
    att.Tecnica += 1;
    p.stamina -= 10;
    p.form += 2;
  } else if (option === "rest") {
    addStoryLine(
      "Aproveitas para descansar o corpo e a cabeça, dormir bem e desligar um pouco.",
      "player"
    );
    p.stamina += 20;
    p.morale += 3;
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

function endSeason() {
  const gamesPlayed = getGamesPlayed();

  addStoryLine(
    `A época chegou ao fim. Jogaste ${gamesPlayed} jogos: ${gameState.wins} vitórias, ${gameState.draws} empates e ${gameState.losses} derrotas.`,
    "system"
  );
  addStoryLine(
    `Terminaste com ${gameState.points} pontos e forma atual de ${gameState.player.form}.`,
    "system"
  );
  addStoryLine(
    "Podes começar uma nova carreira do zero e tentar fazer ainda melhor.",
    "system"
  );

  setChoices([
    {
      label: "Começar nova carreira",
      onSelect: () => newCareer()
    }
  ]);
}

// ============================
// Arranque
// ============================

checkForSavedGame();
