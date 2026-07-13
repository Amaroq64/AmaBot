var roleMTransport = 
{
	transport: require('role.transport'),

	calculate: require('calculate'),

	run: function(creep, s)
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
		roleMTransport.transport.withdraw(creep) || roleMTransport.transport.withdrawRuins(creep);
		
		//If we're at the source, we should decide which path to take.
		if (creep.pos.x === creep.memory.target.x && creep.pos.y === creep.memory.target.y)
		{
			let sneed = roleMTransport.calculate.extensionsNeedFilling(creep.room.name)[s];

			//If no extension needs to be filled, we wait.
			if (!sneed)
			{
				//If a creep wants to move onto us, we should back up for a tick.
				let mfat_in_memory = Memory.rooms[creep.room.name].sources[s].mfat[0];
				let creeps = Game.rooms[creep.room.name].find(FIND_MY_CREEPS, {filter: function(bcreep) {return creep.pos.isNearTo(bcreep) && (bcreep.pos.x !== creep.pos.x || bcreep.pos.y !== creep.pos.y)
					&& (bcreep.pos.x !== mfat_in_memory.x || bcreep.pos.y !== mfat_in_memory.y) && (bcreep.memory.direction === bcreep.pos.getDirectionTo(creep)
					|| (bcreep.memory._move && bcreep.memory._move.dest.x === creep.pos.x && bcreep.memory._move.dest.y === creep.pos.y));}});	//Ebuilders don't have a direction in their memory.
				if (creeps.length)
				{
					creep.move(roleMTransport.calculate.direction_opposite[creep.memory.direction]);
				}

				return false;
			}
			else if (sneed === 'mine')
			{
				//In order to travel along mreturn, we need to be flipped from ureturn. (If there is a ureturn.)
				//console.log('Mtransport ' + creep.room.name + ' ' + s + ' taking mine path.');
				if (Memory.rooms[creep.room.name].sources[s].ureturn[0])
				{
					creep.memory.path = 3;
				}
			}
			else	//sneed is 'upgrade' if we get here.
			{
				//In order to travel along upgrade, we need to be flipped from mine.
				//console.log('Mtransport ' + creep.room.name + ' ' + s + ' taking upgrade path.');
				creep.memory.path = 0;
			}
		}

		return true;
	}
};

module.exports = roleMTransport;