global.help =
"attack(attack_number, x, y)\n" +
"attackdisplay\n" +
"attackrole(attack_number, role_type, number_of_role)\n" +
"movenow(creep_name, x, y)\n" +
"clearcreep(creep_name)\n" +
"oversign(creep_name)";

global.attack = function(i = false, x = false, y = false, room_name = false)
{
	if (Array.isArray(Memory.attack) && i > -1 && x > -1 && y > -1)
	{
		Memory.attack[i].pos.x = x;
		Memory.attack[i].pos.y = y;
		if (typeof room_name == 'string')
		{
			Memory.attack[i].pos.roomName = room_name;
		}
		else if (room_name !== false)
		{
			return "Invalid Room. " + i + ": " + Memory.attack[i].pos.x + ", " + Memory.attack[i].pos.y;
		}
		return "Attack " + i + ": " + Memory.attack[i].pos.x + ", " + Memory.attack[i].pos.y;
	}
	else
	{
		return false;
	}
};

Object.defineProperty(global, 'attackdisplay',
{
	get: function()
	{
		if (Array.isArray(Memory.attack))
		{
			let str = '';
			for (let i = 0; i < Memory.attack.length; i++)
			{
				str = str + "Attack " + i + ": " + Memory.attack[i].pos.x + ", " + Memory.attack[i].pos.y;
				if (i < Memory.attack.length - 1)
				{
					str = str + "\n"
				}
			}
			return str;
		}
		else
		{
			return false;
		}
	}
});

global.attackrole = function(i, role, r)
{
	if (Array.isArray(Memory.attack))
	{
		return Memory.attack[i].ideal[role] = r;
	}
	else
	{
		return false;
	}
}

global.movenow = function(creep_name, x, y)
{
	if (Memory.creeps[creep_name])
	{
		Memory.creeps[creep_name].movenow = Game.creeps[creep_name].pos.findPathTo(x, y);
		return true;
	}
	else
	{
		return false;
	}
}

global.clearcreep = function(creep_name)
{
	if (Memory.creeps[creep_name])
	{
		return Memory.creeps[creep_name].movenow = [];
	}
	else
	{
		return false;
	}
}

global.oversign = function(creep_name)
{
	if (Memory.creeps[creep_name])
	{
		return Game.creeps[creep_name].signController(Game.creeps[creep_name].room.controller, require('claim').oversignature);
	}
	else
	{
		return false;
	}
}

/*global.backupAttack = function(n)
{
	
}*/