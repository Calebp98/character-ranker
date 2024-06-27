import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const App = () => {
  const [players, setPlayers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [allocations, setAllocations] = useState({});
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newCharacterName, setNewCharacterName] = useState('');
  const [voteLog, setVoteLog] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*');
    
    if (playersError) console.error('Error fetching players:', playersError);
    else setPlayers(playersData);

    const { data: charactersData, error: charactersError } = await supabase
      .from('characters')
      .select('*');
    
    if (charactersError) console.error('Error fetching characters:', charactersError);
    else setCharacters(charactersData);

    fetchVoteLog();
  };

  const fetchAllocations = async (playerId) => {
    const { data, error } = await supabase
      .from('allocations')
      .select('character_id, amount')
      .eq('player_id', playerId);

    if (error) console.error('Error fetching allocations:', error);
    else {
      const allocObj = {};
      data.forEach(alloc => {
        allocObj[alloc.character_id] = alloc.amount;
      });
      setAllocations(allocObj);
    }
  };

  const fetchVoteLog = async () => {
    const { data, error } = await supabase
      .from('vote_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) console.error('Error fetching vote log:', error);
    else setVoteLog(data);
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const { error } = await supabase
      .from('players')
      .insert([{ name: newPlayerName }]);

    if (error) console.error('Error adding player:', error);
    else {
      setNewPlayerName('');
      fetchData();
    }
  };

  const handleAddCharacter = async (e) => {
    e.preventDefault();
    if (!newCharacterName.trim()) return;

    const { error } = await supabase
      .from('characters')
      .insert([{ name: newCharacterName }]);

    if (error) console.error('Error adding character:', error);
    else {
      setNewCharacterName('');
      fetchData();
    }
  };

  const handleAllocate = async (characterId, amount) => {
    if (!selectedPlayer) return;

    const { data, error } = await supabase
      .rpc('allocate_credits', { 
        p_id: selectedPlayer.id, 
        char_id: characterId, 
        alloc_amount: amount 
      });

    if (error) {
      console.error('Error allocating credits:', error);
      alert('Failed to allocate credits. You may not have enough remaining credits.');
    } else {
      fetchAllocations(selectedPlayer.id);
      fetchData();
    }
  };

  const calculateRemainingCredits = () => {
    return 100 - Object.values(allocations).reduce((sum, amount) => sum + Math.abs(amount), 0);
  };

  const handlePlayerSelect = (playerId) => {
    const player = players.find(p => p.id === parseInt(playerId));
    setSelectedPlayer(player);
    if (player) fetchAllocations(player.id);
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', display: 'flex' }}>
      <div style={{ flex: 2, marginRight: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Character Ranking App</h1>

        <select
          value={selectedPlayer ? selectedPlayer.id : ''}
          onChange={(e) => handlePlayerSelect(e.target.value)}
          style={{ padding: '0.5rem', marginBottom: '1rem', width: '100%' }}
        >
          <option value="">Select a player</option>
          {players.map(player => (
            <option key={player.id} value={player.id}>
              {player.name}
            </option>
          ))}
        </select>

        {selectedPlayer && (
          <p style={{ marginBottom: '1rem' }}>
            Selected Player: {selectedPlayer.name} (Remaining Credits: {calculateRemainingCredits()})
          </p>
        )}

        <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', backgroundColor: '#f0f0f0', padding: '0.5rem', fontWeight: 'bold' }}>
            <span style={{ flexBasis: '40%' }}>Character</span>
            <span style={{ flexBasis: '30%', textAlign: 'center' }}>Score</span>
            <span style={{ flexBasis: '30%', textAlign: 'center' }}>Allocate Credits</span>
          </div>
          {characters.map((character) => (
            <div key={character.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '0.5rem',
              backgroundColor: 'white',
              borderTop: '1px solid #ddd'
            }}>
              <span style={{ flexBasis: '40%' }}>{character.name}</span>
              <span style={{ flexBasis: '30%', textAlign: 'center' }}>
                {character.score}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', flexBasis: '30%', justifyContent: 'center' }}>
                <input
                  type="number"
                  value={allocations[character.id] || 0}
                  onChange={(e) => handleAllocate(character.id, parseInt(e.target.value) || 0)}
                  disabled={!selectedPlayer}
                  style={{ width: '60px', padding: '0.25rem', textAlign: 'center' }}
                />
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

      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Allocation Log</h2>
        <div style={{ height: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '0.5rem' }}>
          {voteLog.map((log) => (
            <div key={log.id} style={{ marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
              <strong>{log.player_name}</strong> allocated {log.amount} credits to <strong>{log.character_name}</strong>
              <br />
              <small>{new Date(log.created_at).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;