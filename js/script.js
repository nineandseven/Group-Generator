/* =========================================================
   BADMINTON GROUP SCHEDULER
   完整版
========================================================= */


/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEYS = {
  PLAYERS: "BADMINTON_GROUP_PLAYERS",
  SETTINGS: "BADMINTON_GROUP_SETTINGS",
  RESULT: "BADMINTON_GROUP_RESULT",
};


/* =========================================================
   STATE
========================================================= */

const state = {
  players: [],

  settings: {
    rounds: 10,
    attempts: 5000,
    maxPlayStreak: 2,
    maxRestStreak: 2,
  },

  result: null,
};


/* =========================================================
   DOM
========================================================= */

const playerInput = document.getElementById("playerInput");
const addPlayerBtn = document.getElementById("addPlayerBtn");
const playerList = document.getElementById("playerList");
const playerCount = document.getElementById("playerCount");

const roundCount = document.getElementById("roundCount");
const attemptCount = document.getElementById("attemptCount");
const maxPlayStreak = document.getElementById("maxPlayStreak");
const maxRestStreak = document.getElementById("maxRestStreak");

const generateBtn = document.getElementById("generateBtn");
const resetResultBtn = document.getElementById("resetResultBtn");

const roundList = document.getElementById("roundList");
const statsBody = document.getElementById("statsBody");
const statsSubtitle = document.getElementById("statsSubtitle");

const summaryPlayers = document.getElementById("summaryPlayers");
const summaryRounds = document.getElementById("summaryRounds");

const algorithmMessage = document.getElementById("algorithmMessage");
const scoreValue = document.getElementById("scoreValue");

const loading = document.getElementById("loading");
const loadingProgress = document.getElementById("loadingProgress");
const loadingProgressText = document.getElementById("loadingProgressText");

const toast = document.getElementById("toast");


/* =========================================================
   STORAGE
========================================================= */

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}


function loadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    return JSON.parse(value);
  } catch {
    return fallback;
  }
}


/* =========================================================
   UTILITY
========================================================= */

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}


function pairKey(a, b) {
  return [a, b].sort().join("|");
}


function groupKey(players) {
  return [...players].sort().join("|");
}


function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/*
 * 讓瀏覽器有機會更新畫面。
 *
 * setTimeout 比單純 requestAnimationFrame 更適合
 * 這種長時間計算。
 */
function yieldToBrowser() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}


/* =========================================================
   LOADING
========================================================= */

function resetLoadingProgress() {
  const maxAttempts =
    Number(state.settings.attempts) || 5000;

  if (loadingProgress) {
    loadingProgress.style.width = "0%";
  }

  if (loadingProgressText) {
    loadingProgressText.textContent =
      `0 / ${maxAttempts.toLocaleString()}`;
  }
}


function updateLoadingProgress(
  attempt,
  maxAttempts,
) {
  const safeMax =
    Math.max(1, maxAttempts);

  const percent =
    Math.min(
      100,
      Math.round(
        (attempt / safeMax) * 100,
      ),
    );

  if (loadingProgress) {
    loadingProgress.style.width =
      `${percent}%`;
  }

  if (loadingProgressText) {
    loadingProgressText.textContent =
      `${attempt.toLocaleString()} / ${safeMax.toLocaleString()}`;
  }
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function showToast(message) {
  if (!toast) {
    return;
  }

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}


/* =========================================================
   PLAYER
========================================================= */

function savePlayers() {
  saveJSON(
    STORAGE_KEYS.PLAYERS,
    state.players,
  );
}


function renderPlayers() {
  if (!playerList) {
    return;
  }

  playerList.innerHTML = "";

  if (playerCount) {
    playerCount.textContent =
      `${state.players.length} 人`;
  }

  if (summaryPlayers) {
    summaryPlayers.textContent =
      state.players.length;
  }

  state.players.forEach((name, index) => {
    const row =
      document.createElement("div");

    row.className = "player";

    row.innerHTML = `
      <span class="player-number">
        ${String(index + 1).padStart(2, "0")}
      </span>

      <span class="player-name">
        ${escapeHTML(name)}
      </span>

      <button
        class="remove-player"
        data-index="${index}"
        title="刪除"
      >
        <span class="material-symbols-rounded">
          close
        </span>
      </button>
    `;

    playerList.appendChild(row);
  });
}


function addPlayer() {
  if (!playerInput) {
    return;
  }

  const name =
    playerInput.value.trim();

  if (!name) {
    showToast("請輸入姓名");

    playerInput.focus();

    return;
  }

  if (state.players.includes(name)) {
    showToast("這個名字已經存在");

    return;
  }

  if (state.players.length >= 100) {
    showToast("最多 100 人");

    return;
  }

  state.players.push(name);

  savePlayers();

  renderPlayers();

  clearResult(false);

  playerInput.value = "";

  playerInput.focus();

  showToast(`已加入 ${name}`);
}


addPlayerBtn?.addEventListener(
  "click",
  addPlayer,
);


playerInput?.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      addPlayer();
    }
  },
);


playerList?.addEventListener(
  "click",
  (event) => {
    const button =
      event.target.closest(".remove-player");

    if (!button) {
      return;
    }

    const index =
      Number(button.dataset.index);

    const name =
      state.players[index];

    if (Number.isNaN(index)) {
      return;
    }

    state.players.splice(index, 1);

    savePlayers();

    renderPlayers();

    clearResult(false);

    showToast(`已刪除 ${name}`);
  },
);


/* =========================================================
   SETTINGS
========================================================= */

function saveSettings() {
  state.settings.rounds =
    Math.max(
      1,
      Math.min(
        100,
        Number(roundCount?.value) || 10,
      ),
    );

  state.settings.attempts =
    Math.max(
      100,
      Math.min(
        20000,
        Number(attemptCount?.value) || 5000,
      ),
    );

  state.settings.maxPlayStreak =
    Math.max(
      1,
      Math.min(
        10,
        Number(maxPlayStreak?.value) || 2,
      ),
    );

  state.settings.maxRestStreak =
    Math.max(
      1,
      Math.min(
        10,
        Number(maxRestStreak?.value) || 2,
      ),
    );

  if (roundCount) {
    roundCount.value =
      state.settings.rounds;
  }

  if (attemptCount) {
    attemptCount.value =
      state.settings.attempts;
  }

  if (maxPlayStreak) {
    maxPlayStreak.value =
      state.settings.maxPlayStreak;
  }

  if (maxRestStreak) {
    maxRestStreak.value =
      state.settings.maxRestStreak;
  }

  saveJSON(
    STORAGE_KEYS.SETTINGS,
    state.settings,
  );

  if (summaryRounds) {
    summaryRounds.textContent =
      state.settings.rounds;
  }
}


