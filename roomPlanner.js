var calculate = require('calculate');

var roomPlanner =
{
    run: function(custom = false)
	{
		for (let room_name in Memory.rooms)
		{
			//Returns transports[source][miner/upgrader]
			let transports = calculate.idealTransports(room_name); //Using the room's maximum energy for that level, and the lengths of its paths, this calculates the ideal number of transports.

			let roomideal = {};
			let sourceideal = [{}, {}];

			roomideal.upgrader = 1; //Each room will always need a fatty upgrader.
			if (Game.rooms[room_name].controller.level == 1)
			{
				roomideal.dbuilder = 0;	//We can't build walls yet.
			}
			else if (Game.rooms[room_name].controller.level == 2)
			{
				require('defender').init(room_name);
				roomideal.dbuilder = 1;	//we can build walls now.
			}
			else if (Game.rooms[room_name].controller.level > 5)
			{
				//When our creeps get too big, we can't keep all roles alive.
				//Have just one transport of each type.
				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
				{
					transports[i].miner = 1;
					transports[i].upgrader = 1;
				}
			}
			roomideal.upgradecontainer = 1; //The fatty needs a container to sit on.
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				//Each source will always need a fatty harvester, and a certain number of mining transports and upgrading transports.
				sourceideal[i].harvester = 1;
				sourceideal[i].mtransport = transports[i].miner;	//This is an alias.
				sourceideal[i].utransport = transports[i].upgrader;	//This is an alias.
				sourceideal[i].builder = 1;	//We don't need an upgrade builder because the source builders patrol to it.
				sourceideal[i].miningcontainer = 1; //The fatty needs a container to sit on.
				sourceideal[i].extensions = 0;	//Initialize this so we can count it later.
				Memory.rooms[room_name].sources[i].ideal.extensions = 0;
			}

			//Commit our ideals for each role.
			for (let role in roomideal)
			{
				Memory.rooms[room_name].ideal[role] = roomideal[role];
			}
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				for (let role in sourceideal[i])
				{
					Memory.rooms[room_name].sources[i].ideal[role] = sourceideal[i][role];
				}
			}

			//What is our next goal? When we meet one goal, we may set a different goal.
			//Containers and roads are always accessable.
			//At level 1, we gain access to 1 spawn (obviously).
			//At level 2 we gain access to extensions, ramparts, and walls.
			//At level 3, we gain access to 1 tower.
			//At level 4, we gain access to 1 storage.
			//At level 5, we gain access to 2 towers and 2 links.
			//At level 6, we gain access to 3 links, 3 labs, a terminal, and an extractor.
			//At level 7, we gain access to 2 spawns, 3 towers, 4 links, 6 labs, and a factory.
			//At level 8, we gain access to 3 spawns, 6 towers, 6 links, 10 labs, an observer, a power spawn, and a nuker.
			//At level 8, rampart hp becomes equal to walls.
			switch(Game.rooms[room_name].controller.level)
			{
				case 1:
				{
					break;
				}
				default:
				{
					//Determine the number of extensions.
					let flipper = 0	//Cycling instead of toggling lets us be agnostic of how many sources are in the room.
					for (let i = 0; i < CONTROLLER_STRUCTURES.extension[Game.rooms[room_name].controller.level]; i++)
					{
						Memory.rooms[room_name].sources[flipper].ideal.extensions++
						flipper++
						if (flipper == Memory.rooms[room_name].sources.length)
						{
							flipper = 0;
						}
					}

					Memory.rooms[room_name].goals.extensions = CONTROLLER_STRUCTURES.extension[Game.rooms[room_name].controller.level]
					Memory.rooms[room_name].goals.level = Game.rooms[room_name].controller.level + 1;
					break;
				}
			}
		}
		
		return true; //We made it this far without any errors.
	},

	check: function()
	{
		for (let room_name in Memory.rooms)
		{
			//Have we gained a level since the last tick?
			if (Game.rooms[room_name].controller.level >= Memory.rooms[room_name].goals.level)
			{
				console.log("Level " + Game.rooms[room_name].controller.level + ".");
				if (Game.rooms[room_name].controller.level < 8)
				{
					Memory.rooms[room_name].goals.level = Game.rooms[room_name].controller.level + 1;
				}
				roomPlanner.run();
			}

			if (Game.rooms[room_name].controller.level > 1)
			{
				//Can we build extensions?
				if (Game.rooms[room_name].find(FIND_MY_STRUCTURES, {filter: { structureType: STRUCTURE_EXTENSION }}).length
					< Memory.rooms[room_name].sources.reduce(calculate.sourcereducer.idealextensions, 0))
				{
					//console.log("We're building extensions.");
					require('builder').buildExtensions(room_name);

					//Clear the extensions cache.
					calculate.extensions[room_name] = undefined;
				}
			}

			//Are we missing our upgrade container?
			let tcontainer;
			if (!Game.getObjectById(Memory.rooms[room_name].buildings.upgradecontainer.id))
			{
				let tpos = Memory.rooms[room_name].upgrade.slice(-1)[0];
				tpos = Game.rooms[room_name].getPositionAt(tpos.x, tpos.y);
				tcontainer = Game.rooms[room_name].lookForAt(LOOK_CONSTRUCTION_SITES, tpos);
				if (tcontainer.length == 0)
				{
					tcontainer = Game.rooms[room_name].lookForAt(LOOK_STRUCTURES, tpos);
				}
				//We have to get the container even if there's a road under it.
				for (let c = 0; c < tcontainer.length; c++)
				{
					if (tcontainer[c].structureType == "container")
					{
						tcontainer = tcontainer[c];
						break;
					}
				}

				//Now build it if it's missing. Save it if it's not.
				if (tcontainer.length == 0)
				{
					Game.rooms[room_name].createConstructionSite(tpos, STRUCTURE_CONTAINER);
				}
				else
				{
					Memory.rooms[room_name].buildings.upgradecontainer.id = tcontainer.id;
				}
				
			}

			//Are we missing any of our mining containers?
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				if (!Game.getObjectById(Memory.rooms[room_name].sources[i].buildings.miningcontainer.id))
				{
					tpos = Memory.rooms[room_name].sources[i].mfat[0];
					tpos = Game.rooms[room_name].getPositionAt(tpos.x, tpos.y);
					tcontainer = Game.rooms[room_name].lookForAt(LOOK_CONSTRUCTION_SITES, tpos);
					if (tcontainer.length == 0)
					{
						tcontainer = Game.rooms[room_name].lookForAt(LOOK_STRUCTURES, tpos);
					}
					//We have to get the container even if there's a road under it.
					for (let c = 0; c < tcontainer.length; c++)
					{
						if (tcontainer[c].structureType == "container")
						{
							tcontainer = tcontainer[c];
							break;
						}
					}

					//Now build it if it's missing. Save it if it's not.
					if (tcontainer.length == 0)
					{
						Game.rooms[room_name].createConstructionSite(tpos, STRUCTURE_CONTAINER);
					}
					else
					{
						Memory.rooms[room_name].sources[i].buildings.miningcontainer.id = tcontainer.id;
					}
				}
			}

			//Are we missing any of our towers?
			if (Game.rooms[room_name].find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}}).length < CONTROLLER_STRUCTURES.tower[Game.rooms[room_name].controller.level])
			{
				for (let t = 0; t < CONTROLLER_STRUCTURES.tower[Game.rooms[room_name].controller.level] && t < Memory.rooms[room_name].defense.towers.length; t++)
				{
					Game.rooms[room_name].createConstructionSite(Memory.rooms[room_name].defense.towers[t].x, Memory.rooms[room_name].defense.towers[t].y, STRUCTURE_TOWER);
				}
			}

			if (Game.rooms[room_name].controller.level > 1)
			{
				//Are we missing any of our walls, or do we need to finalize any finished ones?
				if (Array.isArray(Memory.rooms[room_name].defense.knownwalls) && Memory.rooms[room_name].defense.knownwalls.length == 0)
				{
					require('defender').checkDefense(room_name);
				}
				else
				{
					for (let w = 0; Array.isArray(Memory.rooms[room_name].defense.knownwalls) && w < Memory.rooms[room_name].defense.knownwalls.length; w++)
					{
						if (!Game.getObjectById(Memory.rooms[room_name].defense.knownwalls[w]))
						{
							Memory.rooms[room_name].defense.knownwalls.splice(w, 1);
							require('defender').checkDefense(room_name);
						}
						else if (Memory.rooms[room_name].defense.checkagain)
						{
							require('defender').checkDefense(room_name);
							Memory.rooms[room_name].defense.checkagain = undefined;
							break;
						}
					}
				}
			}
		}

		//Are there flags?
		let myflags = {Attack: [], Claims: [], Reserves: [], Signs: [], Transfer: []/*, Safe: [], Road: []*/};
		for (let flag in Game.flags)
		{
			//We currently aren't doing anything with Road flags.
			//Safe flags are handled elsewhere.
			for (let type in myflags)
			{
				if (flag.indexOf(type) != -1)
				{
					myflags[type].push(Game.flags[flag]);
					Game.flags[flag].remove();
					continue;
				}
			}
			/*if (flag.indexOf("Attack") != -1)
			{
				myflags.Attack.push(Game.flags[flag]);
				Game.flags[flag].remove();
			}
			else if (flag.indexOf("Spawn") != -1)
			{
				myflags.Spawn.push(Game.flags[flag]);
				Game.flags[flag].remove();
			}
			else if (flag.indexOf("Reserve") != -1)
			{
				myflags.Reserve.push(Game.flags[flag]);
				Game.flags[flag].remove();
			}
			else if (flag.indexOf("Sign") != -1)
			{
				myflags.Sign.push(Game.flags[flag]);
				Game.flags[flag].remove();
			}
			else if (flag.indexOf("Transfer") != -1)
			{
				myflags.Transfer.push(Game.flags[flag]);
				Game.flags[flag].remove();
			}*/
		}

		for (let type in myflags)
		{
			if(myflags[type].length != 0)
			{
				if (!Array.isArray(Memory[type.toLowerCase()]))
				{
					Memory[type.toLowerCase()] = myflags[type];
				}
				else
				{
					for (let c = 0; c < myflags[type].length; c++)
					{
						Memory[type.toLowerCase()].push({name: myflags[type][c].name, pos: myflags[type][c].pos});
						require('claim').init(Memory[type.toLowerCase()][Memory[type.toLowerCase()].length - 1], type.toLowerCase());
					}
				}
			}
		}
		/*if(myflags.Attack.length != 0)
		{
			if (!Array.isArray(Memory.attack))
			{
				Memory.attack = myflags.Attack;
			}
			else
			{
				for (let c = 0; c < myflags.Attack.length; c++)
				{
					Memory.attack.push({name: myflags.Attack[c].name, pos: myflags.Attack[c].pos});
					require('claim').init(Memory.attack[Memory.attack.length - 1], "attack");
				}
			}
			
		}
		/*if(myflags.Spawn.length != 0)
		{
			if (!Array.isArray(Memory.claims))
			{
				Memory.claims = myflags.Spawn;
			}
			else
			{
				for (let c = 0; c < myflags.Spawn.length; c++)
				{
					Memory.claims.push({name: myflags.Spawn[c].name, pos: myflags.Spawn[c].pos});
					require('claim').init(Memory.claims[Memory.claims.length - 1], "claims");
				}
			}
			
		}
		if(myflags.Reserve.length != 0)
		{
			if (!Array.isArray(Memory.reserves))
			{
				Memory.reserves = myflags.Reserve;
			}
			else
			{
				for (let c = 0; c < myflags.Reserve.length; c++)
				{
					Memory.claims.push({name: myflags.Reserve[c].name, pos: myflags.Reserve[c].pos});
					require('claim').init(Memory.reserves[Memory.reserves.length - 1], "reserves");
				}
			}
			
		}
		if(myflags.Sign.length != 0)
		{
			if (!Array.isArray(Memory.signs))
			{
				Memory.signs = myflags.Sign;
			}
			else
			{
				for (let c = 0; c < myflags.Sign.length; c++)
				{
					Memory.signs.push({name: myflags.Sign[c].name, pos: myflags.Sign[c].pos});
					require('claim').init(Memory.signs[Memory.signs.length - 1], "signs");
				}
			}
			
		}*/

		return true;	//We made it this far without any errors.
	},

	setupDefense(room_name = false)
	{
		if (!room_name)
		{
			for (let room_name in Memory.rooms)
			{
				roomPlanner.setupDefense(room_name);
			}
			return true;
		}

		//First we need to develop our perimiter. A 3-thick wall allows a builder to reach every wall.
		//However, walls cannot be built within 1 range of an exit block. So we will build ours at range 2, 3, and 4 from the exit.
		let terrain = new Room.Terrain(room_name);
		let exit = calculate.getExits(terrain, room_name);
		let defense = {walls: [], farwalls: [], safe: Memory.rooms[room_name].safe};
		delete Memory.rooms[room_name].safe;	//We're juggling this a bit. It will end up in Memory.rooms[room_name].defense.safe.
		for (let e = 0; e < exit.length; e++)
		{
			//We can count on exits to either be horizontal or vertical. They will always be at the edge of the room.
			let minimum = {x: exit[e][0].x - 4, y: exit[e][0].y - 4};
			let maximum = {x: exit[e][exit[e].length - 1].x + 4, y: exit[e][exit[e].length - 1].y + 4};

			for (let tx = minimum.x; tx <= maximum.x; tx++)
			{
				for (let ty = minimum.y; ty <= maximum.y; ty++)
				{
					//Are we outside of 1 range of the exit block? Don't go outside the room bounds. Don't select natural walls.
					if (((tx < minimum.x + 3 || tx > maximum.x - 3) || (ty < minimum.y + 3 || ty > maximum.y - 3))
					//if (((tx < minimum.x - 3 || tx > maximum.x + 3) || (ty < minimum.y - 3 || ty > maximum.y + 3))
							&&	(tx > -1 && tx < 50) && (ty > -1 && ty < 50)
							&& terrain.get(tx, ty) != 1)
					{
						defense.walls.push({x: tx, y: ty});
					}
				}
			}

			//Towers are most effective out to range 5.
		}

		//Save our defense information for this room.
		Memory.rooms[room_name].exits = exit;
		Memory.rooms[room_name].defense = defense;
		return true;	//We made it this far without any errors.
	}
};

module.exports = roomPlanner;