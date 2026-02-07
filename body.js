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
	
	fatty: function(energy = 550, upgrader = false, eminer = false, moveneed = 1.5)
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
		energy -= 450;

		//Upgrading fatties require a carry. We'll put more carries on at the end if we can spare the energy.
		let maxWork;
		if (upgrader)
		{
			body.unshift(CARRY, CARRY);
			extracarry += 2;
			energy -= 100;

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
			energy -= 100;
			workcount++;
		}

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
		while (energy >= 50 && body.length - extracarry < Math.ceil(maxWork * moveneed) && body.length < 50)	//There should be one move for every two work, unless we're offroad.
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

	transport: function(energy, upgrader = false, pave = false)
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
		if (pave && starting_energy > level_seven_energy && energy >= 100 && body.length < 49 )		//Use the leftovers to squeeze out a little more transport capacity for pavers.
		{
			body.push(CARRY, CARRY);
			energy -= 100;
		}
		
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
			if (energy < 350)
			{
				return [MOVE, WORK, WORK, CARRY];	//At level 2 we might not have our extensions yet.
			}
			else if (energy > require('calculate').maximumEnergy(5))	//At level 6 or higher, we might be boosting, so use less parts here.
			{
				let countwork = 0;
				let flipwork = false;
				while (energy >= [250, 200][+flipwork] && countwork < 10)	//Since a container can hold 2000, we should hold 1000. A T1 boost would make it match.
				{
					if (flipwork)	//We have half work now, so on odd numbers, don't add a move.
					{
						body.push(WORK, CARRY, CARRY);	//The ideal fatty builder only needs to move at full speed while it's empty and traveling to its patrol route.
						energy -= 200;
					}
					else
					{
						body.push(MOVE, WORK, CARRY, CARRY);	//The ideal fatty builder only needs to move at full speed while it's empty and traveling to its patrol route.
						energy -= 250;
					}
					countwork++;
					flipwork = !flipwork;
				}
			}
			else
			{
				while (energy >= 350 && body.length < 46)	//Since a container can hold 2000, we should hold 1000. A T1 boost would make it match.
				{
					body.push(MOVE, WORK, WORK, CARRY, CARRY);	//The ideal fatty builder only needs to move at full speed while it's empty and traveling to its patrol route.
					energy -= 350;
				}
			}
		}
		if (minimumbuilder && energy >= 400)
		{
			energy -= 250;
			while (!fatbuilder && energy >= 150 && body.length < 30)
			{
				body.push(MOVE, CARRY, CARRY);	//The minimum builder has only 2 work part. We'll be maintaining the 1000 capacity of its full sized counterpart.
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

	claimer: function(energy)
	{
		let body = [MOVE, MOVE, MOVE, MOVE, CARRY, CARRY, CLAIM];
		energy -= 900;
		while (energy >= 100 && body.length < 11)
		{
			body.splice(-2, 0, CARRY, CARRY);
			energy -= 100;
		}
		if (energy >= 50)
		{
			body.splice(-2, 0, CARRY);
		}

		return body;
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
		let tbody = [[ATTACK, MOVE], [RANGED_ATTACK, MOVE], [WORK, MOVE]][attack];
		let cost = [130, 200, 150][attack]
		while (energy >= cost && body.length < 49)
		{
			body.push(tbody[0]);
			body.unshift(tbody[1]);
			energy -= cost;
		}

		return body;
	},

	healer: function(energy)
	{
		let body = [];
		while(energy >= 300 && body.length < 49)
		{
			body.push(MOVE, HEAL);
			energy -= 300;
		}

		return body;
	},

	hattacker: function(energy, attack = 0)
	{
		//A self-healing attacker can soak some damage.
		let body = [];
		let move_part = [];
		let tbody = [[MOVE, ATTACK, HEAL], [MOVE, RANGED_ATTACK, HEAL], [MOVE, WORK, HEAL]][attack];
		let cost = [430, 500, 450][attack]
		while (energy >= cost && (body.length + move_part.length) < 48)
		{
			move_part.push(tbody[0], tbody[0]);
			body.push(tbody[1], tbody[2]);
			energy -= cost;
		}
		if (energy >= 300)
		{
			move_part.push(tbody[0]);
			body.push(tbody[2]);
		}

		return move_part.concat(body);;
	},

	tank: function(energy)
	{
		let body = [];
		while(energy >= 550 && body.length < 49)
		{
			body.push(MOVE, HEAL);
			energy -= 550;
		}

		return body;
	},

	extractor: function(energy)
	{
		let body = [];
		while (energy >= 100 && body.length < 50)
		{
			body.push(WORK);
			energy -= 100;
		}

		return body;
	},

	custodian: function(energy, boosted = true)
	{
		//This leaves room for 15 more parts. It can move halfway decently before it's boosted.
		let body = new Array(10).fill(WORK).concat(new Array(10).fill(MOVE).concat(new Array(15).fill(CARRY)));
		energy -= 2250;

		let additional, cost, method;
		if (boosted)
		{
			additional = CARRY;
			cost = 50;
			method = 'push';
		}
		else
		{
			additional = WORK;
			cost = 100;
			method = 'unshift';
		}

		while (energy >= cost && body.length < 50)	//The ideal custodian quickly harvests both sources, then tends to the rest of the room. If these parts are T1 boosted, we'll use more CARRY instead of more WORK.
		{
			body[method](additional);
			energy -= cost;
		}

		return body;
	},

	handler: function(energy)
	{
		let body = new Array(15).fill(MOVE).concat(new Array(30).fill(CARRY));	//A material handler has a large carrying capacity. A multiple of 1500 is nice for stocking labs, especially once it's boosted.
		energy -= 2250;

		if (energy >= 250)	//It will need to maintain the roads and containers in its stamp.
		{
			body.unshift(WORK, WORK, MOVE);
			energy -= 250;
		}
	},

	paver: function(energy)
	{
		let carry = [];
		let body = [];

		//According to my calculations, the ideal paver is 20 WORK, 10 MOVE, 18 CARRY.
		while (energy >= 350 && (body.length + carry.length) < 46) //The ideal paver moves slow and steady. It carries a multiple of 300 and doesn't take too long to pave the roads.
		{
			body.unshift(WORK, WORK);
			body.push(MOVE);
			carry.push(CARRY, CARRY);
			energy -= 350;
		}
		if (energy >= 250)	//The previous while has already constrained it to 45.
		{
			body.unshift(WORK, WORK);
			body.push(MOVE);
			energy -= 250;
		}

		return body.concat(carry);
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

	transfer: function(energy)
	{
		let body = [];
		while (energy >= 50 && body.length < 50) //A dumb transferer is just carry parts.
		{
			body.push(CARRY);
		}

		return body;
	}
};

//We have some aliases so the calling functions don't need to care.
body.harvester = body.fatty;
body.farharvester = function(energy)
{
	return body.fatty(energy, false, false, 2);
}
body.upgrader = function(energy)
{
	return body.fatty(energy, true);
};
body.hybrid = body.upgrader;
body.mtransport = body.transport;
body.utransport = function(energy)
{
	return body.transport(energy, true);
}
body.ptransport = function(energy)
{
	return body.transport(energy, false, true);
}
body.ubuilder = body.builder;

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
};
body.dattacker = function(energy, attack = 2)
{
	return body.attacker(energy, attack);
};
body.hmattacker = body.hattacker;
body.hrattacker = function (energy, attack = 1)
{
	return body.hattacker(energy, attack);
};
body.hdattacker = function (energy, attack = 2)
{
	return body.hattacker(energy, attack);
};

module.exports = body;