roundCount?.addEventListener(
  "change",
  () => {
    saveSettings();

    clearResult(false);
  },
);


attemptCount?.addEventListener(
  "change",
  () => {
    saveSettings();
  },
);


maxPlayStreak?.addEventListener(
  "change",
  () => {
    saveSettings();

    clearResult(false);
  },
);


maxRestStreak?.addEventListener(
  "change",
  () => {
    saveSettings();

    clearResult(false);
  },
);


/* =========================================================
   STATS
========================================================= */

function createStats(players) {
  const stats = {};

  players.forEach((player) => {
    stats[player] = {
      play: 0,

      referee: 0,

      rest: 0,

      history: [],

      teammates: new Map(),

      opponents: new Map(),
    };
  });

  return stats;
}


/* =========================================================
   PAIR
========================================================= */

function getPairCount(
  map,
  a,
  b,
) {
  if (!map) {
    return 0;
  }

  return (
    map.get(pairKey(a, b)) || 0
  );
}


function addPairCount(
  map,
  a,
  b,
) {
  if (!map) {
    return;
  }

  const key =
    pairKey(a, b);

  map.set(
    key,
    (map.get(key) || 0) + 1,
  );
}


/* =========================================================
   CONSECUTIVE
========================================================= */

function getConsecutivePlay(
  history,
) {
  let count = 0;

  for (
    let i = history.length - 1;
    i >= 0;
    i--
  ) {
    if (history[i] === "play") {
      count++;
    } else {
      break;
    }
  }

  return count;
}


function getConsecutiveOff(
  history,
) {
  let count = 0;

  for (
    let i = history.length - 1;
    i >= 0;
    i--
  ) {
    if (history[i] !== "play") {
      count++;
    } else {
      break;
    }
  }

  return count;
}


function getMaxConsecutive(
  history,
  role,
) {
  let current = 0;
  let max = 0;

  history.forEach((value) => {
    if (value === role) {
      current++;

      max =
        Math.max(
          max,
          current,
        );
    } else {
      current = 0;
    }
  });

  return max;
}


function getMaxConsecutiveOff(
  history,
) {
  let current = 0;
  let max = 0;

  history.forEach((value) => {
    if (value !== "play") {
      current++;

      max =
        Math.max(
          max,
          current,
        );
    } else {
      current = 0;
    }
  });

  return max;
}


/* =========================================================
   TEAM COMBINATIONS
========================================================= */

function getTeamCombinations(
  playing,
) {
  if (playing.length !== 4) {
    return [];
  }

  const [
    a,
    b,
    c,
    d,
  ] = playing;

  return [
    {
      teamA: [a, b],
      teamB: [c, d],
    },

    {
      teamA: [a, c],
      teamB: [b, d],
    },

    {
      teamA: [a, d],
      teamB: [b, c],
    },
  ];
}


/* =========================================================
   FOUR GROUP
========================================================= */

function getFourPlayerGroupCount(
  schedule,
  playing,
) {
  const key =
    groupKey(playing);

  let count = 0;

  for (const match of schedule) {
    const group =
      groupKey([
        ...(match.teamA || []),
        ...(match.teamB || []),
      ]);

    if (group === key) {
      count++;
    }
  }

  return count;
}


/* =========================================================
   CAN PLAY
========================================================= */

function canPlayerPlay(
  player,
  stats,
) {
  return (
    getConsecutivePlay(
      stats[player].history,
    ) <
    state.settings.maxPlayStreak
  );
}


/* =========================================================
   CAN BE OFF
========================================================= */

function canPlayerBeOff(
  player,
  stats,
) {
  return (
    getConsecutiveOff(
      stats[player].history,
    ) <
    state.settings.maxRestStreak
  );
}


/* =========================================================
   PLAYER FAIRNESS
========================================================= */

function playerPlayScore(
  player,
  stats,
) {
  const data =
    stats[player];

  const play =
    data.play;

  const off =
    getConsecutiveOff(
      data.history,
    );

  const streak =
    getConsecutivePlay(
      data.history,
    );

  /*
   * 上場越少越優先
   */
  let score =
    play * 1000;

  /*
   * 越久沒上場越優先
   */
  score -=
    off * 300;

  /*
   * 連續上場越多越不希望繼續
   */
  score +=
    streak * 800;

  /*
   * 裁判太多稍微降低優先
   */
  score +=
    data.referee * 100;

  /*
   * 小量隨機
   */
  score +=
    Math.random() * 10;

  return score;
}


/* =========================================================
   PLAYING GROUP SCORE
========================================================= */

function calculatePlayingGroupScore(
  playing,
  players,
  stats,
  schedule,
) {
  let score = 0;

  /*
   * =====================================================
   * 1. 上場公平
   * =====================================================
   */

  const projected =
    players.map(
      (player) =>
        stats[player].play +
        (
          playing.includes(player)
            ? 1
            : 0
        ),
    );

  const max =
    Math.max(...projected);

  const min =
    Math.min(...projected);

  /*
   * 差距太大直接淘汰
   */
  if (max - min > 1) {
    return Infinity;
  }

  score +=
    (max - min) * 10000;


  /*
   * =====================================================
   * 2. 個人公平
   * =====================================================
   */

  playing.forEach((player) => {
    score +=
      playerPlayScore(
        player,
        stats,
      );
  });


  /*
   * =====================================================
   * 3. 沒上場的人
   * =====================================================
   */

  players.forEach((player) => {
    if (playing.includes(player)) {
      return;
    }

    const data =
      stats[player];

    const projectedPlay =
      data.play;

    const projectedOff =
      getConsecutiveOff(
        data.history,
      ) + 1;

    /*
     * 越少上場越不應該繼續休息
     */
    score +=
      Math.max(
        0,
        (
          max -
          projectedPlay
        ),
      ) * 500;

    /*
     * 休息越久越嚴重
     */
    score +=
      projectedOff * 200;
  });


  /*
   * =====================================================
   * 4. 四人組重複
   *
   * 不再禁止。
   * 但是越重複懲罰越重。
   * =====================================================
   */

  const sameGroupCount =
    getFourPlayerGroupCount(
      schedule,
      playing,
    );

  if (sameGroupCount > 0) {
    score +=
      Math.pow(
        sameGroupCount,
        2,
      ) * 12000;
  }


  return score;
}


