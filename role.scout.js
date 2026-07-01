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
						console.log('Invader Bunker Detected!');
						break;
					}
				}
			}
			else
			{
				roleScout.scouted[creep.room.name] = Game.time + 25000;
			}
		}
		else
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

				if (!scouted[exits[e]])	//This room has never been scouted.
				{
					scouted[exits[e]] = lowest_scouted = 0;
					creep.memory.next = exits[e];
					dir = e;
					break;
				}
				else if (exits[e] && scouted[exits[e]] < lowest_scouted)	//Get the room that we haven't scouted in the longest time.
				{
					creep.memory.next = exits[e];
					dir = e;
				}
			}

			//Get a path to the targeted room.
			let target = creep.pos.findClosestByPath(creep.room.find(dir));	//The FIND_EXIT_ constants are directions.
			//console.log(dir);
			//console.log(JSON.stringify(creep.room.find(dir)));
			let pickup = creep.room.find(FIND_SCORES);
			let path;
			if (pickup.length && target)	//For the season, we're looking for pickups.
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
			else if (target)
			{
				path = creep.pos.findPathTo(target.x, target.y, roleScout.path_options);
				if (path.length)
				{
					path.unshift({x: creep.pos.x, y: creep.pos.y, direction: path[0].direction});
				}
				creep.memory.movenow = calculate.cleanthispath(path, true);
				creep.memory.found = undefined;
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

	path_options: {ignoreRoads: true, swampCost: 1, maxRooms: 1}
};

module.exports = roleScout;