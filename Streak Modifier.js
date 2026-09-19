// Paste the code directly into your console tab. Right click then at the bottom click inspect element then go to the console tab and paste the script in there and press enter.
(function setStreaks() {
  const current = Number(prompt('Enter what you would like to set your current streak to', ''));
  const max = Number(prompt('Enter what you would like to set your max streak to', String(current)));
  if (!Number.isFinite(current) || !Number.isFinite(max)) return;

  const stats = JSON.parse(localStorage.getItem('statistics') || '{}');
  stats.currentStreak = current;
  stats.maxStreak = Math.max(max, current);
  stats.gamesPlayed = Math.max(stats.gamesPlayed || 0, current);
  stats.gamesWon = Math.max(stats.gamesWon || 0, current);
  stats.winPercentage = stats.gamesPlayed
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 100;
  stats.guesses = stats.guesses || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, fail: 0 };
  localStorage.setItem('statistics', JSON.stringify(stats));
  console.log('Saved', stats);

  const app = document.querySelector('game-app');
  try { app.showStatsModal(); } catch (e) {}
})();
