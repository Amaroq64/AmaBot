//Run this after placing first spawner:
//require('init').run();
//Run this first when testing.
//require('init').clean();
//This sets up any room we've placed a spawner in that didn't have a spawner the last time this was ran.

var calculate = require('calculate');

var init =
{
	run: function()
	{

		//Initialize memory if we're starting anew.
		if (Memory.rooms == undefined)
		{
			//console.log('Rooms undefined.');
			Memory.rooms = {};
			Memory.creeps = {};
			//Memory.totalCreeps = 0;
		}

		//For every spawn, add its room to memory if it's not already there.
        for (let spawn in Game.spawns)
		{
			let room_name = Game.spawns[spawn].room.name;

			if (Memory.rooms[room_name] === undefined)	//This room is new.
			{
				Memory.rooms[room_name] = {};
				Memory.rooms[room_name].sources = [];
				Memory.rooms[room_name].creeps = {upgrader: [], dbuilder: []};	//We don't need an upgrade builder because the source builders patrol to it.
				Memory.rooms[room_name].buildings = {upgradecontainer: []};
				Memory.rooms[room_name].ideal = {};
				Memory.rooms[room_name].goals = {level: 2};
				//Memory.rooms[room_name].structures = {};

				//Since this room is new, find its energy sources.
				let sources = Game.rooms[room_name].find(FIND_SOURCES);
				let len = sources.length

				//Record the found sources.
				//Strip everything but id and position.
				//Ready source to contain creep names and ideal entity numbers.
				for (let i = 0; i < len; i++)
				{
					//Current entities start at zero. Ideal entity amounts will be populated by roomPlanner.
					Memory.rooms[room_name].sources[i] = {id: sources[i].id, pos: sources[i].pos, creeps: {harvester: [], mtransport: [], utransport: [], builder: []}, buildings: {miningcontainer: [], extensions: []}, ideal: {}};
				}

				//Move sources to end of array until the closest one is [0].
				let closest = Game.spawns[spawn].pos.findClosestByPath(FIND_SOURCES, {ignoreCreeps: true}).id;
				while (closest != Memory.rooms[room_name].sources[0].id)
				{
					Memory.rooms[room_name].sources.push(Memory.rooms[room_name].sources.shift());
				}

				//Build the path from spawn to controller so a fatty can get into position.
				Memory.rooms[room_name].upgrade = Game.rooms[room_name].findPath(Game.spawns[spawn].pos, Game.rooms[room_name].controller.pos,
					{plainCost: 1, swampCost: 2, range: 3, ignoreCreeps: true});

				//Record our upgrader container.
				Memory.rooms[room_name].buildings.upgradecontainer =
				{
					x: Memory.rooms[room_name].upgrade[Memory.rooms[room_name].upgrade.length - 1].x,
					y: Memory.rooms[room_name].upgrade[Memory.rooms[room_name].upgrade.length - 1].y
				};

				let temp = [];

				//Save the direction from the spawner to the start of this path.
				Memory.rooms[room_name].upgradedir = Game.spawns[spawn].pos.getDirectionTo(Memory.rooms[room_name].upgrade[0].x, Memory.rooms[room_name].upgrade[0].y);

				//For each source, build an optimal mining path.
				for(let i = 0; i < len; i++)
				{
					temp[i] = {};
					let tempPos;
					let tempPos2;
					//From spawn to source. Extra space away from source to account for fatty miner.
					temp[i].mine = Game.rooms[room_name].findPath(Game.spawns[spawn].pos, Memory.rooms[room_name].sources[i].pos,
						{plainCost: 1 + i, swampCost: 2 + i, range: 2, ignoreCreeps: true, maxRooms: 1,	//We want our second path to slightly prefer going over the first.
							costCallback: function(roomName, costMatrix)
							{
								if (i == 1)
								{
									let templen = temp[i - 1].mine.length;
									for (let n = 0; n < templen; n++)
									{
										costMatrix.set(temp[i - 1].mine[n].x, temp[i - 1].mine[n].y, 1); //Prefer the previous path slightly.
									}
									costMatrix.set(Memory.rooms[room_name].sources[i -1].mfat[0].x, Memory.rooms[room_name].sources[i -1].mfat[0].y, 255); //Make sure to go around the previous mining fatty.
								}

								costMatrix.set(Game.spawns[spawn].pos.x, Game.spawns[spawn].pos.y, 255)	//Make sure to go around our spawn.
								costMatrix.set(Memory.rooms[room_name].upgrade.slice(-1)[0].x, Memory.rooms[room_name].upgrade.slice(-1)[0].y, 255); //Make sure to go around the upgrading fatty.

									return costMatrix;
							}
						});

					//Save the direction from the spawner to the start of this path.
					temp[i].minedir = Game.spawns[spawn].pos.getDirectionTo(temp[i].mine[0].x, temp[i].mine[0].y);

					//To go back to spawn, we really go from final mining position to initial mining position.
					tempPos = Game.rooms[room_name].getPositionAt(temp[i].mine.slice(-1)[0].x, temp[i].mine.slice(-1)[0].y);
					tempPos2 = Game.rooms[room_name].getPositionAt(temp[i].mine[0].x, temp[i].mine[0].y);

					//Here, we go back.
					for (let p = 0; p < 2; p++)	//Generate this twice, so we can make space in-between for more extensions.
					{
						temp[i].mreturn = Game.rooms[room_name].findPath(tempPos, tempPos2,
							{plainCost: 1 + i, swampCost: 2 + i, range: 0, ignoreCreeps: true, maxRooms: 1,	//We want our second return path to slightly prefer going over the first.
								costCallback: function(roomName, costMatrix)
								{
									//Go down the first generated path and make space around it.
									if (p == 1)
									{
										for (let n = 1; n < temp[i].mreturn.length - 1; n++)
										{
											for (let x = -1; x < 2; x++)
											{
												for (let y = -1; y < 2; y++)
												{
													//Don't accidentally lower the cost of walls.
													if (Game.rooms[room_name].getTerrain().get(temp[i].mreturn[n].x + x, temp[i].mreturn[n].y + y) != TERRAIN_MASK_WALL)
													{
														costMatrix.set(temp[i].mreturn[n].x + x, temp[i].mreturn[n].y + y, 10)	//Make room for extensions.
													}
												}
											}
										}
									}

									//Avoid backtracking on the way back.
									let templen = temp[i].mine.length;
									for (let n = 0; n < templen; n++)
									{
										costMatrix.set(temp[i].mine[n].x, temp[i].mine[n].y, 10); //Unless absolutely necessary.

										if (i ==1)
										{
											for (let n = 0; n < temp[i - 1].mreturn.length; n++)
											{
												costMatrix.set(Memory.rooms[room_name].sources[i - 1].mreturn[n].x, Memory.rooms[room_name].sources[i - 1].mreturn[n].y, 1); //Here we prefer returning over the first return path.
											}
											costMatrix.set(Memory.rooms[room_name].sources[i - 1].mfat[0].x, Memory.rooms[room_name].sources[i - 1].mfat[0].y, 255); //Make sure to go around the previous mining fatty.
										}

										costMatrix.set(Game.spawns[spawn].pos.x, Game.spawns[spawn].pos.y, 255);	//Make sure to go around our spawn.
										costMatrix.set(Memory.rooms[room_name].upgrade.slice(-1)[0].x, Memory.rooms[room_name].upgrade.slice(-1)[0].y, 255); //Make sure to go around the upgrading fatty.
									}

									return costMatrix;
								}
							});
					}

					//Get the path from end of path to source, for generics and fatties.
					temp[i].mfat = Game.rooms[room_name].findPath(tempPos, Memory.rooms[room_name].sources[i].pos,
						{plainCost: 1, swampCost: 2, range: 1, ignoreCreeps: true});

					//It's possible for the mine path to stop one short while avoiding swamps, or other rare circumstances.
					//However, mfat (accidentally) picks up the slack when this happens.
					//Put the stray path step back where it belongs.
					while (temp[i].mfat.length > 1)
					{
						temp[i].mine.push(temp[i].mfat.shift());

						//Update tempPos before we use it again.
						tempPos = Game.rooms[room_name].getPositionAt(temp[i].mine.slice(-1)[0].x, temp[i].mine.slice(-1)[0].y);
					}

					//Record our mining container.
					Memory.rooms[room_name].sources[i].buildings.miningcontainer =
					{
						x: temp[i].mfat[0].x,
						y: temp[i].mfat[0].y
					};

					//Alter the first step in each mining path so it completes the loop.
					temp[i].mreturn[0].direction = tempPos.getDirectionTo(Game.rooms[room_name].getPositionAt(temp[i].mreturn.slice(0, 1)[0].x, temp[i].mreturn.slice(0, 1)[0].y));
					temp[i].mreturn[0].dx = temp[i].mreturn.slice(0, 1)[0].x - tempPos.x;
					temp[i].mreturn[0].dy = temp[i].mreturn.slice(0, 1)[0].y - tempPos.y;
					temp[i].mine[0].direction =	Game.rooms[room_name].getPositionAt(temp[i].mreturn[temp[i].mreturn.length - 2].x,
						temp[i].mreturn[temp[i].mreturn.length - 2].y).getDirectionTo(Game.rooms[room_name].getPositionAt(tempPos2.x, tempPos2.y));
					temp[i].mine[0].dx = temp[i].mreturn[temp[i].mreturn.length - 2].x - tempPos2.x;
					temp[i].mine[0].dy = temp[i].mreturn[temp[i].mreturn.length - 2].y - tempPos2.y;

					//Build the path from source to controller's fatty.
					temp[i].upgrade = Game.rooms[room_name].findPath(tempPos,
						Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].upgrade.slice(-2)[0].x, Memory.rooms[room_name].upgrade.slice(-2)[0].y),
						{plainCost: 1 + i, swampCost: 2 + i, range: 0, ignoreCreeps: true, maxRooms: 1,	//We want our second path to slightly prefer going over the first.
							costCallback: function(roomName, costMatrix)
							{
								let templen;

								let s = 0;
								if (i == 1)
								{
									s = -1;
								}

								//Avoid going against traffic when we leave the source.
								while (s < 1)
								{
									templen = temp[i + s].mine.length;
									for (let n = 0; n <  templen; n++)
									{
										costMatrix.set(temp[i + s].mine[n].x, temp[i + s].mine[n].y, 10);	//Here we avoid going against the traffic of both sources.
										costMatrix.set(temp[i + s].mfat[0].x, temp[i + s].mfat[0].y, 255);	//Make sure to go around both mining fatties.
									}
									s++;
								}
								costMatrix.set(Game.spawns[spawn].pos.x, Game.spawns[spawn].pos.y, 255);	//Make sure to go around the spawner.

								s = 0;
								if (i == 1)
								{
									s = -1;
								}

								//But prefer the mreturn path since there will be roads.
								while (s < 1)
								{
									templen = temp[i + s].mreturn.length;
									for(let n = 0; n < templen; n++)
									{
										costMatrix.set(temp[i + s].mreturn[n].x, temp[i + s].mreturn[n].y, 1);
										
									}
									s++;
								}

								//Also prefer the previous upgrader path.
								if (i == 1)
								{
									let templen = temp[i - 1].upgrade.length;
									for (let n = 0; n < templen; n++)
									{
										costMatrix.set(temp[i - 1].upgrade[n].x, temp[i - 1].upgrade[n].y, 1); //Prefer the previous path slightly.
									}
								}

								return costMatrix;
							}
						})
					temp[i].upgrade.unshift({x: temp[i].mine[temp[i].mine.length - 1].x, y: temp[i].mine[temp[i].mine.length - 1].y,
						dx: temp[i].mine[temp[i].mine.length - 1].x - temp[i].upgrade[0].x, dy: temp[i].mine[temp[i].mine.length - 1].y - temp[i].upgrade[0].y,
						direction: Game.rooms[room_name].getPositionAt(temp[i].mine[temp[i].mine.length - 1].x, temp[i].mine[temp[i].mine.length - 1].y).getDirectionTo(temp[i].upgrade[0].x, temp[i].upgrade[0].y)});

					//To go back to source, we really go from final upgrading position to initial upgrading position.
					tempPos = Game.rooms[room_name].getPositionAt(temp[i].upgrade.slice(-1)[0].x, temp[i].upgrade.slice(-1)[0].y);
					tempPos2 = Game.rooms[room_name].getPositionAt(temp[i].upgrade[0].x, temp[i].upgrade[0].y);

					//Here, we go back.
					for (let p = 0; p < 2; p++)	//Generate this twice, so we can make space in-between for more extensions.
					{
						temp[i].ureturn = Game.rooms[room_name].findPath(tempPos, tempPos2,
							{plainCost: 1 + i, swampCost: 2 + i, range: 0, ignoreCreeps: true, maxRooms: 1,	//We want our second return path to slightly prefer going over the first.
								costCallback: function(roomName, costMatrix)
								{
									//Go down the first generated path and make space around it.
									if (p == 1)
									{
										for (let n = 1; n < temp[i].ureturn.length - 1; n++)
										{
											for (let x = -1; x < 2; x++)
											{
												for (let y = -1; y < 2; y++)
												{
													//Don't accidentally lower the cost of walls.
													if (Game.rooms[room_name].getTerrain().get(temp[i].ureturn[n].x + x, temp[i].ureturn[n].y + y) != TERRAIN_MASK_WALL)
													{
														costMatrix.set(temp[i].ureturn[n].x + x, temp[i].ureturn[n].y + y, 10)	//Make room for extensions.
													}
												}
											}
										}
									}

									//Avoid backtracking on the way back.
									let templen = temp[i].upgrade.length;
									for (let n = 0; n < templen; n++)
									{
										costMatrix.set(temp[i].upgrade[n].x, temp[i].upgrade[n].y, 10); //Unless absolutely necessary.
									}
									costMatrix.set(Game.spawns[spawn].pos.x, Game.spawns[spawn].pos.y, 255);	//Make sure to go around our spawn.
									costMatrix.set(Memory.rooms[room_name].upgrade.slice(-1)[0].x, Memory.rooms[room_name].upgrade.slice(-1)[0].y, 255); //Make sure to go around the upgrading fatty.
									
									//But prefer the mine path since there will be roads.
									templen = temp[i].mine.length;
									for(let n = 0; n < templen; n++)
									{
										costMatrix.set(temp[i].mine[n].x, temp[i].mine[n].y, 1);
									}

									return costMatrix;
								}
							});
					}

					//Alter the first step in each upgrade path so it completes the loop.
					temp[i].ureturn[0].direction = tempPos.getDirectionTo(Game.rooms[room_name].getPositionAt(temp[i].ureturn.slice(0, 1)[0].x, temp[i].ureturn.slice(0, 1)[0].y));
					temp[i].ureturn[0].dx = temp[i].ureturn.slice(0, 1)[0].x - tempPos.x;
					temp[i].ureturn[0].dy = temp[i].ureturn.slice(0, 1)[0].y - tempPos.y;
					temp[i].upgrade[0].direction =	Game.rooms[room_name].getPositionAt(temp[i].ureturn[temp[i].ureturn.length -2].x, temp[i].ureturn[temp[i].ureturn.length -2].y)
						.getDirectionTo(Game.rooms[room_name].getPositionAt(tempPos2.x, tempPos2.y));
					temp[i].upgrade[0].dx = temp[i].ureturn[temp[i].ureturn.length -2].x - tempPos2.x;
					temp[i].upgrade[0].dy = temp[i].ureturn[temp[i].ureturn.length -2].y - tempPos2.y;

					//Now store the paths we've built.
					for (let path in temp[i])
					{
						Memory.rooms[room_name].sources[i][path] = temp[i][path];
						//console.log(Memory.rooms[room_name].sources[i][path]);
					}
				}

				//Now place our initial construction sites.
				Game.spawns[spawn].room.createConstructionSite(Memory.rooms[room_name].upgrade.slice(-1)[0].x, Memory.rooms[room_name].upgrade.slice(-1)[0].y, STRUCTURE_CONTAINER);	//Upgrader container.
				let keys = ["mine", "mreturn", "upgrade", "ureturn"];
				let matches = [];
				temp = [];
				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
				{
					Game.spawns[spawn].room.createConstructionSite(Memory.rooms[room_name].sources[i].mfat[0].x, Memory.rooms[room_name].sources[i].mfat[0].y, STRUCTURE_CONTAINER);	//Harvester containers.

					//Follow our paths and record our extension locations.
					temp[i] = {textensions: {}};
					matches[i] = 0;
					for (let k = 0; k < keys.length && matches[i] < 30; k++)
					{
						//Iterate over all of our paths.
						for (let n = 0; n < Memory.rooms[room_name].sources[i][keys[k]].length && matches[i] < 30; n++)
						{
							//Get everything within one range of these path steps.
							for (let x = -1; x < 2; x++)
							{
								for (let y = -1; y < 2; y++)
								{
									let tempx = Memory.rooms[room_name].sources[i][keys[k]][n].x + x;
									let tempy = Memory.rooms[room_name].sources[i][keys[k]][n].y + y;

									let tempcont = false;

									//Don't accidentally grab walls. Don't process a false one.
									if (Game.rooms[room_name].getTerrain().get(tempx, tempy) != TERRAIN_MASK_WALL)
									{
										if (typeof temp[i].textensions[tempx] != 'object')
										{
											temp[i].textensions[tempx] = {}
										}
										if (typeof temp[i].textensions[tempx][tempy] != 'object')
										{
											temp[i].textensions[tempx][tempy] = {}
										}

										//Don't process a false one. But we don't need to process a true one either.
										if (temp[i].textensions[tempx][tempy] === false || temp[i].textensions[tempx][tempy] === true)
										{
											tempcont = true;
											break;
										}

										//Now check this position against existing paths.
										for (let p = 0; p < keys.length; p++)
										{
											for (let m = 0; m < Memory.rooms[room_name].sources[i][keys[p]].length; m++)
											{
												if (Memory.rooms[room_name].sources[i][keys[p]][m].x == tempx && Memory.rooms[room_name].sources[i][keys[p]][m].y == tempy	//Did we match the position to any path steps?
													||	Game.spawns[spawn].pos.inRangeTo(tempx, tempy, 1)	//Are we within 1 range of the (starting) spawn or the upgrader?
													||	Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].upgrade.slice(-1)[0].x, Memory.rooms[room_name].upgrade.slice(-1)[0].y).inRangeTo(tempx, tempy, 1))
												{
													temp[i].textensions[tempx][tempy] = false;
													tempcont = true;
													break;	//We won't be using this position.
												}
												else
												{
													//Are we within 1 range of either fatty miner?
													for (let j = 0; j < Memory.rooms[room_name].sources.length; j++)
													{
														if (Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].sources[j].mfat[0].x, Memory.rooms[room_name].sources[j].mfat[0].y).inRangeTo(tempx, tempy, 1))
														{
															tempcont = true;
														}
													}
													if (tempcont)
													{
														//console.log("tempcont " + tempcont)
														temp[i].textensions[tempx][tempy] = false;
														break;	//We won't be using this position.
													}

													if (temp[i].textensions[tempx][tempy] !== false)
													{
														temp[i].textensions[tempx][tempy] = true;
													}
												}
											}

											if (tempcont)
											{
												break;
											}
										}
									}
								}
							}
						}
					}
				}

				//Now go over our sources again. Record every one that wasn't explicitly set false by another.
				let temp2 = {textensions: {}}
				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
				{
					Memory.rooms[room_name].sources[i].ideal.textensions = [];

					for (let x in temp[i].textensions)
					{
						for (let y in temp[i].textensions[x])
						{
							if (temp[i].textensions[x][y] === true)
							{
								let foundfalse = false;
								//We found a true one. Now let's make sure no other sources have disallowed it.
								for (let s = 0; s < Memory.rooms[room_name].sources.length; s++)
								{
									if (typeof temp[s].textensions[x] === 'object' && temp[s].textensions[x][y] === false)
									{
										temp[i].textensions[x][y] = false;	//We found a false one elsewhere, so it will be false here too.
										foundfalse = true;
									}
								}

								if (!foundfalse)	//No conflicts with other sources.
								{
									Memory.rooms[room_name].sources[i].ideal.textensions.push({x: x, y: y});
								}
							}
						}
					}
				}

				//Now let's combine it into a single list.
				Memory.rooms[room_name].ideal.textensions = [];
				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
				{
					while (Memory.rooms[room_name].sources[i].ideal.textensions.length > 0)
					{
						Memory.rooms[room_name].ideal.textensions.push(Memory.rooms[room_name].sources[i].ideal.textensions.shift());
					}
					delete Memory.rooms[room_name].sources[i].ideal.textensions;
				}

				//Now let's separate it again, but this time put it in order from our sources outward.
				if (init.saveExtensions(room_name))
				{
					delete Memory.rooms[room_name].ideal.textensions;	//If this succeeds, we don't need to save the room-wide list of extensions anymore.
				}

				require('roomPlanner').run();
				require('empire').room.exitpaths(room_name);
				require('roomPlanner').setupDefense(room_name);
			}
		}

		return true; //We made it this far without any errors.
    },

	saveExtensions: function(room_name)
	{
		let sourcereducer = calculate.sourcereducer;
		let max_extensions = CONTROLLER_STRUCTURES.extension[Object.keys(CONTROLLER_STRUCTURES.extension)[Object.keys(CONTROLLER_STRUCTURES.extension).length - 1]];
		let nreducer = (total, na) => total + na;

		let temppath = [];
		//let counter = 0;

		//Let's convert the array of extension positions to a multidimensional object for more efficient handling.
		let tempextensions = {};
		for (e = 0; e < Memory.rooms[room_name].ideal.textensions.length; e++)
		{
			//Initialize the X level without overwriting it.
			if (typeof tempextensions[Memory.rooms[room_name].ideal.textensions[e].x] !== 'object')
			{
				tempextensions[Memory.rooms[room_name].ideal.textensions[e].x] = {};
			}

			//Assign the Y level.
			tempextensions[Memory.rooms[room_name].ideal.textensions[e].x][Memory.rooms[room_name].ideal.textensions[e].y] = true;
			//counter++
		}
		//console.log(JSON.stringify(tempextensions));
		//console.log(counter);
		
		//Luckily for us, roomplanner is already splitting the ideal extensions evenly between sources. We just have to count up to them.
		//We'll start from the source. Iterate along mreturn, mine, upgrade, and ureturn (in that order).
		let n = [];
		for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
		{
			//Concatenate our paths into one big loop.
			temppath[i] = Memory.rooms[room_name].sources[i].mreturn.concat(Memory.rooms[room_name].sources[i].mine, Memory.rooms[room_name].sources[i].upgrade, Memory.rooms[room_name].sources[i].ureturn);

			n[i] = 0;
			//console.log(temppath[i].length);
		}

		//let last_found = 1;	//Strongly enforce even distribution of extensions between sources.
		//console.log(max_extensions);
		while (Memory.rooms[room_name].sources.reduce(sourcereducer.extensions, 0) < max_extensions && n.reduce(nreducer, 0) < 120)
		{
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				//We're going to iterate from both sources simultaneously in tandem.
				if (n[i] < temppath[i].length
					&& Memory.rooms[room_name].sources[i].buildings.extensions.length < max_extensions / 2)
				{
					//Check every position within 1 space of our current one.
					for (let x = -1; x < 2; x++)
					{
						for (let y = -1; y < 2; y++)
						{
							if (tempextensions[temppath[i][n[i]].x + x] && tempextensions[temppath[i][n[i]].x + x][temppath[i][n[i]].y + y] === true
								&& Memory.rooms[room_name].sources[i].buildings.extensions.length < max_extensions / 2
								&& Memory.rooms[room_name].sources.reduce(sourcereducer.extensions, 0) < max_extensions)
							{
								//console.log("Source[" + i + "]: " + (temppath[i][n[i]].x + x) + " " + (temppath[i][n[i]].y + y));
								Memory.rooms[room_name].sources[i].buildings.extensions.push({x: temppath[i][n[i]].x + x, y: temppath[i][n[i]].y + y});
								tempextensions[temppath[i][n[i]].x + x][temppath[i][n[i]].y + y] = false;	//We've used this one.
								//last_found = i;
							}
						}
					}
				}
				n[i]++;
			}
		}
		for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
		{
			//console.log(Memory.rooms[room_name].sources[i].buildings.extensions.length);
		}

		return true;	//We made it this far without any errors.
	},

	clean: function(room_name = false)	//For testing.
	{
		if (!room_name)
		{
			return false;
		}
		for (let creep in Memory.creeps)
		{
			if (Game.creeps[creep].room.name == room_name)
			{
				Game.creeps[creep].suicide();
			}
		}
		//RawMemory._parsed = {};
		Memory.rooms[room_name] = {};
		return true;
	},

	cleanExtensions: function(room_name = false)	//For testing.
	{
		if (room_name)
		{
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				Memory.rooms[room_name].sources[i].buildings.extensions = [];
			}
			return true;
		}
		else
		{
			return false;
		}
	}
};

module.exports = init;