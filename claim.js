var claim =
{
	map: function(start_room, target_position, remote_start = false)	//If we use remote_start, it should be a position structure containing x, y, and roomName.
	{
		let target_room = target_position.roomName;
		//console.log("From " + start_room + " to " + target_room);

		//First we have to get a high level map of which rooms to traverse.
		let room_path = Game.map.findRoute(start_room, target_room);
		//console.log(target_position);
		//console.log(JSON.stringify(room_path));

		let start_position;
		if (!remote_start)
		{
			//If we own the room we're starting in, use an exit path.
			start_position = new RoomPosition(Memory.rooms[start_room].exitpaths[room_path[0].room].slice(-1)[0].x, Memory.rooms[start_room].exitpaths[room_path[0].room].slice(-1)[0].y, start_room);
		}
		else
		{
			//If we don't own the room we're starting in, we are probably specifying our own start position.
			start_position = new RoomPosition(remote_start.x, remote_start.y, remote_start.roomName);
		}
		//console.log(JSON.stringify("Start: " + start_position));

		//Now we have to build the low level paths through the rooms.
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
						//console.log("Checking  if " + roomName + " is " + room_path[r].room)
						//console.log("Ruling in " + room_path[r].room);
						inpath = true;
					}
					/*else
					{
						console.log("Checking  if " + roomName + " is " + room_path[r].room)
						console.log("Ruling out " + room_path[r].room);
					}*/
				}
				if (!inpath)	//If it's not.
				{
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
			if (Array.isArray(Memory.attack))
			{
				type = "attack";
			}
			else if (Array.isArray(Memory.signs))
			{
				type = "signs";
			}
			else if (Array.isArray(Memory.reserves))
			{
				type = "reserves";
			}
			else if (Array.isArray(Memory.claims))
			{
				type = "claims";
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
		for (let a = 0; a < Memory[type].length; a++)
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
					//We should wait until the room has enough to build it.
					let body = require('body')[role](Game.rooms[room_name].energyCapacityAvailable)
					let cost = require('calculate').bodyCost(body);
					let spawns;
					//If we have enough to build it, then build it.
					if (cost <= Game.rooms[room_name].energyAvailable)
					{
						spawns = Game.rooms[room_name].find(FIND_MY_SPAWNS);
						for (let s = 0; s < spawns.length; s++)
						{
							//Find a spawn that's not spawning.
							if (!spawns[s].spawning)
							{
								//Now build it.
								let name = spawns[s].name.slice(0, 3) + spawns[s].name.slice(6) + role.charAt(0).toUpperCase() + role.slice(1) + a + "_" + Game.time.toString()
								let status = spawns[s].spawnCreep(body, name, {memory: {target: {}, movenow: []}, energyStructures: require('calculate').sortExtensions(room_name), directions: [spawns[s].pos.getDirectionTo(
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
								//Creeps capable of a round trip must be accounted for as well.
								if (Memory.creeps[creep.name].return)
								{
									//We're returning to our starting room.
									
								}
								else
								{
									//console.log(JSON.stringify(Memory.rooms[Memory[type][a].closest].exitpaths[Object.keys(Memory[type][a].path)[0]]));
									//We're leaving our starting room.
									creep.moveByPath(Memory.rooms[Memory[type][a].closest].exitpaths[Object.keys(Memory[type][a].path)[0]]);
								}
							}
							else if (creep.pos.roomName != Memory[type][a].pos.roomName)	//If we aren't at our target room yet, move along our inter-room path.
							{
								//console.log(JSON.stringify(Memory[type][a].path));
								creep.moveByPath(Memory[type][a].path[creep.room.name]);
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
			for (let room_name in Memory.rooms)
			{	//We're assigning tpath within this comparison so the findRoute only happens on valid rooms.
				if (Game.rooms[room_name].controller.level > 2 && (tpath = Game.map.findRoute(room_name, object.pos.roomName)) && tpath.length < shortest)
				{
					//console.log(room_name + " is a valid room.");
					shortest = tpath.length;
					closest = room_name;
				}
			}

			//Once we have the closest, generate the path.
			if (type != 'deposit')
			{
				tpath = claim.map(closest, object.pos);
				object.closest = closest;
			}
			else
			{
				
			}

			//Separate the path by what room it's in.
			for (let p = 0; p < tpath.path.length; p++)
			{
				if (!Array.isArray(object.path[tpath.path[p].roomName]))
				{
					object.path[tpath.path[p].roomName] = [];
				}

				object.path[tpath.path[p].roomName].push(tpath.path[p]);
			}
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
					let range = {attacker: 1, mattacker: 1, rattacker: 3, dattacker: 1}[role];
					//If we're in our target room, do our tasks.
					if (Game.creeps[Memory.attack[a].creeps[role][c]].pos.roomName == Memory.attack[a].pos.roomName)
					{
						//Are we at the enemy yet? (This flag has to be placed on the enemy.)
						if (creep.pos.inRangeTo(Memory.attack[a].pos.x, Memory.attack[a].pos.y, range))
						{
							//Get room enemies.
							let enemies;
							if (role == 'attacker' || role == 'rattacker')
							{
								enemies = creep.pos.findInRange(FIND_HOSTILE_CREEPS, range, {filter: claim.checkallies})
							}
							else if (role == 'dattacker')
							{
								enemies = [];
							}
							enemies = enemies.concat(creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, range, {filter: function(structure) {return structure.structureType != STRUCTURE_CONTROLLER && claim.checkallies(structure)} }))
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
							if (enemies.length == 0)	//If we are doing a sustained attack, then we need to kill everything in this room.
							{
								if (role == 'attacker' || role == 'rattacker')
								{
									enemies = creep.room.find(FIND_HOSTILE_CREEPS, {filter: claim.checkallies});
								}
								else if (role == 'dattacker')
								{
									enemies = [];
								}
									enemies = enemies.concat(creep.room.find(FIND_HOSTILE_STRUCTURES, {filter: function(structure) {return structure.structureType != STRUCTURE_CONTROLLER && claim.checkallies(structure)} }))
									.concat(creep.pos.findInRange(FIND_STRUCTURES, range, {filter: {structureType: STRUCTURE_CONTAINER}}))
									.concat(creep.room.find(FIND_STRUCTURES, {filter: {structureType: STRUCTURE_POWER_BANK}}));

								//If there are no enemies left, check to see if the controller still exists.
								/*if (enemies.length == 0)
								{
									//If we found a controller, we're going to guard it.
									enemies = creep.room.find(FIND_HOSTILE_STRUCTURES, {filter: claim.checkallies});
								}*/

								let tempenemy = creep.pos.findClosestByPath(enemies);
								if (tempenemy)
								{
									Memory.attack[a].pos = tempenemy.pos;
								}
							}
							else
							{
								switch(role)
								{
									case 'attacker':
									case 'mattacker':
										creep.attack(enemies[0]);
										break;

									case 'rattacker':
										creep.rangedAttack(enemies[0]);
										break;

									case 'dattacker':
										creep.dismantle(enemies[0]);
										break;
									case 'healer':
										creep.heal();
										break;
									case 'tank':
										creep.heal(creep);
										break;
									default:
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
							Memory.creeps[creep.name].movenow = creep.pos.findPathTo(Memory.attack[a].pos.x, Memory.attack[a].pos.y);
							Memory.creeps[creep.name].movenow.splice((0 - range), range);
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
						if (spawn.length != 0 && Game.cpu.bucket >= 500)	//Initializing a room is CPU intensive.
						{
							let init = require('init');
							if (init.run())
							{
								//If we get this far without errors, turn our creeps over.
								//Re-run our creep iterating code.
								//Iterate each role in this room action.
								for (let role in Memory.claims[a].creeps)
								{
									//Iterate each creep in this role.
									for (let c = 0; c < Memory.claims[a].creeps[role].length; c++)
									{
										switch (role)
										{
											case "harvester":
											case "builder":
											{
												Memory.rooms[creep.room.name].sources[c].creeps[role].push(Memory.claims[a].creeps[role][c]);
												break;
											}
											case "claimer":
											{
												Memory.rooms[creep.room.name].creeps.upgrader.push(Memory.claims[a].creeps[role][c]);
												break;
											}
										}
									}
								}

								//Creeps should be handed over now. Delete the action.
								Memory.claims.splice(a, 1);
								if (Memory.claims.length == 0)
								{
									delete Memory.claims;
								}

								return true;
							}
							else
							{
								return false;
							}
						}
						else if (Game.rooms[creep.room.name].controller.my && Game.rooms[creep.room.name].find(FIND_MY_CONSTRUCTION_SITES).length == 0)
						{
							//Create our spawn.
							Game.rooms[creep.room.name].createConstructionSite(Memory.claims[a].pos.x, Memory.claims[a].pos.y, STRUCTURE_SPAWN, require('builder').newSpawn(false, a));
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
								Memory.claims[a].claimpaths.sources[i].mine = home.findPathTo(Memory.claims[a].claimpaths.sources[i].pos.x, Memory.claims[a].claimpaths.sources[i].pos.y, {range: 1});
								Memory.claims[a].claimpaths.sources[i].mfat.push(Memory.claims[a].claimpaths.sources[i].mine.pop());
								Memory.claims[a].claimpaths.sources[i].mreturn = Game.rooms[creep.room.name].getPositionAt(Memory.claims[a].claimpaths.sources[i].mine.slice(-1)[0].x, Memory.claims[a].claimpaths.sources[i].mine.slice(-1)[0].y)
									.findPathTo(home, {range: 1});
							}

							if (role == "builder")
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

							Memory.claims[a].claimpaths.upgrade = home.findPathTo(Game.rooms[creep.room.name].controller, {range: 1});
							let tempupgrade = Game.rooms[creep.room.name].getPositionAt(Memory.claims[a].claimpaths.upgrade.slice(-1)[0].x, Memory.claims[a].claimpaths.upgrade.slice(-1)[0].y)
							Memory.claims[a].claimpaths.ureturn = tempupgrade.findPathTo(tempupgrade.findClosestByPath
							([
								Game.rooms[creep.room.name].getPositionAt(Memory.claims[a].claimpaths.sources[0].mine.slice(-1)[0].x, Memory.claims[a].claimpaths.sources[0].mine.slice(-1)[0].y),
								Game.rooms[creep.room.name].getPositionAt(
									Memory.claims[a].claimpaths.sources[Memory.claims[a].claimpaths.sources.length - 1].mine.slice(-1)[0].x,
									Memory.claims[a].claimpaths.sources[Memory.claims[a].claimpaths.sources.length - 1].mine.slice(-1)[0].y)
							]));
							//We're altering the upgrade path.
							Memory.claims[a].claimpaths.upgrade = Game.rooms[creep.room.name].getPositionAt(Memory.claims[a].claimpaths.ureturn.slice(-1)[0].x, Memory.claims[a].claimpaths.ureturn.slice(-1)[0].y)
								.findPathTo(tempupgrade);
						}

						//Now that we're here, we need to do our duties.
						if (creep.memory.movenow.length == 0)
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
										creep.harvest(creep.pos.findInRange(FIND_SOURCES, 1)[0]);
									}
									else
									{
										//If we're not at our source, go to it.
										for (let i = 0; i < Memory.claims[a].claimpaths.sources.length; i++)
										{
											if (creep.name == Memory.claims[a].creeps.harvester[i])
											{
												creep.memory.movenow = creep.pos.findPathTo(Memory.claims[a].claimpaths.sources[i].mfat[0].x, Memory.claims[a].claimpaths.sources[i].mfat[0].y);
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
										creep.moveByPath(creep.pos.findPathTo(Memory.claims[a].claimpaths.sources[i].mreturn.slice(-1)[0].x, Memory.claims[a].claimpaths.sources[i].mreturn.slice(-1)[0].y));
									}
									else if (!creep.memory.return && creep.moveByPath(Memory.claims[a].claimpaths.sources[i].mine) == ERR_NOT_FOUND)	//We're returning to the source.
									{
										creep.moveByPath(creep.pos.findPathTo(Memory.claims[a].claimpaths.sources[i].mine.slice(-1)[0].x, Memory.claims[a].claimpaths.sources[i].mine.slice(-1)[0].y));
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
											creep.signController(creep.room.controller, claim.signature);
											creep.claimController(creep.room.controller);
										}
										else
										{
											//If we're not in range, get in range.
											creep.memory.movenow = creep.pos.findPathTo(Memory.claims[a].claimpaths.upgrade.slice(-1)[0].x, Memory.claims[a].claimpaths.upgrade.slice(-1)[0].y);
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
							if (creep.pos.inRangeTo(Memory.attack[a].pos.x, Memory.attack[a].pos.y, 1))
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
								Memory.creeps[creep.name].movenow = creep.pos.findPathTo(Memory.attack[a].pos.x, Memory.attack[a].pos.y, {ignoreCreeps: true});
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
							if (creep.pos.inRangeTo(Memory.attack[a].pos.x, Memory.attack[a].pos.y, 1))
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
								Memory.creeps[creep.name].movenow = creep.pos.findPathTo(Memory.attack[a].pos.x, Memory.attack[a].pos.y, {ignoreCreeps: true});
								Memory.creeps[creep.name].movenow.pop();
							}
						}
					}
				}
			}
		}
	},*/

	roomactions: ["attack", "reserves", "claims", "signs", "withdraw", "deposit"],

	actionideal: {attack: {tank: 0, attacker: 1, rattacker: 0, dattacker: 0, healer: 0, paver: 0, tank: 0}, reserves: {reserver: 1}, claims: {harvester: 2, builder: 2, claimer: 1}, signs: {scout: 1}, withdraw: {transport: 4}, deposit: {transport: 0}},

	signature: "I am, therefore I'll think. [Bad_Named_Alliance]",
	oversignature: "Overmind destroyed by [Bad_Named_Alliance]",

	checkallies: undefined,

	allowallies: undefined
};

module.exports = claim;

claim.checkallies = require('empire').checkallies;
claim.allowallies = require('empire').allowallies;