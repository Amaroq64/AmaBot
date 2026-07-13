var calculate = require('calculate');

var roleScout =
{
	scouted: {},	//Here we track every room and the last tick we've seen it.

	move: function(creep)
	{
		let pos = creep.pos;
		let movenow = creep.memory.movenow

		if(creep.fatigue)
		{
			return ERR_TIRED;
		}
		else if (movenow.length && pos.x === movenow[0].x && pos.y === movenow[0].y)
		{
			//console.log(JSON.stringify(movenow));
			//console.log('Changing direction.');
			creep.memory.direction = movenow.shift().direction;
		}

		return creep.move(creep.memory.direction);
	},

	run: function(creep)
	{
		//Mark the room we're in.
		let towers = creep.room.find(FIND_HOSTILE_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}});
		if (towers.length)
		{
			if (towers[0].effects && towers[0].effects.length)
			{
				for (let e = 0, eff = towers[0].effects; e < eff.length; e++)
				{
					if (eff[e].effect === EFFECT_COLLAPSE_TIMER)
					{
						roleScout.scouted[creep.room.name] = Game.time + eff[e].ticksRemaining;
						console.log('Invader Bunker Detected in ' + creep.room.name + '! ' + eff[e].ticksRemaining + ' ticks remaining.');
						Game.notify('Invader Bunker Detected in ' + creep.room.name + '! ' + eff[e].ticksRemaining + ' ticks remaining.', 240);
						break;
					}
				}
			}
			else
			{
				Game.notify('Player tower detected in ' + creep.room.name + '!', 240);
				roleScout.scouted[creep.room.name] = Game.time + 25000;
			}
		}
		else if (roleScout.scouted[creep.room.name] < Game.time)
		{
			roleScout.scouted[creep.room.name] = Game.time;
		}

		//If we're in the room we previously designated as our next room, then select our next room.
		if (creep.room.name === creep.memory.next)
		{
			let exits = Game.map.describeExits(creep.room.name);

			let dir;
			for (let e = 1, lowest_scouted = Infinity, scouted = roleScout.scouted; e <= 7; e += 2)
			{
				if (!exits[e])
				{
					continue;
				}

				if (scouted[exits[e]] === undefined)	//This room has never been scouted.
				{
					scouted[exits[e]] = lowest_scouted = 0;
					creep.memory.next = exits[e];
					dir = e;
					break;
				}
				else if (scouted[exits[e]] < lowest_scouted)	//Get the room that we haven't scouted in the longest time.
				{
					creep.memory.next = exits[e];
					dir = e;
					lowest_scouted = scouted[exits[e]];
				}
			}

			//Get a path to the targeted room.
			let target = creep.pos.findClosestByPath(dir);	//The FIND_EXIT_ constants are directions.
			//console.log(dir);
			//console.log(JSON.stringify(creep.room.find(dir)));
			let pickup;
			if (FIND_SCORES)
			{
				pickup = creep.room.find(FIND_SCORES);
			}
			else
			{
				pickup = [];
			}

			let path;
			if (pickup.length)	//For the season, we're looking for pickups.
			{
				pickup = pickup[0];
				path = creep.pos.findPathTo(pickup.pos.x, pickup.pos.y, roleScout.path_options).concat(pickup.pos.findPathTo(target.x, target.y, roleScout.path_options));
				if (path.length)
				{
					path.unshift({x: creep.pos.x, y: creep.pos.y, direction: path[0].direction});
				}
				creep.memory.movenow = calculate.cleanthispath(path, true);
				creep.memory.found = true;
				Game.notify('Pickup detected in ' + creep.room.name + ' at ' + Game.time, 240);
			}
			else
			{
				if (!target)
				{
					Game.notify('Target invalid in room ' + creep.room.name + ' at ' + creep.pos.x + ', ' + creep.pos.y + '.', 240);
				}
				path = creep.pos.findPathTo(target.x, target.y, roleScout.path_options);
				if (path.length)
				{
					path.unshift({x: creep.pos.x, y: creep.pos.y, direction: path[0].direction});
				}
				creep.memory.movenow = calculate.cleanthispath(path, true);
				creep.memory.found = undefined;
			}

			//Mark the room we selected so the other scouts don't follow us in.
			if (roleScout.scouted[creep.memory.next] < Game.time)
			{
				roleScout.scouted[creep.memory.next] = Game.time;
			}

			roleScout.move(creep);
		}
		else	//Otherwise we're just passing through.
		{
			//If we see a score, recalculate our path through the room to pick it up.
			if (!creep.memory.found && creep.room.find(FIND_SCORES).length)
			{
				creep.memory.next = creep.room.name;
				creep.memory.found = true;
			}

			roleScout.move(creep);
		}
		
		return false;	//This creep will decide its own movement.
	},

	path_options:
	{ignoreRoads: true, swampCost: 1, maxRooms: 1,
		costCallback: function(roomName, costMatrix)
		{
			//Avoid invaders. (Most of the time.)
			let invaders = Game.rooms[roomName].find(FIND_HOSTILE_CREEPS, {filter: function(creep)
			{
				return creep.owner.username === 'Source Keeper';
			}});

			for (let i = 0, tempx, tempy, terrain = Game.map.getRoomTerrain(roomName); i < invaders.length; i++)
			{
				for (let x = -3; x < 4; x++)
				{
					tempx = invaders[i].pos.x + x;
					for (let y = -3; y < 4; y++)
					{
						tempy = invaders[i].pos.y + y;
						if (terrain.get(tempx, tempy) !== TERRAIN_MASK_WALL)
						{
							costMatrix.set(tempx, invaders[i].pos.y + y, 10);
						}
					}
				}
			}
		}
	}
};

module.exports = roleScout;