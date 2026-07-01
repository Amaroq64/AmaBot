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
				let handler = [];
				for (let p = 0, pcreep; p < Memory.rooms[creep.room.name].creeps.handler.length; p++)
				{
					pcreep = Game.creeps[Memory.rooms[creep.room.name].creeps.handler[p]];
					if (!pcreep.spawning)
					{
						handler.push(pcreep);
					}
				}

				handler = creep.pos.findInRange(handler, 1);

				if (handler.length)
				{
					creep.move(handler[0]);
				}
			}
		}

		return false;	//A mineral harvester will never be moved by the control module, since it needs to be pulled.
	}
};

module.exports = roleExtractor;