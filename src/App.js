import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { Analytics } from "@vercel/analytics/react";

const App = () => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newCharacterName, setNewCharacterName] = useState("");
  const [sortByOwnScore, setSortByOwnScore] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase.from("player_votes").select("*");

    if (error) {
      console.error("Error fetching players:", error);
    } else {
      setPlayers(data);
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const { error } = await supabase
      .from("player_votes")
      .insert([{ player_name: newPlayerName, votes: {} }]);

    if (error) {
      console.error("Error adding player:", error);
    } else {
      setNewPlayerName("");
      fetchPlayers();
    }
  };

  const handleAddCharacter = async (e) => {
    e.preventDefault();
    if (!newCharacterName.trim()) {
      alert("Character name cannot be empty");
      return;
    }

    try {
      // First, get all current players
      const { data: currentPlayers, error: fetchError } = await supabase
        .from("player_votes")
        .select("*");

      if (fetchError) {
        throw new Error(`Error fetching players: ${fetchError.message}`);
      }

      console.log("Current players:", currentPlayers);

      // Update each player's votes individually
      for (const player of currentPlayers) {
        const updatedVotes = { ...(player.votes || {}), [newCharacterName]: 0 };

        const { error: updateError } = await supabase
          .from("player_votes")
          .update({ votes: updatedVotes })
          .eq("id", player.id);

        if (updateError) {
          throw new Error(
            `Error updating player ${player.id}: ${updateError.message}`
          );
        }
      }

      console.log("Updates applied successfully");

      setNewCharacterName("");
      await fetchPlayers(); // Refresh the player data
      alert(`Character "${newCharacterName}" has been added successfully!`);
    } catch (error) {
      console.error("Error in handleAddCharacter:", error);
      alert(`Failed to add character: ${error.message}`);
    }
  };

  const handleVote = async (characterName, voteChange) => {
    if (!selectedPlayer) return;

    const currentVotes = selectedPlayer.votes || {};
    const currentVote = currentVotes[characterName] || 0;
    const newVote = currentVote + voteChange;

    const playerCredits = calculatePlayerCredits(selectedPlayer);

    // Allow voting if it's withdrawing a previous vote or if there are enough credits
    if (voteChange * currentVote < 0 || playerCredits >= Math.abs(voteChange)) {
      const newVotes = { ...currentVotes, [characterName]: newVote };

      // Remove the character from votes if the new vote is 0
      if (newVote === 0) {
        delete newVotes[characterName];
      }

      const { error } = await supabase
        .from("player_votes")
        .update({ votes: newVotes })
        .eq("id", selectedPlayer.id);

      if (error) {
        console.error("Error updating vote:", error);
      } else {
        fetchPlayers();
        setSelectedPlayer((prev) => ({ ...prev, votes: newVotes }));
      }
    } else {
      alert("Not enough credits!");
    }
  };

  const calculatePlayerCredits = (player) => {
    return (
      100 -
      Object.values(player.votes || {}).reduce(
        (sum, vote) => sum + Math.abs(vote),
        0
      )
    );
  };

  const calculateTotalScore = (characterName) => {
    return players.reduce(
      (sum, player) => sum + (player.votes[characterName] || 0),
      0
    );
  };

  const getSortedCharacters = () => {
    const allCharacters = Array.from(
      new Set(players.flatMap((player) => Object.keys(player.votes || {})))
    );

    if (sortByOwnScore && selectedPlayer) {
      return allCharacters
        .map((character) => ({
          name: character,
          score: selectedPlayer.votes[character] || 0,
          groupScore: calculateTotalScore(character),
        }))
        .sort((a, b) => b.score - a.score);
    } else {
      return allCharacters
        .map((character) => ({
          name: character,
          score: calculateTotalScore(character),
          ownScore: selectedPlayer ? selectedPlayer.votes[character] || 0 : 0,
        }))
        .sort((a, b) => b.score - a.score);
    }
  };

  const toggleSortOrder = () => {
    setSortByOwnScore(!sortByOwnScore);
  };

  const getPlayerFavorites = (player) => {
    const votes = player.votes || {};
    if (Object.keys(votes).length === 0)
      return { favorite: "None", least_favorite: "None" };

    const favorite = Object.keys(votes).reduce((a, b) =>
      votes[a] > votes[b] ? a : b
    );
    const least_favorite = Object.keys(votes).reduce((a, b) =>
      votes[a] < votes[b] ? a : b
    );

    return { favorite, least_favorite };
  };

  const sortedCharacters = getSortedCharacters();

  return (
    <div style={{ padding: "1rem", maxWidth: "500px", margin: "0 auto" }}>
      <Analytics />
      <h1
        style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Bridgerton S1 Character Ranking
      </h1>

      <select
        value={selectedPlayer ? selectedPlayer.id : ""}
        onChange={(e) =>
          setSelectedPlayer(players.find((p) => p.id === e.target.value))
        }
        style={{ padding: "0.5rem", marginBottom: "1rem", width: "100%" }}
      >
        <option value="">Select a user</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.player_name} (Credits: {calculatePlayerCredits(player)})
          </option>
        ))}
      </select>

      {selectedPlayer && (
        <p style={{ marginBottom: "1rem" }}>
          Selected User: {selectedPlayer.player_name} (Credits:{" "}
          {calculatePlayerCredits(selectedPlayer)})
        </p>
      )}

      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "1rem" }}
      >
        <span style={{ marginRight: "1rem" }}>Sort by: Group Score</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={sortByOwnScore}
            onChange={toggleSortOrder}
          />
          <span className="slider round"></span>
        </label>
        <span style={{ marginLeft: "1rem" }}>Own Score</span>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "4px",
          overflow: "hidden",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            backgroundColor: "#f0f0f0",
            padding: "0.5rem",
            fontWeight: "bold",
          }}
        >
          <span style={{ flexBasis: "10%", textAlign: "center" }}>Rank</span>
          <span style={{ flexBasis: "35%" }}>Character</span>
          <span style={{ flexBasis: "20%", textAlign: "center" }}>
            Group Score
          </span>
          <span style={{ flexBasis: "20%", textAlign: "center" }}>
            {selectedPlayer
              ? `${selectedPlayer.player_name}'s Score`
              : "Own Score"}
          </span>
          <span style={{ flexBasis: "15%", textAlign: "center" }}>Vote</span>
        </div>
        {sortedCharacters.map((character, index) => (
          <div
            key={character.name}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0.5rem",
              backgroundColor: index % 2 === 0 ? "#f8f8f8" : "white",
              borderTop: "1px solid #ddd",
            }}
          >
            <span
              style={{
                flexBasis: "10%",
                textAlign: "center",
                fontWeight: "bold",
              }}
            >
              {index + 1}
            </span>
            <span style={{ flexBasis: "35%" }}>{character.name}</span>
            <span style={{ flexBasis: "20%", textAlign: "center" }}>
              {sortByOwnScore ? character.groupScore : character.score}
            </span>
            <span style={{ flexBasis: "20%", textAlign: "center" }}>
              {sortByOwnScore ? character.score : character.ownScore}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexBasis: "15%",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => handleVote(character.name, 1)}
                disabled={
                  !selectedPlayer ||
                  (calculatePlayerCredits(selectedPlayer) <= 0 &&
                    (selectedPlayer.votes[character.name] || 0) >= 0)
                }
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "green",
                  color: "white",
                  marginRight: "0.5rem",
                  opacity:
                    !selectedPlayer ||
                    (calculatePlayerCredits(selectedPlayer) <= 0 &&
                      (selectedPlayer.votes[character.name] || 0) >= 0)
                      ? 0.5
                      : 1,
                  cursor: "pointer",
                  border: "none",
                  borderRadius: "3px",
                }}
              >
                +
              </button>
              <button
                onClick={() => handleVote(character.name, -1)}
                disabled={
                  !selectedPlayer ||
                  (calculatePlayerCredits(selectedPlayer) <= 0 &&
                    (selectedPlayer.votes[character.name] || 0) <= 0)
                }
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "red",
                  color: "white",
                  marginLeft: "0.5rem",
                  opacity:
                    !selectedPlayer ||
                    (calculatePlayerCredits(selectedPlayer) <= 0 &&
                      (selectedPlayer.votes[character.name] || 0) <= 0)
                      ? 0.5
                      : 1,
                  cursor: "pointer",
                  border: "none",
                  borderRadius: "3px",
                }}
              >
                -
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2
        style={{
          fontSize: "1.2rem",
          fontWeight: "bold",
          marginTop: "2rem",
          marginBottom: "1rem",
        }}
      >
        User Favorites
      </h2>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "4px",
          overflow: "hidden",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            backgroundColor: "#f0f0f0",
            padding: "0.5rem",
            fontWeight: "bold",
          }}
        >
          <span style={{ flexBasis: "40%" }}>Player</span>
          <span style={{ flexBasis: "30%" }}>Favorite</span>
          <span style={{ flexBasis: "30%" }}>Least Favorite</span>
        </div>
        {players.map((player, index) => {
          const { favorite, least_favorite } = getPlayerFavorites(player);
          return (
            <div
              key={player.id}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0.5rem",
                backgroundColor: index % 2 === 0 ? "#f8f8f8" : "white",
                borderTop: "1px solid #ddd",
              }}
            >
              <span style={{ flexBasis: "40%" }}>{player.player_name}</span>
              <span style={{ flexBasis: "30%" }}>
                {favorite} ({player.votes[favorite] || 0})
              </span>
              <span style={{ flexBasis: "30%" }}>
                {least_favorite} ({player.votes[least_favorite] || 0})
              </span>
            </div>
          );
        })}
      </div>

      <h2
        style={{
          fontSize: "1.2rem",
          fontWeight: "bold",
          marginBottom: "1rem",
          borderBottom: "1px solid #ddd",
          paddingBottom: "0.5rem",
        }}
      >
        Admin
      </h2>

      <form onSubmit={handleAddPlayer} style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          placeholder="Enter new player name"
          style={{ padding: "0.5rem", marginRight: "0.5rem", width: "70%" }}
        />
        <button
          type="submit"
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Add Player
        </button>
      </form>

      <form onSubmit={handleAddCharacter} style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          value={newCharacterName}
          onChange={(e) => setNewCharacterName(e.target.value)}
          placeholder="Enter new character name"
          style={{ padding: "0.5rem", marginRight: "0.5rem", width: "70%" }}
        />
        <button
          type="submit"
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Add Character
        </button>
      </form>

      <style jsx>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.4s;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.4s;
        }

        input:checked + .slider {
          background-color: #2196f3;
        }

        input:checked + .slider:before {
          transform: translateX(26px);
        }

        .slider.round {
          border-radius: 34px;
        }

        .slider.round:before {
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
};

export default App;
