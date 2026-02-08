var roleTransport =
{
	room_containers: {},
	room_energy: {},
	room_ruins: {},
	energy_tested: {},
	ruins_tested: {},

	withdraw: function(creep)
	{
		//We can only pick up once per tick.
		//If we're by our target container, withdraw from it.

		//Since there are very few containers we will need to consider, we will just get them explicitly.
		let room_containers = roleTransport.room_containers[creep.room.name];
		if (room_containers.length === 0)	//Populate the containers for the first time this tick.
		{
			//The old code that used a find to get all containers would magically allow dbuilders to withdraw from a container placed by their resting point.
			//Now that we are specifying containers, they won't magically withdraw from defensive containers anymore.

			let u_container = Game.getObjectById(Memory.rooms[creep.room.name].buildings.upgradecontainer.id);
			if (u_container)
			{
				room_containers.push(u_container);
			}

			for (let s = 0, s_container; s < Memory.rooms[creep.room.name].sources.length; s++)
			{
				//If we have a hybrid, avoid getting the same container twice. Although probably nothing bad would happen if we did.
				if (Memory.rooms[creep.room.name].sources[s].buildings.miningcontainer.id !== Memory.rooms[creep.room.name].buildings.upgradecontainer.id && (s_container = Game.getObjectById(Memory.rooms[creep.room.name].sources[s].buildings.miningcontainer.id)))
				{
					room_containers.push(s_container);
				}
			}
		}

		let room_energy = roleTransport.room_energy[creep.room.name];
		if (!roleTransport.energy_tested[creep.room.name])	//Populate the dropped energy for the first time this tick.
		{
			room_energy = creep.room.find(FIND_DROPPED_RESOURCES, {filter: {resourceType: RESOURCE_ENERGY}});
			roleTransport.energy_tested[creep.room.name] = true;
		}

		for (let e = 0; e < room_containers.length; e++)
		{
			//Find the one we're by. Make sure it's not the upgrader container.
			if (creep.pos.inRangeTo(room_containers[e], 1)
				&& ((!Memory.rooms[creep.room.name].ideal.upgrader && creep.name.indexOf('Utransport') === -1)	//If we have no upgrader, we have a hybrid.
				|| !creep.pos.inRangeTo(creep.room.getPositionAt(Memory.rooms[creep.room.name].upgrade.slice(-1)[0].x, Memory.rooms[creep.room.name].upgrade.slice(-1)[0].y), 1)))
			{
				//If we're by a full source container, we need to not leave thousands of energy on the ground.
				for (let ee = 0; ee < room_energy.length; ee++)
				{
					if (creep.pos.inRangeTo(room_energy[ee].pos, 1) && room_energy[ee].amount > room_containers[e].store.getUsedCapacity(RESOURCE_ENERGY))
					{
						creep.pickup(room_energy[ee]);
						//console.log("We picked up energy off the ground.");
						roleTransport.acted = true;
						return true;	//We got our energy. Move on.
					}
				}

				//We were theorizing about withdrawing only on certain conditions, but we're not going to do that. Just withdraw no matter what.
				if(/*(creep.name.indexOf("Mtransport") != -1 || (creep.name.indexOf("Mtransport") == -1 && creep.room.energyAvailable == creep.room.energyCapacityAvailable)
					|| (creep.name.indexOf("Builder") != -1 && creep.room.find(FIND_CONSTRUCTION_SITES).length > 0))
					&&*/ creep.withdraw(room_containers[e], RESOURCE_ENERGY) == OK)
				{
					//console.log(creep.name + ": Getting energy from target container " + room_containers[e].pos.x + ", " + room_containers[e].pos.y + ".");
					roleTransport.acted = true;
					return true;	//We got our energy. Move on.
				}
			}
		}

		//If we're by energy, pick it up.
		for (let e = 0; e < room_energy.length; e++)
		{
			if (creep.pos.inRangeTo(room_energy[e].pos, 1))
			{
				creep.pickup(room_energy[e]);
				//console.log("We picked up energy off the ground.");
				roleTransport.acted = true;
				return true;	//We got our energy. Move on.
			}
		}

		//console.log(creep.name + " No withdraw checks passed.");
		return false;	//Normally our action returns would determine whether to move or not. But we won't be directly returning them anymore.
	},

	withdrawRuins: function(creep)
	{
		let room_ruins = roleTransport.room_ruins[creep.room.name];
		if (!roleTransport.ruins_tested[creep.room.name])	//Populate the dropped resources for the first time this tick.
		{
			room_ruins = creep.room.find(FIND_RUINS).concat(creep.room.find(FIND_TOMBSTONES).concat(creep.room.find(FIND_DROPPED_RESOURCES, {filter: {resourceType: RESOURCE_ENERGY}})));
			roleTransport.ruins_tested[creep.room.name] = true;
		}

		for (let r = 0; r < room_ruins.length; r++)
		{
			if (creep.pos.inRangeTo(room_ruins[r].pos, 1) && (creep.pickup(room_ruins[r]) == OK || creep.withdraw(room_ruins[r], RESOURCE_ENERGY) == OK))
			{
				//console.log("We picked up energy off the ground.");
				roleTransport.acted = true;
				return true;	//We got our energy. Move on.
			}
			/*else if (creep.name.indexOf("Dbuilder") != -1 && creep.memory.destination && ((typeof room_ruins[r].resourceType === "string" && room_ruins[r].resourceType == RESOURCE_ENERGY) ||
				(typeof room_ruins[r].store === "object" && room_ruins[r].store.getUsedCapacity(RESOURCE_ENERGY) > 0)) && creep.pos.getRangeTo(room_ruins[r].pos) <= 5)
			{
				Memory.creeps[creep.name].movenow = creep.pos.findPathTo(room_ruins[r], {range: 1,
				costCallback: function(roomName, costMatrix)
				{
					for (let e = 0; e < Memory.rooms[creep.room.name].exits.length; e++)
					{
						//console.log(JSON.stringify(Memory.rooms[creep.room.name].exits[e]));
						for (let t = 0; t < Memory.rooms[creep.room.name].exits[e].length; t++)
						{
							//Don't accidentally move onto an exit tile.
							costMatrix.set(Memory.rooms[creep.room.name].exits[e][t].x, Memory.rooms[creep.room.name].exits[e][t].y, 255);
						}
					}
				}});
				Memory.creeps[creep.name].direction = Memory.creeps[creep.name].movenow[1].direction;
				Memory.creeps[creep.name].movenow = require('calculate').cleanpaths(Memory.creeps[creep.name].movenow);
			}*/
		}
	},

	deposit: function(creep)
	{
		//If we're at our target receiver, deposit to it.
		let tpos;
		if (creep.memory.dtrip)
		{
			tpos = creep.room.getPositionAt(creep.memory.dtarget.x, creep.memory.dtarget.y);
		}
		else
		{
			tpos = creep.room.getPositionAt(creep.memory.target.x, creep.memory.target.y);
		}
		//console.log("Our deposit target is " + tpos.x + ", " + tpos.y);

		if (creep.pos.inRangeTo(tpos, 1) && creep.carry.energy > 0)
		{
			let room_targets = creep.room.lookForAt(LOOK_CREEPS, tpos, {filter: function(tcreep) {return tcreep.store.getFreeCapacity(RESOURCE_ENERGY) >= creep.store.getUsedCapacity(RESOURCE_ENERGY)}}); //Try to deposit into a creep.

			if(creep.transfer(room_targets[0], RESOURCE_ENERGY) === OK)
			{
				//console.log(creep.name + " is depositing at " + room_targets[0].pos.x + ", " + room_targets[0].pos.y + ".");
			}
			else if (creep.transfer(creep.room.lookForAt(LOOK_STRUCTURES, tpos)[0], RESOURCE_ENERGY) !== OK)	//Try to deposit into a structure.
			{
				room_targets = creep.room.lookForAt(LOOK_CREEPS, tpos) //Try to deposit into a creep.
				creep.transfer(room_targets[0], RESOURCE_ENERGY);
				//console.log("Depositing into a creep.");
			}
			roleTransport.acted = true;
			if (creep.memory.dtrip)
			{
				//If we deposited to our dbuilder, we go back.
				//dbuilders use their own deposit function, so we don't have to worry about this path switch bleeding over.
				Memory.creeps[creep.name].path = 5;
			}
			return true;	//Traffic clogs up if we try to wait until we're empty.
		}

		//console.log("No deposit checks passed.");
		return false;	//Normally our action returns would determine whether to move or not. But we won't be directly returning them anymore.
	},

	flip: function(creep)
	{
		//Flip, but only if we're not stuck under fatigue.
		if (creep.fatigue == 0 && creep.pos.x == Memory.creeps[creep.name].target.x && creep.pos.y == Memory.creeps[creep.name].target.y)
		{
			return true;	//We're probably moving this all to control.

			/*if (Memory.creeps[creep.name].dtrip)
			{
				//If we're returning from the builder, flip back.
				if (creep.store.getUsedCapacity() == 0)
				{
					//return false;
				}
				Memory.creeps[creep.name].dtrip = false;
			}
			if (creep.room.energyAvailable < creep.room.energyCapacityAvailable)
			{
				//Flip utrip if we've come back to the source. This only occurs if extensions need filling.
				Memory.creeps[creep.name].utrip = !Memory.creeps[creep.name].utrip;
			}
			if (creep.name.indexOf("Builder") != -1 && !Memory.creeps[creep.name].utrip && Memory.rooms[creep.room.name].creeps.dbuilder.length > 0 && !Game.creeps[Memory.rooms[creep.room.name].creeps.dbuilder[0]].spawning)
			{
				//If we're a builder and the builder exists, visit the builder.
				Memory.creeps[creep.name].dtrip = true;
				//When we decide to visit the builder, record which exit to visit.
				Memory.creeps[creep.name].need = Memory.rooms[creep.room.name].defense.need;
			}
			//We don't need a check for dbuilders because their need is decided when they're built.

			return true;*/
		}
	},

	acted: false,

	run: function(creep)
	{
		roleTransport.acted = false;

		if (!roleTransport.acted)
		{
			roleTransport.withdrawRuins(creep);
		}
		if (!roleTransport.acted)
		{
			roleTransport.withdraw(creep);
		}
		if (!roleTransport.acted)
		{
			roleTransport.deposit(creep);
		}
		return true;
	}
};

module.exports = roleTransport;