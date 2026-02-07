var body = require('body');

var calculate =
{
	extensions: {},
	spawns: {},
	sortedextensions: {},
	nuke: {},

	idealTransports: function(room)
	{
		//The highest energy this room can have.
		let max_energy = calculate.maximumEnergy(Game.rooms[room].controller.level);

		let bodyCount = {};		//How many BODY our fatties have at this level.
		let carryCount = {};	//How many CARRY our transports have at this level.

		//How long is each round trip between each source and its destinations?
		let roundTrip = [];
		let idealTransport = [];
		for (let s = 0; s < Memory.rooms[room].sources.length; s++)
		{
			roundTrip.push({miner: Memory.rooms[room].sources[s].mine.length + Memory.rooms[room].sources[s].mreturn.length - 1, upgrader: Memory.rooms[room].sources[s].upgrade.length + Memory.rooms[room].sources[s].ureturn.length - 2});
			if (Game.rooms[room].controller.level > 2)	//If we have more than 3 extensions on a source, we might need both paths now.
			{
				roundTrip[roundTrip.length - 1].miner += roundTrip[roundTrip.length - 1].upgrader;
			}

			idealTransport.push({miner: null, upgrader: null});	//We're doing this here so we can be agnostic of how many sources are in a room.
		}
		//console.log("Round Trip: " + JSON.stringify(roundTrip));

		//Figure out how many relevant parts are in each body based on our energy level. Then decide the ideal amount of transports for each destination.
		if (max_energy == 300)	//Generics are WORK, WORK, MOVE, CARRY.
		{
			bodyCount.miner = body.generic(max_energy).reduce(calculate.reduceManyWork, 0);
			bodyCount.upgrader = bodyCount.miner;
			carryCount.transport = body.generic(max_energy).reduce(calculate.reduceManyCarry, 0);
		}
		else
		{
			bodyCount.miner = body.fatty(max_energy, false).reduce(calculate.reduceManyWork, 0);
			bodyCount.upgrader = body.fatty(max_energy, true).reduce(calculate.reduceManyWork, 0);
			carryCount.transport = body.transport(max_energy, true).reduce(calculate.reduceManyCarry, 0);
		}
		//console.log("Body Count: " + JSON.stringify(bodyCount));
		//console.log("Carry Count: " +JSON.stringify(carryCount));

		//Now let's make our determination for each source.
		for (let s = 0; s < Memory.rooms[room].sources.length; s++)
		{
			for (let role in bodyCount)
			{
				 let ticksToFull = Math.floor((carryCount.transport * 50) / (bodyCount.miner * 2));	//We should be basing both transports on how much the miner can mine.
				 //console.log(ticksToFull);
				 idealTransport[s][role] = Math.ceil(roundTrip[s][role] / ticksToFull);
			}
		}

		//If we have a hybrid, that source doesn't need any upgrade transports.
		for (let s = 0; s < Memory.rooms[room].sources.length; s++)
		{
			if (Memory.rooms[room].sources[s].ideal.hybrid)
			{
				idealTransport[s].upgrader = undefined;
			}
		}

								//idealTransport[source][role]
		return idealTransport;	//We now know how many transports we need from each source servicing each role.
	},

	getExits: function(terrain, room_name)	//This takes a room-wide terrain object.
	{
		let exitcounter = -1;
		let currenttile = undefined;
		let lasttile = undefined;	//Was our last tile an exit space?
		let exits = [];
		let safe = [];	//We're juggling this a bit. It will end up in Memory.rooms[room_name].defense.safe.
		let flipper = [1, 0, 0];	//The first two modifies our x and y increment. The third is a flag.

		//Join flags flip the status of the tile.
		let joins = {};
		for (let flag in Game.flags)
		{
			if (flag.indexOf('Join') !== -1 && Game.flags[flag].pos.roomName === room_name)
			{
				calculate.mark_found(Game.flags[flag].pos.x, Game.flags[flag].pos.y, joins);
			}
		}

		for (let x = 0, y = 0; !(x == 0 && y == 49 && flipper[2] == 2); x += flipper[0], y += flipper[1])	//Go around the outside.
		{
			currenttile = terrain.get(x, y);

			//If it's a join, flip its status.
			if (calculate.check_xy(x, y, joins))
			{
				currenttile = 1 - currenttile;
			}

			if (currenttile === 0)	//We've found an empty tile.
			{
				if (lasttile === 1)	//Our previous tile was a wall. Therefore we have found a new exit.
				{
					exits.push([]);
					safe.push(false);
					exitcounter++;
				}

				exits[exitcounter].push({x: x, y: y});
				if (Game.rooms[room_name].lookForAt(LOOK_FLAGS, x, y).length > 0 && Game.rooms[room_name].lookForAt(LOOK_FLAGS, x, y)[0].name.indexOf('Safe') != -1)
				{
					safe[exitcounter] = true;
				}
			}
			lasttile = currenttile;

			if (x == 49 && y == 0)
			{
				flipper[0]--;	//x is 0 now.
				flipper[1]++;	//y is 1 now.
			}
			else if (y == 49 && x == 49 && flipper[2] == 0)
			{
				x = 0;
				flipper[0]++;	//x is 1 now.
				flipper[1]--;	//y is 0 now.
				flipper[2]++;
			}
			else if (y == 49 && x == 49 && flipper[2] == 1)
			{
				x = 0;
				y = 0;
				flipper[0]--;	//x is 0 now.
				flipper[1]++;	//y is 1 now.
				flipper[2]++;
			}
		}

		Memory.rooms[room_name].safe = safe;	//We're juggling this a bit. It will end up in Memory.rooms[room_name].defense.safe.
		return exits;
	},

	reversepath: function(path, trim_start = true, add_end = true)
	{
		let path2 = [];
		let tstep1;
		let tstep2

		//The first step of our reversal plays out differently than the rest.
		path2.push({x: path[path.length - 1].x, y: path[path.length - 1].y});

		path2[path2.length - 1].dx = path[path.length - 1].dx === 0 ? 0 : -path[path.length - 1].dx;	//If it's not 0, negate it.
		path2[path2.length - 1].dy = path[path.length - 1].dy === 0 ? 0 : -path[path.length - 1].dy;	//If it's not 0, negate it.
		path2[path2.length - 1].direction = path[path.length - 1].direction + 4;
		if (path2[path2.length - 1].direction > 8)
		{
			path2[path2.length - 1].direction -= 8;
		}

		//Reverse the rest of the path.
		for (let n = path.length - 2; n >= 0; n--)
		{
			path2.push({x: path[n].x, y: path[n].y});

			//Let's only look these up once.
			tstep1 = path2[path2.length - 1];
			tstep2 = path2[path2.length - 2]

			tstep1.dx = tstep1.x - tstep2.x;
			tstep1.dy = tstep1.y - tstep2.y;

			tstep1.direction = calculate.dxdy_to_direction(tstep1.dx, tstep1.dy);
		}

		//A moveByPath() path normally excludes its own start point.
		if (trim_start)
		{
			path2.shift();
		}

		//Since the path we're reversing would have excluded its own start point, we have to step to it ourselves.
		if (add_end)
		{
			path2.push({x: null, y: null, dx: path[0].dx === 0 ? 0 : -path[0].dx, dy: path[0].dy === 0 ? 0 : -path[0].dy});

			path2[path2.length - 1].x = path2[path2.length - 2].x + path2[path2.length - 1].dx;
			path2[path2.length - 1].y = path2[path2.length - 2].y + path2[path2.length - 1].dy;
			path2[path2.length - 1].direction = calculate.dxdy_to_direction(path2[path2.length - 1].dx, path2[path2.length - 1].dy);
		}

		return path2;
	},

	close_loop: function(path1, path2)
	{
		//Alter the first step in each path so it completes the loop.
		tempPos = path1.slice(-1)[0];
		tempPos2 = path1.slice(0, 1)[0];

		path2[0].direction = calculate.orientation[path2.slice(0, 1)[0].x - tempPos.x][path2.slice(0, 1)[0].y - tempPos.y];
		path2[0].dx = path2.slice(0, 1)[0].x - tempPos.x;
		path2[0].dy = path2.slice(0, 1)[0].y - tempPos.y;

		path1[0].direction = calculate.orientation[tempPos2.x - path2[path2.length - 1].x][tempPos2.y - path2[path2.length - 1].y];
		path1[0].dx = tempPos2.x - path2[path2.length - 1].x;
		path1[0].dy = tempPos2.y - path2[path2.length - 1].y;
	},

	true_closest: function(start, positions, options)
	{
		if (!positions.length || !positions[0].x || !positions[0].y)
		{
			//If there's no positions to test, we can't get a closest position.
			return [];
		}
		else if (positions.length === 1)
		{
			//If there's only one position, it's the closest.
			return [new RoomPosition(positions[0].x, positions[0].y, start.roomName)];
		}

		let closest = [];
		let closestchosen;
		let shortest = Infinity;
		let shortest2 = Infinity;
		let test;
		let width;
		let height;

		//First record every length, tracking the shortest.
		for (let p = 0; p < positions.length; p++)
		{
			test = start.findPathTo(positions[p].x, positions[p].y, options).length;
			closest.push(test);

			if (test < shortest)
			{
				shortest = test;
			}
		}

		//Now process the true distance, but only of the shortest ones we found before.
		//The truly shortest we find should become a position.
		for (c = 0; c < positions.length; c++)
		{
			if (closest[c] === shortest)
			{
				width = Math.abs(start.x - positions[c].x);
				height = Math.abs(start.y - positions[c].y);
				test = (width * width) + (height * height);

				if (test < shortest2)
				{
					shortest2 = test;
					closestchosen = [new RoomPosition(positions[c].x, positions[c].y, start.roomName)];
				}
				else if (test === shortest2)
				{
					closestchosen.push(new RoomPosition(positions[c].x, positions[c].y, start.roomName));
				}
			}
		}

		//We're returning the array of chosen positions.
		//Whether there's one shortest or multiple of equal shortness, the receiving code must decide what to do with it then.
		return closestchosen;
	},

	dxdy_to_direction: function(dx, dy)
	{
		switch(dx)
		{
			case -1:	//We went left,
				switch(dy)
				{
					case -1:	//and up.
						return 8;
					case 0:		//and middle.
						return 7;
					case 1:		//and down.
						return 6;
				}
				break;

			case 0:		//We went middle.
				switch(dy)
				{
					case -1:	//and up.
						return 1;
					case 1:		//and down.
						return 5;
				}
				break;

			case 1:		//We went right.
				switch(dy)
				{
					case -1:	//and up.
						return 2;
					case 0:		//and middle.
						return 3;
					case 1:		//and down.
						return 4;
				}
		}
	},

	cleanpaths: function(room_name, type)	//We are renaming some of these paths slightly different, so pay attention.
	{
		let temppath;
		let dir;
		switch(type)
		{
			case 'all':
				Memory.rooms[room_name].path = undefined;
				calculate.cleanpaths(room_name, 'init');
				calculate.cleanpaths(room_name, 'defender');
				calculate.cleanpaths(room_name, 'empire');
				calculate.cleanpaths(room_name, 'labs');
				break;
			//Since moveByPath() compliant steps state the direction of move from the previous step, we will need to concatenate one step from the followup path to be sure of any direction changes.
			case 'init':
				//We need to do the room-wide one-time upgrade path, and the sources' mine, mreturn, upgrade, and ureturn.

				//Room-wide upgrade goes from source to the upgrader.
				temppath = Memory.rooms[room_name].upgrade;
				calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'upgrader', false, false, temppath);	//Room-wide and source-based must have different names now.

				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
				{
					//Only returning paths get a dir.
					//dir = Memory.rooms[room_name].sources[i].mreturn2;

					//Store clean steps needed for utransport and builder movenow[].
					let temp_mine = Memory.rooms[room_name].sources[i].mine.slice();
					temp_mine[0].direction = Memory.rooms[room_name].sources[i].minedir2;
					Memory.rooms[room_name].sources[i].mclean =
					{
						u: calculate.cleanthispath(temp_mine),
						b: calculate.cleanthispath(temp_mine)
					};
					for (let c in Memory.rooms[room_name].sources[i].mclean)
					{
						Memory.rooms[room_name].sources[i].mclean[c].pop();

						while (Memory.rooms[room_name].sources[i].mclean[c].length > 1
						&& Memory.rooms[room_name].sources[i].mclean[c][0].x == Memory.rooms[room_name].sources[i].mclean[c][1].x
						&& Memory.rooms[room_name].sources[i].mclean[c][0].y == Memory.rooms[room_name].sources[i].mclean[c][0].y)
						{
							Memory.rooms[room_name].sources[i].mclean[c].shift();
						}
					}

					let tempdefpaths = [];
					for (let e = 0; e < Memory.rooms[room_name].sources[i].defpaths.length; e++)
					{
						if (Memory.rooms[room_name].sources[i].defpaths[e])
						{
							tempdefpaths[e] = Memory.rooms[room_name].sources[i].defpaths[e];
						}
					}

					//Mine goes from spawn to source, then mreturn comes back.
					temppath = Memory.rooms[room_name].sources[i].mine;
					let tempupgrade = Memory.rooms[room_name].sources[i].upgrade.slice();
					if (tempupgrade[0])
					{
						tempupgrade[0].direction = Memory.rooms[room_name].sources[i].upgradedir2;
						calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'mine', i, false, temppath,
						{
							upgrade: tempupgrade,
							mreturn: Memory.rooms[room_name].sources[i].mreturn,
							mfat: Memory.rooms[room_name].sources[i].mfat,
							defpaths: tempdefpaths	//Mine can also go to defpaths[need].
						});
					}
					else
					{
						calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'mine', i, false, temppath,
						{
							mreturn: Memory.rooms[room_name].sources[i].mreturn,
							mfat: Memory.rooms[room_name].sources[i].mfat,
							defpaths: tempdefpaths	//Mine can also go to defpaths[need].
						});
					}
					temppath = Memory.rooms[room_name].sources[i].mreturn;
					dir = Memory.rooms[room_name].sources[i].mreturn[0].direction;	//Try without dir.
					calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'mreturn', i, false, temppath,
					{
						mine: Memory.rooms[room_name].sources[i].mine
					});
					//Mfat is the direction from the end of mine to the mining container.
					temppath = [Memory.rooms[room_name].sources[i].mine.slice(-1)[0], Memory.rooms[room_name].sources[i].mfat[0]];
					calculate.writethispath(room_name, calculate.cleanthispath(temppath, false), 'mfat', i, false, temppath);

					//Upgrade goes from source to the upgrader, then comes back to mine.
					if (tempupgrade[0])
					{
						temppath = Memory.rooms[room_name].sources[i].upgrade;
						calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'upgrade', i, false, temppath,
						{
							ureturn: Memory.rooms[room_name].sources[i].ureturn
						});
						dir = Memory.rooms[room_name].sources[i].ureturn[0].direction;
						temppath = Memory.rooms[room_name].sources[i].ureturn;		//Try without dir.
						calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'ureturn', i, false, temppath,
						{
							upgrade: tempupgrade,
							mreturn: Memory.rooms[room_name].sources[i].mreturn,
							defpaths: tempdefpaths	//Ureturn can also go to defpaths[need].
						});
					}
				}

				break;

			case 'defender':
				//We need to do the roomwide defense path to each exit, and the sources' defpaths and dreturn to each exit.
				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
				{
					//Only returning paths get a dir.
					//dir = Memory.rooms[room_name].sources[i].mreturn2;

					let tempdefpaths = [];
					for (let e = 0; e < Memory.rooms[room_name].sources[i].defpaths.length; e++)
					{
						if (Memory.rooms[room_name].sources[i].defpaths[e])
						{
							tempdefpaths[e] = Memory.rooms[room_name].sources[i].defpaths[e];
						}
					}

					//Mine can also go to defpaths[need].
					/*temppath = Memory.rooms[room_name].sources[i].mine;
					calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'mine', i, false, temppath,
					{
						defpaths: tempdefpaths
					});

					//Ureturn can also go to defpaths[need].
					temppath = Memory.rooms[room_name].sources[i].ureturn;
					dir = Memory.rooms[room_name].sources[i].ureturn[0].direction;	//Try without dir.
					calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'ureturn', i, false, temppath,
					{
						defpaths: tempdefpaths
					});*/

					//Store clean steps needed for utransport and builder movenow[].
					let temp_mine = Memory.rooms[room_name].sources[i].mine.slice();
					temp_mine[0].direction = Memory.rooms[room_name].sources[i].minedir2;
					Memory.rooms[room_name].sources[i].mclean.d = {};

					for (let e = 0; e < Memory.rooms[room_name].sources[i].defpaths.length; e++)
					{
						if (!Memory.rooms[room_name].sources[i].defpaths[e] || !Memory.rooms[room_name].sources[i].dreturn[e])
						{
							continue;	//Some of the defpaths are empty.
						}

						//Store clean steps needed for builder movenow[].
						Memory.rooms[room_name].sources[i].mclean.d[e] = calculate.cleanthispath(temp_mine.concat(Memory.rooms[room_name].sources[i].defpaths[e][0]));

						while (Memory.rooms[room_name].sources[i].mclean.d[e].length > 1
						&& Memory.rooms[room_name].sources[i].mclean.d[e][0].x == Memory.rooms[room_name].sources[i].mclean.d[e][1].x
						&& Memory.rooms[room_name].sources[i].mclean.d[e][0].y == Memory.rooms[room_name].sources[i].mclean.d[e][1].y)
						{
							Memory.rooms[room_name].sources[i].mclean.d[e].shift();
						}

						temppath = Memory.rooms[room_name].sources[i].defpaths[e];
						//The flipper from defpaths to the patrol paths can cross at any point.
						//Therefore this flipper must be constructed dynamically.
						let temp = {patrol: Memory.rooms[room_name].defense.patrol[e].slice(), preturn:Memory.rooms[room_name].defense.preturn[e].slice()};
						for (let temp_patrol in temp)
						{
							
							for (let p = 0; p < temp[temp_patrol].length; p++)
							{
								//Match a step of the patrol path to the last step of defpaths.
								if (temp[temp_patrol][p].x === temppath[temppath.length - 1].x && temp[temp_patrol][p].y === temppath[temppath.length - 1].y)
								{
									//If we found a match, we need to manipulate the flipper into pointing the way it should go.
									let temp_new_obj = {};	//We need a new object because slice doesn't work. It slices the array of object references, which still manipulates the original object.
									if (p < temp[temp_patrol].length - 1)
									{
										for (let newobj in temp[temp_patrol][0])
										{
											if (newobj === 'direction')
											{
												temp_new_obj[newobj] = temp[temp_patrol][p + 1][newobj];
											}
											else
											{
												temp_new_obj[newobj] = temp[temp_patrol][0][newobj];
											}
										}
									}
									else
									{
										//If we're at the end of this path, we need to loop around.
										//These work because the first step was already going in the direction of the second step.
										//Alternatively, you could use the second step.
										for (let newobj in temp[temp_patrol][0])
										{
											switch (temp_patrol)
											{
												case 'patrol':													
													if (newobj === 'direction' && p < temp.preturn.length - 1)
													{
														temp_new_obj[newobj] = temp.preturn[p + 1][newobj];
													}
													else
													{
														temp_new_obj[newobj] = temp.preturn[0][newobj];
													}
													break;
												case 'preturn':
													if (newobj === 'direction' && p < temp.patrol.length - 1)
													{
														temp_new_obj[newobj] = temp.patrol[p + 1][newobj];
													}
													else
													{
														temp_new_obj[newobj] = temp.patrol[0][newobj];
													}
													break;
											}
										}
									}
									temp[temp_patrol][0] = temp_new_obj;
								}
							}
						}

						//The sources' defpaths to each exit.																				//A matching dreturn for every defpath is a safe assumption.
						calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'defpaths', i, e, temppath,
						{
							dreturn: Memory.rooms[room_name].sources[i].dreturn[e],
							patrol: temp.patrol,
							preturn: temp.preturn
						});
						dir = Memory.rooms[room_name].sources[i].defpaths[e][0].direction;
						//tempdefpaths = [];
						//tempdefpaths[e] = Memory.rooms[room_name].sources[i].defpaths[e];
						temppath = Memory.rooms[room_name].sources[i].dreturn[e];		//Try without dir.
						calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'dreturn', i, e, temppath,
						{
							upgrade: Memory.rooms[room_name].sources[i].upgrade,
							mreturn: Memory.rooms[room_name].sources[i].mreturn,
							defpaths: tempdefpaths
						});
						/*else
						{
							temppath = Memory.rooms[room_name].sources[i].defpaths[e];
							calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'defpath', i, e, temppath,
							{
								dreturn: Memory.rooms[room_name].sources[i].dreturn[e],
								//patrol: Memory.rooms[room_name].defense.patrol[e],
								//preturn: Memory.rooms[room_name].defense.preturn[e]
							});
							dir = Memory.rooms[room_name].sources[i].defpaths[e][0].direction;
							tempdefpaths = [];
							tempdefpaths[e] = Memory.rooms[room_name].sources[i].defpaths[e];
							temppath = Memory.rooms[room_name].sources[i].dreturn[e];		//Try without dir.
							calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'dreturn', i, e, temppath,
							{
								upgrade: Memory.rooms[room_name].sources[i].upgrade,
								mreturn: Memory.rooms[room_name].sources[i].mreturn,
								defpaths: tempdefpaths
							});
						}*/
					}
				}

				for (let e = 0; e < Memory.rooms[room_name].defense.patrol.length; e++)
				{
					if (!Memory.rooms[room_name].defense.patrol[e] || !Memory.rooms[room_name].defense.preturn[e])
					{
						continue;	//Some of the patrols are empty.
					}

					//The room-wide patrol paths for each exit.																				//A matching preturn for every patrol is a safe assumption.
					//console.log(room_name + ' Pat: e: ' + e);
					temppath = Memory.rooms[room_name].defense.patrol[e];
					calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'patrol', false, e, temppath,
					{
						preturn: Memory.rooms[room_name].defense.preturn[e]
					});
					temppath = Memory.rooms[room_name].defense.preturn[e];
					dir = Memory.rooms[room_name].defense.patrol[e][0].direction;		//Without dir?
					calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'preturn', false, e, temppath,
					{
						patrol: Memory.rooms[room_name].defense.patrol[e]
					});
				}
				
				break;

			case 'empire':
				//We need to do the roomwide exitpaths and exitreturn to each adjacent accessible room.
				for (let e in Memory.rooms[room_name].exitpaths)
				{																															//A matching exitreturn for every exitpath is a safe assumption.
					temppath = Memory.rooms[room_name].exitpaths[e];
					calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'exitpath', false, e, temppath,
					{
						exitpaths: Memory.rooms[room_name].exitreturn[e]
					});
					temppath = Memory.rooms[room_name].exitreturn[e];
					dir = Memory.rooms[room_name].exitpaths[e][0].direction;		//Without dir?
					calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'exitreturn', false, e, temppath,
					{
						exitreturn: Memory.rooms[room_name].exitpaths[e]
					});
				}
				break;

			case 'labs':
				//We need to do the path to and from the lab stamp.
				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
				{
					temppath = Memory.rooms[room_name].sources[i].labs;
					calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'labs', i, false, temppath,
					{
						lreturn: Memory.rooms[room_name].sources[i].lreturn
					});
					dir = Memory.rooms[room_name].sources[i].lreturn[0].direction;
					temppath = Memory.rooms[room_name].sources[i].lreturn;	//Try without dir.
					calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'lreturn', i, false, temppath,
					{
						labs: Memory.rooms[room_name].sources[i].labs
					});

					//We need a mine flipper on this as well.
					temppath = temppath.slice(-1)[0];
					Memory.rooms[room_name].path[temppath.x][temppath.y].flipper.mine[i].labs = Memory.rooms[room_name].path[temppath.x][temppath.y].flipper.lreturn[i].labs;
				}

				//We need to do the path through the lab stamp as well.
				//First mark a direction from any untouched spawns.
				for (let sp = 0, tpos, dxdy, path = Memory.rooms[room_name].path; sp < 2; sp++)
				{
					dxdy = calculate.dxdy[Memory.rooms[room_name].spawns[sp].dir.labdir];
					tpos = {x: Memory.rooms[room_name].spawns[sp].x + dxdy.dx, y: Memory.rooms[room_name].spawns[sp].y + dxdy.dy};

					if (!path[tpos.x])
					{
						path[tpos.x] = {};
					}
					if (!path[tpos.x][tpos.y])
					{
						path[tpos.x][tpos.y] = {};
					}

					path[tpos.x][tpos.y].epath = Memory.rooms[room_name].spawns[sp].dir.cdir;	//This will get us onto the path if our spawn doesn't touch the path.
					Memory.rooms[room_name].spawns[sp].dir.cdir = undefined;	//Once it's been marked onto our path[x][y], we don't need to save it anymore.
				}

				//Now do the path from spawn to stamp.
				temppath = Memory.rooms[room_name].mine.epath;
				calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'epath', false, false, temppath,
				{
					ereturn: Memory.rooms[room_name].mine.ereturn,
					efat: Memory.rooms[room_name].mine.efat
				});
				//Back from the stamp to the spawn.
				dir = Memory.rooms[room_name].mine.ereturn[0].direction;
				temppath = Memory.rooms[room_name].mine.ereturn;	//Try without dir.
				calculate.writethispath(room_name, calculate.cleanthispath(temppath), 'ereturn', false, false, temppath,
				{
					epath: Memory.rooms[room_name].mine.epath
				});
				//Efat is the direction from the end of epath to the extraction container.
				temppath = [Memory.rooms[room_name].mine.epath.slice(-1)[0], Memory.rooms[room_name].mine.efat[0]];
				calculate.writethispath(room_name, calculate.cleanthispath(temppath, false), 'efat', false, false, temppath);
				break;
		}

		return true;
	},

	cleanthispath: function(path, dir = false)	//If it's not false, it's a returning path taking the outbound path's last known direction. This handles cases where the start of the return path is still the same direction.
	{
		//dir = false;	//dir = true is broken. It leaves crucial steps out.
		let temp;
		if (dir)
		{
			temp = [];
		}
		else
		{
			/*if (path[0] === undefined || path[0].x === undefined || path[0].y === undefined || path[0].direction === undefined)
			{
				console.log(JSON.stringify(path[0]));
			}*/
			temp = [{x: path[0].x, y: path[0].y, direction: path[0].direction}];
			if (path[0].roomName)
			{
				temp[0].roomName = path[0].roomName;
			}

			dir = temp.direction;
		}

		//Compress the path by only recording when it changes direction.
		for (let p = 0; p < path.length; p++)
		{
			//If we have changed direction, then we mark the change.
			if (p < path.length -1 && path[p + 1].direction != dir)	//moveByPath() compliant steps state the direction that moves from the previous step to the current one.
			{
				dir = path[p + 1].direction;
				temp.push({x: path[p].x, y: path[p].y, direction: dir});
				if (path[p].roomName)
				{
					temp[temp.length - 1].roomName = path[p].roomName;
				}
			}
		}

		return temp;
	},

	//If source is not false, it's an index. If exit is not false, it's an index or a key. raw is the uncleaned path for flipper placement. nextpaths is the raw paths we could be going towards.
	writethispath: function(room_name, tiles, memory_name, source = false, exit = false, raw = false, nextpaths = {})
	{
		if (typeof Memory.rooms[room_name].path !== 'object')
		{
			Memory.rooms[room_name].path = {};	//Make sure the path object exists.
		}

		//We need to place the flipper on the last step of the current path.
		if (raw)
		{
			raw = raw[raw.length - 1];
		}

		for (let t = 0; t < tiles.length; t++)
		{
			if (typeof Memory.rooms[room_name].path[tiles[t].x] !== 'object')
			{
				Memory.rooms[room_name].path[tiles[t].x] = {};	//Make sure path[x] exists.
			}
			if (typeof Memory.rooms[room_name].path[tiles[t].x][tiles[t].y] !== 'object')
			{
				Memory.rooms[room_name].path[tiles[t].x][tiles[t].y] = {};	//Make sure path[x][y] exists.
			}

			if (source === false)
			{
				if (exit === false)	//Room-wide.
				{
					Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name] = tiles[t].direction;	//Assign our direction to the [x][y][name] of this tile.
					//Write our flipper.
					if (t == tiles.length - 1)
					{
						//Make sure the tile for our flipper exists.
						if (!Memory.rooms[room_name].path[raw.x])
						{
							Memory.rooms[room_name].path[raw.x] = {};
						}
						if (!Memory.rooms[room_name].path[raw.x][raw.y])
						{
							Memory.rooms[room_name].path[raw.x][raw.y] = {};
						}
						if (!Memory.rooms[room_name].path[raw.x][raw.y].flipper)
						{
							Memory.rooms[room_name].path[raw.x][raw.y].flipper = {};
						}
						if (!Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name])
						{
							Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name] = {};
						}

						//Since the flipper can serve as a junction between paths, it should contain the direction to the next path.
						for (let next in nextpaths)
						{
							//No source and no exit.
							//When it's not a junction to more than one path, we don't need to store complex data.

							Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][next] = nextpaths[next][0].direction;

							/*else	//In case of only 1 step.
							{
								Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][next] = nextpaths[next][0].direction;
							}*/
						}
					}
				}
				else	//No source but an indexed exit.
				{
					if (typeof (Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name]) !== 'object')	//Room-wide with an indexed or string exit.
					{
						Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name] = {};	//If it's an exit based path, make sure path[x][y][name][exit] exists.
					}
					if (typeof exit !== 'number' && typeof exit !== 'string')
					{
						return false;
					}

					Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name][exit] = tiles[t].direction;	//Assign our direction to the [x][y][name][exit] of this tile.
					//Write our flipper.
					if (t == tiles.length - 1)
					{
						//Make sure the tile for our flipper exists.
						if (!Memory.rooms[room_name].path[raw.x])
						{
							Memory.rooms[room_name].path[raw.x] = {};
						}
						if (!Memory.rooms[room_name].path[raw.x][raw.y])
						{
							Memory.rooms[room_name].path[raw.x][raw.y] = {};
						}
						if (!Memory.rooms[room_name].path[raw.x][raw.y].flipper)
						{
							Memory.rooms[room_name].path[raw.x][raw.y].flipper = {};
						}
						if (!Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name])
						{
							Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name] = {};
						}
						//Since the flipper can serve as a junction between paths, it should contain the direction to the next path.
						for (let next in nextpaths)
						{
							//No source and an exit.
							if (!Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][next])
							{
								Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][next] = {};
							}
							//When it's not a junction to more than one path, we don't need to store complex data.

							Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][next][exit] = nextpaths[next][0].direction;

							/*else	//In case of only 1 step.
							{
								Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][next][exit] = nextpaths[next][0].direction;
							}*/
						}
					}
				}
			}
			else	//A source.
			{
				if (!Array.isArray(Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name]))
				{
					Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name] = [];	//If it's a source based path, make sure path[x][y][name][source] exists.
				}

				if (exit === false)	//Source-based with no exit.
				{
					Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name][source] = tiles[t].direction;	//Assign our direction to the [x][y][name][source] of this tile.
					//Write our flipper.
					if (t == tiles.length - 1)
					{
						//Make sure the tile for our flipper exists.
						if (!Memory.rooms[room_name].path[raw.x])
						{
							Memory.rooms[room_name].path[raw.x] = {};
						}
						if (!Memory.rooms[room_name].path[raw.x][raw.y])
						{
							Memory.rooms[room_name].path[raw.x][raw.y] = {};
						}
						if (!Memory.rooms[room_name].path[raw.x][raw.y].flipper)
						{
							Memory.rooms[room_name].path[raw.x][raw.y].flipper = {[memory_name]: []};
						}
						if (!Array.isArray(Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name]))
						{
							Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name] = [];
						}
						//Since the flipper can serve as a junction between paths, it should contain the direction to the next path.
						for (let next in nextpaths)
						{
							//Is this array containing a path or containing a defpath?
							if (Array.isArray(nextpaths[next][0]))
							{
								//Defpath.
								//console.log('Defpath.');
								if (!Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source])
								{
									Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source] = {};
								}
								Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source][next] = new Array(nextpaths[next].length)
								for (let np = 0; np < nextpaths[next].length; np++)
								{
									if (nextpaths[next][np])
									{
										//If the flipper contains an array. (This is probably an array of room exits.)
										Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source][next][np] = nextpaths[next][np][0].direction;

										/*else	//In case of only 1 step.
										{
											Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source][next][np] = nextpaths[next][np][0].direction;
										}*/
									}
								}
							}
							else
							{
								//Normal source-based path.
								if (!Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source])
								{
									Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source] = {};
								}
								//If the flipper just contains a flat direction.
								if (nextpaths[next][0] && nextpaths[next][0].direction)
								{
									Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source][next] = nextpaths[next][0].direction;
								}
								else	//It's a defpaths.
								{
									//Make sure the sub array exists.
									if (!Array.isArray(Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source][next]))
									{
										Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source][next] = new Array(nextpaths[next].length);
									}

									for (let a = 0; a < nextpaths[next].length; a++)
									{
										//Only assign if it exists.
										if (nextpaths[next][a])
										{
											Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source][next][a] = nextpaths[next][a][0].direction;
										}
									}
								}
							}
						}
					}
				}
				else if (typeof exit === 'number')	//Source-based with an indexed exit.
				{
					if (!Array.isArray(Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name]))
					{
						Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name] = [];	//If it's a defense supplying path, make sure path[x][y][name][source] exists.
					}
					if (typeof Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name][source] !== 'object')
					{
						Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name][source] = {};	//If it's a defense supplying path, make sure our object of paths toward each patrol exists.
					}

					Memory.rooms[room_name].path[tiles[t].x][tiles[t].y][memory_name][source][exit] = tiles[t].direction;
					//Write our flipper.
					if (t == tiles.length - 1)
					{
						//Make sure the tile for our flipper exists.
						if (!Memory.rooms[room_name].path[raw.x])
						{
							Memory.rooms[room_name].path[raw.x] = {};
						}
						if (!Memory.rooms[room_name].path[raw.x][raw.y])
						{
							Memory.rooms[room_name].path[raw.x][raw.y] = {};
						}
						if (!Memory.rooms[room_name].path[raw.x][raw.y].flipper)
						{
							Memory.rooms[room_name].path[raw.x][raw.y].flipper = {[memory_name]: []};
						}
						if (!Array.isArray(Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name]))
						{
							Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name] = [];
						}
						if (!Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source])
						{
							Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source] = {};
						}

						//Since the flipper can serve as a junction between paths, it should contain the direction to the next path.
						for (let next in nextpaths)
						{
							//A source and an exit.
							//When it's not a junction to more than one path, we don't need to store complex data.
							//Though our destination paths of this type can have different formats, we are ultimately passing them in here the same way, so we don't need to know the difference here.
							//Though some of our destination paths are on a source and some are not, we are ending a source-based path that doesn't cross from one source to another.
							//Therefore the source we're currently on is enough to know where we're going.

							//If the flipper just contains a flat direction.
							if (nextpaths[next][0] && nextpaths[next][0].direction)
							{
								Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source][next] = nextpaths[next][0].direction;
							}
							else	//It's a defpaths.
							{
								//Make sure the sub array exists.
								if (!Array.isArray(Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source][next]))
								{
									Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source][next] = new Array(nextpaths[next].length);
								}

								for (let a = 0; a < nextpaths[next].length; a++)
								{
									//Only assign if it exists.
									if (nextpaths[next][a])
									{
										Memory.rooms[room_name].path[raw.x][raw.y].flipper[memory_name][source][next][a] = nextpaths[next][a][0].direction;
									}
								}
							}
						}
					}
				}
			}
		}

		return true;
	},

	deletethispath: function(room_name, types)
	{
		let path = Memory.rooms[room_name].path;
		for (let x in path)
		{
			for (let y in path[x])
			{
				for (let type in path[x][y])
				{
					//Delete tiles of this type.
					for (let t = 0; t < types.length; t++)
					{
						if (type === types[t])
						{
							path[x][y][type] = undefined;
						}
					}

					if (type === 'flipper')
					{
						let fkeys = Object.keys(path[x][y][type]).length;
						for (let flipper in path[x][y][type])
						{
							//Delete flippers of this type.
							for (let t = 0; t < types.length; t++)
							{
								if (flipper === types[t])
								{
									if (fkeys === 1)	//If there was only one flipper, remove the whole flipper.
									{
										path[x][y][type] = undefined;
										break;
									}
									else	//Remove this particular flipper.
									{
										path[x][y][type][flipper] = undefined;
									}
								}
							}
						}
					}
				}
			}
		}
		return true;
	},

	deleteoldpaths: function(room_name, type)
	{
		switch(type)
		{
			case 'init':
				Memory.rooms[room_name].upgrade = [Memory.rooms[room_name].upgrade[0], Memory.rooms[room_name].upgrade.slice(-1)[0]];
				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
				{
					Memory.rooms[room_name].sources[i].mine =		[Memory.rooms[room_name].sources[i]   .mine[0],	Memory.rooms[room_name].sources[i]   .mine.slice(-1)[0]];
					Memory.rooms[room_name].sources[i].mreturn =	[Memory.rooms[room_name].sources[i].mreturn[0],	Memory.rooms[room_name].sources[i].mreturn.slice(-1)[0]];
					Memory.rooms[room_name].sources[i].upgrade =	[Memory.rooms[room_name].sources[i].upgrade[0],	Memory.rooms[room_name].sources[i].upgrade.slice(-1)[0]];
					Memory.rooms[room_name].sources[i].ureturn =	[Memory.rooms[room_name].sources[i].ureturn[0],	Memory.rooms[room_name].sources[i].ureturn.slice(-1)[0]];
				}
				break;
			case 'defender':
				for (let e in Memory.rooms[room_name].exitpaths)
				{
					//We can assume that every exit path has an exitreturn.
					Memory.rooms[room_name].exitpaths[e] = [Memory.rooms[room_name].exitpaths[e][0], Memory.rooms[room_name].exitpaths[e].slice(-1)[0]];
					Memory.rooms[room_name].exitreturn[e] = [Memory.rooms[room_name].exitreturn[e][0], Memory.rooms[room_name].exitreturn[e].slice(-1)[0]];
				}
				for (let p = 0; p < Memory.rooms[room_name].defense.patrol.length; p++)
				{
					//We can assume that every patrol has a preturn.
					if (Memory.rooms[room_name].defense.patrol[p])	//Some of these are empty.
					{
						Memory.rooms[room_name].defense.patrol[p] = [Memory.rooms[room_name].defense.patrol[p][0], Memory.rooms[room_name].defense.patrol[p].slice(-1)[0]];
						Memory.rooms[room_name].defense.preturn[p] = [Memory.rooms[room_name].defense.preturn[p][0], Memory.rooms[room_name].defense.preturn[p].slice(-1)[0]];
					}
				}
				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
				{
					for (let d = 0; d < Memory.rooms[room_name].sources[i].defpaths.length; d++)
					{
						//We can assume that every defpath has a dreturn.
						if (Memory.rooms[room_name].sources[i].defpaths[d])	//Some of these are empty.
						{
							Memory.rooms[room_name].sources[i].defpaths[d] = [Memory.rooms[room_name].sources[i].defpaths[d][0], Memory.rooms[room_name].sources[i].defpaths[d].slice(-1)[0]];
							Memory.rooms[room_name].sources[i].dreturn[d] = [Memory.rooms[room_name].sources[i].dreturn[d][0], Memory.rooms[room_name].sources[i].dreturn[d].slice(-1)[0]];
						}
					}
				}
				break;
			case 'labs':
				Memory.rooms[room_name].mine.epath =	[Memory.rooms[room_name]  .mine.epath[0], Memory.rooms[room_name]  .mine.epath.slice(-1)[0]];
				Memory.rooms[room_name].mine.ereturn =	[Memory.rooms[room_name].mine.ereturn[0], Memory.rooms[room_name].mine.ereturn.slice(-1)[0]];
				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
				{
					Memory.rooms[room_name].sources[i].labs =		[Memory.rooms[room_name].sources[i]   .labs[0],	Memory.rooms[room_name].sources[i]   .labs.slice(-1)[0]];
					Memory.rooms[room_name].sources[i].lreturn =	[Memory.rooms[room_name].sources[i].lreturn[0],	Memory.rooms[room_name].sources[i].lreturn.slice(-1)[0]];
				}
		}
		return typeof room_name === 'string' && typeof type === 'string';
	},

	backuppaths: function(room_name = false)
	{
		if (!room_name)
		{
			for (let room_name in Memory.rooms)
			{
				calculate.backuppaths(room_name);
			}
			return true;
		}

		if (!Memory.rooms.backup)
		{
			Memory.rooms.backup = {};
		}
		let tempsources = [];

		for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
		{
			tempsources[i] = {};

			tempsources[i].mine = Memory.rooms[room_name].sources[i].mine;
			tempsources[i].mreturn = Memory.rooms[room_name].sources[i].mreturn;
			tempsources[i].mfat = Memory.rooms[room_name].sources[i].mfat;
			tempsources[i].upgrade = Memory.rooms[room_name].sources[i].upgrade;
			tempsources[i].ureturn = Memory.rooms[room_name].sources[i].ureturn;
			tempsources[i].defpaths = Memory.rooms[room_name].sources[i].defpaths;
			tempsources[i].dreturn = Memory.rooms[room_name].sources[i].dreturn;
		}

		Memory.rooms.backup[room_name] =
		{
			sources: tempsources,
			upgrade: Memory.rooms[room_name].upgrade,
			exitpaths: Memory.rooms[room_name].exitpaths,
			exitreturn: Memory.rooms[room_name].exitreturn,
			defense: {patrol: Memory.rooms[room_name].defense.patrol, preturn: Memory.rooms[room_name].defense.preturn}
		}
	},

	restorebackup: function(room_name = false)
	{
		if (!room_name)
		{
			for (let room_name in Memory.rooms)
			{
				calculate.restorebackup(room_name);
			}
			return true;
		}

		for (let obj in Memory.rooms.backup[room_name])
		{
			if (obj === 'sources')
			{
				for (let i = 0; i < Memory.rooms.backup[room_name].sources.length; i++)
				{
					for (let sobj in Memory.rooms.backup[room_name].sources[i])
					{
						Memory.rooms[room_name].sources[i][sobj] = Memory.rooms.backup[room_name].sources[i][sobj];
					}
				}
			}
			else if (obj === 'defense')
			{
				Memory.rooms[room_name].defense.patrol = Memory.rooms.backup[room_name].defense.patrol;
				Memory.rooms[room_name].defense.preturn = Memory.rooms.backup[room_name].defense.preturn;
			}
			else
			{
				Memory.rooms[room_name][obj] = Memory.rooms.backup[room_name][obj];
			}
		}
	},

	maximumEnergy: function(room)
	{
		if (typeof room === "number")
		{
			return (SPAWN_ENERGY_CAPACITY * CONTROLLER_STRUCTURES.spawn[room]) + (EXTENSION_ENERGY_CAPACITY[room] * CONTROLLER_STRUCTURES.extension[room]);
		}
		else if (typeof room === "string")
		{
			if (!calculate.spawns[room] || !calculate.sortedextensions[room])
			{
				calculate.sortExtensions(room);
			}
			let spawns = calculate.spawns[room] < 3 ? calculate.spawns[room] : 2;
			let extensions = calculate.sortedextensions[room].length - spawns;
			return (SPAWN_ENERGY_CAPACITY * spawns) + (EXTENSION_ENERGY_CAPACITY[Game.rooms[room].controller.level] * extensions);
		}
		else
		{
			return false;
		}
	},

	currentEnergy: function(room_name)
	{
		if (!calculate.spawns[room_name] || !calculate.sortedextensions[room_name])
		{
			calculate.sortExtensions(room_name);
		}

		let energy = Game.rooms[room_name].energyAvailable;
		let spawn = Game.getObjectById(Memory.rooms[room_name].spawns[2].id);

		if (spawn)
		{
			energy -= spawn.store.getUsedCapacity(RESOURCE_ENERGY);
		}

		return energy;
	},

	bodyCost: function(body)
	{
		let energy = 0;
		for (let b = 0; b < body.length; b++)
		{
			energy += BODYPART_COST[body[b]];
		}

		return energy;
	},

	getExtensions: function(room_name)
	{
		//Use extension and spawner coordinates to make an [x][y] multidimensional object. This makes addressing them faster.
		//We will store them in calculate.extensions[room_name].
		let existing_extensions = Game.rooms[room_name].find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_EXTENSION}})
		let existing_spawns = Game.rooms[room_name].find(FIND_MY_SPAWNS);
		existing_extensions = existing_extensions.concat(existing_spawns);
		
		let extension_positions = {};
		for (let e = 0; e < existing_extensions.length; e++)
		{
			if (!extension_positions[existing_extensions[e].pos.x])
			{
				extension_positions[existing_extensions[e].pos.x] = {};
			}
			/*if (!extension_positions[existing_extensions[e].pos.x][existing_extensions[e].pos.y])
			{
				extension_positions[existing_extensions[e].pos.x][existing_extensions[e].pos.y] = {};
			}*/

			extension_positions[existing_extensions[e].pos.x][existing_extensions[e].pos.y] = existing_extensions[e].id;	//In roomPlanner.check() and calculate.sortExtensions(), we will make sure to erase the cache if anything changes.
		}

		//We will get our nuker during this time as well.
		if (calculate.nuke[room_name] === undefined)
		{
			calculate.nuke[room_name] = Game.rooms[room_name].find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_NUKER}});

			if (calculate.nuke[room_name].length)
			{
				calculate.nuke[room_name] = {id: calculate.nuke[room_name][0].id, x: calculate.nuke[room_name][0].pos.x, y: calculate.nuke[room_name][0].pos.y};
			}
			else
			{
				calculate.nuke[room_name] = false;
			}
		}

		calculate.spawns[room_name] = existing_spawns.length;
		calculate.extensions[room_name] = extension_positions;
		return extension_positions;
	},

	sortExtensions: function(room_name)
	{
		//Make sure we have the efficient [x][y] list of extensions.
		let arranged_extensions;
		if (calculate.extensions[room_name])
		{
			arranged_extensions = calculate.extensions[room_name];
		}
		else
		{
			arranged_extensions = calculate.getExtensions(room_name);
		}

		if (calculate.sortedextensions[room_name])
		{
			return calculate.sortedextensions[room_name];
		}
		else
		{
			//Arrange the extensions and spawners so energy is taken evenly from all sources. Spawners should be last since they could be the farthest from the source.
			let sorted_extensions = [];
			let current_extension;
			let s = Array(Memory.rooms[room_name].sources.length).fill(0);
			let more_extensions = true;
			while (more_extensions)
			{
				more_extensions = false;
				for (i = 0; i < s.length; i++)
				{
					if (s[i] < Memory.rooms[room_name].sources[i].buildings.extensions.length &&
						arranged_extensions
							[Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].x] &&//x
						arranged_extensions
							[Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].x]	//x
							[Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].y]	//y
						)
					{
						//Iterate one extension from the current source. Then prepare to do the next one.
						//console.log(room_name + ", x: " + Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].x + ", y: "  + Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].y);
						current_extension = Game.getObjectById
						(
							arranged_extensions
								[Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].x]	//x
								[Memory.rooms[room_name].sources[i].buildings.extensions[s[i]].y]	//y
						);
						if (current_extension && current_extension.structureType == STRUCTURE_EXTENSION)
						{
							sorted_extensions.push(current_extension);
							more_extensions = true;
						}
					}
					s[i]++;
				}
			}
			for (let sp = 0, spawn; sp < 2; sp++)	//We don't want to use our lab spawn's energy, since it's so difficult to refill.
			{
				spawn = Game.getObjectById(Memory.rooms[room_name].spawns[sp].id);
				if (spawn)
				{
					sorted_extensions.push(spawn);
				}
			}
			calculate.sortedextensions[room_name] = sorted_extensions;
			return sorted_extensions;
		}
	},

	countextensions: function(room_name = false)
	{
		let e = 0;

		if (!room_name)
		{
			for (let room_name in Memory.rooms)
			{
				e += calculate.countextensions(room_name);
				return e;
			}
		}

		for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
		{
			e += Memory.rooms[room_name].sources[i].buildings.extensions.length;
		}
		return e;
	},

	extensionsfilled: function(room_name, s)
	{
		let extension_positions = calculate.getExtensions(room_name);
		for (let e = 0, textension, extensions = Memory.rooms[room_name].sources[s].buildings.extensions; e < extensions.length; e++)
		{
			textension = Game.getObjectById(extension_positions[extensions[e].x][extensions[e].y]);
			if (textension.store.getFreeCapacity(RESOURCE_ENERGY))
			{
				return false;
			}
		}

		return true;
	},

	findouterstone: function(room_name, x_start, y_start, existing_stone = false)	//Find contiguous outer perimiter of a natural wall formation.
	{
		if (existing_stone && existing_stone[x_start] && existing_stone[x_start][y_start])
		{
			//We've already marked this section of contiguous natural walls.
			return existing_stone;
		}

		let terrain = Game.rooms[room_name].getTerrain();
		let temp_search = [{x: x_start, y: y_start}];
		let search_now;
		let found = {};
		//let found = {[x_start]: {[y_start]: true}};
		if (existing_stone)
		{
			found = existing_stone;	//If we already have previous formations recorded, we are adding to them.
		}
		else
		{
			calculate.findouterstone.innercheck(x_start, y_start, found, temp_search, terrain);
		}

		while (temp_search.length)
		{
			search_now = temp_search.slice();
			temp_search = [];
			for (let s = 0; s < search_now.length; s++)
			{
				//We're only getting true adjacent tiles, not the corners or the center. This ensures the walls are truly contiguous.
				for (let x = -1; x < 2; x++)
				{
					if (x === 0)	//If we're horizontally centered, check the top and bottom.
					{
						for (let y = -1; y < 2; y += 2)
						{
							//Don't touch the edge of the room.
							if (search_now[s].x + x > 0 && search_now[s].x + x < 49 && search_now[s].y + y > 0 && search_now[s].y + y < 49)
							{
								//If there's an empty tile touching it, mark that tile.
								calculate.findouterstone.innercheck(search_now[s].x + x, search_now[s].y + y, found, temp_search, terrain);
							}
						}
					}
					else	//If we're horizontally at the left or right, check the second tile down.
					{
						let y = 0;
						//Don't touch the edge of the room.
						if (search_now[s].x + x > 0 && search_now[s].x + x < 49 && search_now[s].y + y > 0 && search_now[s].y + y < 49)
						{
							//If there's an empty tile touching it, mark that tile.
							calculate.findouterstone.innercheck(search_now[s].x + x, search_now[s].y + y, found, temp_search, terrain);
						}
					}
				}
			}
			//console.log(temp_search.length);
		}

		return found;
	},

	hugwalls: function(room_name, walls)
	{
		let empty_tiles = {};
		let terrain = Game.rooms[room_name].getTerrain();

		for (let x in walls)
		{
			for (let y in walls[x])
			{
				for (let x2 = -1; x2 < 2; x2++)
				{
					for (let y2 = -1; y2 < 2; y2++)
					{
						if (terrain.get(Number(x) + x2, Number(y) + y2) !== TERRAIN_MASK_WALL)
						{
							calculate.mark_found(Number(x) + x2, Number(y) + y2, empty_tiles);
						}
					}
				}
			}
		}

		return empty_tiles;
	},

	mark_found: function(x, y, obj, value = true)	//obj has to be an object.
	{
		if (!obj[x])
		{
			obj[x] = {};
		}

		obj[x][y] = value;
		return true;
	},

	check_xy: function(x, y, obj)
	{
		return obj[x] !== undefined && obj[x][y] !== undefined;
	},

	get_xy: function(x, y, obj)
	{
		if (obj[x])
		{
			return obj[x][y];
		}
	},

	findtile: function(room_name, x, y, type, s = null)	//type can be a string or an array.
	{
		if (typeof type === 'string')
		{
			type = [type];
		}
		else if (typeof type !== 'array')
		{
			if (type !== -1)
			{
				console.log('Invalid tile type.')
			}
			return false;	//Error.
		}

		let tile;
		if (Memory.rooms[room_name].path[x] && (tile = Memory.rooms[room_name].path[x][y]))
		{
			//We found a tile. Let's see if it's relevant to us.
			if (s === null)	//Not source bound.
			{
				for (let t = 0; t < type.length; t++)
				{
					if (tile[type[t]] || (tile.flipper && tile.flipper[type[t]]))
					{
						return true;
					}
					else if (t === type.length - 1)
					{
						return false;
					}
				}
			}
			else	//Source bound.
			{
				for (let t = 0; t < type.length; t++)
				{
					if ((tile[type[t]] && tile[type[t]][s]) || (tile.flipper && tile.flipper[type[t]] && tile.flipper[type[t]][s]))
					{
						return true;
					}
					else if (t === type.length - 1)
					{
						return false;
					}
				}
			}
		}
		else
		{
			return false;
		}
	},

	isPathClear: function(room_name, path, direction = null, x1, y1, x2 = null, y2 = null)
	{
		//We're traversing an inter-room path[x][y] object to make sure there's no structures in its way.
		//First get all blocking structures in the room.
		let structs = Game.rooms[room_name].find(FIND_STRUCTURES, {filter: calculate.blockingStructure});

		//Now organize them into an easily testable format.
		let structs_xy = {};
		for (let st = 0; st < structs.length; st++)
		{
			calculate.mark_found(structs[st].pos.x, structs[st].pos.y, structs_xy);
		}

		//What's the initial direction?
		if (calculate.check_xy(x1, y1, path))
		{
			direction = path[x1][y1];
		}

		//console.log('x: ' + x1 + ' y: ' + y1 + ' room: ' + room_name + ' direction: ' + direction);

		//Now iterate the path.
		if (x2 === null || y2 === null)	//If we didn't specify a destination, we're testing until we hit an exit.
		{
			for (let tempx = x1, tempy = y1, dx = calculate.dxdy[direction].dx, dy = calculate.dxdy[direction].dy, first_step = true, last_step = false; first_step || !last_step; tempx += dx, tempy += dy, first_step = false)
			{
				//Have we found a structure blocking our path?
				if (calculate.check_xy(tempx, tempy, structs_xy))
				{
					//console.log('Failure reported.');
					return false;	//Report the failure.
				}

				//Is there a change in direction before the next tile?
				if (calculate.check_xy(tempx, tempy, path))
				{
					//console.log('Changing direction.');
					direction = path[tempx][tempy];
					dx = calculate.dxdy[direction].dx;
					dy = calculate.dxdy[direction].dy;
				}

				//We do need to test the last step.
				if ((tempx === 0 || tempx === 49 || tempy === 0 || tempy === 49) && !first_step)
				{
					last_step = true;
				}
			}
		}
		else	//If we did specify a destination, we're testing until we hit that.
		{
			for (let tempx = x1, tempy = y1, dx = calculate.dxdy[direction].dx, dy = calculate.dxdy[direction].dy, last_step = false; !last_step || (tempx !== x2 && tempy !== y2); tempx += dx, tempy += dy)
			{
				//Have we found a structure blocking our path?
				if (calculate.check_xy(tempx, tempy, structs_xy))
				{
					//console.log('Failure reported.');
					return false;	//Report the failure.
				}

				//Is there a change in direction before the next tile?
				if (calculate.check_xy(tempx, tempy, path))
				{
					//console.log('Changing direction.');
					direction = path[tempx][tempy];
					dx = calculate.dxdy[direction].dx;
					dy = calculate.dxdy[direction].dy;
				}

				//We do need to test the last step.
				if (tempx === x2 || tempy === y2)
				{
					last_step = true;
				}
			}
		}

		return true;	//We made it this far with no errors or blocking structures.
	},

	blockingStructure: function(structure)
	{
		return structure.structureType !== STRUCTURE_CONTAINER && structure.structureType !== STRUCTURE_ROAD && (structure.structureType !== STRUCTURE_RAMPART || (!structure.isPublic && !structure.my));
	},

	endOfPath: function(room_name, path, direction = null, tempx, tempy)
	{
		//What's the initial direction?
		if (calculate.check_xy(tempx, tempy, path))
		{
			direction = path[tempx][tempy];
		}

		//Find the last step in this room's inter-room [x][y] path.
		for (let dx = calculate.dxdy[direction].dx, dy = calculate.dxdy[direction].dy, first_step = true;
			first_step || (tempx !== 0 && tempx !== 49 && tempy !== 0 && tempy !== 49); tempx += dx, tempy += dy, first_step = false)
		{
			//Is there a change in direction before the next tile?
			if (calculate.check_xy(tempx, tempy, path))
			{
				direction = path[tempx][tempy];
				dx = calculate.dxdy[direction].dx;
				dy = calculate.dxdy[direction].dy;
			}
		}

		//After we're done iterating, we should have the last step in this room.
		return {x: tempx, y: tempy};
	},

	newpath: function(room_name, action_type, action_number, x = false, y = false, x2 = false, y2 = false, room_name2 = false, direction = false)	//room_name2 and direction unworking or unimplemented.
	{
		if (typeof room_name === 'string' && typeof action_type === 'string' && typeof action_number === 'number')
		{
			if (typeof x !== 'number' && typeof y !== 'number' && typeof x2 !== 'number' && typeof y2 !== 'number')
			{
				let temproom = Memory[action_type][action_number].path[room_name];
				x = temproom[0].x;
				y = temproom[0].y;
				x2 = temproom[temproom.length - 1].x;
				y2 = temproom[temproom.length - 1].y;
			}

			let temppath;
			if (typeof room_name2 === 'string')
			{
				temppath = calculate.cleanthispath(Game.rooms[room_name].findPath((new RoomPosition(x, y, room_name)), (new RoomPosition(x2, y2, room_name)), {plainCost: 1, swampCost: 2, maxRooms: 1}));
				Memory[action_type][action_number].pos.roomName = room_name2;
			}
			else if(room_name2)
			{
				temppath = calculate.cleanthispath(Game.rooms[room_name].findPath((new RoomPosition(x, y, room_name)), (new RoomPosition(x2, y2, room_name)), {plainCost: 1, swampCost: 2, maxRooms: 1}));
			}
			else
			{
				temppath = calculate.cleanthispath(Game.rooms[room_name].findPath((new RoomPosition(x, y, room_name)), (new RoomPosition(x2, y2, room_name)), {plainCost: 1, swampCost: 2}));
			}

			temppath.unshift({x: x, y: y, direction: temppath[0].direction});

			let temp_tile = {};
			for (let tile = 0; tile < temppath.length; tile++)
			{
				if (!temp_tile[temppath[tile].x])
				{
					temp_tile[temppath[tile].x] = {};
				}

				temp_tile[temppath[tile].x][temppath[tile].y] = temppath[tile].direction;
			}

			Memory[action_type][action_number].path[room_name] = temp_tile;

			return true;
		}
		else
		{
			return false;
		}
	},

	coaxThroughExit: function(room_name, costMatrix)
	{
		//To make our interroom pathing want to go straight through an exit, let's make the exit tiles expensive so it doesn't stay on them.
		for (let x = 0, increment, terrain = Game.map.getRoomTerrain(room_name); x < 50; x++)
		{
			if (x === 0 || x === 49)
			{				
				increment = 1;
			}
			else
			{
				increment = 49;
			}

			for (let y = 0; y < 50; y+= increment)
			{
				if (terrain.get(x, y) !== TERRAIN_MASK_WALL)
				{
					costMatrix.set(x, y, 10);
				}
			}
		}
	},

	//Various reducers so we can easily do single-line checks involving arrays of arbitrary length.
	reduceManyWork: function(n, part)
	{
		return part == WORK ? n + 1 : n; //For each WORK, increment n by 1.
	},
	reduceManyCarry: function(n, part)
	{
		return part == CARRY ? n + 1 : n; //For each CARRY, increment n by 1.
	},
	sourcereducer:
	{
		extensions: function(total, a)
		{
			return total + a.buildings.extensions.length;
		},
		idealextensions: function(total, a)
		{
			return total + a.ideal.extensions;
		},
		mtransport: function(total, a)
		{
			return total + a.creeps.mtransport.length;
		}
	},
	structreducer:	//For use with find functions.
	{
		roads: function(total, found)
		{
			if (found.structureType == "road")
			{
				return total + 1;
			}
			else
			{
				return total + 0;
			}
		},
		extensions: function(total, found)
		{
			if (found.structureType == "extension")
			{
				return total + 1;
			}
			else
			{
				return total + 0;
			}
		}
	},
	arrayreducer: function(total, a)
	{
		return total + a.length;
	},

	//Count the number of tiles in an [x][y] object.
	xy_length: function(obj)
	{
		let i = 0;
		for (let x in obj)
		{
			for (let y in obj[x])
			{
				i++;
			}
		}
		return i;
	},

	orientation:
	{
		"-1": {"-1": 8, 0: 7, 1: 6},
		  0 : {"-1": 1,       1: 5},
		  1 : {"-1": 2, 0: 3, 1: 4}
	},

	dxdy:
	[
		{dx:  0, dy:  0},
		{dx:  0, dy: -1},
		{dx:  1, dy: -1},
		{dx:  1, dy:  0},
		{dx:  1, dy:  1},
		{dx:  0, dy:  1},
		{dx: -1, dy:  1},
		{dx: -1, dy:  0},
		{dx: -1, dy: -1}
	]
};

calculate.findouterstone.innercheck = function(x, y, found, temp_search, terrain)
{
	//First we need to make sure we have a wall tile. We also need to make sure we didn't already mark it.
	if (terrain.get(x, y) === TERRAIN_MASK_WALL && (!found[x] || !found[x][y]))
	{
		//Now see if it has at least one empty tile touching it.
		for (let x2 = -1; x2 < 2; x2++)
		{
			for (let y2 = -1; y2 < 2; y2++)
			{
				if (terrain.get(x + x2, y + y2) !== TERRAIN_MASK_WALL)
				{
					//The tile is touching a non-wall tile.
					calculate.mark_found(x, y, found);
					temp_search.push({x: x, y: y});
					//console.log('Pushed ' + x + ' ' + y + '.');
					return true;	//Successfully marked.
				}
			}
		}
	}
	return false;	//Nothing found.
};

calculate.dxdy_opposite =
[
	calculate.dxdy[0],
	calculate.dxdy[5],
	calculate.dxdy[6],
	calculate.dxdy[7],
	calculate.dxdy[8],
	calculate.dxdy[1],
	calculate.dxdy[2],
	calculate.dxdy[3],
	calculate.dxdy[4]
];

module.exports = calculate;