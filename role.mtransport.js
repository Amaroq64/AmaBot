var roleMTransport = 
{
	transport: require('role.transport'),

	flip: undefined,

	run: function(creep)
	{
		//Flip, but only if we're not stuck under fatigue.
		if (roleMTransport.flip(creep))
		{
			if (roleMTransport.transport.withdraw(creep) || roleMTransport.transport.withdrawRuins(creep))
			{
				//console.log(creep.name + " flipping.");
				return true;	//If we withdrew, then move on.
			}
		}

		//Deposit wherever we go.
		if (creep.carry.energy > 0)
		{
			//We're taking the spawn as an extensions so the code can be agnostic of the particulars.
			let extensions = creep.room.find(FIND_MY_STRUCTURES,
			{
				filter: function(structure)
				{
					//console.log((structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
					return ((structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_SPAWN) && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);	//Find extensions that need energy.
				}
			});

			//Only iterate the extensions that are near us.
			extensions = creep.pos.findInRange(extensions, 1);

			for (let e = 0; e < extensions.length; e++)
			{
				//If we're near an extension, deposit to it.
				if (creep.transfer(extensions[e], RESOURCE_ENERGY) == OK)	//We've deposited this tick.
				{
					//If there's more than one extension that needs energy, and we still have energy to give, we stay here.
					//Since depositing is only registering an intention to deposit, we need to check whether we will deposit all of our energy.
					if (extensions.length > 1 && extensions[e].store.getFreeCapacity(RESOURCE_ENERGY) < creep.carry.energy)
					{
						return false;
					}
					else
					{
						return true;	//That was the last one, move on from here.
					}
				}
			}
		}

		//Run normal transport stuff if we've got no extensions to deposit to.
		 roleMTransport.transport.withdrawRuins(creep) || roleMTransport.transport.withdraw(creep);

		return true;
	}
};

roleMTransport.flip = roleMTransport.transport.flip;

module.exports = roleMTransport;