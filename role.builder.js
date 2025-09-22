var roleBuilder =
{
	transport: require('role.transport'),

	construct: function(creep)
	{
		let sites;
		let test = false;	//We're not directly returning this function to determine whether we move. So it's a check for success now.

		sites = creep.room.find(FIND_CONSTRUCTION_SITES);	//Get all construction sites.

		if (sites.length == 0 && creep.room.lookForAt(LOOK_STRUCTURES, creep.pos).length == 0) //There's no sites in the room.
		{
			return false;
		}

		for (let c = 0; c < sites.length; c++)
		{
			if (creep.pos.inRangeTo(sites[c], 3) && creep.build(sites[c]) == OK)	//If we're near a site, build on one.
			{
				test = true;
				break;
			}
		}
		//console.log(test);
		return test;
	},

	repair: function(creep)
	{
		//Get our structures that need to be repaired.
		let rstructures = creep.room.find(FIND_STRUCTURES,
		{
			filter: function(structure)
			{
				//Repair roads when they're missing 100. Repair everything else if it's not at max.
				return ((structure.structureType == STRUCTURE_ROAD && structure.hitsMax - structure.hits > 99) || (structure.structureType != STRUCTURE_ROAD && structure.hits < structure.hitsMax
					&& ((structure.structureType != STRUCTURE_WALL && creep.name.indexOf("Builder") != -1) || (structure.structureType == STRUCTURE_WALL && creep.name.indexOf("Dbuilder") != -1))));	//Only Dbuilders should repair walls.
			}
		});

		for (let r = 0; r < rstructures.length; r++)
		{
			if (creep.pos.inRangeTo(rstructures[r], 3) && creep.repair(rstructures[r]) == OK)
			{
				return true;	//We've performed our repair action for this tick.
			}
		}
		
		return false;	//If we made it this far, there was nothing to repair.
	},

	flip: undefined,

	run: function(creep, s = false)
	{
		//Create roads wherever we go.
		if (Memory.creeps[creep.name].movenow.length == 0)
		{
			creep.room.createConstructionSite(creep.pos, STRUCTURE_ROAD);
		}
		
		//Flip, but only if we're not stuck under fatigue.
		if (roleBuilder.flip(creep))
		{
			if (roleBuilder.transport.withdraw(creep))
			{
				return true;	//If we withdrew, then move on.
			}
		}
		if (creep.carry.energy == 0)
		{
			roleBuilder.transport.withdrawRuins(creep);	//Clean up ruins.

			//If we're on the way but we run out, we should go back.
			if (Memory.creeps[creep.name].dtrip && !Memory.creeps[creep.name].return)
			{
				Memory.creeps[creep.name].return = true;
			}

			return true;
		}
		else
		{
			//We should prioritize repairing so everything doesn't fall apart when we're constructing.
			//if ((Memory.creeps[creep.name].dtrip && roleBuilder.transport.deposit(creep)) || roleBuilder.construct(creep) || roleBuilder.repair(creep))
			if ((Memory.creeps[creep.name].dtrip && roleBuilder.transport.deposit(creep)) || roleBuilder.repair(creep) || roleBuilder.construct(creep))
			{
				return true;
			}
		}

		return true;
	}
};

roleBuilder.flip = roleBuilder.transport.flip;

module.exports = roleBuilder;