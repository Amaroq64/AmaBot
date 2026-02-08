var calculate = require('calculate');
var labs = require('labs');

var roleCustodian =
{
	harvester: require('role.harvester'),
	upgrader: require('role.upgrader'),
	repair: require('role.builder').repair,

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
		if (creep.fatigue)	//We should probably only be switching if we can move.
		{
			return;
		}

		if (creep.memory.s !== creep.memory.d_s && calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, require('control').paths[creep.memory.path], creep.memory.d_s))
		{
			creep.memory.s = creep.memory.d_s;
		}

		/*if (creep.memory.s !== creep.memory.d_s && (calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, roleCustodian.control.paths[creep.memory.path], creep.memory.d_s)	//A simple switch.
			|| (calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, roleCustodian.control.paths[creep.memory.path], creep.memory.s)	//Have we reached a potential flipper at the end of our current path?
			&& Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y].flipper && Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y].flipper[roleCustodian.control.paths[creep.memory.path]]	//If it's a flipper, read into it.
			&& Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y].flipper[roleCustodian.control.paths[creep.memory.path]][creep.memory.d_s]
			&& Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y].flipper[roleCustodian.control.paths[creep.memory.path]][creep.memory.d_s][])))	//If the flipper contains an instruction for our desired source-bound path, then switch to it.
			
		{
			creep.memory.s = creep.memory.d_s;
		}*/

		if (creep.memory.s === creep.memory.d_s && creep.memory.path !== creep.memory.d_path && calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, require('control').paths[creep.memory.d_path], creep.memory.s))
		{
			creep.memory.path = creep.memory.d_path;
		}
	},

	missions:
	[
		//Mission 0 is to select a mission.
		function (creep)
		{
			console.log('Choosing a mission. Path: ' + creep.memory.path + ' ' + creep.memory.d_path + ' Source: ' + creep.memory.s + ' ' + creep.memory.d_s + ' Last Mission: ' + creep.memory.lmission[0]);
			//Detect the first source that has energy. It will probably be 0 first.
			for (let i = 0, source; i < Memory.rooms[creep.room.name].sources.length; i++)
			{
				if (creep.memory.lmission[0] === 1)
				{
					//If we just completed a gathering mission, we need to put the energy somewhere.
					if (calculate.currentEnergy(creep.room.name) < calculate.maximumEnergy(creep.room.name))
					{
						//If the room is missing energy, we'll fill extensions.
						creep.memory.mission = 3;
						creep.memory.path = 3;	//This should help us visit more extensions.
						creep.memory.d_path = -1;	//Prevent reversion back to 0 while it's making normal rounds.
						creep.memory.lmission.unshift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.
						return roleCustodian.missions[creep.memory.mission](creep);
					}
					else if (creep.store.getUsedCapacity(RESOURCE_ENERGY))
					{
						//If the room is not missing energy, we'll stock the terminal.
						creep.memory.path = 13;
						creep.memory.d_path = 12;
						creep.memory.mission = 5;
						creep.memory.lmission.unshift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.

						//When we get here, we have stepped on the lreturn flipper. If we don't use it here, we'll miss it.
						if (Memory.rooms[creep.room.name].path[creep.pos.x] && Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y]
							&& Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y].flipper && Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y].flipper.lreturn
							&& Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y].flipper.lreturn[creep.memory.s])
						{
							creep.memory.direction = Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y].flipper.lreturn[creep.memory.s].labs;
						}
						console.log(creep.memory.direction);
						return roleCustodian.missions[creep.memory.mission](creep);
					}
					else if (creep.carry.energy === 0)
					{
						//We somehow wound up trying to deliver energy when we've never gathered it.
						//If we're here, we probably completed a mission and we need a source to proceed to our next mission. Find the source that's closest to regenerating.
						for (let i2 = 0, lowest = Infinity; i2 < Memory.rooms[creep.room.name].sources.length; i2++)
						{
							source = Game.getObjectById(Memory.rooms[creep.room.name].sources[i2].id);
							if (source.ticksToRegeneration < lowest)
							{
								lowest = source.ticksToRegeneration;
								creep.memory.d_s = i2;
							}
						}
						creep.memory.d_path = 0;
						creep.memory.mission = 2;
						creep.memory.lmission.unshift(1);	//We still need to remember that we gathered energy, even if our mission is to wait for it.
						return roleCustodian.missions[creep.memory.mission](creep);
					}
				}
				else if (creep.memory.t && creep.ticksToLive <= 1000)
				{
					//If our time is almost up, we should unboost.
					creep.memory.mission = roleCustodian.missions.length - 2;
					creep.memory.d_path = 12;
					creep.memory.lmission.unshift(creep.memory.mission);
					return roleCustodian.missions[creep.memory.mission](creep);
				}
				else if ((source = Game.getObjectById(Memory.rooms[creep.room.name].sources[i].id)) && source.energy)	//Assign within the comparison.
				{
					//If our last mission wasn't a gathering mission, we should probably gather energy.
					//creep.memory.s = i;
					creep.memory.d_s = i;
					creep.memory.d_path = 10;
					creep.memory.mission = 1;
					creep.memory.lmission.unshift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.
					return roleCustodian.missions[creep.memory.mission](creep);
				}
				else if (i === Memory.rooms[creep.room.name].sources.length - 1)
				{
					//We couldn't find a source and our energy is empty.
					//If we're here, we probably completed a mission and we need a source to proceed to our next mission. Find the source that's closest to regenerating.
					for (let i2 = 0, lowest = Infinity; i2 < Memory.rooms[creep.room.name].sources.length; i2++)
					{
						source = Game.getObjectById(Memory.rooms[creep.room.name].sources[i2].id);
						if (source.ticksToRegeneration < lowest)
						{
							lowest = source.ticksToRegeneration;
							creep.memory.d_s = i2;
						}
					}
					creep.memory.d_path = 0;
					creep.memory.mission = 2;
					creep.memory.lmission.unshift(1);	//We still need to remember that we gathered energy, even if our mission is to wait for it.
					return roleCustodian.missions[creep.memory.mission](creep);
				}
			}
		},

		//Mission 1 is to gather energy.
		function(creep)
		{
			if (creep.memory.d_s === creep.memory.s)	//We're on our desired source path.
			{
				//Harvest our source. Go to it if we're not there yet.
				let mfat;
				if (creep.memory.s !== -1)
				{
					mfat = Memory.rooms[creep.room.name].sources[creep.memory.s].mfat[0];
				}

				if (!(mfat && creep.pos.x === mfat.x && creep.pos.y === mfat.y))	//This returns true if we're not at the source yet.
				{
					//console.log('Going Gathering.');
					//If we're touching mfat, move to it. But only if it's our desired mfat.
					if (calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, 'mfat', creep.memory.s))
					{
						creep.memory.path = 10;
						creep.memory.d_path = 10;
						let status = roleCustodian.move(creep, 'harvester', creep.memory.s);

						//Now that we've issued a move to mfat, invert our direction before finishing up.
						if (status === OK)
						{
							console.log('OK');
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
							creep.memory.d_path = 0;
							creep.memory.direction += 4;
							if (creep.memory.direction > 8)
							{
								creep.memory.direction -= 8;
							}
						}

						return status;
					}
				}
				else if (!roleCustodian.harvester.run(creep, creep.memory.s))	//We're at the source and we've mined it. (Return false means it was in range.)
				{
					//console.log('Gathering.');
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
				roleCustodian.pathjump(creep);
			}

			//If we land on the upgrade flipper, it's safe to swap paths here. But only if the extensions have been filled.
			if (creep.fatigue === 0)
			{
				if (creep.memory.lmission[0] !== 4 && creep.memory.s === creep.memory.d_s	//If we're coming back from the controller, we've already flipped.
					&& Memory.rooms[creep.room.name].sources[creep.memory.s].upgrade.slice[0]	//If we have a hybrid, then this is null.
					&& creep.pos.x === Memory.rooms[creep.room.name].sources[creep.memory.s].upgrade.slice(-1)[0].x && creep.pos.y === Memory.rooms[creep.room.name].sources[creep.memory.s].upgrade.slice(-1)[0].y
					&& calculate.extensionsfilled(creep.room.name, creep.memory.s))
				{
					if (creep.memory.s < Memory.rooms[creep.room.name].sources.length - 1)
					{
						creep.memory.s++;
						creep.memory.d_s++;
					}
					else
					{
						creep.memory.s = 0;
						creep.memory.d_s = 0;
					}
				}
				else if (creep.carry.energy === 0 && creep.memory.s !== creep.memory.d_s)	//We should swap if we are heading back to mine another source.
				{
					let tile;

					if (Memory.rooms[creep.room.name].path[creep.pos.x] && (tile = Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y]))
					{
						let type = require('control').paths;
						//If we touch path 2 early, we should switch to it.
						if ((creep.memory.path === 0 || creep.memory.path === 1) && tile[type[2]] && tile[type[2]][creep.memory.s])
						{
							creep.memory.path = 2;
							creep.memory.d_path = -1;
						}

						for (p = 0; p < 4; p++)	//If we find a path we can switch to, then switch to it.
						{
							if ((tile.flipper && tile.flipper[type[p]] && tile.flipper[type[p]][creep.memory.d_s]) || (tile[type[p]] && tile[type[p]][creep.memory.d_s]))
							{
								creep.memory.path = p;
								creep.memory.s = creep.memory.d_s;
								break;
							}
						}
					}

					/*if (creep.memory.s < Memory.rooms[creep.room.name].sources.length - 1)
					{
						creep.memory.s++;
						//creep.memory.d_s++;
					}
					else
					{
						creep.memory.s = 0;
						//creep.memory.d_s = 0;
					}*/
				}
				/*else if (creep.fatigue === 0 && creep.memory.s !== creep.memory.d_s)
				{
					roleCustodian.pathjump(creep);
				}*/
			}

			console.log('Returning. Path: ' + creep.memory.path + ' ' + creep.memory.d_path + ' Source: ' + creep.memory.s + ' ' + creep.memory.d_s);
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

				//We should stop it from continuously retreating from the source while that source is empty.
				if (creep.pos.x === Memory.rooms[creep.room.name].sources[creep.memory.s].mfat[0].x && creep.pos.y === Memory.rooms[creep.room.name].sources[creep.memory.s].mfat[0].y)
				{
					creep.cancelOrder('move');
				}

				return status;
			}
		},

		//Mission 3 is to fill extensions.
		function(creep)
		{
			console.log('Filling extensions.');
			//If we're filling extensions, we can simply run as an mtransport.
			if (creep.carry.energy > 0)
			{
				roleCustodian.repair(creep);	//We can also run repairs while we're patrolling around.

				roleCustodian.pathjump(creep);
				let status = true;

				if (roleCustodian.mtransport.run(creep))
				{
					//If we're at the end of the upgrade path and we can move, we might be upgrading the controller.
					if (creep.fatigue === 0
						&& ((Memory.rooms[creep.room.name].sources[creep.memory.s].upgrade[0]	//If we have a hybrid, then this is null. We'll have to get to the controller another way.
						&& creep.pos.x === Memory.rooms[creep.room.name].sources[creep.memory.s].upgrade.slice(-1)[0].x && creep.pos.y === Memory.rooms[creep.room.name].sources[creep.memory.s].upgrade.slice(-1)[0].y)
						|| (Memory.rooms[creep.room.name].sources[creep.memory.s].upgrade[0] === null	//If we don't have a hybrid, we need to make sure we're not entering this block just by sitting next to the source.
						&& creep.pos.x === Memory.rooms[creep.room.name].sources[creep.memory.s].mine.slice(-1)[0].x && creep.pos.y === Memory.rooms[creep.room.name].sources[creep.memory.s].mine.slice(-1)[0].y))
						&& calculate.extensionsfilled(creep.room.name, creep.memory.s))	//Have we filled all of this source's extensions?
					{
						console.log("We've filled all of source " + creep.memory.s + "'s extensions. Upgrade the controller.");
						creep.memory.lmission.unshift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.

						//The mission select doesn't need to be explicitly called. We've performed our action and it'll select a mission next tick.
						creep.memory.target =	//It needs the target in order to operate as an upgrader.
						{
							x: Memory.rooms[creep.room.name].upgrade.slice(-1)[0].x,
							y: Memory.rooms[creep.room.name].upgrade.slice(-1)[0].y
						};
						creep.memory.mission = 4;

						//If we're at the controller, we still have energy, and this source's extensions are full, we should dump that energy into the controller before we move on.
						creep.memory.direction = creep.pos.getDirectionTo(creep.memory.target.x, creep.memory.target.y);
						status = creep.move(creep.memory.direction);
						console.log('Moving ' + creep.memory.direction);

						//If there's an upgrader in the way, we need to switch places with it.
						let upg;	//Assign within the comparison.
						if (((upg = Memory.rooms[creep.room.name].creeps.upgrader) && upg.length)
							|| (Memory.rooms[creep.room.name].sources[0] && (upg = Memory.rooms[creep.room.name].sources[0].hybrid) && upg.length)	//We usually don't assume the number of sources, but we do here.
							|| (Memory.rooms[creep.room.name].sources[1] && (upg = Memory.rooms[creep.room.name].sources[1].hybrid) && upg.length))
						{
							console.log(upg[0]);
							upg = Game.creeps[upg[0]];
							if (upg.pos.x === Memory.rooms[creep.room.name].upgrade.slice(-1)[0].x && upg.pos.y === Memory.rooms[creep.room.name].upgrade.slice(-1)[0].y)
							{
								//Since the upgrader path and the utransport path are different, we have to do a switcheroo.
								upg.memory.direction = creep.memory.direction;
								upg.move(upg.pos.getDirectionTo(creep.pos.x, creep.pos.y));
								creep.move(creep.memory.direction);
								creep.say('Please.');
								creep.memory.please = true;
							}
						}

						//Perform an inversion so we can return to the path.
						//creep.memory.path = 2;
						creep.memory.direction += 4;
						if (creep.memory.direction > 8)
						{
							creep.memory.direction -= 8;
						}

						//If we're going to be upgrading at a hybrid's position, we need to get back onto the mine path rather than the upgrade path.
						if (!Memory.rooms[creep.room.name].sources[creep.memory.s].upgrade.slice[0])
						{
							creep.memory.path = 0;
						}
					}
					else	//Otherwise, move along the mtransport path.
					{
						status = roleCustodian.move(creep, 'mtransport', creep.memory.s);
						console.log('Moving along mtransport. Path: ' + creep.memory.path + ' ' + creep.memory.d_path + ' Source: ' + creep.memory.s + ' ' + creep.memory.d_s);
					}
				}

				return status;
			}
			else	//If we're empty, then we no longer care whether the extensions are full. Choose another mission.
			{
				creep.memory.mission = 0;
				return roleCustodian.missions[creep.memory.mission](creep);
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
				creep.memory.lmission.unshift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.
				creep.memory.mission = 0;	//The mission select doesn't need to be explicitly called. We've performed our action and it'll select a mission next tick.

				//If we asked the upgrader to move, it can have its spot back now.
				if (creep.memory.please)
				{
					creep.say('Thank you.');
					creep.memory.please = undefined;
				}

				//Swap to the other source. We can guarantee the swap succeeds, since both upgrade paths end in the same spot touching the upgrader.
				if (creep.memory.d_s < Memory.rooms[creep.room.name].sources.length - 1)
				{
					creep.memory.s++;
					creep.memory.d_s++;
				}
				else
				{
					creep.memory.s = 0;
					creep.memory.d_s = 0;
				}

				console.log('Finished upgrading controller. Path: ' + creep.memory.path + ' ' + creep.memory.d_path + ' Source: ' + creep.memory.s + ' ' + creep.memory.d_s);
			}
		},

		//Mission 5 is to stock the terminal. The material handler can decide what to do with anything we put in it.
		function(creep)
		{
			//When we received this mission, we were still at a source. We can move from there to the lab stamp.
			console.log('Stocking Terminal. Path: ' + creep.memory.path + ' ' + creep.memory.d_path + ' Source: ' + creep.memory.s + ' ' + creep.memory.d_s);
			roleCustodian.pathjump(creep);
			if (creep.fatigue === 0 && creep.memory.path === 12)	//We were assigned this path because we had energy and nowhere else to put it. That makes it a good metric for whether we're going to the stamp or coming back.
			{
				console.log('Transferring.');
				if (creep.transfer(Game.rooms[creep.room.name].terminal, RESOURCE_ENERGY) === OK)
				{
					console.log('Transfer complete.');
					creep.memory.path = 13;

					//Swap to the other source.
					if (creep.memory.d_s < Memory.rooms[creep.room.name].sources.length - 1)
					{
						//creep.memory.s++;
						creep.memory.d_s++;
					}
					else
					{
						//creep.memory.s = 0;
						creep.memory.d_s = 0;
					}
					creep.memory.d_path = 0;
					//roleCustodian.pathjump(creep);
				}
				else	//We need to handle a stubborn case where control moves it from 13 to 0, then departs the flipper tile before we can move it from 0 to 12.
				{
					let status = roleCustodian.move(creep, 'custodian', creep.memory.s);
					if (creep.memory.path === 0)
					{
						roleCustodian.pathjump(creep);
						status = roleCustodian.move(creep, 'custodian', creep.memory.s);
					}
					return status;
				}
			}
			else if (creep.carry.energy === 0 && calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, 'mine', creep.memory.s))	//The energy has been delivered. We're heading back to the source.
			{
				//If we touch any tile belonging to the correct mine path, we can switch back to selecting a mission.
				console.log('Switching back to mission select.');
				creep.memory.path = 0;
				creep.memory.d_path = 0;
				creep.memory.mission = 0;
				return roleCustodian.missions[creep.memory.mission](creep);
			}
			else if (creep.carry.energy > 0 && creep.memory.path === 0)	//By default, control moves custodians from 13 to 0. But we need to go from 13 to 12 for this mission.
			{
				console.log('We need to be set to the correct path.');
				creep.memory.path === 12;
				roleCustodian.pathjump(creep);
			}

			return roleCustodian.move(creep, 'custodian', creep.memory.s);
		},

		//Mission 6 is...
		/*function(creep)
		{
			
		},

		//Mission 7 is...
		function(creep)
		{
			
		},*/

		//The third-to-last index mission is to build the lab stamp. If our boosting mission detects that the stamp is incomplete, it'll assign this mission.
		function(creep)
		{
			console.log('Building lab stamp. Path: ' + creep.memory.path + ' ' + creep.memory.d_path + ' Source: ' + creep.memory.s + ' ' + creep.memory.d_s);
			//We can run mission 1 while capturing its attempts to complete itself. This will move us into position and gather the energy we need.
			let source;
			let sites;
			//Assign within the comparison.
			if ((source = Game.getObjectById(Memory.rooms[creep.room.name].sources[creep.memory.s].id)) && source.energy && (creep.memory.path === 0 || creep.memory.path === 10))
			{
				console.log('Mining to build.');
				//Energy was found. Go to it.
				let status = roleCustodian.missions[1](creep);
				creep.memory.mission = roleCustodian.missions.length - 3;

				//If we mine out the source, we can prepare to travel to the stamp.
				if (status === OK && source.energy <= (creep.memory.harv + (creep.memory.harv * creep.memory.t)) * 2)
				{
					creep.memory.path = 0;	//It needs to bootstrap from the mine flipper to the labs path.
					creep.memory.d_path = 12;
				}

				return status;
			}	//Assign within comparison.
			else if (creep.memory.path === 13)	//We're returning along the stamp-to-source path.
			{
				console.log('Path ' + creep.memory.path + '.');
				creep.transfer(Game.rooms[creep.room.name].terminal, RESOURCE_ENERGY);	//If we're heading back, we should get rid of the energy we're holding, or the mission select will throw us off the path.
				roleCustodian.pathjump(creep);
				//Go to the source.
				if (calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, 'mine', creep.memory.s))
				{
					creep.memory.path = 0;
					creep.memory.d_path = 0;
					let status = roleCustodian.missions[1](creep);
					creep.memory.mission = roleCustodian.missions.length - 3;
					return status;
				}
				else
				{
					console.log('Trying custodian complete.');
					return roleCustodian.move(creep, 'custodian', creep.memory.s);
				}
			}
			else if (creep.memory.path === 15)	//We're returning along the stamp-to-spawn path.
			{
				console.log('Path ' + creep.memory.path + '.');
				creep.transfer(Game.rooms[creep.room.name].terminal, RESOURCE_ENERGY);	//If we're heading back, we should get rid of the energy we're holding, or the mission select will throw us off the path.
				//Go to the source.
				if (calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, 'lreturn', creep.memory.s))
				{
					console.log('Trying custodian begin.');
					creep.memory.path = 13;
					creep.memory.d_path = 0;
					roleCustodian.pathjump(creep);
					return roleCustodian.move(creep, 'custodian', creep.memory.s);
				}
				else
				{
					console.log('Trying handler.');
					return roleCustodian.move(creep, 'handler');
				}
			}
			else if ((sites = Game.rooms[creep.room.name].find(FIND_MY_CONSTRUCTION_SITES, {filter: roleCustodian.buildfilter})) && sites.length	//Do we have sites to build?
				&& creep.carry.energy > 0)	//If the source is empty and we are carrying energy now, we've mined it out. Go to build now.
			{
				console.log('Going to build sites.');

				//If there are roads we could build, let's do that too.
				//We accidentally did something clever here. Since it stops to build sites, and it only detects roads near it, it'll prepare the next road it needs to get deeper into the stamp while still focusing on structures.
				sites = Game.rooms[creep.room.name].find(FIND_MY_CONSTRUCTION_SITES, {filter: function(road) {return road.structureType === STRUCTURE_ROAD && road.pos.isNearTo(creep.pos);}}).concat(sites);

				/*if (creep.carry.energy > 3)	//This was for the PTR.
				{
					creep.drop(RESOURCE_ENERGY, creep.store.getUsedCapacity(RESOURCE_ENERGY) - 3);
				}*/
				let status;

				//If we touch the path through it, switch over to that.
				if (calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, 'epath'))
				{
					creep.memory.path = 14;
					creep.memory.d_path = 14;
				}

				//Try to build anything we're supposed to be building.
				let chosen;
				for (let si = 0; si < sites.length; si++)
				{
					if (sites[si].pos.inRangeTo(creep, 3))
					{
						chosen = sites[si];
						break;
					}
				}

				if (chosen)	//If we can build, we build.
				{
					//If we would run out of energy by building this tick, we can start heading back.
					//if (creep.build(chosen) === OK && creep.carry.energy === 1)	//If we're testing on PTR.
					if (creep.build(chosen) === OK && chosen.progressTotal - chosen.progress >= (creep.memory.harv / 2) * 5 && creep.carry.energy <= creep.memory.harv * 5)	//Custodians don't get build boosts.
					{
						if (creep.memory.path === 14)
						{
							creep.memory.path = 15;
						}
						else if (creep.memory.path === 12)
						{
							creep.memory.path = 13;
						}

						//Swap to the other source.
						if (creep.memory.d_s < Memory.rooms[creep.room.name].sources.length - 1)
						{
							//creep.memory.s++;
							creep.memory.d_s++;
						}
						else
						{
							//creep.memory.s = 0;
							creep.memory.d_s = 0;
						}
						creep.memory.d_path = 0;
						roleCustodian.pathjump(creep);
					}
				}
				else	//If we can't, we move.
				{
					//Move along whichever path we're using.
					if (creep.memory.path === 12 || creep.memory.path === 13)
					{
						//console.log('Path ' + creep.memory.path + '.');
						status = roleCustodian.move(creep, 'custodian', creep.memory.s);
					}
					else if (creep.memory.path === 14 || creep.memory.path === 15)
					{
						//console.log('Path ' + creep.memory.path + '.');
						status = roleCustodian.move(creep, 'handler');
					}
					else if (creep.memory.path === 0 && calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, 'lreturn', creep.memory.s))
					{
						creep.memory.direction = Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y].flipper.mine[creep.memory.s].labs;
						creep.memory.path = 12;
						creep.memory.d_path = 12;
						status = roleCustodian.move(creep, 'custodian', creep.memory.s);
					}
					else if (creep.memory.path === 0 && creep.pos.x === Memory.rooms[creep.room.name].sources[creep.memory.s].mfat[0].x && creep.pos.y === Memory.rooms[creep.room.name].sources[creep.memory.s].mfat[0].y)
					{
						//It can wind up unable to leave the mfat position for some reason.
						console.log('Force leaving the mfat.');
						status = creep.move(creep.pos.getDirectionTo(Memory.rooms[creep.room.name].sources[creep.memory.s].mine.slice(-1)[0].x, Memory.rooms[creep.room.name].sources[creep.memory.s].mine.slice(-1)[0].y));
					}
				}
				

				return status;
			}
			else if (Memory.rooms[creep.room.name].path[creep.pos.x]	//We are either out of sources or out of energy, but we haven't yet gotten onto the return path or the mine path. We might be stuck at the end of the lab stamp.
				&& Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y] && Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y].flipper && Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y].flipper.epath)
			{
				console.log('Trying to flip back.');
				creep.memory.path = 14;
				creep.memory.d_path = 14;
				return roleCustodian.move(creep, 'handler');
			}
			else if (creep.memory.path === 2 || creep.memory.path === 3)
			{
				console.log('It switched to restocking extensions.');
				roleCustodian.pathjump(creep);
				return roleCustodian.move(creep, 'mtransport', creep.memory.s);
			}
			else if(!sites.length && creep.memory.path !== 0)	//If it's complete, we need to get back on our normal path.
			{
				if (creep.memory.path === 14)
				{
					creep.memory.path = 15;
				}
				else if (creep.memory.path === 12)
				{
					creep.memory.path = 13;
				}

				//Swap to the other source.
				if (creep.memory.d_s < Memory.rooms[creep.room.name].sources.length - 1)
				{
					//creep.memory.s++;
					creep.memory.d_s++;
				}
				else
				{
					//creep.memory.s = 0;
					creep.memory.d_s = 0;
				}
				creep.memory.d_path = 0;
				roleCustodian.pathjump(creep);
			}
			else if (!sites.length)	//If we managed to get back onto path 0 and it's complete, then our mission is complete.
			{
				console.log('Mission complete.');
				creep.memory.mission = 0;
				creep.memory.lmission.unshift(1);	//It mined out a source before this check was able to be made, so we need to remember that.

				//If we're not committed to running the labs, then we don't need the custodian anymore.	(We're probably still developing the other roles.)
				if (!Memory.rooms[creep.room.name].ideal.extractor || !Memory.rooms[creep.room.name].ideal.handler)
				{
					roleCustodian.work_with_others(creep.room.name);
				}
				else
				{
					roleCustodian.work_alone(creep.room.name);
				}

				return roleCustodian.missions[creep.memory.mission](creep);
			}
			else	//All other cases have failed. We are winding up here when it needs to switch to another source but it didn't make it into the lab stamp yet.
			{
				console.log('Nothing to do.');
				if (creep.memory.s === creep.memory.d_s && creep.memory.path !== 10)	//If we failed to find a way because we're not on the labs path, then switch sources one time, since we were unable to do so.
				{
					if (creep.memory.d_s < Memory.rooms[creep.room.name].sources.length - 1)
					{
						//creep.memory.s++;
						creep.memory.d_s++;
					}
					else
					{
						//creep.memory.s = 0;
						creep.memory.d_s = 0;
					}
					return roleCustodian.move(creep, 'mtransport', creep.memory.s);
				}
				else if (creep.memory.s !== creep.memory.d_s)
				{
					console.log("Falling back to the source we're currently on.");
					creep.memory.d_path = 12;
					creep.memory.d_s = creep.memory.s;
				}
				else
				{
					return false;
				}
			}
			/*else if (sites.length)	//If we've emptied out but we still need to build, we need to go to another source.
			{
				//When we spent the last of our energy, we switched sources already. But we still need to head back.
			}*/
		},

		//The second-to-last index mission is to get unboosted. We'll probably only use this once.
		function(creep)
		{
			console.log('Unboosting. Path: ' + creep.memory.path + ' ' + creep.memory.d_path + ' Source: ' + creep.memory.s + ' ' + creep.memory.d_s);
			if (creep.memory.path === 12 || creep.memory.path === 13)	//First we need to get to the lab stamp.
			{
				return roleCustodian.move(creep, 'custodian', creep.memory.s);
			}
			else if (!creep.memory.t)	//Then once we're unboosted, let's go to a spawn to recycle.
			{
				return roleCustodian.move(creep, 'handler');
			}
			else	//If we're still patrolling around the room, begin making our way to the lab stamp.
			{
				if (calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, 'lreturn', creep.memory.s))
				{
					creep.memory.path = 0;
					//roleCustodian.pathjump(creep);
					return roleCustodian.move(creep, 'custodian', creep.memory.s);
				}
				else
				{
					return roleCustodian.move(creep, 'mtransport', creep.memory.s);
				}
			}
		},

		//The last index mission is to get boosted. We'll probably only use this once.
		function(creep)
		{
			console.log('Boosting. Path: ' + creep.memory.path + ' ' + creep.memory.d_path + ' Source: ' + creep.memory.s + ' ' + creep.memory.d_s);
			//Let's perform a startup check to make sure we have a completed lab stamp.
			if (Game.rooms[creep.room.name].storage && Game.rooms[creep.room.name].terminal	//The storage, the terminal,
				&& Game.getObjectById(Memory.rooms[creep.room.name].mineral.cid) && Game.getObjectById(Memory.rooms[creep.room.name].mineral.eid)	//the container, and the extractor.
				&& (Game.rooms[creep.room.name].controller.level < 7 || Game.getObjectById(Memory.rooms[creep.room.name].buildings.factory.id))	//The factory, if the room is high enough.
				&& (Game.rooms[creep.room.name].controller.level < 8
				|| (Game.getObjectById(Memory.rooms[creep.room.name].spawns[2].id) && Game.getObjectById(Memory.rooms[creep.room.name].buildings.nuker.id))))	//The third spawn and the nuker, if the room is high enough.
			{
				for (let l = 0; l < Memory.rooms[creep.room.name].goals.labs; l++)
				{
					if (!Game.getObjectById(Memory.rooms[creep.room.name].mine.labs[l].id))
					{
						//We found a missing lab.
						creep.memory.mission = roleCustodian.missions.length - 3;
						creep.memory.s = 0;
						creep.memory.d_s = 0;
						creep.memory.path = 0;
						creep.memory.d_path = 0;
						creep.memory.lmission.unshift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.
						return roleCustodian.missions[creep.memory.mission](creep);
					}
				}
			}
			else
			{
				//We found a missing structure.
				creep.memory.mission = roleCustodian.missions.length - 3;
				creep.memory.s = 0;
				creep.memory.d_s = 0;
				creep.memory.path = 0;
				creep.memory.d_path = 0;
				creep.memory.lmission.unshift(creep.memory.mission);	//Always remember our latest non-selecting, non-waiting mission.
				return roleCustodian.missions[creep.memory.mission](creep);
			}

			//If we made it this far, all is well. Let's get boosted.
			//The handler should have it all ready for us. (That's its job.)

			//Have we reached the destination yet?
			let path;	//Assign within comparison.
			if (Memory.rooms[creep.room.name].path[creep.pos.x] && (path = Memory.rooms[creep.room.name].path[creep.pos.x][creep.pos.y]) && path.flipper && path.flipper.labs)
			{
				creep.memory.s = 0;
				creep.memory.d_s = 0;
				creep.memory.path = 12;	//Since there's no lreturn tile here, we have to be deflected by the labs flipper.
				creep.memory.d_path = 13;
			}

			if (creep.memory.s === -1)
			{
				//When we first emerge, we're taking the path from the spawn to the stamp. When we get there, go back to source 0.
				return roleCustodian.move(creep, 'handler');
			}
			else if (labs.requests[creep.name])	//We're waiting to get boosted.
			{
				labs.fulfill(creep.name);
			}
			else if (calculate.findtile(creep.room.name, creep.pos.x, creep.pos.y, 'mine', creep.memory.s))	//Once we're boosted, get back on path.
			{
				creep.memory.path = 0;
				creep.memory.d_path = 0;
				creep.memory.mission = 0;
			}
			else
			{
				return roleCustodian.move(creep, 'custodian', creep.memory.s);	//If we're not back on path yet, make our way there.
			}
		}
	],

	run: function(creep)
	{
		roleCustodian.missions[creep.memory.mission](creep);

		return false;	//This creep will decide its own movement.
	},

	work_alone: function(room_name)
	{
		Memory.rooms[room_name].ideal.custodian = 1;
		if (Memory.rooms[room_name].ideal.upgrader)
		{
			Memory.rooms[room_name].ideal.upgrader = 0;
		}
		Memory.rooms[room_name].ideal.upgradecontainer = 0;

		for (let s = 0; s < Memory.rooms[room_name].sources.length; s++)
		{
			if (Memory.rooms[room_name].sources[s].ideal.harvester)
			{
				Memory.rooms[room_name].sources[s].ideal.harvester = 0;
				Memory.rooms[room_name].sources[s].ideal.utransport = 0;
			}
			else if (Memory.rooms[room_name].sources[s].ideal.hybrid)
			{
				Memory.rooms[room_name].sources[s].ideal.hybrid = 0;
			}
			Memory.rooms[room_name].sources[s].ideal.mtransport = 0;
			Memory.rooms[room_name].sources[s].ideal.builder = 0;
			Memory.rooms[room_name].sources[s].ideal.miningcontainer = 0;
		}
		let str = JSON.stringify(Memory.rooms[room_name].ideal);
		for (let s = 0; s < Memory.rooms[room_name].sources.length; s++)
		{
			str = str + "\n" + JSON.stringify(Memory.rooms[room_name].sources[s].ideal);
		}
		return str;
	},

	work_with_others: function(room_name)
	{
		Memory.rooms[room_name].ideal.custodian = 0;
		if (Array.isArray(Memory.rooms[room_name].creeps.upgrader))
		{
			Memory.rooms[room_name].ideal.upgrader = 1;
		}
		Memory.rooms[room_name].ideal.upgradecontainer = 1;

		for (let s = 0; s < Memory.rooms[room_name].sources.length; s++)
		{
			if (Array.isArray(Memory.rooms[room_name].sources[s].creeps.harvester))
			{
				Memory.rooms[room_name].sources[s].ideal.harvester = 1;
				Memory.rooms[room_name].sources[s].ideal.utransport = 1;
			}
			else if (Array.isArray(Memory.rooms[room_name].sources[s].creeps.hybrid))
			{
				Memory.rooms[room_name].sources[s].ideal.hybrid = 1;
			}
			Memory.rooms[room_name].sources[s].ideal.mtransport = 1;
			Memory.rooms[room_name].sources[s].ideal.builder = 1;
			Memory.rooms[room_name].sources[s].ideal.miningcontainer = 1;
		}
		let str = JSON.stringify(Memory.rooms[room_name].ideal);
		for (let s = 0; s < Memory.rooms[room_name].sources.length; s++)
		{
			str = str + "\n" + JSON.stringify(Memory.rooms[room_name].sources[s].ideal);
		}
		return str;
	},

	//For testing the stamp building capability.
	clearstamp: function(room_name)
	{
		let stamp = Game.rooms[room_name].find(FIND_STRUCTURES, {filter: roleCustodian.clearfilter});
		for (let s = 0; s < stamp.length; s++)
		{
			stamp[s].destroy();
		}
	
		let spawn = Game.getObjectById(Memory.rooms[room_name].spawns[2].id);
		let container = Game.getObjectById(Memory.rooms[room_name].mineral.cid);
		if (spawn)
		{
			spawn.destroy();
		}
		if (container)
		{
			container.destroy();
		}

		stamp = Game.rooms[room_name].find(FIND_MY_CONSTRUCTION_SITES, {FILTER: roleCustodian.buildfilter});
		for (let s = 0; s < stamp.length; s++)
		{
			stamp[s].remove();
		}

		return true;
	},

	clearfilter: function(site)
	{
		return site.structureType === STRUCTURE_LAB || site.structureType === STRUCTURE_EXTRACTOR || site.structureType === STRUCTURE_STORAGE
			|| site.structureType === STRUCTURE_TERMINAL || site.structureType === STRUCTURE_FACTORY || site.structureType === STRUCTURE_NUKER || site.structureType === STRUCTURE_LINK || site.structureType === STRUCTURE_POWER_SPAWN;
	},

	buildfilter: function(site)
	{
		return site.structureType === STRUCTURE_LAB || site.structureType === STRUCTURE_EXTRACTOR || site.structureType === STRUCTURE_SPAWN || site.structureType === STRUCTURE_STORAGE || site.structureType === STRUCTURE_CONTAINER
			|| site.structureType === STRUCTURE_TERMINAL || site.structureType === STRUCTURE_FACTORY || site.structureType === STRUCTURE_NUKER || site.structureType === STRUCTURE_LINK || site.structureType === STRUCTURE_POWER_SPAWN;
	}
};

module.exports = roleCustodian;