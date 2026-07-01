var roleEBuilder =
{
	transport: require('role.transport'),
	bfilter: require('role.custodian').buildfilter,

	run: function(creep, s)
	{
		//We only exist to build the extensions.
		let sites = Game.rooms[creep.room.name].find(FIND_MY_CONSTRUCTION_SITES, {filter: function(site) {return site.structureType === STRUCTURE_EXTENSION}});
		let mfat_in_memory = Memory.rooms[creep.room.name].sources[s].mfat[0];
		let clevel = Game.rooms[creep.room.name].controller.level;

		//If we have all our extensions built, do the containers too.
		if (!sites.length)
		{
			sites = Game.rooms[creep.room.name].find(FIND_MY_CONSTRUCTION_SITES, {filter: function(site) {return site.structureType === STRUCTURE_CONTAINER
				&& site.pos.x === mfat_in_memory.x && site.pos.y === mfat_in_memory.y}});	//Only build our own container.

			if (!sites.length && clevel >= 4)
			{
				sites = Game.rooms[creep.room.name].find(FIND_MY_CONSTRUCTION_SITES, {filter: roleEBuilder.bfilter});
			}
		}

		//Prevent a traffic jam.
		let creeps = Game.rooms[creep.room.name].find(FIND_MY_CREEPS, {filter: function(bcreep) {return creep.pos.isNearTo(bcreep) && (bcreep.pos.x !== creep.pos.x || bcreep.pos.y !== creep.pos.y)
			&& (bcreep.pos.x !== mfat_in_memory.x || bcreep.pos.y !== mfat_in_memory.y);}});
		if (creeps.length && creeps[0].memory.direction === creeps[0].pos.getDirectionTo(creep))
		{
			creep.move(creeps[0]);
		}

		if (sites.length)
		{
			//Work on the closest one.
			sites = creep.pos.findClosestByPath(sites);

			if (creep.store.energy)
			{
				if (creep.build(sites) !== OK)
				{
					creep.moveTo(sites, {range: 3});
				}
			}

			if (creep.store.energy <= creep.getActiveBodyparts(WORK) * 5)
			{
				let target = creep.memory.target
				if (creep.pos.isEqualTo(target.x, target.y))
				{
					let bcreep;
					let harv_in_memory = Memory.rooms[creep.room.name].sources[s].creeps.harvester;
					if (harv_in_memory === undefined)
					{
						harv_in_memory = Memory.rooms[creep.room.name].sources[s].creeps.hybrid;
					}

					let dropped_energy = Game.rooms[creep.room.name].find(FIND_DROPPED_RESOURCES, {filter:  function(energy) {return energy.resourceType === RESOURCE_ENERGY && creep.pos.isNearTo(energy)}});
					if (dropped_energy.length)
					{
						dropped_energy = dropped_energy[0];
					}
					else
					{
						dropped_energy = false;
					}
					if (harv_in_memory.length)
					{
						bcreep = Game.creeps[harv_in_memory[0]];
					}

					let container;
					if (bcreep && bcreep.store && bcreep.store.energy && (!((container = Game.getObjectById(Memory.rooms[creep.room.name].sources[s].buildings.miningcontainer.id)) && container.store && !dropped_energy)	//Make sure it's not a construction site.
						|| (container && (bcreep.store.energy > container.store.energy) || bcreep.store.energy > dropped_energy.amount)))
					{
						bcreep.transfer(creep, RESOURCE_ENERGY);
					}
					else
					{
						roleEBuilder.transport.withdraw(creep);
					}
				}
				else
				{
					creep.moveTo(target.x, target.y);
				}
			}
		}
		else if (clevel < 8)
		{
			//If there's nothing to build, we aren't needed anymore.
			Memory.rooms[creep.room.name].sources[s].ideal.ebuilder = 0;
			Memory.rooms[creep.room.name].sources[s].ideal.builder = 1;
			creep.suicide();
		}
		else
		{
			//If there's nothing to build, we aren't needed anymore.
			Memory.rooms[creep.room.name].sources[s].ideal.ebuilder = undefined;
			Memory.rooms[creep.room.name].sources[s].creeps.ebuilder = undefined;
			creep.suicide();
		}

		return false;
	},
};

module.exports = roleEBuilder;