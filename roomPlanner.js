var calculate = require('calculate');

var roomPlanner =
{
	run: function(room_name = false, test = false)
	{
		if (!room_name)
		{
			for (let room_name in Memory.rooms)
			{
				roomPlanner.run(room_name);
			}
			return true;
		}

		//Returns transports[source][miner/upgrader]
		let transports = [];
		if (Game.rooms[room_name].controller.level > 5 || Game.rooms[room_name].controller.level == 1)	//Having one of each at level 1 works around an issue.
		{
			//When our creeps get too big, we can't keep all roles alive.
			//Have just one transport of each type.
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				transports[i] = {miner: 1, upgrader: 1};
			}
		}
		else
		{
			transports = calculate.idealTransports(room_name); //Using the room's maximum energy for that level, and the lengths of its paths, this calculates the ideal number of transports.
		}

		let roomideal = {};
		let sourceideal = [{}, {}];

		roomideal.upgrader = 1; //Each room will always need a fatty upgrader.
		switch(Game.rooms[room_name].controller.level)
		{
			case 1:
				//Did init succeed?
				if (Memory.rooms[room_name].init === 1)
				{
					//Finalize the room.
					require('defender').init(room_name);
					roomPlanner.setupMining(room_name);	//Prepare our lab stamp.
					require('empire').room.exitpaths(room_name, true);	//Call this again to go around the towers and lab stamp.
					require('defender').setRamparts(room_name);	//Now that we have gone around towers, set our ramparts.
					require('defender').setDefense(room_name);	//Now that ramparts have been set, we can run the build.
					Memory.rooms[room_name].spawnsmarked = undefined;
					Memory.rooms[room_name].spawnsblocked = undefined;
					calculate.cleanpaths(room_name, 'all');
					if (!test)
					{
						calculate.deleteoldpaths(room_name, 'init');
						calculate.deleteoldpaths(room_name, 'defender');
						calculate.deleteoldpaths(room_name, 'labs');
					}
					Memory.rooms[room_name].init = 2;
					console.log('Init 2 ' + Game.cpu.getUsed());

					roomideal.dbuilder = 0;	//We can't build walls yet.
				}
				else if (Game.cpu.bucket >= 600 && Memory.rooms[room_name].init !== 2)
				{
					//Keep trying until we succeed.
					//console.log('Trying again.');
					Memory.rooms[room_name] = undefined;
					return require('init').run(room_name);
				}
				else
				{
					return false;
				}
				break;
			case 2:
				Memory.rooms[room_name].init = undefined;
			default:
				roomideal.dbuilder = 1;	//we can build walls now.
				//console.log('We can build walls now.');
				require('defender').checkDefense(room_name);
				break;
			case 3:
				require('defender').setDefense(room_name);	//Our walls should be done by now.
				break;
			case 6:
				roomideal.custodian = 1;
			case 7:
				roomideal.extractor = 1;
				roomideal.handler = 1;
			case 8:
				require('defender').checkDefense(room_name);
				Memory.rooms[room_name].goals.labs = CONTROLLER_STRUCTURES.lab[Game.rooms[room_name].controller.level];
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
		if (Game.rooms[room_name].controller.level > 1)
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
			Memory.rooms[room_name].goals.extensions = CONTROLLER_STRUCTURES.extension[Game.rooms[room_name].controller.level];
		}
		Memory.rooms[room_name].goals.level = Game.rooms[room_name].controller.level + 1;
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
				/*if (Game.rooms[room_name].controller.level < 8)
				{
					Memory.rooms[room_name].goals.level = Game.rooms[room_name].controller.level + 1;
				}*/
				roomPlanner.run(room_name);
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
			if (Memory.rooms[room_name].ideal.upgradecontainer && !Game.getObjectById(Memory.rooms[room_name].buildings.upgradecontainer.id))
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
				if (Memory.rooms[room_name].sources[i].ideal.miningcontainer && !Game.getObjectById(Memory.rooms[room_name].sources[i].buildings.miningcontainer.id))
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

			//Do some basic checks every once in a while.
			if (Game.time % 100 === 0)
			{
				//Are we missing any of our towers?
				if (Game.rooms[room_name].find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}}).length < CONTROLLER_STRUCTURES.tower[Game.rooms[room_name].controller.level])
				{
					for (let t = 0; t < CONTROLLER_STRUCTURES.tower[Game.rooms[room_name].controller.level] && t < Memory.rooms[room_name].defense.towers.length; t++)
					{
						Game.rooms[room_name].createConstructionSite(Memory.rooms[room_name].defense.towers[t].x, Memory.rooms[room_name].defense.towers[t].y, STRUCTURE_TOWER);
					}
				}

				//Are we missing our store?
				if (!Game.getObjectById(Memory.rooms[room_name].buildings.store.id))
				{
					if (Game.rooms[room_name].storage)
					{
						Memory.rooms[room_name].buildings.store.id = Game.rooms[room_name].storage.id;
					}
					else
					{
						Game.rooms[room_name].createConstructionSite(Memory.rooms[room_name].buildings.store.x, Memory.rooms[room_name].buildings.store.y, STRUCTURE_STORAGE);
					}
				}

				//Are we missing our terminal?
				if (!Game.getObjectById(Memory.rooms[room_name].buildings.terminal.id))
				{
					if (Game.rooms[room_name].terminal)
					{
						Memory.rooms[room_name].buildings.terminal.id = Game.rooms[room_name].terminal.id;
					}
					else
					{
						Game.rooms[room_name].createConstructionSite(Memory.rooms[room_name].buildings.terminal.x, Memory.rooms[room_name].buildings.terminal.y, STRUCTURE_TERMINAL);
					}
				}

				//Are we missing our factory?
				if (!Game.getObjectById(Memory.rooms[room_name].buildings.factory.id))
				{
					let factory = Game.rooms[room_name].find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_FACTORY}});
					if (factory.length)
					{
						Memory.rooms[room_name].buildings.factory.id = factory[0].id;
					}
					else
					{
						Game.rooms[room_name].createConstructionSite(Memory.rooms[room_name].buildings.factory.x, Memory.rooms[room_name].buildings.factory.y, STRUCTURE_FACTORY);
					}
				}

				//Are we missing our nuker?
				if (!Game.getObjectById(Memory.rooms[room_name].buildings.nuker.id))
				{
					let nuker = Game.rooms[room_name].find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_NUKER}});
					if (nuker.length)
					{
						Memory.rooms[room_name].buildings.nuker.id = nuker[0].id;
					}
					else
					{
						Game.rooms[room_name].createConstructionSite(Memory.rooms[room_name].buildings.nuker.x, Memory.rooms[room_name].buildings.nuker.y, STRUCTURE_NUKER);
					}
				}

				//Are we missing any of our labs?
				for (la = 0; la < Memory.rooms[room_name].goals.labs; la++)
				{
					if (!Game.getObjectById(Memory.rooms[room_name].mine.labs[la].id))
					{
						let lab = Game.rooms[room_name].find(FIND_MY_STRUCTURES, {filter: function(lab_obj)
							{return lab_obj.structureType === STRUCTURE_LAB && lab_obj.pos.x === Memory.rooms[room_name].mine.labs[la].x && Memory.rooms[room_name].mine.labs[la].y}});

						if (lab.length)
						{
							Memory.rooms[room_name].mine.labs[la].id = lab[0].id;
						}
						else
						{
							Game.rooms[room_name].createConstructionSite(Memory.rooms[room_name].mine.labs[la].x, Memory.rooms[room_name].mine.labs[la].y, STRUCTURE_LAB);
						}
					}
				}

				//Are we missing any of our spawns?
				for (sa = 0; sa < CONTROLLER_STRUCTURES.spawn[Game.rooms[room_name].controller.level]; sa++)
				{
					if (!Game.getObjectById(Memory.rooms[room_name].spawns[sa].id))
					{
						let spawn = Game.rooms[room_name].find(FIND_MY_SPAWNS, {filter: function(spawn_obj) {return spawn_obj.pos.x === Memory.rooms[room_name].spawns[sa].x && spawn_obj.pos.y === Memory.rooms[room_name].spawns[sa].y}});

						if (spawn.length)
						{
							Memory.rooms[room_name].spawns[sa].id = spawn[0].id;
						}
						else
						{
							Game.rooms[room_name].createConstructionSite(Memory.rooms[room_name].spawns[sa].x, Memory.rooms[room_name].spawns[sa].y, STRUCTURE_SPAWN, require('builder').newSpawn(room_name));
						}
					}
				}

				//Are we missing our extractor?
				if (!Game.getObjectById(Memory.rooms[room_name].mineral.eid))
				{
					let extractor = Game.rooms[room_name].find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_EXTRACTOR}});
					if (extractor.length)
					{
						Memory.rooms[room_name].mineral.eid = extractor[0].id;
					}
					else
					{
						Game.rooms[room_name].createConstructionSite(Memory.rooms[room_name].mineral.pos.x, Memory.rooms[room_name].mineral.pos.y, STRUCTURE_EXTRACTOR);
					}
				}
			}

			if ((Game.time % 100 === 0 || Memory.rooms[room_name].defense.update) && Game.rooms[room_name].controller.level > 1)	//Let's only check every once in a while. No rush here.
			{
				//Are we missing any of our walls, or do we need to finalize any finished ones?
				if (!require('defender').checkDefense(room_name))
				{
					//console.log('Repopulate walls.');
					require('defender').getWalls(room_name);
				}

				//Decrement within comparison.
				if (Memory.rooms[room_name].defense.update && !--Memory.rooms[room_name].defense.update)
				{
					Memory.rooms[room_name].defense.update = undefined;
				}
			}

			//Refresh our extensions every once in a while.
			if (Game.time % 5000 === 0)
			{
				console.log('Refreshing Extensions.');
				calculate.extensions[room_name] = undefined;
				calculate.sortedextensions[room_name] = undefined;
			}
		}

		//Are there flags?
		let myflags = {Attack: [], Claims: [], Reserves: [], Signs: [], Transfer: [], Pave: []};
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
						
						if (myflags[type][c].name.indexOf('_heal') !== -1)
						{
							Memory[type.toLowerCase()][Memory[type.toLowerCase()].length - 1].heal = true;
						}
						if (myflags[type][c].name.indexOf('_guard') !== -1)
						{
							Memory[type.toLowerCase()][Memory[type.toLowerCase()].length - 1].guard = true;
						}
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

	setupDefense: function(room_name = false)
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
		//lastrp and lowwall need to have an id, any id at all, as long as that structure still exists by the time the dbuilder begins repairing walls. Our spawn id will quickly be replaced by a wall id.
		let defense = {lastrp: Game.rooms[room_name].find(FIND_MY_SPAWNS)[0].id, lowwall: Game.rooms[room_name].find(FIND_MY_SPAWNS)[0].id, highmil: 1, walls: [], farwalls: [], ramparts: [], safe: Memory.rooms[room_name].safe};
		delete Memory.rooms[room_name].safe;	//We're juggling this a bit. It will end up in Memory.rooms[room_name].defense.safe.
		for (let e = 0; e < exit.length; e++)
		{
			//We should only generate walls for unsafe exits.
			if (defense.safe[e])
			{
				continue;
			}

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
	},
	
	setupMining: function(room_name = false)
	{
		if (!room_name)
		{
			return false;
		}

		let spawn = Game.rooms[room_name].find(FIND_MY_SPAWNS)[0];
		let mineral = Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].mineral.pos.x, Memory.rooms[room_name].mineral.pos.y);
		let terrain = Game.rooms[room_name].getTerrain();
		let mspaces = [];
		let closest;
		let tempcostmatrix;
		let extract;
		let ereturn;

		//First get spaces the miner could sit in.
		for (let x = -1; x < 2; x++)
		{
			for (let y = -1; y < 2; y++)
			{
				if ((x !== 0 || y !== 0) && terrain.get(mineral.x + x, mineral.y + y) !== TERRAIN_MASK_WALL)
				{
					mspaces.push(Game.rooms[room_name].getPositionAt(mineral.x + x, mineral.y + y));
				}
			}
		}

		extract = spawn.pos.findPathTo(mineral,
			{plainCost: 2, swampCost: 3, range: 1, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
				costCallback: function(roomName, costMatrix)
				{
					for (let n = 0; n < Memory.rooms[room_name].upgrade.lenth; n++)
					{
						costMatrix.set(Memory.rooms[room_name].upgrade[n].x, Memory.rooms[room_name].upgrade[n].y, 1);
					}
					let paths = ['mine', 'mreturn', 'upgrade', 'ureturn', 'defpaths'];
					for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
					{
						for (let pa = 0; pa < paths.length; pa++)
						{
							if (paths[pa] === 'defpaths')
							{
								for (let dp = 0; dp < Memory.rooms[room_name].sources[i].defpaths.length; dp++)
								{
									if (Memory.rooms[room_name].sources[i].defpaths[dp])
									{
										for (let n = 0; n < Memory.rooms[room_name].sources[i].defpaths[dp].length; n++)
										{
											costMatrix.set(Memory.rooms[room_name].sources[i].defpaths[dp][n].x, Memory.rooms[room_name].sources[i].defpaths[dp][n].y, 1);
										}
									}
									/*else
									{
										console.log('Skipping defpaths[' + dp + '].');
									}*/
								}
							}
							else
							{
								for (let n = 0; n < Memory.rooms[room_name].sources[i][paths[pa]].length; n++)
								{
									costMatrix.set(Memory.rooms[room_name].sources[i][paths[pa]][n].x, Memory.rooms[room_name].sources[i][paths[pa]][n].y, 1);
								}
							}
						}
					}

					//Go around our upgrader.
					costMatrix.set(Memory.rooms[room_name].upgrade.slice(-1)[0].x, Memory.rooms[room_name].upgrade.slice(-1)[0].y, 255);

					//Go around our mining fatties and extensions.
					for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
					{
						//Go around our fatties.
						costMatrix.set(Memory.rooms[room_name].sources[i].mfat[0].x, Memory.rooms[room_name].sources[i].mfat[0].y, 255);

						//Go around our extensions.
						for (let e = 0; e < Memory.rooms[room_name].sources[i].buildings.extensions.length; e++)
						{
							costMatrix.set(Memory.rooms[room_name].sources[i].buildings.extensions[e].x, Memory.rooms[room_name].sources[i].buildings.extensions[e].y, 255);
						}
					}

					//Block our two main spawns. (This will be needed for later.)
					for (let sp = 0; sp < 2; sp++)
					{
						costMatrix.set(Memory.rooms[room_name].spawns[sp].x, Memory.rooms[room_name].spawns[sp].y, 255);
					}

					//Never leave the room.
					for (x = 0; x < 50; x++)
					{
						if (x === 0 || x === 49)
						{
							for (y = 0; y < 50; y++)
							{
								costMatrix.set(x, y, 254);
							}
						}
						else
						{
							for (y = 0; y < 50; y += 49)
							{
								costMatrix.set(x, y, 254);
							}
						}
					}

					tempcostmatrix = costMatrix.clone();
					return costMatrix;
				}
			});

		//Now match it to one of the others.
		for (let s = 0; s < mspaces.length; s++)
		{
			if (mspaces[s].isEqualTo(extract.slice(-1)[0].x, extract.slice(-1)[0].y))
			{
				closest = mspaces[s];
				break;
			}
		}

		//Now begin testing path steps to place a stamp.
		let tempx, tempy;
		//let increment;
		let line;
		let tested_true = [];
		//let good_stamp;	//We need this for testing 4x4's.

		//Functions to test horizontal and vertical 3x5's.
		let h3 = function(direction, tempx, tempy)	//Direction takes 1 or -1.
		{
			let increment = direction;
			let bound = 5 * direction;
			line = [];

			for (let y = -2; y < 3; y++)	//If we're testing three offsets for it, then we can really test 5 lines and record if 3 or more are clean.
			{
				line.push(true);
				for (let x = 0; x !== bound; x += increment)
				{
					//There needs to be 5 clear tiles in a row, or else the line is bad.
					if (terrain.get(tempx + x, tempy + y) === TERRAIN_MASK_WALL || tempcostmatrix.get(tempx + x, tempy + y) !== 0 || tempx + x <= 1 || tempx + x >= 48 || tempy + y <= 1 || tempy + y >= 48)
					{
						//console.log('x: ' + (tempx + x) + ', y: ' + (tempy + y) + ', Terrain: ' + terrain.get(tempx + x, tempy + y) + ' CostMatrix: ' + tempcostmatrix.get(tempx + x, tempy + y));
						line[line.length - 1] = false;
						break;
					}
				}
			}

			if (line[2])	//If the middle line is bad, then the whole attempt is bad.
			{
				for (let t = -1; t < 2; t++)
				{
					if (t === 0)	//Check our center lines.
					{
						if (line[1] && line[3])
						{
							//A horizontal 3x5 orients -1 or 1 along the x axis.
							//console.log('h3 Found a 3x5. ' + tempx + ' ' + tempy + '. Direction: [' + direction + '][0]. Orientation: ' + calculate.orientation[direction][0] + '. 1 & 3.');
							tested_true.push({type: 3, n: null, o: calculate.orientation[direction][0], x: tempx, y: tempy})	//Our center three lines have matched.
						}
					}
					else if (line[2 + (2 * t)] && line[2 + (1 * t)])	//Check our border lines.
					{
						//A horizontal 3x5 orients -1 or 1 along the x axis.
						console.log('h3 Found a 3x5. ' + tempx + ' ' + (tempy + t) + '. Direction: [' + direction + '][0]. Orientation: ' + calculate.orientation[direction][0] + '. ' + (2 + (1 * t)) + ' ' + (2 + (2 * t)));
						tested_true.push({type: 3, n: null, o: calculate.orientation[direction][0], x: tempx, y: tempy + t})	//Our border lines have matched.
					}
				}
			}
			return true;
		}
		let v3 = function(direction, tempx, tempy)	//Direction takes 1 or -1.
		{
			let increment = direction;
			let bound = 5 * direction;
			line = [];

			for (let x = -2; x < 3; x++)	//If we're testing three offsets for it, then we can really test 5 lines and record if 3 or more are clean.
			{
				line.push(true);
				for (let y = 0; y !== bound; y += increment)
				{
					//There needs to be 5 clear tiles in a row, or else the line is bad.
					if (terrain.get(tempx + x, tempy + y) === TERRAIN_MASK_WALL || tempcostmatrix.get(tempx + x, tempy + y) !== 0 || tempx + x <= 1 || tempx + x >= 48 || tempy + y <= 1 || tempy + y >= 48)
					{
						//console.log('x: ' + (tempx + x) + ', y: ' + (tempy + y) + ', Terrain: ' + terrain.get(tempx + x, tempy + y) + ' CostMatrix: ' + tempcostmatrix.get(tempx + x, tempy + y));
						line[line.length - 1] = false;
						break;
					}
				}
			}

			if (line[2])	//If the middle line is bad, then the whole attempt is bad.
			{
				for (let t = -1; t < 2; t++)
				{
					if (t === 0)	//Check our center lines.
					{
						if (line[1] && line[3])
						{
							//A vertical 3x5 orients -1 or 1 along the y axis.
							//console.log('v3 Found a 3x5. ' + tempx + ' ' + tempy + '. Direction: [0][' + direction + ']. Orientation: ' + calculate.orientation[0][direction] + '. 1 & 3.');
							tested_true.push({type: 3, n: null, o: calculate.orientation[0][direction], x: tempx, y: tempy});	//Our center three lines have matched.
						}
					}
					else if (line[2 + (2 * t)] && line[2 + (1 * t)])	//Check our border lines.
					{
						//A vertical 3x5 orients -1 or 1 along the y axis.
						console.log('v3 Found a 3x5. ' + (tempx + t) + ' ' + tempy + '. Direction: [0][' + direction + ']. Orientation: ' + calculate.orientation[0][direction] + '. ' + (2 + (1 * t)) + ' ' + (2 + (2 * t)));
						tested_true.push({type: 3, n: null, o: calculate.orientation[0][direction], x: tempx + t, y: tempy});	//Our border lines have matched.
					}
				}
			}
			return true;
		}

		//Function to test 4x4's.
		let d4 = function(increment, tempx, tempy)
		{
			let bound = {x: 3 * increment.x, y: 3 * increment.y}
			let good_stamp = true;

			//If the opposite corner from where we began is bad, then the whole thing is bad.
			//Start testing from the opposite corner
			for (let x = bound.x, counter = 0; good_stamp && counter < 4; x -= increment.x, counter++)
			{
				switch (x)
				{
					case 3:	//The first row tested can have a bad tile across from the far corner.
					case -3:
						for (let y = bound.y; y !== 0; y -= increment.y)
						{
							if (terrain.get(tempx + x, tempy + y) === TERRAIN_MASK_WALL || tempcostmatrix.get(tempx + x, tempy + y) !== 0 || tempx + x <= 1 || tempx + x >= 48 || tempy + y <= 1 || tempy + y >= 48)
							{
								good_stamp = false;
							}
						}
						break;

					case 0:	//The last row tested can have a bad tile across from our starting position.
						for (let y = bound.y - increment.y, counter2 = 0; counter2 < 3; y -= increment.y, counter2++)
						{
							if (terrain.get(tempx + x, tempy + y) === TERRAIN_MASK_WALL || tempcostmatrix.get(tempx + x, tempy + y) !== 0 || tempx + x <= 1 || tempx + x >= 48 || tempy + y <= 1 || tempy + y >= 48)
							{
								good_stamp = false;
							}
						}
						break;

					default:	//Otherwise test every tile in the row.
						for (let y = bound.y, counter2 = 0; counter2 < 4; y -= increment.y, counter2++)
						{
							if (terrain.get(tempx + x, tempy + y) === TERRAIN_MASK_WALL || tempcostmatrix.get(tempx + x, tempy + y) !== 0 || tempx + x <= 1 || tempx + x >= 48 || tempy + y <= 1 || tempy + y >= 48)
							{
								good_stamp = false;
							}
						}
				}
			}

			if (good_stamp)	//If it passed the test, record it.
			{
				//For our 4x4, its orientation will always be diagonal. Testing adjacents will just test from different starting x/y's.
				console.log('Found a 4x4.');
				tested_true.push({type: 4, n: null, o: calculate.orientation[increment.x][increment.y], x: tempx, y: tempy});
				return true;
			}
			else
			{
				return false;
			}
		}

		//Reverse the path before we work on it.
		extract = calculate.reversepath(extract);
		extract.pop();

		//Cache pairs of x and y directions.
		let increment;

		path_test: for (let n = 0; n < extract.length; n++)
		{
			for (let try_again = 0; try_again < 6; try_again++)	//If at first we don't succeed, try try again.
			{
				increment =
				[
					{x: extract[n].dx, y: extract[n].dy}, {x: extract[n].dx * -1, y: extract[n].dy * -1},	//The base dxdy and then an inversion of it.
					{x: 1, y: -1}, {x: 1, y: 1},	//Include every direction for our 4x4's.
					{x: -1, y: -1}, {x: -1, y: 1}
				];

				tempx = extract[n].x;
				tempy = extract[n].y;

				//Test our 3x5's. If it's a diagonal, we run both the horizontal and vertical test.
				if (extract[n].dx !== 0 && extract[n].dy !== 0)	//We're moving diagonally.
				{
					//Test both of the directions we're moving in.
					h3(extract[n].dx, tempx + (try_again * extract[n].dx), tempy);
					v3(extract[n].dy, tempx, tempy + (try_again * extract[n].dy));

					//Test the other directions too.
					h3(extract[n].dx * -1, tempx - (try_again * extract[n].dx), tempy);
					v3(extract[n].dy * -1, tempx, tempy - (try_again * extract[n].dy));
				}
				else if(extract[n].dx !== 0)	//We're moving horizontally.
				{
					//Test the direction we're moving in, then test both perpendiculars from it.
					h3(extract[n].dx, tempx, tempy);
					v3(1, tempx, tempy);
					v3(-1, tempx, tempy);

					//Test the other direction just to be sure.
					h3(extract[n].dx * -1, tempx, tempy);
				}
				else if (extract[n].dy !== 0)	//We're moving vertically.
				{
					//Test the direction we're moving in, then test both perpendiculars from it.
					v3(extract[n].dy, tempx, tempy);
					h3(1, tempx, tempy);
					h3(-1, tempx, tempy);

					//Test the other direction just to be sure.
					v3(extract[n].dy * -1, tempx, tempy);
				}

				//Have we found a valid stamp yet?
				//let good_stamp = true;

				//Test our 4x4's. All 4x4's are diagonal.
				if (extract[n].dx)
				{
					if (extract[n].dy)	//We're moving diagonally, so we will test a series of both horizontal and diagonal offsets.
					{
						//Test the base position.
						d4(increment[2], tempx, tempy);
						d4(increment[3], tempx, tempy);
						d4(increment[4], tempx, tempy);
						d4(increment[5], tempx, tempy);

						//Four offset positions in each direction.
						for (let f = 1; f < 5; f++)
						{
							//Test four steps along the x axis.
							d4(increment[0],  tempx - (f * extract[n].dx), tempy);
							d4(increment[1],  tempx + (f * extract[n].dx), tempy);

							//Test four steps along the y axis.
							d4(increment[0], tempx, tempy - (f * extract[n].dy));
							d4(increment[1], tempx, tempy + (f * extract[n].dy));
						}
					}
					else	//We're moving horizontally.
					{
						//Test all five x positions in each direction with y downward and all five x again with y upward.
						for (let f = 0; f < 5; f++)
						{
							d4({x: extract[n].dx, y: 1},  tempx + (f * extract[n].dx), tempy);
							d4({x: extract[n].dx, y: -1},  tempx - (f * extract[n].dx), tempy);

							d4({x: extract[n].dx * -1, y: 1},  tempx - (f * extract[n].dx), tempy);
							d4({x: extract[n].dx * -1, y: -1},  tempx + (f * extract[n].dx), tempy);
						}
					}
				}
				else if (extract[n].dy)	//We're moving vertically.
				{
					//Test all five y positions in each direction with x rightward and all five y again with x leftward.
					for (let f = 0; f < 5; f++)
					{
						d4({x: 1, y: extract[n].dy}, tempx, tempy + (f * extract[n].dy));
						d4({x: -1, y: extract[n].dy}, tempx, tempy - (f * extract[n].dy));

						d4({x: 1, y: extract[n].dy * -1}, tempx, tempy - (f * extract[n].dy));
						d4({x: -1, y: extract[n].dy * -1}, tempx, tempy + (f * extract[n].dy));
					}
				}

				//If we've found a location for our stamp, then we're done here.
				if (tested_true.length > 16)
				{
					break path_test;
				}
			}
		}

		//Have we found at least one stamp?
		if (tested_true.length)
		{
			for (let td = 0; td < tested_true.length; td++)
			{
				tested_true[td].b = 0;		//Before.
				tested_true[td].a = 0;		//After.
				tested_true[td].bpos = [];	//Positions on the before side of the stamp. (The spawn side.)
				tested_true[td].apos = [];	//Positions on the after side of the stamp. (The mineral side.)
				tested_true[td].mpos = [];	//Positions in the middle. This is the two outer-middle blockers for 3x5's and the two inner-diagonal required steps for 4x4's.
			}

			let bound;

			//Now let's begin tests to see which stamp is best.
			for (let td = 0; td < tested_true.length; td++)
			{
				increment = calculate.dxdy[tested_true[td].o];
				//console.log(JSON.stringify(increment));
				//console.log(JSON.stringify(tested_true[td]));
				tested_true[td].n = td;

				//Our tested_true[] objects come in this format. {type, o, x, y}. type is 3 or 4, and o is a direction.
				if (tested_true[td].type === 3)	//It's a 3x5.
				{
					//3x5's only come in horizontal or vertical.
					if (increment.dx)	//Horizontal.
					{
						bound = increment.dx * 4;

						//Get our before-side positions and after-side positions.
						for (let y = -1; y < 2; y++)
						{
							//console.log('Horizontal: ' + (tested_true[td].x + bound) + ' ' + (tested_true[td].y + y));
							//console.log('Horizontal: ' + tested_true[td].x + ' ' + (tested_true[td].y + y));
							tested_true[td].bpos.push(new RoomPosition(tested_true[td].x + bound, tested_true[td].y + y, room_name));
							tested_true[td].apos.push(new RoomPosition(tested_true[td].x, tested_true[td].y + y, room_name));

							//One tile closer to the center is valid if it's an outer tile.
							//The direct center should be recorded as a blocker for later.
							if (y === -1 || y === 1)
							{
								tested_true[td].bpos.push(new RoomPosition(tested_true[td].x + bound - increment.dx, tested_true[td].y + y, room_name));
								tested_true[td].apos.push(new RoomPosition(tested_true[td].x + increment.dx, tested_true[td].y + y, room_name));
								tested_true[td].mpos.push(new RoomPosition(tested_true[td].x + (increment.dx * 2), tested_true[td].y + y, room_name));
							}
						}
					}
					else if (increment.dy)	//Vertical.
					{
						bound = increment.dy * 4;

						//Get our before-side positions and after-side positions.
						for (let x = -1; x < 2; x++)
						{
							//console.log(td + ' Vertical: ' + (tested_true[td].x + x) + ' ' + (tested_true[td].y + bound));
							//console.log(td + ' Vertical: ' + (tested_true[td].x + x) + ' ' + tested_true[td].y);
							tested_true[td].bpos.push(new RoomPosition(tested_true[td].x + x, tested_true[td].y + bound, room_name));
							tested_true[td].apos.push(new RoomPosition(tested_true[td].x + x, tested_true[td].y, room_name));

							//One tile closer to the center is valid if it's an outer tile.
							//The direct center should be recorded as a blocker for later.
							if (x === -1 || x === 1)
							{
								tested_true[td].bpos.push(new RoomPosition(tested_true[td].x + x, tested_true[td].y + bound - increment.dy, room_name));
								tested_true[td].apos.push(new RoomPosition(tested_true[td].x + x, tested_true[td].y + increment.dy, room_name));
								tested_true[td].mpos.push(new RoomPosition(tested_true[td].x + x, tested_true[td].y + (increment.dy * 2), room_name));
							}
						}
					}
				}
				else	//It's a 4x4.
				{
					bound = {x: increment.dx * 3, y: increment.dy * 3};
					
					//Get our starting corner and ending corner.
					tested_true[td].bpos.push(new RoomPosition(tested_true[td].x + bound.x, tested_true[td].y + bound.y, room_name));
					tested_true[td].apos.push(new RoomPosition(tested_true[td].x, tested_true[td].y, room_name));

					//Get our diagonal inner tiles that must be traversed. The order they are pushed will be important later.
					tested_true[td].mpos.push(new RoomPosition(tested_true[td].x + bound.x - increment.dx, tested_true[td].y + bound.y - increment.dy, room_name));	//The before is pushed first.
					tested_true[td].mpos.push(new RoomPosition(tested_true[td].x + increment.dx, tested_true[td].y + increment.dy, room_name));	//The after is pushed second.

					//Get the other possible starting and ending positions.
					for (let ti = 1; ti <  3; ti++)
					{
						tested_true[td].bpos.push(new RoomPosition(tested_true[td].x + bound.x - (ti * increment.dx), tested_true[td].y + bound.y, room_name));
						tested_true[td].bpos.push(new RoomPosition(tested_true[td].x + bound.x, tested_true[td].y + bound.y - (ti * increment.dy), room_name));

						tested_true[td].apos.push(new RoomPosition(tested_true[td].x + (ti * increment.dx), tested_true[td].y, room_name));
						tested_true[td].apos.push(new RoomPosition(tested_true[td].x, tested_true[td].y + (ti * increment.dy), room_name));
					}
				}
			}

			//Now record metrics about the resulting path. (Distance to spawn and distance to mineral.)
			for (let td = 0; td < tested_true.length; td++)
			{
				//Which beginning position is closest to the spawn?
				tested_true[td].chosen_bpos = calculate.true_closest(spawn.pos, tested_true[td].bpos,
					{plainCost: 2, swampCost: 2, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
						costCallback: function(roomName, costMatrix)
						{
							costMatrix = tempcostmatrix.clone();

							//Block off the other positions.
							for (let postype = ['apos', 'mpos'], pt = 0; pt < 2; pt++)
							{
								for (let pi = 0; pi < tested_true[td][postype[pt]].length; pi++)
								{
									costMatrix.set(tested_true[td][postype[pt]][pi].x, tested_true[td][postype[pt]][pi].y, 255);
								}
							}

							return costMatrix;
						}
					})[0];	//There should only be one. But if there isn't, it probably doesn't matter.

				//Which ending position is closest to the mineral?
				//Avoid preferring a position without enough open positions.
				let test_apos = tested_true[td].apos.slice();
				let temp_test_labs = {};
				//Block off the other positions.
				for (let postype = ['bpos', 'apos', 'mpos'], pt = 0; pt < 3; pt++)
				{
					if (tested_true[td].type === 4 && postype[pt] === 'mpos')	//For 3x5's, all three types are labs. For 4x4's, mpos are the empty spaces inside rather than the labs.
					{
						break;
					}
					for (let pi = 0; pi < tested_true[td][postype[pt]].length; pi++)
					{
						calculate.mark_found(tested_true[td][postype[pt]][pi].x, tested_true[td][postype[pt]][pi].y, temp_test_labs);
					}
				}

				//For a 4x4, we must find the other two center tiles manually. We can spread from tested_true[td].mpos[0].
				if (tested_true[td].type === 4)
				{
					let increment_temp = calculate.dxdy[tested_true[td].o];
					calculate.mark_found(tested_true[td].mpos[0].x - increment_temp.dx, tested_true[td].mpos[0].y, temp_test_labs);
					calculate.mark_found(tested_true[td].mpos[0].x, tested_true[td].mpos[0].y - increment_temp.dy, temp_test_labs);
				}
				
				for (let ta = test_apos.length - 1, found_valid; ta >= 0; ta--)
				{
					found_valid = 0;
					for (let x = -1; x < 2; x++)
					{
						let tempx = test_apos[ta].x + x;

						for (let y = -1; y < 2; y++)
						{
							let tempy = test_apos[ta].y + y;

							//Count non-wall positions touching this apos.
							if (terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && !calculate.check_xy(tempx, tempy, temp_test_labs))
							{
								found_valid++;
							}

							//For 3x5's, an apos that touches an mpos touches two inner spaces. Normalize this with the others.
							if (tested_true[td].type === 3)
							{
								let live_apos = new RoomPosition(test_apos[ta].x, test_apos[ta].y, room_name);
								if (live_apos.isNearTo(tested_true[td].mpos[0]) || live_apos.isNearTo(tested_true[td].mpos[1]))
								{
									found_valid--;
								}
							}
						}
					}

					//Since every apos touches an inner position, 4 valid found means 3 external positions found.
					if (found_valid < 4)
					{
						test_apos.splice(ta, 1);
					}
				}

				//Now that we've ruled out any bad spaces, proceed.
				if (!test_apos.length)
				{
					console.log('All apos ruled out. Reverting changes.');
					test_apos = tested_true[td].apos;	//On the rare chance that we ruled out every apos, revert back to considering all of them.
				}
				tested_true[td].chosen_apos = calculate.true_closest(closest, test_apos,
					{plainCost: 2, swampCost: 2, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
						costCallback: function(roomName, costMatrix)
						{
							costMatrix = tempcostmatrix.clone();

							//Block off the other positions.
							for (let postype = ['bpos', 'mpos'], pt = 0; pt < 2; pt++)
							{
								for (let pi = 0; pi < tested_true[td][postype[pt]].length; pi++)
								{
									costMatrix.set(tested_true[td][postype[pt]][pi].x, tested_true[td][postype[pt]][pi].y, 255);
								}
							}

							return costMatrix;
						}
					})[0];	//There should only be one. But if there isn't, it probably doesn't matter.

				//We don't need to hold extra position objects, and it's probably better if we don't.
				for (let ob = tested_true[td].bpos.length - 1; ob >= 0; ob--)
				{
					if (tested_true[td].chosen_bpos.isEqualTo(tested_true[td].bpos[ob]))
					{
						//console.log('Eliminating duplicate position.');
						//tested_true[td].chosen_bpos = tested_true[td].bpos[ob];
						tested_true[td].bpos.splice(ob, 1);	//We're keeping the chosen_bpos while discarding its position from the bpos array.
						break;
					}
				}
				for (let ob = tested_true[td].apos.length - 1; ob >= 0; ob--)
				{
					if (tested_true[td].chosen_apos.isEqualTo(tested_true[td].apos[ob]))
					{
						//console.log('Eliminating duplicate position.');
						//tested_true[td].chosen_bpos = tested_true[td].apos[ob];
						tested_true[td].apos.splice(ob, 1);	//We're keeping the chosen_apos while discarding its position from the apos array.
						break;
					}
				}

				//Now save a path from the spawn to the bpos and from the apos to the mineral.
				tested_true[td].chosen_bpath = spawn.pos.findPathTo(tested_true[td].chosen_bpos,
					{plainCost: 2, swampCost: 2, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
						costCallback: function(roomName, costMatrix)
						{
							costMatrix = tempcostmatrix.clone();

							//Block off the other positions.
							for (let postype = ['bpos', 'apos', 'mpos'], pt = 0; pt < 3; pt++)
							{
								for (let pi = 0; pi < tested_true[td][postype[pt]].length; pi++)
								{
									costMatrix.set(tested_true[td][postype[pt]][pi].x, tested_true[td][postype[pt]][pi].y, 255);
								}
							}

							return costMatrix;
						}
					});
				tested_true[td].chosen_apath = tested_true[td].chosen_apos.findPathTo(mineral,
					{plainCost: 2, swampCost: 2, range: 1, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
						costCallback: function(roomName, costMatrix)
						{
							costMatrix = tempcostmatrix.clone();

							//Block off the other positions.
							for (let postype = ['bpos', 'apos', 'mpos'], pt = 0; pt < 3; pt++)
							{
								for (let pi = 0; pi < tested_true[td][postype[pt]].length; pi++)
								{
									costMatrix.set(tested_true[td][postype[pt]][pi].x, tested_true[td][postype[pt]][pi].y, 255);
								}
							}

							return costMatrix;
						}
					});
			}

			//Now that we have paths to their before and after positions, we can begin narrowing them down to the shortest paths that remain closest to the mineral.
			let closest_chosen = [];
			let shortest_chosen = [];
			let both_chosen = [tested_true[0]];	//The first time we run, we would get a both_chosen anyway.
			let closest_count = tested_true[0].chosen_apath.length;
			let shortest_count = tested_true[0].chosen_bpath.length + tested_true[0].chosen_apath.length;
			for (let td = 1; td < tested_true.length; td++)
			{
				//Is it closer to the mineral? Is the path shorter in general? Or maybe both?
				if (tested_true[td].chosen_apath.length < closest_count && (tested_true[td].chosen_bpath.length + tested_true[td].chosen_apath.length) < shortest_count)
				{
					console.log('Both. ' + tested_true[td].x + ' ' + tested_true[td].y + ' ' + tested_true[td].o + ' ' + tested_true[td].type);
					both_chosen = [tested_true[td]];
					closest_count = tested_true[td].chosen_apath.length;
					shortest_count = tested_true[td].chosen_bpath.length + tested_true[td].chosen_apath.length;
				}
				else if (tested_true[td].chosen_apath.length === closest_count && (tested_true[td].chosen_bpath.length + tested_true[td].chosen_apath.length) === shortest_count)
				{
					console.log('Both. ' + tested_true[td].x + ' ' + tested_true[td].y + ' ' + tested_true[td].o + ' ' + tested_true[td].type);
					both_chosen.push(tested_true[td]);
				}
				else if (tested_true[td].chosen_apath.length < closest_count && (tested_true[td].chosen_bpath.length + tested_true[td].chosen_apath.length <= shortest_count && tested_true[td].type === 3))
				{
					console.log('Closest. ' + tested_true[td].x + ' ' + tested_true[td].y + ' ' + tested_true[td].o + ' ' + tested_true[td].type);
					closest_chosen = [tested_true[td]];
					closest_count = tested_true[td].chosen_apath.length;

					//We have found a closer one than the one recorded under both.
					both_chosen = [];

					//If we have found a closer one, let's discard the shortest list too.
					//shortest_chosen = [tested_true[td]];
				}
				else if (tested_true[td].chosen_apath.length === closest_count && (tested_true[td].chosen_bpath.length + tested_true[td].chosen_apath.length <= shortest_count && tested_true[td].type === 3))
				{
					console.log('Closest. ' + tested_true[td].x + ' ' + tested_true[td].y + ' ' + tested_true[td].o + ' ' + tested_true[td].type);
					closest_chosen.push(tested_true[td]);
				}
				else if (tested_true[td].chosen_bpath.length + tested_true[td].chosen_apath.length < shortest_count)
				{
					console.log('Shortest. ' + tested_true[td].x + ' ' + tested_true[td].y + ' ' + tested_true[td].o + ' ' + tested_true[td].type);
					shortest_chosen = [tested_true[td]];
					shortest_count = tested_true[td].chosen_bpath.length + tested_true[td].chosen_apath.length;

					//We have found a shorter one than the one recorded under both.
					both_chosen = [];
				}
				else if (tested_true[td].chosen_bpath.length + tested_true[td].chosen_apath.length === shortest_count)
				{
					console.log('Shortest. ' + tested_true[td].x + ' ' + tested_true[td].y + ' ' + tested_true[td].o + ' ' + tested_true[td].type);
					shortest_chosen.push(tested_true[td]);
				}
			}

			//Now we choose a stamp and finalize it.
			let final_choice;
			let chosen_index = 0;
			if (both_chosen.length)	//Prefer a stamp that has the shortest path and is closest to the mineral.
			{
				console.log('Both closest and shortest chosen.');

				shortest_count = both_chosen[0].chosen_bpath.length + both_chosen[0].chosen_apath.length;

				//If we have more than one both_chosen, find the one with the shortest path.
				for (td = 1; td < both_chosen.length; td++)
				{
					if ((both_chosen[td].chosen_bpath.length + both_chosen[td].chosen_apath.length) < shortest_count)
					{
						chosen_index = td;
						shortest_count = both_chosen[td].chosen_bpath.length + both_chosen[td].chosen_apath.length;
					}
					else if ((both_chosen[td].chosen_bpath.length + both_chosen[td].chosen_apath.length) === shortest_count)
					{
						//Rather than deciding these arbitrarily, let's choose the one slightly closer to a source.
						console.log('Getting closer to a source rather than deciding arbitrarily. ' + both_chosen.length);
						let temp_source = [];
						for (i = 0; i < Memory.rooms[room_name].sources.length; i++)
						{
							temp_source.push({x: Memory.rooms[room_name].sources[i].pos.x, y: Memory.rooms[room_name].sources[i].pos.y});
						}
						temp_source = calculate.true_closest(mineral, temp_source,
							{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
								costCallback: function(roomName, costMatrix)
								{
									return tempcostmatrix;
								}
							})[0];
						let closest_pos = calculate.true_closest(temp_source, [both_chosen[chosen_index].chosen_bpath.slice(-1)[0], both_chosen[td].chosen_bpath.slice(-1)[0]],
							{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
								costCallback: function(roomName, costMatrix)
								{
									return tempcostmatrix;
								}
							})[0];

						//Now figure out which one was closer.
						if (closest_pos.x === both_chosen[td].chosen_bpath.slice(-1)[0].x && closest_pos.y === both_chosen[td].chosen_bpath.slice(-1)[0].y)
						{
							chosen_index = td;
						}
					}
				}

				final_choice = both_chosen[chosen_index];
			}
			else if (closest_chosen.length)	//If we can't have both, let's at least have the closest.
			{
				console.log('Closest chosen with shortest path. ' + closest_chosen.length);
				shortest_count = closest_chosen[0].chosen_bpath.length + closest_chosen[0].chosen_apath.length;

				//If we have more than one closest_chosen, find the one with the shortest path.
				for (td = 1; td < closest_chosen.length; td++)
				{
					if ((closest_chosen[td].chosen_bpath.length + closest_chosen[td].chosen_apath.length) < shortest_count)
					{
						chosen_index = td;
						shortest_count = closest_chosen[td].chosen_bpath.length + closest_chosen[td].chosen_apath.length;
					}
					else if ((closest_chosen[td].chosen_bpath.length + closest_chosen[td].chosen_apath.length) === shortest_count)
					{
						//Rather than deciding these arbitrarily, let's choose the one slightly closer to a source.
						console.log('Getting closer to a source rather than deciding arbitrarily. ' + closest_chosen.length);
						let temp_source = [];
						for (i = 0; i < Memory.rooms[room_name].sources.length; i++)
						{
							temp_source.push({x: Memory.rooms[room_name].sources[i].pos.x, y: Memory.rooms[room_name].sources[i].pos.y});
						}
						temp_source = calculate.true_closest(mineral, temp_source,
							{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
								costCallback: function(roomName, costMatrix)
								{
									return tempcostmatrix;
								}
							})[0];
						let closest_pos = calculate.true_closest(temp_source, [closest_chosen[chosen_index].chosen_bpath.slice(-1)[0], closest_chosen[td].chosen_bpath.slice(-1)[0]],
							{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
								costCallback: function(roomName, costMatrix)
								{
									return tempcostmatrix;
								}
							})[0];

						//Now figure out which one was closer.
						if (closest_pos.x === closest_chosen[td].chosen_bpath.slice(-1)[0].x && closest_pos.y === closest_chosen[td].chosen_bpath.slice(-1)[0].y)
						{
							chosen_index = td;
						}
					}
				}

				final_choice = closest_chosen[chosen_index];
			}
			else if (shortest_chosen.length)
			{
				closest_count = shortest_chosen[0].chosen_apath.length;

				//If we have more than one shortest_chosen, find the one that's closest to the mineral.
				console.log('Shortest chosen with closest path. ' + shortest_chosen.length);
				for (td = 1; td < shortest_chosen.length; td++)
				{
					if (shortest_chosen[td].chosen_apath.length < closest_count)
					{
						chosen_index = td;
						closest_count = shortest_chosen[td].chosen_apath.length;
					}
				}

				final_choice = shortest_chosen[chosen_index];
			}

			//Now that we've chosen a stamp, finalize it.
			if (final_choice.type === 3)	//It's a 3x5.
			{
				increment = calculate.dxdy[final_choice.o];

				final_choice.chosen_mpath = final_choice.chosen_bpos.findPathTo(final_choice.chosen_apos,
					{plainCost: 2, swampCost: 2, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
						costCallback: function(roomName, costMatrix)
						{
							costMatrix = tempcostmatrix.clone();

							//Block off an outer shell so it has to go inside.
							if (increment.dx)	//Horizontal.
							{
								bound = 5 * increment.dx;

								for (let y = -2; y < 3; y++)
								{
									if (y === -2 || y === 2)
									{
										for (let x = 0 - increment.dx; x !== bound; x += increment.dx)
										{
											costMatrix.set(final_choice.x + x, final_choice.y + y, 255);
										}
									}
									else
									{
										for (let x = 0 - increment.dx; x !== bound; x += (increment.dx * 6))
										{
											costMatrix.set(final_choice.x + x, final_choice.y + y, 255);
										}
									}
								}
							}
							else if (increment.dy)	//Vertical.
							{
								bound = 5 * increment.dy;

								for (let x = -2; x < 3; x++)
								{
									if (x === -2 || x === 2)
									{
										for (let y = 0 - increment.dy; y !== bound; y += increment.dy)
										{
											costMatrix.set(final_choice.x + x, final_choice.y + y, 255);
										}
									}
									else
									{
										for (let y = 0 - increment.dy; y !== bound; y += (increment.dy * 6))
										{
											costMatrix.set(final_choice.x + x, final_choice.y + y, 255);
										}
									}
								}
							}

							//Now block off the outer layer except for our beginning and ending position.
							for (let pos_i = 0, pos_t = ['bpos', 'mpos', 'apos']; pos_i < 3; pos_i++)
							{
								for (ob = 0; ob < final_choice[pos_t[pos_i]].length; ob++)
								{
									costMatrix.set(final_choice[pos_t[pos_i]][ob].x, final_choice[pos_t[pos_i]][ob].y, 255);
								}
							}

							return costMatrix;
						}
					});
			}
			else	//It's a 4x4.
			{
				//Since every step to be joined is touching the previous step, the pathfinding cannot avoid going to it.
				final_choice.chosen_mpath = final_choice.chosen_bpos.findPathTo(final_choice.mpos[0],
					{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1});

				final_choice.chosen_mpath = final_choice.chosen_mpath.concat(final_choice.mpos[0].findPathTo(final_choice.mpos[1],
					{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1}));

				final_choice.chosen_mpath = final_choice.chosen_mpath.concat(final_choice.mpos[1].findPathTo(final_choice.chosen_apos,
					{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1}));
			}

			//We now have our final path.
			final_choice.final_path = final_choice.chosen_bpath.concat(final_choice.chosen_mpath).concat(final_choice.chosen_apath);

			//Now get the return path.
			final_choice.final_rpath = calculate.reversepath(final_choice.final_path);

			//Now record lab positions for our stamp.
			final_choice.labs = [];

			//0 and 1 must be our source labs.
			if (final_choice.type === 3)	//A 3x5.
			{
				for (let ob = 0; ob < 2; ob++)
				{
					final_choice.labs.push({id: null, x: final_choice.mpos[ob].x, y: final_choice.mpos[ob].y});
				}
			}
			else	//A 4x4.
			{
				increment = calculate.dxdy[final_choice.o];

				//We must find the other two center tiles manually. We can spread from final_choice.mpos[0].
				final_choice.labs.push(
					{id: null, x: final_choice.mpos[0].x - increment.dx, y: final_choice.mpos[0].y},
					{id: null, x: final_choice.mpos[0].x, y: final_choice.mpos[0].y - increment.dy});
			}

			//Now add the other positions. Use a flipper to alternate before-side and after-side positions. (After-side starting first.)
			for (let lb = 0, la = 0, fl = false; final_choice.labs.length < 10; fl ? lb++ : la++, fl = !fl)
			{
				if (fl)
				{
					final_choice.labs.push({id: null, x: final_choice.bpos[lb].x, y: final_choice.bpos[lb].y});
				}
				else
				{
					final_choice.labs.push({id: null, x: final_choice.apos[la].x, y: final_choice.apos[la].y});
				}
			}

			//Our 3x5's might leave a lab position untouched. We should move it in if necessary.
			if (final_choice.type === 3)
			{
				//First mark any tiles touching the mineral path in an easily accessible format.
				let minexy = {};
				let blocked = {};
				for (let fp = 0; fp < final_choice.final_path.length; fp++)
				{
					for (let x = -1; x < 2; x++)
					{
						for (let y = -1; y < 2; y++)
						{
							calculate.mark_found(final_choice.final_path[fp].x + x, final_choice.final_path[fp].y + y, minexy);
						}
					}
				}

				//Exclude every lab's location from possible destinations.
				for (let la = 0; la < final_choice.labs.length; la++)
				{
					calculate.mark_found(final_choice.labs[la].x, final_choice.labs[la].y, blocked);
				}

				//Now find any lab that isn't touching the mineral path.
				for (let la = 0; la < final_choice.labs.length; la++)
				{
					if (!(minexy[final_choice.labs[la].x] && minexy[final_choice.labs[la].x][final_choice.labs[la].y]))
					{
						//console.log('Untouched Lab Found: ' + final_choice.labs[la].x + ', ' + final_choice.labs[la].y);
						//We found a lab that isn't touching. We need to move it.
						for (let x = -1, tempx, moved = false; !moved && x < 2; x++)
						{
							tempx = final_choice.labs[la].x + x;

							for (let y = -1, tempy; !moved && y < 2; y++)
							{
								tempy = final_choice.labs[la].y + y;
								
								//Have we found a spot?
								if (minexy[tempx] && minexy[tempx][tempy] && !(blocked[tempx] && blocked[tempx][tempy]))
								{
									//Move it.
									final_choice.labs[la].x = tempx;
									final_choice.labs[la].y = tempy;
									moved = true;
								}
							}
						}
					}
				}
			}

			//Now trim the roomName out. We don't need to store that.
			for (let all_pos = ['bpos', 'apos', 'mpos'], ptype = 0; ptype < 3; ptype++)
			{
				for (let this_pos = 0; this_pos < all_pos[ptype].length; this_pos++)
				{
					final_choice[all_pos[ptype]].roomName = undefined;
				}
			}

			//Update our cost matrix for further processing.
			for (let i = 0; i < final_choice.final_path.length; i++)
			{
				tempcostmatrix.set(final_choice.final_path[i].x, final_choice.final_path[i].y, 1);
			}

			//Begin placing the other positions.
			let mine_pos;
			let hand_pos;
			let spawn_pos;
			let store_pos;
			let term_pos;
			let spawn_dir = [];	//The first should point to hand_pos. The second should point to mine_pos. If there's only one, mine_pos will use it too.
			let efat;
			let needs_towing = undefined;
			let touching_lab = false;
			let apos_i;
			let bpos_i;
			let last_i = final_choice.final_path.length - 1;
			//let final_positions = [];	//Once we have our mining and handler positions, we need to record and test and record some final positions.
			let inner_pos;	//One step prior to the apos.
			let inner_pos2;	//One step after the bpos.

			//It'll be helpful to have the labs in an easily checkable format.
			let labxy = {};
			let lab_objects = [];
			for (let la = 0; la < final_choice.labs.length; la++)
			{
				calculate.mark_found(final_choice.labs[la].x, final_choice.labs[la].y, labxy);
				tempcostmatrix.set(final_choice.labs[la].x, final_choice.labs[la].y, 255);
				lab_objects.push(new RoomPosition(final_choice.labs[la].x, final_choice.labs[la].y, room_name));
			}

			//Track tiles touching exit tiles.
			let exitxy = {};
			for (let ex = 0, exits = Game.rooms[room_name].find(FIND_EXIT); ex < exits.length; ex++)
			{
				for (let x = -1; x < 2; x++)
				{
					for (let y = -1; y < 2; y++)
					{
						if (exits[ex].x + x >= 0 && exits[ex].x + x <= 49 && exits[ex].y + y >= 0 && exits[ex].y + y <= 49)
						{
							calculate.mark_found(exits[ex].x + x, exits[ex].y + y, exitxy);
						}
					}
				}
			}

			//First, let's see where along the path apos is.
			for (apos_i = last_i; apos_i > 0; apos_i--)
			{
				if (final_choice.final_path[apos_i].x === final_choice.chosen_apos.x && final_choice.final_path[apos_i].y === final_choice.chosen_apos.y)
				{
					break;
				}
			}			

			//Now let's see where along the path bpos is.
			for (bpos_i = apos_i; bpos_i > 0; bpos_i--)
			{
				if (final_choice.final_path[bpos_i].x === final_choice.chosen_bpos.x && final_choice.final_path[bpos_i].y === final_choice.chosen_bpos.y)
				{
					break;
				}
			}

			//We'll need to also know the steps one step inward.
			inner_pos = {x: final_choice.final_path[apos_i - 1].x, y: final_choice.final_path[apos_i - 1].y};	//One step before apos.
			inner_pos2 = {x: final_choice.final_path[bpos_i + 1].x, y: final_choice.final_path[bpos_i + 1].y};	//One step after bpos.

			//Now check to see if the next step is touching a lab (if there is a next step).
			let apos_pos;
			let double_positions = [];
			let single_positions_mine = [];
			let single_positions_hand = [];
			if (last_i !== apos_i)
			{
				console.log('There is a next step.');
				apos_pos = new RoomPosition(final_choice.final_path[apos_i + 1].x, final_choice.final_path[apos_i + 1].y, room_name);
				for (let la = 0; la < final_choice.labs.length; la++)
				{
					if (apos_pos.isNearTo(final_choice.labs[la].x, final_choice.labs[la].y))
					{
						touching_lab = true;
						break;
					}
				}

				//If the next step is touching a lab still, let's make sure it's also touching the mineral.
				let near_mineral = apos_pos.isNearTo(mineral);
				if (touching_lab)
				{
					//If it's touching, we've found our miner and handler positions.
					console.log('Lab Touching.');

					if (near_mineral)
					{
						console.log('Near the mineral.');

						mine_pos = apos_pos;
						hand_pos = apos_pos = new RoomPosition(final_choice.final_path[apos_i].x, final_choice.final_path[apos_i].y, room_name);

						//The spawn needs to be touching both of these positions, but the storage needs to be touching apos too.
						let near_mine;
						let near_hand;
						for (let x = -1; x < 2; x++)
						{
							let tempx = hand_pos.x + x;

							for (let y = -1; y < 2; y++)
							{
								let tempy = hand_pos.y + y;
								let temp_pos_live = new RoomPosition(tempx, tempy, room_name);

								near_mine = temp_pos_live.isNearTo(mine_pos);
								near_hand = temp_pos_live.isNearTo(hand_pos)

								if (!(tempx === mine_pos.x && tempy === mine_pos.y) && !(tempx === hand_pos.x && tempy === hand_pos.y)	//Don't reuse a chosen position.
									&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
								{
									if (near_mine && near_hand)	//If it's near both, the spawn gets priority.
									{
										double_positions.push({x: tempx, y: tempy});
									}
									else if (near_mine)	//If it's near one, the spawn can't go there, but the store can.
									{
										single_positions_mine.push({x: tempx, y: tempy});
									}
									else if (near_hand)
									{
										single_positions_hand.push({x: tempx, y: tempy});
									}
								}
							}
						}

						//Now select from among these positions.
						console.log('double_positions.length ' + double_positions.length);
						if (double_positions.length >= 2)
						{
							//Rather than deciding these arbitrarily, let's put the store slightly closer to the main spawn.
							store_pos = calculate.true_closest(spawn.pos, double_positions,
								{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
									costCallback: function(roomName, costMatrix)
									{
										return tempcostmatrix;
									}
								})[0];
							store_pos = {x: store_pos.x, y: store_pos.y};

							//Now assign the other one.
							for (let dp = 0; dp < double_positions.length; dp++)
							{
								if (!(store_pos.x === double_positions[dp].x && store_pos.y === double_positions[dp].y))
								{
									spawn_pos = {x: double_positions[dp].x, y: double_positions[dp].y};
									break;
								}
							}

							//Since everything else has been assigned, let's place the terminal.
							for (let x = -1, searching = true; searching && x < 2; x++)
							{
								let tempx = final_choice.final_path[bpos_i].x + x;

								for (let y = -1; searching && y < 2; y++)
								{
									let tempy = final_choice.final_path[bpos_i].y + y;

									if (terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
									{
										term_pos = {x: tempx, y: tempy};
										searching = false;
									}
								}
							}
						}
						else if (double_positions.length === 1)
						{
							spawn_pos = {x: double_positions[0].x, y: double_positions[0].y};

							if (single_positions_hand.length)
							{
								store_pos = {x: single_positions_hand[0].x, y: single_positions_hand[0].y};

								//Now place the terminal.
								double_positions = [];
								for (dp = bpos_i, searching = true; searching && dp >= 0; dp--)
								{
									for (let x = -1; searching && x < 2; x++)
									{
										let tempx = final_choice.final_path[dp].x + x;

										for (let y = -1; searching && y < 2; y++)
										{
											let tempy = final_choice.final_path[dp].y + y;

											if (terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
											{
												double_positions.push({x: tempx, y: tempy});
												if (double_positions.length >= 2)
												{
													searching = false;
												}
											}
										}
									}
								}

								//Rather than deciding these arbitrarily, let's put the terminal slightly closer to the main spawn.
								term_pos = calculate.true_closest(spawn.pos, double_positions,
									{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
										costCallback: function(roomName, costMatrix)
										{
											return tempcostmatrix;
										}
									})[0];
								term_pos = {x: term_pos.x, y: term_pos.y};
							}
							else
							{
								console.log('No position touching apos for the store.');

								//We'll have to put both the store and the terminal before bpos.
								double_positions = [];
								for (dp = bpos_i, searching = true; searching && dp >= 0; dp--)
								{
									for (let x = -1; searching && x < 2; x++)
									{
										let tempx = final_choice.final_path[dp].x + x;

										for (let y = -1; searching && y < 2; y++)
										{
											let tempy = final_choice.final_path[dp].y + y;

											if (terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
											{
												double_positions.push({x: tempx, y: tempy});
												if (double_positions.length >= 2)
												{
													searching = false;
												}
											}
										}
									}
								}

								//Rather than deciding these arbitrarily, let's put the terminal slightly closer to the main spawn.
								term_pos = calculate.true_closest(spawn.pos, double_positions,
									{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
										costCallback: function(roomName, costMatrix)
										{
											return tempcostmatrix;
										}
									})[0];
								term_pos = {x: term_pos.x, y: term_pos.y};

								//Remove the one we used.
								for (dp = 0; dp < double_positions.length; dp++)
								{
									if (term_pos.x === double_positions[dp].x && term_pos.y === double_positions[dp].y)
									{
										double_positions.splice(dp, 1);
										break;
									}
								}

								//Rather than deciding these arbitrarily, let's put the store slightly closer to the main spawn.
								store_pos = calculate.true_closest(spawn.pos, double_positions,
									{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
										costCallback: function(roomName, costMatrix)
										{
											return tempcostmatrix;
										}
									})[0];
								store_pos = {x: store_pos.x, y: store_pos.y};
							}
						}

						//Since we have mine_pos, hand_pos, and spawn_pos, let's point the spawn to them.
						spawn_dir.push(calculate.orientation[hand_pos.x - spawn_pos.x][hand_pos.y - spawn_pos.y]);
						spawn_dir.push(calculate.orientation[mine_pos.x - spawn_pos.x][mine_pos.y - spawn_pos.y]);
					}
					else
					{
						//If it's still not touching the mineral, towing will be needed.
						needs_towing = true;
						console.log('Towing will be needed.');

						apos_pos = new RoomPosition(final_choice.final_path[apos_i].x, final_choice.final_path[apos_i].y, room_name);
						mine_pos = new RoomPosition(final_choice.final_path[last_i].x, final_choice.final_path[last_i].y, room_name);
						hand_pos = new RoomPosition(final_choice.final_path[last_i - 1].x, final_choice.final_path[last_i - 1].y, room_name);

						//Since towing is needed, the spawn and store can just touch apos as long as they aren't on the path.
						for (let x = -1; x < 2; x++)
						{
							let tempx = apos_pos.x + x;

							for (let y = -1; y < 2; y++)
							{
								let tempy = apos_pos.y + y;
								let temp_pos_live = new RoomPosition(tempx, tempy, room_name);

								if (!(tempx === mine_pos.x && tempy === mine_pos.y) && !(tempx === hand_pos.x && tempy === hand_pos.y)	//Don't reuse a chosen position.
									&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
								{
									//In this case, we only care if it's near apos.
									if (temp_pos_live.isNearTo(apos_pos))
									{
										double_positions.push({x: tempx, y: tempy});
									}
								}
							}
						}

						//Now select from among these positions.
						console.log('double_positions.length ' + double_positions.length);
						if (double_positions.length >= 2)
						{
							//Rather than deciding these arbitrarily, let's put the store slightly closer to the main spawn.
							store_pos = calculate.true_closest(spawn.pos, double_positions,
								{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
									costCallback: function(roomName, costMatrix)
									{
										return tempcostmatrix;
									}
								})[0];
							store_pos = {x: store_pos.x, y: store_pos.y};

							//Now assign the other one.
							for (let dp = 0; dp < double_positions.length; dp++)
							{
								if (!(store_pos.x === double_positions[dp].x && store_pos.y === double_positions[dp].y))
								{
									spawn_pos = {x: double_positions[dp].x, y: double_positions[dp].y};
									break;
								}
							}

							//Since everything else has been assigned, let's place the terminal.
							term_pos = [];
							for (let x = -1; x < 2; x++)
							{
								let tempx = final_choice.final_path[bpos_i].x + x;

								for (let y = -1; y < 2; y++)
								{
									let tempy = final_choice.final_path[bpos_i].y + y;

									if (!(tempx === mine_pos.x && tempy === mine_pos.y) && !(tempx === hand_pos.x && tempy === hand_pos.y)	//Don't reuse a chosen position.
									&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
									{
										term_pos.push({x: tempx, y: tempy});
									}
								}
							}

							//Rather than deciding these arbitrarily, let's put the terminal slightly closer to the main spawn.
							term_pos = calculate.true_closest(spawn.pos, term_pos,
								{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
									costCallback: function(roomName, costMatrix)
									{
										return tempcostmatrix;
									}
								})[0];
							term_pos = {x: term_pos.x, y: term_pos.y};

							//Since we have a towing scenario, let's point the spawn to apos.
							spawn_dir.push(calculate.orientation[apos_pos.x - spawn_pos.x][apos_pos.y - spawn_pos.y]);
						}
						else if (double_positions.length === 1)
						{
							spawn_pos = {x: double_positions[0].x, y: double_positions[0].y};

							console.log('No position touching apos for the store.');

							//Since everything else has been assigned, let's place the store and terminal.
							double_positions = [];
							for (let x = -1, searching = 2; searching && x < 2; x++)
							{
								let tempx = final_choice.final_path[bpos_i].x + x;

								for (let y = -1; searching && y < 2; y++)
								{
									let tempy = final_choice.final_path[bpos_i].y + y;

									if (!(tempx === mine_pos.x && tempy === mine_pos.y) && !(tempx === hand_pos.x && tempy === hand_pos.y)	//Don't reuse a chosen position.
									&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
									{
										double_positions.push({x: tempx, y: tempy});
										searching--;
									}
								}
							}

							if (double_positions.length)
							{
								//Rather than deciding these arbitrarily, let's put the terminal slightly closer to the main spawn.
								term_pos = calculate.true_closest(spawn.pos, double_positions,
									{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
										costCallback: function(roomName, costMatrix)
										{
											return tempcostmatrix;
										}
									})[0];
								term_pos = {x: term_pos.x, y: term_pos.y};
							}

							if (double_positions.length >= 2)
							{
								//Now assign the other one.
								for (let dp = 0; dp < double_positions.length; dp++)
								{
									if (!(term_pos.x === double_positions[dp].x && term_pos.y === double_positions[dp].y))
									{
										store_pos = {x: double_positions[dp].x, y: double_positions[dp].y};
										break;
									}
								}
							}
							else
							{
								console.log('No position touching bpos for the terminal.');

								//Put the store where we were going to put the terminal.
								store_pos = term_pos;
								term_pos = undefined;

								//Now put the terminal anywhere we can.
								double_positions = null;
								for (i = bpos_i - 1; !double_positions && i >= 0; i -= 2)
								{
									for (let x = -1; x < 2; x++)
									{
										let tempx = final_choice.final_path[i].x + x;

										for (let y = -1; y < 2; y++)
										{
											let tempx = final_choice.final_path[i].y + y;

											if (!(tempx === store_pos.x && tempy === store_pos.y)	//Don't reuse a chosen position.
												&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
											{
												//Add any valid position we find.
												if (double_positions)
												{
													double_positions.push({x: tempx, y: tempy});
												}
												else
												{
													double_positions = [{x: tempx, y: tempy}];
												}
											}
										}
									}
								}

								//Rather than deciding these arbitrarily, let's put the terminal slightly closer to bpos.
								term_pos = calculate.true_closest(new RoomPosition(final_choice.final_path[bpos_i].x, final_choice.final_path[bpos_i].y), double_positions,
									{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
										costCallback: function(roomName, costMatrix)
										{
											tempcostmatrix.set(store_pos.x, store_pos.y, 255);

											return tempcostmatrix;
										}
									})[0];
								term_pos = {x: term_pos.x, y: term_pos.y};
							}

							//Since we have a towing scenario, let's point the spawn to apos.
							spawn_dir.push(calculate.orientation[apos_pos.x - spawn_pos.x][apos_pos.y - spawn_pos.y]);
						}
						else
						{
							console.log('No position touching apos for the spawn or store.');
							spawn_pos = undefined;
							store_pos = undefined;
							term_pos = undefined;

							//We will need to place spawn, store, and terminal. Towing will also be needed.
							needs_towing = true;
							console.log('Towing will be needed.');

							double_positions = [];
							for (i = bpos_i - 1; double_positions.length < 3 && i >= 0; i -= 2)
							{
								for (let x = -1; x < 2; x++)
								{
									let tempx = final_choice.final_path[i].x + x;

									for (let y = -1; y < 2; y++)
									{
										let tempx = final_choice.final_path[i].y + y;

										if (!(tempx === store_pos.x && tempy === store_pos.y)	//Don't reuse a chosen position.
											&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
										{
											//Add any valid position we find.
											double_positions.push({x: tempx, y: tempy});
										}
									}
								}
							}

							if (double_positions.length < 3)
							{
								console.log('Some positions still missing.');
							}

							//Rather than deciding these arbitrarily, let's put them slightly closer to bpos.
							while (double_positions.length && (!spawn_pos || !store_pos || !term_pos))
							{
								let temp_pos_live = calculate.true_closest(new RoomPosition(final_choice.final_path[bpos_i].x, final_choice.final_path[bpos_i].y), double_positions,
									{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
										costCallback: function(roomName, costMatrix)
										{
											tempcostmatrix.set(store_pos.x, store_pos.y, 255);

											return tempcostmatrix;
										}
									})[0];

								if (!spawn_pos)
								{
									spawn_pos = {x: temp_pos_live.x, y: temp_pos_live.y};
								}
								else if (!store_pos)
								{
									store_pos = {x: temp_pos_live.x, y: temp_pos_live.y};
								}
								else if (!term_pos)
								{
									term_pos = {x: temp_pos_live.x, y: temp_pos_live.y};
								}
								else
								{
									break;
								}

								//Now remove the one we used.
								for (dp = 0; dp < double_positions.length; dp++)
								{
									if (temp_pos_live.x === double_positions[dp].x && temp_pos_live.y === double_positions[dp].y)
									{
										double_positions.splice(dp, 1);
										break;
									}
								}
							}

							//Since we have a towing scenario with a pre-stamp spawn, let's point the spawn to bpos.
							spawn_dir.push(new RoomPosition(spawn_pos.x, spawn_pos.y, room_name).getDirectionTo(final_choice.final_path[bpos_i].x, final_choice.final_path[bpos_i].y));
						}
					}
				}
				else	//If it's not touching a lab, but it's still touching the mineral.
				{
					//If it's not touching a lab, we need to find another appropriate position.
					console.log('Lab Not Touching.');
					apos_pos = new RoomPosition(final_choice.final_path[apos_i].x, final_choice.final_path[apos_i].y, room_name);
					let temp_pos = [];
					let tow_temp_pos = [];
					let temp_pos_live;
					for (let x = -1; x < 2; x++)
					{
						let tempx = apos_pos.x + x;

						for (let y = -1; y < 2; y++)
						{
							let tempy = apos_pos.y + y;

							//Is it not the inner tile? Is it not a lab?
							if ((!labxy[tempx] || !labxy[tempx][tempy]) && tempx !== inner_pos.x && tempy !== inner_pos.y && (x !== 0 || y !== 0)
								&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL)
							{
								//console.log("It's not an inner tile or a lab.");
								temp_pos_live = new RoomPosition(tempx, tempy, room_name);

								//Is it touching a lab and the mineral?
								if (temp_pos_live.isNearTo(temp_pos_live.findClosestByRange(lab_objects)))
								{
									if (temp_pos_live.isNearTo(mineral))
									{
										//We found a potential mining position.
										temp_pos.push(temp_pos_live);
									}
									else
									{
										//We found a potential position, but it's not near the mineral.
										tow_temp_pos.push(temp_pos_live);
									}
								}
							}
							//This shouldn't be needed. If there's nothing found we can just revert to using the last step.
							/*else if(tempx === final_choice.final_path[last_i].x && tempy === final_choice.final_path[last_i].y)
							{
								//If there's no other options, we could still use the last step.
								tow_temp_pos.push(temp_pos_live);
							}*/
						}
					}

					console.log('temp_pos.length ' + temp_pos.length);
					console.log('tow_temp_pos.length ' + tow_temp_pos.length);

					//Remember, we are here because we have one path step after apos that's touching the mineral. It just wasn't touching a lab.
					let bpos_pos = new RoomPosition(final_choice.final_path[bpos_i].x, final_choice.final_path[bpos_i].y, room_name);
					if (temp_pos.length === 1)
					{
						//If we only found one, let's use it.
						mine_pos = temp_pos[0];
						hand_pos = apos_pos;

						//If we're abandoning the last step in the mine path, we can put the spawn here, since it touches both mine_pos and hand_pos.
						spawn_pos = final_choice.final_path[last_i];
						double_positions = [];

						//Now find a place for the store (touching apos of course.)
						for (let x = -1; x < 2; x++)
						{
							let tempx = apos_pos.x + x;

							for (let y = -1; y < 2; y++)
							{
								let tempy = apos_pos.y + y;

								if (!(tempx === apos_pos.x && tempy === apos_pos.y) && !(tempx === mine_pos.x && tempy === mine_pos.y)	//Don't use apos or mine_pos. (hand_pos is the same as apos.)
									&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path, labs, or spawn. Don't touch an exit tile.
								{
									double_positions.push({x: tempx, y: tempy});
								}
							}
						}

						if (double_positions.length)	//Since true_closest early-returns a single, and we only need to place the store, we don't need separate cases for 1 or more than 1.
						{
							//Rather than deciding these arbitrarily, let's put the store slightly closer to the main spawn.
							store_pos = calculate.true_closest(spawn.pos, double_positions,
								{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
									costCallback: function(roomName, costMatrix)
									{
										tempcostmatrix.set(spawn_pos.x, spawn_pos.y, 255);

										return tempcostmatrix;
									}
								})[0];
							store_pos = {x: store_pos.x, y: store_pos.y};

							//Now that we've come this far, let's place the terminal.
							double_positions = [];
							for (let x = -1; x < 2; x++)
							{
								let tempx = final_choice.final_path[bpos_i].x + x;
								
								for (let y = -1; y < 2; y++)
								{
									let tempy = final_choice.final_path[bpos_i].y + y;

									if (!(tempx === bpos_pos.x && tempy === bpos_pos.y)	//Don't use bpos.
										&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path, labs, or spawn. Don't touch an exit tile.
									{
										double_positions.push({x: tempx, y: tempy});
									}
								}
							}

							//Rather than deciding these arbitrarily, let's put the terminal slightly closer to the main spawn.
							term_pos = calculate.true_closest(spawn.pos, double_positions,
								{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
									costCallback: function(roomName, costMatrix)
									{
										tempcostmatrix.set(store_pos.x, store_pos.y, 255);

										return tempcostmatrix;
									}
								})[0];
							term_pos = {x: term_pos.x, y: term_pos.y};
						}
						else
						{
							console.log('There was no place to put the store touching apos.');

							//Since there was nowhere for the store touching apos, we'll have to put it by bpos with the terminal.
							double_positions = [];
							for (i = bpos_i - 1; double_positions.length < 2 && i >= 0; i -= 2)
							{
								for (let x = -1; x < 2; x++)
								{
									let tempx = final_choice.final_path[i].x;

									for (let y = -1; y < 2; y++)
									{
										let tempy = final_choice.final_path[i].y;

										if (!(tempx === bpos_pos.x && tempy === bpos_pos.y)	//Don't use bpos.
											&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use any path or labs. Don't touch an exit tile.
										{
											double_positions.push({x: tempx, y: tempy});
										}
									}
								}
							}

							//Rather than deciding these arbitrarily, let's put them slightly closer to bpos.
							while (double_positions.length && (!store_pos || !term_pos))
							{
								let temp_pos_live = calculate.true_closest(new RoomPosition(final_choice.final_path[bpos_i].x, final_choice.final_path[bpos_i].y), double_positions,
									{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
										costCallback: function(roomName, costMatrix)
										{
											tempcostmatrix.set(store_pos.x, store_pos.y, 255);

											return tempcostmatrix;
										}
									})[0];

								if (!store_pos)
								{
									store_pos = {x: temp_pos_live.x, y: temp_pos_live.y};
								}
								else if (!term_pos)
								{
									term_pos = {x: temp_pos_live.x, y: temp_pos_live.y};
								}
								else
								{
									break;
								}

								//Now remove the one we used.
								for (dp = 0; dp < double_positions.length; dp++)
								{
									if (temp_pos_live.x === double_positions[dp].x && temp_pos_live.y === double_positions[dp].y)
									{
										double_positions.splice(dp, 1);
										break;
									}
								}
							}
						}
					}
					else if(temp_pos.length)
					{
						//If we found more than one, we should pick the most appropriate one. (The one with the most valid spaces around it.)
						let most_valid = 0;
						let most_valid_index = [];

						for (let tp = 0, current_valid; tp < temp_pos.length; tp++)
						{
							current_valid = 0;
							for (let x = -1; x < 2; x++)
							{
								let tempx = temp_pos[tp].x + x;

								for (let y = -1; y < 2; y++)
								{
									let tempy = temp_pos[tp].y + y;

									if (!(tempx === apos_pos.x && tempy === apos_pos.y)	//Don't use apos.
										&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0)	//Don't use the path or labs.
									{
										current_valid++;
									}
								}
							}

							if (current_valid > most_valid)
							{
								most_valid = current_valid;
								most_valid_index = [tp];
							}
							else if (current_valid === most_valid)
							{
								most_valid_index.push(tp);
							}
						}

						if (most_valid_index.length)
						{
							mine_pos = temp_pos[most_valid_index[0]];
						}
						hand_pos = apos_pos;	//The alternate mine_pos is still touching a lab, so it's still touching apos.

						if (most_valid_index.length === 1)	//If we're abandoning the last step in the mine path, we can put the spawn here, since it touches both mine_pos and hand_pos.
						{
							spawn_pos = final_choice.final_path[last_i];
							double_positions = [];

							//Now find a place for the store (touching apos of course.)
							for (let x = -1; x < 2; x++)
							{
								let tempx = apos_pos.x + x;

								for (let y = -1; y < 2; y++)
								{
									let tempy = apos_pos.y + y;

									if (!(tempx === apos_pos.x && tempy === apos_pos.y) && !(tempx === mine_pos.x && tempy === mine_pos.y)	//Don't use apos or mine_pos. (hand_pos is the same as apos.)
										&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path, labs, or spawn. Don't touch an exit tile.
									{
										double_positions.push({x: tempx, y: tempy});
									}
								}
							}

							if (double_positions.length)	//Since true_closest early-returns a single, and we only need to place the store, we don't need separate cases for 1 or more than 1.
							{
								//Rather than deciding these arbitrarily, let's put the store slightly closer to the main spawn.
								store_pos = calculate.true_closest(spawn.pos, double_positions,
									{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
										costCallback: function(roomName, costMatrix)
										{
											tempcostmatrix.set(spawn_pos.x, spawn_pos.y, 255);

											return tempcostmatrix;
										}
									})[0];
								store_pos = {x: store_pos.x, y: store_pos.y};

								//Now that we've come this far, let's place the terminal.
								double_positions = [];
								for (let x = -1; x < 2; x++)
								{
									let tempx = final_choice.final_path[bpos_i].x;
									
									for (let y = -1; y < 2; y++)
									{
										let tempy = final_choice.final_path[bpos_i].y;

										if (!(tempx === bpos_pos.x && tempy === bpos_pos.y)	//Don't use bpos.
											&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path, labs, or spawn. Don't touch an exit tile.
										{
											double_positions.push({x: tempx, y: tempy});
										}
									}
								}

								//Rather than deciding these arbitrarily, let's put the terminal slightly closer to the main spawn.
								term_pos = calculate.true_closest(spawn.pos, double_positions,
									{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
										costCallback: function(roomName, costMatrix)
										{
											tempcostmatrix.set(store_pos.x, store_pos.y, 255);

											return tempcostmatrix;
										}
									})[0];
								term_pos = {x: term_pos.x, y: term_pos.y};
							}
							else
							{
								console.log('There was no place to put the store touching apos.');

								//Since there was nowhere for the store touching apos, we'll have to put it by bpos with the terminal.
								double_positions = [];
								for (i = bpos_i - 1; double_positions.length < 2 && i >= 0; i -= 2)
								{
									for (let x = -1; x < 2; x++)
									{
										let tempx = final_choice.final_path[i].x;

										for (let y = -1; y < 2; y++)
										{
											let tempy = final_choice.final_path[i].y;

											if (!(tempx === bpos_pos.x && tempy === bpos_pos.y)	//Don't use bpos.
												&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use any path or labs. Don't touch an exit tile.
											{
												double_positions.push({x: tempx, y: tempy});
											}
										}
									}
								}

								//Rather than deciding these arbitrarily, let's put them slightly closer to bpos.
								while (double_positions.length && (!store_pos || !term_pos))
								{
									let temp_pos_live = calculate.true_closest(new RoomPosition(final_choice.final_path[bpos_i].x, final_choice.final_path[bpos_i].y), double_positions,
										{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
											costCallback: function(roomName, costMatrix)
											{
												tempcostmatrix.set(store_pos.x, store_pos.y, 255);

												return tempcostmatrix;
											}
										})[0];

									if (!store_pos)
									{
										store_pos = {x: temp_pos_live.x, y: temp_pos_live.y};
									}
									else if (!term_pos)
									{
										term_pos = {x: temp_pos_live.x, y: temp_pos_live.y};
									}
									else
									{
										break;
									}

									//Now remove the one we used.
									for (dp = 0; dp < double_positions.length; dp++)
									{
										if (temp_pos_live.x === double_positions[dp].x && temp_pos_live.y === double_positions[dp].y)
										{
											double_positions.splice(dp, 1);
											break;
										}
									}
								}
							}
						}
						else if (most_valid_index.length)	//If we have two positions tied for the most valid area around them, let's use them both.
						{
							//Rather than deciding these arbitrarily, let's put the store slightly closer to the main spawn.
							store_pos = calculate.true_closest(spawn.pos, temp_pos,
								{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
									costCallback: function(roomName, costMatrix)
									{
										return tempcostmatrix;
									}
								})[0];
							store_pos = {x: store_pos.x, y: store_pos.y};

							//Now assign the other one.
							for (let tp = 0; tp < temp_pos.length; tp++)
							{
								if (!(store_pos.x === temp_pos[tp].x && store_pos.y === temp_pos[tp].y))
								{
									spawn_pos = {x: temp_pos[tp].x, y: temp_pos[tp].y};
									break;
								}
							}
						}
						else
						{
							console.log('No valid position touching the labs was found.');
						}

						//mine_pos = temp_pos[0];
					}
					else	//There are none touching the mineral. If there was still a tow_temp_pos, our last step went diagonally outward from the stamp, and then the mineral went diagonally outward after that.
					{
						needs_towing = true;
						console.log('Towing will be needed.');

						apos_pos = new RoomPosition(final_choice.final_path[apos_i].x, final_choice.final_path[apos_i].y, room_name);
						mine_pos = new RoomPosition(final_choice.final_path[last_i].x, final_choice.final_path[last_i].y, room_name);
						hand_pos = new RoomPosition(final_choice.final_path[last_i - 1].x, final_choice.final_path[last_i - 1].y, room_name);

						//Since towing is needed, the spawn and terminal can just touch apos as long as they aren't on the path.
						for (let x = -1; x < 2; x++)
						{
							let tempx = apos_pos.x + x;

							for (let y = -1; y < 2; y++)
							{
								let tempy = apos_pos.y + y;
								let temp_pos_live = new RoomPosition(tempx, tempy, room_name);

								if (!(tempx === mine_pos.x && tempy === mine_pos.y) && !(tempx === hand_pos.x && tempy === hand_pos.y)	//Don't reuse a chosen position.
									&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
								{
									//In this case, we only care if it's near apos.
									if (temp_pos_live.isNearTo(apos_pos))
									{
										double_positions.push({x: tempx, y: tempy});
									}
								}
							}
						}

						//Now select from among these positions.
						if (double_positions.length >= 2)
						{
							//Rather than deciding these arbitrarily, let's put the store slightly closer to the mineral.
							store_pos = calculate.true_closest(mineral, double_positions,
								{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
									costCallback: function(roomName, costMatrix)
									{
										return tempcostmatrix;
									}
								})[0];
							store_pos = {x: store_pos.x, y: store_pos.y};

							//Now assign the other one.
							for (let dp = 0; dp < double_positions.length; dp++)
							{
								if (!(store_pos.x === double_positions[dp].x && store_pos.y === double_positions[dp].y))
								{
									spawn_pos = {x: double_positions[dp].x, y: double_positions[dp].y};
									break;
								}
							}

							//Since everything else has been assigned, let's place the terminal.
							term_pos = [];
							for (let x = -1; x < 2; x++)
							{
								let tempx = final_choice.final_path[bpos_i].x + x;

								for (let y = -1; y < 2; y++)
								{
									let tempy = final_choice.final_path[bpos_i].y + y;

									if (!(tempx === mine_pos.x && tempy === mine_pos.y) && !(tempx === hand_pos.x && tempy === hand_pos.y)	//Don't reuse a chosen position.
									&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
									{
										term_pos.push({x: tempx, y: tempy});
									}
								}
							}

							//Rather than deciding these arbitrarily, let's put the terminal slightly closer to the main spawn.
							term_pos = calculate.true_closest(spawn.pos, term_pos,
								{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
									costCallback: function(roomName, costMatrix)
									{
										return tempcostmatrix;
									}
								})[0];
							term_pos = {x: term_pos.x, y: term_pos.y};

							//Since we have a towing scenario, let's point the spawn to apos.
							spawn_dir.push(calculate.orientation[apos_pos.x - spawn_pos.x][apos_pos.y - spawn_pos.y]);
						}
						else if (double_positions.length === 1)
						{
							spawn_pos = {x: double_positions[0].x, y: double_positions[0].y};

							console.log('No position touching apos for the store.');

							//Since everything else has been assigned, let's place the store and terminal.
							double_positions = [];
							for (let x = -1, searching = 2; searching && x < 2; x++)
							{
								let tempx = final_choice.final_path[bpos_i].x + x;

								for (let y = -1; searching && y < 2; y++)
								{
									let tempy = final_choice.final_path[bpos_i].y + y;

									if (!(tempx === mine_pos.x && tempy === mine_pos.y) && !(tempx === hand_pos.x && tempy === hand_pos.y)	//Don't reuse a chosen position.
									&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
									{
										double_positions.push({x: tempx, y: tempy});
										searching--;
									}
								}
							}

							if (double_positions.length)
							{
								//Rather than deciding these arbitrarily, let's put the terminal slightly closer to the main spawn.
								term_pos = calculate.true_closest(spawn.pos, double_positions,
									{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
										costCallback: function(roomName, costMatrix)
										{
											return tempcostmatrix;
										}
									})[0];
								term_pos = {x: term_pos.x, y: term_pos.y};
							}

							if (double_positions.length >= 2)
							{
								//Now assign the other one.
								for (let dp = 0; dp < double_positions.length; dp++)
								{
									if (!(term_pos.x === double_positions[dp].x && term_pos.y === double_positions[dp].y))
									{
										store_pos = {x: double_positions[dp].x, y: double_positions[dp].y};
										break;
									}
								}
							}
							else
							{
								console.log('No position touching bpos for the terminal.');

								//Put the store where we were going to put the terminal.
								store_pos = term_pos;
								term_pos = undefined;

								//Now put the terminal anywhere we can.
								double_positions = null;
								for (i = bpos_i - 1; !double_positions && i >= 0; i -= 2)
								{
									for (let x = -1; x < 2; x++)
									{
										let tempx = final_choice.final_path[i].x + x;

										for (let y = -1; y < 2; y++)
										{
											let tempx = final_choice.final_path[i].y + y;

											if (!(tempx === store_pos.x && tempy === store_pos.y)	//Don't reuse a chosen position.
												&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
											{
												//Add any valid position we find.
												if (double_positions)
												{
													double_positions.push({x: tempx, y: tempy});
												}
												else
												{
													double_positions = [{x: tempx, y: tempy}];
												}
											}
										}
									}
								}

								//Rather than deciding these arbitrarily, let's put the terminal slightly closer to bpos.
								term_pos = calculate.true_closest(new RoomPosition(final_choice.final_path[bpos_i].x, final_choice.final_path[bpos_i].y), double_positions,
									{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
										costCallback: function(roomName, costMatrix)
										{
											tempcostmatrix.set(store_pos.x, store_pos.y, 255);

											return tempcostmatrix;
										}
									})[0];
								term_pos = {x: term_pos.x, y: term_pos.y};
							}

							//Since we have a towing scenario, let's point the spawn to apos.
							spawn_dir.push(calculate.orientation[apos_pos.x - spawn_pos.x][apos_pos.y - spawn_pos.y]);
						}
						else
						{
							console.log('No position touching apos for the spawn or store.');
							spawn_pos = undefined;
							store_pos = undefined;
							term_pos = undefined;

							//We will need to place spawn, store, and terminal. Towing will also be needed.
							needs_towing = true;
							console.log('Towing will be needed.');

							double_positions = [];
							for (i = bpos_i - 1; double_positions.length < 3 && i >= 0; i -= 2)
							{
								for (let x = -1; x < 2; x++)
								{
									let tempx = final_choice.final_path[i].x + x;

									for (let y = -1; y < 2; y++)
									{
										let tempx = final_choice.final_path[i].y + y;

										if (!(tempx === store_pos.x && tempy === store_pos.y)	//Don't reuse a chosen position.
											&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
										{
											//Add any valid position we find.
											double_positions.push({x: tempx, y: tempy});
										}
									}
								}
							}

							if (double_positions.length < 3)
							{
								console.log('Some positions still missing.');
							}

							//Rather than deciding these arbitrarily, let's put them slightly closer to bpos.
							while (double_positions.length && (!spawn_pos || !store_pos || !term_pos))
							{
								let temp_pos_live = calculate.true_closest(new RoomPosition(final_choice.final_path[bpos_i].x, final_choice.final_path[bpos_i].y), double_positions,
									{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
										costCallback: function(roomName, costMatrix)
										{
											tempcostmatrix.set(store_pos.x, store_pos.y, 255);

											return tempcostmatrix;
										}
									})[0];

								if (!spawn_pos)
								{
									spawn_pos = {x: temp_pos_live.x, y: temp_pos_live.y};
								}
								else if (!store_pos)
								{
									store_pos = {x: temp_pos_live.x, y: temp_pos_live.y};
								}
								else if (!term_pos)
								{
									term_pos = {x: temp_pos_live.x, y: temp_pos_live.y};
								}
								else
								{
									break;
								}

								//Now remove the one we used.
								for (dp = 0; dp < double_positions.length; dp++)
								{
									if (temp_pos_live.x === double_positions[dp].x && temp_pos_live.y === double_positions[dp].y)
									{
										double_positions.splice(dp, 1);
										break;
									}
								}
							}

							//Since we have a towing scenario with a pre-stamp spawn, let's point the spawn to bpos.
							spawn_dir.push(new RoomPosition(spawn_pos.x, spawn_pos.y, room_name).getDirectionTo(final_choice.final_path[bpos_i].x, final_choice.final_path[bpos_i].y));
						}
					}
					/*else
					{
						console.log("We couldn't find an appropriate spot.");
						
						//If we couldn't find any position touching the labs, we'll have to revert to the original last step position and utilize towing.
						needs_towing = true;
						console.log('Towing will be needed.');

						mine_pos = new RoomPosition(final_choice.final_path[apos_i + 1].x, final_choice.final_path[apos_i + 1].y, room_name);
						hand_pos = new RoomPosition(final_choice.final_path[apos_i].x, final_choice.final_path[apos_i].y, room_name);
					}
					else if(tow_temp_pos.length)	//There are none touching the mineral. In this case, our last step went diagonally outward and then the mineral went diagonally outward after that.
					{
						needs_towing = true;
						console.log('Towing will be needed.');

						//If we found more than one, we should pick the most appropriate one.
						mine_pos = new RoomPosition(final_choice.final_path[last_i].x, final_choice.final_path[last_i].y, room_name);
						hand_pos = new RoomPosition(final_choice.final_path[last_i - 1].x, final_choice.final_path[last_i - 1].y, room_name);
					}*/

					//Since we have mine_pos, hand_pos, and spawn_pos, let's point the spawn to them.
					if (needs_towing)
					{
						spawn_dir.push(calculate.orientation[apos_pos.x - spawn_pos.x][apos_pos.y - spawn_pos.y]);
					}
					else
					{
						spawn_dir.push(calculate.orientation[hand_pos.x - spawn_pos.x][hand_pos.y - spawn_pos.y]);
						spawn_dir.push(calculate.orientation[mine_pos.x - spawn_pos.x][mine_pos.y - spawn_pos.y]);
					}
				}
			}
			else	//There's no next step after apos, because it's already touching the mineral.
			{
				//An apos is guaranteed to be touching a lab.
				console.log('apos is on the last step.');
				apos_pos = new RoomPosition(final_choice.final_path[apos_i].x, final_choice.final_path[apos_i].y, room_name);
				touching_lab = true;

				//The handler should stay on the apos.
				hand_pos = {x: apos_pos.x, y: apos_pos.y};

				//Now find another position for the miner.
				let inner_pos = {x: final_choice.final_path[apos_i - 1].x, y: final_choice.final_path[apos_i - 1].y};
				let temp_pos = [];
				let temp_pos2 = [];
				let temp_pos_live;
				for (let x = -1; x < 2; x++)
				{
					let tempx = apos_pos.x + x;

					for (let y = -1; y < 2; y++)
					{
						let tempy = apos_pos.y + y;

						//Is it not the inner tile? Is it not a lab?
						if ((!labxy[tempx] || !labxy[tempx][tempy]) && !(tempx === inner_pos.x && tempy === inner_pos.y) && (x !== 0 || y !== 0)
							&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL)
						{
							console.log("It's not an inner tile or a lab.");
							temp_pos_live = new RoomPosition(tempx, tempy, room_name);

							//Is it touching a lab and the mineral?
							if (temp_pos_live.isNearTo(temp_pos_live.findClosestByRange(lab_objects)) && temp_pos_live.isNearTo(mineral))
							{
								//We found a potential mining position.
								temp_pos.push(temp_pos_live);
							}

							//Any position can serve as the spawn and store, whether it's touching the mineral or not. But it shouldn't touch an exit tile.
							if (!calculate.check_xy(tempx, tempy, exitxy))
							{
								temp_pos2.push(temp_pos_live);
							}
						}
					}
				}

				//console.log('temp_pos.length ' + temp_pos.length);
				//console.log('temp_pos2.length ' + temp_pos2.length);
				if (temp_pos.length)
				{
					let mine_list = [];
					let spawn_list = [];
					//Rather than deciding these arbitrarily, we have to put the mine somewhere where a spawn can touch them both.
					for (let tp = 0; tp < temp_pos.length; tp++)
					{
						if (temp_pos2.length)
						{
							//The spawn needs to be touching both.
							for (let tp2 = 0; tp2 < temp_pos2.length; tp2++)
							{
								if (temp_pos2[tp2].isNearTo(temp_pos[tp].x, temp_pos[tp].y) && !(temp_pos2[tp2].x === temp_pos[tp].x && temp_pos2[tp2].y === temp_pos[tp].y)	//Is temp_pos2 touching temp_pos without being the same position?
								 && temp_pos2[tp2].isNearTo(hand_pos.x, hand_pos.y) && !(temp_pos2[tp2].x === hand_pos.x && temp_pos2[tp2].y === hand_pos.y)	//Is temp_pos2 touching hand without being the same position?
									 && !calculate.check_xy(temp_pos2[tp2].x, temp_pos2[tp2].y, exitxy))	//A spawn cannot touch an exit tile.
								{
									//Assign the miner and spawn.
									mine_list.push({x: temp_pos[tp].x, y: temp_pos[tp].y, spawn: temp_pos2[tp2]});
									spawn_list.push(temp_pos2[tp2]);
								}
							}
						}
						else
						{
							console.log("Couldn't find a position for spawn touching hand and miner.");
						}
					}

					console.log('mine_list.length ' + mine_list.length);
					if (mine_list.length === 1)	//If there was only one valid configuration, use it.
					{
						mine_pos = {x: mine_list[0].x, y: mine_list[0].y};
						spawn_pos = {x: spawn_list[0].x, y: spawn_list[0].y};

						//Remove any positions we used.
						for (let tp2 = temp_pos2.length - 1; tp2 >= 0; tp2--)
						{
							if ((temp_pos2[tp2].x === mine_pos.x && temp_pos2[tp2].y === mine_pos.y) || (temp_pos2[tp2].x === spawn_pos.x && temp_pos2[tp2].y === spawn_pos.y))
							{
								temp_pos2.splice(tp2, 1);
							}
						}

						if (!temp_pos2.length)	//There was nowhere left to put the store. We'll have to put it touching bpos.
						{
							for (let x = -1; x < 2; x++)
							{
								let tempx = final_choice.final_path[bpos_i].x + x;

								for (let y = -1; y < 2; y++)
								{
									let tempy = final_choice.final_path[bpos_i].y + y;

									if (terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
									{
										temp_pos2.push({x: tempx, y: tempy});
									}
								}
							}
						}

						//Rather than deciding these arbitrarily, let's put the store slightly closer to the main spawn.
						store_pos = calculate.true_closest(spawn.pos, temp_pos2,
							{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
								costCallback: function(roomName, costMatrix)
								{
									return tempcostmatrix;
								}
							})[0];
						store_pos = {x: store_pos.x, y: store_pos.y};
					}
					else if (mine_list.length)	//If there were multiple valid configurations, use the one that puts our store in a nice place.
					{
						let store_list = [];
						let best_store;

						for (let ml = 0; ml < mine_list.length; ml++)
						{
							store_list.push(mine_list[ml].spawn);
						}

						console.log('store_list.length ' + store_list.length);
						if (store_list.length >= 2)
						{
							//Now use a mine and spawn that's compatible with the store we chose.
							for (let ml = 0; ml < mine_list.length; ml++)
							{
								//Rather than deciding these arbitrarily, let's put the store slightly closer to the main spawn.
								best_store = calculate.true_closest(spawn.pos, store_list,
									{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
										costCallback: function(roomName, costMatrix)
										{
											return tempcostmatrix;
										}
									})[0];
								best_store = {x: best_store.x, y: best_store.y};

								if (!(best_store.x === mine_list[ml].spawn.x && best_store.y === mine_list[ml].spawn.y) && !(best_store.x === mine_list[ml].x && best_store.y === mine_list[ml].y))
								{
									spawn_pos = {x: mine_list[ml].spawn.x, y: mine_list[ml].spawn.y};
									mine_pos = {x: mine_list[ml].x, y: mine_list[ml].y};
									store_pos = best_store;
									break;
								}
							}
						}
					}
				}
				else
				{
					console.log("We couldn't find an appropriate spot. x: " + final_choice.x + ', y: ' + final_choice.y + ', o: ' + final_choice.o + ', type: ' + final_choice.type + '.');
					//We couldn't find an appropriate spot for our miner outside the stamp.
				}

				//Now place the terminal.
				for (let x = -1; x < 2; x++)
				{
					let tempx = final_choice.final_path[bpos_i].x + x;

					for (let y = -1; y < 2; y++)
					{
						let tempy = final_choice.final_path[bpos_i].y + y;

						if (!(tempx === store_pos.x && tempy === store_pos.y)	//Don't use the store if we had to put it here.
							&& terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy))	//Don't use the path or labs. Don't touch an exit tile.
						{
							double_positions.push({x: tempx, y: tempy});
						}
					}
				}

				//Rather than deciding these arbitrarily, let's put the terminal slightly closer to the main spawn.
				term_pos = calculate.true_closest(spawn.pos, double_positions,
					{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
						costCallback: function(roomName, costMatrix)
						{
							tempcostmatrix.set(store_pos.x, store_pos.y, 255);

							return tempcostmatrix;
						}
					})[0];
				term_pos = {x: term_pos.x, y: term_pos.y};

				//Since we have mine_pos, hand_pos, and spawn_pos, let's point the spawn to them.
				if (needs_towing)
				{
					spawn_dir.push(calculate.orientation[apos_pos.x - spawn_pos.x][apos_pos.y - spawn_pos.y]);
				}
				else
				{
					spawn_dir.push(calculate.orientation[hand_pos.x - spawn_pos.x][hand_pos.y - spawn_pos.y]);
					spawn_dir.push(calculate.orientation[mine_pos.x - spawn_pos.x][mine_pos.y - spawn_pos.y]);
				}
			}

			//Dedicate the last step to the stationary miner. But if the last step isn't already there, we need to fabricate it.
			if (final_choice.final_path[final_choice.final_path.length - 1].x === mine_pos.x && final_choice.final_path[final_choice.final_path.length - 1].y == mine_pos.y)
			{
				efat = final_choice.final_path.pop();
			}
			else
			{
				efat = {x: mine_pos.x, y: mine_pos.y,
					dx: mine_pos.x - final_choice.final_path[final_choice.final_path.length - 1].x, dy: mine_pos.y - final_choice.final_path[final_choice.final_path.length - 1].y,
					direction: calculate.orientation[mine_pos.x - final_choice.final_path[final_choice.final_path.length - 1].x][mine_pos.y - final_choice.final_path[final_choice.final_path.length - 1].y]}
			}

			//Once everything else is done, let's place a factory and a nuke as well.
			let fact_pos;
			let nuke_pos;
			for (let fa = bpos_i, single_positions = [], tempx, tempy; fa >= 0; fa--)
			{
				for (let x = -1; x < 2; x++)
				{
					tempx = final_choice.final_path[fa].x + x;

					for (let y = -1; y < 2; y++)
					{
						tempy = final_choice.final_path[fa].y + y;

						if (terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL && tempcostmatrix.get(tempx, tempy) === 0 && !calculate.check_xy(tempx, tempy, exitxy)	//Don't use the path or labs. Don't touch an exit tile.
							&& !(tempx === term_pos.x && tempy === term_pos.y) && !(tempx === store_pos.x && tempy === store_pos.y) && !(tempx === spawn_pos.x && tempy === spawn_pos.y)	//Don't use the terminal, store, or spawn if it's here.
							&& !(fact_pos && fact_pos.x === tempx && fact_pos.y === tempy))	//If we've placed the factory, don't use that either.
						{
							//temp_pos_live = new RoomPosition(tempx, tempy, room_name);
							single_positions.push({x: tempx, y: tempy});
						}
					}
				}

				if (single_positions.length)	//Once we've gotten a few, use them.
				{
					if (!fact_pos)
					{
						//Rather than deciding these arbitrarily, let's put the factory slightly closer to bpos.
						fact_pos = calculate.true_closest(new RoomPosition(final_choice.final_path[bpos_i].x, final_choice.final_path[bpos_i].y, room_name), single_positions,
							{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
								costCallback: function(roomName, costMatrix)
								{
									return tempcostmatrix;
								}
							})[0];
						fact_pos = {x: fact_pos.x, y: fact_pos.y};

						//Since we're using one, get them again.
						single_positions = [];
						fa++;
					}
					else if (!nuke_pos)
					{
						//Rather than deciding these arbitrarily, let's put the factory slightly closer to bpos.
						nuke_pos = calculate.true_closest(new RoomPosition(final_choice.final_path[bpos_i].x, final_choice.final_path[bpos_i].y, room_name), single_positions,
							{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
								costCallback: function(roomName, costMatrix)
								{
									return tempcostmatrix;
								}
							})[0];
						nuke_pos = {x: nuke_pos.x, y: nuke_pos.y};
					}

					if (nuke_pos && nuke_pos.x && nuke_pos.y)
					{
						break;
					}
				}
			}

			//Before we finish, get a path from the sources to bpos.
			//This is what we're going to name it when we commit it.
			let labs = [];
			let lreturn = [];
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				labs.push(Game.rooms[room_name].findPath(
					new RoomPosition(Memory.rooms[room_name].sources[i].mine.slice(-1)[0].x, Memory.rooms[room_name].sources[i].mine.slice(-1)[0].y, room_name),
					new RoomPosition(final_choice.final_path[bpos_i].x, final_choice.final_path[bpos_i].y, room_name),
					{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
						costCallback: function(roomName, costMatrix)
						{
							return tempcostmatrix;
						}
					}));

				//Get the reverse path too.
				lreturn.push(calculate.reversepath(labs[labs.length - 1]));

				//Now connect them together.
				calculate.close_loop(labs[i], lreturn[i]);
			}
			

			while (final_choice.final_path.length < final_choice.final_rpath.length)
			{
				console.log('Matching path array sizes.');
				final_choice.final_rpath.shift();
			}

			//Point our first two spawns to the stamp path. They should be capable of producing the stamp roles if necessary.
			//The first step might be inconsistent.
			let first_step_index = 0;
			if (Memory.rooms[room_name].spawns[0].x === final_choice.final_path[0].x && Memory.rooms[room_name].spawns[0].y === final_choice.final_path[0].y)
			{
				first_step_index = 1;
			}
			Memory.rooms[room_name].spawns[0].dir.labdir = calculate.orientation[final_choice.final_path[first_step_index].dx][final_choice.final_path[first_step_index].dy];
			Memory.rooms[room_name].spawns[1].dir.labdir = calculate.orientation[final_choice.final_path[first_step_index].x - Memory.rooms[room_name].spawns[1].x][final_choice.final_path[first_step_index].y - Memory.rooms[room_name].spawns[1].y];

			//The main path shouldn't go in and out of the spawn. Just touch it.
			final_choice.final_path.shift();
			final_choice.final_rpath.pop();

			//Now connect the paths together.
			calculate.close_loop(final_choice.final_path, final_choice.final_rpath);

			//Raw values before finalization.
			final_choice.mine_pos = {x: mine_pos.x, y: mine_pos.y};
			final_choice.hand_pos = {x: hand_pos.x, y: hand_pos.y};
			final_choice.spawn_pos = spawn_pos;
			final_choice.store_pos = store_pos;
			final_choice.term_pos = term_pos;
			final_choice.fact_pos = fact_pos;
			final_choice.nuke_pos = nuke_pos;
			final_choice.spawn_dir = spawn_dir;
			final_choice.needs_towing = needs_towing;
			final_choice.labs_path = labs;
			final_choice.labs_return = lreturn;

			//Efat needs to be an array with one element in it, just like mfat.
			final_choice.efat = [efat];
			if (!final_choice.efat)
			{
				console.log('Generating efat.');
				final_choice.efat =
				[{
					x: final_choice.mine_pos.x,
					y: final_choice.mine_pos.y,
					dx: final_choice.mine_pos.x - final_choice.hand_pos.x,
					dy: final_choice.mine_pos.y - final_choice.hand_pos.y,
					direction: calculate.orientation[final_choice.mine_pos.x - final_choice.hand_pos.x][final_choice.mine_pos.y - final_choice.hand_pos.y]
				}];
			}

			//For observing the results during testing.
			if (!Memory.mineTest)
			{
				Memory.mineTest = {};
			}
			Memory.mineTest[room_name] = final_choice;

			//Assign the results.
			Memory.rooms[room_name].mine =
			{
				needs_towing: final_choice.needs_towing,
				labs: final_choice.labs,
				miner: final_choice.mine_pos,
				handler: final_choice.hand_pos,
				epath: final_choice.final_path,
				ereturn: final_choice.final_rpath,
				efat: final_choice.efat
			};
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				Memory.rooms[room_name].sources[i].labs = final_choice.labs_path[i];
				Memory.rooms[room_name].sources[i].lreturn = final_choice.labs_return[i];
			}

			//Structures will be stored in their intended places.
			Memory.rooms[room_name].spawns[2] = {id: null, x: final_choice.spawn_pos.x, y: final_choice.spawn_pos.y};
			Memory.rooms[room_name].buildings.store = {id: null, x: final_choice.store_pos.x, y: final_choice.store_pos.y};
			Memory.rooms[room_name].buildings.terminal = {id: null, x: final_choice.term_pos.x, y: final_choice.term_pos.y};
			Memory.rooms[room_name].buildings.factory = {id: null, x: final_choice.fact_pos.x, y: final_choice.fact_pos.y};
			Memory.rooms[room_name].buildings.nuker = {id: null, x: final_choice.nuke_pos.x, y: final_choice.nuke_pos.y};

			//If we need to build non-mining creeps, dir.all will be used. It points into the stamp, which will get us back to base.
			Memory.rooms[room_name].spawns[2].dir = {all: final_choice.spawn_dir[0], mine: final_choice.spawn_dir};

			return true;	//We made it this far without any errors.
		}
		else
		{
			Memory.mineTest = undefined;
			Memory.rooms[room_name].mine = null;
			return false;
		}
	},

	redo_labs: function(room_name)
	{
		calculate.deletethispath(room_name, ['labs', 'lreturn', 'epath', 'ereturn', 'efat']);
		roomPlanner.setupMining(room_name);
		calculate.cleanpaths(room_name, 'labs');
	},

	init_complete(room_name, test = false)
	{
		//Finalize the room.
		require('defender').init(room_name);
		roomPlanner.setupMining(room_name);	//Prepare our lab stamp.
		require('empire').room.exitpaths(room_name, true);	//Call this again to go around the towers and lab stamp.
		require('defender').setRamparts(room_name);	//Now that we have gone around towers, set our ramparts.
		require('defender').setDefense(room_name);	//Now that ramparts have been set, we can run the build.
		Memory.rooms[room_name].spawnsmarked = undefined;
		Memory.rooms[room_name].spawnsblocked = undefined;
		calculate.cleanpaths(room_name, 'all');
		if (!test)
		{
			calculate.deleteoldpaths(room_name, 'init');
			calculate.deleteoldpaths(room_name, 'defender');
			calculate.deleteoldpaths(room_name, 'labs');
		}
		Memory.rooms[room_name].init = 2;
		console.log('Init 2 ' + Game.cpu.getUsed());
		
		if (Memory.rooms[room_name].init === 2)
		{
			roomPlanner.run(room_name);
			Memory.rooms[room_name].init = undefined;
		}

		return !test;
	}
};

module.exports = roomPlanner;