var test =
{
	run: function(paths, extensions_sources, defenses, newpath = false, labs = false, spawntest = false, actionpath = false)
	{
		let extensions_room = false;
		try
		{
			//Visualize paths if we're testing them.
			for (let room_name in Memory.rooms)
			{
				if (room_name != 'E49S15')
				{
					break;
				}
				if (actionpath)
				{
					//[room_name, action]
					test.paint.actionpath(actionpath[0], actionpath[1], ["blue", "red"]);
				}

				if (!paths)
				{
					break;
				}

				test.paint.sourcepath(room_name, ["mine", "mreturn"], "blue");
				test.paint.sourcepath(room_name, ["upgrade", "ureturn"], "red");
				test.paint.exitpath(room_name, ["purple", "magenta"]);
				test.paint.patrolpath(room_name, ["blue", "red"]);
				test.paint.defensepath(room_name, ["green", "yellow"]);
			}

			for (let room_name in Memory.rooms)
			{
				if (!newpath)
				{
					break;
				}

				let vis;
				let style = {color: 'white', opacity: 0.5};
				for (let x in Memory.rooms[room_name].path)
				{
					let x2 = +x;
					for (let y in Memory.rooms[room_name].path[x])
					{
						let y2 = +y;
						for (let path in Memory.rooms[room_name].path[x][y])
						{
							if (!Memory.rooms[room_name].path[x] || !Memory.rooms[room_name].path[x][y])
							{
								continue;
							}
							style.backgroundColor = false;

							/*if ()	//This can be used to test a specific tile type.
							{
								continue;
							}*/

							switch(path)
							{
								default:
									if (Memory.test && Memory.test.indexOf(path) === -1)
									{
										continue;
									}
									Game.rooms[room_name].visual.text(test.direction[Memory.rooms[room_name].path[x][y][path] || 0], x2, y2, style);
									break;

								case 'mine':
								case 'mreturn':
								case 'mfat':
									style.backgroundColor = 'blue';
								case 'upgrade':
								case 'ureturn':
									if (Memory.test && Memory.test.indexOf(path) === -1)
									{
										continue;
									}
									if(!style.backgroundColor)
									{
										style.backgroundColor = 'red';
									}

									for (i = 0; i < Memory.rooms[room_name].path[x][y][path].length; i++)
									{
										if (Memory.rooms[room_name].path[x][y][path][i])
										{
											Game.rooms[room_name].visual.text(test.direction[Memory.rooms[room_name].path[x][y][path][i] || 0], x2, y2, style);
										}
									}
									break;

								case 'defpaths':
								case 'dreturn':
									if (Memory.test && Memory.test.indexOf(path) === -1)
									{
										continue;
									}
									style.backgroundColor = 'purple';

									for (i = 0; i < Memory.rooms[room_name].path[x][y][path].length; i++)
									{
										if (typeof Memory.rooms[room_name].path[x][y][path][i] !== 'object')
										{
											continue;
										}

										for (let e in Memory.rooms[room_name].path[x][y][path][i])
										{
											Game.rooms[room_name].visual.text(test.direction[Memory.rooms[room_name].path[x][y][path][i][e]], x2, y2, style);
										}
									}
									break;

								case 'patrol':
								case 'preturn':
									if (Memory.test && Memory.test.indexOf(path) === -1)
									{
										continue;
									}
									style.backgroundColor = 'orange';

									for (let e in Memory.rooms[room_name].path[x][y][path])
									{
										Game.rooms[room_name].visual.text(test.direction[Memory.rooms[room_name].path[x][y][path][e] || 0], x2, y2, style);
									}
									break;

								case 'exitpath':
								case 'exitreturn':
									if (Memory.test && Memory.test.indexOf(path) === -1)
									{
										continue;
									}
									style.backgroundColor = 'green';

									for (let e in Memory.rooms[room_name].path[x][y][path])
									{
										Game.rooms[room_name].visual.text(test.direction[Memory.rooms[room_name].path[x][y][path][e] || 0], x2, y2, style);
									}
									break;

								case 'labs':
								case 'lreturn':
									if (Memory.test && Memory.test.indexOf(path) === -1)
									{
										continue;
									}
									if(!style.backgroundColor)
									{
										style.backgroundColor = 'purple';
									}

									for (i = 0; i < Memory.rooms[room_name].path[x][y][path].length; i++)
									{
										if (Memory.rooms[room_name].path[x][y][path][i])
										{
											Game.rooms[room_name].visual.text(test.direction[Memory.rooms[room_name].path[x][y][path][i] || 0], x2, y2, style);
										}
									}
									break;

								case 'epath':
								case 'ereturn':
									if (Memory.test && Memory.test.indexOf(path) === -1)
									{
										continue;
									}
									if(!style.backgroundColor)
									{
										style.backgroundColor = 'brown';
									}

									Game.rooms[room_name].visual.text(test.direction[Memory.rooms[room_name].path[x][y][path] || 0], x2, y2, style);

								case 'flipper':
									if (Memory.test && Memory.test.indexOf(path) === -1)
									{
										continue;
									}

									for (let flippertype in Memory.rooms[room_name].path[x][y][path])
									{
										switch(flippertype)	//Uncomment one of these to color a flipper.
										{
											/*case 'mine':
											case 'mreturn':
											case 'mfat':
												style.backgroundColor = 'blue';
												break;
											case 'upgrade':
											case 'ureturn':
												style.backgroundColor = 'red';
												break;
											case 'defpaths':
											case 'dreturn':
												style.backgroundColor = 'purple';
												break;
											case 'patrol':
											case 'preturn':
												style.backgroundColor = 'orange';
												break;
											case 'exitpath':
											case 'exitreturn':
												style.backgroundColor = 'green';
												break;
											case 'labs':
											case 'lreturn':
												style.backgroundColor = 'purple';
												break;*/
											default:
												style.backgroundColor = 'white';
										}

										if (style.backgroundColor)
										{
											Game.rooms[room_name].visual.text(test.direction[0], x2, y2, style);
										}
									}
							}
						}
					}
				}
			}

			//Visualize extensions if we're testing them.
			for (let room_name in Memory.rooms)
			{
				//console.log(test);
				let uniqueextensions = {};
				let countextensions = 0;
				for (e = 0; extensions_room && e < Memory.rooms[room_name].ideal.textensions.length; e++)
				{
					//console.log(e);
					//console.log("X: " + Memory.rooms[room_name].sources[i].ideal.textensions[e].x + " Y: " + Memory.rooms[room_name].sources[i].ideal.textensions[e].y);

					Game.rooms[room_name].visual.circle(Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].ideal.textensions[e].x, Memory.rooms[room_name].ideal.textensions[e].y),
						{fill: 'lightgreen', radius: 0.25});
				}

				let color = ["blue", "red"];
				for (i = 0; extensions_sources && i < Memory.rooms[room_name].sources.length; i++)
				{
					for (e = 0; e < Memory.rooms[room_name].sources[i].buildings.extensions.length; e++)
					{
						//console.log(e);
						//console.log("X: " + Memory.rooms[room_name].sources[i].buildings.extensions[e].x + " Y: " + Memory.rooms[room_name].sources[i].buildings.extensions[e].y);

						Game.rooms[room_name].visual.circle(Game.rooms[room_name].getPositionAt(Memory.rooms[room_name].sources[i].buildings.extensions[e].x, Memory.rooms[room_name].sources[i].buildings.extensions[e].y),
							{fill: color[i], radius: 0.25});
					}
				}

				/*for (let x in uniqueextensions)
				{
					for (let y in uniqueextensions)
					{
						countextensions++;
					}
				}
				console.log(countextensions);*/
			}

			let wallsTest = function(container)
			{
				for (let room_name in container)	//This is Memory.rooms if we're not using a test memory.
				{
					if (!defenses || typeof container[room_name].defense !== 'object')
					{
						continue;
					}

					for (let e = 0; Array.isArray(container[room_name].exits) && e < container[room_name].exits.length; e++)
					{
						for (let p = 0; p < container[room_name].exits[e].length; p++)
						{
							new RoomVisual(room_name).circle(container[room_name].exits[e][p].x, container[room_name].exits[e][p].y, {fill: "red", radius: 0.25});
						}
						for (let p = 0; Array.isArray(container[room_name].defense.patrol) && Array.isArray(container[room_name].defense.patrol[e]) > 0 && p < container[room_name].defense.patrol[e].length; p++)
						{
							
						}
					}

					for (let w = 0; w < container[room_name].defense.walls.length; w++)
					{
						new RoomVisual(room_name).circle(container[room_name].defense.walls[w].x, container[room_name].defense.walls[w].y, {fill: "blue", radius: 0.25});
					}

					for (let t = 0; Array.isArray(container[room_name].defense.towers) && t < container[room_name].defense.towers.length; t++)
					{
						new RoomVisual(room_name).circle(container[room_name].defense.towers[t].x, container[room_name].defense.towers[t].y, {fill: "red", radius: 0.5});
					}
				}
			}

			if (typeof Memory.test === 'object')
			{
				wallsTest(Memory.test);
			}
			else
			{
				wallsTest(Memory.rooms);
			}

			if (labs && Memory.mineTest)
			{
				if (!global.setupMining)
				{
					global.setupMining = require('roomPlanner').setupMining;
				}

				let calculate = require('calculate');

				for (let room_name in Memory.mineTest)
				{
					if (!Memory.mineTest[room_name])
					{
						continue;
					}

					//Display the mine path.
					test.paint.minepath(room_name);

					//Draw the labs.
					let labs = Memory.mineTest[room_name].labs;
					for (let la = 0; la < 10; la++)
					{
						let color;
						if (la < 2)
						{
							color = 'darkred';
						}
						else
						{
							color = 'darkblue';
						}

						new RoomVisual(room_name).circle(labs[la].x, labs[la].y, {fill: color, radius: 0.5});
					}

					test.paint.stamp_type = ['mine_pos', 'hand_pos', 'spawn_pos', 'store_pos', 'term_pos']
					//Draw the other stamp coordinates.
					for (let ty = 0; ty < test.paint.stamp_type.length; ty++)
					{
						if (Memory.mineTest[room_name][test.paint.stamp_type[ty]])
						{
							if (ty < 2)
							{
								new RoomVisual(room_name).circle(Memory.mineTest[room_name][test.paint.stamp_type[ty]].x, Memory.mineTest[room_name][test.paint.stamp_type[ty]].y, {fill: test.paint.stamp_color[2], radius: 0.30, opacity: 1});
								new RoomVisual(room_name).circle(Memory.mineTest[room_name][test.paint.stamp_type[ty]].x, Memory.mineTest[room_name][test.paint.stamp_type[ty]].y, {fill: test.paint.stamp_color[ty], radius: 0.25, opacity: 1});
							}
							else
							{
								let stamp_color = test.paint.stamp_color;
								switch(test.paint.stamp_type[ty])
								{
									case 'store_pos':
										new RoomVisual(room_name).rect(Memory.mineTest[room_name][test.paint.stamp_type[ty]].x - 0.3, Memory.mineTest[room_name][test.paint.stamp_type[ty]].y - 0.5, 0.6, 1.2, {fill: stamp_color[2], opacity: 1});
										new RoomVisual(room_name).rect(Memory.mineTest[room_name][test.paint.stamp_type[ty]].x - 0.25, Memory.mineTest[room_name][test.paint.stamp_type[ty]].y - 0.35, 0.5, 0.9, {fill: stamp_color[4], opacity: 1});
										break;
									case 'term_pos':
										new RoomVisual(room_name).rect(Memory.mineTest[room_name][test.paint.stamp_type[ty]].x - 0.5, Memory.mineTest[room_name][test.paint.stamp_type[ty]].y - 0.5, 1, 1, {fill: stamp_color[2], opacity: 1});
										new RoomVisual(room_name).rect(Memory.mineTest[room_name][test.paint.stamp_type[ty]].x - 0.4, Memory.mineTest[room_name][test.paint.stamp_type[ty]].y - 0.4, 0.8, 0.8, {fill: stamp_color[4], opacity: 1});
										break;
									case 'spawn_pos':
										new RoomVisual(room_name).circle(Memory.mineTest[room_name][test.paint.stamp_type[ty]].x, Memory.mineTest[room_name][test.paint.stamp_type[ty]].y, {fill: stamp_color[2], radius: 0.5, opacity: 1});
										new RoomVisual(room_name).circle(Memory.mineTest[room_name][test.paint.stamp_type[ty]].x, Memory.mineTest[room_name][test.paint.stamp_type[ty]].y, {fill: stamp_color[4], radius: 0.4, opacity: 1});
								}
							}
						}
					}

					//Draw the directions out from the spawn.
					for (let sd = 0; sd < Memory.mineTest[room_name].spawn_dir.length; sd++)
					{
						if (Memory.mineTest[room_name].spawn_dir[sd])
						{
							Game.rooms[room_name].visual.poly([{x: Memory.mineTest[room_name].spawn_pos.x, y: Memory.mineTest[room_name].spawn_pos.y,
								dx: calculate.dxdy[Memory.mineTest[room_name].spawn_dir[sd]].dx, dy: calculate.dxdy[Memory.mineTest[room_name].spawn_dir[sd]].dy, direction: Memory.mineTest[room_name].spawn_dir[sd]},
							{x: Memory.mineTest[room_name].spawn_pos.x + calculate.dxdy[Memory.mineTest[room_name].spawn_dir[sd]].dx, y: Memory.mineTest[room_name].spawn_pos.y + calculate.dxdy[Memory.mineTest[room_name].spawn_dir[sd]].dy,
								dx: calculate.dxdy[Memory.mineTest[room_name].spawn_dir[sd]].dx, dy: calculate.dxdy[Memory.mineTest[room_name].spawn_dir[sd]].dy, direction: Memory.mineTest[room_name].spawn_dir[sd]}],
								{stroke: 'white', lineStyle: "dashed"});
						}
					}
				}
			}

			if ((test.spawnmark.spawntest = spawntest) && Memory.spawnTest)
			{
				if (!global.spawnmark)
				{
					//console.log('Making spawnmark available.');
					global.spawnmark = test.spawnmark;
				}

				for (let room_name in Memory.spawnTest)
				{
					//Display the emerging paths.
					for (let p = 0; p < Memory.spawnTest[room_name].paths.length; p++)
					{
						Game.rooms[room_name].visual.poly([{x: Memory.spawnTest[room_name].spawn[0].x, y: Memory.spawnTest[room_name].spawn[0].y,
							dx: Memory.spawnTest[room_name].paths[p][0].dx, dy: Memory.spawnTest[room_name].paths[p][0].dy, direction: Memory.spawnTest[room_name].paths[p][0].direction},
						Memory.spawnTest[room_name].paths[p][0],
						{x: Memory.spawnTest[room_name].paths[p][0].x + Memory.spawnTest[room_name].paths[p][0].dx, y: Memory.spawnTest[room_name].paths[p][0].y + Memory.spawnTest[room_name].paths[p][0].dy,
							dx: Memory.spawnTest[room_name].paths[p][0].dx, dy: Memory.spawnTest[room_name].paths[p][0].dy, direction: Memory.spawnTest[room_name].paths[p][0].direction}],
							{stroke: 'white', lineStyle: "dashed"});
					}

					//Display the marked and blocked tiles.
					for (let t = 0, type = ['marked', 'blocked'], color = ['darkblue', 'darkred']; t < 2; t++)
					{
						for (let ti = 0; ti < Memory.spawnTest[room_name][type[t]].length; ti++)
						{
							new RoomVisual(room_name).rect(Memory.spawnTest[room_name][type[t]][ti].x - 0.5, Memory.spawnTest[room_name][type[t]][ti].y - 0.5, 1, 1, {fill: color[t]});
						}
					}

					//Display the spawns.
					let spawn;
					for (let s = 0; s < Memory.spawnTest[room_name].spawn.length; s++)
					{
						if ((spawn = Memory.spawnTest[room_name].spawn[s]) && spawn.x && spawn.y)
						{
							new RoomVisual(room_name).circle(spawn.x, spawn.y, {fill: test.paint.color[2], radius: 0.5, opacity: 1});
							new RoomVisual(room_name).circle(spawn.x, spawn.y, {fill: test.paint.color[4], radius: 0.4, opacity: 1});
						}
					}
				}
			}
		}
		catch(e)
		{
			console.log(e.stack + ": " + e);
			return false;
		}

		return true;
	},

	paint:
	{
		exitpath: function(room_name, color)
		{
			if (Memory.rooms[room_name].exitpaths === undefined)
			{
				return false;
			}

			let temppath = [];

			for (let e in Memory.rooms[room_name].exitpaths)
			{
				Game.rooms[room_name].visual.poly(Memory.rooms[room_name].exitpaths[e], {stroke: color[0], lineStyle: "dashed"});

				temppath[e] = [];
				for (let n = 0; n < Memory.rooms[room_name].exitpaths[e].length; n++)
				{
					//temppath[e].push({x: Memory.rooms[room_name].exitpaths[e][n].x, y: Memory.rooms[room_name].exitpaths[e][n].y})
				}
			}

			if (Memory.rooms[room_name].exitreturn === undefined)
			{
				return false;
			}

			temppath = [];

			for (let e in Memory.rooms[room_name].exitreturn)
			{
				Game.rooms[room_name].visual.poly(Memory.rooms[room_name].exitreturn[e], {stroke: color[1], lineStyle: "dashed"});

				temppath[e] = [];
				for (let n = 0; n < Memory.rooms[room_name].exitreturn[e].length; n++)
				{
					//temppath[e].push({x: Memory.rooms[room_name].exitreturn[e][n].x, y: Memory.rooms[room_name].exitreturn[e][n].y})
				}
			}

			return true;
		},

		defensepath: function(room_name, color)
		{
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				if (Memory.rooms[room_name].sources[i].defpaths === undefined)
				{
					continue;
				}

				for (let p = 0; p < Memory.rooms[room_name].sources[i].defpaths.length; p++)
				{
					Game.rooms[room_name].visual.poly(Memory.rooms[room_name].sources[i].defpaths[p], {stroke: color[0], lineStyle: "dashed"});
				}

				if (Memory.rooms[room_name].sources[i].dreturn === undefined)
				{
					continue;
				}

				for (let p = 0; p < Memory.rooms[room_name].sources[i].dreturn.length; p++)
				{
					Game.rooms[room_name].visual.poly(Memory.rooms[room_name].sources[i].dreturn[p], {stroke: color[1], lineStyle: "dashed"});
				}
			}
			return true;
		},

		patrolpath: function(room_name, color)
		{
			if (Memory.rooms[room_name].defense.patrol === undefined)
			{
				return false;
			}

			for (let e = 0; e < Memory.rooms[room_name].defense.patrol.length; e++)
			{
				Game.rooms[room_name].visual.poly(Memory.rooms[room_name].defense.patrol[e], {stroke: color[0], lineStyle: "dashed"});
				Game.rooms[room_name].visual.poly(Memory.rooms[room_name].defense.preturn[e], {stroke: color[1], lineStyle: "dashed"});	//They should be the same length, so this should work.
			}
			return true;
		},

		sourcepath: function(room_name, temproles, color)
		{
			let temppath = [[], []];
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				for (let r = 0; r < temproles.length; r++)
				{
					for (let n = 0; n < Memory.rooms[room_name].sources[i][temproles[r]].length; n++)
					{
						temppath[i].push([Memory.rooms[room_name].sources[i][temproles[r]][n].x, Memory.rooms[room_name].sources[i][temproles[r]][n].y])
					}
				}

				//console.log(JSON.stringify(temppath[i]));
				Game.rooms[room_name].visual.poly(temppath[i], {stroke: color, lineStyle: "dashed"});
			}
			return true;
		},

		actionpath: function(room_name, action, color)
		{
			let tpath = [];
			let tpath2 = [];
			for (let p = 0; p < action.path.length; p++)
			{
				if (action.path[p].roomName == room_name)
				{
					tpath.push(action.path[p]);
				}
				else
				{
					tpath2.push(action.path[p]);
				}
			}
			Game.rooms[room_name].visual.poly(tpath, {stroke: color[0], lineStyle: "dashed"});
			Game.rooms[room_name].visual.poly(tpath2, {stroke: color[1], lineStyle: "dashed"});
		},

		minepath: function(room_name)
		{
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				Game.rooms[room_name].visual.poly(Memory.rooms[room_name].sources[i].labs, {stroke: 'darkblue', lineStyle: "dashed"});
				Game.rooms[room_name].visual.poly(Memory.rooms[room_name].sources[i].lreturn, {stroke: 'darkblue', lineStyle: "dashed"});
			}
			Game.rooms[room_name].visual.poly(Memory.rooms[room_name].mine.epath, {stroke: 'darkred', lineStyle: "dashed"});
			Game.rooms[room_name].visual.poly(Memory.rooms[room_name].mine.ereturn, {stroke: 'darkred', lineStyle: "dashed"});
		},

		stamp_color: ['gold', 'gray', 'black', 'white', 'gold'],
		stamp_type: ['mine_pos', 'hand_pos', 'spawn_pos', 'store_pos', 'term_pos']
	},

	direction: ['[]', "\u2191", "\u2197", "\u2192", "\u2198", "\u2193", "\u2199", "\u2190", "\u2196"],
	pindex: -1,
	paths: ['mine', 'mreturn', 'upgrade', 'ureturn', 'defpaths', 'dreturn', 'patrol', 'preturn', 'exitpath', 'exitreturn', 'mfat', 'upgrader', 'labs', 'lreturn'],

	spawnmark: function(room_name = false, direction = false, reset = 0)	//When placing the initial 'spawn', pass an object with its x and y as direction.
	{
		if (!room_name || (typeof direction !== 'number' && typeof direction !== 'object'))
		{
			return false;
		}

		if (!Memory.spawnTest)
		{
			Memory.spawnTest = {};
		}
		else if (reset === 2)
		{
			Memory.spawnTest = undefined;

			if (reset === 2)
			{
				return true;
			}
		}

		let dx, dy;
		if (typeof direction === 'number')
		{
			let calculate = require('calculate');
			dx = calculate.dxdy[direction].dx;
			dy = calculate.dxdy[direction].dy;
		}

		if (!Memory.spawnTest[room_name] || (reset === 1 && (direction = {x: Memory.spawnTest[room_name].spawn[0].x, y: Memory.spawnTest[room_name].spawn[0].y})))
		{
			Memory.spawnTest[room_name] =
			{
				spawn: [{x: direction.x, y: direction.y, roomName: room_name}, {}],
				paths: [],
				marked: [],
				blocked: []
			};
			return true;
		}
		else
		{
			let path = Game.rooms[room_name].findPath(
				new RoomPosition(Memory.spawnTest[room_name].spawn[0].x, Memory.spawnTest[room_name].spawn[0].y, room_name),
				new RoomPosition(Memory.spawnTest[room_name].spawn[0].x + dx, Memory.spawnTest[room_name].spawn[0].y + dy, room_name));
			Memory.spawnTest[room_name].paths.push(path);
			return require('init').run.spawn.block(Memory.spawnTest[room_name].marked, Memory.spawnTest[room_name].blocked, Memory.spawnTest[room_name].spawn[0], path, Memory.spawnTest[room_name].spawn[1]);
		}
	},

	pathmemtest: function()
	{
		if(Memory)
		{
			let path = [];
			let path2 = [];

			for (let room_name in Memory.rooms)
			{
				path.push(Memory.rooms[room_name].upgrade);
				for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
				{
					path.push(Memory.rooms[room_name].sources[i].mine);
					path.push(Memory.rooms[room_name].sources[i].mreturn);
					path.push(Memory.rooms[room_name].sources[i].upgrade);
					path.push(Memory.rooms[room_name].sources[i].ureturn);
					for (let e = 0; e < Memory.rooms[room_name].sources[i].defpaths.length; e++)
					{
						path.push(Memory.rooms[room_name].sources[i].defpaths[e]);
					}
					for (let e = 0; e < Memory.rooms[room_name].sources[i].defpaths.length; e++)
					{
						path.push(Memory.rooms[room_name].sources[i].dreturn[e]);
					}
					for (let exit_name in Memory.rooms[room_name].exitpaths)
					{
						path.push(Memory.rooms[room_name].exitpaths[exit_name]);
					}
					for (let exit_name in Memory.rooms[room_name].exitreturn)
					{
						path.push(Memory.rooms[room_name].exitreturn[exit_name]);
					}
					for (let p = 0; p < Memory.rooms[room_name].defense.patrol.length; p++)
					{
						path.push(Memory.rooms[room_name].defense.patrol[p]);
					}
					for (let p = 0; p < Memory.rooms[room_name].defense.preturn.length; p++)
					{
						path.push(Memory.rooms[room_name].defense.preturn[p]);
					}
				}
			}

			console.log('Path Steps: ' + path.length);

			let cpu_usage = {Begin: Game.cpu.getUsed()};

			for (let p = 0; p < path.length; p++)
			{
				path[p] = JSON.stringify(path[p]);
			}

			cpu_usage.Serialize = Game.cpu.getUsed() - cpu_usage.Begin;

			for (let p = 0; p < path.length; p++)
			{
				path2[p] = JSON.parse(path[p]);
			}

			cpu_usage.Deserialize = Game.cpu.getUsed() - cpu_usage.Begin - cpu_usage.Serialize;

			console.log('Serialize: ' + cpu_usage.Serialize);
			console.log('Deserialize: ' + cpu_usage.Deserialize);
			console.log((JSON.stringify(path).length / 1024) + " Kb");
			return true;
		}
	},

	newpathmemtest()
	{
		let all_paths = [];
		let serialized;
		let deserialized;
		for (let room_name in Memory.rooms)
		{
			all_paths.push(Memory.rooms[room_name].path);
		}

		console.log('Testing new paths.');

		let cpu_usage = {Begin: Game.cpu.getUsed()};

		serialized = JSON.stringify(all_paths);

		cpu_usage.Serialize = Game.cpu.getUsed() - cpu_usage.Begin;

		deserialized = JSON.parse(serialized);

		cpu_usage.Deserialize = Game.cpu.getUsed() - cpu_usage.Begin - cpu_usage.Serialize;

		console.log('Serialize: ' + cpu_usage.Serialize);
		console.log('Deserialize: ' + cpu_usage.Deserialize);
		console.log((serialized.length / 1024) + " Kb");
		return true;
	}

	/*cpu: function()
	{
		for (let module in test.cpu_usage)
		{
			console.log(module + " " + test.cpu_usage[module]);
		}
	},

	cpu_usage: undefined*/
};

test.spawnmark.spawntest = false;

module.exports = test;