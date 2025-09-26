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
							//totalcreeps++;
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
			return;
		}
		else if(creep.memory.movenow.length != 0)	//If the creep has immediate move orders, follow them.
		{
			if (creep.pos.x == creep.memory.movenow[0].x && creep.pos.y == creep.memory.movenow[0].y)
			{
				creep.memory.direction = creep.memory.movenow.shift().direction;
			}

			return creep.move(creep.memory.direction);
		}
		else if(Memory.rooms[room_name].path[pos.x] && Memory.rooms[room_name].path[pos.x][pos.y])	//Otherwise, follow its routine path.
		{
			let room_name = creep.room.name
			let tempdir;	//We'll be assigning to this within all of our comparisons for ease of use.
			//let path = [];
			//console.log(role + " " + creep.name);

			switch (role)
			{
				case "harvester":
				{
					if (Memory.rooms[room_name].path[pos.x][pos.y].mfat && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].mfat[source])
						|| Memory.rooms[room_name].path[pos.x][pos.y].mine && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].mine[source]))
					{
						creep.memory.direction = tempdir;
					}
					break;
				}

				case "builder":
				{
					if(creep.memory.dtrip)	//We're going to the defense.
					{
						if ((!creep.memory.return &&
							(Array.isArray(Memory.rooms[room_name].path[pos.x][pos.y].defpath) && typeof Memory.rooms[room_name].path[pos.x][pos.y].defpath[source] === 'object'
								&& Memory.rooms[room_name].path[pos.x][pos.y].defpath && Memory.rooms[room_name].path[pos.x][pos.y].defpath[source] && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].defpath[source][creep.memory.need])))
						  || (creep.memory.return &&
							(Array.isArray(Memory.rooms[room_name].path[pos.x][pos.y].dreturn) && typeof Memory.rooms[room_name].path[pos.x][pos.y].dreturn[source] === 'object'
								&& Memory.rooms[room_name].path[pos.x][pos.y].dreturn && Memory.rooms[room_name].path[pos.x][pos.y].dreturn[source] && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].dreturn[source][creep.memory.need]))
								|| (Memory.rooms[room_name].path[pos.x][pos.y].mine && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].mine[Memory.rooms[room_name].defense.dshort[creep.memory.need]]))))
						{
							creep.memory.direction = tempdir;
						}
						//If we're at the end of our path, we swich to the other one.
						if (Memory.rooms[room_name].path[pos.x][pos.y].flipper
							&& ((!creep.memory.return && Memory.rooms[room_name].path[pos.x][pos.y].flipper.defpath && Memory.rooms[room_name].path[pos.x][pos.y].flipper.defpath[source]
								&& Memory.rooms[room_name].path[pos.x][pos.y].flipper.defpath[source][creep.memory.need] && (creep.memory.return = true))
							||   (creep.memory.return && Memory.rooms[room_name].path[pos.x][pos.y].flipper.dreturn && Memory.rooms[room_name].path[pos.x][pos.y].flipper.dreturn[source]
								&& Memory.rooms[room_name].path[pos.x][pos.y].flipper.dreturn[source][creep.memory.need] && (!(creep.memory.dtrip = false)) && creep.say('Mine') )))
						{
							//We get here if we have flipped any flag.
						}
						break;
					}
				}
				case "mtransport":
				{
					if (!Memory.creeps[creep.name].dtrip && Memory.creeps[creep.name].utrip)	//We're going to the upgrader.
					{
						if ((!creep.memory.return && Memory.rooms[room_name].path[pos.x][pos.y].upgrade && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].upgrade[source]))
							|| (creep.memory.return && Memory.rooms[room_name].path[pos.x][pos.y].ureturn && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].ureturn[source])))
						{
							creep.memory.direction = tempdir;
						}
						//If we're at the end of our path, we swich to the other one.
						if (Memory.rooms[room_name].path[pos.x][pos.y].flipper
							&& ((Memory.rooms[room_name].path[pos.x][pos.y].flipper.upgrade && Memory.rooms[room_name].path[pos.x][pos.y].flipper.upgrade[source] && (creep.memory.return = true))
							||  (Memory.rooms[room_name].path[pos.x][pos.y].flipper.ureturn && Memory.rooms[room_name].path[pos.x][pos.y].flipper.ureturn[source] && (creep.memory.return = true) && (!(creep.memory.utrip = false))
							//We get here if we have flipped the utrip flag.
							&& (creep.memory.direction = Memory.rooms[room_name].path[pos.x][pos.y].mine[source]))))
						{
							//We get here if we have flipped any flag.
						}
					}
					else if (!Memory.creeps[creep.name].dtrip)	//We're going to the source.
					{
						if ((!creep.memory.return && Memory.rooms[room_name].path[pos.x][pos.y].mine && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].mine[source]))
							|| (creep.memory.return && Memory.rooms[room_name].path[pos.x][pos.y].mreturn && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].mreturn[source])))
						{
							creep.memory.direction = tempdir;
						}
						//If we're at the end of our path, we swich to the other one.
						if (Memory.rooms[room_name].path[pos.x][pos.y].flipper
							&& ((Memory.rooms[room_name].path[pos.x][pos.y].flipper.mine && Memory.rooms[room_name].path[pos.x][pos.y].flipper.mine[source] && (!(creep.memory.return = false)) && (creep.memory.utrip = true)
							//We get here if we have flipped the utrip flag.
							&& (creep.memory.direction = Memory.rooms[room_name].path[pos.x][pos.y].upgrade[source]) && (creep.name.indexOf('Builder') != -1 && creep.say('Upgrade')))
							||  (Memory.rooms[room_name].path[pos.x][pos.y].flipper.mreturn && Memory.rooms[room_name].path[pos.x][pos.y].flipper.mreturn[source] && (!(creep.memory.return = false))
							&& (creep.name.indexOf('Builder') != -1 && Memory.rooms[creep.room.name].creeps.dbuilder.length > 0 && (!(creep.memory.return = false)) && (creep.memory.dtrip = true) && creep.say('Defense')))))	//If we're a builder, go to the dbuilder.
						{
							//We get here if we have flipped any flag.
						}
					}
					break;
				}

				case "utransport":
				{
					//We're going to the upgrader.
					if ((!creep.memory.return && Memory.rooms[room_name].path[pos.x][pos.y].upgrade && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].upgrade[source]))
						|| (creep.memory.return && Memory.rooms[room_name].path[pos.x][pos.y].ureturn && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].ureturn[source])))
					{
						creep.memory.direction = tempdir;
					}
					//If we're at the end of our path, we swich to the other one.
					if (Memory.rooms[room_name].path[pos.x][pos.y].flipper
						&& ((Memory.rooms[room_name].path[pos.x][pos.y].flipper.upgrade && Memory.rooms[room_name].path[pos.x][pos.y].flipper.upgrade[source] && (creep.memory.return = true))
						||  (Memory.rooms[room_name].path[pos.x][pos.y].flipper.ureturn && Memory.rooms[room_name].path[pos.x][pos.y].flipper.ureturn[source] && (!(creep.memory.return = false)))))
					{
						//We get here if we have flipped any flag.
					}
					break;
				}

				case "upgrader":
				{
					//We're going to park on the upgrading container.
					if (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].upgrader)	//Note the spelling difference.
					{
						creep.memory.direction = tempdir;
					}
					break;
				}

				case "dbuilder":
				{
					if ((!creep.memory.return && Memory.rooms[room_name].path[pos.x][pos.y].patrol && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].patrol[creep.memory.need]))
						|| (creep.memory.return && Memory.rooms[room_name].path[pos.x][pos.y].preturn && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].preturn[creep.memory.need]))
						//If we haven't reached our patrol path yet, then we use mine and exitpath to get there.
						|| (!creep.memory.destination && Memory.rooms[room_name].path[pos.x][pos.y].defpath
							&& Memory.rooms[room_name].path[pos.x][pos.y].defpath[Memory.rooms[room_name].defense.dshort[creep.memory.need]]
							&& (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].defpath[Memory.rooms[room_name].defense.dshort[creep.memory.need]][creep.memory.need]))
						|| (!creep.memory.destination && Memory.rooms[room_name].path[pos.x][pos.y].mine && (tempdir = Memory.rooms[room_name].path[pos.x][pos.y].mine[Memory.rooms[room_name].defense.dshort[creep.memory.need]])))
					{
						creep.memory.direction = tempdir;
					}
					//If we've reached our destination, then we stay here forever.
					if (Memory.rooms[room_name].path[pos.x][pos.y].flipper
						&& ((Memory.rooms[room_name].path[pos.x][pos.y].flipper.patrol && Memory.rooms[room_name].path[pos.x][pos.y].flipper.patrol[creep.memory.need] && (creep.memory.return = true)
							&& (creep.memory.destination || (creep.memory.destination = true)))
						||  (Memory.rooms[room_name].path[pos.x][pos.y].flipper.preturn && Memory.rooms[room_name].path[pos.x][pos.y].flipper.preturn[creep.memory.need] && (!(creep.memory.return = false)))))
					{
						//We get here if we have flipped any flag.
					}
				}
			}
		}

		status = creep.move(creep.memory.direction);

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
	},

	move_backup: function(creep, role, source = false)
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
	}
};

module.exports = control;