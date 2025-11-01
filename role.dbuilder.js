var defender = require('defender');

var roleDBuilder =
{
	transport: require('role.transport'),

	builder: require('role.builder'),

	construct: function(creep)
	{
		//console.log("Constructing.");
		let sites;
		let test = false;

		sites = creep.room.find(FIND_CONSTRUCTION_SITES,	//Get ramparts.
		{
			filter: function(structure)
			{
				return ((structure.structureType == STRUCTURE_RAMPART));
			}
		})
		.concat(
			creep.room.find(FIND_CONSTRUCTION_SITES,	//Get the other construction sites.
			{
				filter: function(structure)
				{
					return ((structure.structureType == STRUCTURE_TOWER || structure.structureType == STRUCTURE_WALL));
				}
			})
		);

		if (sites.length == 0 && creep.room.lookForAt(LOOK_STRUCTURES, creep.pos).length == 0) //There's no sites in the room.
		{
			return false;
		}

		let farwalls = undefined;
		for (let c = 0; c < sites.length; c++)
		{
			if (creep.pos.inRangeTo(sites[c], 3) && creep.build(sites[c]) == OK)	//If we're near a site, build on one.
			{
				test = true;
				//If we built a rampart, we need to update it immediately so it can receive repairs.
				if (sites[c].structureType === STRUCTURE_RAMPART)
				{
					defender.ramparts[creep.room.name] = undefined;
					Memory.rooms[creep.room.name].defense.update = 2;
				}
				break;
			}
			else
			{
				//console.log("Range not 3.");
				//We only populate the position objects if we're checking for walls out of our range.
				if (!Array.isArray(farwalls))
				{
					farwalls = [];
					for (let f = 0; f < Memory.rooms[creep.room.name].defense.farwalls.length; f++)
					{
						farwalls.push(Game.rooms[creep.room.name].getPositionAt(Memory.rooms[creep.room.name].defense.farwalls[f].x, Memory.rooms[creep.room.name].defense.farwalls[f].y));
					}
					//console.log(JSON.stringify(farwalls));
				}

				//Test to see if we're dealing with a far wall.
				if (creep.pos.getRangeTo(sites[c]) > 3 && creep.pos.getRangeTo(sites[c]) < 6)
				{
					for (let f = 0; f < farwalls.length; f++)
					{
						if (sites[c].pos.isEqualTo(farwalls[f]))
						{
							//If we found one nearby, go to it, then come back from it.
							if (Memory.creeps[creep.name].movenow.length === 0 && Memory.creeps[creep.name].path != 4)
							{
								Memory.creeps[creep.name].movenow = creep.pos.findPathTo(sites[c].pos, {range: 3})
								Memory.creeps[creep.name].movenow = Memory.creeps[creep.name].movenow
									.concat(creep.room.findPath(creep.room.getPositionAt(Memory.creeps[creep.name].movenow.slice(-1)[0].x, Memory.creeps[creep.name].movenow.slice(-1)[0].y), creep.pos));
								//console.log(JSON.stringify(Memory.creeps[creep.name].movenow));
								let tdirection = Memory.creeps[creep.name].movenow[0].direction;
								Memory.creeps[creep.name].movenow = require('calculate').cleanthispath(Memory.creeps[creep.name].movenow, Memory.creeps[creep.name].movenow[0].direction);
								//	.concat({x: creep.pos.x, y: creep.pos.y, direction: creep.memory.direction}), Memory.creeps[creep.name].movenow[0]);
								//Memory.creeps[creep.name].movenow.push({x: creep.pos.x, y: creep.pos.y, direction: creep.memory.direction});
								//console.log(JSON.stringify(Memory.creeps[creep.name].movenow));
								Memory.creeps[creep.name].direction = tdirection;
								break;
							}
						}
					}
				}
			}
		}
		//console.log(test);
		return test;
	},

	repair: function(creep)
	{
		//console.log("Repairing.");
		//Get our structures that need to be repaired.
		/*let rstructures = creep.room.find(FIND_STRUCTURES,
		{
			filter: function(structure)
			{
				return (structure.structureType == STRUCTURE_RAMPART && structure.hits < structure.hitsMax);
			}
		}).concat(creep.room.find(FIND_STRUCTURES,
		{
			filter: function(structure)
			{
				return ((structure.structureType == STRUCTURE_TOWER || structure.structureType == STRUCTURE_WALL) && structure.hits < structure.hitsMax);
			}
		}));*/

		//Get repairable structures in range of the repairer.
		let rstructures = [];
		for (let x = -3; x < 4; x++)
		{
			for (let y = -3; y < 4; y++)
			{
				//Assign within comparison.
				if (defender.walls[creep.room.name] && defender.walls[creep.room.name][creep.pos.x + x] && defender.walls[creep.room.name][creep.pos.x + x][creep.pos.y + y] )
				{
					rstructures.push(Game.getObjectById(defender.walls[creep.room.name][creep.pos.x + x][creep.pos.y + y]));
				}
				else if(defender.ramparts[creep.room.name] && defender.ramparts[creep.room.name][creep.pos.x + x] && defender.ramparts[creep.room.name][creep.pos.x + x][creep.pos.y + y])
				{
					rstructures.push(Game.getObjectById(defender.ramparts[creep.room.name][creep.pos.x + x][creep.pos.y + y]));
				}
			}
		}

		//Now prioritize them.
		let chosen;
		let lowesthp = Infinity;
		let farwalls;
		for (let r = 0; r < rstructures.length; r++)
		{
			if (rstructures[r] && rstructures[r].hits < lowesthp && creep.pos.inRangeTo(rstructures[r], 3))
			{
				lowesthp = rstructures[r].hits;
				chosen = rstructures[r];
			}
		}

		if (creep.repair(chosen) == OK)
		{
			return true;	//We've performed our repair action for this tick.
		}
		
		return false;	//If we made it this far, there was nothing to repair.
	},

	deposit: function(creep)
	{
		//console.log("Depositing.");
		//Find towers that aren't full.
		let towers;
		let found = 0;
		let tlength = 0;

		//If we are defending more than one exit, we can't be picky about this or we'll never repair a wall again.
		for (let s = 0; s < Memory.rooms[creep.room.name].defense.safe.length; s++)
		{
			if (!Memory.rooms[creep.room.name].defense.safe[s])
			{
				found++;
			}
		}

		if (found <= 1)	//All towers are concentrated at this wall, therefore we can withhold energy to refill them.
		{
			towers = creep.room.find(FIND_MY_STRUCTURES,
			{
				filter: function(tower)
				{
					return (tower.structureType == STRUCTURE_TOWER && tower.store.getFreeCapacity(RESOURCE_ENERGY) >= 500);	//If a tower is more than half empty, we should fill it.
				}
			})
				.concat(creep.room.find(FIND_CONSTRUCTION_SITES,
			{
				filter: function(tower)
				{
					return (tower.structureType == STRUCTURE_WALL || tower.structureType == STRUCTURE_RAMPART || tower.structureType == STRUCTURE_TOWER);	//If a wall, rampart, or tower needs to be built, we should build it.
				}
			}));
			tlength = towers.length;	//This is the number of structures in the room that absolutely need to be serviced.
		}

		towers = creep.room.find(FIND_MY_STRUCTURES,
		{
			filter: function(tower)
			{
				return (tower.structureType == STRUCTURE_TOWER && tower.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
			}
		});

		//Now restock a tower if we're by it.
		towers = creep.pos.findInRange(towers, 1);
		if (towers.length != 0)
		{
			if (creep.transfer(towers[0], RESOURCE_ENERGY) == OK)	//We've deposited this tick.
			{
				if (creep.carry.energy <= towers[0].store.getFreeCapacity(RESOURCE_ENERGY))
				{
					//If depositing is going to empty us out, we should return.
					if (Memory.creeps[creep.name].path == 6)
					{
						Memory.creeps[creep.name].path = 7;
					}
					else if (Memory.creeps[creep.name].path == 7)
					{
						Memory.creeps[creep.name].path = 6;
					}
				}
				return true;
			}
		}
		else if (tlength)
		{
			//If we return true, it won't try to repair. We can use this to keep our towers filled with energy.
			return true;
		}
		else
		{
			return false;
		}
	},

	run: function(creep, s = false)
	{
		//Create roads wherever we go.
		/*if (Memory.creeps[creep.name].movenow.length == 0)
		{
			creep.room.createConstructionSite(creep.pos, STRUCTURE_ROAD);
		}*/
		
		//Flip, but only if we're not stuck under fatigue.
		if (roleDBuilder.transport.flip(creep))
		{
			if (roleDBuilder.transport.withdraw(creep))
			{
				//console.log("Withdrawing.");
				return true;	//If we withdrew, then move on.
			}
		}
		if (creep.carry.energy == 0)
		{
			//console.log("Withdrawing from ruins.");
			roleDBuilder.transport.withdrawRuins(creep);	//Clean up ruins.

			let tpos = creep.room.getPositionAt(creep.memory.dtarget.x, creep.memory.dtarget.y);
			if (creep.pos.isEqualTo(tpos.x, tpos.y))
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
			//console.log("Not Empty.");
			if (!(roleDBuilder.construct(creep) || roleDBuilder.deposit(creep)))
			{
				//console.log("Repairing.");
				roleDBuilder.repair(creep);
				return true;
			}
		}

		return true;
	}
};

module.exports = roleDBuilder;