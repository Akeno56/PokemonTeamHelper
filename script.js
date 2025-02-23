document.addEventListener("DOMContentLoaded", () => {
    const maxPokemon = 6;
    let team = [];
    let typeChart = {};

    document.getElementById("addPokemon").addEventListener("click", addPokemonSlot);
    document.getElementById("calculate").addEventListener("click", calculateCoverage);
    document.getElementById("suggestBestPokemon").addEventListener("click", suggestBestPokemon);

    // Fetch type effectiveness data from PokéAPI
    async function fetchTypeChart() {
        const response = await fetch('https://pokeapi.co/api/v2/type/');
        const data = await response.json();
        const typePromises = data.results.map(type => fetch(type.url).then(res => res.json()));
        const types = await Promise.all(typePromises);

        types.forEach(type => {
            typeChart[type.name] = {
				weaknesses: type.damage_relations.double_damage_from.map(t => t.name),
				resistances: type.damage_relations.half_damage_from.map(t => t.name),
				immunities: type.damage_relations.no_damage_from.map(t => t.name),
				superEffective: type.damage_relations.double_damage_to.map(t => t.name),
				notEffective: type.damage_relations.half_damage_to.map(t => t.name),
				noEffect: type.damage_relations.no_damage_to.map(t => t.name)
            };
        });
    }

    fetchTypeChart();

    function addPokemonSlot() {
        if (team.length >= maxPokemon) return;
        const slotId = team.length + 1;
        team.push({ id: slotId, name: "", types: [], moves: [], ability: "", baseStats: {} });

        const pokemonSlot = document.createElement("div");
        pokemonSlot.className = "pokemonSlot";
        pokemonSlot.id = `pokemon${slotId}`;
        pokemonSlot.innerHTML = `
            <label for="pokemonSearch${slotId}">Search Pokémon:</label>
            <input type="text" class="pokemonSearch" id="pokemonSearch${slotId}" placeholder="Type a Pokémon name...">
            <div class="suggestions" id="suggestions${slotId}"></div>
            
            <p class="pokemonBaseStats" id="pokemonBaseStats${slotId}"></p>
            <label for="pokemonAbility${slotId}">Ability:</label>
            <select class="pokemonAbility" id="pokemonAbility${slotId}"></select>
            
            <p class="selectedPokemon" id="selectedPokemon${slotId}"></p>
            <p class="pokemonTypes" id="pokemonTypes${slotId}"></p>
            
            <label>Moves:</label>
            <input type="text" class="moveSearch" id="move${slotId}_1" placeholder="Search Move 1">
            <input type="text" class="moveSearch" id="move${slotId}_2" placeholder="Search Move 2">
            <input type="text" class="moveSearch" id="move${slotId}_3" placeholder="Search Move 3">
            <input type="text" class="moveSearch" id="move${slotId}_4" placeholder="Search Move 4">
        `;
        document.getElementById("teamContainer").appendChild(pokemonSlot);

        // Add event listeners for the new slot
        document.getElementById(`pokemonSearch${slotId}`).addEventListener("input", (e) => handlePokemonSearch(e, slotId));
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`move${slotId}_${i}`).addEventListener("input", (e) => handleMoveSearch(e, slotId, i));
        }
    }

    // Add the initial Pokémon slot on page load
    addPokemonSlot();

    async function fetchAllPokemon() {
        let allPokemon = [];
        let url = 'https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0';

        try {
            const response = await fetch(url);
            const data = await response.json();
            allPokemon = data.results;
        } catch (error) {
            console.error("Error fetching Pokémon data:", error);
        }

        return allPokemon;
    }

    async function handlePokemonSearch(event, slotId) {
        const query = event.target.value.toLowerCase();
        if (query.length < 3) {
            document.getElementById(`suggestions${slotId}`).innerHTML = "";
            return;
        }

        try {
            const allPokemon = await fetchAllPokemon();
            const suggestions = allPokemon.filter(pokemon => pokemon.name.includes(query));

            const suggestionsContainer = document.getElementById(`suggestions${slotId}`);
            suggestionsContainer.innerHTML = "";
            suggestions.forEach(pokemon => {
                const suggestion = document.createElement("div");
                suggestion.textContent = pokemon.name;
                suggestion.addEventListener("click", () => selectPokemon(pokemon.name, slotId));
                suggestionsContainer.appendChild(suggestion);
            });
        } catch (error) {
            console.error("Error fetching Pokémon data:", error);
        }
    }

    async function selectPokemon(name, slotId) {
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
            if (!response.ok) return;
            const data = await response.json();
            const types = data.types.map(t => t.type.name);
            const abilities = data.abilities.map(a => a.ability.name);
            const baseStats = data.stats.reduce((acc, stat) => {
                acc[stat.stat.name] = stat.base_stat;
                return acc;
            }, {});
            team[slotId - 1] = { id: slotId, name, types, moves: [], ability: abilities[0], baseStats };

            document.getElementById(`pokemonSearch${slotId}`).value = name; // Update the search bar with the selected Pokémon name
            document.getElementById(`selectedPokemon${slotId}`).textContent = `Selected: ${name}`;
            document.getElementById(`pokemonTypes${slotId}`).textContent = `Types: ${types.join(", ")}`;
			document.getElementById(`pokemonBaseStats${slotId}`).innerHTML = `
			  <div style="display: flex; flex-direction: column;">
				${Object.entries(baseStats).map(([stat, value]) => `
				  <div style="margin: 1px 0;">
					<span>${stat}: ${value}</span>
					<div style="width: 255px; height: 10px; background-color: #e0e0e0; border-radius: 2px; overflow: hidden;">
					  <div style="width: ${value}px; height: 100%; background-color: #76c7c0;"></div>
					</div>
				  </div>
				`).join("")}
			  </div>
			`
            const abilitySelect = document.getElementById(`pokemonAbility${slotId}`);
            abilitySelect.innerHTML = abilities.map(ability => `<option value="${ability}">${ability}</option>`).join("");
            document.getElementById(`suggestions${slotId}`).innerHTML = "";
        } catch (error) {
            console.error("Error selecting Pokémon:", error);
        }
    }

    async function fetchAllMoves() {
        let allMoves = [];
        let url = 'https://pokeapi.co/api/v2/move?limit=100000&offset=0';

        try {
            const response = await fetch(url);
            const data = await response.json();
            allMoves = data.results;
        } catch (error) {
            console.error("Error fetching move data:", error);
        }

        return allMoves;
    }

    async function handleMoveSearch(event, slotId, moveIndex) {
        const query = event.target.value.toLowerCase();
        if (query.length < 3) {
            document.getElementById(`suggestions${slotId}`).innerHTML = "";
            return;
        }

        try {
            const allMoves = await fetchAllMoves();
            const suggestions = allMoves.filter(move => move.name.includes(query));

            const suggestionsContainer = document.getElementById(`suggestions${slotId}`);
            suggestionsContainer.innerHTML = "";
            suggestions.forEach(move => {
                const suggestion = document.createElement("div");
                suggestion.textContent = move.name;
                suggestion.addEventListener("click", () => selectMove(move.name, slotId, moveIndex));
                suggestionsContainer.appendChild(suggestion);
            });
        } catch (error) {
            console.error("Error fetching move data:", error);
        }
    }

	async function selectMove(name, slotId, moveIndex) {
		team[slotId - 1].moves[moveIndex - 1] = name;
		document.getElementById(`move${slotId}_${moveIndex}`).value = name;
		const moveType = await fetchMoveData(name);
		const moveTypeElement = document.getElementById(`moveType${slotId}_${moveIndex}`);
		if (moveTypeElement) {
			moveTypeElement.textContent = `Type: ${moveType}`;
		}
		document.getElementById(`suggestions${slotId}`).innerHTML = "";
	}

    async function fetchMoveData(moveName) {
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/move/${moveName.toLowerCase()}`);
            if (!response.ok) return null;
            const data = await response.json();
            return data.type.name;
        } catch (error) {
            console.error("Error fetching move data:", error);
            return null;
        }
    }

    async function calculateCoverage() {
        let typeScores = {};

        // Initialize typeScores with all types and a score of 0
        Object.keys(typeChart).forEach(type => {
            typeScores[type] = {};
            team.forEach(pokemon => {
                typeScores[type][pokemon.name] = { defensive: 0, offensive: 0 };
            });
        });

        team.forEach(pokemon => {
            // Calculate defensive scores
            pokemon.types.forEach(type => {
                typeChart[type].weaknesses.forEach(weakness => {
                    typeScores[weakness][pokemon.name].defensive -= 1;
                });
                typeChart[type].resistances.forEach(resistance => {
                    typeScores[resistance][pokemon.name].defensive += 1;
                });
                typeChart[type].immunities.forEach(immunity => {
                    typeScores[immunity][pokemon.name].defensive += 3;
                });
            });

            // Calculate offensive scores
            pokemon.moves.forEach(async move => {
                const moveType = await fetchMoveData(move);
                Object.keys(typeChart).forEach(type => {
                    if (typeChart[type].superEffective.includes(moveType)) {
                        typeScores[type][pokemon.name].offensive += 1;
                    } else if (typeChart[type].notEffective.includes(moveType)) {
                        typeScores[type][pokemon.name].offensive -= 1;
                    } else if (typeChart[type].noEffect.includes(moveType)) {
                        typeScores[type][pokemon.name].offensive -= 3;
                    }
                });
            });
        });

		let coverageTable = document.getElementById("coverageScores");
		coverageTable.innerHTML = "<tr><th>Type</th>" + team.map(pokemon => `<th>${pokemon.name}</th>`).join("") + "</tr>";
		Object.keys(typeScores).slice(0, -2).forEach(type => {
			let row = `<tr><td>${type}</td>` + team.map(pokemon => {
				let score = typeScores[type][pokemon.name].defensive + typeScores[type][pokemon.name].offensive;
				let color = score > 0 ? 'green' : score < 0 ? 'red' : 'white';
				return `<td style="color: ${color};">${score}</td>`;
			}).join("") + `</tr>`;
			coverageTable.innerHTML += row;
		});
    
	// Calculate and add the Total row
		let totalRow = `<tr><td>Total</td>`;
		team.forEach(pokemon => {
			let totalScore = Object.keys(typeScores).slice(0, -2).reduce((sum, type) => {
				return sum + (typeScores[type][pokemon.name].defensive + typeScores[type][pokemon.name].offensive);
			}, 0);
			let color = totalScore > 0 ? 'green' : totalScore < 0 ? 'red' : 'white';
			totalRow += `<td style="color: ${color};">${totalScore}</td>`;
		});
		totalRow += `</tr>`;
		coverageTable.innerHTML += totalRow;
	}
	
	async function suggestBestPokemon() {
		const enemyType1 = document.getElementById("enemyType1").value;
		const enemyType2 = document.getElementById("enemyType2").value;
		let bestScore = -Infinity;
		let bestPokemon = "";

		for (const pokemon of team) {
			let defenseScore = 0;
			for (const type of pokemon.types) {
				if (typeChart[enemyType1].weaknesses.includes(type)) defenseScore += 1;
				else if (typeChart[enemyType1].resistances.includes(type)) defenseScore -= 1;
				else if (typeChart[enemyType1].immunities.includes(type)) defenseScore -= 3;

				if (enemyType2) {
					if (typeChart[enemyType2].weaknesses.includes(type)) defenseScore += 1;
					else if (typeChart[enemyType2].resistances.includes(type)) defenseScore -= 1;
					else if (typeChart[enemyType2].immunities.includes(type)) defenseScore -= 3;
				}
			}

			if (defenseScore > bestScore) {
				bestScore = defenseScore;
				bestPokemon = pokemon.name;
			}
		}
		document.getElementById("bestPokemonSuggestion").textContent = bestPokemon ? `Best Offensive choice: ${bestPokemon}` : "No suggestion available";
	}
});