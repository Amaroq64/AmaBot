var calculate = require('calculate');

var roomPlanner =
{
	run: function(room_name = false)
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
		if (Game.rooms[room_name].controller.level > 5 || Game.rooms[room_name].controller.level == 1)
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
					require('empire').room.exitpaths(room_name, true);	//Call this again to go around the towers.
					require('defender').setRamparts(room_name);	//Now that we have gone around towers, set our ramparts.
					require('defender').setDefense(room_name);	//Now that ramparts have been set, we can run the build.
					calculate.cleanpaths(room_name, 'all');
					//calculate.deleteoldpaths(room_name, 'init');
					//calculate.deleteoldpaths(room_name, 'defender');
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
			//case 8:
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

			//Are we missing any of our towers?
			if (Game.rooms[room_name].find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}}).length < CONTROLLER_STRUCTURES.tower[Game.rooms[room_name].controller.level])
			{
				for (let t = 0; t < CONTROLLER_STRUCTURES.tower[Game.rooms[room_name].controller.level] && t < Memory.rooms[room_name].defense.towers.length; t++)
				{
					Game.rooms[room_name].createConstructionSite(Memory.rooms[room_name].defense.towers[t].x, Memory.rooms[room_name].defense.towers[t].y, STRUCTURE_TOWER);
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

		//Get a path to the source twice if the first time touched a wall. The second time around, make sure it stays away from walls.
		let found = false;
		for (let run = 0; run < 2; run++)
		{
			if (run)
			{
				//Did we go adjacent to any walls? If so, avoid them this time.
				for (let ex = 0; ex < extract.length - 1; ex++)
				{
					for (let x = -1; x < 2; x++)
					{
						for (let y = -1; y < 2; y++)
						{
							if (terrain.get(extract[ex].x + x, extract[ex].y + y) === TERRAIN_MASK_WALL)
							{
								//We found a wall. Record all contiguous walls connected to it.
								console.log('A wall is touching ' + (extract[ex].x) + ' ' + (extract[ex].y));
								found = calculate.findouterstone(room_name, extract[ex].x + x, extract[ex].y + y, found);
							}
						}
					}
				}

				//Now mark and avoid the spaces touching those walls.
				if (found)
				{
					found = calculate.hugwalls(room_name, found);
					for (let sx in found)
					{
						for (let sy in found[sx])
						{
							tempcostmatrix.set(Number(sx), Number(sy), 10);
						}
					}
				}
			}

			if (!run || found)
			{
				extract = spawn.pos.findPathTo(mineral,
					{plainCost: 2, swampCost: 3, range: 1, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
						costCallback: function(roomName, costMatrix)
						{
							if (!run)
							{
								//Slightly prefer every path that exists.
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
												else
												{
													console.log('Skipping defpaths[' + dp + '].');
												}
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

								//Never leave the room.
								for (x = 0; x < 50; x++)
								{
									if (x === 0 || x === 49)
									{
										for (y = 0; y < 50; y++)
										{
											costMatrix.set(x, y, 255);
										}
									}
									else
									{
										for (y = 0; y < 50; y += 49)
										{
											costMatrix.set(x, y, 255);
										}
									}
								}

								tempcostmatrix = costMatrix.clone();
								return costMatrix;
							}
							else
							{
								return tempcostmatrix;
							}
						}
					});
			}

			//Unmark the spaces around the walls so we can use them again later.
			for (let sx in found)
			{
				for (let sy in found[sx])
				{
					tempcostmatrix.set(Number(sx), Number(sy), 0);
				}
			}
		}

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

			for (let y = 2; y > -3; y--)	//If we're testing three offsets for it, then we can really test 5 lines and record if 3 or more are clean.
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
							console.log('h3 Found a 3x5.');
							tested_true.push({type: 3, n: null, o: calculate.orientation[direction][0], x: tempx, y: tempy})	//Our center three lines have matched.
						}
					}
					else if (line[2 + (2 * t)] && line[2 + (1 * t)])	//Check our border lines.
					{
						//A horizontal 3x5 orients -1 or 1 along the x axis.
						console.log('h3 Found a 3x5.');
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

			for (let x = 2; x > -3; x--)	//If we're testing three offsets for it, then we can really test 5 lines and record if 3 or more are clean.
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
							console.log('v3 Found a 3x5.');
							tested_true.push({type: 3, n: null, o: calculate.orientation[0][direction], x: tempx, y: tempy});	//Our center three lines have matched.
						}
					}
					else if (line[2 + (2 * t)] && line[2 + (1 * t)])	//Check our border lines.
					{
						//A vertical 3x5 orients -1 or 1 along the y axis.
						console.log('v3 Found a 3x5.');
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

		for (let n = 0; n < extract.length; n++)
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
				if (tested_true.length)
				{
					break;
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
							console.log(td + ' Vertical: ' + (tested_true[td].x + x) + ' ' + (tested_true[td].y + bound));
							console.log(td + ' Vertical: ' + (tested_true[td].x + x) + ' ' + tested_true[td].y);
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
				tested_true[td].chosen_bpos = spawn.pos.findClosestByPath(tested_true[td].bpos,
					{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
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
					});

				//Which ending position is closest to the mineral?
				tested_true[td].chosen_apos = closest.findClosestByPath(tested_true[td].apos,
					{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
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
					});

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
					{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
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
					{plainCost: 2, swampCost: 3, range: 1, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
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
					both_chosen = [tested_true[td]];
					closest_count = tested_true[td].chosen_apath.length;
					shortest_count = tested_true[td].chosen_bpath.length + tested_true[td].chosen_apath.length;
				}
				else if (tested_true[td].chosen_apath.length === closest_count && (tested_true[td].chosen_bpath.length + tested_true[td].chosen_apath.length) === shortest_count)
				{
					both_chosen.push(tested_true[td]);
				}
				else if (tested_true[td].chosen_apath.length < closest_count)
				{
					closest_chosen = [tested_true[td]];
					closest_count = tested_true[td].chosen_apath.length;

					//We have found a closer one than the one recorded under both.
					both_chosen = [];

					//If we have found a closer one, let's discard the shortest list too.
					//shortest_chosen = [tested_true[td]];
				}
				else if (tested_true[td].chosen_apath.length === closest_count)
				{
					closest_chosen.push(tested_true[td]);
				}
				else if ((tested_true[td].chosen_bpath.length + tested_true[td].chosen_apath.length) < shortest_count)
				{
					shortest_chosen = [tested_true[td]];
					shortest_count = tested_true[td].chosen_bpath.length + tested_true[td].chosen_apath.length;

					//We have found a shorter one than the one recorded under both.
					both_chosen = [];
				}
				else if ((tested_true[td].chosen_bpath.length + tested_true[td].chosen_apath.length) === shortest_count)
				{
					shortest_chosen.push(tested_true[td]);
				}
			}

			//Now we choose a stamp and finalize it.
			let final_choice;
			let chosen_index = 0;
			if (both_chosen.length)	//Prefer a stamp that has the shortest path and is closest to the mineral.
			{
				final_choice = both_chosen[0];
			}
			else if (closest_chosen.length)	//If we can't have both, let's at least have the closest.
			{
				shortest_count = closest_chosen[0].chosen_bpath.length + closest_chosen[0].chosen_apath.length;

				//If we have more than one closest_chosen, find the one with the shortest path.
				for (td = 1; td < closest_chosen.length; td++)
				{
					if ((closest_chosen[td].chosen_bpath.length + closest_chosen[td].chosen_apath.length) < shortest_count)
					{
						chosen_index = td;
						shortest_count = closest_chosen[td].chosen_bpath.length + closest_chosen[td].chosen_apath.length;
					}
				}

				final_choice = closest_chosen[chosen_index];
			}
			else if (shortest_chosen.length)
			{
				closest_count = shortest_chosen[0].chosen_apath.length;

				//If we have more than one shortest_chosen, find the one that's closest to the mineral.
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
					{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1,
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
			//final_choice.final_path.pop();

			//Now get the return path.
			final_choice.final_rpath = calculate.reversepath(final_choice.final_path);

			//Now record lab positions for our stamp.
			final_choice.labs = [];

			//0 and 1 must be our source labs.
			if (final_choice.type === 3)	//A 3x5.
			{
				for (let ob = 0; ob < 2; ob++)
				{
					final_choice.labs.push({x: final_choice.mpos[ob].x, y: final_choice.mpos[ob].y});
				}
			}
			else	//A 4x4.
			{
				increment = calculate.dxdy[final_choice.o];

				//We must find the other two center tiles manually. We can spread from final_choice.mpos[0].
				final_choice.labs.push(
					{x: final_choice.mpos[0].x - increment.dx, y: final_choice.mpos[0].y},
					{x: final_choice.mpos[0].x, y: final_choice.mpos[0].y - increment.dy});
			}

			//Now add the other positions. Use a flipper to alternate before-side and after-side positions. (After-side starting first.)
			for (let lb = 0, la = 0, fl = false; final_choice.labs.length < 10; fl ? lb++ : la++, fl = !fl)
			{
				if (fl)
				{
					final_choice.labs.push({x: final_choice.bpos[lb].x, y: final_choice.bpos[lb].y});
				}
				else
				{
					final_choice.labs.push({x: final_choice.apos[la].x, y: final_choice.apos[la].y});
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

			//We're ready for testing. The other mining structures will be added soon.
			if (!Memory.mineTest)
			{
				Memory.mineTest = {};
			}
			Memory.mineTest[room_name] = final_choice;
			//console.log(JSON.stringify(final_choice));
			return true;
		}
		else
		{
			Memory.mineTest = undefined;
			return false;
		}
	},

	init_complete(room_name)
	{
		//Finalize the room.
		require('defender').init(room_name);
		require('empire').room.exitpaths(room_name, true);	//Call this again to go around the towers.
		require('defender').setRamparts(room_name);	//Now that we have gone around towers, set our ramparts.
		require('defender').setDefense(room_name);	//Now that ramparts have been set, we can run the build.
		calculate.cleanpaths(room_name, 'all');
		calculate.deleteoldpaths(room_name, 'init');
		calculate.deleteoldpaths(room_name, 'defender');
		Memory.rooms[room_name].init = 2;
		console.log('Init 2 ' + Game.cpu.getUsed());
		
		if (Memory.rooms[room_name].init === 2)
		{
			roomPlanner.run(room_name);
			Memory.rooms[room_name].init = undefined;
		}
	}
};

module.exports = roomPlanner;