var test =
{
	run: function(paths, extensions_sources, defenses, newpath = false, actionpath = false)
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

			pindex++;
			if (pindex > 11)
			{
				pindex = 0;
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
					if (x != test.path[pindex])
					{
						break;
					}
					for (let y in Memory.rooms[room_name].path[x])
					{
						for (let path in Memory.rooms[room_name].path[x][y])
						{
							x = +x;
							y = +y;
							style.backgroundColor = false;
							switch(path)
							{
								default:
									Game.rooms[room_name].visual.text(test.direction[Memory.rooms[room_name].path[x][y][path]], x, y, style);
									break;

								case 'mine':
								case 'mreturn':
								case 'mfat':
									style.backgroundColor = 'blue';
								case 'upgrade':
								case 'ureturn':
									if(!style.backgroundColor)
									{
										style.backgroundColor = 'red';
									}

									for (i = 0; i < Memory.rooms[room_name].path[x][y][path].length; i++)
									{
										if (Memory.rooms[room_name].path[x][y][path][i] === null)
										{
											continue;
										}

										Game.rooms[room_name].visual.text(test.direction[Memory.rooms[room_name].path[x][y][path][i]], x, y, style);
									}
									break;

								case 'defpath':
								case 'dreturn':
									style.backgroundColor = 'purple';

									for (i = 0; i < Memory.rooms[room_name].path[x][y][path].length; i++)
									{
										if (!Array.isArray(Memory.rooms[room_name].path[x][y][path][i]))
										{
											/*if (room_name == 'E49S15')
											{
												console.log('1st test. x: ' + x + ' y: ' + y);
											}*/
											continue;
										}

										for (let e in Memory.rooms[room_name].path[x][y][path][i])
										{
											Game.rooms[room_name].visual.text(test.direction[Memory.rooms[room_name].path[x][y][path][i][e]], x, y, style);
										}
									}
									break;

								case 'patrol':
								case 'preturn':
									style.backgroundColor = 'orange';

									for (let e in Memory.rooms[room_name].path[x][y][path])
									{
										Game.rooms[room_name].visual.text(test.direction[Memory.rooms[room_name].path[x][y][path][e]], x, y, style);
									}
									break;

								case 'exitpath':
								case 'exitreturn':
									style.backgroundColor = 'green';

									for (let e in Memory.rooms[room_name].path[x][y][path])
									{
										Game.rooms[room_name].visual.text(test.direction[Memory.rooms[room_name].path[x][y][path][e]], x, y, style);
									}
									break;
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
		}
	},

	direction: ['F', "\u2191", "\u2197", "\u2192", "\u2198", "\u2193", "\u2199", "\u2190", "\u2196"],
	pindex: -1,
	paths: ['mine', 'mreturn', 'upgrade', 'ureturn', 'defpath', 'dreturn', 'patrol', 'preturn', 'exitpath', 'exitreturn', 'upgrader', 'mfat'],

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

	/*cpu: function()
	{
		for (let module in test.cpu_usage)
		{
			console.log(module + " " + test.cpu_usage[module]);
		}
	},

	cpu_usage: undefined*/
};

module.exports = test;