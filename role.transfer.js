var roleTransfer =
{
	run: function(creep)
	{
		//This creep will just dumbly move resources.
		if (creep.store.getUsedCapacity() === 0)
		{
			//Get it from the lab.
			let lab = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {filter: function(structure) {return structure.structureType === STRUCTURE_LAB && structure.store.getUsedCapacity(RESOURCE_GHODIUM) >= 500;}});
			if (lab.length)
			{
				if (creep.withdraw(lab[0], RESOURCE_GHODIUM, 1500) === ERR_NOT_ENOUGH_RESOURCES)
				{
					creep.withdraw(lab[0], RESOURCE_GHODIUM);
				}
			}
			else if (creep.room.name === 'E48S14')
			{
				creep.moveTo(24, 20, {ignoreCreeps: true, reusePath: 0});
			}
			else if (creep.room.name === 'E49S15')
			{
				creep.moveTo(18, 28, {ignoreCreeps: true, reusePath: 0});
			}

			//Get it from the terminal.
			if (creep.room.name === 'E48S14')
			{
				if (Game.getObjectById('691df96d13223f94217c4600').store.getUsedCapacity(RESOURCE_ZYNTHIUM_KEANITE) <= 1500)
				{
					if (creep.withdraw(creep.room.terminal, RESOURCE_ZYNTHIUM_KEANITE, 1500) === ERR_NOT_ENOUGH_RESOURCES)
					{
						creep.withdraw(creep.room.terminal, RESOURCE_ZYNTHIUM_KEANITE);
					}
				}
				else if (Game.getObjectById('691ddaa59fbea602ac255a96').store.getUsedCapacity(RESOURCE_UTRIUM_LEMERGITE) <= 1500)
				{
					if (creep.withdraw(creep.room.terminal, RESOURCE_UTRIUM_LEMERGITE, 1500) === ERR_NOT_ENOUGH_RESOURCES)
					{
						creep.withdraw(creep.room.terminal, RESOURCE_UTRIUM_LEMERGITE);
					}
				}
			}
			else if (creep.room.name === 'E49S15')
			{
				if (Game.getObjectById('691e15ca2144a3de5af2e962').store.getUsedCapacity(RESOURCE_ZYNTHIUM_KEANITE) <= 1500)
				{
					if (creep.withdraw(creep.room.terminal, RESOURCE_ZYNTHIUM_KEANITE, 1500) === ERR_NOT_ENOUGH_RESOURCES)
					{
						creep.withdraw(creep.room.terminal, RESOURCE_ZYNTHIUM_KEANITE);
					}
				}
				else if (Game.getObjectById('691d7ecdd966ad7ce0329cf2').store.getUsedCapacity(RESOURCE_UTRIUM_LEMERGITE) <= 1500)
				{
					if (creep.withdraw(creep.room.terminal, RESOURCE_UTRIUM_LEMERGITE, 1500) === ERR_NOT_ENOUGH_RESOURCES)
					{
						creep.withdraw(creep.room.terminal, RESOURCE_UTRIUM_LEMERGITE);
					}
				}
			}
		}
		else if (creep.store.getUsedCapacity(RESOURCE_GHODIUM) > 0)
		{
			//Transfer it to the nuker.
			let nuke = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {filter: {structureType: STRUCTURE_NUKER}});
			if (nuke.length)
			{
				nuke = nuke[0];
				creep.transfer(nuke, Object.keys(creep.store)[0]);
			}
			else if (creep.room.name === 'E48S14')
			{
				creep.moveTo(22, 19, {ignoreCreeps: true, reusePath: 0});
			}
			else if (creep.room.name === 'E49S15')
			{
				creep.moveTo(17, 27, {ignoreCreeps: true, reusePath: 0});
			}
		}
		else if (creep.room.name === 'E48S14')
		{
			let in_store = Object.keys(creep.store)[0];
			if (in_store === RESOURCE_ZYNTHIUM_KEANITE || in_store === RESOURCE_UTRIUM_LEMERGITE)
			{
				if (creep.pos.x !== 25 || creep.pos.y !== 21)
				{
					creep.moveTo(25, 21, {ignoreCreeps: true, reusePath: 0});
				}
				else if (in_store === RESOURCE_ZYNTHIUM_KEANITE)
				{
					creep.transfer(Game.getObjectById('691df96d13223f94217c4600'), in_store);
				}
				else if (in_store === RESOURCE_UTRIUM_LEMERGITE)
				{
					creep.transfer(Game.getObjectById('691ddaa59fbea602ac255a96'), in_store);
				}
			}
			else if (in_store === RESOURCE_GHODIUM)
			{
				if (creep.pos.x !== 22 || creep.pos.y !== 19)
				{
					creep.moveTo(22, 19, {ignoreCreeps: true, reusePath: 2});
				}
				else
				{
					creep.transfer(Game.getObjectById('691c697e634aec35b9945082'), in_store);
				}
			}
		}
		else if (creep.room.name === 'E49S15')
		{
			let in_store = Object.keys(creep.store)[0];
			if (in_store === RESOURCE_ZYNTHIUM_KEANITE || in_store === RESOURCE_UTRIUM_LEMERGITE)
			{
				if (creep.pos.x !== 16 || creep.pos.y !== 28)
				{
					creep.moveTo(16, 28, {ignoreCreeps: true, reusePath: 2});
				}
				else if (in_store === RESOURCE_ZYNTHIUM_KEANITE)
				{
					creep.transfer(Game.getObjectById('691e15ca2144a3de5af2e962'), in_store);
				}
				else if (in_store === RESOURCE_UTRIUM_LEMERGITE)
				{
					creep.transfer(Game.getObjectById('691d7ecdd966ad7ce0329cf2'), in_store);
				}
			}
			else if (in_store === RESOURCE_GHODIUM)
			{
				if (creep.pos.x !== 17 || creep.pos.y !== 27)
				{
					creep.moveTo(17, 27, {ignoreCreeps: true, reusePath: 0});
				}
				else
				{
					creep.transfer(Game.getObjectById('6919354318022e2ed6e3972a'), in_store);
				}
			}
		}

		/*if (creep.pos.x === 18 && creep.pos.y === 29)
		{
			creep.move(TOP);
		}
		else
		{
			creep.move(BOTTOM);
		}*/
		return false;
	}
};

module.exports = roleTransfer;