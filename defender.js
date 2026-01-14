var calculate = require('calculate');

var defender =
{
	walls: {},
	ramparts: {},

	init: function(room_name = false)
	{
		if (!room_name)
		{
			for (let room_name in Memory.rooms)
			{
				defender.init(room_name);
			}
			return true;
		}

		//We should be prepared to defend every exit in our room.
		//First we need to get our tower positions and patrol paths.
		//We can skip this while testing.
		//console.log("Skipping defender.structures().");
		defender.structures(room_name);

		//Next get our paths from the sources to the patrol paths.
		//let topaths = [];
		let sourcepos = [];	//Position objects corresponding to each source.
		let destpath = [];	//This will contain each exit's patrol path, but as a series of roomposition objects.

		//Get position objects for our sources.
		for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
		{
			//Instead of the source itself, we need to get the end of the mining path, since that's the junction point for many other paths.
			sourcepos.push(Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].sources[i].mine.slice(-1)[0].x, Memory.rooms[room_name].sources[i].mine.slice(-1)[0].y));
			console.log(JSON.stringify(sourcepos[i]));
		}

		//Get position objects for each step in our patrol paths.
		for (let p = 0; p < Memory.rooms[room_name].defense.patrol.length; p++)
		{
			if (Memory.rooms[room_name].defense.patrol[p])
			{
				destpath[p] = [];
				for (let n = 0; n < Memory.rooms[room_name].defense.patrol[p].length; n++)
				{
					destpath[p][n] = Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].defense.patrol[p][n].x, Memory.rooms[room_name].defense.patrol[p][n].y);
				}
			}
		}

		//Get paths from each source to each patrol path.
		for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
		{
			//topaths[i] = [];
			Memory.rooms[room_name].sources[i].defpaths = [];
			Memory.rooms[room_name].sources[i].dreturn = [];
			Memory.rooms[room_name].sources[i].dlength = [];
			for (let e = 0; e < Memory.rooms[room_name].exits.length; e++)
			{
				if (!destpath[e])
				{
					continue;
				}

				//If we already have one, we should end in the same spot.
				if (i > 0)
				{
					destpath[e] = [Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].sources[0].defpaths[e].slice(-1)[0].x, Memory.rooms[room_name].sources[0].defpaths[e].slice(-1)[0].y)];
				}

				//Get our path from source to the patrol path.
				//topaths[i][e] = [];
				Memory.rooms[room_name].sources[i].defpaths[e] =
					sourcepos[i].findPathTo(sourcepos[i].findClosestByPath(destpath[e],
					{plainCost: 2, swampCost: 2, ignoreCreeps: true, ignoreRoads: true, ignoreDestructibleStructures: true, maxRooms: 1,
					costCallback: function(roomName, costMatrix)
						{
							//Prefer the path leaving the room.
							for (let path in Memory.rooms[room_name].exitpaths)
							{
								for (let n = 0; n < Memory.rooms[room_name].exitpaths[path].length; n++)
								{
									costMatrix.set(Memory.rooms[room_name].exitpaths[path][n].x, Memory.rooms[room_name].exitpaths[path][n].y, 1);
								}
							}

							//Prefer the other source's path.
							if (i > 0)
							{
								for (let i2 = 0; i2 < i; i2++)
								{
									for (let m = 0; m < Memory.rooms[room_name].sources[i2].defpaths[e].length; m++)
									{
										costMatrix.set(Memory.rooms[room_name].sources[i2].defpaths[e][m].x, Memory.rooms[room_name].sources[i2].defpaths[e][m].y, 1);
									}
								}
							}

							//But avoid the upgrading fatty.
							costMatrix.set(Memory.rooms[room_name].upgrade.slice(-1)[0].x, Memory.rooms[room_name].upgrade.slice(-1)[0].y, 255);

							//Prefer the mine and mreturn paths.
							for (let i2 = 0; i2 < Memory.rooms[room_name].sources.length; i2++)
							{
								for (let n = 0; n < Memory.rooms[room_name].sources[i2].mine.length; n++)
								{
									costMatrix.set(Memory.rooms[room_name].sources[i2].mine[n].x, Memory.rooms[room_name].sources[i2].mine[n].y, 1);
								}
								for (let n = 0; n < Memory.rooms[room_name].sources[i2].mreturn.length; n++)
								{
									costMatrix.set(Memory.rooms[room_name].sources[i2].mreturn[n].x, Memory.rooms[room_name].sources[i2].mreturn[n].y, 1);
								}
							}

							for (let i2 = 0; i2 < Memory.rooms[room_name].sources.length; i2++)
							{
								//But avoid the mining fatties.
								costMatrix.set(Memory.rooms[room_name].sources[i2].mfat[0].x, Memory.rooms[room_name].sources[i2].mfat[0].y, 255);

								//Avoid the extensions as well.
								for (let ex = 0; ex < Memory.rooms[room_name].sources[i2].buildings.extensions.length; ex++)
								{
									costMatrix.set(Memory.rooms[room_name].sources[i2].buildings.extensions[ex].x, Memory.rooms[room_name].sources[i2].buildings.extensions[ex].y, 255);
								}

								//Avoid the spawns as well.
								for (let sp = 0; sp <= 3; sp++)
								{
									if (Memory.rooms[room_name].spawns[sp])
									{
										costMatrix.set(Memory.rooms[room_name].spawns[sp].x, Memory.rooms[room_name].spawns[sp].y, 255);
									}
								}
							}
						}}),
					{plainCost: 2, swampCost: 2, ignoreCreeps: true, ignoreRoads: true, ignoreDestructibleStructures: true, maxRooms: 1, costCallback:
						function(roomName, costMatrix)
						{
							//Prefer the path leaving the room.
							for (let path in Memory.rooms[room_name].exitpaths)
							{
								for (let n = 0; n < Memory.rooms[room_name].exitpaths[path].length; n++)
								{
									costMatrix.set(Memory.rooms[room_name].exitpaths[path][n].x, Memory.rooms[room_name].exitpaths[path][n].y, 1);
								}
							}

							//Prefer the other source's path.
							if (i > 0)
							{
								for (let i2 = 0; i2 < i; i2++)
								{
									for (let m = 0; m < Memory.rooms[room_name].sources[i2].defpaths[e].length; m++)
									{
										costMatrix.set(Memory.rooms[room_name].sources[i2].defpaths[e][m].x, Memory.rooms[room_name].sources[i2].defpaths[e][m].y, 1);
									}
								}
							}

							//But avoid the upgrading fatty.
							costMatrix.set(Memory.rooms[room_name].upgrade.slice(-1)[0].x, Memory.rooms[room_name].upgrade.slice(-1)[0].y, 255);

							//Prefer the mine and mreturn paths.
							for (let i2 = 0; i2 < Memory.rooms[room_name].sources.length; i2++)
							{
								for (let n = 0; n < Memory.rooms[room_name].sources[i2].mine.length; n++)
								{
									costMatrix.set(Memory.rooms[room_name].sources[i2].mine[n].x, Memory.rooms[room_name].sources[i2].mine[n].y, 1);
								}
								for (let n = 0; n < Memory.rooms[room_name].sources[i2].mreturn.length; n++)
								{
									costMatrix.set(Memory.rooms[room_name].sources[i2].mreturn[n].x, Memory.rooms[room_name].sources[i2].mreturn[n].y, 1);
								}
							}

							for (let i2 = 0; i2 < Memory.rooms[room_name].sources.length; i2++)
							{
								//But avoid the mining fatties.
								costMatrix.set(Memory.rooms[room_name].sources[i2].mfat[0].x, Memory.rooms[room_name].sources[i2].mfat[0].y, 255);

								//Avoid the extensions as well.
								for (let ex = 0; ex < Memory.rooms[room_name].sources[i2].buildings.extensions.length; ex++)
								{
									costMatrix.set(Memory.rooms[room_name].sources[i2].buildings.extensions[ex].x, Memory.rooms[room_name].sources[i2].buildings.extensions[ex].y, 255);
								}

								//Avoid the spawns as well.
								for (let sp = 0; sp <= 3; sp++)
								{
									if (Memory.rooms[room_name].spawns[sp])
									{
										costMatrix.set(Memory.rooms[room_name].spawns[sp].x, Memory.rooms[room_name].spawns[sp].y, 255);
									}
								}
							}
						}});

				//Now return.
				Memory.rooms[room_name].sources[i].dreturn[e] = Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].sources[i].defpaths[e].slice(-1)[0].x, Memory.rooms[room_name].sources[i].defpaths[e].slice(-1)[0].y)
					.findPathTo(sourcepos[i].x, sourcepos[i].y,
					{plainCost: 5, swampCost: 5, ignoreCreeps: true, ignoreRoads: true, ignoreDestructibleStructures: true, maxRooms: 1, costCallback:
						function(roomName, costMatrix)
						{
							//Return over the same path we came from.
							for (n = 0; n < Memory.rooms[room_name].sources[i].defpaths[e].length; n++)
							{
								costMatrix.set(Memory.rooms[room_name].sources[i].defpaths[e][n].x, Memory.rooms[room_name].sources[i].defpaths[e][n].y, 1);
							}
						}
					});

				Memory.rooms[room_name].sources[i].dlength[e] =	Memory.rooms[room_name].sources[i].defpaths[e].length;
			}
			//console.log(JSON.stringify(topaths[i]));
		}

		//Now figure out which path is shortest for each exit.
		let shortest = [];
		let shortestchosen = [];
		let test = [];
		for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
		{
			for (let e = 0; e < Memory.rooms[room_name].sources[i].defpaths.length; e++)
			{
				if (!Memory.rooms[room_name].sources[i].defpaths[e])
				{
					continue;
				}

				if (shortest[e] === undefined)	//This is the first time we're checking this exit.
				{
					shortest[e] = Infinity;
					shortestchosen[e] = 0;
				}

				test[e] = Memory.rooms[room_name].sources[i].mine.length + Memory.rooms[room_name].sources[i].defpaths[e].length;
				if (test[e] < shortest[e])
				{
					shortestchosen[e] = i;
					shortest[e] = test[e];
					//console.log("Shortest found for " + e + " so far: " + shortestchosen[e]);
				}
			}
		}

		//Now mark the shortest path for each exit.
		for (let e = 0; e < shortestchosen.length; e++)
		{
			if (!shortestchosen)
			{
				continue;
			}

			if (!Array.isArray(Memory.rooms[room_name].defense.dshort))
			{
				Memory.rooms[room_name].defense.dshort = [];
			}
			Memory.rooms[room_name].defense.dshort[e] = shortestchosen[e];
		}

		//Now mark the walls that are unreachable from the patrol paths.
		defender.outofreach(room_name);

		//Now build the walls.
		//We should run this elsewhere, after ramparts have been set.
		//defender.setDefense(room_name);

		//If our walls are built, we don't need to keep the knownwalls.
		//We can move this to the last stage of setDefense().
		/*if (Memory.rooms[room_name].defense.knownwalls)
		{
			Memory.rooms[room_name].defense.knownwalls = undefined;
		}*/

		//We have a limited amount of containers, so we can't make them a critical requirement of a defense.
		//Maybe at room level 8 we can change this.

		return true;	//We made it this far without any errors.
	},

	setDefense: function(room_name = false, stage = 2)
	{
		if (!room_name)
		{
			for (let room_name in Memory.rooms)
			{
				defender.setDefense(room_name);
			}
			return true;
		}

		if (!Array.isArray(Memory.rooms[room_name].defense.knownwalls))
		{
			Memory.rooms[room_name].defense.knownwalls = [];
		}

		//Before we begin, we have to get the walls belonging to each exit.
		//For the first stage, only the layer needed to enclose the exit.
		//For the second stage, the rest of the walls assigned to this exit.
		let walls = [];
		let ramparts = false;
		let built_any = false;

		//If we have ramparts, we're going to use them.
		if (Memory.rooms[room_name].defense.ramparts)
		{
			//We will track the ramparts in [x][y] format for easier testing.
			ramparts = {};
			for (let r = 0; r < Memory.rooms[room_name].defense.ramparts.length; r++)
			{
				if (!ramparts[Memory.rooms[room_name].defense.ramparts[r].x])
				{
					ramparts[Memory.rooms[room_name].defense.ramparts[r].x] = {};
				}

				ramparts[Memory.rooms[room_name].defense.ramparts[r].x][Memory.rooms[room_name].defense.ramparts[r].y] = true;
			}
		}

		let temppath;	//This will juggle stuff, but then it will become an index.
		let epkeys = Object.keys(Memory.rooms[room_name].exitpaths);
		for (let e = 0; e < Memory.rooms[room_name].exits.length; e++)
		{
			walls[e] = [];
			//ramparts[e] = [];
			let exittiles = [];
			for (let et = 0; et < Memory.rooms[room_name].exits[e].length; et++)
			{
				exittiles.push(Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].exits[e][et].x, Memory.rooms[room_name].exits[e][et].y));
			}

			//We're going to need to know if we have an exit path going through here.
			
			let closest;
			for (let ep = 0; ep < epkeys.length; ep++)
			{
				//We're checking the closest exit tile to the end of this path.
				//console.log(JSON.stringify(Memory.rooms[room_name].exitpaths[epkeys[ep]]));
				temppath = Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].exitpaths[epkeys[ep]].slice(-1)[0].x, Memory.rooms[room_name].exitpaths[epkeys[ep]].slice(-1)[0].y);
				//console.log(JSON.stringify(epkeys[ep] + ' End: ' + temppath));
				closest = temppath.findClosestByRange(exittiles);
				//console.log(JSON.stringify(epkeys[ep] + ' Tile: ' + closest));
				//If the last step of the path is resting on the closest exit tile, we've found a path that leads to this exit.
				if (closest.isEqualTo(temppath))
				{
					//console.log('Match!');
					temppath = ep;
					break;
				}
				else if(ep == epkeys.length - 1)
				{
					temppath = false;	//We didn't find any.
				}
			}

			//We're iterating the walls.
			//Check to see if the wall is in range of any exit tiles.
			for (let w = 0; w < Memory.rooms[room_name].defense.walls.length; w++)
			{
				//Now check the wall against the closest exit tile.
				let tw = Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].defense.walls[w].x, Memory.rooms[room_name].defense.walls[w].y);
				let et = tw.findClosestByRange(exittiles);
				for (let t = 0; t < exittiles.length; t++)
				{
					if (et.isEqualTo(exittiles[t]))
					{
						et = t;
						break;
					}
				}			

				if(Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].defense.walls[w].x, Memory.rooms[room_name].defense.walls[w].y)
					.getRangeTo(Memory.rooms[room_name].exits[e][et].x, Memory.rooms[room_name].exits[e][et].y) == stage)
				{
					//This wall belongs to this exit.
					walls[e].push(Memory.rooms[room_name].defense.walls[w]);
				}
			}
		}
		//console.log(JSON.stringify(walls));
		//console.log(walls[0].length);

		//Now build the walls.
		let lastexit = walls.length - 1;
		for (let e = 0; e < walls.length; e++)
		{
			let lastwall = walls[e].length - 1;
			for (let w = 0; w < walls[e].length; w++)
			{
				let found = false;
				let finished = false;
				let built = false;

				let tile = Game.rooms[room_name].lookForAt(LOOK_CONSTRUCTION_SITES, walls[e][w].x, walls[e][w].y);
				//Find construction sites.
				for (let t = 0; t < tile.length; t++)
				{
					if (tile[t].structureType == STRUCTURE_WALL)
					{
						found = true;
						//built_any = true;
						//console.log(found);
						break;
					}
				}

				//Check this location for structures.
				tile = Game.rooms[room_name].lookForAt(LOOK_STRUCTURES, walls[e][w].x, walls[e][w].y);

				//Is the space empty?
				for (let t = 0; t < tile.length; t++)
				{
					if (tile[t].structureType == STRUCTURE_WALL || tile[t].structureType == STRUCTURE_RAMPART)
					{
						finished = true;	//If finished is still false, the space is empty.
					}
				}

				//console.log("Found: " + found + " Built: " + built + " Finished: " + finished);

				if (found)	//If we found a pending wall, we're done here.
				{
					//console.log("Found");
					let tid = Game.rooms[room_name].lookForAt(LOOK_CONSTRUCTION_SITES, walls[e][w].x, walls[e][w].y)[0].id
					if (Memory.rooms[room_name].defense.knownwalls.indexOf(tid) == -1)
					{
						Memory.rooms[room_name].defense.knownwalls.push(tid);
					}
					built_any = true;
					continue;
				}
				else if (!finished)	//If there's no wall or construction site, build a construction site.
				{
					//console.log("!Finished");
					//Now let's see if it should be a rampart.
					let rampart = false;
					let tempposition = Game.rooms[room_name].getPositionAt(walls[e][w].x, walls[e][w].y);
					if (typeof temppath === 'number')
					{
						//We've already determined that this path leads to this exit. Now we need to match our wall to it.
						//console.log(JSON.stringify(epkeys));
						//console.log(temppath);
						//console.log(epkeys[temppath]);
						//console.log(JSON.stringify(Memory.rooms[room_name].exitpaths[epkeys[temppath]]));
						/*for (let n = Memory.rooms[room_name].exitpaths[epkeys[temppath]].length -1; n >= 0; n--)
						{
							if(tempposition.getRangeTo(Memory.rooms[room_name].exitpaths[epkeys[temppath]][n].x, Memory.rooms[room_name].exitpaths[epkeys[temppath]][n].y) > 4)
							{
								break;
							}
							else if(tempposition.isEqualTo(Memory.rooms[room_name].exitpaths[epkeys[temppath]][n].x, Memory.rooms[room_name].exitpaths[epkeys[temppath]][n].y))
							{
								rampart = true;
								break;
							}
						}*/

						if (ramparts && ramparts[walls[e][w].x] && ramparts[walls[e][w].x][walls[e][w].y])
						{
							rampart = true;
						}
					}

					//If it's on the path, we need a rampart here.
					if (rampart)
					{
						Game.rooms[room_name].createConstructionSite(walls[e][w].x, walls[e][w].y, STRUCTURE_RAMPART);
						Memory.rooms[room_name].defense.need = e;
						//console.log("Ramp: " + walls[e][w].x + ", " + walls[e][w].y);
						built = true;

						//We will defer recording the rampart since our exit path might move.
						//Memory.rooms[room_name].defense.ramparts.push(walls[e][w]);
					}
					else
					{
						Game.rooms[room_name].createConstructionSite(walls[e][w].x, walls[e][w].y, STRUCTURE_WALL);
						Memory.rooms[room_name].defense.need = e;
						//console.log("Wall: " + walls[e][w].x + ", " + walls[e][w].y);
						built = true;
					}

					built_any = true;
				}
				else if (!built)	//If there's no empty space and no construction site, we have a finished wall.
				{
					//console.log(JSON.stringify(Game.rooms[room_name].lookForAt(LOOK_STRUCTURES, walls[e][w].x, walls[e][w].y)));
					let tid = Game.rooms[room_name].lookForAt(LOOK_STRUCTURES, walls[e][w].x, walls[e][w].y)[0].id
					if (Memory.rooms[room_name].defense.knownwalls.indexOf(tid) == -1)
					{
						Memory.rooms[room_name].defense.knownwalls.push(tid);
					}
					finished = true;
				}

				if (stage < 4 && e === lastexit && w === lastwall)
				{
					if (!Memory.rooms[room_name].defense.need)
					{
						Memory.rooms[room_name].defense.need = 0;
					}

					if (built)
					{
						Memory.rooms[room_name].defense.checkagain = true;
					}
					if ((!built || finished) && !built_any)
					{
						//If we've completed this stage, go to the next stage.
						console.log('Stage ' + (stage + 1) + '.');
						return defender.setDefense(room_name, stage + 1);
					}

					//defender.setRamparts(room_name);	//We have to delay this until after the exitpaths are regenerated.
					return true;	//We made it this far without any errors.
				}
				else if (stage === 4 && e === lastexit && w === lastwall)
				{
					if (built)
					{
						Memory.rooms[room_name].defense.checkagain = true;
						if (!Memory.rooms[room_name].defense.need)
						{
							Memory.rooms[room_name].defense.need = 0;
						}
						console.log('Check again.');
					}
					if ((!built || finished) && !built_any)
					{
						//If we've completed this stage, we're done here.
						Memory.rooms[room_name].defense.checkagain = undefined;
						Memory.rooms[room_name].defense.knownwalls = undefined;
						if (!Memory.rooms[room_name].defense.need)
						{
							Memory.rooms[room_name].defense.need = 0;
						}
						console.log('All walls complete.');
					}

					return true;	//We made it this far without any errors.
				}
			}
		}
	},

	setRamparts: function(room_name)
	{
		let wall_positions = {};
		let existing_ramparts = [];
		let tempwalls = Memory.rooms[room_name].defense.walls;
		for (let w = 0; w < tempwalls.length; w++)
		{
			if (!wall_positions[tempwalls[w].x])
			{
				wall_positions[tempwalls[w].x] = {};
			}

			wall_positions[tempwalls[w].x][tempwalls[w].y] = true;
		}

		//Set ramparts.
		for (let exit_name in Memory.rooms[room_name].exitpaths)
		{
			for (let r = 0; r < Memory.rooms[room_name].exitpaths[exit_name].length; r++)
			{
				let tempexit = Memory.rooms[room_name].exitpaths[exit_name];
				if (wall_positions[tempexit[r].x] && wall_positions[tempexit[r].x][tempexit[r].y])
				{
					existing_ramparts.push({x: tempexit[r].x, y: tempexit[r].y});
				}
			}
		}

		//Now record our ramparts.
		Memory.rooms[room_name].defense.ramparts = existing_ramparts;
		return true;	//We made it this far without any errors.
	},

	getWalls: function(room_name)
	{
		//Use wall and rampart coordinates to make an [x][y] multidimensional object. This makes addressing them faster.
		//They are already stored in defense.walls/ramparts.
		let existing_walls = Memory.rooms[room_name].defense.walls;
		let existing_ramparts = Memory.rooms[room_name].defense.ramparts;

		let wall_positions = {};
		let rampart_positions = {};

		let tempwall;

		//Get ramparts first.
		for (let r = 0; r < existing_ramparts.length; r++)
		{
			tempwall = Game.rooms[room_name].lookForAt(LOOK_STRUCTURES, existing_ramparts[r].x, existing_ramparts[r].y);
			if (tempwall.length > 0)
			{
				if (!rampart_positions[existing_ramparts[r].x])
				{
					rampart_positions[existing_ramparts[r].x] = {};
				}

				for (let tw = 0; tw < tempwall.length; tw++)
				{
					if (tempwall[tw].structureType === STRUCTURE_RAMPART)
					{
						rampart_positions[existing_ramparts[r].x][existing_ramparts[r].y] = tempwall[tw].id;	//There should only be a rampart here.
						break;
					}
				}
			}
		}

		//Get walls.
		for (let w = 0; w < existing_walls.length; w++)
		{
			tempwall = Game.rooms[room_name].lookForAt(LOOK_STRUCTURES, existing_walls[w].x, existing_walls[w].y);
			if (tempwall.length > 0 && (!rampart_positions[existing_walls[w].x] || !rampart_positions[existing_walls[w].x][existing_walls[w].y]))
			{
				if (!wall_positions[existing_walls[w].x])
				{
					wall_positions[existing_walls[w].x] = {};
				}

				for (let tw = 0; tw < tempwall.length; tw++)
				{
					if (tempwall[tw].structureType === STRUCTURE_WALL)
					{
						wall_positions[existing_walls[w].x][existing_walls[w].y] =	tempwall[tw].id;	//There should only be a wall here.
						break;
					}
				}
			}
		}

		defender.walls[room_name] = wall_positions;
		defender.ramparts[room_name] = rampart_positions;
		return {walls: wall_positions, ramparts: rampart_positions};
	},

	checkDefense: function(room_name = false)
	{
		if (!room_name)
		{
			let tempbool = true;
			for (let room_name in Memory.rooms)
			{
				if (!defender.checkDefense(room_name))
				{
					tempbool = false;
				}
			}
			return tempbool;
		}

		//First make sure we have a list of walls and ramparts.
		if (!defender.walls[room_name] || !defender.ramparts[room_name])
		{
			defender.getWalls(room_name);
		}

		let missing = false;
		let missingramparts = {};
		let missingwalls = [];

		//If any are missing from our tracking, they need to be re-listed.
		//If any we are tracking have been destroyed, they need to be re-built.
		let calculate_xy = calculate.xy_length;
		if ((calculate_xy(defender.walls[room_name]) + calculate_xy(defender.ramparts[room_name])) < Memory.rooms[room_name].defense.walls.length)
		{
			let saved_walls = Memory.rooms[room_name].defense.walls;
			let saved_ramparts = Memory.rooms[room_name].defense.ramparts;
			let tempwall;

			for (let w = 0; w < saved_walls.length; w++)
			{
				tempwall = Game.rooms[room_name].lookForAt(LOOK_STRUCTURES, saved_walls[w].x, saved_walls[w].y);
				if (tempwall.length && (tempwall[0].structureType !== STRUCTURE_WALL || tempwall[0].structureType !== STRUCTURE_RAMPART))
				{
					tempwall.shift();
				}

				//If the position is missing its wall or rampart.
				if (!tempwall.length)
				{
					//See if it should be a rampart.
					for (let r = 0; r < saved_ramparts.length; r++)
					{
						if(saved_ramparts[r].x === saved_walls[w].x && saved_ramparts[r].y === saved_walls[w].y)
						{
							//If any are missing, we rebuild and start over.
							if (!missingramparts[saved_ramparts[r].x])
							{
								missingramparts[saved_ramparts[r].x] = {};
							}
							missingramparts[saved_ramparts[r].x][saved_ramparts[r].y] = true;
						}
					}

					//If any are missing, we rebuild and start over.
					missingwalls.push({x: saved_walls[w].x, y: saved_walls[w].y});
					missing = true;
				}
			}
		}
		else
		{
			//First check our ramparts.
			for (let x in defender.ramparts[room_name])
			{
				for (let y in defender.ramparts[room_name][x])
				{
					if (!Game.getObjectById(defender.ramparts[room_name][x][y]))
					{
						//If any are missing, we rebuild and start over.
						if (!missingramparts[x])
						{
							missingramparts[x] = {};
						}
						missingramparts[x][y] = true;
						missing = true;
					}
				}
			}

			//Then check our walls.
			for (let x in defender.walls[room_name])
			{
				for (let y in defender.walls[room_name][x])
				{
					if (!Game.getObjectById(defender.walls[room_name][x][y]))
					{
						//If any are missing, we rebuild and start over.
						missingwalls.push({x: x, y: y});
						missing = true;
					}
				}
			}
			//console.log(JSON.stringify(missingwalls));
		}

		if (missing)
		{
			let structure;

			defender.walls[room_name] = {};
			defender.ramparts[room_name] = {};
			//defender.getWalls(room_name);
			console.log('Resetting walls and ramparts for ' + room_name + '.');

			if (Memory.rooms[room_name].defense.checkagain)
			{
				defender.setDefense(room_name);
			}
			else
			{
				//Now construct the missing ones.
				for (let w = 0; w < missingwalls.length; w++)
				{
					if (missingramparts[missingwalls[w].x] && missingramparts[missingwalls[w].x][missingwalls[w].y])
					{
						structure = STRUCTURE_RAMPART;
					}
					else
					{
						structure = STRUCTURE_WALL;
					}

					Game.rooms[room_name].createConstructionSite(missingwalls[w].x, missingwalls[w].y, structure);
				}
			}

			//roomPlanner.check() will run getWalls() if checkDefense() returns false.
		}

		return !missing;	//We made it this far without any errors.
	},

	structures: function(room_name)
	{
		let terrain = Game.map.getRoomTerrain(room_name);
		let remainingtowers = CONTROLLER_STRUCTURES.tower[8];
		let keys = Object.keys(Memory.rooms[room_name].exits);
		let towers = [];
		let towerpositions = [];
		let defensepath = [];
		let dreturn = [];

		//First we distribute our towers evenly between exits.
		for (let e = 0; remainingtowers > 0; e++)
		{
			if (e >= Memory.rooms[room_name].exits.length)
			{
				e = 0;
			}

			if (towers[e] === undefined && !Memory.rooms[room_name].defense.safe[e])
			{
				towers[e] = 1;
			}
			else if (!Memory.rooms[room_name].defense.safe[e])
			{
				towers[e]++;
			}
			else if (Memory.rooms[room_name].defense.safe[e])
			{
				continue;
			}
			remainingtowers--;
		}

		//Let's make sure we don't start and end in a wall.
		

		//Now let's assign tower positions. Each element in the towers array cooresponds to one exit.
		for (let e = 0; e < towers.length; e++)
		{
			//We shouldn't operate on a safe exit. If there's no entry, it was safe, so we didn't assign any towers to it.
			if (!towers[e])
			{
				continue;
			}

			let assignedtowers = 0;
			let offset;				//Offset by 5 depending on axis. This is to place our towers on the correct side of the wall.
			let toffset = [0, 0];	//Offset by an incrementing amount backwards and forwards. This is to spread our towers evenly along the wall.
			let thisx_temp = 0;			//For shifting towers that would block.
			let thisy_temp = 0;			//For shifting towers that would block.

			let tower_begin = [0, 0];	//Offset to keep towers from being built on walls.

			//First we need to determine what type of exit it is.
			if (Memory.rooms[room_name].exits[e][0].y == 0)			//Is it northern?
			{
				offset = [0, 5];
				thisy_temp++;
			}
			else if (Memory.rooms[room_name].exits[e][0].x == 49)	//Is it eastern?
			{
				offset = [-5, 0];
				thisx_temp--;
			}
			else if (Memory.rooms[room_name].exits[e][0].y == 49)	//Is it southern?
			{
				offset = [0, -5];
				thisy_temp--;
			}
			else if (Memory.rooms[room_name].exits[e][0].x == 0)	//Is it western?
			{
				offset = [5, 0];
				thisx_temp++;
			}

			//We're getting a path from one end of the exit to the other, with our offset factored in.
			let tempPoffset = [0, 0, 0, 0];
			let tempTestOffset = [0, 0]	//For testing the beginning and end of our path. (It shouldn't begin or end in a wall.)
			if (offset[0] == 0)
			{
				tempPoffset[0]--;	//If we're horizontal, we're gonna increase our X bound temporarily.
				tempPoffset[2]--;
				tempTestOffset[0]++;
			}
			else if (offset[1] == 0)
			{
				tempPoffset[1]--;	//If we're vertical, we're gonna increase our Y bound temporarily.
				tempPoffset[3]--;
				tempTestOffset[1]++;
			}

			//Prepare to get the path.
			let path_begin = Game.rooms[room_name].getPositionAt(
				Memory.rooms[room_name].exits[e][0].x + offset[0] + tempPoffset[0], Memory.rooms[room_name].exits[e][0].y + offset[1] + tempPoffset[1]);
			let path_end = Game.rooms[room_name].getPositionAt(
				Memory.rooms[room_name].exits[e][Memory.rooms[room_name].exits[e].length - 1].x + offset[0] + Math.abs(tempPoffset[2]),
				Memory.rooms[room_name].exits[e][Memory.rooms[room_name].exits[e].length - 1].y + offset[1] + Math.abs(tempPoffset[3]));

			//If the exit is too short, we need to force it a little wider.
			for (let tpath_range = path_begin.getRangeTo(path_end); tpath_range <= towers[e]; tpath_range += 2)
			{
				path_begin = Game.rooms[room_name].getPositionAt(path_begin.x + tempTestOffset[0], path_begin.y - tempTestOffset[1]);
				//We need the beginning and end just barely out of the range of the 6 towers.
				if (tpath_range % 2 !== 0 || tpath_range <= 5)
				{
					path_end = Game.rooms[room_name].getPositionAt(path_end.x - tempTestOffset[0], path_end.y + tempTestOffset[1]);
				}
				else
				{
					tpath_range--;
				}
			}

			let temp_terrain = Game.rooms[room_name].getTerrain();

			//But we should make sure we're not starting and ending in a wall.
			//Shift the beginning.
			while(temp_terrain.get(path_begin.x, path_begin.y) === TERRAIN_MASK_WALL)
			{
				path_begin = Game.rooms[room_name].getPositionAt(path_begin.x + tempTestOffset[0], path_begin.y + tempTestOffset[1]);
				for (let o = 0; o < tower_begin.length; o++)
				{
					tower_begin[o] += tempTestOffset[o];
				}
			}
			//Shift the end.
			while(temp_terrain.get(path_end.x, path_end.y) === TERRAIN_MASK_WALL)
			{
				path_end = Game.rooms[room_name].getPositionAt(path_end.x - tempTestOffset[0], path_end.y - tempTestOffset[1]);
			}
			//console.log(JSON.stringify(path_begin + ' ' + path_end));

			//We might need to place up to 6 towers.
			//They should be assigned from the center of the exit, spreading outward. This could be accomplished by spreading them out evenly.
			let spread = Math.round((path_begin.getRangeTo(path_end) - 1) / towers[e]);
			if (spread === 0)
			{
				spread++;
			}
			//console.log(spread);

			if (Memory.rooms[room_name].exits[e].length % 2 == 0)
			{
				toffset[1]++;	//If it divides evenly, make sure our first two positions aren't at the same location.
			}
			else
			{
				toffset[0]--
				toffset[1]++;	//If it divides oddly, make sure our first two positions aren't at the same location.
			}

			let startcoord =
			{
				x: Memory.rooms[room_name].exits[e][Math.ceil(Memory.rooms[room_name].exits[e].length / 2) - 1].x,// + tower_begin[0],
				y: Memory.rooms[room_name].exits[e][Math.ceil(Memory.rooms[room_name].exits[e].length / 2) - 1].y// + tower_begin[1]
			};
			let tempcoord;
			let failsafe = [0, 0];
			let thisx;
			let thisy;

			while (assignedtowers < towers[e] && (failsafe[0] < 25 && failsafe[1] < 25))
			{
				//Determine which axis to spread along.
				if (offset[0] === 0)
				{
					tempcoord = [toffset[0], 0];	//X axis.
				}
				else if (offset[1] === 0)
				{
					tempcoord = [0, toffset[0]];	//Y axis.
				}

				//Spreading backward.
				thisx = Math.floor(startcoord.x) + tempcoord[0] + offset[0];
				thisy = Math.floor(startcoord.y) + tempcoord[1] + offset[1];
				if (terrain.get(thisx, thisy) != 1 && !defender.inwalls(thisx, thisy, room_name))
				{
					towerpositions.push({x: thisx, y: thisy});
					assignedtowers++;
				}
				else
				{
					failsafe[0]++;
				}

				if (assignedtowers < towers[e])
				{
					//Determine which axis to spread along.
					if (offset[0] === 0)
					{
						tempcoord = [toffset[1], 0];	//X axis.
					}
					else if (offset[1] === 0)
					{
						tempcoord = [0, toffset[1]];	//Y axis.
					}

					//Spreading forward.
					thisx = Math.ceil(startcoord.x) + tempcoord[0] + offset[0];
					thisy = Math.ceil(startcoord.y) + tempcoord[1] + offset[1];
					if (terrain.get(thisx, thisy) !== TERRAIN_MASK_WALL && !defender.inwalls(thisx, thisy, room_name, terrain))
					{
						if (terrain.get(thisx + thisx_temp, thisy + thisy_temp === TERRAIN_MASK_WALL))
						{
							//If the tower is wedged between a manufactured wall and a natural wall, we should move it.
							let thisx_temp_inner = 0;
							let thisy_temp_inner = 0;
							for (let try_again = 0; try_again < 2; try_again++)
							{
								thisx_temp_inner += thisx_temp;
								thisy_temp_inner += thisy_temp;
								if (terrain.get(thisx + thisx_temp, thisy + thisy_temp === TERRAIN_MASK_WALL))
								{
									if (thisx_temp === 0)	//We're on the north or the south.
									{
										if (terrain.get(thisx + thisx_temp - try_again, thisy + thisy_temp) !== TERRAIN_MASK_WALL)
										{
											towerpositions.push({x: thisx - try_again, y: thisy});
											assignedtowers++;
											break;
										}
										else if (terrain.get(thisx + thisx_temp + try_again, thisy + thisy_temp) !== TERRAIN_MASK_WALL)
										{
											towerpositions.push({x: thisx + try_again, y: thisy});
											assignedtowers++;
											break;
										}
									}
									else if (thisy_temp === 0)	//We're on the east or the west.
									{
										if (terrain.get(thisx + thisx_temp, thisy + thisy_temp - try_again) !== TERRAIN_MASK_WALL)
										{
											towerpositions.push({x: thisx, y: thisy - try_again});
											assignedtowers++;
											break;
										}
										else if (terrain.get(thisx + thisx_temp, thisy + thisy_temp + try_again) !== TERRAIN_MASK_WALL)
										{
											towerpositions.push({x: thisx, y: thisy + try_again});
											assignedtowers++;
											break;
										}
									}
								}
							}
							//Make sure we didn't put two towers in the same spot.
							if (towerpositions[towerpositions.length - 1].x === towerpositions[towerpositions.length - 2].x
							 && towerpositions[towerpositions.length - 1].y === towerpositions[towerpositions.length - 2].y)
							{
								assignedtowers--;
								towerpositions.pop();
							}
						}
						else
						{
							towerpositions.push({x: thisx, y: thisy});
							assignedtowers++;
						}
					}
					else
					{
						failsafe[1]++;
					}
				}

				toffset[0] -= spread;
				toffset[1] += spread;
			}

			//We should make sure we're not starting and ending in a tower or a wall.
			//Shift the beginning.
			let which_way = -1;
			let out_one = true;	//One-time extend to range 6 instead of 5 from the exit.
			let in_one = false;
			let once_more = true;
			//let wall_behind_us = false;
			for (let ttp = 0; ttp < towerpositions.length; ttp++)
			{
				//If we hit a wall, change directions within the comparison.
				if ((path_begin.x === towerpositions[ttp].x && path_begin.y === towerpositions[ttp].y) || (terrain.get(path_begin.x, path_begin.y) === TERRAIN_MASK_WALL && (which_way = 1)))
				{
					//If we previously hit a wall and now we hit a tower, we should push out to range 6.
					if (which_way === 1 && out_one)
					{
						console.log('Out to 6.');
						path_begin = Game.rooms[room_name].getPositionAt(path_begin.x + ((1 - tempTestOffset[0]) * which_way), path_begin.y + ((1 - tempTestOffset[1]) * which_way));
						out_one = false;
					}
					else
					{
						//If we're on one of our last two towers, we can go inward rather than outward.
						if(ttp >= towerpositions.length - 2 && !in_one)
						{
							which_way = which_way * -1;
							console.log('Inward Once.');
						}

						path_begin = Game.rooms[room_name].getPositionAt(path_begin.x + (tempTestOffset[0] * which_way), path_begin.y + (tempTestOffset[1] * which_way));

						if (ttp >= towerpositions.length - 2 && !in_one)
						{
							which_way = which_way * -1;
							in_one = true;

							//Test one more out to see if this tower is hugging a wall.
							if (terrain.get(path_begin.x + (tempTestOffset[0] * which_way), path_begin.y + (tempTestOffset[1] * which_way)) === TERRAIN_MASK_WALL)
							{
								which_way = which_way * -1;	//Permanently move inward.
							}
						}
					}
					ttp = 0;
				}

				if (ttp === towerpositions.length - 1 && once_more)
				{
					ttp = 0;
					once_more = false;
				}
			}
			//Shift the end.
			which_way = -1;
			in_one = false;
			once_more = true;
			//wall_behind_us = false;
			for (let ttp = 0; ttp < towerpositions.length; ttp++)
			{
				//If we hit a wall, change directions within the comparison.
				if ((path_end.x === towerpositions[ttp].x && path_end.y === towerpositions[ttp].y) || (terrain.get(path_begin.x, path_begin.y) === TERRAIN_MASK_WALL && (which_way = 1)))
				{
					//If we previously hit a wall and now we hit a tower, we should push out to range 6.
					if (which_way === 1 && out_one)
					{
						path_end = Game.rooms[room_name].getPositionAt(path_end.x - ((1 - tempTestOffset[0]) * which_way), path_end.y - ((1 - tempTestOffset[1]) * which_way));
						out_one = false;
					}
					else
					{
						//If we're on one of our last two towers, we can go inward rather than outward.
						if(ttp >= towerpositions.length - 2 && !in_one)
						{
							which_way = which_way * -1;
						}

						path_end = Game.rooms[room_name].getPositionAt(path_end.x - (tempTestOffset[0] * which_way), path_end.y - (tempTestOffset[1] * which_way));

						if(ttp >= towerpositions.length - 2 && !in_one)
						{
							which_way = which_way * -1;
							in_one = true;

							//Test one more out to see if this tower is hugging a wall.
							if (terrain.get(path_end.x - (tempTestOffset[0] * which_way), path_end.y - (tempTestOffset[1] * which_way)) === TERRAIN_MASK_WALL)
							{
								which_way = which_way * -1;	//Permanently move inward.
							}
						}
					}
					ttp = 0;
				}

				if (ttp === towerpositions.length - 1 && once_more)
				{
					ttp = 0;
					once_more = false;
				}
			}
			//console.log(JSON.stringify(path_begin + ' ' + path_end));

			//Now let's generate a path for our builders to patrol across.
			//We're doing this here so we can borrow the offset stuff.

			//Now get the path.
			let temp_stones = false;
			let stone_hugs = {};
			let our_towers = [];	//Towers belonging to this particular exit.
			let this_cost;			//The costmatrix for this path.

			defensepath[e] = path_begin.findPathTo(path_end,
			{plainCost: 20, swampCost: 20, ignoreCreeps: true, ignoreRoads: true, ignoreDestructibleStructures: true, maxRooms: 1,
				costCallback: function(roomName, costMatrix)
				{
					let temptower = {};
					//Record our towers in [x][y] format for easy referencing.
					for (t = 0; t < towerpositions.length; t++)
					{
						if (!temptower[towerpositions[t].x])
						{
							temptower[towerpositions[t].x] = {};
						}
						temptower[towerpositions[t].x][towerpositions[t].y] = true;
					}

					//Go along the same line as our towers.
					for (ep = 0; ep < Memory.rooms[room_name].exits[e].length; ep++)
					{
						//Don't accidentally lower the cost of walls.
						if (temp_terrain.get(Memory.rooms[room_name].exits[e][ep].x + offset[0], Memory.rooms[room_name].exits[e][ep].y + offset[1]) !== TERRAIN_MASK_WALL)
						{
							//If we are on a tower, we should mark the tile next to it instead.
							//console.log(JSON.stringify(temptower));
							//console.log(JSON.stringify((Memory.rooms[room_name].exits[e][ep].x + offset[0]) + ' ' + (Memory.rooms[room_name].exits[e][ep].y + offset[1])));
							if (temptower[Memory.rooms[room_name].exits[e][ep].x + offset[0]] && temptower[Memory.rooms[room_name].exits[e][ep].x + offset[0]][Memory.rooms[room_name].exits[e][ep].y + offset[1]])
							{
								//The tower belongs to this exit.
								our_towers.push({x: Memory.rooms[room_name].exits[e][ep].x + offset[0], y: Memory.rooms[room_name].exits[e][ep].y + offset[1], touched: false});

								let inner_offset = [0, 0];
								if (offset[0] == 0)
								{
									if (offset[1] == 5)	//It's northern.
									{
										inner_offset[1]++;
									}
									else if (offset[1] == -5)	//It's southern.
									{
										inner_offset[1]--;
									}
								}
								else if (offset[1] == 0)
								{
									if (offset[0] == 5)	//It's western.
									{
										inner_offset[0]++;
									}
									else if (offset[0] == -5)	//It's eastern.
									{
										inner_offset[0]--;
									}
								}

								//Here we mark one point inward for ease of passage.
								if (Game.rooms[room_name].getTerrain().get(Memory.rooms[room_name].exits[e][ep].x + offset[0] + inner_offset[0], Memory.rooms[room_name].exits[e][ep].y + offset[1] + inner_offset[1]) !== TERRAIN_MASK_WALL)
								{
									costMatrix.set(Memory.rooms[room_name].exits[e][ep].x + offset[0] + inner_offset[0], Memory.rooms[room_name].exits[e][ep].y + offset[1] + inner_offset[1], 1);
								}
								else if (!temp_stones
									|| !temp_stones[Memory.rooms[room_name].exits[e][ep].x + offset[0] + inner_offset[0]]
									|| !temp_stones[Memory.rooms[room_name].exits[e][ep].x + offset[0] + inner_offset[0]][Memory.rooms[room_name].exits[e][ep].y + offset[1] + inner_offset[1]])
								{
									//We found an unrecorded wall. Now record every edge wall in that formation.
									temp_stones = calculate.findouterstone(room_name, Memory.rooms[room_name].exits[e][ep].x + offset[0] + inner_offset[0], Memory.rooms[room_name].exits[e][ep].y + offset[1] + inner_offset[1], temp_stones)
								}
							}
							else
							{
								//Mark this line as all 1. The towers will be ruled out after.
								costMatrix.set(Memory.rooms[room_name].exits[e][ep].x + offset[0], Memory.rooms[room_name].exits[e][ep].y + offset[1], 1);
							}
						}
						else if (!temp_stones
							|| !temp_stones[Memory.rooms[room_name].exits[e][ep].x + offset[0]]
							|| !temp_stones[Memory.rooms[room_name].exits[e][ep].x + offset[0]][Memory.rooms[room_name].exits[e][ep].y + offset[1]])
						{
							//We found an unrecorded wall. Now record every edge wall in that formation.
							temp_stones = calculate.findouterstone(room_name, Memory.rooms[room_name].exits[e][ep].x + offset[0], Memory.rooms[room_name].exits[e][ep].y + offset[1], temp_stones)
						}
					}

					//Prefer to hug natural walls.
					if (temp_stones)
					{
						stone_hugs = calculate.hugwalls(room_name, temp_stones);
						for (let x in stone_hugs)
						{
							for (let y in stone_hugs[x])
							{
								if (!costMatrix.get(x, y))
								{
									costMatrix.set(x, y, 5);
								}
							}
						}
					}

					//Go around our towers.
					for (t = 0; t < towerpositions.length; t++)
					{
						costMatrix.set(towerpositions[t].x, towerpositions[t].y, 255);
					}
					//Go around our walls.
					for (w = 0; w < Memory.rooms[room_name].defense.walls.length; w++)
					{
						costMatrix.set(Memory.rooms[room_name].defense.walls[w].x, Memory.rooms[room_name].defense.walls[w].y, 255);
					}

					//But prefer to hug the walls.
					//We aren't going over the same line as the towers here. That will be before our "go around our towers" to ensure that that 255 sticks.
					/*for (let tp = 1; tp < 8; tp++)
					{
						for (let o = 0; o < offset.length; o++)
						{
							if (offset[o] > 0)
							{
								offset[o]++;
							}
							else if (offset[o] < 0)
							{
								offset[o]--;
							}
						}
						for (ep = 0; ep < Memory.rooms[room_name].exits[e].length; ep++)
						{
							//Avoid our walls. Make sure not to lower the cost on natural walls.
							if (defender.inwalls(Memory.rooms[room_name].exits[e][ep].x + offset[0], Memory.rooms[room_name].exits[e][ep].y + offset[1], room_name))
							{
								//console.log(thisx + " " + thisy);
								costMatrix.set(Memory.rooms[room_name].exits[e][ep].x + offset[0], Memory.rooms[room_name].exits[e][ep].y + offset[1], 255);
							}
							else if (terrain.get(Memory.rooms[room_name].exits[e][ep].x + offset[0], Memory.rooms[room_name].exits[e][ep].y + offset[1]) != 1)
							{
								//We're coaxing the path to hug the wall by making each layer progressively more expensive.
								costMatrix.set(Memory.rooms[room_name].exits[e][ep].x + offset[0], Memory.rooms[room_name].exits[e][ep].y + offset[1], 3 + (tp * 8));
								//console.log((Memory.rooms[room_name].exits[e][ep].x + offset[0]) + " " + (Memory.rooms[room_name].exits[e][ep].y + offset[1]) + " " + (3 + (tp * 2)));
								if (ep == 0)
								{
									costMatrix.set(Memory.rooms[room_name].exits[e][ep].x + offset[0] + tempPoffset[2], Memory.rooms[room_name].exits[e][ep].y + offset[1] + tempPoffset[3], 3 + (tp * 8));
									//console.log((Memory.rooms[room_name].exits[e][ep].x + offset[0] + tempPoffset[2]) + " " + (Memory.rooms[room_name].exits[e][ep].y + offset[1] + tempPoffset[3]) + " " + (3 + (tp * 2)));
								}
								else if (ep == Memory.rooms[room_name].exits[e].length - 1)
								{
									if (offset[0] == 0)
									{
										//tempPoffset[0]++;	//If we're horizontal, we increased our X bound temporarily.
									}
									else if (offset[1] == 0)
									{
										//tempPoffset[1]++;	//If we're vertical, we increased our Y bound temporarily.
									}
									costMatrix.set(Memory.rooms[room_name].exits[e][ep].x + offset[0] + Math.abs(tempPoffset[2]), Memory.rooms[room_name].exits[e][ep].y + offset[1] + Math.abs(tempPoffset[3]), 3 + (tp * 8));
									//console.log((Memory.rooms[room_name].exits[e][ep].x + offset[0] + Math.abs(tempPoffset[2])) + " " + (Memory.rooms[room_name].exits[e][ep].y + offset[1] + Math.abs(tempPoffset[3])) + " " + (3 + (tp * 2)));
								}
							}
						}
					}*/
					this_cost = costMatrix.clone();
				}
			});
			defensepath[e].unshift({x: path_begin.x, y: path_begin.y, dx: defensepath[e][0].dx, dy: defensepath[e][0].dy, direction: defensepath[e][0].direction});

			//Now check to see if we missed any towers.
			for (let f = 0; f < defensepath[e].length; f++)
			{
				for (let xt = -1; xt < 2; xt++)
				{
					for (let yt = -1; yt < 2; yt++)
					{
						for (let tt = 0; tt < our_towers.length; tt++)
						{
							if (defensepath[e].x + xt === our_towers[tt].x && defensepath[e].y + yt === our_towers[tt].y)
							{
								our_towers[tt].touched = true;
							}
						}
					}
				}
			}

			//If we found any untouched towers, redo the path, but this time touching every tower.
			/*for ()	//If we're going to try shifting the tower a couple of spaces, we don't need this. If that still fails, then it should just be re-placed somewhere else anyway.
			{
				
			}*/

			//Now get the return path. We can just base it on the original while flipping its directional values.
			dreturn[e] = [];
			for (let d = defensepath[e].length - 1; d >= 0; d--)
			{
				dreturn[e].push(
				{
					x: defensepath[e][d].x,
					y: defensepath[e][d].y
				});
				if (dreturn[e].length == 1)
				{
					dreturn[e][dreturn[e].length - 1].dx = defensepath[e][d].dx === 0 ? 0 : -defensepath[e][d].dx;	//If it's not 0, negate it.
					dreturn[e][dreturn[e].length - 1].dy = defensepath[e][d].dy === 0 ? 0 : -defensepath[e][d].dy;	//If it's not 0, negate it.
					dreturn[e][dreturn[e].length - 1].direction = defensepath[e][d].direction + 4;
					if (dreturn[e][dreturn[e].length - 1].direction > 8)
					{
						dreturn[e][dreturn[e].length - 1].direction -= 8;
					}
				}
				else
				{
					dreturn[e][dreturn[e].length - 1].dx = dreturn[e][dreturn[e].length - 1].x - dreturn[e][dreturn[e].length - 2].x;
					dreturn[e][dreturn[e].length - 1].dy = dreturn[e][dreturn[e].length - 1].y - dreturn[e][dreturn[e].length - 2].y;
					dreturn[e][dreturn[e].length - 1].direction = Game.rooms[room_name]
						.getPositionAt(dreturn[e][dreturn[e].length - 2].x, dreturn[e][dreturn[e].length - 2].y)
						.getDirectionTo(dreturn[e][dreturn[e].length - 1].x, dreturn[e][dreturn[e].length - 1].y);
				}
			}
		}

		Memory.rooms[room_name].defense.towers = towerpositions;
		Memory.rooms[room_name].defense.patrol = defensepath;
		Memory.rooms[room_name].defense.preturn = dreturn;
		return true;	//We made it this far without any errors.
	},

	inwalls: function(x, y, room_name, terrain = false)
	{
		if (x == 0 || x == 49 || y == 0 || y == 49)
		{
			return false;
		}

		if (terrain && terrain.get(x, y) == 1)
		{
			return true;
		}

		walls = Memory.rooms[room_name].defense.walls;
		for (let w = 0; w < walls.length; w++)
		{
			if (x == walls[w].x && y == walls[w].y)
			{
				return true;
			}
		}
		return false;
	},

	outofreach: function(room_name)
	{
		if (!room_name)
		{
			for (let room_name in Memory.rooms)
			{
				defender.outofreach(room_name);
			}
			return true;
		}

		//If we start with the assumption that they are not reachable, we can flip the ones that are.
		let wallflags = [];
		let walls = [];

		//We need position objects to work with.
		for (let w = 0; w < Memory.rooms[room_name].defense.walls.length; w++)
		{
			walls.push(Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].defense.walls[w].x, Memory.rooms[room_name].defense.walls[w].y));
		}

		//Let's iterate every defense path and determine which walls are out of reach.
		let foundwalls;
		let tpatrol;
		for (let d = 0; d < Memory.rooms[room_name].defense.patrol.length; d++)
		{
			if (!Memory.rooms[room_name].defense.patrol[d])
			{
				continue;
			}

			for (let p = 0; p < Memory.rooms[room_name].defense.patrol[d].length; p++)
			{
				tpatrol = Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].defense.patrol[d][p].x, Memory.rooms[room_name].defense.patrol[d][p].y);
				foundwalls = tpatrol.findInRange(walls, 3);

				for (let f = 0; f < foundwalls.length; f++)
				{
					foundwalls[f].found = true;
					//console.log(JSON.stringify(foundwalls[f]));
				}
			}
		}

		//console.log(JSON.stringify(walls));
		//Now let's weed out the found ones until we're left with the walls we can't reach.
		Memory.rooms[room_name].defense.farwalls = [];
		for (let w = 0; w < walls.length; w++)
		{
			if (!walls[w].found)
			{
				//console.log(JSON.stringify(walls[w]));
				Memory.rooms[room_name].defense.farwalls.push({x: walls[w].x, y: walls[w].y});
			}
		}

		return true;	//We made it this far without any errors.
	},

	/*manualpath: function(exit, positions = false)
	{
		if (!positions)
		{
			positions = [];
			//If no positions are specified, we'll use flags.
			for (let flag in Game.flags)
			{
				if (flag.name.indexOf("dpath".toLowerCase()) != -1)
				{
					positions.push(flag.pos);
				}
			}
		}

		//Now build our path.
	},*/

	clean: function(room_name)
	{
		delete Memory.rooms[room_name].defense.towers;
		delete Memory.rooms[room_name].defense.patrol;
		return true;
	}
};

module.exports = defender;