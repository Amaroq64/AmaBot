var empire =
{
	/*costMatrix: {},

	setCostMatrix: function(x, y, roomName, value)
	{
		if (!empire.costMatrix[x])
		{
			empire.costMatrix[x] = {};
		}

		empire.costMatrix[x][y] = {roomName: roomName, value: value};
	},
	
	empireTest: function()
	{
		for (let room_name in Memory.rooms)
		{
			for (let x in empire.costMatrix)
			{
				for (let y in empire.costMatrix[x])
				{
					let hex = empire.costMatrix[x][y].value.toString(16);
					//console.log(x + ', ' + y);
					//console.log(empire.costMatrix[x][y].roomName);
					Game.rooms[room_name].visual.circle(Number(x), Number(y), {fill: '#' + hex + '0000', radius: 0.5});
				}
			}
		}
	},*/

	room:
	{
		exitpaths: function(room_name = false, again = false)
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
			let exitend;
			let exitrange;

			for (let direction in neighboring)
			{
				//If we already have that room, we should connect to the end of its path.
				if (Memory.rooms[neighboring[direction]])
				{
					exitend = new RoomPosition(
						Memory.rooms[neighboring[direction]].exitpaths[room_name].slice(-1)[0].x,
						Memory.rooms[neighboring[direction]].exitpaths[room_name].slice(-1)[0].x,
						neighboring[direction]);
					exitrange = 0;
				}
				else
				{
					exitend = new RoomPosition(25, 25, neighboring[direction]);
					exitrange = 24;
				}

				let tempspawn = Game.rooms[room_name].find(FIND_MY_SPAWNS)[0];
				exitpaths[neighboring[direction]] = tempspawn.pos.findPathTo(exitend,
				{plainCost: 2, swampCost: 3, ignoreRoads: true, ignoreCreeps: true, ignoreDestructibleStructures: true, range: exitrange,
					costCallback: function(roomName, costMatrix)
					{
						if (room_name === roomName)
						{
							//If we're going again, prefer the existing path.
							if (again && exitpaths[neighboring[direction]])
							{
								for (let re = 0; re < exitpaths[neighboring[direction]].length; re++)
								{
									costMatrix.set(exitpaths[neighboring[direction]][re].x, exitpaths[neighboring[direction]][re].y, 1);
								}
							}

							for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
							{
								//Prefer slightly to go over our existing paths, since there will be roads on them.
								let allpaths = Memory.rooms[room_name].sources[i].mine.concat(Memory.rooms[room_name].sources[i].mreturn,
									Memory.rooms[room_name].sources[i].upgrade, Memory.rooms[room_name].sources[i].ureturn);
								for (let n = 0; n < allpaths.length; n++)
								{
									costMatrix.set(allpaths[n].x, allpaths[n].y, 1);
									//empire.setCostMatrix(allpaths[n].x, allpaths[n].y, roomName, 1);
								}

								//Make sure to go around the mining fatties.
								costMatrix.set(Memory.rooms[room_name].sources[i].mfat[0].x, Memory.rooms[room_name].sources[i].mfat[0].y, 255);

								//We're generating this before the extensions now. But we can still take them into account afterward.
								if (again)
								{
									for (let e = 0; e < Memory.rooms[room_name].sources[i].buildings.extensions.length; e++)
									{
										costMatrix.set(Memory.rooms[room_name].sources[i].buildings.extensions[e].x, Memory.rooms[room_name].sources[i].buildings.extensions[e].y, 255);	//Make sure to go around extensions.
										//empire.setCostMatrix(Memory.rooms[room_name].sources[i].buildings.extensions[e].x, Memory.rooms[room_name].sources[i].buildings.extensions[e].y, roomName, 255);
									}
								}
							}

							//We don't need to use the room-wide upgrade path, that's only for the upgrader. But we should avoid its resting position.
							costMatrix.set(Memory.rooms[room_name].upgrade.slice(-1)[0].x, Memory.rooms[room_name].upgrade.slice(-1)[0].y, 255);
							//empire.setCostMatrix(Memory.rooms[room_name].upgrade.slice(-1)[0].x, Memory.rooms[room_name].upgrade.slice(-1)[0].y, roomName, 255);

							//We're generating this before the towers and lab stamp. But we can still take them into account afterward.
							if (again && Memory.rooms[room_name].defense && Memory.rooms[room_name].defense.towers)
							{
								//Make sure to go around towers.
								for (t = 0; Array.isArray(Memory.rooms[room_name].defense.towers) && t < Memory.rooms[room_name].defense.towers.length; t++)
								{
									costMatrix.set(Memory.rooms[room_name].defense.towers[t].x, Memory.rooms[room_name].defense.towers[t].y, 255);
									//empire.setCostMatrix(Memory.rooms[room_name].defense.towers[t].x, Memory.rooms[room_name].defense.towers[t].y, roomName, 255);
								}

								//Make sure to go around the dbuilder's resting position.
								for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
								{
									for (let dp = 0; dp < Memory.rooms[room_name].sources[i].defpaths.length; dp++)
									{
										if (Memory.rooms[room_name].sources[i].defpaths[dp])
										{
											//Avoid the dbuilder's resting position, but still go through it if there's no other way.
											costMatrix.set(Memory.rooms[room_name].sources[i].defpaths[dp].slice(-1)[0].x, Memory.rooms[room_name].sources[i].defpaths[dp].slice(-1)[0].y, 40);
										}
									}
								}

								//Make sure to go around the labs.
								for (let la = 0; la < Memory.rooms[room_name].mine.labs.length; la++)
								{
									costMatrix.set(Memory.rooms[room_name].mine.labs[la].x, Memory.rooms[room_name].mine.labs[la].y, 255);
								}

								//Make sure to go around the spawns.
								for (let sp = 0; sp < Memory.rooms[room_name].spawns.length; sp++)
								{
									costMatrix.set(Memory.rooms[room_name].spawns[sp].x, Memory.rooms[room_name].spawns[sp].y, 255);
								}

								//Make sure to go around the rest of our lab stamp.
								costMatrix.set(Memory.rooms[room_name].mine.miner.x, Memory.rooms[room_name].mine.miner.y, 255);
								costMatrix.set(Memory.rooms[room_name].mine.handler.x, Memory.rooms[room_name].mine.handler.y, 255);
								costMatrix.set(Memory.rooms[room_name].buildings.store.x, Memory.rooms[room_name].buildings.store.y, 255);
								costMatrix.set(Memory.rooms[room_name].buildings.terminal.x, Memory.rooms[room_name].buildings.terminal.y, 255);
							}

							//Hook in our blocked spawn positions.
							for (sb = 0; sb < Memory.rooms[room_name].spawnsblocked.length; sb++)
							{
								costMatrix.set(Memory.rooms[room_name].spawnsblocked[sb].x, Memory.rooms[room_name].spawnsblocked[sb].y, 255);
							}
						}
					}
				});

				//Run our spawn blocker based on the generated path.
				require('init').run.spawn.block(Memory.rooms[room_name].spawnsmarked, Memory.rooms[room_name].spawnsblocked, Memory.rooms[room_name].spawns[0], exitpaths[neighboring[direction]], Memory.rooms[room_name].spawns[1]);

				//Now return.
				exitreturn[neighboring[direction]] = Game.rooms[room_name].getPositionAt(exitpaths[neighboring[direction]].slice(-1)[0].x, exitpaths[neighboring[direction]].slice(-1)[0].y)
					.findPathTo(Game.rooms[room_name].getPositionAt(exitpaths[neighboring[direction]][0].x, exitpaths[neighboring[direction]][0].y),
					{plainCost: 5, swampCost: 5, ignoreRoads: true, ignoreCreeps: true, ignoreDestructibleStructures: true,
						costCallback: function(roomName, costMatrix)
						{
							//Return over the same path we came from.
							for (let n = 0; n < exitpaths[neighboring[direction]].length; n++)
							{
								costMatrix.set(exitpaths[neighboring[direction]][n].x, exitpaths[neighboring[direction]][n].y, 1);
							}

							//Hook in our blocked spawn positions.
							for (sb = 0; sb < Memory.rooms[room_name].spawnsblocked.length; sb++)
							{
								costMatrix.set(Memory.rooms[room_name].spawnsblocked[sb].x, Memory.rooms[room_name].spawnsblocked[sb].y, 255);
							}
						}
					});
			}

			//console.log(JSON.stringify(exitpaths));
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
				for (let a = 0; Memory[empire.roomactions[ra]] && a < Memory[empire.roomactions[ra]].length; a++)
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
						empire.claim.build(empire.roomactions[ra]);
					}
				}
			}
		}

		//The first time we run this tick, we should also run build() and travel(), since they run on everything.
		//empire.claim.build();
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
		return (target.owner && Memory.allies && Memory.allies.indexOf(target.owner.username) === -1);
	},

	allowallies: function(creep)
	{
		//If they are in our allies list, return true so we can permit them.
		return (Memory.allies && Memory.allies.indexOf(creep.owner.username) !== -1);
	},

	allies: []
};

module.exports = empire;