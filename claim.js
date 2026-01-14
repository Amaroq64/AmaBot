var claim =
{
	map: function(start_room, target_position, remote_start = false)	//If we use remote_start, it should be a position structure containing x, y, and roomName.
	{
		let target_room = target_position.roomName;
		//console.log("From " + start_room + " to " + target_room);

		//First we have to get a high level map of which rooms to traverse.
		let room_path = Game.map.findRoute(start_room, target_room,
		{
			routeCallback(roomName, fromRoomName)
			{
				if (Memory.blocked[roomName])
				{
					return Infinity;
				}
			}
		});
		//console.log(target_position);
		//console.log(JSON.stringify(room_path));

		let start_position;
		if (!remote_start)
		{
			//If we own the room we're starting in, use an exit path.
			start_position = new RoomPosition(Memory.rooms[start_room].exitpaths[room_path[0].room].slice(-1)[0].x, Memory.rooms[start_room].exitpaths[room_path[0].room].slice(-1)[0].y, start_room);

			//Shift the starting position out of the room. This prevents a crash associated with expecting our first room to be the room exited to.
			let exits = Game.map.describeExits(start_room);
			if (start_position.x === 0)	//We're moving west.
			{
				start_position = new RoomPosition(49, start_position.y, exits[7]);
			}
			else if (start_position.x === 49)	//We're moving east.
			{
				start_position = new RoomPosition(0, start_position.y, exits[3]);
			}
			else if (start_position.y === 0)	//We're moving north.
			{
				start_position = new RoomPosition(start_position.x, 49, exits[1]);
			}
			else if (start_position.y === 49)	//We're moving south.
			{
				start_position = new RoomPosition(start_position.x, 0, exits[5]);
			}
		}
		else
		{
			//If we don't own the room we're starting in, we are probably specifying our own start position.
			start_position = new RoomPosition(remote_start.x, remote_start.y, remote_start.roomName);
		}
		//console.log(JSON.stringify("Start: " + start_position));

		//Now we have to build the low level paths through the rooms.
		let calculate = require('calculate');
		let longpath = PathFinder.search(start_position, target_position,
		{maxOps: room_path.length * 1000, maxRooms: room_path.length + 6,
			roomCallback: function(roomName)
			{
				let inpath = false;

				for (let r = 0; r < room_path.length; r++)
				{
					if (roomName == room_path[r].room || roomName == start_room)
					{
						//If this room is in the chain of rooms.
						inpath = true;
					}
				}

				if (inpath)
				{
					let costMatrix = new PathFinder.CostMatrix;

					//If we can see the room, we should take its terrain and structures into account.
					if (Game.rooms[roomName])
					{
						let structs = Game.rooms[roomName].find(FIND_STRUCTURES, {filter: calculate.blockingStructure});

						for (let s = 0; s < structs.length; s++)
						{
							costMatrix.set(structs[s].pos.x, structs[s].pos.y, 255);
						}
					}

					//If it's in the chain of rooms, we need to make exit tiles heavier so it's more eager to clear them.
					calculate.coaxThroughExit(roomName, costMatrix);
					return costMatrix;
				}
				else
				{
					//If it's not in the chain of rooms, don't search it.
					return inpath;
				}
			}
		});

		//console.log(JSON.stringify(longpath));

		//Convert the path into a format usable by movebypath.
		longpath.path[0].dx = longpath.path[0].x - start_position.x
		if (longpath.path[0].dx == -49)
		{
			//We were 49 on the previous room and 0 on the new room.
			longpath.path[0].dx = 1;
		}
		else if (longpath.path[0].dx == 49)
		{
			//We were 0 on the previous room and 49 on the new room.
			longpath.path[0].dx = -1;
		}
		longpath.path[0].dy = longpath.path[0].y - start_position.y;
		if (longpath.path[0].dy == -49)
		{
			//We were 49 on the previous room and 0 on the new room.
			longpath.path[0].dy = 1;
		}
		else if (longpath.path[0].dy == 49)
		{
			//We were 0 on the previous room and 49 on the new room.
			longpath.path[0].dy = -1;
		}
		longpath.path[0].direction = start_position.getDirectionTo(longpath.path[0]);

		for (let l = 1; l < longpath.path.length; l++)
		{
			longpath.path[l].dx = longpath.path[l].x - longpath.path[l - 1].x;
			if (longpath.path[l].dx == -49)
			{
				//We were 49 on the previous room and 0 on the new room.
				longpath.path[l].dx = 1;
			}
			else if (longpath.path[l].dx == 49)
			{
				//We were 0 on the previous room and 49 on the new room.
				longpath.path[l].dx = -1;
			}
			longpath.path[l].dy = longpath.path[l].y - longpath.path[l - 1].y;
			if (longpath.path[l].dy == -49)
			{
				//We were 49 on the previous room and 0 on the new room.
				longpath.path[l].dy = 1;
			}
			else if (longpath.path[l].dy == 49)
			{
				//We were 0 on the previous room and 49 on the new room.
				longpath.path[l].dy = -1;
			}
			longpath.path[l].direction = longpath.path[l - 1].getDirectionTo(longpath.path[l]);
		}

		//Include the first step for cleaning.
		longpath.path.unshift({x: start_position.x, y: start_position.y, dx: longpath.path[0].x - start_position.x, dy: longpath.path[0].y - start_position.y, direction: start_position.getDirectionTo(longpath.path[0]),
			roomName: longpath.path[0].roomName});

		//console.log(JSON.stringify(longpath));
		return longpath;	//We made it this far without any errors.
	},

	/*run: function()
	{
		
	},*/

	build: function(type = false)
	{
		//Get the first action in the queue. We will prioritize some action types over others.
		if (!type)
		{
			//This is left over from when we weren't specifying a type to build for.
			if (Array.isArray(Memory.attack))
			{
				type = 'attack';
			}
			else if (Array.isArray(Memory.signs))
			{
				type = 'signs';
			}
			else if (Array.isArray(Memory.reserves))
			{
				type = 'reserves';
			}
			else if (Array.isArray(Memory.claims))
			{
				type = 'claims';
			}
			else if (Array.isArray(Memory.rescue))
			{
				type = 'rescue';
			}
			else
			{
				return false;
			}
		}

		//console.log("Building " + type);

		//Now build what this action needs.
		let complete;
		//Iterate the room action objects.
		for (let a = 0; Memory[type] && a < Memory[type].length; a++)
		{
			let complete = true;
			//Iterate the roles in ideal.
			for (let role in Memory[type][a].ideal)
			{
				let room_name = Memory[type][a].closest;

				//We're only building the first one we need.
				if (Memory[type][a].creeps[role].length < Memory[type][a].ideal[role] && complete)
				{
					complete = false;
					let body;
					if (Memory[type][a].heal && (role.indexOf('attacker') !== -1))	//If this action requests a self-healer, we should build that.
					{
						body = require('body')['h' + role](Game.rooms[room_name].energyCapacityAvailable);
					}
					else if(role.indexOf('harvester') !== -1)
					{
						body = require('body')['far' + role](Game.rooms[room_name].energyCapacityAvailable);	//Harvesters that leave our room should be prepared to go off-road.
					}
					else
					{
						body = require('body')[role](Game.rooms[room_name].energyCapacityAvailable);
					}
					//We should wait until the room has enough to build it.
					let cost = require('calculate').bodyCost(body);
					//If we have enough to build it, then build it.
					if (cost <= Game.rooms[room_name].energyAvailable)
					{
						for (let s = 0, spawns; s < 2; s++)
						{
							//Find a spawn that's not spawning. Assign the live object within the comparison.
							if ((spawns = Game.getObjectById(Memory.rooms[room_name].spawns[s].id)) && !spawns.spawning)
							{
								//Now build it.
								let name = spawns.name.slice(0, 3) + spawns.name.slice(require('builder').newSpawn.basename.length) + role.charAt(0).toUpperCase() + role.slice(1) + a + "_" + Game.time.toString();
								let status = spawns.spawnCreep(body, name, {memory: {target: {}, movenow: [], direction: false, path: 8}, energyStructures: require('calculate').sortExtensions(room_name), directions: [spawns.pos.getDirectionTo(
									Memory.rooms[Memory[type][a].closest].exitpaths[Object.keys(Memory[type][a].path)[0]][0].x,
									Memory.rooms[Memory[type][a].closest].exitpaths[Object.keys(Memory[type][a].path)[0]][0].y
								)]});
								if (status == OK)
								{
									Memory[type][a].creeps[role].push(name);
								}
								else
								{
									console.log(status);
								}

								break;	//If we selected a creep to build for this action, we are breaking the loop that selects a spawn.
							}
						}
					}
				}
				else if (!complete)
				{
					//We already found a creep that needs to be built.
					break;	//If we built a creep for this particular action, move on to the next action.
				}
			}
		}

		return complete;
	},

	travel: function()
	{
		//Iterate each action type.
		for (let ra = 0; ra < claim.roomactions.length; ra++)
		{
			let type = claim.roomactions[ra];
			//Does this action type exist?
			if (Array.isArray(Memory[type]))
			{
				//Iterate the room actions of this type.
				for (let a = 0; a < Memory[type].length; a++)
				{
					//Iterate each role in this room action.
					for (let role in Memory[type][a].creeps)
					{
						//Iterate each creep in this role.
						for (let c = 0; c < Memory[type][a].creeps[role].length; c++)
						{
							let creep = Game.creeps[Memory[type][a].creeps[role][c]]

							if (creep.pos.roomName == Memory[type][a].closest)	//If we're still in our starting room, use our exit path.
							{
								let tempdir;

								//Creeps capable of a round trip must be accounted for as well.
								if (Memory.creeps[creep.name].return)
								{
									//We're returning to our starting room.
									//Assign within comparison.
									if ((tempdir = Memory.rooms[creep.room.name].path[creep.pos.x])
									&& (tempdir = tempdir[creep.pos.y])
									&& (tempdir = tempdir.exitreturn)
									&& (tempdir = tempdir[Object.keys(Memory[type][a].path)[0]]))	//Our target is the first room in our path keys.
									{
										creep.memory.direction = tempdir;
									}
									creep.move(creep.memory.direction);
								}
								else
								{
									//console.log(JSON.stringify(Memory.rooms[Memory[type][a].closest].exitpaths[Object.keys(Memory[type][a].path)[0]]));
									//We're leaving our starting room.
									//creep.moveByPath(Memory.rooms[Memory[type][a].closest].exitpaths[Object.keys(Memory[type][a].path)[0]]);

									//Assign within comparison.
									if ((tempdir = Memory.rooms[creep.room.name].path[creep.pos.x])
									&& (tempdir = tempdir[creep.pos.y])
									&& (tempdir = tempdir.exitpath)
									&& (tempdir = tempdir[Object.keys(Memory[type][a].path)[0]]))	//Our target is the first room in our path keys.
									{
										creep.memory.direction = tempdir;
									}
									creep.move(creep.memory.direction);
								}
							}
							else if (creep.pos.roomName != Memory[type][a].pos.roomName)	//If we aren't at our target room yet, move along our inter-room path.
							{
								let calculate = require('calculate');

								//If this is the fist time stepping in this room, make sure we have a path through.
								if (Memory[type][a].path[creep.room.name].clean === undefined)
								{
									Memory[type][a].path[creep.room.name].clean = calculate.isPathClear(creep.room.name, Memory[type][a].path[creep.room.name], direction = creep.memory.direction, creep.pos.x, creep.pos.y);

									//If there wasn't a path through, we need to redo it.
									if (!Memory[type][a].path[creep.room.name].clean)
									{
										let endpoint = calculate.endOfPath(creep.room.name, Memory[type][a].path[creep.room.name], direction = creep.memory.direction, creep.pos.x, creep.pos.y);
										//console.log(creep.room.name + ' ' + type +  ' ' + JSON.stringify(creep.pos) + ' ' + JSON.stringify(endpoint));
										Memory[type][a].path[creep.room.name].clean = calculate.newpath(creep.room.name, type, a, creep.pos.x, creep.pos.y, endpoint.x, endpoint.y);
										console.log(creep.room.name + " checked. It was not clear.");
									}
									else
									{
										console.log(creep.room.name + " checked. It was clear.");
									}
								}

								let tempdir;
								//Assign within comparison.
								if ((tempdir = Memory[type][a].path[creep.room.name]) && tempdir[creep.pos.x] && (tempdir = tempdir[creep.pos.x][creep.pos.y]))
								{
									creep.memory.direction = tempdir;
								}

								creep.move(creep.memory.direction);
								tempdir = creep.memory.direction;

								//If we're about to move into another room, we need to obey the path tile we're about to land on.
								if ((creep.pos.x === 1 || creep.pos.x === 49) && calculate.dxdy[tempdir].dx)	//-1 and 1 are both truthy values.
								{
									let this_exit = Game.map.describeExits(creep.room.name)[calculate.orientation[calculate.dxdy[tempdir].dx][0]];

									if (Memory[type][a].path[this_exit] && Memory[type][a].path[this_exit][creep.pos.x] && (tempdir = Memory[type][a].path[this_exit][creep.pos.x][creep.pos.y]))
									{
										creep.memory.direction =  tempdir;
									}
								}
								else if ((creep.pos.y === 1 || creep.pos.y === 49) && calculate.dxdy[tempdir].dy)	//-1 and 1 are both truthy values.
								{
									let this_exit = Game.map.describeExits(creep.room.name)[calculate.orientation[0][calculate.dxdy[tempdir].dy]];

									if (Memory[type][a].path[this_exit] && Memory[type][a].path[this_exit][creep.pos.x] && (tempdir = Memory[type][a].path[this_exit][creep.pos.x][creep.pos.y]))
									{
										creep.memory.direction =  tempdir;
									}
								}

								//If it has heal parts and we're not attacking, we should use them.
								if (creep.getActiveBodyparts(HEAL))
								{
									//If there's an injured creep on our way, let's heal it too.
									let allies = creep.pos.findInRange(FIND_MY_CREEPS, 1);
									let lowest_hp = Infinity;
									let lowest_creep;
									for (let lo = 0; lo < allies.length; lo++)
									{
										if (allies[lo].hits < lowest_hp)
										{
											lowest_hp = allies[lo].hits;
											lowest_creep = allies[lo];
										}
									}

									creep.heal(lowest_creep);
								}
							}
						}
					}
				}
			}
		}
	},

	//Basic initialization on a room action object.
	init: function(object, type)
	{
		//Check whether the object has been initialized.
		if (typeof object.ideal !== "object")
		{
			object.path = {};

			//What ideals does this role need?
			object.ideal = claim.actionideal[type];

			object.creeps = {};
			for (let role in claim.actionideal[type])
			{
				object.creeps[role] = [];
			}

			//Which room is closest to the target room?
			let shortest = Infinity;
			let tpath;
			let closest;

			//Cycle through rooms with the lowest type of this action.
			let temp_rooms = {};
			let equal_rooms = 0;
			let room_count = {};
			let highest_room = 0;

			for (let room_name in Memory.rooms)
			{
				room_count[room_name] = 0;
			}

			for (let t = 0; t < Memory[type].length; t++)
			{
				//Don't process the room action that we're trying to initialize.
				if (!Memory[type][t].closest)
				{
					continue;
				}

				room_count[Memory[type][t].closest]++;
				if (room_count[Memory[type][t].closest] > highest_room)
				{
					highest_room = room_count[Memory[type][t].closest];
					equal_rooms = 0;
				}

				//If all rooms are sending the same amount, our initialization breaks because they are all considered busy. This fixes that.
				if (room_count[Memory[type][t].closest] === highest_room)
				{
					equal_rooms++;
				}
			}

			for (let room_name in Memory.rooms)
			{
				let free = true;
				if (Memory[type])
				{
					for (let t = 0; t < Memory[type].length; t++)
					{
						//This accidentally doesn't process the room action that we're trying to initialize. (Undefined can't equal a room name.)
						if (Memory[type][t].closest === room_name && room_count[Memory[type][t].closest] >= highest_room)
						{
							free = false;
							break;
						}
					}
				}

				if (free || equal_rooms === Object.keys(Memory.rooms).length)	//If they are all unfree, then consider them all free.
				{
					temp_rooms[room_name] = true;
				}
			}

			for (let room_name in temp_rooms)
			{	//We're assigning tpath within this comparison so the findRoute only happens on valid rooms.
				if (Game.rooms[room_name].controller.level > 2 && (tpath = Game.map.findRoute(room_name, object.pos.roomName)) && tpath.length < shortest)
				{
					//console.log(room_name + " is a valid room.");
					shortest = tpath.length;
					closest = room_name;
				}
			}

			//Once we have the closest, generate the path.
			if (type === 'deposit')
			{
				
			}
			else
			{
				tpath = claim.map(closest, object.pos);
				object.closest = closest;
			}

			//Clean the path.
			tpath.path = require('calculate').cleanthispath(tpath.path);

			//Separate the path by what room it's in.
			for (let p = 0; p < tpath.path.length; p++)
			{
				if (!Array.isArray(object.path[tpath.path[p].roomName]))
				{
					object.path[tpath.path[p].roomName] = [];
				}

				object.path[tpath.path[p].roomName].push(tpath.path[p]);
			}

			//Now arrange the cleaned steps into [x][y] tiles.
			let room_border = null;
			for (let room in object.path)
			{
				let temp_tile = {};

				//If we assigned a beginning step to this room, use it.
				if (room_border !== null)
				{
					if (!temp_tile[room_border.x])
					{
						temp_tile[room_border.x] = {};
					}

					temp_tile[room_border.x][room_border.y] = room_border.direction;
				}

				//If the last step rested on the exit of this room, it should be in the same spot on the next room's entrance.
				if (object.path[room].slice(-1)[0].x === 0 || object.path[room].slice(-1)[0].x === 49)
				{
					room_border = {x: 49 - object.path[room].slice(-1)[0].x, y: object.path[room].slice(-1)[0].y, direction: object.path[room].slice(-1)[0].direction};
				}
				else if (object.path[room].slice(-1)[0].y === 0 || object.path[room].slice(-1)[0].y === 49)
				{
					room_border = {x: object.path[room].slice(-1)[0].x, y: 49 - object.path[room].slice(-1)[0].y};
				}
				else
				{
					room_border = null;
				}

				for (let tile = 0; tile < object.path[room].length; tile++)
				{
					if (!temp_tile[object.path[room][tile].x])
					{
						temp_tile[object.path[room][tile].x] = {};
					}

					temp_tile[object.path[room][tile].x][object.path[room][tile].y] = object.path[room][tile].direction;
				}

				object.path[room] = temp_tile;
			}

			//Now traverse every room to make sure instructions leading out of it are translated into the following room.
			/*let endpoint;
			let endOfPath = require('calculate').endOfPath;
			for (let room in object.path)
			{
				endpoint = endOfPath(room_name, path, direction = null, tempx, tempy);
			}*/

			object.ops = tpath.ops;
			object.cost = tpath.cost;
			object.incomplete = tpath.incomplete;
		}
	},

	//This runs every attack object.
	attack: function()
	{
		//Iterate the room actions of this type.
		for (let a = 0; a < Memory.attack.length; a++)
		{
			//Iterate each role in this room action.
			for (let role in Memory.attack[a].creeps)
			{
				//Iterate each creep in this role.
				for (let c = 0; c < Memory.attack[a].creeps[role].length; c++)
				{
					let creep = Game.creeps[Memory.attack[a].creeps[role][c]];
					let range = {attacker: 1, mattacker: 1, rattacker: 3, dattacker: 1, healer: 1, tank: 1, paver: 1}[role];
					//If we're in our target room, do our tasks.
					if (Game.creeps[Memory.attack[a].creeps[role][c]].pos.roomName == Memory.attack[a].pos.roomName)
					{
						//Are we at the enemy yet? (This flag has to be placed on the enemy.)
						//The healer should operate independantly of the pos targeting.
						if (creep.pos.inRangeTo(Memory.attack[a].pos.x, Memory.attack[a].pos.y, range) || (role === 'healer' && creep.memory.movenow.length === 0
							&& creep.pos.findInRange(FIND_MY_CREEPS, range, {filter: function(fcreep) {return fcreep.id !== creep.id && fcreep.hits < fcreep.hitsMax}}).length))
						{
							//Get room enemies.
							let enemies = [];
							if (role == 'attacker' || role == 'rattacker')
							{
								enemies = creep.pos.findInRange(FIND_HOSTILE_CREEPS, range, {filter: claim.checkallies})
								if (!enemies.length)
								{
									enemies = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, {filter: function(structure)
										{
											return structure.structureType !== STRUCTURE_CONTROLLER && structure.structureType !== STRUCTURE_KEEPER_LAIR && claim.checkallies(structure);
										} })
										.concat(creep.pos.findInRange(FIND_STRUCTURES, range, {filter: {structureType: STRUCTURE_CONTAINER}}))
										.concat(creep.pos.findInRange(FIND_STRUCTURES, range, {filter: {structureType: STRUCTURE_POWER_BANK}}));
								}
							}
							else if (role == 'dattacker')
							{
								enemies = [];
							}
							if (role !== 'healer')
							{
								enemies = enemies.concat(creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, {filter: function(structure)
								{
									return structure.structureType != STRUCTURE_CONTROLLER && structure.structureType !== STRUCTURE_KEEPER_LAIR && claim.checkallies(structure);
								} }))
									.concat(creep.pos.findInRange(FIND_STRUCTURES, range, {filter: {structureType: STRUCTURE_CONTAINER}}))
									.concat(creep.pos.findInRange(FIND_STRUCTURES, range, {filter: {structureType: STRUCTURE_POWER_BANK}}));

								//If there's an enemy on the target position, attack it first.
								for (let e = 0; e < enemies.length; e++)
								{
									if (enemies[e].pos.x == Memory.attack[a].pos.x && enemies[e].pos.y == Memory.attack[a].pos.y)
									{
										enemies.unshift(enemies.splice(e, 1)[0]);
										break;
									}
								}

								//If the target position is on a wall, we want to attack it.
								let target_wall = creep.room.lookForAt(LOOK_STRUCTURES, Memory.attack[a].pos.x, Memory.attack[a].pos.y);
								for (tw = 0; tw < target_wall.length; tw++)
								{
									if (target_wall[tw].structureType === STRUCTURE_WALL)
									{
										enemies.unshift(target_wall[tw]);
										break;
									}
								}
							}

							/*if (enemies.length == 0 && Memory.attack[a].ideal.attacker == 1)	//If we are making more than one attacker, then I am probably manually overseeing a sustained attack.
							{
								//If there are no enemies left, check to see if the controller still exists.
								enemies = creep.room.find(FIND_HOSTILE_STRUCTURES, {filter: claim.checkallies});
								if (enemies.length > 0)
								{
									//If we found a controller, we're going to guard it.
									Memory.attack[a].pos = creep.room.controller.pos;
								}
								else	//If no controller, our attack is complete.
								{
									//creep.suicide();
									Memory.attack.splice(a, 1);
									if (Memory.attack.length == 0)
									{
										delete Memory.attack;
									}
								}
							}*/
							if (enemies.length === 0 && role !== 'healer')	//If we are doing a sustained attack, then we need to kill everything in this room.
							{
								if (role === 'attacker' || role === 'rattacker')
								{
									enemies = creep.room.find(FIND_HOSTILE_CREEPS, {filter: claim.checkallies});
								}
								else if (role == 'dattacker')
								{
									enemies = [];
								}

								enemies = enemies.concat(creep.room.find(FIND_HOSTILE_STRUCTURES, {filter: function(structure) {return structure.structureType != STRUCTURE_CONTROLLER && structure.structureType !== STRUCTURE_KEEPER_LAIR
										&& claim.checkallies(structure)} }))
									.concat(creep.pos.findInRange(FIND_STRUCTURES, range, {filter: {structureType: STRUCTURE_CONTAINER}}))
									.concat(creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_POWER_BANK}}));

								//If there are no enemies left, check to see if the controller still exists.
								/*if (enemies.length == 0)
								{
									//If we found a controller, we're going to guard it.
									enemies = creep.room.find(FIND_HOSTILE_STRUCTURES, {filter: claim.checkallies});
								}*/

								let tempenemy = creep.pos.findClosestByPath(enemies);
								if (!Memory.attack[a].guard && tempenemy)
								{
									Memory.attack[a].pos = tempenemy.pos;
								}
								else if (creep.memory.movenow.length != 0)
								{
									status = creep.moveByPath(creep.memory.movenow)
									if(status == OK || status == ERR_TIRED)
									{
										//console.log(creep.name + ": Using stored move.");
										if (creep.pos.x == creep.memory.movenow[creep.memory.movenow.length - 1].x && creep.pos.y == creep.memory.movenow[creep.memory.movenow.length - 1].y)
										{
											Memory.creeps[creep.name].movenow = [];
										}
									}
									else if (status == ERR_NOT_FOUND)	//We've presumably completed our move orders. Switch back to normal movement.
									{
										Memory.creeps[creep.name].movenow = [];
										console.log(creep.name + ": Switching to normal pathing.");
										//return require('control').move(creep, role, source);
									}
								}

								//If it has heal parts and we're not attacking, we should use them.
								if (creep.getActiveBodyparts(HEAL))
								{
									creep.heal(creep);
								}
							}
							else
							{
								switch(role)
								{
									case 'attacker':
									case 'mattacker':
										if (creep.hits < creep.hitsMax && creep.getActiveBodyparts(HEAL))
										{
											creep.heal(creep);
										}
										else
										{
											creep.attack(enemies[0]);
										}
										break;

									case 'rattacker':
										creep.rangedAttack(enemies[0]);
										//If it has heal parts and we're a ranged attacker, we should use them.
										if (creep.getActiveBodyparts(HEAL))
										{
											creep.heal(creep);
										}
										break;

									case 'dattacker':
										if (creep.hits < creep.hitsMax && creep.getActiveBodyparts(HEAL))
										{
											creep.heal(creep);
										}
										else
										{
											creep.dismantle(enemies[0]);
										}
										break;
									case 'healer':
										//If we're a healer, we should find an ally to heal.
										let allies = creep.pos.findInRange(FIND_MY_CREEPS, range);
										//Find who has the lowest hp.
										let lowest = allies[0];
										for (let al = 0; al < allies.length; al++)
										{
											if (allies[al].hits < lowest.hits)
											{
												lowest = allies[al];
											}
										}
										creep.heal(lowest);
										//If we healed another creep, we should probably follow it.
										if (lowest.id !== creep.id)
										{
											creep.move(creep.pos.getDirectionTo(lowest));
										}
										break;
									case 'tank':
										creep.heal(creep);
										break;
									default:
								}
							}
						}
						else if (creep.memory.movenow.length !== 0)
						{
							status = creep.moveByPath(creep.memory.movenow)
							if(status == OK || status == ERR_TIRED)
							{
								//console.log(creep.name + ": Using stored move.");
								if (creep.pos.x == creep.memory.movenow[creep.memory.movenow.length - 1].x && creep.pos.y == creep.memory.movenow[creep.memory.movenow.length - 1].y)
								{
									Memory.creeps[creep.name].movenow = [];
								}
							}
							else if (status == ERR_NOT_FOUND)	//We've presumably completed our move orders. Switch back to normal movement.
							{
								Memory.creeps[creep.name].movenow = [];
								console.log(creep.name + ": Switching to normal pathing.");
								//return require('control').move(creep, role, source);
							}

							//If it has attack parts and there's something in range, we should attack it while we move.
							//Get room enemies.
							let enemies;
							if (role === 'attacker' || role === 'rattacker' || role === 'dattacker')
							{
								if (role === 'dattacker')
								{
									enemies = [];
								}
								else
								{
									enemies = creep.pos.findInRange(FIND_HOSTILE_CREEPS, range, {filter: claim.checkallies})
								}
								if (!enemies.length)
								{
									enemies = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, {filter: function(structure) {return structure.structureType != STRUCTURE_CONTROLLER && structure.structureType !== STRUCTURE_KEEPER_LAIR
											&& claim.checkallies(structure)} })
										.concat(creep.pos.findInRange(FIND_STRUCTURES, range, {filter: {structureType: STRUCTURE_CONTAINER}}))
										.concat(creep.pos.findInRange(FIND_STRUCTURES, range, {filter: {structureType: STRUCTURE_POWER_BANK}}));
								}
							}

							if (enemies && enemies.length)
							{
								switch (role)
								{
									case 'attacker':
										creep.attack(enemies[0]);
										break;
									case 'rattacker':
										creep.rangedAttack(enemies[0]);
										break;
									case 'dattacker':
										creep.dismantle(enemies[0]);
								}
							}

							//If it has heal parts and there's an ally in range, we should heal an ally while we move.
							if (role === 'healer')
							{
								let allies = creep.pos.findInRange(FIND_MY_CREEPS, range);

								//Find who has the lowest hp.
								let lowest = allies[0];
								for (let al = 0; al < allies.length; al++)
								{
									if (allies[al].hits < lowest.hits)
									{
										lowest = allies[al];
									}
								}

								creep.heal(lowest);
								//If we healed another creep, we should probably follow it.
								if (lowest.id !== creep.id)
								{
									creep.move(creep.pos.getDirectionTo(lowest));
								}
							}
							else
							{
								//If it has heal parts and we're not attacking, we should use them.
								if (creep.getActiveBodyparts(HEAL))
								{
									creep.heal(creep);
								}
							}
						}
						else if (role === 'healer')
						{
							//Our healer needs to get a path.
							let ally = creep.room.find(FIND_MY_CREEPS, {filter: function(fcreep) {return fcreep.id !== creep.id}});
							//Find who has the lowest hp.
							let lowest = ally[0];
							for (let al = 0; al < ally.length; al++)
							{
								if (ally[al].hits < lowest.hits)
								{
									lowest = ally[al];
								}
							}
							ally = lowest;
							Memory.creeps[creep.name].movenow = creep.pos.findPathTo(ally);
							if (Memory.creeps[creep.name].movenow.length)
							{
								creep.move(Memory.creeps[creep.name].movenow[0].direction);
							}
							if (!Memory.attack[a].guard)
							{
								Memory.creeps[creep.name].movenow.splice((0 - range), range);
							}
						}
						else
						{
							//We need to get a path.
							Memory.creeps[creep.name].movenow = creep.pos.findPathTo(Memory.attack[a].pos.x, Memory.attack[a].pos.y, {maxRooms: 1});
							if (Memory.creeps[creep.name].movenow.length)
							{
								creep.move(Memory.creeps[creep.name].movenow[0].direction);
							}
							if (!Memory.attack[a].guard)
							{
								Memory.creeps[creep.name].movenow.splice((0 - range), range);
							}
						}
					}
				}
			}
		}
	},

	//This runs every reserve object.
	reserves: function()
	{
		//Iterate the room actions of this type.
		for (let a = 0; a < Memory.reserves.length; a++)
		{
			//Iterate each role in this room action.
			for (let role in Memory.reserves[a].creeps)
			{
				//Iterate each creep in this role.
				for (let c = 0; c < Memory.reserves[a].creeps[role].length; c++)
				{
					let creep = Game.creeps[Memory.reserves[a].creeps[role][c]];
					//If we're in our target room, do our tasks.
					if (Game.creeps[Memory.reserves[a].creeps[role][c]].pos.roomName == Memory.reserves[a].pos.roomName)
					{
						//Our only creep is a reserver to reserve the room.
						//Are we at the controller yet? (This flag has to be placed against the controller.)
						if (creep.pos.isEqualTo(Memory.reserves[a].pos.x, Memory.reserves[a].pos.y))
						{
							//Sign it while we're here.
							if (creep.room.controller.sign.text != claim.signature)
							{
								creep.signController(creep.room.controller, claim.signature);
							}

							//If we're at our destination, reserve the controller.
							//If it's taken, attack it.
							if (creep.reserveController(creep.room.controller) == ERR_INVALID_TARGET)
							{
								creep.attackController(creep.room.controller);
							}

							if (Game.flags.Remove && Game.flags.Remove.room == Memory.reserves[a].pos.roomName && creep.ticksToLive == 2)
							{
								creep.suicide();
								Memory.reserves.splice(a, 1);
								if (Memory.reserves.length == 0)
								{
									delete Memory.reserves;
								}
								Game.flags.Remove.remove();
							}
						}
						else if (creep.memory.movenow.length != 0)
						{
							status = creep.moveByPath(creep.memory.movenow)
							if(status == OK || status == ERR_TIRED)
							{
								//console.log(creep.name + ": Using stored move.");
							}
							else if (status == ERR_NOT_FOUND)	//We've presumably completed our move orders. Switch back to normal movement.
							{
								Memory.creeps[creep.name].movenow = [];
								console.log(creep.name + ": Switching to normal pathing.");
								//return control.move(creep, role, source);
							}
						}
						else
						{
							//We need to get a path.
							Memory.creeps[creep.name].movenow = creep.pos.findPathTo(Memory.reserves[a].pos.x, Memory.reserves[a].pos.y);
						}
					}
				}
			}
		}
	},

	//This runs every claim object.
	claims: function()
	{
		//Iterate the room actions of this type.
		for (let a = 0; a < Memory.claims.length; a++)
		{
			//Iterate each role in this room action.
			for (let role in Memory.claims[a].creeps)
			{
				//Iterate each creep in this role.
				for (let c = 0; c < Memory.claims[a].creeps[role].length; c++)
				{
					let creep = Game.creeps[Memory.claims[a].creeps[role][c]];
					//If we're in our target room, do our tasks.
					if (Game.creeps[Memory.claims[a].creeps[role][c]].pos.roomName == Memory.claims[a].pos.roomName)
					{
						//If our spawn is completed, turn over control of the room.
						let spawn = Game.rooms[creep.room.name].find(FIND_MY_SPAWNS);
						if (spawn.length != 0 && Game.cpu.bucket >= 1800)	//Initializing a room is CPU intensive.
						{
							let init = require('init');
							if (init.run() && Memory.rooms[creep.room.name] && Memory.rooms[creep.room.name].init === 2)
							{
								//If we get this far without errors, turn our creeps over.
								//Re-run our creep iterating code.
								//Iterate each role in this room action.
								for (let role in Memory.claims[a].creeps)
								{
									//Iterate each creep in this role.
									for (let c = 0; c < Memory.claims[a].creeps[role].length; c++)
									{
										creep = Game.creeps[Memory.claims[a].creeps[role][c]];
										switch (role)
										{
											case "harvester":
											case "builder":
											{
												//Prepare the creep to be transferred.
												if (role === 'harvester')
												{
													creep.memory.direction = false;
													creep.memory.path = 10;
													creep.memory.target = {x: Memory.rooms[creep.room.name].sources[c].mfat.slice(-1)[0].x, y: Memory.rooms[creep.room.name].sources[c].mfat.slice(-1)[0].y};
												}
												else
												{
													creep.memory.direction = false;
													creep.memory.path = 0;
													creep.memory.target = {};
													creep.memory.target.x = Memory.rooms[creep.room.name].sources[c].mine.slice(-1)[0].x;
													creep.memory.target.y = Memory.rooms[creep.room.name].sources[c].mine.slice(-1)[0].y;
													creep.memory.dtarget = {};
													creep.memory.utrip = false;
													creep.memory.dtrip = false;
													creep.memory.destination = false;
													creep.memory.need = 0;
												}

												Memory.rooms[creep.room.name].sources[c].creeps[role].push(Memory.claims[a].creeps[role][c]);
												break;
											}
											case "claimer":
											{
												//Prepare the creep to be transferred.
												creep.memory.direction = false;
												creep.memory.path = 0;
												creep.memory.target = {};
												creep.memory.target.x = Memory.rooms[creep.room.name].sources[c].mine.slice(-1)[0].x;
												creep.memory.target.y = Memory.rooms[creep.room.name].sources[c].mine.slice(-1)[0].y;

												Memory.rooms[creep.room.name].sources[0].creeps.mtransport.push(Memory.claims[a].creeps[role][c]);
												break;
											}
										}

										//Now move the creep to its destination if it isn't already there. (Using our new pathing system.)
										if (creep.pos.x != creep.memory.target.x || creep.pos.y != creep.memory.target.y)
										{
											//console.log(c + ' ' + JSON.stringify(Memory.rooms[creep.room.name].sources[c].pos) + ' ' + JSON.stringify(creep.memory));
											creep.memory.movenow = creep.pos.findPathTo(creep.memory.target.x, creep.memory.target.y, {maxRooms: 1});
											creep.memory.direction = creep.memory.movenow[0].direction;
											creep.memory.movenow = require('calculate').cleanthispath(creep.memory.movenow);
											creep.memory.movenow.shift();
											creep.move(creep.memory.direction);
										}
										else
										{
											creep.memory.movenow = [];
										}
									}
								}

								//Creeps should be handed over now. Delete the action.
								if (Memory.rooms[creep.room.name].init)
								{
									Memory.claims.splice(a, 1);
									if (Memory.claims.length == 0)
									{
										delete Memory.claims;
									}

									Memory.rooms[creep.room.name].init = undefined;
									return true;
								}
								else
								{
									return false;
								}
							}
							else
							{
								//Memory.rooms[creep.room.name] = undefined;
								return false;
							}
						}
						else if (role === 'claimer'
							&& Game.rooms[creep.room.name].controller.my
							&& Game.rooms[creep.room.name].find(FIND_MY_CONSTRUCTION_SITES).length === 0
							&& Game.rooms[creep.room.name].find(FIND_MY_SPAWNS).length === 0)
						{
							//Create our spawn.
							Game.rooms[creep.room.name].createConstructionSite(Memory.claims[a].pos.x, Memory.claims[a].pos.y, STRUCTURE_SPAWN, require('builder').newSpawn(false));
						}

						//If we've just arrived, create some paths.
						if (!Memory.claims[a].claimpaths)
						{
							Memory.claims[a].claimpaths = {sources: [], upgrade: [], ureturn: []}
							sources = Game.rooms[creep.room.name].find(FIND_SOURCES);
							for (let i = 0; i < sources.length; i++)
							{
								Memory.claims[a].claimpaths.sources.push({pos: sources[i].pos, id: sources[i].id, mine: [], mreturn: [], mfat: []});
							}

							//Since the room init will care which source is closer to the spawn, we should too.
							let closest = Game.rooms[creep.room.name].getPositionAt(Memory.claims[a].pos.x, Memory.claims[a].pos.y).findClosestByPath(FIND_SOURCES, {ignoreCreeps: true}).id;
							while (closest != Memory.claims[a].claimpaths.sources[0].id)
							{
								Memory.claims[a].claimpaths.sources.push(Memory.claims[a].claimpaths.sources.shift());
							}

							//Now generate the paths.
							let home = Game.rooms[creep.room.name].getPositionAt(Memory.claims[a].pos.x, Memory.claims[a].pos.y);
							for (let i = 0; i < Memory.claims[a].claimpaths.sources.length; i++)
							{
								//We can be a bit sloppy with these. Who cares about the finer points when the init will handle it?
								Memory.claims[a].claimpaths.sources[i].mine = home.findPathTo(Memory.claims[a].claimpaths.sources[i].pos.x, Memory.claims[a].claimpaths.sources[i].pos.y, {range: 1, maxRooms: 1});
								Memory.claims[a].claimpaths.sources[i].mfat.push(Memory.claims[a].claimpaths.sources[i].mine.pop());
								Memory.claims[a].claimpaths.sources[i].mreturn = Game.rooms[creep.room.name].getPositionAt(Memory.claims[a].claimpaths.sources[i].mine.slice(-1)[0].x, Memory.claims[a].claimpaths.sources[i].mine.slice(-1)[0].y)
									.findPathTo(home, {range: 1, maxRooms: 1});
							}

							if (role === "builder")
							{
								//Assign our target positions to the builders.
								let i;	//Which source do we belong to?
								for (i = 0; i < Memory.claims[a].claimpaths.sources.length; i++)
								{
									if (creep.name == Memory.claims[a].creeps.builder[i])
									{
										break;
									}
								}
								creep.memory.target.x = Memory.claims[a].claimpaths.sources[i].mine.slice(-1)[0].x;
								creep.memory.target.y = Memory.claims[a].claimpaths.sources[i].mine.slice(-1)[0].y;
							}

							Memory.claims[a].claimpaths.upgrade = home.findPathTo(Game.rooms[creep.room.name].controller, {range: 1, maxRooms: 1});
							let tempupgrade = Game.rooms[creep.room.name].getPositionAt(Memory.claims[a].claimpaths.upgrade.slice(-1)[0].x, Memory.claims[a].claimpaths.upgrade.slice(-1)[0].y)
							Memory.claims[a].claimpaths.ureturn = tempupgrade.findPathTo(tempupgrade.findClosestByPath
							([
								Game.rooms[creep.room.name].getPositionAt(Memory.claims[a].claimpaths.sources[0].mine.slice(-1)[0].x, Memory.claims[a].claimpaths.sources[0].mine.slice(-1)[0].y),
								Game.rooms[creep.room.name].getPositionAt(
									Memory.claims[a].claimpaths.sources[Memory.claims[a].claimpaths.sources.length - 1].mine.slice(-1)[0].x,
									Memory.claims[a].claimpaths.sources[Memory.claims[a].claimpaths.sources.length - 1].mine.slice(-1)[0].y)
							]), {maxRooms: 1});
							//We're altering the upgrade path.
							Memory.claims[a].claimpaths.upgrade = Game.rooms[creep.room.name].getPositionAt(Memory.claims[a].claimpaths.ureturn.slice(-1)[0].x, Memory.claims[a].claimpaths.ureturn.slice(-1)[0].y)
								.findPathTo(tempupgrade, {maxRooms: 1});
						}

						//Now that we're here, we need to do our duties.
						if (!creep.memory.movenow.length)
						{
							switch (role)
							{
								case "harvester":
								{
									//Which source do we belong to?
									let i;
									for (i = 0; i < Memory.claims[a].claimpaths.sources.length; i++)
									{
										if (creep.name == Memory.claims[a].creeps.harvester[i])
										{
											break;
										}
									}

									if (creep.pos.isEqualTo(Game.rooms[creep.room.name].getPositionAt(Memory.claims[a].claimpaths.sources[i].mfat[0].x, Memory.claims[a].claimpaths.sources[i].mfat[0].y)))
									{
										//If we're at our source, mine it.
										let status;	//Assign within comparison.
										creep.harvest(creep.pos.findInRange(FIND_SOURCES, 1)[0]);
										/*if ((status = creep.harvest(creep.pos.findInRange(FIND_SOURCES, 1)[0])) !== OK)
										{
											switch (status)
											{
												case ERR_NOT_OWNER:
													status = 'ERR_NOT_OWNER';
													break;
												case ERR_NOT_ENOUGH_RESOURCES:
													status = 'ERR_NOT_ENOUGH_RESOURCES';
													break;
											}
											console.log(creep.name + ' ' + status);
										}*/
									}
									else if(!creep.memory.movenow.length)
									{
										//If we're not at our source, go to it.
										for (let i = 0; i < Memory.claims[a].claimpaths.sources.length; i++)
										{
											if (creep.name == Memory.claims[a].creeps.harvester[i])
											{
												creep.memory.movenow = creep.pos.findPathTo(Memory.claims[a].claimpaths.sources[i].mfat[0].x, Memory.claims[a].claimpaths.sources[i].mfat[0].y, {maxRooms: 1,
													costCallback: function(roomName, costMatrix)
													{
														//We need to avoid our other harvester.
														if (i > 0 && Memory.creeps[Memory.claims[a].creeps.harvester[i - 1]].movenow.length)
														{
															costMatrix.set(Memory.creeps[Memory.claims[a].creeps.harvester[i - 1]].movenow.slice(-1)[0].x, Memory.creeps[Memory.claims[a].creeps.harvester[i - 1]].movenow.slice(-1)[0].y, 255);
														}
													}
												});
												break;
											}
										}
									}
									break;
								}
								case "builder":
								{
									let builder = require('role.builder');

									//Which source do we belong to?
									let i;
									for (i = 0; i < Memory.claims[a].claimpaths.sources.length; i++)
									{
										if (creep.name == Memory.claims[a].creeps.builder[i])
										{
											break;
										}
									}

									//If we're by energy, we need to pick it up.
									if (creep.carry.energy == 0)
									{
										if (builder.transport.withdrawRuins(creep))	//Clean up ruins.
										{
											Memory.creeps[creep.name].return = true;
										}
										else if (creep.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 1).length != 0)
										{
											Memory.creeps[creep.name].return = false;
										}
									}
									else
									{
										creep.build(creep.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3)[0]);
									}

									//If we're not on our path, we need to go to it.
									if (creep.memory.return && creep.moveByPath(Memory.claims[a].claimpaths.sources[i].mreturn) == ERR_NOT_FOUND)	//We're going to build the spawn
									{
										creep.moveTo(Memory.claims[a].claimpaths.sources[i].mreturn.slice(-1)[0].x, Memory.claims[a].claimpaths.sources[i].mreturn.slice(-1)[0].y, {maxRooms: 1, reusePath: 20});
									}
									else if (!creep.memory.return && creep.moveByPath(Memory.claims[a].claimpaths.sources[i].mine) == ERR_NOT_FOUND)	//We're returning to the source.
									{
										creep.moveTo(Memory.claims[a].claimpaths.sources[i].mine.slice(-1)[0].x, Memory.claims[a].claimpaths.sources[i].mine.slice(-1)[0].y, {maxRooms: 1, reusePath: 20});
									}
									break;
								}
								case "claimer":
								{
									let controller = Game.rooms[creep.room.name].controller;
									if (controller.my)	//If the room is ours, we're going to help upgrade it.
									{
										
									}
									else	//If the room isn't ours yet, we need to take it.
									{
										if (creep.pos.inRangeTo(controller, 1))
										{
											//If we're in range, take the room.
											if (creep.claimController(creep.room.controller) === OK)
											{
												creep.signController(creep.room.controller, claim.signature);
											}
											else if (creep.claimController(creep.room.controller) === ERR_INVALID_TARGET)
											{
												creep.attackController(creep.room.controller);
											}
										}
										else
										{
											//If we're not in range, get in range.
											creep.memory.movenow = creep.pos.findPathTo(Memory.claims[a].claimpaths.upgrade.slice(-1)[0].x, Memory.claims[a].claimpaths.upgrade.slice(-1)[0].y, {maxRooms: 1});
										}
									}
									break;
								}
							}
						}
						else
						{
							status = creep.moveByPath(creep.memory.movenow)
							if(status == OK || status == ERR_TIRED)
							{
								//console.log(creep.name + ": Using stored move.");
							}
							else if (status == ERR_NOT_FOUND)	//We've presumably completed our move orders. Switch back to normal movement.
							{
								Memory.creeps[creep.name].movenow = [];
								console.log(creep.name + ": Switching to normal pathing.");
								//return control.move(creep, role, source);
							}

							if (creep.pos.isEqualTo(Game.rooms[creep.room.name].getPositionAt(creep.memory.movenow.slice(-1).x, creep.memory.movenow.slice(-1).y)))
							{
								creep.memory.movenow = [];
							}
						}
					}
				}
			}
		}
	},

	//This runs every rescue object.
	rescue: function()
	{
		//Iterate the room actions of this type.
		for (let a = 0; a < Memory.rescue.length; a++)
		{
			//Iterate each role in this room action.
			for (let role in Memory.rescue[a].creeps)
			{
				//Iterate each creep in this role.
				for (let c = 0; c < Memory.rescue[a].creeps[role].length; c++)
				{
					let creep = Game.creeps[Memory.rescue[a].creeps[role][c]];
					//If we're in our target room, do our tasks.
					if (Game.creeps[Memory.rescue[a].creeps[role][c]].pos.roomName == Memory.rescue[a].pos.roomName)
					{
						//If our spawn is completed, turn over control of the room.
						let spawn = Game.rooms[creep.room.name].find(FIND_MY_SPAWNS).concat(Game.rooms[creep.room.name].find(FIND_HOSTILE_SPAWNS));
						if (spawn.length !== 0 && !Memory.rescue[a].multi)
						{
							//If we get this far without errors, turn the room over.
							//Re-run our creep iterating code.
							//Iterate each role in this room action.
							for (let role in Memory.rescue[a].creeps)
							{
								//Iterate each creep in this role.
								for (let c = 0; c < Memory.rescue[a].creeps[role].length; c++)
								{
									Game.creeps[Memory.rescue[a].creeps[role][c]].suicide();
								}
							}

							//Creeps should be suicided by now. Delete the action.
							Memory.rescue.splice(a, 1);
							if (Memory.rescue.length == 0)
							{
								delete Memory.rescue;
							}

							return true;
						}

						//If we've just arrived, create some paths.
						if (!Memory.rescue[a].claimpaths)
						{
							Memory.rescue[a].claimpaths = {sources: [], upgrade: [], ureturn: []}
							sources = Game.rooms[creep.room.name].find(FIND_SOURCES);
							for (let i = 0; i < sources.length; i++)
							{
								Memory.rescue[a].claimpaths.sources.push({pos: sources[i].pos, id: sources[i].id, mine: [], mreturn: [], mfat: []});
							}

							//Since the room init will care which source is closer to the spawn, we should too.
							let closest = Game.rooms[creep.room.name].getPositionAt(Memory.rescue[a].pos.x, Memory.rescue[a].pos.y).findClosestByPath(FIND_SOURCES, {ignoreCreeps: true}).id;
							while (closest != Memory.rescue[a].claimpaths.sources[0].id)
							{
								Memory.rescue[a].claimpaths.sources.push(Memory.rescue[a].claimpaths.sources.shift());
							}

							//Now generate the paths.
							let home = Game.rooms[creep.room.name].getPositionAt(Memory.rescue[a].pos.x, Memory.rescue[a].pos.y);
							for (let i = 0; i < Memory.rescue[a].claimpaths.sources.length; i++)
							{
								//We can be a bit sloppy with these. Who cares about the finer points when the room being rescued will handle it?
								Memory.rescue[a].claimpaths.sources[i].mine = home.findPathTo(Memory.rescue[a].claimpaths.sources[i].pos.x, Memory.rescue[a].claimpaths.sources[i].pos.y, {range: 1, maxRooms: 1});
								Memory.rescue[a].claimpaths.sources[i].mfat.push(Memory.rescue[a].claimpaths.sources[i].mine.pop());
								Memory.rescue[a].claimpaths.sources[i].mreturn = Game.rooms[creep.room.name].getPositionAt(Memory.rescue[a].claimpaths.sources[i].mine.slice(-1)[0].x, Memory.rescue[a].claimpaths.sources[i].mine.slice(-1)[0].y)
									.findPathTo(home, {range: 1, maxRooms: 1});
							}

							if (role === "builder")
							{
								//Assign our target positions to the builders.
								let i;	//Which source do we belong to?
								for (i = 0; i < Memory.rescue[a].claimpaths.sources.length; i++)
								{
									if (creep.name == Memory.rescue[a].creeps.builder[i])
									{
										break;
									}
								}
								creep.memory.target.x = Memory.rescue[a].claimpaths.sources[i].mine.slice(-1)[0].x;
								creep.memory.target.y = Memory.rescue[a].claimpaths.sources[i].mine.slice(-1)[0].y;
							}

							Memory.rescue[a].claimpaths.upgrade = home.findPathTo(Game.rooms[creep.room.name].controller, {range: 1, maxRooms: 1});
							let tempupgrade = Game.rooms[creep.room.name].getPositionAt(Memory.rescue[a].claimpaths.upgrade.slice(-1)[0].x, Memory.rescue[a].claimpaths.upgrade.slice(-1)[0].y)
							Memory.rescue[a].claimpaths.ureturn = tempupgrade.findPathTo(tempupgrade.findClosestByPath
							([
								Game.rooms[creep.room.name].getPositionAt(Memory.rescue[a].claimpaths.sources[0].mine.slice(-1)[0].x, Memory.rescue[a].claimpaths.sources[0].mine.slice(-1)[0].y),
								Game.rooms[creep.room.name].getPositionAt(
									Memory.rescue[a].claimpaths.sources[Memory.rescue[a].claimpaths.sources.length - 1].mine.slice(-1)[0].x,
									Memory.rescue[a].claimpaths.sources[Memory.rescue[a].claimpaths.sources.length - 1].mine.slice(-1)[0].y)
							]), {maxRooms: 1});
							//We're altering the upgrade path.
							Memory.rescue[a].claimpaths.upgrade = Game.rooms[creep.room.name].getPositionAt(Memory.rescue[a].claimpaths.ureturn.slice(-1)[0].x, Memory.rescue[a].claimpaths.ureturn.slice(-1)[0].y)
								.findPathTo(tempupgrade, {maxRooms: 1});
						}

						//Now that we're here, we need to do our duties.
						if (!creep.memory.movenow.length)
						{
							switch (role)
							{
								case "harvester":
								{
									//Which source do we belong to?
									let i;
									for (i = 0; i < Memory.rescue[a].claimpaths.sources.length; i++)
									{
										if (creep.name == Memory.rescue[a].creeps.harvester[i])
										{
											break;
										}
									}

									if (creep.pos.isEqualTo(Game.rooms[creep.room.name].getPositionAt(Memory.rescue[a].claimpaths.sources[i].mfat[0].x, Memory.rescue[a].claimpaths.sources[i].mfat[0].y)))
									{
										//If we're at our source, mine it.
										let status;	//Assign within comparison.
										creep.harvest(creep.pos.findInRange(FIND_SOURCES, 1)[0]);
										/*if ((status = creep.harvest(creep.pos.findInRange(FIND_SOURCES, 1)[0])) !== OK)
										{
											switch (status)
											{
												case ERR_NOT_OWNER:
													status = 'ERR_NOT_OWNER';
													break;
												case ERR_NOT_ENOUGH_RESOURCES:
													status = 'ERR_NOT_ENOUGH_RESOURCES';
													break;
											}
											console.log(creep.name + ' ' + status);
										}*/
									}
									else if(!creep.memory.movenow.length)
									{
										//If we're not at our source, go to it.
										for (let i = 0; i < Memory.rescue[a].claimpaths.sources.length; i++)
										{
											if (creep.name == Memory.rescue[a].creeps.harvester[i])
											{
												creep.memory.movenow = creep.pos.findPathTo(Memory.rescue[a].claimpaths.sources[i].mfat[0].x, Memory.rescue[a].claimpaths.sources[i].mfat[0].y, {maxRooms: 1,
													costCallback: function(roomName, costMatrix)
													{
														//We need to avoid our other harvester.
														if (i > 0 && Memory.creeps[Memory.rescue[a].creeps.harvester[i - 1]].movenow.length)
														{
															costMatrix.set(Memory.creeps[Memory.rescue[a].creeps.harvester[i - 1]].movenow.slice(-1)[0].x, Memory.creeps[Memory.rescue[a].creeps.harvester[i - 1]].movenow.slice(-1)[0].y, 255);
														}
													}
												});
												break;
											}
										}
									}
									break;
								}
								case "builder":
								{
									let builder = require('role.builder');

									if (Memory.rescue[a].scavenge)
									{										
										//If we're set to scavenge mode, we find energy wherever we can.
										if (!creep.memory.movenow.length)
										{
											let workp = creep.getActiveBodyparts(WORK);

											//If we're by energy, we need to pick it up.
											let energy;
											if (creep.carry.energy === 0 || !Memory.creeps[creep.name].return)
											{
												//Find the closest source of scavenged energy.
												energy = Game.rooms[creep.room.name].find(FIND_DROPPED_RESOURCES, {filter: {resourceType: RESOURCE_ENERGY}});
												energy = energy.concat(Game.rooms[creep.room.name].find(FIND_STRUCTURES,
													{filter: function(struct) {return struct.structureType === STRUCTURE_WALL || struct.structureType === STRUCTURE_RAMPART}}));
												energy = creep.pos.findClosestByPath(energy);

												let status;

												if (builder.transport.withdrawRuins(creep) ||
													((status = creep.dismantle(energy)) === OK && Math.floor(workp / 4) >= creep.store.getFreeCapacity()))	//Clean up ruins and dropped energy. Dismantle walls.
												{
													Memory.creeps[creep.name].return = true;
												}
												else if (status !== OK)
												{
													Memory.creeps[creep.name].return = false;
												}
												else if (creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 3, {filter: {structureType: STRUCTURE_SPAWN}}).length !== 0)
												{
													Memory.creeps[creep.name].return = false;
												}
											}
											else if (creep.build(creep.pos.findInRange(FIND_CONSTRUCTION_SITES, 3, {filter: {structureType: STRUCTURE_SPAWN}})[0]) === OK
												&& workp >= creep.carry.energy)
											{
												Memory.creeps[creep.name].return = false;
											}

											//If we're not on our path, we need to go to it.
											if (creep.memory.return)	//We're going to build the spawn
											{
												creep.memory.movenow = creep.pos.findPathTo(Memory.rescue[a].pos.x, Memory.rescue[a].pos.y, {range: 3, maxRooms: 1,
													costCallback: function(roomName, costMatrix)
													{
														//We need to make sure we don't stomp the spawn.
														costMatrix.set(Memory.rescue[a].pos.x, Memory.rescue[a].pos.y, 255);
													}
												});
											}
											else	//We're returning to the energy.
											{
												if (!energy)
												{
													//Find the closest source of scavenged energy.
													energy = Game.rooms[creep.room.name].find(FIND_DROPPED_RESOURCES, {filter: {resourceType: RESOURCE_ENERGY}});
													energy = energy.concat(Game.rooms[creep.room.name].find(FIND_STRUCTURES,
														{filter: function(struct) {return struct.structureType === STRUCTURE_WALL || struct.structureType === STRUCTURE_RAMPART}}));
													energy = creep.pos.findClosestByPath(energy);
												}
												creep.memory.movenow = creep.pos.findPathTo(energy.pos.x, energy.pos.y, {range: 1, maxRooms: 1,
													costCallback: function(roomName, costMatrix)
													{
														//We need to make sure we don't stomp the spawn.
														costMatrix.set(Memory.rescue[a].pos.x, Memory.rescue[a].pos.y, 255);
													}
												});
											}

											/*if (creep.carry.energy === 0)	//If we don't have energy, we need to obtain it.
											{
												

												if (creep.pos.inRangeTo(energy, 1))	//Are we in range to do something with it?
												{
													if (energy.resourceType)	//It's dropped energy.
													{
														creep.pickup(energy);
													}
													else if (energy.structureType)
													{
														creep.dismantle(energy);
													}
												}
												else	//If we're not in range, get in range.
												{
													creep.memory.movenow = creep.pos.findPathTo(energy.x, energy.y, {range: 1, maxRooms: 1,
														costCallback: function(roomName, costMatrix)
														{
															//We need to make sure not to stomp the spawn.
															costMatrix.set(Memory.rescue[a].pos.x, Memory.rescue[a].pos.y, 255);
														}
													});
												}
											}
											else	//If we have energy, we need to use it.
											{
												if (creep.pos.inRangeTo(Memory.rescue[a].pos.x, Memory.rescue[a].pos.y, 3))	//Are we in range to do something with it?
												{
													
												}
												else	//If we're not in range, get in range.
												{
													creep.memory.movenow = creep.pos.findPathTo(Memory.rescue[a].pos.x, Memory.rescue[a].pos.y, {range: 3, maxRooms: 1,
															costCallback: function(roomName, costMatrix)
															{
																//We need to make sure not to stomp the spawn.
																costMatrix.set(Memory.rescue[a].pos.x, Memory.rescue[a].pos.y, 255);
															}
														});
												}
											}*/
										}
										else
										{
											creep.moveByPath(creep.memory.movenow);
										}
									}
									else
									{
										//Which source do we belong to?
										let i;
										for (i = 0; i < Memory.rescue[a].claimpaths.sources.length; i++)
										{
											if (creep.name == Memory.rescue[a].creeps.builder[i])
											{
												break;
											}
										}

										//If we're by energy, we need to pick it up.
										if (creep.carry.energy === 0)
										{
											if (builder.transport.withdrawRuins(creep))	//Clean up ruins.
											{
												Memory.creeps[creep.name].return = true;
											}
											else if (creep.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 1).length != 0)
											{
												Memory.creeps[creep.name].return = false;
											}
										}
										else
										{
											creep.build(creep.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3)[0]);
										}

										//If we're not on our path, we need to go to it.
										if (creep.memory.return && creep.moveByPath(Memory.rescue[a].claimpaths.sources[i].mreturn) == ERR_NOT_FOUND)	//We're going to build the spawn
										{
											creep.moveTo(Memory.rescue[a].claimpaths.sources[i].mreturn.slice(-1)[0].x, Memory.rescue[a].claimpaths.sources[i].mreturn.slice(-1)[0].y, {maxRooms: 1, reusePath: 20});
										}
										else if (!creep.memory.return && creep.moveByPath(Memory.rescue[a].claimpaths.sources[i].mine) == ERR_NOT_FOUND)	//We're returning to the source.
										{
											creep.moveTo(Memory.rescue[a].claimpaths.sources[i].mine.slice(-1)[0].x, Memory.rescue[a].claimpaths.sources[i].mine.slice(-1)[0].y, {maxRooms: 1, reusePath: 20});
										}
									}
									break;
								}
							}
						}
						else
						{
							status = creep.moveByPath(creep.memory.movenow)
							if(status == OK || status == ERR_TIRED)
							{
								//console.log(creep.name + ": Using stored move.");
							}
							else if (status == ERR_NOT_FOUND)	//We've presumably completed our move orders. Switch back to normal movement.
							{
								Memory.creeps[creep.name].movenow = [];
								console.log(creep.name + ": Switching to normal pathing.");
								//return control.move(creep, role, source);
							}

							if (creep.pos.isEqualTo(Game.rooms[creep.room.name].getPositionAt(creep.memory.movenow.slice(-1).x, creep.memory.movenow.slice(-1).y)))
							{
								creep.memory.movenow = [];
							}
						}
					}
				}
			}
		}
	},

	//This runs every sign object.
	signs: function()
	{
		//Iterate the room actions of this type.
		for (let a = 0; a < Memory.signs.length; a++)
		{
			//Iterate each role in this room action.
			for (let role in Memory.signs[a].creeps)
			{
				//Iterate each creep in this role.
				for (let c = 0; c < Memory.signs[a].creeps[role].length; c++)
				{
					let creep = Game.creeps[Memory.signs[a].creeps[role][c]];
					//If we're in our target room, do our tasks.
					if (Game.creeps[Memory.signs[a].creeps[role][c]].pos.roomName == Memory.signs[a].pos.roomName)
					{
						//Our only creep is a scout to sign the room.
						//Are we at the controller yet? (This flag has to be placed against the controller.)
						if (creep.pos.isEqualTo(Memory.signs[a].pos.x, Memory.signs[a].pos.y))
						{
							if (creep.signController(creep.room.controller, claim.signature) == OK)
							{
								//creep.suicide();
								Memory.signs.splice(a, 1);
								if (Memory.signs.length == 0)
								{
									delete Memory.signs;
								}
							}
						}
						else if (creep.memory.movenow.length != 0)
						{
							status = creep.moveByPath(creep.memory.movenow)
							if(status == OK || status == ERR_TIRED)
							{
								//console.log(creep.name + ": Using stored move.");
							}
							else if (status == ERR_NOT_FOUND)	//We've presumably completed our move orders. Switch back to normal movement.
							{
								Memory.creeps[creep.name].movenow = [];
								console.log(creep.name + ": Switching to normal pathing.");
								//return require('control').move(creep, role, source);
							}
						}
						else
						{
							//We need to get a path.
							Memory.creeps[creep.name].movenow = creep.pos.findPathTo(Memory.signs[a].pos.x, Memory.signs[a].pos.y);
						}
					}
				}
			}
		}
	},

	withdraw: function()
	{
		//Iterate the room actions of this type.
		for (let a = 0; a < Memory.withdraw.length; a++)
		{	
			//Locate things we can withdraw from.
			let structs = room.find(FIND_STRUCTURES, {filter: 
				function(structure)
				{
					return structure.store !== undefined && structure.store.getUsedCapacity() > 0 && structure.structureType != STRUCTURE_STORAGE;
				}})
			.concat(room.find(FIND_RUINS, {filter: 
				function(structure)
				{
					return structure.store !== undefined && structure.store.getUsedCapacity() > 0;
				}}))
			.concat(room.find(FIND_TOMBSTONES, {filter: 
				function(structure)
				{
					return structure.store !== undefined && structure.store.getUsedCapacity() > 0;
				}}));
			if (creep.room.storage)
			{
				structs.unshift(creep.room.storage);
			}

			//Iterate each role in this room action.
			for (let role in Memory.withdraw[a].creeps)
			{
				//Iterate each creep in this role.
				for (let c = 0; c < Memory.withdraw[a].creeps[role].length; c++)
				{
					let creep = Game.creeps[Memory.withdraw[a].creeps[role][c]];
					//If we're in our target room, do our tasks.
					if (Game.creeps[Memory.withdraw[a].creeps[role][c]].pos.roomName == Memory.withdraw[a].pos.roomName)
					{
						if (creep.memory.movenow.length != 0)
						{
							status = creep.moveByPath(creep.memory.movenow)
							if(status == OK || status == ERR_TIRED)
							{
								//console.log(creep.name + ": Using stored move.");
							}
							else if (status == ERR_NOT_FOUND)	//We've presumably completed our move orders. Switch back to normal movement.
							{
								Memory.creeps[creep.name].movenow = [];
								console.log(creep.name + ": Switching to normal pathing.");
								//return require('control').move(creep, role, source);
							}
						}
						else 
						{
							if (creep.pos.inRangeTo(Memory.withdraw[a].pos.x, Memory.withdraw[a].pos.y, 1))
							{
								//Withdraw from our target.
								let target = creep.pos.findInRange(structs)[0];
								if (target && creep.withdraw(target, Object.keys(target.store)[0]) == OK)
								{
									//Shift this creep from a withdrawer to a depositer. Withdraw and deposit actions are paired.
									Memory.deposit[a].creeps[role].push(Memory.withdraw[a].creeps[role].splice(c, 1));
									c--;
								}
							}
							else
							{
								//We need to get a path.
								Memory.creeps[creep.name].movenow = creep.pos.findPathTo(Memory.withdraw[a].pos.x, Memory.withdraw[a].pos.y, {ignoreCreeps: true});
								Memory.creeps[creep.name].movenow.pop();
							}
						}
					}
				}
			}
		}
	},
	
