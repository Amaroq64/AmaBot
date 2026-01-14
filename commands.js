var calculate = require('calculate');

global.help =
"attack(attack_number, x, y, [room_name])\n" +
"rescue(rescue_number, x, y, [room_name])\n" +
"attackdisplay\n" +
"attackrole(attack_number, role_type, number_of_role)\n" +
"rescuerole(rescue_number, role_type, number_of_role)\n" +
"movenow(creep_name, x, y)\n" +
"newpath(current_room, action_type, action_number, [x], [y], [x2], [y2], [target_room pos or true])\n" +
"clearcreep(creep_name)\n" +
"countextensions\n" +
"oversign(creep_name)\n" +
"flags";

global.flags = "Attack\nClaims\nReserves\nSigns\nTransfer\nSafe\nJoin\nRoad";

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

global.rescue = function(i = false, x = false, y = false, room_name = false)
{
	if (Array.isArray(Memory.rescue) && i > -1 && x > -1 && y > -1)
	{
		Memory.rescue[i].pos.x = x;
		Memory.rescue[i].pos.y = y;
		if (typeof room_name == 'string')
		{
			Memory.rescue[i].pos.roomName = room_name;
		}
		else if (room_name !== false)
		{
			return "Invalid Room. " + i + ": " + Memory.rescue[i].pos.x + ", " + Memory.rescue[i].pos.y;
		}
		return "Rescue " + i + ": " + Memory.rescue[i].pos.x + ", " + Memory.rescue[i].pos.y;
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
				str = str + Memory.attack[i].closest + ' -> ' + Memory.attack[i].pos.roomName + " Attack[" + i + "]: " + Memory.attack[i].pos.x + ", " + Memory.attack[i].pos.y;
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
};

global.rescuerole = function(i, role, r)
{
	if (Array.isArray(Memory.rescue))
	{
		return Memory.rescue[i].ideal[role] = r;
	}
	else
	{
		return false;
	}
};

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
};

global.newpath = function(room_name, action_type, action_number, x = false, y = false, x2 = false, y2 = false, room_name2 = false, direction = false)
{
	if (typeof room_name === 'string' && typeof action_type === 'string' && typeof action_number === 'number')
	{
		if (typeof x !== 'number' && typeof y !== 'number' && typeof x2 !== 'number' && typeof y2 !== 'number')
		{
			let temproom = Memory[action_type][action_number].path[room_name];
			x = temproom[0].x;
			y = temproom[0].y;
			x2 = temproom[temproom.length - 1].x;
			y2 = temproom[temproom.length - 1].y;
		}

		let temppath;
		if (typeof room_name2 === 'string')
		{
			temppath = calculate.cleanthispath(Game.rooms[room_name].findPath((new RoomPosition(x, y, room_name)), (new RoomPosition(x2, y2, room_name)), {plainCost: 1, swampCost: 2, maxRooms: 1}));
			Memory[action_type][action_number].pos.roomName = room_name2;
		}
		else if(room_name2)
		{
			temppath = calculate.cleanthispath(Game.rooms[room_name].findPath((new RoomPosition(x, y, room_name)), (new RoomPosition(x2, y2, room_name)), {plainCost: 1, swampCost: 2, maxRooms: 1}));
		}
		else
		{
			temppath = calculate.cleanthispath(Game.rooms[room_name].findPath((new RoomPosition(x, y, room_name)), (new RoomPosition(x2, y2, room_name)), {plainCost: 1, swampCost: 2}));
		}

		temppath.unshift({x: x, y: y, direction: temppath[0].direction});

		let temp_tile = {};
		for (let tile = 0; tile < temppath.length; tile++)
		{
			if (!temp_tile[temppath[tile].x])
			{
				temp_tile[temppath[tile].x] = {};
			}

			temp_tile[temppath[tile].x][temppath[tile].y] = temppath[tile].direction;
		}

		Memory[action_type][action_number].path[room_name] = temp_tile;
		Memory[action_type][action_number].path[room_name].clean = true;

		return true;
	}
	else
	{
		return false;
	}
};

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
};

Object.defineProperty(global, 'countextensions',
{
	get: function()
	{
		let all = true;
		let counted;
		for (let room_name in Memory.rooms)
		{
			counted = require('calculate').countextensions(room_name);
			if (counted < 60)
			{
				all = false;
			}
			console.log(counted);
		}
		return all;
	}
});

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
};

/*global.backupAttack = function(n)
{
	
}*/