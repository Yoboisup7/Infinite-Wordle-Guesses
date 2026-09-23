// Paste the code directly into your console tab. Right click then at the bottom click inspect element then go to the console tab and paste the script in there and press enter
(async function streakFarm() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const MAX_GAMES = 1000000000000000000000; //You can change this to whatever you want

  const style = document.createElement('style');
  style.textContent = 'game-tile,.tile,game-row,game-tile *{animation:none!important;transition:none!important}';
  document.documentElement.appendChild(style);

  function app() {
    return document.querySelector('game-app');
  }

  function getSolution() {
    const fromApp = (app()?.solution || '').toString().trim().toLowerCase();
    if (/^[a-z]{5}$/.test(fromApp)) return fromApp;
    try {
      const fromState = (JSON.parse(localStorage.getItem('gameState') || '{}').solution || '')
        .toString().trim().toLowerCase();
      if (/^[a-z]{5}$/.test(fromState)) return fromState;
    } catch (e) {}
    return '';
  }

  function closeModals() {
    document.querySelector('game-modal')?.shadowRoot?.querySelector('button')?.click();
    app()?.shadowRoot?.querySelector('#close-icon')?.click();
  }

  async function typeAnswer(word) {
    const game = app();
    for (const ch of word) game.addLetter(ch);
    game.submitGuess();
    try { game.evaluateRow(); } catch (e) {}
    const start = performance.now();
    while (performance.now() - start < 1500) {
      const s = (game.gameStatus || JSON.parse(localStorage.getItem('gameState') || '{}').gameStatus || '');
      if (s === 'WIN' || s === 'CORRECT') return true;
      const rows = [...(game.shadowRoot?.querySelectorAll('game-row') || [])];
      if (rows.some((r) => (r.getAttribute('letters') || '') === word && r.hasAttribute('win'))) return true;
      await sleep(20);
    }
    return (getSolution() === word);
  }

  async function nextPuzzle() {
    const game = app();
    const old = getSolution();
    let next = old;
    try {
      const src = await fetch('https://gregcameron.com/infinite-wordle/main.js?v=2023-11-01').then((r) => r.text());
      const lists = [...src.matchAll(/\["[a-z]{5}"(?:, "[a-z]{5}")+\]/g)].map((m) => JSON.parse(m[0]));
      const answers = lists[0] || [];
      if (answers.length) {
        do {
          next = answers[Math.floor(Math.random() * answers.length)];
        } while (next === old && answers.length > 1);
      }
    } catch (e) {}

    localStorage.setItem('gameState', JSON.stringify({
      boardState: ['', '', '', '', '', ''],
      evaluations: [null, null, null, null, null, null],
      rowIndex: 0,
      solution: next,
      gameStatus: 'IN_PROGRESS',
      lastPlayedTs: Date.now(),
      lastCompletedTs: null,
      restoringFromLocalStorage: false,
      hardMode: false
    }));

    const fresh = document.createElement('game-app');
    game.replaceWith(fresh);
    await sleep(250);
    closeModals();
    return true;
  }

  closeModals();
  await sleep(200);

  for (let n = 1; n <= MAX_GAMES; n++) {
    closeModals();
    const word = getSolution();
    if (!/^[a-z]{5}$/.test(word)) {
      console.warn('No solution on this page. Stopping.');
      break;
    }
    console.log('Game', n, 'answer', word.toUpperCase());
    await typeAnswer(word);
    await nextPuzzle();
  }

  console.log('done');
})().catch(console.error);