/* =========================================================
   PICK PLAYERS
========================================================= */

function pickPlayingPlayers(
  players,
  stats,
  schedule,
) {
  const available =
    players.filter(
      (player) =>
        canPlayerPlay(
          player,
          stats,
        ),
    );

  if (available.length < 4) {
    return null;
  }


  /*
   * 已經達到 maxRest 的人
   * 下一場一定要上。
   */
  const mustPlay =
    players.filter(
      (player) =>
        !canPlayerBeOff(
          player,
          stats,
        ),
    );


  if (mustPlay.length > 4) {
    return null;
  }


  /*
   * mustPlay 如果被 maxPlay 擋住，
   * 目前這條路不可行。
   */
  for (const player of mustPlay) {
    if (!available.includes(player)) {
      return null;
    }
  }


  /*
   * =====================================================
   * 5 人特殊最佳化
   *
   * 5 人其實就是選誰休息。
   * 直接比較 5 種可能，
   * 比暴力組合更快。
   * =====================================================
   */

  if (players.length === 5) {
    let best = null;
    let bestScore = Infinity;

    for (const resting of shuffle(players)) {
      const playing =
        players.filter(
          (player) =>
            player !== resting,
        );

      /*
       * 必須上場的人不能休息
       */
      if (
        mustPlay.includes(resting)
      ) {
        continue;
      }

      /*
       * 4 人都必須可以上場
       */
      if (
        playing.some(
          (player) =>
            !available.includes(player),
        )
      ) {
        continue;
      }

      const score =
        calculatePlayingGroupScore(
          playing,
          players,
          stats,
          schedule,
        );

      if (score < bestScore) {
        bestScore = score;

        best = playing;
      }
    }

    return best;
  }


  /*
   * =====================================================
   * 一般人數
   * =====================================================
   */

  const candidates =
    [...available].sort(
      (a, b) =>
        playerPlayScore(
          a,
          stats,
        ) -
        playerPlayScore(
          b,
          stats,
        ),
    );


  /*
   * 候選池
   *
   * 人越多，候選池越小。
   */
  const candidateLimit =
    Math.min(
      candidates.length,
      Math.max(
        8,
        Math.min(
          16,
          Math.floor(
            players.length * 0.65,
          ),
        ),
      ),
    );


  let pool =
    candidates.slice(
      0,
      candidateLimit,
    );


  /*
   * mustPlay 一定加入
   */
  mustPlay.forEach(
    (player) => {
      if (!pool.includes(player)) {
        pool.push(player);
      }
    },
  );


  pool = [
    ...new Set(pool),
  ];


  let best = null;
  let bestScore = Infinity;


  /*
   * 四人組合
   */
  for (
    let a = 0;
    a < pool.length - 3;
    a++
  ) {
    for (
      let b = a + 1;
      b < pool.length - 2;
      b++
    ) {
      for (
        let c = b + 1;
        c < pool.length - 1;
        c++
      ) {
        for (
          let d = c + 1;
          d < pool.length;
          d++
        ) {
          const playing = [
            pool[a],
            pool[b],
            pool[c],
            pool[d],
          ];


          /*
           * mustPlay
           */
          if (
            mustPlay.some(
              (player) =>
                !playing.includes(
                  player,
                ),
            )
          ) {
            continue;
          }


          const score =
            calculatePlayingGroupScore(
              playing,
              players,
              stats,
              schedule,
            );


          if (
            score < bestScore
          ) {
            bestScore =
              score;

            best =
              playing;
          }
        }
      }
    }
  }


  return best;
}


/* =========================================================
   CHOOSE REFEREE
========================================================= */

function chooseReferee(
  players,
  playing,
  stats,
) {
  const candidates =
    players.filter(
      (player) =>
        !playing.includes(player),
    );

  if (
    candidates.length === 0
  ) {
    return null;
  }


  const valid =
    candidates.filter(
      (player) =>
        canPlayerBeOff(
          player,
          stats,
        ),
    );


  if (
    valid.length === 0
  ) {
    return null;
  }


  /*
   * 裁判選擇：
   *
   * 1. 裁判少
   * 2. 上場少
   * 3. 休息少
   */
  valid.sort(
    (a, b) => {
      const refDiff =
        stats[a].referee -
        stats[b].referee;

      if (refDiff !== 0) {
        return refDiff;
      }


      const playDiff =
        stats[a].play -
        stats[b].play;

      if (playDiff !== 0) {
        return playDiff;
      }


      const aOff =
        getConsecutiveOff(
          stats[a].history,
        );

      const bOff =
        getConsecutiveOff(
          stats[b].history,
        );

      if (
        aOff !== bOff
      ) {
        return (
          aOff - bOff
        );
      }


      return (
        Math.random() - 0.5
      );
    },
  );


  return valid[0];
}


/* =========================================================
   REFEREE SCORE
========================================================= */

function calculateRefereeScore(
  referee,
  players,
  stats,
) {
  let score = 0;

  /*
   * 裁判次數
   */
  score +=
    stats[referee].referee *
    3000;

  /*
   * 上場越少越不應該一直當裁判
   */
  score +=
    Math.max(
      0,
      (
        stats[referee].play -
        stats[referee].referee
      ),
    ) * 100;

  /*
   * 休息太久的人不適合一直裁判
   */
  score +=
    getConsecutiveOff(
      stats[referee].history,
    ) * 500;

  score +=
    Math.random() * 10;

  return score;
}


/* =========================================================
   SELECT BEST TEAM
========================================================= */

