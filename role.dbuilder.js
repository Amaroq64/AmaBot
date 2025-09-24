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
				//console.log("Range 3.");
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
				if (creep.pos.getRangeTo(sites[c]) == 4)
				{
					for (let f = 0; f < farwalls.length; f++)
					{
						if (sites[c].pos.isEqualTo(farwalls[f]))
						{
							//If we found one nearby, go to it, then come back from it.
							if (Memory.creeps[creep.name].movenow.length == 0)
							{
								Memory.creeps[creep.name].movenow = creep.pos.findPathTo(sites[c].pos, {range: 3});
								Memory.creeps[creep.name].movenow.concat(creep.room.findPath(creep.room.getPositionAt(Memory.creeps[creep.name].movenow.slice(-1)[0].x, Memory.creeps[creep.name].movenow.slice(-1)[0].y), creep.pos));
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
		let rstructures = creep.room.find(FIND_STRUCTURES,
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
		}));

		//Now prioritize them.
		let chosen;
		//let command;
		let lowesthp = Infinity;
		let farwalls;
		for (let r = 0; r < rstructures.length; r++)
		{
			if (rstructures[r].hits < lowesthp && creep.pos.inRangeTo(rstructures[r], 3))
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

		if (found > 1)	//We've found two or more exits that are being defended, therefore we shouldn't withhold energy from our walls in this room.
		{
			towers = creep.room.find(FIND_MY_STRUCTURES,
			{
				filter: function(tower)
				{
					return (tower.structureType == STRUCTURE_TOWER && tower.store.getFreeCapacity(RESOURCE_ENERGY) >= 500);	//If a tower is more than half empty, we should fill it.
				}
			});
			tlength = towers.length;	//This is the number of towers in the room that absolutely need energy.
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
					Memory.creeps[creep.name].return = !Memory.creeps[creep.name].return;
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