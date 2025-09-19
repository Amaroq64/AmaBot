var empire =
{
	room:
	{
		exitpaths: function(room_name = false)
		{
			if (!room_name)
			{
				for (let room_name in Memory.rooms)
				{
					empire.room.exitpaths(room_name);
				}
				return true;
			}

			//Save a path to each available neighboring room.
			let neighboring = Game.map.describeExits(room_name);
			let exitpaths = {};
			let exitreturn = {};

			for (let direction in neighboring)
			{
				let tempspawn = Game.rooms[room_name].find(FIND_MY_SPAWNS)[0];
				exitpaths[neighboring[direction]] = tempspawn.pos.findPathTo(new RoomPosition(25, 25, neighboring[direction]),
				{plainCost: 2, swampCost: 3, ignoreCreeps: true, ignoreDestructibleStructures: true,
					costCallback: function(roomName, costMatrix)
					{
						for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
						{
							//Prefer slightly to go over our existing paths, since there will be roads on them.
							let allpaths = Memory.rooms[room_name].sources[i].mine.concat(Memory.rooms[room_name].sources[i].mreturn,
								Memory.rooms[room_name].sources[i].upgrade, Memory.rooms[room_name].sources[i].ureturn);
							for (let n = 0; n < allpaths.length; n++)
							{
								costMatrix.set(allpaths[n].x, allpaths[n].y, 1);
							}

							costMatrix.set(Memory.rooms[room_name].sources[i].mfat[0].x, Memory.rooms[room_name].sources[i].mfat[0].y, 255);	//Make sure to go around the mining fatties.

							for (let e = 0; e < Memory.rooms[room_name].sources[i].buildings.extensions.length; e++)
							{
								costMatrix.set(Memory.rooms[room_name].sources[i].buildings.extensions[e].x, Memory.rooms[room_name].sources[i].buildings.extensions[e].y, 255)	//Make sure to go around extensions.
							}
						}

						//We don't need to use the room-wide upgrade path, that's only for the upgrader. But we should avoid its resting position.
						costMatrix.set(Memory.rooms[room_name].upgrade.slice(-1)[0].x, Memory.rooms[room_name].upgrade.slice(-1)[0].y, 255);

						if (Game.rooms[room_name].controller.level > 2)
						{
							//Make sure to go around towers.
							for (t = 0; Array.isArray(Memory.rooms[room_name].defense.towers) && t < Memory.rooms[room_name].defense.towers.length; t++)
							{
								costMatrix.set(Memory.rooms[room_name].defense.towers[t].x, Memory.rooms[room_name].defense.towers[t].y, 255);
							}
						}
					}
				});

				//Now return.
				exitreturn[neighboring[direction]] = Game.rooms[room_name].getPositionAt(exitpaths[neighboring[direction]].slice(-1)[0].x, exitpaths[neighboring[direction]].slice(-1)[0].y)
					.findPathTo(Game.rooms[room_name].getPositionAt(exitpaths[neighboring[direction]][0].x, exitpaths[neighboring[direction]][0].y),
					{plainCost: 5, swampCost: 5, ignoreCreeps: true, ignoreDestructibleStructures: true,
						costCallback: function(roomName, costMatrix)
						{
							//Return over the same path we came from.
							for (let n = 0; n < exitpaths[neighboring[direction]].length; n++)
							{
								costMatrix.set(exitpaths[neighboring[direction]][n].x, exitpaths[neighboring[direction]][n].y, 1);
							}
						}
					});
			}

			Memory.rooms[room_name].exitpaths = exitpaths;
			Memory.rooms[room_name].exitreturn = exitreturn;

			return true;	//We made it this far without any errors.
		},

		cleanexitpaths: function(room_name)
		{
			delete Memory.rooms[room_name].exitpaths;
			return true;
		}
	},

	check: function()
	{	
		if (!empire.roomactions)
		{
			empire.roomactions = require('claim').roomactions;
		}
		//If we have any pending room actions, check on them.
		for (let ra = 0; ra < empire.roomactions.length; ra++)
		{
			if (!empire.claim)
			{
				empire.claim = require('claim');
			}

			if (Array.isArray(Memory[empire.roomactions[ra]]))
			{
				for (let a = 0; a < Memory[empire.roomactions[ra]].length; a++)
				{
					if (typeof Memory[empire.roomactions[ra]][a].ideal !== "object")
					{
						//Initialize any that need it.
						//console.log(Memory[empire.roomactions[ra]][a] + " " + empire.roomactions[ra])
						empire.claim.init(Memory[empire.roomactions[ra]][a], empire.roomactions[ra]);
					}
					else
					{
						//Run each type of room action. These functions are each for a specific type, but they iterate every room action of their type.
						empire.claim[empire.roomactions[ra]]();
					}
				}
			}
		}

		//The first time we run this tick, we should also run build() and travel(), since they run on everything.
		empire.claim.build();
		empire.claim.travel();
	},

	cleanactions: function()
	{
		for (let ra = 0; ra < empire.roomactions.length; ra++)
		{
			if (!empire.claim)
			{
				empire.claim = require('claim');
			}

			if (Array.isArray(Memory[empire.roomactions[ra]]))
			{
				for (let a = 0; a < Memory[empire.roomactions[ra]].length; a++)
				{
					//Flag the action objects to be rebuilt.
					Memory[empire.roomactions[ra]][a].ideal = undefined;
				}
			}
		}
	},

	roomactions: undefined,

	claim: undefined,

	checkallies: function(target)
	{
		//If they aren't in our allies list, return true so we can attack them.
		return (target.owner && Memory.allies.indexOf(target.owner.username) == -1);
	},

	allowallies: function(creep)
	{
		//If they are in our allies list, return true so we can permit them.
		return (Memory.allies.indexOf(creep.owner.username) != -1);
	},
};

module.exports = empire;