function selectBestTeam(
  playing,
  stats,
) {
  const options =
    shuffle(
      getTeamCombinations(
        playing,
      ),
    );

  let best = null;

  let bestScore = Infinity;


  options.forEach(
    (team) => {
      let score = 0;


      /*
       * ===================================================
       * 隊友
       * ===================================================
       */

      score +=
        getPairCount(
          stats[
            team.teamA[0]
          ].teammates,
          team.teamA[0],
          team.teamA[1],
        ) * 2500;


      score +=
        getPairCount(
          stats[
            team.teamB[0]
          ].teammates,
          team.teamB[0],
          team.teamB[1],
        ) * 2500;


      /*
       * ===================================================
       * 對手
       * ===================================================
       */

      team.teamA.forEach(
        (a) => {
          team.teamB.forEach(
            (b) => {
              score +=
                getPairCount(
                  stats[a].opponents,
                  a,
                  b,
                ) * 600;
            },
          );
        },
      );


      /*
       * 小量隨機
       */
      score +=
        Math.random() * 20;


      if (
        score < bestScore
      ) {
        bestScore =
          score;

        best =
          team;
      }
    },
  );


  return best;
}


/* =========================================================
   UPDATE STATS
========================================================= */

function updateStats(
  stats,
  players,
  match,
) {
  const playing = [
    ...match.teamA,
    ...match.teamB,
  ];


  players.forEach(
    (player) => {
      if (
        playing.includes(
          player,
        )
      ) {
        stats[player].play++;

        stats[player].history.push(
          "play",
        );
      } else if (
        player === match.referee
      ) {
        stats[player].referee++;

        stats[player].history.push(
          "referee",
        );
      } else {
        stats[player].rest++;

        stats[player].history.push(
          "rest",
        );
      }
    },
  );


  /*
   * 隊友
   */

  addPairCount(
    stats[
      match.teamA[0]
    ].teammates,
    match.teamA[0],
    match.teamA[1],
  );

  addPairCount(
    stats[
      match.teamA[1]
    ].teammates,
    match.teamA[1],
    match.teamA[0],
  );


  addPairCount(
    stats[
      match.teamB[0]
    ].teammates,
    match.teamB[0],
    match.teamB[1],
  );

  addPairCount(
    stats[
      match.teamB[1]
    ].teammates,
    match.teamB[1],
    match.teamB[0],
  );


  /*
   * 對手
   */

  match.teamA.forEach(
    (a) => {
      match.teamB.forEach(
        (b) => {
          addPairCount(
            stats[a].opponents,
            a,
            b,
          );

          addPairCount(
            stats[b].opponents,
            b,
            a,
          );
        },
      );
    },
  );
}


/* =========================================================
   BUILD SCHEDULE
========================================================= */

function buildSchedule() {
  const players =
    shuffle(state.players);

  const schedule = [];

  const stats =
    createStats(players);


  for (
    let round = 0;
    round <
    state.settings.rounds;
    round++
  ) {
    /*
     * 選上場四人
     */
    const playing =
      pickPlayingPlayers(
        players,
        stats,
        schedule,
      );


    if (!playing) {
      return null;
    }


    /*
     * 選裁判
     */
    const referee =
      chooseReferee(
        players,
        playing,
        stats,
      );


    if (!referee) {
      return null;
    }


    /*
     * 選最佳配隊
     */
    const team =
      selectBestTeam(
        playing,
        stats,
      );


    if (!team) {
      return null;
    }


    const match = {
      round:
        round + 1,

      teamA:
        team.teamA,

      teamB:
        team.teamB,

      referee,
    };


    schedule.push(match);

    updateStats(
      stats,
      players,
      match,
    );
  }


  /*
   * 最終驗證
   */
  if (
    !isScheduleValid(
      players,
      schedule,
    )
  ) {
    return null;
  }


  return schedule;
}


/* =========================================================
   CALCULATE STATS
========================================================= */

function calculateStats(
  players,
  schedule,
) {
  const stats =
    createStats(players);


  if (
    !Array.isArray(schedule)
  ) {
    return stats;
  }


  schedule.forEach(
    (match) => {
      const teamA =
        match.teamA || [];

      const teamB =
        match.teamB || [];

      const playing = [
        ...teamA,
        ...teamB,
      ];


      players.forEach(
        (player) => {
          if (
            playing.includes(
              player,
            )
          ) {
            stats[player].play++;

            stats[player].history.push(
              "play",
            );
          } else if (
            match.referee === player
          ) {
            stats[player].referee++;

            stats[player].history.push(
              "referee",
            );
          } else {
            stats[player].rest++;

            stats[player].history.push(
              "rest",
            );
          }
        },
      );


      if (
        teamA.length === 2
      ) {
        addPairCount(
          stats[
            teamA[0]
          ].teammates,
          teamA[0],
          teamA[1],
        );

        addPairCount(
          stats[
            teamA[1]
          ].teammates,
          teamA[1],
          teamA[0],
        );
      }


      if (
        teamB.length === 2
      ) {
        addPairCount(
          stats[
            teamB[0]
          ].teammates,
          teamB[0],
          teamB[1],
        );

        addPairCount(
          stats[
            teamB[1]
          ].teammates,
          teamB[1],
          teamB[0],
        );
      }


      teamA.forEach(
        (a) => {
          teamB.forEach(
            (b) => {
              addPairCount(
                stats[a].opponents,
                a,
                b,
              );

              addPairCount(
                stats[b].opponents,
                b,
                a,
              );
            },
          );
        },
      );
    },
  );


  return stats;
}


/* =========================================================
   VALIDATION
========================================================= */

