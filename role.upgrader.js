var roleUpgrader =
{
	run: function(creep)
	{
		if (creep.carry.energy == 0)
		{
			if (creep.pickup(creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1)[0]) != OK)	//We're picking up off the ground first.
			{
				creep.withdraw(creep.pos.lookFor(LOOK_STRUCTURES)[0], RESOURCE_ENERGY);	//This should be the container.
			}
		}

		if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE || !creep.pos.isEqualTo(Memory.rooms[creep.room.name].upgrade.slice(-1)[0].x, Memory.rooms[creep.room.name].upgrade.slice(-1)[0].y))
		{
			return true;	//We need to move to the source.
		}
		else
		{
			return false;	//We don't need to move ever again.
		}
	}
};

module.exports = roleUpgrader;