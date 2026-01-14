var body;	//This is assigned later, but only if we could build something.
var calculate = require('calculate');

var builder =
{
	run: function(emergencyoverride = false) //Keep this true while testing our basics.
	{
		//Build creeps from spawns.
		for (let room_name in Memory.rooms) //Enumerate rooms. This only contains rooms where we have a spawner, so we don't have to worry about being agnostic of neutral rooms.
		{
			let emergency = emergencyoverride;
			let myextensions = Game.rooms[room_name].find(FIND_MY_STRUCTURES,
			{
				filter:
				{
					structureType: STRUCTURE_EXTENSION
				}
			});
			//let myspawns = Game.rooms[room_name].find(FIND_MY_SPAWNS);

			//If we're out of creeps, it's an emergency.
			for (i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				//It's not enough to emergency on a missing transport, we have to do it on a missing harvester too. But we want the harvester to be big enough too.
				if (((Memory.rooms[room_name].sources[i].ideal.mtransport && Memory.rooms[room_name].sources[i].creeps.mtransport.length === 0)
					|| (Memory.rooms[room_name].sources[i].ideal.harvester && Memory.rooms[room_name].sources[i].creeps.harvester.length === 0)
					|| (Memory.rooms[room_name].sources[i].ideal.hybrid && Memory.rooms[room_name].sources[i].creeps.hybrid.length === 0))
					&& (Game.rooms[room_name].energyAvailable >= 550 || Game.rooms[room_name].find(FIND_MY_CREEPS).length <= 1))	//If we have nothing, we have a true emergency.
					//Now that we're calculating maximum energy based on completed structures, we shouldn't need to emergency on a missing extension.
					//|| myextensions.length < CONTROLLER_STRUCTURES.extension[Game.rooms[room_name].controller.level])
				{
					emergency = true;
				}
			}

			//We should only build if our energy is full. Or if it's an emergency.
			if ((calculate.currentEnergy(room_name) < calculate.maximumEnergy(room_name)) && !emergency)
			{
				//We don't have the amount of energy our room level could max out at. Skip it for now.
				continue;
			}
			else if (emergency && Game.rooms[room_name].energyAvailable < 300)
			{
				//It's an emergency, but we should wait until we have 300.
				continue;
			}

			//Find our first non-busy spawn. If they're all busy, we aren't building anything.
			let spawn;
			let spawn_index;
			let all_busy = true;
			for (spawn_index = 0; spawn_index < 2; spawn_index++)
			{
				spawn = Game.getObjectById(Memory.rooms[room_name].spawns[spawn_index].id);
				if (spawn && spawn.spawning === null)	//We found a spawn that's not building.
				{
					all_busy = false;
					break;
				}
			}

			if (all_busy)	//No free spawns. There's nothing to do with this room.
			{
				continue;
			}

			//If we've made it this far, we're committed to building something if it's necessary.
			body = require('body');
			let anticipate = builder.anticipate.checkCreeps(room_name);

			//First, check to see if any of our sources are empty. (Empty means no mtransport.) Since harvesters come first, we will gain a harvester by the time we've gained an mtransport.
			let anyharvest = true;
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				if (Memory.rooms[room_name].sources[i].creeps.mtransport.length - anticipate.sources[i].mtransport === 0)
				{
					anyharvest = false;
				}
			}

			let need = -1;
			let role = false;

			for (let creep_role in Memory.rooms[room_name].creeps)	//Check each role we have stored in the room itself.
			{
				//console.log("anyharvest: " + anyharvest);
				if (anyharvest && Memory.rooms[room_name].creeps[creep_role].length - anticipate[creep_role] < Memory.rooms[room_name].ideal[creep_role]) //If we already have transports from both sources and we're missing any room-wide creeps.
				{
					role = creep_role;	//We've decided on a room-wide creep.
					//console.log("We've decided on the " + role + " room-wide creep.");
					break;
				}
			}

			if (!role) //If we've already decided on a room-wide creep, skip this.
			{
				let needcount = {};

				//Establish our priority roles by taking the first role of each source.
				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++ )
				{
					needcount[Object.keys(Memory.rooms[room_name].sources[i].creeps)[0]] = null;
				}

				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++ )	//Iterate over the sources.
				{
					//console.log(i);
					for (let creep_role in Memory.rooms[room_name].sources[i].creeps)	//Check each role we have stored in this source.
					{
						//For now, we're building a list of each role and how many each source needs of it. Iterating that after is the easiest way.
						//Otherwise we would have to hack together something by iterating just one source's roles and then assuming the other sources share the same roles.
						if (!needcount[creep_role])
						{
							needcount[creep_role] = new Array(Memory.rooms[room_name].sources.length).fill(0);
						}

						//How many of this role is needed for each source?
						if (Memory.rooms[room_name].sources[i].ideal[creep_role] === undefined)
						{
							needcount[creep_role][i] = 0;
						}
						else
						{
							needcount[creep_role][i] = Memory.rooms[room_name].sources[i].ideal[creep_role] - Memory.rooms[room_name].sources[i].creeps[creep_role].length + anticipate.sources[i][creep_role];
						}
					}
				}

				//Now iterate over our role list.
				for (let creep_role in needcount)
				{
					let highestneed = 0;

					//Our overall goal is to flip back and forth, steadily filling the same role on both sources.
					//However, it's better for our room if we get one harvester and one mtransport on our first source as soon as possible.
					for (let i = 0; i < needcount[creep_role].length; i++)
					{
						if (Memory.rooms[room_name].sources[i].ideal[creep_role] === undefined)
						{
							continue;
						}

						//If we're about to build an additional harvester while the previous one doesn't have an mtransport, skip the entire harvester role.
						if ((creep_role === 'harvester' || creep_role === 'hybrid') && i > 0 && Memory.rooms[room_name].sources[i - 1].creeps.mtransport.length === 0)
						{
							break;
						}
						else	//If our sources are set up, we use our normal strategy.
						{
							if (needcount[creep_role][i] > highestneed)
							{
								need = i;
								role = creep_role;
								highestneed = needcount[creep_role][i];
							}
						}
					}

					//If we've selected a role, we don't need to check the others.
					if (role)
					{
						break;
					}
				}
			}

			if (need === -1)
			{
				//No source needed a creep.
				//console.log("No source needed a creep.");
				need = "";
			}
			if (!role)
			{
				//No creeps needed.
				//console.log("No creeps needed.");
				continue;
			}
			else if (emergency)
			{
				console.log("It's an emergency.");	//Moving this here so it doesn't announce this status every tick.
			}

			//Fabricate a name for the new creep.
			let name = spawn.name.slice(0, 3) + spawn.name.slice(require('builder').newSpawn.basename.length) + role.charAt(0).toUpperCase() + role.slice(1) + need + "_" + Game.time.toString();

			let options = {memory: {movenow: []}, directions: null};	//Define the options object for the spawner.

			//What direction should the creep go when it's built? For transports, what's the target?
			let direction;
			switch(role)
			{
				case 'custodian':
				{
					let labs = require('labs');
					//labs.request(name, [RESOURCE_ZYNTHIUM_OXIDE, RESOURCE_UTRIUM_ALKALIDE, RESOURCE_CATALYZED_KEANIUM_ACID]);
					options.memory.mission = require('role.custodian').missions.length - 1;	//It needs to select a mission. By default we start with getting boosted.
					options.memory.harv = body[role](Game.rooms[room_name].energyAvailable).reduce(calculate.reduceManyWork, 0) * 2;
					options.memory.t = 0;
					options.memory.lmission = [];	//It should track what missions it has already performed.
					options.memory.direction = false;
					//options.memory.ldirection = false;	//If it makes a pit stop, it needs to go back where it came from.
					options.memory.path = 0;	//The mine path is the initial path from the spawn.
					options.memory.s = -1;	//We'll probably get boosted first, which is a room-wide path.
					options.memory.d_path = 0;	//Desired path. It needs to get to the right path for the job from its current path.
					options.memory.d_s = 0;	//Sometimes it needs to switch to another source.
					options.memory.target = {x: null, y: null};	//Not sure if we need this.
					direction = [Memory.rooms[room_name].spawns[spawn_index].dir.minedir[0]];
					break;
				}
				case 'harvester':
				case 'hybrid':
				{
					options.memory.direction = false;
					options.memory.path = 0;
					options.memory.target =
					{
						x: Memory.rooms[room_name].sources[need].mfat.slice(0, 1)[0].x,
						y: Memory.rooms[room_name].sources[need].mfat.slice(0, 1)[0].y
					};
					direction = [Memory.rooms[room_name].spawns[spawn_index].dir.minedir[need]];	//It goes to a source.
					break;
				}
				case 'mtransport':
				{
					options.memory.direction = false;
					options.memory.path = 0;
					options.memory.target =
					{
						x: Memory.rooms[room_name].sources[need].mine.slice(-1)[0].x,
						y: Memory.rooms[room_name].sources[need].mine.slice(-1)[0].y
					};
					options.memory.utrip = false;
					options.memory.dtrip = false;
					direction = [Memory.rooms[room_name].spawns[spawn_index].dir.minedir[need]];	//It goes to a source.
					break;
				}
				case 'upgrader':
				{
					options.memory.direction = false;
					options.memory.path = 11;
					options.memory.target =
					{
						x: Memory.rooms[room_name].upgrade.slice(-1)[0].x,
						y: Memory.rooms[room_name].upgrade.slice(-1)[0].y
					};
					direction = [Memory.rooms[room_name].spawns[spawn_index].dir.upgradedir];	//It goes to the controller.
					break;
				}
				case 'utransport':	//We might not have a container yet. Store the desired position.
				{
					//Our target is the last step in the upgrader's path, since that's where it will be waiting.
					options.memory.direction = Memory.rooms[room_name].sources[need].minedir2;
					options.memory.path = 0;
					options.memory.target =
					{
						x: Memory.rooms[room_name].upgrade.slice(-1)[0].x,
						y: Memory.rooms[room_name].upgrade.slice(-1)[0].y
					};
					direction = [Memory.rooms[room_name].spawns[spawn_index].dir.minedir[need]];	//It goes to a source initially.
					//This one needs temporary instructions to get to a source. Then it loops between the source and the controller upgrader on its own.
					options.memory.movenow = Memory.rooms[room_name].sources[need].mclean.u;
					//options.memory.movenow.pop();
					break;
				}
				case 'builder':
				{
					options.memory.direction = Memory.rooms[room_name].sources[need].minedir2;
					options.memory.path = 0;
					options.memory.target =
					{
						x: Memory.rooms[room_name].sources[need].mine.slice(-1)[0].x,
						y: Memory.rooms[room_name].sources[need].mine.slice(-1)[0].y
					};
					options.memory.dtarget = {};
					if (Memory.rooms[room_name].sources[need].defpaths && Memory.rooms[room_name].sources[need].defpaths[Memory.rooms[room_name].defense.need])
					{
						options.memory.dtarget.x = Memory.rooms[room_name].sources[need].defpaths[Memory.rooms[room_name].defense.need].slice(-1)[0].x;
						options.memory.dtarget.y = Memory.rooms[room_name].sources[need].defpaths[Memory.rooms[room_name].defense.need].slice(-1)[0].y;
					}
					options.memory.utrip = false;	//This breaks movement if we try to be clever by starting it as true.
					options.memory.dtrip = false;
					options.memory.destination = false;
					options.memory.need = Memory.rooms[room_name].defense.need;
					direction = [Memory.rooms[room_name].spawns[spawn_index].dir.minedir[need]];	//It goes to a source.
					//This one needs temporary instructions to get to a source. Then it loops between the source, the controller upgrader, and the defense builder on its own.
					options.memory.movenow = Memory.rooms[room_name].sources[need].mclean.b;
					//options.memory.movenow.pop();
					break;
				}
				case 'dbuilder':
				{
					//We should go to a different defense every time we spawn.
					//Only go to unsafe ones though.
					let defense = Memory.rooms[room_name].defense;
					let exits = Memory.rooms[room_name].exits
					for (defense.need++; defense.need <= exits.length; defense.need++)
					{
						if (defense.need === exits.length)
						{
							defense.need = 0;
						}

						//We've found an unsafe exit.
						if (!defense.safe[defense.need])
						{
							break;
						}
					}

					//Figure out which path is shortest.
					let shortest = Infinity;
					let shortestchosen = 0;
					for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
					{
						let test = Memory.rooms[room_name].sources[i].mlength + Memory.rooms[room_name].sources[i].dlength[Memory.rooms[room_name].defense.need];
						if (test < shortest)
						{
							shortestchosen = i;
							shortest = test;
							//console.log("Shortest Found: " + shortestchosen);
						}
					}

					//Now deploy onto that path.
					options.memory.repair = body[role](Game.rooms[room_name].energyAvailable).reduce(calculate.reduceManyWork, 0);
					options.memory.t = 0;
					options.memory.direction = Memory.rooms[room_name].sources[shortestchosen].minedir2;
					options.memory.path = 4;
					//options.memory.movenow = Memory.rooms[room_name].sources[shortestchosen].mine.concat(Memory.rooms[room_name].sources[shortestchosen].defpaths[Memory.rooms[room_name].defense.need]);
					options.memory.target = {};
					options.memory.dtarget = {};
					if (Memory.rooms[room_name].sources[shortestchosen].defpaths && Memory.rooms[room_name].sources[shortestchosen].defpaths[defense.need])
					{
						options.memory.target.x = Memory.rooms[room_name].sources[shortestchosen].defpaths[defense.need].slice(-1)[0].x;
						options.memory.target.y = Memory.rooms[room_name].sources[shortestchosen].defpaths[defense.need].slice(-1)[0].y;
						options.memory.dtarget.x = options.memory.target.x;
						options.memory.dtarget.y = options.memory.target.y;
					}
					options.memory.movenow = Memory.rooms[room_name].sources[shortestchosen].mclean.d[defense.need];
					options.memory.dtrip = true;
					options.memory.need = defense.need;
					options.memory.s = shortestchosen;
					direction = [Memory.rooms[room_name].spawns[spawn_index].dir.minedir[shortestchosen]];	//It goes to a source initially.

					//When we build a new dbuilder, our builders need their dtarget updated.
					for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
					{
						for (let b = 0; b < Memory.rooms[room_name].sources[i].creeps.builder.length; b++)
						{
							Memory.creeps[Memory.rooms[room_name].sources[i].creeps.builder[b]].dtarget.x = Memory.rooms[room_name].sources[i].defpaths[defense.need].slice(-1)[0].x;
							Memory.creeps[Memory.rooms[room_name].sources[i].creeps.builder[b]].dtarget.y = Memory.rooms[room_name].sources[i].defpaths[defense.need].slice(-1)[0].y;
						}
					}
				}
			}

			//Assign the direction into our options to be passed to the spawner.
			options.directions = direction;

			//Sort the extensions and spawners for efficient energy usage. Don't do this if there are extension construction sites.
			if (myextensions.length === Memory.rooms[room_name].sources.reduce(calculate.sourcereducer.idealextensions, 0))
			{
				options.energyStructures = calculate.sortExtensions(room_name);
			}

			//Build what's needed.
			console.log('Building ' + name + '.');

			//Options are defined before the direction switch so we can assign our transport targets too.
			//If there are no construction sites, our builder should be a minbuilder, but still considered a builder in all other ways.
			//console.log(JSON.stringify(body[[role, 'minbuilder'][+(role === 'builder' && Game.rooms[room_name].find(FIND_MY_CONSTRUCTION_SITES).length === 0)]](Game.rooms[room_name].energyAvailable)));
			switch (spawn.spawnCreep(body[[role, 'minbuilder'][+(role === 'builder' && Game.rooms[room_name].find(FIND_MY_CONSTRUCTION_SITES).length === 0)]](Game.rooms[room_name].energyAvailable), name, options))
			{
				case OK:
				{
					if (need !== '')
					{
						Memory.rooms[room_name].sources[need].creeps[role].push(name);
					}
					else
					{
						Memory.rooms[room_name].creeps[role].push(name);
					}
					break;
				}
				case ERR_NOT_ENOUGH_ENERGY:
				{
					console.log('Not Enough Energy.');
					//We probably got here due to an edge case where the room is out of energy but the third spawn (which we're not using) has some energy.
					//So try again without the restraint on energy sources.
					delete options.energyStructures;
					console.log(spawn.spawnCreep(body[[role, 'minbuilder'][+(role === 'builder' && Game.rooms[room_name].find(FIND_MY_CONSTRUCTION_SITES).length === 0)]](Game.rooms[room_name].energyAvailable), name, options));
					console.log(room_name + ' ' + role + ' ' + Game.rooms[room_name].energyAvailable);
					console.log(JSON.stringify(body[[role, 'minbuilder'][+(role === 'builder' && Game.rooms[room_name].find(FIND_MY_CONSTRUCTION_SITES).length === 0)]](Game.rooms[room_name].energyAvailable)));
					break;
				}
				case ERR_NOT_OWNER:
				{
					console.log('You Are Not The Owner.');
					break
				}
				case ERR_INVALID_ARGS:
				{
					console.log('Invalid Arguments.');
					break
				}
				case ERR_NAME_EXISTS:
				{
					console.log('Name Exists.');
					break
				}
				case ERR_BUSY:
				{
					console.log('Busy.');
					break
				}
				case ERR_RCL_NOT_ENOUGH:
				{
					console.log('RCL Not High Enough.');
					break
				}
				default:
				{
					console.log('Error building creep.');
				}
			}
		}

		return true; //We made it this far without any errors.
	},

	anticipate:
	{
		checkCreeps: undefined,
		checkPaths: undefined,
		lifeTest: undefined
	},

	buildExtensions: function(room_name)
	{
		if (room_name)
		{
			let epos;
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				for (let e = 0; e < Memory.rooms[room_name].sources[i].ideal.extensions; e++)
				{
					epos = Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].sources[i].buildings.extensions[e].x, Memory.rooms[room_name].sources[i].buildings.extensions[e].y);
					if (epos.lookFor(LOOK_CONSTRUCTION_SITES).length == 0 && epos.lookFor(LOOK_STRUCTURES).reduce(calculate.structreducer.extensions, 0) == 0)
					{
						//console.log("Roads: " + epos.lookFor(LOOK_CONSTRUCTION_SITES).length + ". Extensions: " + epos.lookFor(LOOK_STRUCTURES).reduce(calculate.structreducer.extensions, 0));
						//Game.rooms[room_name].visual.circle(epos, {fill: "red", radius: 0.25});
						Game.rooms[room_name].createConstructionSite(epos, STRUCTURE_EXTENSION);
					}
				}
			}
		}
		else
		{
			for (let room_name in Memory.rooms)
			{
				builder.buildExtensions(room_name);
			}
		}

		return true;
	},
	deleteExtensions: function()
	{
		for (let room_name in Memory.rooms)
		{
			let sites = Game.rooms[room_name].find(FIND_MY_CONSTRUCTION_SITES);
			for (let e = 0; e < sites.length; e++)
			{
				sites[e].remove();
			}
		}
	},

	newSpawn: function(room_name = false, a = 0)
	{
		let room_spawns;
		let name = undefined;
		if (room_name)	//Adding more spawns to the room will use this.
		{
			//Which index room are we in?
			let r = 0;
			for (let which_room in Memory.rooms)
			{
				if (which_room === room_name)
				{
					break;
				}
				else
				{
					r++;
				}
			}

			//Assign the appropriate spawn name for our room.
			room_spawns = Game.rooms[room_name].find(FIND_MY_SPAWNS);

			name = builder.newSpawn.basename + (1 + (r * 3) + room_spawns.length);
		}
		else	//Claim uses this.
		{
			name = builder.newSpawn.basename + (1 + ((Object.keys(Memory.rooms).length + a) * 3));
		}
		console.log('Spawn named ' + name);
		return name;
	},

	metAnyGoal: false
};