function isScheduleValid(
  players,
  schedule,
) {
  if (
    !Array.isArray(schedule)
  ) {
    return false;
  }


  if (
    schedule.length !==
    state.settings.rounds
  ) {
    return false;
  }


  const stats =
    calculateStats(
      players,
      schedule,
    );


  /*
   * =====================================================
   * 每場
   * =====================================================
   */

  for (
    const match of schedule
  ) {
    if (
      !match.teamA ||
      !match.teamB ||
      !match.referee
    ) {
      return false;
    }


    if (
      match.teamA.length !== 2 ||
      match.teamB.length !== 2
    ) {
      return false;
    }


    const playing = [
      ...match.teamA,
      ...match.teamB,
    ];


    if (
      new Set(playing).size !== 4
    ) {
      return false;
    }


    if (
      playing.includes(
        match.referee,
      )
    ) {
      return false;
    }
  }


  /*
   * =====================================================
   * 上場公平
   * =====================================================
   */

  const playCounts =
    players.map(
      (player) =>
        stats[player].play,
    );


  const maxPlay =
    Math.max(
      ...playCounts,
    );

  const minPlay =
    Math.min(
      ...playCounts,
    );


  if (
    maxPlay - minPlay > 1
  ) {
    return false;
  }


  /*
   * =====================================================
   * 連續限制
   * =====================================================
   */

  for (
    const player of players
  ) {
    const history =
      stats[player].history;


    if (
      getMaxConsecutive(
        history,
        "play",
      ) >
      state.settings.maxPlayStreak
    ) {
      return false;
    }


    if (
      getMaxConsecutiveOff(
        history,
      ) >
      state.settings.maxRestStreak
    ) {
      return false;
    }
  }


  return true;
}


/* =========================================================
   SCORE
 *
 * 分數越低越好
========================================================= */

function calculateScore(
  players,
  schedule,
) {
  const stats =
    calculateStats(
      players,
      schedule,
    );


  let score = 0;


  /*
   * =====================================================
   * 1. 上場公平
   * =====================================================
   */

  const playCounts =
    players.map(
      (player) =>
        stats[player].play,
    );


  const averagePlay =
    playCounts.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) / players.length;


  players.forEach(
    (player) => {
      score +=
        Math.pow(
          stats[player].play -
            averagePlay,
          2,
        ) * 10000;
    },
  );


  /*
   * =====================================================
   * 2. 裁判公平
   * =====================================================
   */

  const refCounts =
    players.map(
      (player) =>
        stats[player].referee,
    );


  const averageRef =
    refCounts.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) / players.length;


  players.forEach(
    (player) => {
      score +=
        Math.pow(
          stats[player].referee -
            averageRef,
          2,
        ) * 3000;
    },
  );


  /*
   * =====================================================
   * 3. 四人組
   *
   * 允許重複，但重複越多扣越重
   * =====================================================
   */

  const groups =
    new Map();


  schedule.forEach(
    (match) => {
      const key =
        groupKey([
          ...match.teamA,
          ...match.teamB,
        ]);


      const count =
        (groups.get(key) || 0) + 1;


      groups.set(
        key,
        count,
      );


      if (count > 1) {
        score +=
          Math.pow(
            count - 1,
            2,
          ) * 12000;
      }
    },
  );


  /*
   * =====================================================
   * 4. 隊友
   * =====================================================
   */

  const teammates =
    new Map();


  schedule.forEach(
    (match) => {
      [
        match.teamA,
        match.teamB,
      ].forEach(
        (team) => {
          const key =
            pairKey(
              team[0],
              team[1],
            );


          const count =
            (teammates.get(key) || 0) + 1;


          teammates.set(
            key,
            count,
          );


          if (count > 1) {
            score +=
              Math.pow(
                count - 1,
                2,
              ) * 5000;
          }
        },
      );
    },
  );


  /*
   * =====================================================
   * 5. 對手
   * =====================================================
   */

  const opponents =
    new Map();


  schedule.forEach(
    (match) => {
      match.teamA.forEach(
        (a) => {
          match.teamB.forEach(
            (b) => {
              const key =
                pairKey(a, b);


              const count =
                (opponents.get(key) || 0) + 1;


              opponents.set(
                key,
                count,
              );


              if (count > 1) {
                score +=
                  Math.pow(
                    count - 1,
                    2,
                  ) * 700;
              }
            },
          );
        },
      );
    },
  );


  /*
   * =====================================================
   * 6. 連續
   * =====================================================
   */

  players.forEach(
    (player) => {
      const history =
        stats[player].history;


      const maxPlay =
        getMaxConsecutive(
          history,
          "play",
        );


      const maxOff =
        getMaxConsecutiveOff(
          history,
        );


      if (
        maxPlay >
        state.settings.maxPlayStreak
      ) {
        score +=
          1000000 *
          (
            maxPlay -
            state.settings.maxPlayStreak
          );
      }


      if (
        maxOff >
        state.settings.maxRestStreak
      ) {
        score +=
          1000000 *
          (
            maxOff -
            state.settings.maxRestStreak
          );
      }
    },
  );


  return score;
}


/* =========================================================
   FAST LOCAL SCORE
 *
 * 用於快速比較目前結果
========================================================= */

function calculateQuickScore(
  players,
  schedule,
) {
  const stats =
    calculateStats(
      players,
      schedule,
    );


  let score = 0;


  /*
   * 上場差距
   */
  const plays =
    players.map(
      (player) =>
        stats[player].play,
    );


  const max =
    Math.max(...plays);

  const min =
    Math.min(...plays);


  score +=
    (max - min) * 10000;


  /*
   * 裁判差距
   */
  const refs =
    players.map(
      (player) =>
        stats[player].referee,
    );


  const refMax =
    Math.max(...refs);

  const refMin =
    Math.min(...refs);


  score +=
    (refMax - refMin) * 3000;


  /*
   * 四人組
   */
  const groups =
    new Map();


  schedule.forEach(
    (match) => {
      const key =
        groupKey([
          ...match.teamA,
          ...match.teamB,
        ]);


      const count =
        (groups.get(key) || 0) + 1;


      groups.set(
        key,
        count,
      );


      if (count > 1) {
        score +=
          Math.pow(
            count - 1,
            2,
          ) * 12000;
      }
    },
  );


  return score;
}


/* =========================================================
   GENERATE BEST
========================================================= */

