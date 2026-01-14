var roleExtractor =
{
	run: function(creep)
	{
		let extractor = Game.getObjectById(Memory.rooms[creep.room.name].mineral.eid);
		if (extractor && !extractor.cooldown)
		{
			//If it's not there yet, then it must be pulled. Our handler is probably dedicated to this.
			if(creep.harvest(Game.getObjectById(Memory.rooms[creep.room.name].mineral.id)) === ERR_NOT_IN_RANGE && Memory.rooms[creep.room.name].creeps.handler.length)
			{
				let puller = [];
				for (let p = 0, pcreep; p < Memory.rooms[creep.room.name].creeps.puller.length; p++)
				{
					pcreep = Game.creeps[Memory.rooms[creep.room.name].creeps.puller[p]];
					if (!pcreep.spawning)
					{
						puller.push(pcreep);
					}
				}

				puller = creep.pos.findInRange(puller, 1);

				if (puller.length)
				{
					creep.move(puller[0]);
				}
			}
		}

		return false;	//A mineral harvester will never be moved by the control module, since it needs to be pulled.
	}
};

module.exports = roleExtractor;