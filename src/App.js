import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Analytics } from "@vercel/analytics/react"

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

    setNewCharacterName('');
    fetchPlayers();
  };

  const handleVote = async (characterName, voteChange) => {
    if (!selectedPlayer) return;

    const currentVotes = selectedPlayer.votes || {};
    const currentVote = currentVotes[characterName] || 0;
    const newVote = currentVote + voteChange;

    const playerCredits = calculatePlayerCredits(selectedPlayer);
    if (playerCredits < Math.abs(voteChange)) {
      alert('Not enough credits!');
      return;
    }

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
    return 100 - Object.values(player.votes).reduce((sum, vote) => sum + Math.abs(vote), 0);
  };

  const calculateTotalScore = (characterName) => {
    return players.reduce((sum, player) => sum + (player.votes[characterName] || 0), 0);
  };

  const allCharacters = Array.from(new Set(players.flatMap(player => Object.keys(player.votes))));
  const sortedCharacters = allCharacters
    .map(character => ({ name: character, score: calculateTotalScore(character) }))
    .sort((a, b) => b.score - a.score);

  return (
    <div style={{ padding: '1rem', maxWidth: '500px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Bridgerton S1 Character Ranking</h1>

      <select
        value={selectedPlayer ? selectedPlayer.id : ''}
        onChange={(e) => setSelectedPlayer(players.find(p => p.id === e.target.value))}
        style={{ padding: '0.5rem', marginBottom: '1rem', width: '100%' }}
      >
        <option value="">Select a user</option>
        {players.map(player => (
          <option key={player.id} value={player.id}>
            {player.player_name} (Credits: {calculatePlayerCredits(player)})
          </option>
        ))}
      </select>

      {selectedPlayer && (
        <p style={{ marginBottom: '1rem' }}>
          Selected User: {selectedPlayer.player_name} (Credits: {calculatePlayerCredits(selectedPlayer)})
        </p>
      )}

      <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', backgroundColor: '#f0f0f0', padding: '0.5rem', fontWeight: 'bold' }}>
          <span style={{ flexBasis: '10%', textAlign: 'center' }}>Rank</span>
          <span style={{ flexBasis: '40%' }}>Character</span>
          <span style={{ flexBasis: '20%', textAlign: 'center' }}>Score</span>
          <span style={{ flexBasis: '30%', textAlign: 'center' }}>Vote</span>
        </div>
        {sortedCharacters.map((character, index) => (
          <div key={character.name} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '0.5rem',
            backgroundColor: index % 2 === 0 ? '#f8f8f8' : 'white',
            borderTop: '1px solid #ddd'
          }}>
            <span style={{ flexBasis: '10%', textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</span>
            <span style={{ flexBasis: '40%' }}>{character.name}</span>
            <span style={{ flexBasis: '20%', textAlign: 'center' }}>{character.score}</span>
            <div style={{ display: 'flex', alignItems: 'center', flexBasis: '30%', justifyContent: 'center' }}>
              <button
                onClick={() => handleVote(character.name, 1)}
                disabled={!selectedPlayer || calculatePlayerCredits(selectedPlayer) <= 0}
                style={{ 
                  padding: '0.25rem 0.5rem', 
                  backgroundColor: 'green', 
                  color: 'white', 
                  marginRight: '0.5rem', 
                  opacity: (!selectedPlayer || calculatePlayerCredits(selectedPlayer) <= 0) ? 0.5 : 1,
                  cursor: 'pointer',
                  border: 'none',
                  borderRadius: '3px'
                }}
              >
                +
              </button>
              <span style={{ minWidth: '30px', textAlign: 'center' }}>
                {selectedPlayer ? (selectedPlayer.votes[character.name] || 0) : 0}
              </span>
              <button
                onClick={() => handleVote(character.name, -1)}
                disabled={!selectedPlayer || calculatePlayerCredits(selectedPlayer) <= 0}
                style={{ 
                  padding: '0.25rem 0.5rem', 
                  backgroundColor: 'red', 
                  color: 'white', 
                  marginLeft: '0.5rem', 
                  opacity: (!selectedPlayer || calculatePlayerCredits(selectedPlayer) <= 0) ? 0.5 : 1,
                  cursor: 'pointer',
                  border: 'none',
                  borderRadius: '3px'
                }}
              >
                -
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>Admin</h2>
      
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
    </div>
  );
};

export default App;