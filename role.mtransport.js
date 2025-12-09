var roleMTransport = 
{
	transport: require('role.transport'),

	calculate: require('calculate'),

	run: function(creep)
	{

		//Deposit wherever we go.
		if (creep.carry.energy > 0)
		{

			let extensions = [];
			let room_extensions = roleMTransport.calculate.extensions[creep.room.name];	//The spawns have been included as extensions already.
			let nuke = roleMTransport.calculate.nuke[creep.room.name];
			let tempextension;
			//Find extensions that are near us.
			for (let x = -1; x <= 1; x++)
			{
				for (let y = -1; y <= 1; y++)
				{
					//Assignment within comparison.
					if (room_extensions && room_extensions[creep.pos.x + x] && (tempextension = room_extensions[creep.pos.x + x])
						&& tempextension[creep.pos.y + y] && (tempextension = tempextension[creep.pos.y + y])
						&& (tempextension = Game.getObjectById(tempextension)) && tempextension.store && tempextension.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
					{
						extensions.push(tempextension);
					}
				}
			}

			//Find our nuker if it's near us.
			if (creep.room.energyAvailable === creep.room.energyCapacityAvailable && nuke && Math.max(Math.abs(creep.pos.x - nuke.x), Math.abs(creep.pos.y - nuke.y)) === 1)
			{
				extensions.push(Game.getObjectById(nuke.id));
			}

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

module.exports = roleMTransport;