/*	deposit: function()
	{
		//Iterate the room actions of this type.
		for (let a = 0; a < Memory.deposit.length; a++)
		{
			//Iterate each role in this room action.
			for (let role in Memory.deposit[a].creeps)
			{
				//Iterate each creep in this role.
				for (let c = 0; c < Memory.deposit[a].creeps[role].length; c++)
				{
					let creep = Game.creeps[Memory.deposit[a].creeps[role][c]];
					//If we're in our target room, do our tasks.
					if (Game.creeps[Memory.deposit[a].creeps[role][c]].pos.roomName == Memory.deposit[a].pos.roomName)
					{
						if (creep.memory.movenow.length != 0)
						{
							status = creep.moveByPath(creep.memory.movenow)
							if(status == OK || status == ERR_TIRED)
							{
								//console.log(creep.name + ": Using stored move.");
							}
							else if (status == ERR_NOT_FOUND)	//We've presumably completed our move orders. Switch back to normal movement.
							{
								Memory.creeps[creep.name].movenow = [];
								console.log(creep.name + ": Switching to normal pathing.");
								//return require('control').move(creep, role, source);
							}
						}
						else 
						{
							if (creep.pos.inRangeTo(Memory.deposit[a].pos.x, Memory.deposit[a].pos.y, 1))
							{
								//Deposit to our target.
								let target = creep.room.storage;
								if (target && creep.transfer(target, Object.keys(creep.store)[0]) == OK)
								{
									if (creep.ticksToLive < 800 || creep.room.name != )
									{
										//Shift this creep from a depositer to a withdrawer. Withdraw and deposit actions are paired.
										Memory.withdraw[a].creeps[role].push(Memory.deposit[a].creeps[role].splice(c, 1));
										c--;
									}
									else
									{
										//The path is too long for a second trip.
										creep.suicide();
									}
								}
							}
							else
							{
								//We need to get a path.
								Memory.creeps[creep.name].movenow = creep.pos.findPathTo(Memory.deposit[a].pos.x, Memory.deposit[a].pos.y, {ignoreCreeps: true});
								Memory.creeps[creep.name].movenow.pop();
							}
						}
					}
				}
			}
		}
	},*/

	//This runs every paver object.
	pave: function()
	{
		//Iterate the room actions of this type.
		for (let a = 0; a < Memory.paver.length; a++)
		{
			//Iterate each role in this room action.
			for (let role in Memory.paver[a].creeps)
			{
				//Iterate each creep in this role.
				for (let c = 0; c < Memory.paver[a].creeps[role].length; c++)
				{
					let creep = Game.creeps[Memory.paver[a].creeps[role][c]];
					//If we're in our target room, do our tasks.
					if (Game.creeps[Memory.paver[a].creeps[role][c]].pos.roomName == Memory.paver[a].pos.roomName)
					{
						
					}
				}
			}
		}
	},

	roomactions: ['attack', 'reserves', 'claims', 'signs', 'withdraw', 'deposit', 'pave', 'rescue'],

	actionideal:
	{
		attack: {tank: 0, attacker: 0, rattacker: 0, dattacker: 0, healer: 0, paver: 0, tank: 0},
		reserves: {reserver: 1},
		claims: {harvester: 2, builder: 2, claimer: 1},
		signs: {scout: 1},
		withdraw: {transport: 4},
		deposit: {transport: 0},
		pave: {paver: 1},
		rescue: {harvester: 2, builder: 2}
	},

	signature: "I am, therefore I'll think. [Bad_Named_Alliance]",
	oversignature: 'Overmind destroyed by [Bad_Named_Alliance]',

	checkallies: undefined,

	allowallies: undefined
};

module.exports = claim;

claim.checkallies = require('empire').checkallies;
claim.allowallies = require('empire').allowallies;