async function generateBestSchedule() {
  const players =
    [...state.players];


  const MAX_ATTEMPTS =
    Number(
      state.settings.attempts,
    ) || 5000;


  if (
    players.length < 5
  ) {
    throw new Error(
      "至少需要 5 位參加者",
    );
  }


  /*
   * =====================================================
   * 基本可行性檢查
   * =====================================================
   */

  const rounds =
    state.settings.rounds;


  const totalPlaySlots =
    rounds * 4;


  const averagePlay =
    totalPlaySlots /
    players.length;


  /*
   * 如果上場次數本身不可能做到差距 <= 1
   * 就不應該一直搜尋。
   *
   * 其實 4R / N 的 floor / ceil
   * 一定可以達成，只要連續限制允許。
   */


  /*
   * =====================================================
   * 特殊檢查：
   *
   * maxPlayStreak / maxRestStreak
   * 是否可能
   * =====================================================
   */

  if (
    state.settings.maxPlayStreak < 1 ||
    state.settings.maxRestStreak < 1
  ) {
    throw new Error(
      "連續限制至少必須為 1",
    );
  }


  let bestSchedule = null;

  let bestScore = Infinity;

  let validCount = 0;

  let completedAttempts = 0;


  /*
   * =====================================================
   * 搜尋
   * =====================================================
   */

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt++
  ) {
    completedAttempts =
      attempt;


    /*
     * Loading
     *
     * 每次更新數字，
     * 但不要每次強制 layout。
     */
    if (
      attempt === 1 ||
      attempt % 5 === 0 ||
      attempt === MAX_ATTEMPTS
    ) {
      updateLoadingProgress(
        attempt,
        MAX_ATTEMPTS,
      );
    }


    /*
     * 每 10 次讓 UI 呼吸一次
     */
    if (
      attempt === 1 ||
      attempt % 10 === 0
    ) {
      await yieldToBrowser();
    }


    const schedule =
      buildSchedule();


    if (!schedule) {
      continue;
    }


    if (
      !isScheduleValid(
        players,
        schedule,
      )
    ) {
      continue;
    }


    validCount++;


    const score =
      calculateScore(
        players,
        schedule,
      );


    if (
      score < bestScore
    ) {
      bestScore =
        score;

      bestSchedule =
        schedule;


      /*
       * 如果已經達到非常好的結果，
       * 不需要繼續浪費搜尋時間。
       *
       * 注意：
       * 5 人 10 場通常不會到 0。
       */
      if (
        bestScore <= 100
      ) {
        break;
      }
    }
  }


  /*
   * 最終顯示 100%
   */
  updateLoadingProgress(
    completedAttempts,
    MAX_ATTEMPTS,
  );


  /*
   * =====================================================
   * 找不到
   * =====================================================
   */

  if (!bestSchedule) {
    state.result = null;

    localStorage.removeItem(
      STORAGE_KEYS.RESULT,
    );


    renderRounds();

    renderStats();

    renderMatrix();


    if (algorithmMessage) {
      algorithmMessage.textContent =
        "找不到符合條件的分組";
    }


    if (scoreValue) {
      scoreValue.textContent =
        "-";
    }


    throw new Error(
      "找不到符合目前設定的分組，請調整限制後再試。",
    );
  }


  return {
    schedule:
      bestSchedule,

    score:
      bestScore,

    validCount,

    attempts:
      completedAttempts,

    maxAttempts:
      MAX_ATTEMPTS,

    createdAt:
      new Date().toISOString(),
  };
}


/* =========================================================
   GENERATE BUTTON
========================================================= */

generateBtn?.addEventListener(
  "click",
  async () => {
    saveSettings();


    if (
      state.players.length < 5
    ) {
      showToast(
        "至少需要 5 位參加者",
      );

      return;
    }


    /*
     * 防止連續點擊
     */
    if (
      generateBtn.dataset.generating ===
      "true"
    ) {
      return;
    }


    generateBtn.dataset.generating =
      "true";

    generateBtn.disabled =
      true;


    state.result = null;

    localStorage.removeItem(
      STORAGE_KEYS.RESULT,
    );


    renderRounds();

    renderStats();

    renderMatrix();


    if (loading) {
      loading.classList.add(
        "show",
      );
    }


    resetLoadingProgress();


    /*
     * 讓 Loading 先出現
     */
    await yieldToBrowser();


    try {
      const result =
        await generateBestSchedule();


      state.result =
        result;


      saveJSON(
        STORAGE_KEYS.RESULT,
        result,
      );


      renderAll();


      showToast(
        `完成：${result.attempts.toLocaleString()} 次搜尋`,
      );
    } catch (error) {
      state.result =
        null;


      localStorage.removeItem(
        STORAGE_KEYS.RESULT,
      );


      renderRounds();

      renderStats();

      renderMatrix();


      showToast(
        error?.message ||
          "產生分組失敗",
      );
    } finally {
      if (loading) {
        loading.classList.remove(
          "show",
        );
      }


      generateBtn.disabled =
        false;


      generateBtn.dataset.generating =
        "false";
    }
  },
);


/* =========================================================
   CLEAR RESULT
========================================================= */

function clearResult(
  showMessage = true,
) {
  state.result =
    null;


  localStorage.removeItem(
    STORAGE_KEYS.RESULT,
  );


  renderRounds();

  renderStats();

  renderMatrix();


  if (algorithmMessage) {
    algorithmMessage.textContent =
      "尚未產生分組";
  }


  if (scoreValue) {
    scoreValue.textContent =
      "-";
  }


  if (showMessage) {
    showToast(
      "已清除分組結果",
    );
  }
}


resetResultBtn?.addEventListener(
  "click",
  () => {
    if (!state.result) {
      showToast(
        "目前沒有分組結果",
      );

      return;
    }


    clearResult(true);
  },
);


/* =========================================================
   RENDER ROUNDS
========================================================= */

