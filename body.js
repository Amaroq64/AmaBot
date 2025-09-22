var body =
{
	generic: function(energy = 300)	//Our basic creep to get started.
	{
		if (energy < 300)
		{
			return false;
		}

		let body = [];
		while (energy >= 300 && body.length < 47)
		{
			body.push(WORK, WORK, MOVE, CARRY);
			energy -= 300;
		}
		while (energy >= 200 && body.length < 49)
		{
			body.push(WORK, WORK);
			energy -= 200;
		}
		while (energy >= 50 && body.length < 50)
		{
			body.push(MOVE);
			energy -= 50;
		}
		
		return body;
	},
	
	fatty: function(energy = 550, upgrader = false, eminer = false)
	{	//Minimal parts for ideal fatty.
		if (energy < 550)
		{
			return this.generic(energy);
		}

		let body = [MOVE, WORK, WORK, WORK, WORK];
		let workcount = 4;
		let extracarry = 0;
		let eight = false;
		if (energy > require('calculate').maximumEnergy(7))
		{
			eight = true;	//If we're in a level 8 room, we're not delivering much energy to the upgrader. Only use one carry.
		}

		//Upgrading fatties require a carry. We'll put more carries on at the end if we can spare the energy.
		let maxWork;
		if (upgrader)
		{
			body.unshift(CARRY);
			extracarry++;
			energy += 50;

			if (eight)
			{
				maxWork = 16;	//If we're in a level 8 room, our upgrader can only spend 15 energy at a time.
			}
			else
			{
				maxWork = 25;	//He needs 20 works to keep up with two miners, and more than that to pickup and still work efficiently. 25 divides into 50, meaning we are not leaving any inefficient remainders in our carry.
			}
		}
		else	//Mining fatties can afford to run without a carry.
		{
			if (eminer)
			{
				maxWork = 7;	//An x4 source room generates 14 (rounded up) energy per tick. This number of works provides the minimal idle time.
			}
			else
			{
				maxWork = 5;	//An owned or reserved source generates 10 energy per tick. If we harvest more than that, there will be idle time.
			}
			body.push(WORK);
			workcount++;
		}
		energy -= 550;

		while (energy >= 100 && upgrader && workcount < maxWork && body.length < 50)	//More work if he's upgrading a controller.
		{
			body.push(WORK);
			energy -= 100;
			workcount++;
		}
		if (!eight && upgrader && energy >= 50 && body.length < 50)	//We can drop an extra carry on our upgraders at this point. It helps any body part over 20 make up for more lost time.
		{
			body.push(CARRY);
			extracarry++;
			energy -= 50;
		}
		while (energy >= 50 && body.length - extracarry < Math.ceil(maxWork * 1.5) && body.length < 50)	//There should be one move for every two work.
		{
			body.unshift(MOVE);
			energy -= 50;
		}
		if (!eight && upgrader && energy >= 50 && body.length < 50)	//No reason not to put another carry last. (If it's not a harvester, of course.)
		{
			body.push(CARRY);
			energy -= 50;
		}

		return body;
	},

	transport: function(energy, upgrader = false)
	{
		let starting_energy = energy;
		let level_seven_energy = require('calculate').maximumEnergy(7);
		if (energy < 150)
		{
			return false;
		}
		else if (upgrader && energy > level_seven_energy)	//A level 8 room can only upgrade 15 per tick.
		{
			return [MOVE, CARRY, CARRY];
		}

		let body = [];
		//Full sized creeps are too much. They're starving the economy. But a level 8 room has tiny upgraders, so we can make huge extension fillers.
		while (energy >= 150 && (body.length < 24 || starting_energy > level_seven_energy && body.length < 48))
		{
			body.push(MOVE, CARRY, CARRY);	//The ideal transport has two carries for every move.
			energy -= 150;
		}
		/*if (starting_energy > level_seven_energy && energy >= 100 && body.length < 49 )		//Use the leftovers to squeeze out a little more transport capacity at level 8.
		{
			body.push(CARRY, CARRY);
			energy -= 100;
		}*/
		
		return body;
	},

	builder: function(energy, fatbuilder = false, minimumbuilder = false)
	{
		if (energy < 200)
		{
			return false;
		}

		let body = [];
		if (fatbuilder)
		{
			while (energy >= 350 && body.length < 36)	//Since our endgame builders only hold 800, the fatty only needs to hold 800 too.
			{
				body.push(MOVE, WORK, WORK, CARRY, CARRY);	//The ideal fatty builder only needs to move at full speed while it's empty and traveling to its patrol route.
				energy -= 350;
			}
		}
		if (minimumbuilder)
		{
			energy -= 250;
			while (!fatbuilder && energy >= 150 && body.length < 24)
			{
				body.push(MOVE, CARRY, CARRY);	//The minimum builder has only 1 work part. We'll be maintaining the 800 capacity of its full sized counterpart.
				energy -= 150;
			}
			body.push(MOVE, WORK, WORK);	//The whole point of a minimum builder is to repair. Without its work part, it's just a transport.
		}
		else
		{
			while (!fatbuilder && energy >= 200 && body.length < 48)
			{
				body.push(MOVE, WORK, CARRY);	//The ideal builder can move at full speed while carrying.
				energy -= 200;
			}
		}
		if (!fatbuilder && !minimumbuilder && energy >= 150 && body.length < 49)
		{
			body.push(MOVE);
			body.push(WORK);
			energy -= 150;
		}
		else if (!fatbuilder && !minimumbuilder && energy >= 100 && body.length < 49)
		{
			body.push(MOVE);
			body.push(CARRY);
			energy -= 100;
		}
		/*else if (energy >= 50)
		{
			body.push(CARRY);
		}*/

		return body;
	},

	scout: function()
	{
		return [MOVE];
	},

	claimer: function()
	{
		return [MOVE, MOVE, WORK, CARRY, CLAIM];
	},

	reserver: function(energy)
	{
		let body = [];

		while (energy >= 700 && body.length < 34)
		{
			body.unshift(MOVE);
			body.push(CLAIM);

			energy -= 700;
		}

		return body;
	},

	attacker: function(energy, attack = 0)
	{
		let body = [];
		let tbody = [[MOVE, ATTACK], [MOVE, RANGED_ATTACK], [MOVE, WORK]][attack];
		let cost = [130, 200, 150][attack]
		while (energy >= cost && body.length < 49)
		{
			body.push(tbody[0]);
			body.push(tbody[1]);
			energy -= cost;
		}

		return body;
	},

	healer: function(energy)
	{
		while(energy >= 300 && body.length < 49)
		{
			body.push(MOVE, HEAL);
			energy -= 300;
		}

		return body;
	},

	tank: function(energy)
	{
		while(energy >= 550 && body.length < 49)
		{
			body.push(MOVE, HEAL);
			energy -= 550;
		}

		return body;
	},

	paver: function(energy)
	{
		let body = [];
		while (energy && body.length < 49) //The ideal paver moves slow and steady. It carries a multiple of 300 and doesn't take too long to build.
		{
			body.push();
			energy -= 0;
		}

		return body;
	},

	towtruck: function(energy)
	{
		let body = [];
		while (energy >= 50 && body.length < 50) //The ideal towtruck is nothing but move parts.
		{
			body.push(MOVE);
		}

		return body;
	},
};

//We have some aliases so the calling functions don't need to care.
body.harvester = body.fatty;
body.upgrader = function(energy)
{
	return body.fatty(energy, true);
};
body.mtransport = body.transport;
body.utransport = function(energy)
{
	return body.transport(energy, true);
}
body.ubuilder = body.builder;
body.latebuilder = function(energy)
{
	let temp = body.transport(energy)
	temp.splice(-1, 1);
	temp.push(WORK);
	return temp;
}
body.dbuilder = function(energy)
{
	return body.builder(energy, true);
}
body.minbuilder = function(energy)
{
	return body.builder(energy, false, true);
}
body.mattacker = body.attacker;
body.rattacker = function(energy, attack = 1)
{
	return body.attacker(energy, attack);
}
body.dattacker = function(energy, attack = 2)
{
	return body.attacker(energy, attack);
}

module.exports = body;