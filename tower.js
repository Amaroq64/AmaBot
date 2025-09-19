var empire = require('empire');

var tower =
{
	monitor: function()
	{
		for (let room_name in Memory.rooms)
		{
			let towers = Game.rooms[room_name].find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_TOWER}});
			let fired = false;

			//Simple attack code to kill intruders.
			let enemies = Game.rooms[room_name].find(FIND_HOSTILE_CREEPS,
				{filter: tower.checkallies})
			.concat(Game.rooms[room_name].find(FIND_HOSTILE_POWER_CREEPS,
					{filter: tower.checkallies}));

			//We'll need this to control ramparts.
			let allies = Game.rooms[room_name].find(FIND_HOSTILE_CREEPS,
				{filter: tower.allowallies})
			.concat(Game.rooms[room_name].find(FIND_HOSTILE_POWER_CREEPS,
					{filter: tower.allowallies}));

			let ramparts = Game.rooms[room_name].find(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_RAMPART}});
			if (enemies.length > 0)
			{
				//console.log("Enemy Detected.");
				for (let t = 0; t < towers.length; t++)
				{
					towers[t].attack(enemies[0]);
				}

				for (let r = 0; r < ramparts.length; r++)
				{
					//console.log("Iterating Rampart.");
					if (ramparts[r].isPublic)
					{
						//console.log("Rampart Closing.");
						ramparts[r].setPublic(false);	//Close the ramparts if there's enemies.
					}
				}

				fired = true;
			}
			/*else if(allies.length > 0)
			{
				for (let r = 0; r < ramparts.length; r++)
				{
					if (!ramparts[r].isPublic)
					{
						ramparts[r].setPublic(true);	//If there's no enemies but there are allies, open the ramparts.
					}
				}
			}*/
			else
			{
				//If one of our allies betrays us, mark them as an enemy.
				//let room_log = Game.rooms[room_name].getEventLog();

				for (let r = 0; r < ramparts.length; r++)
				{
					if (!ramparts[r].isPublic)
					{
						ramparts[r].setPublic(true);	//If there's neither enemies nor allies, open the rampart.
					}
				}
			}

			if (fired)
			{
				//If the tower is firing, we don't want it to repair in the same tick.
				continue;
			}

			//Find walls outside of dbuilder's reach and bring them in line with the others.
			//First get all walls that need repairing.
			let walls = Game.rooms[room_name].find(FIND_STRUCTURES,
			{
				filter: function(wall)
				{
					if (wall.hits < wall.hitsMax && wall.structureType == STRUCTURE_WALL)
					{
						//If this is a farwall, we don't count it for highest hp.
						let foundfar = false;
						for (let fw = 0; fw < Memory.rooms[room_name].defense.farwalls.length; fw++)
						{
							if (wall.pos.x == Memory.rooms[room_name].defense.farwalls[fw].x && wall.pos.y == Memory.rooms[room_name].defense.farwalls[fw].y)
							{
								foundfar = true;
							}
						}
						return !foundfar;
					}
					else
					{
						return false;
					}
				}
			});

			//Find the wall with the highest hp.
			let mosthp = 0;
			for (let w = 0; w < walls.length; w++)
			{
				if (walls[w].hits > mosthp)
				{
					mosthp = walls[w].hits;
				}
			}

			//Find the farwall with the lowest hp.
			let farwalls = [];
			let leasthp = Infinity;
			let choice;
			for (let f = 0; f < Memory.rooms[room_name].defense.farwalls.length; f++)
			{
				//Should be only a wall here. But we'll have to make sure.
				let tobj = Game.rooms[room_name].lookForAt(LOOK_STRUCTURES, Memory.rooms[room_name].defense.farwalls[f].x, Memory.rooms[room_name].defense.farwalls[f].y);
				if (tobj.length != 0)
				{
					//console.log(JSON.stringify(tobj));
					farwalls.push(tobj[0]);
				}
			}
			for (let w = 0; w < farwalls.length; w++)
			{
				//console.log(JSON.stringify(farwalls[w]));
				if (farwalls[w].hits < leasthp)
				{
					leasthp = farwalls[w].hits;
					choice = farwalls[w];
				}
			}
			
			//By now we should have our target.
			if (choice)
			{
				for (let t = 0; t < towers.length; t++)
				{
					//console.log(towers[t].store.getUsedCapacity(RESOURCE_ENERGY) + " " + (towers[t].store.getCapacity(RESOURCE_ENERGY) / 2));
					//If our farwall has less hp than any normal wall and our tower has over 1/2 energy.
					if (leasthp < mosthp && towers[t].store.getUsedCapacity(RESOURCE_ENERGY) > (towers[t].store.getCapacity(RESOURCE_ENERGY) / 2))
					{
						towers[t].repair(choice);
					}
				}
			}
		}
		return true;	//We made it this far without any errors.
	},

	checkallies: empire.checkallies,

	allowallies: empire.allowallies,

	attack: function(tower, target)
	{
		
	},

	repair: function(tower, target)
	{
		
	},

	heal: function(tower, target)
	{
		
	}
};

tower.monitor

module.exports = tower;