function renderRounds() {
  if (!roundList) {
    return;
  }


  roundList.innerHTML =
    "";


  if (
    !state.result ||
    !state.result.schedule ||
    state.result.schedule.length === 0
  ) {
    roundList.innerHTML = `
      <section class="card">

        <div class="empty">

          <span
            class="material-symbols-rounded"
          >
            sports_tennis
          </span>

          <div class="empty-title">
            尚未產生分組
          </div>

          <div class="subtitle">
            加入至少 5 位球員後，
            點擊「自動分組」
          </div>

        </div>

      </section>
    `;

    return;
  }


  state.result.schedule.forEach(
    (match, index) => {
      const round =
        document.createElement(
          "section",
        );


      round.className =
        "round";


      round.innerHTML = `
        <div class="round-row">

          <span class="round-number">
            ${String(
              index + 1,
            ).padStart(2, "0")}
          </span>


          <div class="match">

            <div class="team">

              <span class="team-player">
                ${escapeHTML(
                  match.teamA[0],
                )}
              </span>

              <span class="team-player">
                ${escapeHTML(
                  match.teamA[1],
                )}
              </span>

            </div>


            <span class="vs">
              VS
            </span>


            <div class="team">

              <span class="team-player">
                ${escapeHTML(
                  match.teamB[0],
                )}
              </span>

              <span class="team-player">
                ${escapeHTML(
                  match.teamB[1],
                )}
              </span>

            </div>

          </div>


          <div class="referee">

            <span class="referee-label">
              裁判
            </span>

            <span class="referee-name">
              ${escapeHTML(
                match.referee,
              )}
            </span>

          </div>

        </div>
      `;


      roundList.appendChild(
        round,
      );
    },
  );
}


/* =========================================================
   RENDER STATS
========================================================= */

function renderStats() {
  if (!statsBody) {
    return;
  }


  statsBody.innerHTML =
    "";


  if (
    !state.result ||
    !state.result.schedule
  ) {
    if (statsSubtitle) {
      statsSubtitle.textContent =
        "尚無資料";
    }

    return;
  }


  const stats =
    calculateStats(
      state.players,
      state.result.schedule,
    );


  const totalRounds =
    state.result.schedule.length;


  if (statsSubtitle) {
    statsSubtitle.textContent =
      `共 ${totalRounds} 場`;
  }


  const averagePlay =
    state.players.length > 0
      ? (
          totalRounds * 4
        ) /
        state.players.length
      : 0;


  const sortedPlayers =
    [...state.players].sort(
      (a, b) => {
        if (
          stats[a].play !==
          stats[b].play
        ) {
          return (
            stats[a].play -
            stats[b].play
          );
        }


        return (
          stats[a].referee -
          stats[b].referee
        );
      },
    );


  sortedPlayers.forEach(
    (player) => {
      const data =
        stats[player];


      const percentage =
        totalRounds > 0
          ? Math.round(
              (
                data.play /
                totalRounds
              ) * 100,
            )
          : 0;


      let countClass =
        "";


      if (
        data.play <
        Math.floor(
          averagePlay,
        )
      ) {
        countClass =
          "count-warning";
      } else if (
        data.play >=
        Math.ceil(
          averagePlay,
        )
      ) {
        countClass =
          "count-good";
      }


      const tr =
        document.createElement(
          "tr",
        );


      tr.innerHTML = `
        <td>
          <strong>
            ${escapeHTML(
              player,
            )}
          </strong>
        </td>

        <td
          class="count ${countClass}"
        >
          ${data.play}
        </td>

        <td class="count">
          ${data.referee}
        </td>

        <td>
          ${data.rest}
        </td>

        <td>

          <div class="progress-wrap">

            <div class="progress">

              <div
                class="progress-value"
                style="width:${percentage}%"
              ></div>

            </div>

            <div class="progress-text">
              ${percentage}%
            </div>

          </div>

        </td>
      `;


      statsBody.appendChild(
        tr,
      );
    },
  );
}


/* =========================================================
   MATRIX CONTAINER
========================================================= */

function ensureMatrixContainer() {
  let card =
    document.getElementById(
      "matrixCard",
    );


  if (card) {
    return card;
  }


  card =
    document.createElement(
      "section",
    );


  card.id =
    "matrixCard";


  card.className =
    "card matrix-card";


  card.innerHTML = `
    <div class="card-header">

      <h2 class="card-title">
        上場表
      </h2>

      <span
        id="matrixSubtitle"
        class="subtitle"
      >
        人員 × 場次
      </span>

    </div>


    <div class="card-body">

      <div
        id="matrixContainer"
        class="matrix-wrap"
      ></div>


      <div class="matrix-legend">

        <span class="matrix-legend-item">

          <span class="matrix-play">
            ✓
          </span>

          上場

        </span>


        <span class="matrix-legend-item">

          <span class="matrix-referee">
            ○
          </span>

          裁判

        </span>


        <span class="matrix-legend-item">

          <span class="matrix-rest">
            —
          </span>

          休息

        </span>

      </div>

    </div>
  `;


  /*
   * 上場表放在比賽場次前面
   */
  if (roundList) {
    roundList.before(card);
  } else {
    document.body.appendChild(
      card,
    );
  }


  return card;
}


/* =========================================================
   RENDER MATRIX
 *
 * X = 場次
 * Y = 人員
========================================================= */

