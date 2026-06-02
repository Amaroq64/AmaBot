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

	missions:	//The missions must return true if the handler will move, and false if it won't.
	[
		//The first mission is to select a mission.
		function(creep)
		{
			
		},

		//The second mission is to tow the extractor.
		function(creep)
		{
			
		},

		//The third mission is to move resources from one place to another
		function(creep)
		{
			switch (typeof creep.memory.from)
			{
				let target;
				case 'string':	//We either have a structureType or a structure id.
					if ((target = Game.getObjectById(creep.memory.from)))	//Assign within comparison.
					{
						//It's an id.
					}
					else if (roleHandler.types.has(creep.memory.from))
					{
						//It's a structure type.
					}
				
					break;
				case 'object':	//We probably have an [x][y] set of positions. We probably only do this for labs.
					if (creep.store.getFreeCapacity())
					{
						for (let x = -1, xt, yt; x < 2; x++)
						{
							xt = creep.pos.x + x;
							for (let y = -1; y < 2; y++)
							{
								yt = creep.pos.y + y;

								if (creep.memory.from[xt] && (target = creep.memory.from[xt][yt]) && (target = Game.getObjectById(target)))	//Assign within comparison.
								{
									//We would only remove minerals from a lab.
									if (target.store[target.mineralType] && creep.withdraw(target, target.mineralType) === OK)	//Assign within comparison.
									{
										//If we withdrew this tick, then we're done.
										return true;
									}
								}
							}
						}
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
						creep.memory.lmission.push(creep.memory.mission);
						creep.memory.mission = 0;
						return roleHandler.missions[creep.memory.mission](creep);
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

					creep.memory.lmission.push(creep.memory.mission);
					creep.memory.mission = 3;
					return roleHandler.missions[creep.memory.mission](creep);
				}
			}
		}
	],

	run: function(creep)
	{
		return roleHandler.missions[creep.memory.mission](creep);	//This creep will decide its own movement.
	},

	types: new Set([STRUCTURE_SPAWN, STRUCTURE_STORAGE, STRUCTURE_TERMINAL, STRUCTURE_LAB, STRUCTURE_FACTORY, STRUCTURE_NUKER, STRUCTURE_CONTAINER, STRUCTURE_POWER_SPAWN]),

	paths: ['mine', 'mreturn', 'upgrade', 'ureturn', 'defpaths', 'dreturn', 'patrol', 'preturn', 'exitpath', 'exitreturn', 'mfat', 'upgrader', 'labs', 'lreturn', 'epath', 'ereturn']
};

module.exports = roleHandler;