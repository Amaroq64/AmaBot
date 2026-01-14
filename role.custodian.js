var calculate = require('calculate');
var labs = require('labs');

var roleCustodian =
{
	harvester: require('role.harvester'),
	upgrader: require('role.upgrader'),

	//These draw upon and modify our transport role.
	mtransport: require('role.mtransport'),
	//utransport: require('role.utransport'),

	builder: require('role.builder'),

	move: function(creep, role, source = false)
	{
		//control.move(creep, role, source = false);
		roleCustodian.move = require('control').move;
		return roleCustodian.move(creep, role, source);
	},

	pathjump: function(creep)
	{
		if (creep.memory.path !== creep.memory.d_path && calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, type, creep.memory.d_s))
		{
			creep.memory.path = creep.memory.d_path;
			creep.memory.s = creep.memory.d_s;
		}
	},

	missions:
	[
		//Mission 0 is to select a mission.
		function (creep)
		{
			//Detect the first source that has energy. It will probably be 0 first.
			for (let i = 0, source; i < Memory.rooms[creep.room.name].sources.length; i++)
			{
				if (creep.memory.lmission[0] === 1)
				{
					//If we just completed a gathering mission, we need to put the energy somewhere.
					if (calculate.currentEnergy(room_name) < calculate.maximumEnergy(room_name))
					{
						//If the room is missing energy, we'll fill extensions.
						creep.memory.mission = 3;
						creep.memory.lmission.shift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.
						return roleCustodian.missions[creep.memory.mission](creep);
					}
					else if (creep.store.getUsedCapacity(RESOURCE_ENERGY))
					{
						//If the room is not missing energy, we'll stock the terminal.
						creep.memory.path = 12;
						creep.memory.mission = 5;
						creep.memory.lmission.shift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.
						return roleCustodian.missions[creep.memory.mission](creep);
					}
				}
				else if ((source = Game.getObjectById(Memory.rooms[creep.room.name].sources[i].id)) && source.energy)	//Assign within the comparison.
				{
					//If our last mission wasn't a gathering mission, we should probably gather energy.
					creep.memory.s = i;
					creep.memory.mission = 1;
					creep.memory.lmission.shift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.
					return roleCustodian.missions[creep.memory.mission](creep);
				}
				else if (i === Memory.rooms[creep.room.name].sources.length - 1)
				{
					//We couldn't find a source and our energy is empty.
					//If we're here, we probably completed a mission and we need a source to proceed to our next mission. Therefore just go to source 0 and wait.
					creep.memory.s = 0;
					creep.memory.mission = 2;
					return roleCustodian.missions[creep.mission](creep);
				}
			}
		},

		//Mission 1 is to gather energy.
		function(creep)
		{
			if (creep.memory.d_s === creep.memory.s)	//We're on our desired source path.
			{
				//Harvest our source. Go to it if we're not there yet.
				if (roleCustodian.harvester.run(creep, creep.memory.s))	//This returns true if we're not at the source yet.
				{
					//If we're touching mfat, move to it.
					if (calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, 'mfat', creep.memory.s))
					{
						creep.memory.path = 10;
						let status = roleCustodian.move(creep, 'harvester', creep.memory.s);

						//Now that we've issued a move to mfat, invert our direction before finishing up.
						if (status === OK)
						{
							//If there's a harvester in the way, we need to switch places with it.
							let harv;	//Assign within the comparison.
							if (((harv = Memory.rooms[creep.room.name].sources[creep.memory.s].creeps.harvester) && harv.length) || ((harv = Memory.rooms[creep.room.name].sources[creep.memory.s].creeps.hybrid) && harv.length))
							{
								harv = Game.creeps[harv[0]];
								if (harv.pos.x === Memory.rooms[creep.room.name].sources[creep.memory.s].mfat[0].x && harv.pos.y === Memory.rooms[creep.room.name].sources[creep.memory.s].mfat[0].y)
								{
									harv.move(harv.pos.getDirectionTo(creep.pos.x, creep.pos.y));
									creep.say('Please.');
									creep.memory.please = true;
								}
							}

							//Perform the inversion so we can return to the path.
							creep.memory.path = 0;
							creep.memory.direction += 4;
							if (creep.memory.direction > 8)
							{
								creep.memory.direction -= 8;
							}
						}

						return status;
					}
				}
				else	//We're at the source and we've mined it. (Return false means it was in range.)
				{
					//If this is the last tick before emptying the source, we can move early.
					if (Game.getObjectById(Memory.rooms[creep.room.name].sources[creep.memory.s].id).energy <= creep.memory.harv + (creep.memory.harv * (creep.memory.t * 2)))
					{
						//We've mined the source, our mission is complete. Select our next mission.
						creep.memory.mission = 0;

						//If we asked the harvester to move, it can have its spot back now.
						if (creep.memory.please)
						{
							creep.say('Thank you.');
							creep.memory.please = undefined;
						}

						//The inversion was performed when we arrived at mfat, so a simple move will suffice.
						return roleCustodian.move(creep, 'mtransport', creep.memory.s);

						//The mission select doesn't need to be explicitly called. We've performed our action and it'll select a mission next tick.
					}
					else
					{
						return true;
					}
				}
			}
			else if (calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, 'mine', creep.memory.d_s)	//We need to switch from one source to the other.
				|| calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, 'mreturn', creep.memory.d_s))
			{
				//If we need to switch to the other source, the creep should continue around the mreturn to upgrade path track until it touches the hub where both upgrade paths touch the upgrader.
				//Once it touches this hub, it will switch sources and go back along the new source's ureturn.
				creep.memory.s = creep.memory.d_s;
			}

			return roleCustodian.move(creep, 'mtransport', creep.memory.s);
		},

		//Mission 2 is to wait for the source to regenerate. If all sources are empty, we will wait for one to come back. It'll probably be source 0.
		function(creep)
		{
			//We can run mission 1 while capturing its attempts to complete itself. This will move us into position and then wait there.
			if (Game.getObjectById(Memory.rooms[creep.room.name].sources[creep.memory.s].id).energy)
			{
				//Energy was found. The wait is over.
				creep.memory.mission = 1;
				return roleCustodian.missions[1](creep);
			}
			else
			{
				//No energy yet. Keep waiting.
				let status = roleCustodian.missions[1](creep);
				creep.memory.mission = 2;
				return status;
			}
		},

		//Mission 3 is to fill extensions.
		function(creep)
		{
			//If we're filling extensions, we can simply run as an mtransport.
			if (creep.carry.energy > 0)
			{
				let status = true;

				if (roleCustodian.mtransport.run(creep))
				{
					//If we're at the end of the upgrade path and we can move, it means we've reached the end of the path and have filled all extensions in our range.
					if (creep.pos.x === Memory.rooms[creep.room.name].sources[creep.memory.s].upgrade.slice(-1)[0].x && creep.pos.y === Memory.rooms[creep.room.name].sources[creep.memory.s].upgrade.slice(-1)[0].y)
					{
						creep.memory.lmission.shift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.

						//The mission select doesn't need to be explicitly called. We've performed our action and it'll select a mission next tick.
						creep.memory.mission = 4;

						//If we're at the controller and we still have energy, we should dump that energy into the controller before we move on.
						creep.memory.path = 11;
						status = roleCustodian.move(creep, 'upgrader');

						//If there's an upgrader in the way, we need to switch places with it.
						let upg;	//Assign within the comparison.
						if (((upg = Memory.rooms[creep.room.name].creeps.harvester) && upg.length)
							|| (Memory.rooms[creep.room.name].sources[0] && (upg = Memory.rooms[creep.room.name].sources[0].hybrid) && upg.length)	//We usually don't assume the number of sources, but we do here.
							|| (Memory.rooms[creep.room.name].sources[1] && (upg = Memory.rooms[creep.room.name].sources[1].hybrid) && upg.length))
						{
							upg = Game.creeps[upg[0]];
							if (upg.pos.x === Memory.rooms[creep.room.name].upgrade.slice(-1)[0].x && upg.pos.y === Memory.rooms[creep.room.name].upgrade.slice(-1)[0].y)
							{
								upg.move(upg.pos.getDirectionTo(creep.pos.x, creep.pos.y));
								creep.say('Please.');
								creep.memory.please = true;
							}
						}

						//Perform an inversion so we can return to the path.
						creep.memory.path = 2;
						creep.memory.direction += 4;
						if (creep.memory.direction > 8)
						{
							creep.memory.direction -= 8;
						}
					}
				}

				return status;
			}
			else	//If we're empty, then we no longer care whether the extensions are full. Choose another mission.
			{
				creep.memory.mission = 0;
				return roleCustodian.missions[creep.mission](creep);
			}
		},

		//Mission 4 is to upgrade the controller. We only arrive here if we were filling extensions and touched the upgrader's position while still holding energy.
		function(creep)
		{
			if (creep.carry.energy > 0 && creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.memory.harv / 2)	//Custodians don't get controller upgrading boosts.
			{
				return roleCustodian.upgrader.run(creep);
			}
			else
			{
				//If this is the last tick before emptying our energy into the controller, we can move early.
				roleCustodian.upgrader.run(creep);
				creep.move(creep.memory.direction);	//Inversion was performed at the end of the previous mission, so we can blindly move this tick.
				creep.memory.lmission.shift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.
				creep.memory.mission = 0;	//The mission select doesn't need to be explicitly called. We've performed our action and it'll select a mission next tick.
			}
		},

		//Mission 5 is to stock the terminal. The material handler can decide what to do with anything we put in it.
		/*function(creep)
		{
			if ()
			{
				
			}
		},

		//Mission 6 is...
		/*function(creep)
		{
			
		},

		//Mission 7 is...
		function(creep)
		{
			
		},

		//The third-to-last index mission is to build the lab stamp. If our boosting mission detects that the stamp is incomplete, it'll assign this mission.
		function(creep)
		{
			
		},

		//The second-to-last index mission is to get unboosted. We'll probably only use this once.
		function(creep)
		{
			
		},*/

		//The last index mission is to get boosted. We'll probably only use this once.
		function(creep)
		{
			//Let's perform a startup check to make sure we have a completed lab stamp.
			if (Game.getObjectById(Memory.rooms[creep.room.name].spawns[2].id) && Game.rooms[creep.room.name].storage && Game.rooms[creep.room.name].terminal
				&& Game.getObjectById(Memory.rooms[creep.room.name].buildings.factory.id) && Game.getObjectById(Memory.rooms[creep.room.name].buildings.nuker.id))
			{
				for (let l = 0; l < Memory.rooms[creep.room.name].goals.labs; l++)
				{
					if (!Game.getObjectById(Memory.rooms[creep.room.name].mine.labs[l].id))
					{
						//We found a missing lab.
						creep.memory.mission = roleCustodian.missions.length - 3;
						creep.memory.lmission.shift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.
						return roleCustodian.missions[creep.memory.mission](creep);
					}
				}
			}
			else
			{
				//We found a missing structure.
				creep.memory.mission = roleCustodian.missions.length - 3;
				creep.memory.lmission.shift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.
				return roleCustodian.missions[creep.memory.mission](creep);
			}

			//If we made it this far, all is well. Let's get boosted.
			//The handler should have it all ready for us. (That's his job.)

			//Have we reached the destination yet?
			let path;	//Assign within comparison.
			if (Memory.rooms[creep.room.name].path[creep.pos.x] && (path = Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y]) && path.flipper && path.flipper.labs)
			{
				creep.memory.s = 0;
			}
			
			if (creep.memory.s === -1)
			{
				//When we first emerge, we're taking the path from the spawn to the stamp. When we get there, go back to source 0.
				roleCustodian.move(creep, 'handler');
			}
			else if (labs.requests[creep.name])	//We're waiting to get boosted.
			{
				labs.fulfill(creep.name);
			}
			else if (calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, 'mine', creep.memory.s))	//Once we're boosted, get back on path.
			{
				creep.memory.mission = 0;
			}
			else
			{
				roleCustodian.move(creep, 'custodian', creep.memory.s);	//If we're not back on path yet, make our way there.
			}
		}
	],

	run: function(creep)
	{
		roleCustodian.missions[creep.mission](creep);

		return false;	//This creep will decide its own movement.
	}
};

module.exports = roleCustodian;