var defender =
{
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
			//Instead of the source itself, we need to get the end of the mining path, since that's a junction point for many other paths.
			sourcepos.push(Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].sources[i].mine.slice(-1)[0].x, Memory.rooms[room_name].sources[i].mine.slice(-1)[0].y));
		}

		//Get position objects for each step in our patrol paths.
		for (let p = 0; p < Memory.rooms[room_name].defense.patrol.length; p++)
		{
			destpath[p] = [];
			for (let n = 0; n < Memory.rooms[room_name].defense.patrol[p].length; n++)
			{
				destpath[p].push(Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].defense.patrol[p][n].x, Memory.rooms[room_name].defense.patrol[p][n].y));
			}
		}

		//Get paths from each source to each patrol path.
		for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
		{
			//topaths[i] = [];
			Memory.rooms[room_name].sources[i].defpaths = [];
			Memory.rooms[room_name].sources[i].dreturn = [];
			for (let e = 0; e < Memory.rooms[room_name].exits.length; e++)
			{
				//Get our path from source to the patrol path.
				//topaths[i][e] = [];
				Memory.rooms[room_name].sources[i].defpaths[e] =
					sourcepos[i].findPathTo(sourcepos[i].findClosestByPath(destpath[e],
					{plainCost: 2, swampCost: 2, ignoreCreeps: true, ignoreRoads: true, maxRooms: 1, costCallback:
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

								//But avoid the mining fatties.
								costMatrix.set(Memory.rooms[room_name].sources[i2].mfat.x, Memory.rooms[room_name].sources[i2].mfat.y, 255);

								//Avoid the extensions as well.
								for (let ex = 0; ex < Memory.rooms[room_name].sources[i2].buildings.extensions.length; ex++)
								{
									costMatrix.set(Memory.rooms[room_name].sources[i2].buildings.extensions[ex].x, Memory.rooms[room_name].sources[i2].buildings.extensions[ex].y, 255);
								}
							}
						}}),
					{plainCost: 2, swampCost: 2, ignoreCreeps: true, ignoreRoads: true, maxRooms: 1, costCallback:
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

								//But avoid the mining fatties.
								costMatrix.set(Memory.rooms[room_name].sources[i].mfat.x, Memory.rooms[room_name].sources[i2].mfat.y, 255);

								//Avoid the extensions as well.
								for (let ex = 0; ex < Memory.rooms[room_name].sources[i2].buildings.extensions.length; ex++)
								{
									costMatrix.set(Memory.rooms[room_name].sources[i2].buildings.extensions[ex].x, Memory.rooms[room_name].sources[i2].buildings.extensions[ex].y, 255);
								}
							}
						}});

				//Now return.
				Memory.rooms[room_name].sources[i].dreturn[e] = Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].sources[i].defpaths[e].slice(-1)[0].x, Memory.rooms[room_name].sources[i].defpaths[e].slice(-1)[0].y)
					.findPathTo(sourcepos[i].x, sourcepos[i].y,
					{plainCost: 5, swampCost: 5, ignoreCreeps: true, ignoreRoads: true, maxRooms: 1, costCallback:
						function(roomName, costMatrix)
						{
							//Return over the same path we came from.
							for (n = 0; n < Memory.rooms[room_name].sources[i].defpaths[e].length; n++)
							{
								costMatrix.set(Memory.rooms[room_name].sources[i].defpaths[e][n].x, Memory.rooms[room_name].sources[i].defpaths[e][n].y, 1);
							}
						}
					});
			}
			//console.log(JSON.stringify(topaths[i]));
		}

		//Now mark the walls that are unreachable from the patrol paths.
		defender.outofreach(room_name);

		//We have a limited amount of containers, so we can't make them a critical requirement of a defense.
		//Maybe at a higher room level we can replace containers with links and shift containers to defenses. Or maybe we can use minimal links in-base and put links on defenses.

		return true;	//We made it this far without any errors.
	},

	checkDefense: function(room_name = false, stage = 2)
	{
		if (!room_name)
		{
			for (let room_name in Memory.rooms)
			{
				defender.checkDefense(room_name);
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
		let ramparts = [];
		let temppath;	//This will juggle stuff, but then it will become an index.
		let epkeys = Object.keys(Memory.rooms[room_name].exitpaths);
		for (let e = 0; e < Memory.rooms[room_name].exits.length; e++)
		{
			walls[e] = [];
			ramparts[e] = [];
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
				closest = temppath.findClosestByRange(exittiles);
				//If the last step of the path is resting on the closest exit tile, we've found a path that leads to this exit.
				if (closest.isEqualTo(temppath))
				{
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
						//console.log(found);
						break;
					}
				}

				tile = Game.rooms[room_name].lookForAt(LOOK_STRUCTURES, walls[e][w].x, walls[e][w].y);
				//Find empty spaces.
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
					return true;
				}
				else if (!finished)	//If there's no wall or construction site, build a construction site.
				{
					//console.log("!Finished");
					//Now let's see if it should be a rampart.
					let rampart = false;
					let tempposition = Game.rooms[room_name].getPositionAt(walls[e][w].x, walls[e][w].y);
					if (temppath >= 0)
					{
						//We've already determined that this path leads to this exit. Now we need to match our wall to it.
						for (let n = Memory.rooms[room_name].exitpaths[epkeys[temppath]].length -1; n >= 0; n--)
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
						}
					}

					//We only need one layer of rampart.
					if (rampart && stage == 2)
					{
						Game.rooms[room_name].createConstructionSite(walls[e][w].x, walls[e][w].y, STRUCTURE_RAMPART);
						Memory.rooms[room_name].defense.need = e;
						//console.log("Ramp: " + walls[e][w].x + ", " + walls[e][w].y);
						built = true;
					}
					else if (!rampart)
					{
						Game.rooms[room_name].createConstructionSite(walls[e][w].x, walls[e][w].y, STRUCTURE_WALL);
						Memory.rooms[room_name].defense.need = e;
						//console.log("Wall: " + walls[e][w].x + ", " + walls[e][w].y);
						built = true;
					}
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

				if (e == lastexit && w == lastwall && stage < 4)
				{
					if (built)
					{
						Memory.rooms[room_name].defense.checkagain = true;
					}
					if (!built || finished)
					{
						//If we've completed this stage, go to the next stage.
						defender.checkDefense(room_name, stage + 1);
					}

					return true;	//We made it this far without any errors.
				}
			}
		}
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
			let assignedtowers = 0;
			let offset;				//Offset by 5 depending on axis. This is to place our towers on the correct side of the wall.
			let toffset = [0, 0];	//Offset by an incrementing amount backwards and forwards. This is to spread our towers evenly along the wall.

			//First we need to determine what type of exit it is.
			if (Memory.rooms[room_name].exits[e][0].y == 0)			//Is it northern?
			{
				offset = [0, 5];
			}
			else if (Memory.rooms[room_name].exits[e][0].x == 49)	//Is it eastern?
			{
				offset = [-5, 0];
			}
			else if (Memory.rooms[room_name].exits[e][0].y == 49)	//Is it southern?
			{
				offset = [0, -5];
			}
			else if (Memory.rooms[room_name].exits[e][0].x == 0)	//Is it western?
			{
				offset = [5, 0];
			}

			//We might need to place up to 6 towers.
			//They should be assigned from the center of the exit, spreading outward. This could be accomplished by spreading them out evenly.
			let spread = Math.ceil(Memory.rooms[room_name].exits[e].length / towers[e]);
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

			let startcoord = {x: Memory.rooms[room_name].exits[e][Math.ceil(Memory.rooms[room_name].exits[e].length / 2) - 1].x, y: Memory.rooms[room_name].exits[e][Math.ceil(Memory.rooms[room_name].exits[e].length / 2) - 1].y}
			let tempcoord;
			let failsafe = [false, false];
			let thisx;
			let thisy;
			while (assignedtowers < towers[e] && (!failsafe[0] || !failsafe[1]))
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
					failsafe[0] = true;
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
					if (terrain.get(thisx, thisy) != 1 && !defender.inwalls(thisx, thisy, room_name, terrain))
					{
						towerpositions.push({x: thisx, y: thisy});
						assignedtowers++;
					}
					else
					{
						failsafe[1] = true;
					}
				}

				toffset[0] -= spread;
				toffset[1] += spread;
			}

			//Now let's generate a path for our builders to patrol across.
			//We're doing this here so we can borrow the offset stuff.

			//We're getting a path from one end of the exit to the other, with our offset factored in.
			let tempPoffset = [0, 0, 0, 0];
			if (offset[0] == 0)
			{
				tempPoffset[0] -= 2;	//If we're horizontal, we're gonna increase our X bound temporarily.
				tempPoffset[2]--;
			}
			else if (offset[1] == 0)
			{
				tempPoffset[1] -= 2;	//If we're vertical, we're gonna increase our Y bound temporarily.
				tempPoffset[3]--;
			}
			defensepath[e] = Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].exits[e][0].x + offset[0] + tempPoffset[0], Memory.rooms[room_name].exits[e][0].y + offset[1] + tempPoffset[1])
			.findPathTo(Memory.rooms[room_name].exits[e][Memory.rooms[room_name].exits[e].length - 1].x + offset[0] + Math.abs(tempPoffset[2]),
						Memory.rooms[room_name].exits[e][Memory.rooms[room_name].exits[e].length - 1].y + offset[1] + Math.abs(tempPoffset[3]),
			{plainCost: 5, swampCost: 5, ignoreCreeps: true, ignoreDestructibleStructures: true, maxRooms: 1,
				costCallback: function(roomName, costMatrix)
				{
					//Go along the same line as our towers.
					for (ep = 0; ep < Memory.rooms[room_name].exits[e].length; ep++)
					{
						//Mark this line as all 1. The towers will be ruled out after.
						costMatrix.set(Memory.rooms[room_name].exits[e][ep].x + offset[0], Memory.rooms[room_name].exits[e][ep].y + offset[1], 1);
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
					for (let tp = 0; tp < 8; tp++)
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
								costMatrix.set(Memory.rooms[room_name].exits[e][ep].x + offset[0], Memory.rooms[room_name].exits[e][ep].y + offset[1], 3 + (tp * 2));
								//console.log((Memory.rooms[room_name].exits[e][ep].x + offset[0]) + " " + (Memory.rooms[room_name].exits[e][ep].y + offset[1]) + " " + (3 + (tp * 2)));
								if (ep == 0)
								{
									costMatrix.set(Memory.rooms[room_name].exits[e][ep].x + offset[0] + tempPoffset[2], Memory.rooms[room_name].exits[e][ep].y + offset[1] + tempPoffset[3], 3 + (tp * 2));
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
									costMatrix.set(Memory.rooms[room_name].exits[e][ep].x + offset[0] + Math.abs(tempPoffset[2]), Memory.rooms[room_name].exits[e][ep].y + offset[1] + Math.abs(tempPoffset[3]), 3 + (tp * 2));
									//console.log((Memory.rooms[room_name].exits[e][ep].x + offset[0] + Math.abs(tempPoffset[2])) + " " + (Memory.rooms[room_name].exits[e][ep].y + offset[1] + Math.abs(tempPoffset[3])) + " " + (3 + (tp * 2)));
								}
							}
						}
					}
				}
			});

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

	manualpath: function(exit, positions = false)
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
	},

	clean: function(room_name)
	{
		delete Memory.rooms[room_name].defense.towers;
		delete Memory.rooms[room_name].defense.patrol;
		return true;
	}
};

module.exports = defender;