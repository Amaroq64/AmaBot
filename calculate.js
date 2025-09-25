var body = require('body');

var calculate =
{
	extensions: {},

	idealTransports: function(room)
	{
		//The highest energy this room can have.
		let max_energy = calculate.maximumEnergy(Game.rooms[room].controller.level);

		let bodyCount = {};		//How many BODY our fatties have at this level.
		let carryCount = {};	//How many CARRY our transports have at this level.

		//How long is each round trip between each source and its destinations?
		let roundTrip = [];
		let idealTransport = [];
		for (let s = 0; s < Memory.rooms[room].sources.length; s++)
		{
			roundTrip.push({miner: Memory.rooms[room].sources[s].mine.length + Memory.rooms[room].sources[s].mreturn.length - 1, upgrader: Memory.rooms[room].sources[s].upgrade.length + Memory.rooms[room].sources[s].ureturn.length - 2});
			if (Game.rooms[room].controller.level > 2)	//If we have more than 3 extensions on a source, we might need both paths now.
			{
				roundTrip[roundTrip.length - 1].miner += roundTrip[roundTrip.length - 1].upgrader;
			}
			idealTransport.push({miner: null, upgrader: null});	//We're doing this here so we can be agnostic of how many sources are in a room.
		}
		//console.log("Round Trip: " + JSON.stringify(roundTrip));

		//Figure out how many relevant parts are in each body based on our energy level. Then decide the ideal amount of transports for each destination.
		if (max_energy == 300)	//Generics are WORK, WORK, MOVE, CARRY.
		{
			bodyCount.miner = body.generic(max_energy).reduce(calculate.reduceManyWork, 0);
			bodyCount.upgrader = bodyCount.miner;
			carryCount.transport = body.generic(max_energy).reduce(calculate.reduceManyCarry, 0);
		}
		else
		{
			bodyCount.miner = body.fatty(max_energy, false).reduce(calculate.reduceManyWork, 0);
			bodyCount.upgrader = body.fatty(max_energy, true).reduce(calculate.reduceManyWork, 0);
			carryCount.transport = body.transport(max_energy, true).reduce(calculate.reduceManyCarry, 0);
		}
		//console.log("Body Count: " + JSON.stringify(bodyCount));
		//console.log("Carry Count: " +JSON.stringify(carryCount));

		//Now let's make our determination for each source.
		for (let s = 0; s < Memory.rooms[room].sources.length; s++)
		{
			for (let role in bodyCount)
			{
				 let ticksToFull = Math.floor((carryCount.transport * 50) / (bodyCount.miner * 2));	//We should be basing both transports on how much the miner can mine.
				 //console.log(ticksToFull);
				 idealTransport[s][role] = Math.ceil(roundTrip[s][role] / ticksToFull);
			}
		}
								//idealTransport[source][role]
		return idealTransport;	//We now know how many transports we need from each source servicing each role.
	},

	getExits: function(terrain, room_name)	//This takes a room-wide terrain object.
	{
		let exitcounter = -1;
		let currenttile = undefined;
		let lasttile = undefined;	//Was our last tile an exit space?
		let exits = [];
		let safe = [];	//We're juggling this a bit. It will end up in Memory.rooms[room_name].defense.safe.
		let flipper = [1, 0, 0];	//The first two modifies our x and y increment. The third is a flag.

		for (let x = 0, y = 0; !(x == 0 && y == 49 && flipper[2] == 2); x += flipper[0], y += flipper[1])	//Go around the outside.
		{
			currenttile = terrain.get(x, y);
			//console.log("Current tile: " + currenttile);
			if (currenttile === 0)	//We've found an empty tile.
			{
				if (lasttile === 1)	//Our previous tile was a wall. Therefore we have found a new exit.
				{
					exits.push([]);
					safe.push(false);
					exitcounter++;
				}

				exits[exitcounter].push({x: x, y: y});
				if (Game.rooms[room_name].lookForAt(LOOK_FLAGS, x, y).length > 0 && Game.rooms[room_name].lookForAt(LOOK_FLAGS, x, y)[0].name.indexOf('Safe') != -1)
				{
					safe[exitcounter] = true;
				}
			}
			lasttile = currenttile;

			if (x == 49 && y == 0)
			{
				flipper[0]--;	//x is 0 now.
				flipper[1]++;	//y is 1 now.
			}
			else if (y == 49 && x == 49 && flipper[2] == 0)
			{
				x = 0;
				flipper[0]++;	//x is 1 now.
				flipper[1]--;	//y is 0 now.
				flipper[2]++;
			}
			else if (y == 49 && x == 49 && flipper[2] == 1)
			{
				x = 0;
				y = 0;
				flipper[0]--;	//x is 0 now.
				flipper[1]++;	//y is 1 now.
				flipper[2]++;
			}
		}

		Memory.rooms[room_name].safe = safe;	//We're juggling this a bit. It will end up in Memory.rooms[room_name].defense.safe.
		return exits;
	},

	cleanpaths: function(room_name, type)	//We are renaming some of these paths slightly different, so pay attention.
	{
		switch(type)
		{
			case 'all':
				Memory.rooms[room_name].path = undefined;
				calculate.cleanpaths(room_name, 'init');
				calculate.cleanpaths(room_name, 'defender');
				calculate.cleanpaths(room_name, 'empire');
				break;
			//Since moveByPath() compliant steps state the direction of move from the previous step, we will need to concatenate one step from the followup path to be sure of any direction changes.
			case 'init':
				//We need to do the room-wide one-time upgrade path, and the sources' mine, mreturn, upgrade, and ureturn.

				//Room-wide upgrade goes from source to the upgrader.
				calculate.writethispath(room_name, calculate.cleanthispath(Memory.rooms[room_name].upgrade), 'upgrader');	//Room-wide and source-based must have different names now.

				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
				{
					//Mine goes from spawn to source, then mreturn comes back.
					calculate.writethispath(room_name, calculate.cleanthispath(Memory.rooms[room_name].sources[i].mine.concat(Memory.rooms[room_name].sources[i].mreturn[0])), 'mine', i);
					calculate.writethispath(room_name, calculate.cleanthispath(Memory.rooms[room_name].sources[i].mreturn.concat(Memory.rooms[room_name].sources[i].mine[0]), false), 'mreturn', i);
					//Mfat is the direction from the end of mine to the mining container.
					calculate.writethispath(room_name, calculate.cleanthispath([Memory.rooms[room_name].sources[i].mine.slice(-1)[0], Memory.rooms[room_name].sources[i].mfat[0]], false), 'mfat', i);

					//Upgrade goes from source to the upgrader, then comes back.
					calculate.writethispath(room_name, calculate.cleanthispath(Memory.rooms[room_name].sources[i].upgrade.concat(Memory.rooms[room_name].sources[i].ureturn[0])), 'upgrade', i);
					calculate.writethispath(room_name, calculate.cleanthispath(Memory.rooms[room_name].sources[i].ureturn.concat(Memory.rooms[room_name].sources[i].upgrade[0]), false), 'ureturn', i);
				}

				break;

			case 'defender':
				//We need to do the roomwide defense path to each exit, and the sources' defpaths and dreturn to each exit.
				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
				{
					for (let e = 0; e < Memory.rooms[room_name].sources[i].defpaths.length; e++)
					{
						if (Memory.rooms[room_name].sources[i].defpaths[e].length == 0 || Memory.rooms[room_name].sources[i].defpaths[e].length == 0)
						{
							continue;	//Some of my patrols are broken, possibly due to safety flags.
						}

						//The sources' defpaths to each exit.																				//A matching dreturn for every defpath is a safe assumption.
						//We have a problem with our defpath extending one too far. Leaving that concat out should help.
						calculate.writethispath(room_name, calculate.cleanthispath(Memory.rooms[room_name].sources[i].defpaths[e]/*.concat(Memory.rooms[room_name].sources[i].dreturn[e][0])*/), 'defpath', i, e);
						calculate.writethispath(room_name, calculate.cleanthispath(Memory.rooms[room_name].sources[i].dreturn[e]/*.concat(Memory.rooms[room_name].sources[i].defpaths[e][0]*/), false), 'dreturn', i, e);
					}
				}

				for (let e = 0; e < Memory.rooms[room_name].defense.patrol.length; e++)
				{
					if (Memory.rooms[room_name].defense.patrol[e].length == 0 || Memory.rooms[room_name].defense.preturn[e].length == 0)
					{
						continue;	//Some of my patrols are broken, possibly due to safety flags.
					}

					//The room-wide patrol paths for each exit.																				//A matching preturn for every patrol is a safe assumption.
					//console.log(room_name + ' Pat: e: ' + e);
					calculate.writethispath(room_name, calculate.cleanthispath(Memory.rooms[room_name].defense.patrol[e].concat(Memory.rooms[room_name].defense.preturn[e][0])), 'patrol', false, e);
					calculate.writethispath(room_name, calculate.cleanthispath(Memory.rooms[room_name].defense.preturn[e].concat(Memory.rooms[room_name].defense.patrol[e][0]), false), 'preturn', false, e);
				}
				
				break;

			case 'empire':
				//We need to do the roomwide exitpaths and exitreturn to each adjacent accessible room.
				for (let e in Memory.rooms[room_name].exitpaths)
				{																															//A matching exitreturn for every exitpath is a safe assumption.
					calculate.writethispath(room_name, calculate.cleanthispath(Memory.rooms[room_name].exitpaths[e].concat(Memory.rooms[room_name].exitreturn[e][0])), 'exitpath', false, e);
					calculate.writethispath(room_name, calculate.cleanthispath(Memory.rooms[room_name].exitreturn[e].concat(Memory.rooms[room_name].exitpaths[e][0]), false), 'exitreturn', false, e);
				}
				break;
		}

		return true;
	},

	cleanthispath: function(path, dir = false)	//If it's not false, it's a returning path taking the outbound path's last known direction. This handles cases where the start of the return path is still the same direction.
	{
		let temp;
		if (dir)	//dir = true is broken. It leaves crucial steps out.
		{
			temp = [];
		}
		else
		{
			/*if (path[0] === undefined || path[0].x === undefined || path[0].y === undefined || path[0].direction === undefined)
			{
				console.log(JSON.stringify(path[0]));
			}*/
			temp = [{x: path[0].x, y: path[0].y, direction: path[0].direction}];
			dir = temp.direction;
		}

		//Compress the path by only recording when it changes direction.
		for (let p = 0; p < path.length; p++)
		{
			//If we have changed direction, then we mark the change.
			if (p < path.length -1 && path[p + 1].direction != dir)	//moveByPath() compliant steps state the direction that moves from the previous step to the current one.
			{
				dir = path[p + 1].direction;
				temp.push({x: path[p].x, y: path[p].y, direction: dir});
			}
		}

		return temp;
	},

	writethispath: function(room_name, tiles, memory_name, source = false, exit = false)	//If source is not false, it's an index. If exit is not false, it's an index or a key.
	{
		if (typeof Memory.rooms[room_name].path !== 'object')
		{
			Memory.rooms[room_name].path = {};	//Make sure the path object exists.
		}

		for (let t = 0; t < tiles.length; t++)
		{
			if (typeof Memory.rooms[room_name].path[tiles[t].x] !== 'object')
			{
				Memory.rooms[room_name].path[tiles[t].x] = {};	//Make sure path[x] exists.
			}
			if (typeof Memory.rooms[room_name].path[tiles[t].x][tiles[t].y] !== 'object')
			{
				Memory.rooms[room_name].path[tiles[t].x][tiles[t].y] = {};	//Make sure path[x][y] exists.
			}

			if (source === false)
			{
				if (exit === false)	//Room-wide.
				{
					Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name] = tiles[t].direction;	//Assign our direction to the [x][y][name] of this tile.
					//Write our flipper.
					if (t == tiles.length - 1)
					{
						if (typeof Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper !== 'object')
						{
							Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper = {};
						}
						Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper[memory_name] = true;
					}
				}
				else
				{
					if (!Array.isArray(Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name]) && (typeof exit === 'number' || typeof exit === 'string'))	//Room-wide with an indexed or string exit.
					{
						Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name] = {};	//If it's an exit based path, make sure path[x][y][name][exit] exists.
					}
					else
					{
						return false;
					}

					Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name][exit] = tiles[t].direction;	//Assign our direction to the [x][y][name][exit] of this tile.
					//Write our flipper.
					if (t == tiles.length - 1)
					{
						if (typeof Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper !== 'object')
						{
							Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper = {};
						}
						if (typeof Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper[memory_name] !== 'object')
						{
							Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper[memory_name] = {};
						}
						Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper[memory_name][exit] = true;
					}
				}
			}
			else
			{
				if (!Array.isArray(Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name]))
				{
					Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name] = [];	//If it's a source based path, make sure path[x][y][name][source] exists.
				}

				if (exit === false)	//Source-based.
				{
					Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name][source] = tiles[t].direction;	//Assign our direction to the [x][y][name][source] of this tile.
					//Write our flipper.
					if (t == tiles.length - 1)
					{
						if (typeof Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper !== 'object')
						{
							Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper = {};
						}
						if (!Array.isArray(Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper[memory_name]))
						{
							Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper[memory_name] = [];
						}
						Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper[memory_name][source] = true;
					}
				}
				else if (typeof exit === 'number')	//Source-based with an indexed exit.
				{
					if (!Array.isArray(Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name]))
					{
						Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name] = [];	//If it's a defense supplying path, make sure path[x][y][name][source] exists.
					}
					if (typeof Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name][source] !== 'object')
					{
						Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name][source] = {};	//If it's a defense supplying path, make sure our object of paths toward each patrol exists.
					}

					Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name][source][exit] = tiles[t].direction;
					//Write our flipper.
					if (t == tiles.length - 1)
					{
						if (typeof Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper !== 'object')
						{
							Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper = {};
						}
						if (!Array.isArray(Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper[memory_name]))
						{
							Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper[memory_name] = [];
						}
						if (!Array.isArray(Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper[memory_name][source]))
						{
							Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper[memory_name][source] = {}
						}
						Memory.rooms[room_name].path[tiles[t].x][tiles[t].y].flipper[memory_name][source][exit] = true;
					}
				}
			}
		}

		return true;
	},

	maximumEnergy: function(room)
	{
		if (typeof room === "number")
		{
			return (SPAWN_ENERGY_CAPACITY * CONTROLLER_STRUCTURES.spawn[room]) + (EXTENSION_ENERGY_CAPACITY[room] * CONTROLLER_STRUCTURES.extension[room]);
		}
		else if (typeof room === "string")
		{
			return (SPAWN_ENERGY_CAPACITY * Game.rooms[room].find(FIND_MY_SPAWNS).length) + (
			EXTENSION_ENERGY_CAPACITY[Game.rooms[room].controller.level] * Game.rooms[room].find(FIND_MY_STRUCTURES,
			{
				filter:
				{
					structureType: STRUCTURE_EXTENSION
				}
			}).length);
		}
		else
		{
			return false;
		}
	},

	bodyCost: function(body)
	{
		let energy = 0;
		for (let b = 0; b < body.length; b++)
		{
			energy += BODYPART_COST[body[b]];
		}

		return energy;
	},

	getExtensions: function(room_name)
	{
		//Use extension and spawner coordinates to make an [x][y] multidimensional object. This makes addressing them faster.
		//We will store them in calculate.extensions[room_name].
		let existing_extensions = Game.rooms[room_name].find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_EXTENSION}})
			.concat(Game.rooms[room_name].find(FIND_MY_SPAWNS));
		
		let extension_positions = {};
		for (let e = 0; e < existing_extensions.length; e++)
		{
			if (!extension_positions[existing_extensions[e].pos.x])
			{
				extension_positions[existing_extensions[e].pos.x] = {};
			}
			/*if (!extension_positions[existing_extensions[e].pos.x][existing_extensions[e].pos.y])
			{
				extension_positions[existing_extensions[e].pos.x][existing_extensions[e].pos.y] = {};
			}*/

			extension_positions[existing_extensions[e].pos.x][existing_extensions[e].pos.y] = existing_extensions[e].id;	//In roomPlanner.check() and calculate.sortExtensions(), we will make sure to erase the cache if anything changes.
		}

		calculate.extensions[room_name] = extension_positions;
		return extension_positions;
	},

	sortExtensions: function(room_name)
	{
		//Make sure we have the efficient [x][y] list of extensions.
		let arranged_extensions;
		if (calculate.extensions[room_name])
		{
			arranged_extensions = calculate.extensions[room_name];
		}
		else
		{
			arranged_extensions = calculate.getExtensions(room_name);
		}

		//Arrange the extensions and spawners so energy is taken evenly from all sources. Spawners should be last since they could be the farthest from the source.
		let sorted_extensions = [];
		let current_extension;
		let s = Array(Memory.rooms[room_name].sources.length).fill(0);
		let more_extensions = true;
		while (more_extensions)
		{
			more_extensions = false;
			for (i = 0; i < s.length; i++)
			{
				if (s[i] < Memory.rooms[room_name].sources[i].buildings.extensions.length &&
					arranged_extensions
						[Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].x] &&//x
					arranged_extensions
						[Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].x]	//x
						[Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].y]	//y
					)
				{
					//Iterate one extension from the current source. Then prepare to do the next one.
					//console.log(room_name + ", x: " + Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].x + ", y: "  + Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].y);
					current_extension = Game.getObjectById
					(
						arranged_extensions
							[Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].x]	//x
							[Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].y]	//y
					);
					if (current_extension && current_extension.structureType == STRUCTURE_EXTENSION)
					{
						sorted_extensions.push(current_extension);
						more_extensions = true;
					}
				}
				s[i]++;
			}
		}
		sorted_extensions = sorted_extensions.concat(Game.rooms[room_name].find(FIND_MY_SPAWNS));

		return sorted_extensions;
	},

	//Various reducers so we can easily do single-line checks involving arrays of arbitrary length.
	reduceManyWork: function(n, part)
	{
		return part == WORK ? n + 1 : n; //For each WORK, increment n by 1.
	},
	reduceManyCarry: function(n, part)
	{
		return part == CARRY ? n + 1 : n; //For each CARRY, increment n by 1.
	},
	sourcereducer:
	{
		extensions: function(total, a)
		{
			return total + a.buildings.extensions.length;
		},
		idealextensions: function(total, a)
		{
			return total + a.ideal.extensions;
		},
		mtransport: function(total, a)
		{
			return total + a.creeps.mtransport.length;
		}
	},
	structreducer:	//For use with find functions.
	{
		roads: function(total, found)
		{
			if (found.structureType == "road")
			{
				return total + 1;
			}
			else
			{
				return total + 0;
			}
		},
		extensions: function(total, found)
		{
			if (found.structureType == "extension")
			{
				return total + 1;
			}
			else
			{
				return total + 0;
			}
		}
	},
	arrayreducer: function(total, a)
	{
		return total + a.length;
	}
};

module.exports = calculate;