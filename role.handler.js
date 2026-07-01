var calculate = require('calculate');

var roleHandler =
{
	repair: require('role.builder').repair,
	transport: require('role.transport'),

	builder: require('role.builder'),

	move: function(creep, role, source = false)
	{
		roleHandler.move = require('control').move;
		roleHandler.paths = require('control').paths;
		return roleHandler.move(creep, role, source);
	},

	turnAround: function(creep)
	{	//Toggle between 14 and 15.
		creep.memory.path ^= 1;

		//If there's not an appropriate tile there, switch directions manually.
		let tile = Memory.rooms[creep.room.name].path[creep.pos.x];
		if (!tile || !(tile = tile[creep.pos.y]) || !tile[roleHandler.paths[creep.memory.path]])
		{
			creep.memory.direction += 4;
			if (creep.memory.direction > 8)
			{
				creep.memory.direction -= 8;
			}
		}

		return true;
	},

	completeMission: function(creep, next = 0)
	{
		creep.memory.lmission.push(creep.memory.mission);
		creep.memory.mission = next;
		if (creep.memory.lmission.length > 3)
		{
			creep.memory.lmission.length = 3;	//This should be a good number for testing.
		}
		return roleHandler.missions[creep.memory.mission](creep);
	},

	missions:	//The missions must return true if the handler will move, and false if it won't.
	[
		//The first mission is to select a mission.
		function(creep)
		{
			
		},

		//The second mission is to tow the extractor.
		function(creep)
		{
			if (creep.fatigue)
			{
				return false;
			}

			let ext;
			if (Memory.rooms[creep.room.name].creeps.extractor.length)
			{
				ext = Game.creeps[Memory.rooms[creep.room.name].creeps.extractor[0]];	//There should only be one extractor.
			}
			else
			{
				//If there's no extractor, select a different mission.
				return roleHandler.completeMission(creep);
			}

			if (creep.pos.isNearTo(ext))
			{
				if (creep.memory.path === 15)
				{
					roleHandler.turnAround(creep);
				}

				let efat = Memory.rooms[creep.room.name].path[creep.pos.x];
				if (efat && efat[creep.pos.y] && efat[creep.pos.y].efat)
				{
					let minepos = Memory.rooms[creep.room.name].mine.miner;
					if (ext.pos.x === minepos.x && ext.pos.y === minepos.y)
					{
						//If we are here, our mission will be complete.
						creep.memory.lmission.push(creep.memory.mission);
						creep.memory.mission = 0;
						return true;
					}
					else
					{
						roleHandler.move(creep, 'extractor');

						creep.memory.direction += 4;
						if (creep.memory.direction > 8)
						{
							creep.memory.direction -= 8;
						}

						creep.pull(ext);
						return false;
					}
				}

				creep.pull(ext);
			}

			return true;
		},

		//The third mission is to move resources from one place to another.
		function(creep)
		{
			let targets = [];	//Track what's adjacent to us.
			let alltargets = {};	//Track what still needs to be moved to and from.

			for (let t = 0, mem, structure; t < roleHandler.exchange.tofrom.length; t++)
			{
				alltargets[roleHandler.exchange.tofrom[t]] = [];
				mem = creep.memory[roleHandler.exchange.tofrom[t]];
				if (typeof mem === 'object')
				{
					for (let x in mem)
					{
						for (let y in mem[x])
						{
							if ((structure = Game.getObjectById(mem[x][y])))
							{
								if (creep.pos.isNearTo(structure))
								{
									targets.push(structure);
								}

								if (!t)	//We're withdrawing from labs.
								{
									if (structure.store[structure.mineralType])	//This lab still has something to withdraw.
									{
										alltargets[roleHandler.exchange.tofrom[t]].push(structure);
									}
								}
								else	//We're depositing to labs.
								{
									if (structure.store.getFreeCapacity(creep.memory.what))	//This lab still has room for what we're delivering to it.
									{
										alltargets[roleHandler.exchange.tofrom[t]].push(structure);
									}
								}
							}
						}
					}
				}
				else if ((structure = Game.getObjectById(creep.memory[roleHandler.exchange.tofrom[t]])))
				{
					if (creep.pos.isNearTo(structure))
					{
						targets.push(structure);
					}

					if (!t)	//We're withdrawing from the target structure.
					{
						if (structure.structureType === STRUCTURE_CONTAINER)
						{
							if (structure.store.getUsedCapacity())	//We will always be trying to empty a container.
							{
								alltargets[roleHandler.exchange.tofrom[t]].push(structure);
							}
						}
					}
					else	//We're depositing to the target structure.
					{
						
					}
				}
				else if (roleHandler.types.has(creep.memory[roleHandler.exchange.tofrom[t]]))
				{
					//It's a structure type. Assume only one structure of this type. Get the structure.
					switch (creep.memory[roleHandler.exchange.tofrom[action]])
					{
						case STRUCTURE_SPAWN:	//The spawn in the lab stamp.
							structure = Game.getObjectById(Memory.rooms[creep.room.name].spawns[2].id);
							break;
						case STRUCTURE_STORAGE:
							structure = Game.getObjectById(Memory.rooms[creep.room.name].buildings.store.id);
							break;
						case STRUCTURE_POWER_SPAWN:
							structure = Game.getObjectById(Memory.rooms[creep.room.name].buildings.pspawn.id);
						default:
							structure = Game.getObjectById(Memory.rooms[creep.room.name].buildings[creep.memory[roleHandler.exchange.tofrom[action]]].id);
					}

					if (structure)
					{
						alltargets[roleHandler.exchange.tofrom[t]].push(structure);
						if (creep.pos.isNearTo(structure))
						{
							targets.push(structure);
						}

						if (!t)	//We're withdrawing from the target structure.
						{
							
						}
						else	//We're depositing to the target structure.
						{
							
						}
					}
				}
			}

			if ((creep.store.getFreeCapacity() && roleHandler.exchange(creep, 0) === OK) || creep.store.getUsedCapacity() && roleHandler.exchange(creep, 1) === OK)
			{
				//We're withdrawing or depositing this tick. See if we need to keep moving.
				if (targets.length > 1)
				{
					return false;
				}
				else
				{
					return true;
				}
			}
			else
			{
				//We didn't withdraw or deposit anything this tick. See if we still have this mission to complete.
				for (let tofrom in alltargets)
				{
					
				}
			}
		},

		//The third-to-last index mission is to build the lab stamp.
		function(creep)
		{
			
		},

		//The second-to-last index mission is to get unboosted. We'll probably only use this once.
		function(creep)
		{
			
		},

		//The last index mission is to get boosted. We'll probably only use this once.
		function(creep)
		{
			//First we need to get our boost. We need Keanium Hydride first, and Catalyzed Lemergium Acid optionally.
			if (!creep.store[RESOURCE_KEANIUM_HYDRIDE])
			{
				let terminal = Memory.rooms[creep.room.name].buildings.terminal;
				if (creep.pos.isNearTo(terminal.x, terminal.y))
				{
					terminal = Game.getObjectById(terminal.id);

					//If we have T3 building boost, why not use it?
					if (!creep.store[RESOURCE_CATALYZED_LEMERGIUM_ACID] && terminal.store[RESOURCE_CATALYZED_LEMERGIUM_ACID] >= 60)
					{
						creep.withdraw(terminal, RESOURCE_CATALYZED_LEMERGIUM_ACID, 60);	//Withdraw the catalyzed lemergium acid.
						return false;	//If we're withdrawing the optional resource, then we stay here to withdraw the main one we still need next tick.
					}
					else if (terminal.store[RESOURCE_KEANIUM_HYDRIDE] >= 900 && creep.withdraw(terminal, RESOURCE_KEANIUM_HYDRIDE, 900) === OK)	//Withdraw the keanium hydride.
					{
						if (creep.memory.path === 15)	//If we're going away from the labs, then turn around.
						{
							roleHandler.turnAround(creep);
						}

						if (Memory.rooms[creep.room.name].react.on)	//Turn off reactions while we get our boost ready.
						{
							Memory.rooms[creep.room.name].react.on = false;
						}

						return true;	//If we're going to withdraw the last resource we need, then keep moving.
					}
					else	//We reached the terminal, but none of our boosts are available.
					{
						//We won't be boosting then.
						return roleHandler.completeMission(creep);
					}
				}
				else
				{
					return true;	//Keep moving.
				}
			}
			else	//We have our move boost. We might also have a build boost.
			{
				//We need to find a lab we can boost with.
				let labs_found = [];
				for (let l = 0, lab, labs_in_memory = Memory.rooms[creep.room.name].mine.labs; l < labs_in_memory.length; l++)
				{
					lab = Game.getObjectById(labs_in_memory[l].id);
					if (lab && (!lab.mineralType || lab.store[lab.mineralType] <= creep.store.getFreeCapacity()))
					{
						labs_found.push(lab);
					}
				}

				//If we found a candidate that we have space for, see if we're close enough to use it.
				if (labs_found.length)
				{
					for (let l = 0, lboost = false, kboost = false; (!lboost || !kboost) && l < labs_found.length; l++)
					{
						if (creep.pos.isNearTo(labs_found[l].pos.x, labs_found[l].pos.y))
						{
							if (labs_found[l].mineralType === RESOURCE_CATALYZED_LEMERGIUM_ACID)
							{
								if (!lboost && labs_found[l].boostCreep(creep, creep.getActiveBodyparts(WORK)) === OK)
								{
									lboost = true;
								}
							}
							else if (labs_found[l].mineralType === RESOURCE_KEANIUM_HYDRIDE)
							{
								if (!kboost && labs_found[l].boostCreep(creep, creep.getActiveBodyparts(MOVE)) === OK)
								{
									kboost = true;
								}
							}
							else if (labs_found[l].mineralType)
							{
								creep.withdraw(labs_found[l], labs_found[l].mineralType);
								return false;
							}
							else if (creep.store[RESOURCE_CATALYZED_LEMERGIUM_ACID])
							{
								creep.transfer(labs_found[l], RESOURCE_CATALYZED_LEMERGIUM_ACID);
								return false;
							}
							else if (creep.store[RESOURCE_KEANIUM_HYDRIDE])
							{
								creep.transfer(labs_found[l], RESOURCE_KEANIUM_HYDRIDE);
								return false;
							}
						}
					}
				}
				else	//If there's no candidates, then we need to clear the labs.
				{
					creep.memory.from = {};
					creep.memory.to = STRUCTURE_TERMINAL;
					for (let l = 2, labs_in_memory = Memory.rooms[creep.room.name].mine.labs; l < labs_in_memory.length; l++)
					{
						calculate.mark_found(labs_in_memory[l].x, labs_in_memory[l].y, creep.memory.from, labs_in_memory[l].id);
					}

					return roleHandler.completeMission(creep, 3);
				}
			}
		}
	],

	exchange: function(creep, action = 0)	//Since the withdrawing and depositing code was turning out so similar, it can be combined.
	{
		let target;
		switch (typeof creep.memory[roleHandler.exchange.tofrom[action]])
		{
			case 'string':	//We either have a structureType or a structure id.
				if (roleHandler.types.has(creep.memory[roleHandler.exchange.tofrom[action]]))
				{
					//It's a structure type. Assume only one structure of this type. Get the structure.
					switch (creep.memory[roleHandler.exchange.tofrom[action]])
					{
						case STRUCTURE_SPAWN:	//The spawn in the lab stamp.
							target = Game.getObjectById(Memory.rooms[creep.room.name].spawns[2].id);
							break;
						case STRUCTURE_STORAGE:
							target = Game.getObjectById(Memory.rooms[creep.room.name].buildings.store.id);
							break;
						case STRUCTURE_POWER_SPAWN:
							target = Game.getObjectById(Memory.rooms[creep.room.name].buildings.pspawn.id);
						default:
							target = Game.getObjectById(Memory.rooms[creep.room.name].buildings[creep.memory[roleHandler.exchange.tofrom[action]]].id);
					}
				}
				else
				{
					//It's an id.
					target = Game.getObjectById(creep.memory[roleHandler.exchange.tofrom[action]]);
				}

				if (target && creep.pos.isNearTo(target))
				{
					let status;
					if (creep.memory.what)
					{
						if (creep.memory.amount === undefined || ((!action && creep.memory.amount <= target.store[creep.memory.what]) || (action && creep.memory.amount <= target.store.getFreeCapacity())))
						{
							status = creep[roleHandler.exchange.action[action]](target, creep.memory.what, creep.memory.amount);
						}
						else
						{
							status = creep[roleHandler.exchange.action[action]](target, creep.memory.what);
						}
					}
					else	//If we didn't specify, then take everything.
					{
						let keys = Object.keys(target.store);
						status = creep[roleHandler.exchange.action[action]](target, keys[0]);
					}

					return status;
				}

				break;
			case 'object':	//We probably have an [x][y].id set of positions. We probably only do this for labs.
				for (let x = -1, xt, yt; x < 2; x++)
				{
					xt = creep.pos.x + x;
					for (let y = -1; y < 2; y++)
					{
						yt = creep.pos.y + y;

						if (creep.memory[roleHandler.exchange.tofrom[action]][xt] && (target = creep.memory[roleHandler.exchange.tofrom[action]][xt][yt]) && (target = Game.getObjectById(target)))	//Assign within comparison.
						{
							//We would only remove minerals from a lab. But we can deposit minerals and energy into one.
							if ((!action && target.store[target.mineralType] && creep[roleHandler.exchange.action[action]](target, target.mineralType) === OK)
								|| (action && target.store.getFreeCapacity(creep.memory.what) && creep[roleHandler.exchange.action[action]](target, creep.memory.what) === OK))
							{
								//If we took an action this tick, then we're done.
								return OK;
							}
						}
					}
				}
		}

		//If we got this far, we found nothing adjacent to take action on.
		return ERR_NOT_IN_RANGE;
	},

	run: function(creep)
	{
		return roleHandler.missions[creep.memory.mission](creep);	//This creep will decide its own movement.
	},

	types: new Set([STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_LAB, STRUCTURE_FACTORY, STRUCTURE_NUKER, STRUCTURE_CONTAINER, STRUCTURE_POWER_SPAWN]),

	paths: ['mine', 'mreturn', 'upgrade', 'ureturn', 'defpaths', 'dreturn', 'patrol', 'preturn', 'exitpath', 'exitreturn', 'mfat', 'upgrader', 'labs', 'lreturn', 'epath', 'ereturn', 'efat']
};

roleHandler.exchange.action = ['withdraw', 'transfer'];
roleHandler.exchange.tofrom = ['from', 'to'];

module.exports = roleHandler;