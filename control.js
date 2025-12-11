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

	//transfer: require('role.transfer'),

	calculate: require('calculate'),

	run: function()
	{
		for (let room_name in Memory.rooms)	//Enumerate rooms. This only contains rooms where we have a spawner, so we don't have to worry about being agnostic of neutral rooms.
		{
			//We're going to be operating on our extensions every tick, so let's make sure they're in memory.
			if (!control.calculate.extensions[room_name])
			{
				//console.log("Getting extensions.");
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

		if(creep.spawning || creep.fatigue > 0)
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
			let tempdir = Memory.rooms[room_name].path[pos.x][pos.y];

			let flipper;
			if (tempdir.flipper && tempdir.flipper[control.paths[creep.memory.path]])
			{
				/*if (tempdir.flipper[control.paths[creep.memory.path]] && role !== 'harvester')	//Have we reached our current path's flipper.
				{
					flipper = tempdir.flipper[control.paths[creep.memory.path]];	//We'll validate the source and/or exit later.
				}
				else if (role === 'harvester' && tempdir.flipper.mfat && tempdir.flipper.mfat[source]	//We're a harvester who has reached a flipper.mfat
					&& Memory.rooms[room_name].path[pos.x][pos.y].mfat && Memory.rooms[room_name].path[pos.x][pos.y].mfat[source])	//Every mfat is just one step long, so the mfat flipper and the mfat direction should always be on the same tile.
				{
					flipper = tempdir.flipper.mfat[source];
					creep.memory.path = 10;	//We already know where to go from here.
				}*/

				flipper = tempdir.flipper[control.paths[creep.memory.path]];	//We'll validate the source and/or exit later.
			}
			else
			{
				flipper = false;
			}

			if ((tempdir = tempdir[control.paths[creep.memory.path]]) || flipper)	//Assign within the comparison.
			{
				//upgrader and other shallow paths don't need a case.
				//flipper has been assigned path[x][y].flipper[path_name].
				//It's up to us to finalize a deeper assignment here.
				switch (creep.memory.path)
				{
					case 0:	//mine[]
					case 1:	//mreturn[]
					case 2:	//upgrade[]
					case 3:	//ureturn[]
					case 10://mfat[]
						if (tempdir && tempdir[source])
						{
							tempdir = tempdir[source];
						}
						else
						{
							tempdir = false;
						}

						//Typically we are bound to one source.
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

						if (tempdir && tempdir[source] && tempdir[source][creep.memory.need])
						{
							tempdir = tempdir[source][creep.memory.need];
						}
						else
						{
							tempdir = false;
						}

						//Typically we are bound to one source.
						if (role === 'dbuilder')	//dbuilders never return from a defpath.
						{
							if (flipper && flipper[source])
							{
								flipper = flipper[source];
							}
							else
							{
								flipper = false;
							}
						}
						else if (creep.memory.path === 5)
						{
							if (flipper && flipper[source])
							{
								flipper = flipper[source];
							}
							else
							{
								flipper = false;
							}
						}
						break;
					//We can use creep.memory.need to track either an exit index or an exit name.
					case 6:	//patrol[exit]
					case 7:	//preturn[exit]
					case 8:	//exitpath[exit_name]
					case 9:	//exitreturn[exit_name]
						if (tempdir && tempdir[creep.memory.need])
						{
							tempdir = tempdir[creep.memory.need];
						}
						else
						{
							tempdir = false;
						}

						/*if (flipper[creep.memory.need])
						{
							flipper = flipper[creep.memory.need];
						}
						else
						{
							flipper = false;
						}*/
						break;
				}
			}
			else
			{
				tempdir = false;
			}

			//When we hit a flipper, we need to change to another path.
			if (flipper)
			{
				switch (role)
				{
					//Upgraders don't need to be flipped.
					case 'dbuilder':
						if (creep.memory.path === 6)
						{
							creep.memory.path = 7;
							//If we're switching to a completely new path, we need to override our previous direction change.
							tempdir = flipper[control.paths[creep.memory.path]][creep.memory.need];
							break;
						}
						else if (creep.memory.path === 7)
						{
							creep.memory.path = 6;
							//If we're switching to a completely new path, we need to override our previous direction change.
							tempdir = flipper[control.paths[creep.memory.path]][creep.memory.need];
							break;
						}
					case 'builder':
						if (creep.memory.path === 4)
						{
							if (role === 'dbuilder')	//dbuilders never return from a defpath.
							{
								//The endpoints are flawed.
								creep.memory.path = 6;
								creep.memory.dtrip = undefined;
								creep.memory.s = undefined;

								//If we're switching to a completely new path, we need to override our previous direction change.
								tempdir = flipper[control.paths[creep.memory.path]];
							}
							else
							{
								//If we've reached the defpath flipper, come back.
								creep.memory.path = 5;
								//If we're switching to a completely new path, we need to override our previous direction change.
								tempdir = flipper[control.paths[creep.memory.path]][creep.memory.need];
							}
							break;
						}
						else if (creep.memory.path === 5)
						{
							creep.memory.dtrip = false;

							//dreturn ultimately goes to mreturn.
							/*if (Memory.rooms[room_name].path[pos.x][pos.y].flipper.mine && Memory.rooms[room_name].path[pos.x][pos.y].flipper.mine[source])
							{
								creep.memory.path = 1;	//We've completed our return from the defender and are going to the spawn next via mreturn.
							}*/
							/*else
							{
								creep.memory.path = 0;	//We're traversing mine for a bit to get to mreturn.
							}*/

							creep.memory.path = 1;	//We've completed our return from the defender and are going to the spawn next via mreturn.

							//If we're switching to a completely new path, we need to override our previous direction change.
							if (Array.isArray(flipper[control.paths[creep.memory.path]]))
							{
								//We currently don't have any reason to reverse from dreturn[need] to defpaths[need], but the flipper exists.
								tempdir = flipper[control.paths[creep.memory.path]][creep.memory.need];
							}
							else
							{
								tempdir = flipper[control.paths[creep.memory.path]];
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
									/*if (Memory.rooms[room_name].path[pos.x][pos.y].upgrade && Memory.rooms[room_name].path[pos.x][pos.y].upgrade[source])
									{
										tempdir = Memory.rooms[room_name].path[pos.x][pos.y].upgrade[source];
									}*/
									/*else if (Memory.rooms[room_name].path[pos.x][pos.y].mine && Memory.rooms[room_name].path[pos.x][pos.y].mine[source])
									{
										tempdir = Memory.rooms[room_name].path[pos.x][pos.y].mine[source];
									}*/
								}

								//If we're switching to a completely new path, we need to override our previous direction change.
								if (Array.isArray(flipper[control.paths[creep.memory.path]]))
								{
									//If we're going to defpaths[need].
									tempdir = flipper[control.paths[creep.memory.path]][creep.memory.need];
								}
								else
								{
									tempdir = flipper[control.paths[creep.memory.path]];
								}
								break;
							case 1:
								creep.memory.path = 0;	//We're going back from the spawn to the source.
								tempdir = flipper[control.paths[creep.memory.path]];
								break;
							case 2:
								creep.memory.path = 3;	//We're coming back from the upgrader to the source.
								tempdir = flipper[control.paths[creep.memory.path]];
								break;
							case 3:
								//ureturn ultimately goes to mreturn, but may need to traverse mine to get there.
								//If there's a mine flipper here with our ureturn flipper, we can skip the traversal via mine and go directly to mreturn.
								//if (Memory.rooms[room_name].path[pos.x][pos.y].flipper.mine && Memory.rooms[room_name].path[pos.x][pos.y].flipper.mine[source]
								if (role === 'mtransport' || (role === 'builder' && Memory.rooms[room_name].creeps.dbuilder.length === 0))	//If there are no dbuilders, we shouldn't visit them.
								{
									creep.memory.path = 1;	//We've completed our return via ureturn and are going to the spawn next via mreturn.
									creep.memory.utrip = false;

									//If we're switching to a completely new path, we need to override our previous direction change.
									creep.memory.utrip = false;
									tempdir = flipper[control.paths[creep.memory.path]];
								}
								else if (role === 'builder' && Memory.rooms[room_name].creeps.dbuilder.length > 0)
								{
									//The builder has the same routine as the mtransport, but after visiting the upgrader it visits the dbuilder.
									creep.memory.path = 4;	//We've completed our return from the upgrader and are going to the dbuilder if it exists.
									creep.memory.utrip = false;
									creep.memory.dtrip = true;
									creep.memory.need = Memory.rooms[room_name].defense.need;	//This should only be updated when we first choose a defpath.

									//If we're switching to a completely new path, we need to override our previous direction change.
									tempdir = flipper[control.paths[creep.memory.path]][creep.memory.need];
								}
								else
								{
									creep.memory.path = 1;	//If nothing else, then we're going to mreturn.

									//If we're switching to a completely new path, we need to override our previous direction change.
									tempdir = flipper[control.paths[creep.memory.path]];
								}
								break;
						}
						break;
					case 'utransport':
						//utransports don't need to worry about complex path jumping. They just loop to and from the upgrader.
						if (creep.memory.path === 2)
						{
							creep.memory.path = 3;
						}
						else if (creep.memory.path === 3)
						{
							creep.memory.path = 2;
						}

						//If we're switching to a completely new path, we need to override our previous direction change.
						tempdir = flipper[control.paths[creep.memory.path]];
						break;
					case 'harvester':
						//If we're switching to a completely new path, we need to override our previous direction change.
						creep.memory.path = 10;
						tempdir = flipper[control.paths[creep.memory.path]];
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

	paths: ['mine', 'mreturn', 'upgrade', 'ureturn', 'defpaths', 'dreturn', 'patrol', 'preturn', 'exitpath', 'exitreturn', 'mfat', 'upgrader', 'labs', 'lreturn']
};

module.exports = control;