var roleTransport =
{
	room_containers: undefined,
	room_energy: undefined,
	room_ruins: undefined,
	

	withdraw: function(creep)
	{
		//We can only pick up once per tick.

		//If we're by our target container, withdraw from it.
		//let tpos = creep.room.getPositionAt(creep.memory.target.x, creep.memory.target.y);
		let room_containers = creep.room.find(FIND_STRUCTURES,
		{
			filter: function(structure)
			{
				return (structure.structureType == STRUCTURE_CONTAINER || structure.structureType == STRUCTURE_STORAGE);
			}
		});

		let room_energy = creep.room.find(FIND_DROPPED_RESOURCES);

		for (let e = 0; e < room_containers.length; e++)
		{
			//Find the one we're by, but make sure it's not the upgrader container.
			if (creep.pos.inRangeTo(room_containers[e], 1) && !creep.pos.inRangeTo(creep.room.getPositionAt(Memory.rooms[creep.room.name].upgrade.slice(-1)[0].x, Memory.rooms[creep.room.name].upgrade.slice(-1)[0].y), 1))
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
				//If it's an mtransport, we withdraw unconditionally.
				//If it's a builder, we withdraw when there's construction sites.
				//Else we only withdraw if energy is full. This is achieved through short-circuit comparison.
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
		let room_ruins = creep.room.find(FIND_RUINS).concat(creep.room.find(FIND_TOMBSTONES).concat(creep.room.find(FIND_DROPPED_RESOURCES, {filter: function(resource) {return resource.resourceType == RESOURCE_ENERGY;}})));
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
			let room_targets = creep.room.lookForAt(LOOK_STRUCTURES, tpos) //Try to deposit into a structure.
			if(creep.transfer(room_targets[0], RESOURCE_ENERGY) == OK)
			{
				//console.log(creep.name + " is depositing at " + room_targets[0].pos.x + ", " + room_targets[0].pos.y + ".");
			}
			else
			{
				let room_targets = creep.room.lookForAt(LOOK_CREEPS, tpos) //Try to deposit into a creep.
				creep.transfer(room_targets[0], RESOURCE_ENERGY);
				//console.log("Depositing into a creep.");
			}
			roleTransport.acted = true;
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