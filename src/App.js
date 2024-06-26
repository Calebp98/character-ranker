import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const App = () => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newCharacterName, setNewCharacterName] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from('player_votes')
      .select('*');
    
    if (error) {
      console.error('Error fetching players:', error);
    } else {
      setPlayers(data);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const { error } = await supabase
      .from('player_votes')
      .insert([{ player_name: newPlayerName, votes: {} }]);

    if (error) {
      console.error('Error adding player:', error);
    } else {
      setNewPlayerName('');
      fetchPlayers();
    }
  };

  const handleAddCharacter = async (e) => {
    e.preventDefault();
    if (!newCharacterName.trim()) return;

    // We don't need to add the character to the database explicitly
    // It will be added when a player votes for it
    setNewCharacterName('');
    // Refresh the players to show the new character
    fetchPlayers();
  };

  const handleVote = async (characterName, voteChange) => {
    if (!selectedPlayer) return;

    const currentVotes = selectedPlayer.votes || {};
    const currentVote = currentVotes[characterName] || 0;
    const newVote = Math.max(0, currentVote + voteChange);

    const newVotes = { ...currentVotes, [characterName]: newVote };

    const { error } = await supabase
      .from('player_votes')
      .update({ votes: newVotes })
      .eq('id', selectedPlayer.id);

    if (error) {
      console.error('Error updating vote:', error);
    } else {
      fetchPlayers();
      setSelectedPlayer(prev => ({ ...prev, votes: newVotes }));
    }
  };

  const calculatePlayerCredits = (player) => {
    return 100 - Object.values(player.votes).reduce((sum, vote) => sum + vote, 0);
  };

  const allCharacters = Array.from(new Set(players.flatMap(player => Object.keys(player.votes))));

  return (
    <div style={{ padding: '1rem', maxWidth: '500px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Character Ranking App</h1>
      
      <form onSubmit={handleAddPlayer} style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          placeholder="Enter new player name"
          style={{ padding: '0.5rem', marginRight: '0.5rem', width: '70%' }}
        />
        <button
          type="submit"
          style={{ padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Add Player
        </button>
      </form>

      <select
        value={selectedPlayer ? selectedPlayer.id : ''}
        onChange={(e) => setSelectedPlayer(players.find(p => p.id === e.target.value))}
        style={{ padding: '0.5rem', marginBottom: '1rem', width: '100%' }}
      >
        <option value="">Select a player</option>
        {players.map(player => (
          <option key={player.id} value={player.id}>
            {player.player_name} (Credits: {calculatePlayerCredits(player)})
          </option>
        ))}
      </select>

      {selectedPlayer && (
        <p style={{ marginBottom: '1rem' }}>
          Selected Player: {selectedPlayer.player_name} (Credits: {calculatePlayerCredits(selectedPlayer)})
        </p>
      )}

      <form onSubmit={handleAddCharacter} style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={newCharacterName}
          onChange={(e) => setNewCharacterName(e.target.value)}
          placeholder="Enter new character name"
          style={{ padding: '0.5rem', marginRight: '0.5rem', width: '70%' }}
        />
        <button
          type="submit"
          style={{ padding: '0.5rem 1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Add Character
        </button>
      </form>

      <div>
        {allCharacters.map(character => (
          <div key={character} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: '#f0f0f0' }}>
            <span style={{ flexBasis: '40%' }}>{character}</span>
            <span style={{ flexBasis: '20%', textAlign: 'center' }}>
              Score: {players.reduce((sum, player) => sum + (player.votes[character] || 0), 0)}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', flexBasis: '40%', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleVote(character, 1)}
                disabled={!selectedPlayer || calculatePlayerCredits(selectedPlayer) <= 0}
                style={{ padding: '0.25rem 0.5rem', backgroundColor: 'green', color: 'white', marginRight: '0.5rem', opacity: (!selectedPlayer || calculatePlayerCredits(selectedPlayer) <= 0) ? 0.5 : 1 }}
              >
                +
              </button>
              <span style={{ minWidth: '30px', textAlign: 'center' }}>
                {selectedPlayer ? (selectedPlayer.votes[character] || 0) : 0}
              </span>
              <button
                onClick={() => handleVote(character, -1)}
                disabled={!selectedPlayer || !(selectedPlayer.votes[character] > 0)}
                style={{ padding: '0.25rem 0.5rem', backgroundColor: 'red', color: 'white', marginLeft: '0.5rem', opacity: (!selectedPlayer || !(selectedPlayer.votes[character] > 0)) ? 0.5 : 1 }}
              >
                -
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;