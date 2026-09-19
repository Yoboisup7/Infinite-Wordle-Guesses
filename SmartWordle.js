(async function smartWordle() {
  const LIST_URL = 'https://raw.githubusercontent.com/Yoboisup7/Infinite-Wordle-Guesses/refs/heads/main/infinite-wordle-guesses.txt';
  const FIRST = 'AUDIO';
  const SECOND = 'CHEST';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rejected = new Set();

  function roots() {
    const out = [document];
    const walk = (n) => {
      for (const el of n.querySelectorAll('*')) {
        if (el.shadowRoot) {
          out.push(el.shadowRoot);
          walk(el.shadowRoot);
        }
      }
    };
    walk(document);
    return out;
  }

  function findKeyButton(letter) {
    const want = letter.toLowerCase();
    for (const root of roots()) {
      const exact = root.querySelector(`[data-key="${want}"]`);
      if (exact && !exact.closest('game-modal')) return exact;
    }
    for (const root of roots()) {
      for (const b of root.querySelectorAll('button')) {
        if (b.closest('game-modal')) continue;
        const t = (b.textContent || '').trim().toLowerCase();
        const dk = (b.getAttribute('data-key') || '').toLowerCase();
        if (want === 'enter' && (t === 'enter' || dk === 'enter' || dk === '↵')) return b;
        if (want === 'backspace' && (dk === 'backspace' || dk === '←')) return b;
        if (t === want && t.length === 1) return b;
      }
    }
    return null;
  }

  function tap(letter) {
    const btn = findKeyButton(letter);
    if (btn) {
      btn.click();
      return;
    }
    const special = letter === 'enter' || letter === 'backspace';
    const key = letter === 'enter' ? 'Enter' : letter === 'backspace' ? 'Backspace' : letter.toLowerCase();
    const code = letter === 'enter' ? 'Enter' : letter === 'backspace' ? 'Backspace' : 'Key' + letter.toUpperCase();
    const keyCode = letter === 'enter' ? 13 : letter === 'backspace' ? 8 : key.toUpperCase().charCodeAt(0);
    document.dispatchEvent(new KeyboardEvent('keydown', { key, code, keyCode, which: keyCode, bubbles: true }));
  }

  async function typeWord(word) {
    const app = document.querySelector('game-app');
    const before = readBoard().length;
    const w = word.toUpperCase();
    for (const ch of w.toLowerCase()) app.addLetter(ch);
    app.submitGuess();

    const start = performance.now();
    while (performance.now() - start < 2000) {
      const board = readBoard();
      const row = board.find((r) => r.word === w);
      if (board.length > before && row && /^[GYB]{5}$/.test(row.colors)) return board;
      await sleep(30);
    }
    return readBoard();
  }

  async function wipeRow() {
    const app = document.querySelector('game-app');
    for (let i = 0; i < 6; i++) app.removeLetter();
    await sleep(150);
  }

  function boardEl() {
    for (const root of roots()) {
      const b = root.querySelector('#board');
      if (b) return b;
    }
    return null;
  }

  function gameRows() {
    const board = boardEl();
    return board ? [...board.querySelectorAll('game-row')].slice(0, 6) : [];
  }

  function tileLetter(t) {
    return (t.getAttribute('letter') || t.textContent || '').trim().toUpperCase().slice(0, 1);
  }

  function tileColor(t) {
    const vals = [
      t.getAttribute('evaluation'),
      t.getAttribute('data-state'),
      t.shadowRoot?.querySelector('[data-state]')?.getAttribute('data-state'),
      t.shadowRoot?.querySelector('.tile')?.getAttribute('data-state'),
      t.shadowRoot?.querySelector('.tile')?.getAttribute('evaluation'),
    ].map((v) => (v || '').toLowerCase());

    if (vals.includes('correct')) return 'G';
    if (vals.includes('present')) return 'Y';
    if (vals.includes('absent')) return 'B';
    return '';
  }

  function rowTiles(row) {
    const tiles = [];
    for (const root of [row, row.shadowRoot]) {
      if (!root) continue;
      tiles.push(...root.querySelectorAll('game-tile'));
    }
    return tiles;
  }

  function readBoard() {
    const rows = [];
    for (const row of gameRows()) {
      const word = (row.getAttribute('letters') || '').toUpperCase();
      const nodes = [];
      const walk = (root) => {
        if (!root) return;
        nodes.push(...root.querySelectorAll('game-tile'));
        for (const el of root.querySelectorAll('*')) {
          if (el.shadowRoot) walk(el.shadowRoot);
        }
      };
      walk(row);
      if (row.shadowRoot) walk(row.shadowRoot);

      const tiles = nodes.filter((n, i, arr) => arr.indexOf(n) === i).slice(0, 5);
      const colors = tiles.map(tileColor).join('');
      console.log('ROW DEBUG', { word, tileCount: tiles.length, colors, first: tiles[0] });

      if (/^[A-Z]{5}$/.test(word) && /^[GYB]{5}$/.test(colors)) {
        rows.push({ word, colors });
      }
    }
    return rows;
  }

  async function playAnother() {
    const game = document.querySelector('game-app');
    try { game.showStatsModal(); } catch (e) {}
    await sleep(500);

    for (const root of roots()) {
      const btn = root.querySelector('#another-button');
      if (btn) {
        console.log('Clicking #another-button');
        btn.click();
        return true;
      }
    }

    if (game && game.gameStatus && game.gameStatus !== 'IN_PROGRESS') {
      console.log('Reloading next puzzle');
      window.location = window.location.href.split('?')[0];
      return true;
    }

    console.warn('Could not find ANOTHER!');
    return false;
  }

  function pattern(guess, answer) {
    guess = guess.toUpperCase();
    answer = answer.toUpperCase();
    const out = Array(5).fill('B');
    const used = Array(5).fill(false);
    for (let i = 0; i < 5; i++) if (guess[i] === answer[i]) { out[i] = 'G'; used[i] = true; }
    for (let i = 0; i < 5; i++) {
      if (out[i] === 'G') continue;
      for (let j = 0; j < 5; j++) {
        if (!used[j] && guess[i] === answer[j]) { out[i] = 'Y'; used[j] = true; break; }
      }
    }
    return out.join('');
  }

  function pick(matches) {
    if (matches.length <= 2) return matches[0];
    let best = matches[0], bestScore = Infinity;
    for (const g of matches.slice(0, 180)) {
      const buckets = new Map();
      for (const a of matches) {
        const p = pattern(g, a);
        buckets.set(p, (buckets.get(p) || 0) + 1);
      }
      let s = 0;
      for (const n of buckets.values()) s += n * n;
      if (s < bestScore) { bestScore = s; best = g; }
    }
    return best;
  }

  const WORDS = [...new Set((await fetch(LIST_URL).then((r) => {
    if (!r.ok) throw new Error('GitHub list failed');
    return r.text();
  })).split(/\s+/).map((w) => w.trim().toUpperCase()).filter((w) => /^[A-Z]{5}$/.test(w)))];
  console.log('Loaded', WORDS.length, 'words');

  document.querySelector('game-modal')?.shadowRoot?.querySelector('button')?.click();
  await sleep(300);

  const MAX_GAMES = 100;

  for (let game = 1; game <= MAX_GAMES; game++) {
    console.log('===== GAME', game, '=====');
    const typed = new Set();
    rejected.clear();

    for (let turn = 0; turn < 6; turn++) {
      const board = readBoard();
      console.log('BOARD READ:', board);
      if (board.at(-1)?.colors === 'GGGGG') break;
      if (board.length >= 6) break;

      const already = new Set(board.map((r) => r.word));
      const matches = WORDS.filter((w) =>
        !rejected.has(w) && !already.has(w) && !typed.has(w) &&
        board.every((row) => pattern(row.word, w) === row.colors)
      );
      console.log(matches.length, 'possible:', matches.slice(0, 20));

      let guess;
      if (board.length === 0) guess = FIRST;
      else if (board.length === 1) guess = SECOND;
      else if (!matches.length) break;
      else guess = pick(matches);

      console.log('Typing', guess);
      typed.add(guess);
      const after = await typeWord(guess);
      console.log('AFTER TYPE:', after);
      if (after.some((r) => r.word === guess)) {
        if (after.at(-1)?.colors === 'GGGGG') break;
        continue;
      }
      console.warn(guess, 'never scored');
      rejected.add(guess);
      await wipeRow();
      turn--;
      continue;
    }

    const finished = readBoard();
    if (finished.at(-1)?.colors === 'GGGGG') {
      console.log('Solved', finished);
    } else if (finished.length >= 6) {
      console.log('Out of rows', finished);
    } else {
      console.log('Still mid-puzzle', finished);
      continue;
    }
    if (!(await playAnother())) break;
  }

  console.log('done');
})().catch(console.error);