builder.anticipate.checkCreeps = function(room_name)
{
	if(body === undefined)
	{
		body = require('body');
	}

	let temp = {roles: {}, costs: {}, sources: []};
	let pathlengths = builder.anticipate.checkPaths(room_name);

	//Get room-wide roles and calculate replacement time.
	for (let role in Memory.rooms[room_name].creeps)
	{
		temp.roles[role] = [];
		temp.costs[role] = [];
		if (Memory.rooms[room_name].creeps[role].length > 0)
		{
			for (let r = 0; r < Memory.rooms[room_name].creeps[role].length; r++)
			{
				temp.roles[role].push(Memory.rooms[room_name].creeps[role][r]);
				temp.costs[role].push((body[role](calculate.maximumEnergy(room_name)).length * 3) + pathlengths[role]);
			}
		}
	}

	//Get the source-based roles and calculate replacement time.
	for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
	{
		temp.sources[i] = {roles: {}, costs: {}};
		for (let role in Memory.rooms[room_name].sources[i].creeps)
		{
			temp.sources[i].roles[role] = [];
			temp.sources[i].costs[role] = [];
			if (Memory.rooms[room_name].sources[i].creeps[role].length > 0)
			{
				for (let r = 0; r < Memory.rooms[room_name].sources[i].creeps[role].length; r++)
				{
					temp.sources[i].roles[role].push(Memory.rooms[room_name].sources[i].creeps[role][r]);
					temp.sources[i].costs[role].push((body[[role, 'minbuilder'][+(role === 'builder' && Game.rooms[room_name].find(FIND_MY_CONSTRUCTION_SITES).length === 0)]](calculate.maximumEnergy(room_name)).length * 3)
						+ pathlengths.sources[i][role]);
				}
			}
		}
	}

	//Now we determine which creeps need to be replaced soon.
	let need = {};
	let found = false;

	for (let role in temp.roles)
	{
		need[role] = 0;
		if (builder.anticipate.lifeTest(temp.roles[role], temp.costs[role]))
		{
			need[role]++;
			found = true;
		}
		/*if (need[role])
		{
			console.log(role + ": " + need[role]);
		}*/
	}

	need.sources = [];
	for (let i = 0; i < temp.sources.length; i++)
	{
		need.sources[i] = {};
		for (let role in temp.sources[i].roles)
		{
			need.sources[i][role] = 0;
			if (builder.anticipate.lifeTest(temp.sources[i].roles[role], temp.sources[i].costs[role]))
			{
				need.sources[i][role]++;
				found = true;
			}
			//console.log(role + ": " + JSON.stringify(need.sources[i]));
		}
	}

	if (found)
	{
		console.log(JSON.stringify(need));
	}
	return need;
};

builder.anticipate.checkPaths = function(room_name)
{
	//We are providing the length from spawn to initial destination for each role, for use by checkCreeps.
	//We can make assumptions about our roles here. Though we'll still be agnostic of our sources like usual.

	//Room-wide roles first.
	let pathlengths = {upgrader: Memory.rooms[room_name].upgrade.length, sources: []};

	//Source-based roles next.
	for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
	{
		let templength = Memory.rooms[room_name].sources[i].mine.length;
		pathlengths.sources[i] =
		{
			harvester: templength + 1,
			mtransport: templength,
			utransport: templength + Memory.rooms[room_name].sources[i].upgrade.length - 1,
			builder: templength
		};
	}

	//console.log(JSON.stringify(pathlengths));
	return pathlengths;
};

builder.anticipate.lifeTest = function(creep, cost)
{
	//console.log(creep + ": " + cost);
	return (Game.creeps[creep] && Game.creeps[creep].ticksToLive <= cost);
};

builder.newSpawn.basename = 'Amaroq';

module.exports = builder;