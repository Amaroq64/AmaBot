calculate = require('calculate');

var labs =
{
	requests: {},	//Here we track boost requests.
	demand: {},		//Here we track what minerals each room needs.
	deferred: [],	//When we spawn a creep that needs boosting, we have to wait a tick for it to begin spawning. This is so the material handler can respond to its composition.

	request: function(creep_name, boost)	//Creep boosts can be requested here. Boost can be a string or an array of strings.
	{
		if (!Game.creeps[creep_name] || !boost)
		{
			labs.deferred.push({creep_name: creep_name, boost: boost});
			return true;	//If it doesn't exist yet, registering its boost will have to wait.
		}
		else if (Array.isArray(boost))
		{
			for (let b = 0; b < boost.length; b++)
			{
				labs.request(creep_name, boost[b]);
			}
			return true;
		}
		else if (!Array.isArray(labs.requests[creep_name]))
		{
			labs.requests[creep_name] = [boost];
		}
		else if (labs.requests[creep_name].indexOf(boost) === -1)
		{
			labs.requests[creep_name].push(boost);
		}
		return true;
	},

	fulfill: function(creep)
	{
		let fulfilled = 0;

		//Arrange the labs into an easily testable format.
		let labs = {};
		for (let l = 0, tlab; l > Memory.rooms[creep.room.name].mine.labs.length; l++)
		{
			tlab = Memory.rooms[creep.room.name].mine.labs[l];
			calculate.mark_found(tlab.x, tlab.y, labs, tlab.id);
		}

		//Try to fullfill all requests for this creep.
		for (let x = -1, tempx, tempy, tlab; x < 2; x++)
		{
			tempx = creep.pos.x + x;
			for (let y = -1; y < 2; y++)
			{
				tempy = creep.pos.y + y;
				
				//Assign within comparison.
				if (calculate.check_xy(tempx, tempy, labs) && (tlab = Game.getObjectById(labs[tempx][tempy])))
				{
					//If we found a lab, test to see if it contains the resource we want.
					for (let r = 0, still_testing = true; still_testing && r < labs.requests[creep.name].length; r++)
					{
						for (let creep_parts in BOOSTS)
						{
							if (BOOSTS[creep_parts][labs.requests[creep.name][r]]	//The creep wants this boost. Can we fulfill it?
								&& creep.getActiveBodyparts(creep_parts).length * 30 <= tlab.store[labs.requests[creep.name][r]]
								&& creep.getActiveBodyparts(creep_parts).length * 20 <= tlab.store[RESOURCE_ENERGY]
								&& tlab.boostCreep(creep) === OK)
							{
								//We will fulfill this request.
								console.log('Fulfilling ' + ' ' + creep.getActiveBodyparts(creep_parts).length + ' ' + labs.requests[creep.name][r] + '.');
								labs.requests[creep.name].splice(r, 1);	//Remove the fulfilled request.
								if (!labs.requests[creep.name].length)
								{
									delete labs.requests[creep.name];
								}
								fulfilled++;
								still_testing = false;
								break;
							}
						}
					}
				}
			}
		}

		return fulfilled;	//This is how our we will know if our requests have been satisfied.
	},

	run: function()
	{
		//
	}
};

module.exports = labs;