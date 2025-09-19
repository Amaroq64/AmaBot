var control =
{
	harvester: require('role.harvester'),
	upgrader: require('role.upgrader'),

	//These aliases both draw upon and modify our transport role.
	mtransport: require('role.mtransport'),
	utransport: require('role.utransport'),

	builder: require('role.builder'),
	//ubuilder: require('role.ubuilder'),
	dbuilder: require('role.dbuilder'),

	//guard: require('role.guard'),

	run: function()
	{
		for (let room_name in Memory.rooms)	//Enumerate rooms. This only contains rooms where we have a spawner, so we don't have to worry about being agnostic of neutral rooms.
		{
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

				//This is more trouble than it's worth.
				/*//If we only have one creep in this source, we need to alternate between harvesting and transporting.
				if (totalcreeps == 1 && Memory.rooms[room_name].sources[i].creeps.harvester.length == 1 &&
					Game.creeps[Memory.rooms[room_name].sources[i].creeps.harvester[0]].store[RESOURCE_ENERGY] == Game.creeps[Memory.rooms[room_name].sources[i].creeps.harvester[0]].store.getCapacity())
				{
					//This harvester is full, deliver the energy.
					Memory.rooms[room_name].sources[i].creeps.mtransport.push(Memory.rooms[room_name].sources[i].creeps.harvester[0]);
					Memory.rooms[room_name].sources[i].creeps.harvester = [];
					//We need to push it back onto its path.
					Memory.creeps[Memory.rooms[room_name].sources[i].creeps.mtransport[0]].movenow.push(
						{dx: Memory.rooms[room_name].sources[i].mine[Memory.rooms[room_name].sources[i].mine.length - 1].x - Memory.rooms[room_name].sources[i].mfat[0].x,
						 dy: Memory.rooms[room_name].sources[i].mine[Memory.rooms[room_name].sources[i].mine.length - 1].y - Memory.rooms[room_name].sources[i].mfat[0].y,
						 direction: function()
							{
								let direction = Memory.rooms[room_name].sources[i].mfat[0].direction + 4;
								direction = direction + 4;
								if (direction > 8)
								{
									direction = direction - 8;
									console.log("Correcting direction to " + direction + ".");
								}
								return direction;
							}
						});
					console.log("Changing from harvester to transport.");
				}
				else if (totalcreeps == 1 && Memory.rooms[room_name].sources[i].creeps.mtransport.length == 1 &&
					Game.creeps[Memory.rooms[room_name].sources[i].creeps.mtransport[0]].store[RESOURCE_ENERGY] == 0)
				{
					//This transport is empty, gather more energy.
					Memory.rooms[room_name].sources[i].creeps.harvester.push(Memory.rooms[room_name].sources[i].creeps.mtransport[0]);
					Memory.rooms[room_name].sources[i].creeps.mtransport = [];
					console.log("Changing from transport to harvester.");
				}*/
			}
		}
	},

	move: function(creep, role, source = false)
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