function renderMatrix() {
  const card =
    document.getElementById(
      "matrixCard",
    );


  if (!card) {
    return;
  }


  const container =
    card.querySelector(
      "#matrixContainer",
    );


  const subtitle =
    card.querySelector(
      "#matrixSubtitle",
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  if (
    !state.result ||
    !Array.isArray(
      state.result.schedule,
    ) ||
    state.result.schedule.length === 0
  ) {
    if (subtitle) {
      subtitle.textContent =
        "尚無資料";
    }

    return;
  }


  const schedule =
    state.result.schedule;


  if (subtitle) {
    subtitle.textContent =
      `人員 ${state.players.length} × 場次 ${schedule.length}`;
  }


  const table =
    document.createElement(
      "table",
    );


  table.className =
    "matrix-table";


  const thead =
    document.createElement(
      "thead",
    );


  const headerRow =
    document.createElement(
      "tr",
    );


  const corner =
    document.createElement(
      "th",
    );


  corner.className =
    "matrix-corner";


  corner.textContent =
    "人員 / 場次";


  headerRow.appendChild(
    corner,
  );


  schedule.forEach(
    (match, index) => {
      const th =
        document.createElement(
          "th",
        );


      th.className =
        "matrix-round-header";


      th.textContent =
        `${index + 1}`;


      th.title =
        `第 ${index + 1} 場`;


      headerRow.appendChild(
        th,
      );
    },
  );


  thead.appendChild(
    headerRow,
  );


  table.appendChild(
    thead,
  );


  const tbody =
    document.createElement(
      "tbody",
    );


  state.players.forEach(
    (player) => {
      const tr =
        document.createElement(
          "tr",
        );


      const playerTd =
        document.createElement(
          "td",
        );


      playerTd.className =
        "matrix-player";


      playerTd.textContent =
        player;


      playerTd.title =
        player;


      tr.appendChild(
        playerTd,
      );


      schedule.forEach(
        (match) => {
          const td =
            document.createElement(
              "td",
            );


          td.className =
            "matrix-cell";


          const playingSet =
            new Set([
              ...(match.teamA || []),
              ...(match.teamB || []),
            ]);


          const icon =
            document.createElement(
              "span",
            );


          icon.className =
            "matrix-icon";


          if (
            match.referee ===
            player
          ) {
            td.classList.add(
              "matrix-cell-referee",
            );


            td.title =
              "裁判";


            icon.textContent =
              "○";
          } else if (
            playingSet.has(
              player,
            )
          ) {
            td.classList.add(
              "matrix-cell-play",
            );


            td.title =
              "上場";


            icon.textContent =
              "✓";
          } else {
            td.classList.add(
              "matrix-cell-rest",
            );


            td.title =
              "休息";


            icon.textContent =
              "—";
          }


          td.appendChild(
            icon,
          );


          tr.appendChild(
            td,
          );
        },
      );


      tbody.appendChild(
        tr,
      );
    },
  );


  table.appendChild(
    tbody,
  );


  container.appendChild(
    table,
  );
}


/* =========================================================
   RENDER ALL
========================================================= */

function renderAll() {
  renderPlayers();

  renderRounds();

  renderStats();

  renderMatrix();


  if (summaryPlayers) {
    summaryPlayers.textContent =
      state.players.length;
  }


  if (summaryRounds) {
    summaryRounds.textContent =
      state.settings.rounds;
  }


  if (state.result) {
    if (algorithmMessage) {
      algorithmMessage.textContent =
        "分組完成";
    }


    if (scoreValue) {
      scoreValue.textContent =
        Math.round(
          state.result.score,
        ).toLocaleString();
    }
  }
}


/* =========================================================
   LOAD STATE
========================================================= */

function loadState() {
  const players =
    loadJSON(
      STORAGE_KEYS.PLAYERS,
      [],
    );


  const settings =
    loadJSON(
      STORAGE_KEYS.SETTINGS,
      {},
    );


  const result =
    loadJSON(
      STORAGE_KEYS.RESULT,
      null,
    );


  state.players =
    Array.isArray(players)
      ? players
      : [];


  state.settings = {
    rounds:
      Number(
        settings.rounds,
      ) || 10,

    attempts:
      Number(
        settings.attempts,
      ) || 5000,

    maxPlayStreak:
      Number(
        settings.maxPlayStreak,
      ) || 2,

    maxRestStreak:
      Number(
        settings.maxRestStreak,
      ) || 2,
  };


  state.result =
    result;


  /*
   * 舊結果驗證
   */
  if (
    state.result &&
    Array.isArray(
      state.result.schedule,
    )
  ) {
    const valid =
      isScheduleValid(
        state.players,
        state.result.schedule,
      );


    if (!valid) {
      state.result =
        null;


      localStorage.removeItem(
        STORAGE_KEYS.RESULT,
      );
    }
  }


  if (roundCount) {
    roundCount.value =
      state.settings.rounds;
  }


  if (attemptCount) {
    attemptCount.value =
      state.settings.attempts;
  }


  if (maxPlayStreak) {
    maxPlayStreak.value =
      state.settings.maxPlayStreak;
  }


  if (maxRestStreak) {
    maxRestStreak.value =
      state.settings.maxRestStreak;
  }


  ensureMatrixContainer();


  renderAll();
}


/* =========================================================
   COMPATIBILITY
 *
 * 如果你的 HTML 還有
 * generateScheduleBtn
 * 就讓它也可以觸發主流程。
========================================================= */

function generateSchedule() {
  generateBtn?.click();
}


document.addEventListener(
  "DOMContentLoaded",
  () => {
    const generateScheduleBtn =
      document.getElementById(
        "generateScheduleBtn",
      );


    /*
     * 避免同時綁定兩次
     */
    if (
      generateScheduleBtn &&
      generateScheduleBtn !==
        generateBtn
    ) {
      generateScheduleBtn.addEventListener(
        "click",
        generateSchedule,
      );
    }
  },
);


/* =========================================================
   START
========================================================= */

ensureMatrixContainer();

loadState();


/* =====================================================
   THEME
===================================================== */

const THEME_KEY =
  "BADMINTON_THEME";


const themeToggle =
  document.getElementById(
    "themeToggle",
  );


const themeIcon =
  document.getElementById(
    "themeIcon",
  );


/* =====================================================
   INIT THEME
===================================================== */

function initTheme() {
  const savedTheme =
    localStorage.getItem(
      THEME_KEY,
    );


  if (
    savedTheme === "light" ||
    savedTheme === "dark"
  ) {
    setTheme(
      savedTheme,
    );

    return;
  }


  const systemDark =
    window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;


  setTheme(
    systemDark
      ? "dark"
      : "light",
  );
}


/* =====================================================
   SET THEME
===================================================== */

function setTheme(theme) {
  document.documentElement.dataset.theme =
    theme;


  localStorage.setItem(
    THEME_KEY,
    theme,
  );


  updateThemeIcon(
    theme,
  );
}


/* =====================================================
   UPDATE THEME ICON
===================================================== */

function updateThemeIcon(
  theme,
) {
  if (!themeIcon) {
    return;
  }


  themeIcon.textContent =
    theme === "dark"
      ? "light_mode"
      : "dark_mode";


  if (themeToggle) {
    themeToggle.title =
      theme === "dark"
        ? "切換為淺色主題"
        : "切換為深色主題";
  }
}


/* =====================================================
   THEME TOGGLE
===================================================== */

themeToggle?.addEventListener(
  "click",
  () => {
    const currentTheme =
      document.documentElement
        .dataset.theme;


    setTheme(
      currentTheme === "dark"
        ? "light"
        : "dark",
    );
  },
);


/* =====================================================
   START THEME
===================================================== */

initTheme();
