import { ValorantRoundTracker } from './valorant-round-tracker.js';

const tracker = new ValorantRoundTracker();
window.valorantRoundTracker = tracker;

const scoreboardBody = document.getElementById('scoreboardBody');

// Update the DOM (throttled from the tracker)
window.updateTrackerUI = () => {
  if (!tracker.me) return;

  // Combine all players into an array for easier display
  const allPlayers = Object.values(tracker.players);
  if (!allPlayers.includes(tracker.me)) allPlayers.push(tracker.me);

  // Clear table
  scoreboardBody.innerHTML = '';

  allPlayers.forEach(player => {
    const row = document.createElement('tr');
    if (player.is_local) row.classList.add('myPlayer');

    row.innerHTML = `
      <td>${player.name ?? '-'}</td>
      <td>${player.agent ?? '-'}</td>
      <td>${player.team ?? '-'}</td>
      <td>${player.money ?? '-'}</td>
      <td>${player.weapon ?? '-'}</td>
      <td>${JSON.stringify(player.is_local ? player.abilities : { C: false, Q: false, E: false, X: false })}</td>
      <td>${player.ultPoints ?? 0}/${player.ultMax ?? 0}</td>
    `;
    scoreboardBody.appendChild(row);
  });
};
