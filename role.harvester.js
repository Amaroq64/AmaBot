var roleHarvester =
{
	run: function(creep, s)
	{
		if(creep.harvest(Game.getObjectById(Memory.rooms[creep.room.name].sources[s].id)) === ERR_NOT_IN_RANGE)
		{
			return true;	//We need to move to the source.
		}
		else
		{
			return false;	//We don't need to move ever again.
		}
	}
};

module.exports = roleHarvester;