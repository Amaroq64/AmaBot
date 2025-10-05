var control =
{
	harvester: require('role.harvester'),
	upgrader: require('role.upgrader'),
	transport: require('role.transport'),

	//These aliases both draw upon and modify our transport role.
	mtransport: require('role.mtransport'),
	utransport: require('role.utransport'),

	builder: require('role.builder'),
	//ubuilder: require('role.ubuilder'),
	dbuilder: require('role.dbuilder'),

	//guard: require('role.guard'),

	calculate: require('calculate'),

	run: function()
	{
		for (let room_name in Memory.rooms)	//Enumerate rooms. This only contains rooms where we have a spawner, so we don't have to worry about being agnostic of neutral rooms.
		{
			//We're going to be operating on our extensions every tick, so let's make sure they're in memory.
			if (!control.calculate.extensions[room_name])
			{
				console.log("Getting extensions.");
				control.calculate.getExtensions(room_name);
			}

			for (let creep_type in Memory.rooms[room_name].creeps)	//Enumerate creep roles assigned to this room.
			{
				for (let n = 0; n < Memory.rooms[room_name].creeps[creep_type].length; n++)	//Iterate each creep in this role.
				{
					let creep = Game.creeps[Memory.rooms[room_name].creeps[creep_type][n]];
					//console.log(creep.name);
					//Run the role method for this creep. It does its thing, then decides whether we move or not.
					//Assumes we have a method for every creep role we could find here.
					if (!creep.spawning)
					{
						if (control[creep_type].run(creep))
						{
							control.move(creep, creep_type);
						}
					}
				}
			}
			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)	//Iterate over each source in this room.
			{
				//let totalcreeps = 0;
				for (let creep_type in Memory.rooms[room_name].sources[i].creeps)	//Enumerate creep roles assigned to this source.
				{
					for (let n = 0; n < Memory.rooms[room_name].sources[i].creeps[creep_type].length; n++)		//Iterate each creep in this role.
					{
						let creep = Game.creeps[Memory.rooms[room_name].sources[i].creeps[creep_type][n]];
						//console.log(creep.name);
						//Run the role method for this creep. It does its thing, then decides whether we move or not.
						//Assumes we have a method for every creep role we could find here.
						if (creep && !creep.spawning)
						{
							if (control[creep_type].run(creep, i))
							{
								control.move(creep, creep_type, i);
							}
						}
					}
				}
			}
		}
	},

	move: function(creep, role, source = false)
	{
		let status;
		let pos = creep.pos;
		let room_name = creep.room.name;

		if(creep.spawning)
		{
			return true;
		}
		else if(creep.memory.movenow.length != 0)	//If the creep has immediate move orders, follow them.
		{
			if (creep.pos.x == creep.memory.movenow[0].x && creep.pos.y == creep.memory.movenow[0].y)
			{
				creep.memory.direction = creep.memory.movenow.shift().direction;
			}
		}
		else if(Memory.rooms[room_name].path[pos.x] && Memory.rooms[room_name].path[pos.x][pos.y])	//Otherwise, follow its routine path.
		{
			let room_name = creep.room.name
			let tempdir = Memory.rooms[room_name].path[pos.x][pos.y];

			let flipper = false;
			if (tempdir.flipper)
			{
				if (tempdir.flipper[control.paths[creep.memory.path]] && role !== 'harvester')	//Have we reached our current path's flipper.
				{
					flipper = tempdir.flipper[control.paths[creep.memory.path]];	//We'll validate the source and/or exit later.
				}
				else if (role === 'harvester' && tempdir.flipper.mfat && tempdir.flipper.mfat[source]	//We're a harvester who has reached a flipper.mfat
					&& Memory.rooms[room_name].path[pos.x][pos.y].mfat && Memory.rooms[room_name].path[pos.x][pos.y].mfat[source])	//Every mfat is just one step long, so the mfat flipper and the mfat direction should always be on the same tile.
				{
					flipper = tempdir.flipper.mfat[source];
					creep.memory.path = 10;	//We already know where to go from here.
				}
			}

			if (tempdir = tempdir[control.paths[creep.memory.path]])	//Assign within the comparison.
			{
				//upgrader and other shallow paths don't need a case.
				//We can also finalize the flipper in these cases.
				switch (creep.memory.path)
				{
					case 0:	//mine[]
					case 1:	//mreturn[]
					case 2:	//upgrade[]
					case 3:	//ureturn[]
					case 10://mfat[]
						if (tempdir[source])
						{
							tempdir = tempdir[source];
						}
						else
						{
							tempdir = false;
						}

						if (flipper && flipper[source])
						{
							flipper = flipper[source];
						}
						else
						{
							flipper = false;
						}
						break;
					case 4:	//defpath[][exit]
					case 5:	//dreturn[][exit]
						if (role === 'dbuilder')
						{
							source = creep.memory.s;	//This creep doesn't actually belong to a source.
						}

						creep.memory.need = Memory.rooms[room_name].defense.need;

						if (tempdir[source] && tempdir[source][creep.memory.need])
						{
							tempdir = tempdir[source][creep.memory.need];
						}
						else
						{
							tempdir = false;
						}

						if (flipper && flipper[source] && flipper[source][creep.memory.need])
						{
							flipper = flipper[source][creep.memory.need];
						}
						else
						{
							flipper = false;
						}
						break;
					case 6:	//patrol[exit]
					case 7:	//preturn[exit]
					//We can re-use creep.memory.need if we need to track an exit name.
					case 8:	//exitpath[exit_name]
					case 9:	//exitreturn[exit_name]
						if (tempdir[creep.memory.need])
						{
							tempdir = tempdir[creep.memory.need];
						}
						else
						{
							tempdir = false;
						}

						if (flipper[creep.memory.need])
						{
							flipper = flipper[creep.memory.need];
						}
						else
						{
							flipper = false;
						}
						break;
				}
			}
			else
			{
				tempdir = false;
			}

			//When we hit a flipper, we need to change to another path. Luckily for us, we made all our going paths odd, and all our return paths even.
			if (flipper)
			{
				switch (role)
				{
					//Upgraders don't need to be flipped.
					//If it's a harvester, we've already flipped it.
					case 'dbuilder':
						if (creep.memory.path === 6)
						{
							creep.memory.path = 7;
							break;
						}
						else if (creep.memory.path === 7)
						{
							creep.memory.path = 6;
							break;
						}
					case 'builder':
						if (creep.memory.path === 4)
						{
							if (role === 'dbuilder')
							{
								creep.memory.path = 6;
								creep.memory.dtrip = undefined;
								creep.memory.s = undefined;
							}
							else
							{
								//If we've reached the defpath flipper, come back.
								creep.memory.path = 5;
								//If we're switching to a completely new path, we need to override our previous direction change.
								if (Memory.rooms[room_name].path[pos.x][pos.y].dreturn && Memory.rooms[room_name].path[pos.x][pos.y].dreturn[source] && Memory.rooms[room_name].path[pos.x][pos.y].dreturn[source][creep.memory.need])
								{
									tempdir = Memory.rooms[room_name].path[pos.x][pos.y].dreturn[source][creep.memory.need];
								}
							}
							break;
						}
						else if (creep.memory.path === 5)
						{
							creep.memory.dtrip = false;

							//dreturn ultimately goes to mreturn, but may need to traverse mine to get there.
							//If there's a mine flipper here with our dreturn flipper, we can skip the traversal via mine and go directly to mreturn.
							if (Memory.rooms[room_name].path[pos.x][pos.y].flipper.mine && Memory.rooms[room_name].path[pos.x][pos.y].flipper.mine[source])
							{
								creep.memory.path = 1;	//We've completed our return from the defender and are going to the spawn next via mreturn.

								//If we're switching to a completely new path, we need to override our previous direction change.
								if (Memory.rooms[room_name].path[pos.x][pos.y].mreturn && Memory.rooms[room_name].path[pos.x][pos.y].mreturn[source])
								{
									tempdir = Memory.rooms[room_name].path[pos.x][pos.y].mreturn[source];
								}
							}
							else
							{
								creep.memory.path = 0;	//We're traversing mine for a bit to get to mreturn.

								//If we're switching to a completely new path, we need to override our previous direction change.
								if (Memory.rooms[room_name].path[pos.x][pos.y].mine && Memory.rooms[room_name].path[pos.x][pos.y].mine[source])
								{
									tempdir = Memory.rooms[room_name].path[pos.x][pos.y].mine[source];
								}
							}
							break;
						}
					case 'mtransport':
						switch (creep.memory.path)
						{
							case 0:
								if (creep.memory.utrip)	//We're still coming back from the upgrader.
								{
									creep.memory.path = 1;
									creep.memory.utrip = false;
								}
								else	//We're doing a fresh run to the upgrader.
								{
									creep.memory.path = 2;
									creep.memory.utrip = true;

									//If we're switching to a completely new path, we need to override our previous direction change.
									if (Memory.rooms[room_name].path[pos.x][pos.y].upgrade && Memory.rooms[room_name].path[pos.x][pos.y].upgrade[source])
									{
										tempdir = Memory.rooms[room_name].path[pos.x][pos.y].upgrade[source];
									}
									/*else if (Memory.rooms[room_name].path[pos.x][pos.y].mine && Memory.rooms[room_name].path[pos.x][pos.y].mine[source])
									{
										tempdir = Memory.rooms[room_name].path[pos.x][pos.y].mine[source];
									}*/
								}
								break;
							case 1:
								creep.memory.path = 0;	//We're going back from the spawn to the source.
								break;
							case 2:
								creep.memory.path = 3;	//We're coming back from the upgrader to the source.
								break;
							case 3:
								//ureturn ultimately goes to mreturn, but may need to traverse mine to get there.
								//If there's a mine flipper here with our ureturn flipper, we can skip the traversal via mine and go directly to mreturn.
								if (Memory.rooms[room_name].path[pos.x][pos.y].flipper.mine && Memory.rooms[room_name].path[pos.x][pos.y].flipper.mine[source]
								&& (role === 'mtransport' || (role === 'builder' && Memory.rooms[room_name].creeps.dbuilder.length === 0)))	//If there are no dbuilders, we shouldn't visit them.
								{
									creep.memory.path = 1;	//We've completed our return from the upgrader and are going to the spawn next via mreturn.
									creep.memory.utrip = false;

									//If we're switching to a completely new path, we need to override our previous direction change.
									if (Memory.rooms[room_name].path[pos.x][pos.y].mine && Memory.rooms[room_name].path[pos.x][pos.y].mine[source])
									{
										creep.memory.utrip = false;
										tempdir = Memory.rooms[room_name].path[pos.x][pos.y].mine[source];
									}
								}
								else if (role === 'builder' && Memory.rooms[room_name].creeps.dbuilder.length > 0)
								{
									//The builder has the same routine as the mtransport, but after visiting the upgrader it visits the dbuilder.
									creep.memory.path = 4;	//We've completed our return from the upgrader and are going to the dbuilder.
									creep.memory.utrip = false;
									creep.memory.dtrip = true;

									//If we're switching to a completely new path, we need to override our previous direction change.
									if (Memory.rooms[room_name].path[pos.x][pos.y].defpath && Memory.rooms[room_name].path[pos.x][pos.y].defpath[source] && Memory.rooms[room_name].path[pos.x][pos.y].defpath[source][creep.memory.need])
									{
										tempdir = Memory.rooms[room_name].path[pos.x][pos.y].defpath[source][creep.memory.need];
									}
									else if (Memory.rooms[room_name].path[pos.x][pos.y].mine && Memory.rooms[room_name].path[pos.x][pos.y].mine[source])
									{
										tempdir = Memory.rooms[room_name].path[pos.x][pos.y].mine[source];	//Apparently we need a step from mine first.
									}
								}
								else
								{
									creep.memory.path = 0;	//We're traversing mine for a bit to get to mreturn.

									//If we're switching to a completely new path, we need to override our previous direction change.
									if (Memory.rooms[room_name].path[pos.x][pos.y].mine && Memory.rooms[room_name].path[pos.x][pos.y].mine[source])
									{
										tempdir = Memory.rooms[room_name].path[pos.x][pos.y].mine[source];
									}
								}
								break;
						}
						break;
					case 'utransport':
						if (creep.memory.path === 3)
						{
							creep.memory.path = 2;
						}
						else if (creep.memory.path === 2)
						{
							creep.memory.path = 3;
						}
						if (Memory.rooms[room_name].path[pos.x][pos.y][control.paths[creep.memory.path]])
						{
							tempdir = Memory.rooms[room_name].path[pos.x][pos.y][control.paths[creep.memory.path]];
						}
						break;
				}
			}

			if (tempdir)
			{
				creep.memory.direction = tempdir;
			}
		}

		status = creep.move(creep.memory.direction);

		switch (status)
		{
			case ERR_NOT_IN_RANGE:
			{
				console.log(creep.pos.x + ", " + creep.pos.y + " - " + creep.name + ": " + " - Tow Not In Range.");
				break;
			}
			case ERR_INVALID_ARGS:
			{
				console.log(creep.name + ": " + role + " Invalid Direction.");
				break;
			}
		}

		return status;
	},

	move_old: function(creep, role, source = false)
	{
		let status;

		if(creep.spawning)
		{
			return;
		}
		else if(creep.memory.movenow.length != 0)	//If the creep has immediate move orders, follow them.
		{
			status = creep.moveByPath(creep.memory.movenow)
			if(status == OK || status == ERR_TIRED)
			{
				//console.log(creep.name + ": Using stored move.");
			}
			else if (status == ERR_NOT_FOUND)	//We've presumably completed our move orders. Switch back to normal movement.
			{
				Memory.creeps[creep.name].movenow = [];
				console.log(creep.name + ": Switching to normal pathing.");
				return control.move(creep, role, source);
			}
			else
			{
				//console.log(creep.name + " stored move status " + status + ".");
			}
			return;
		}
		else	//Otherwise, follow its routine path.
		{
			let room_name = creep.room.name
			let path = [];
			//console.log(role + " " + creep.name);

			switch (role)
			{
				case "harvester":
				{
					path = Memory.rooms[creep.room.name].sources[source].mine.concat(Memory.rooms[creep.room.name].sources[source].mfat);
					break;
				}

				case "builder":
				{
					//These keep winding up outside our room.
					if (Memory.rooms[creep.room.name] === undefined)
					{
						return true;
					}
					else
					{
						//Move back into the room.
						if (creep.pos.x == 0)
						{
							creep.move(RIGHT);
							return true;
						}
						else if (creep.pos.x == 49)
						{
							creep.move(LEFT);
							return true;
						}
						else if (creep.pos.y == 0)
						{
							creep.move(BOTTOM);
							return true;
						}
						else if (creep.pos.y == 49)
						{
							creep.move(TOP);
							return true;
						}

						if(Memory.creeps[creep.name].dtrip)	//We're going to the defense.
						{
							path = [Memory.rooms[creep.room.name].sources[source].defpaths[Memory.rooms[room_name].defense.need].slice(0, -1), Memory.rooms[creep.room.name].sources[source].dreturn[0]][+ Memory.creeps[creep.name].return];
						}
					}
				}
				case "mtransport":
				{
					if (!Memory.creeps[creep.name].dtrip && Memory.creeps[creep.name].utrip)	//We're going to the upgrader.
					{
						path = [Memory.rooms[creep.room.name].sources[source].upgrade, Memory.rooms[creep.room.name].sources[source].ureturn][+ Memory.creeps[creep.name].return];
					}
					else if (!Memory.creeps[creep.name].dtrip)	//We're going to the source.
					{
						path = [Memory.rooms[creep.room.name].sources[source].mine, Memory.rooms[creep.room.name].sources[source].mreturn][+ Memory.creeps[creep.name].return];
					}
					break;
				}

				/*case "mtransport":
				{
					path = [Memory.rooms[creep.room.name].sources[source].mine, Memory.rooms[creep.room.name].sources[source].mreturn][+ Memory.creeps[creep.name].return];
					break;
				}*/

				case "utransport":
				{
					path = [Memory.rooms[creep.room.name].sources[source].upgrade, Memory.rooms[creep.room.name].sources[source].ureturn][+ Memory.creeps[creep.name].return];
					break;
				}

				case "upgrader":
				{
					path = Memory.rooms[room_name].upgrade;
					break;
				}

				case "dbuilder":
				{
					//These keep winding up outside our room.
					if (Memory.rooms[creep.room.name] === undefined)
					{
						return true;
					}
					else
					{
						//Move back into the room.
						if (creep.pos.x == 0)
						{
							creep.move(RIGHT);
							return true;
						}
						else if (creep.pos.x == 49)
						{
							creep.move(LEFT);
							return true;
						}
						else if (creep.pos.y == 0)
						{
							creep.move(BOTTOM);
							return true;
						}
						else if (creep.pos.y == 49)
						{
							creep.move(TOP);
							return true;
						}

						path = [Memory.rooms[creep.room.name].defense.patrol[Memory.rooms[room_name].defense.need],
								Memory.rooms[creep.room.name].defense.preturn[Memory.rooms[room_name].defense.need]][+ Memory.creeps[creep.name].return];
					}
				}
			}

			//If we're at the end of our path, we swich to the other one.
			if (creep.pos.isEqualTo(Game.rooms[room_name].getPositionAt(path.slice(-1)[0].x, path.slice(-1)[0].y)))
			{
				Memory.creeps[creep.name].return = !Memory.creeps[creep.name].return;
				//creep.say(["Going.", "Returning."][+ Memory.creeps[creep.name].return]);
				return control.move(creep, role, source);
			}

			status = creep.moveByPath(path);

			switch (status)
			{
				case ERR_NOT_FOUND:
				{
					console.log(creep.pos.x + ", " + creep.pos.y + " - " + creep.name + ": " + " - Path Not Found.");
					//console.log("Utrip: " + creep.memory.utrip + ". Dtrip: " + creep.memory.dtrip + ". Return: " + creep.memory.return + ".");
					
					let tpath = [];
					for (p = 0; p < path.length; p++)
					{
						tpath.push(Game.rooms[room_name].getPositionAt(path[p].x, path[p].y));
					}
					Memory.creeps[creep.name].movenow = creep.pos.findPathTo(creep.pos.findClosestByPath(tpath));

					/*let pathstr = "";
					for (let p = 0; p < path.length; p++)
					{
						if (p > 0)
						{
							pathstr += " ";
						}
						pathstr += "(" + path[p].x + ", " + path[p].y + ", " + path[p].direction + ")";
						if(p > 1 && p % 22 == 0)
						{
							pathstr +="\n";
						}
					}
					console.log(pathstr);*/
					//console.log(JSON.stringify(path));
					//creep.room.visual.poly(path, {stroke: "blue", lineStyle: "dashed"});
					break;
				}
				case ERR_INVALID_ARGS:
				{
					console.log(creep.name + ": " + role + " Invalid Path.");
					break;
				}
			}
			//console.log(JSON.stringify(path));
			return status;
		}
	},

	paths: ['mine', 'mreturn', 'upgrade', 'ureturn', 'defpath', 'dreturn', 'patrol', 'preturn', 'exitpath', 'exitreturn', 'mfat', 'upgrader']
};

module.exports = control;