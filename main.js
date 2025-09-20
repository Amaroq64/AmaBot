module.exports.loop = function()
{
	let cpu_usage = {Begin: Game.cpu.getUsed()};

	if(Memory)
	{
		cpu_usage.Memory = Game.cpu.getUsed();
	}

	//Don't run if we're not ready.
	if (Memory.rooms != undefined)
	{
		//Are we under attack?
		for (let spawn in Game.spawns)
		{
			if(Game.spawns[spawn].hits < Game.spawns[spawn].hitMax)
			{
				Game.spawns[spawn].room.controller.activateSafeMode();
			}
		}

		for (let room_name in Memory.rooms)
		{
			for (let role in Memory.rooms[room_name].creeps)
			{
				//Clean up any dead creeps.
				for (let c = 0; c < Memory.rooms[room_name].creeps[role].length; c++)
				{
					if (!Game.creeps[Memory.rooms[room_name].creeps[role][c]])
					{
						Memory.rooms[room_name].creeps[role].splice(c, 1);
					}
				}
			}

			for (let i = 0; i < Memory.rooms[room_name].sources.length; i++)
			{
				for (let role in Memory.rooms[room_name].sources[i].creeps)
				{
					//Clean up any dead creeps.
					for (let c = 0; c < Memory.rooms[room_name].sources[i].creeps[role].length; c++)
					{
						if (!Game.creeps[Memory.rooms[room_name].sources[i].creeps[role][c]])
						{
							Memory.rooms[room_name].sources[i].creeps[role].splice(c, 1);
						}
					}
				}
			}
		}
		let roomactions = require('claim').roomactions;
		for (let t = 0; t < roomactions.length; t++)
		{
			if (Array.isArray(Memory[roomactions[t]]))
			{
				for (let a = 0; a < Memory[roomactions[t]].length; a++)
				{
					for (let role in Memory[roomactions[t]][a].creeps)
					{
						//Clean up any dead creeps.
						for (let c = 0; c < Memory[roomactions[t]][a].creeps[role].length; c++)
						{
							if (!Game.creeps[Memory[roomactions[t]][a].creeps[role][c]])
							{
								console.log('Purging Creep: ' + Memory[roomactions[t]][a].creeps[role][c] + '.');
								Memory[roomactions[t]][a].creeps[role].splice(c, 1);
							}
						}
					}
				}
			}
		}
		for (let name in Memory.creeps)
		{
			if (!Game.creeps[name])
			{
				delete Memory.creeps[name];
			}
		}
		cpu_usage.CleanCreeps = Game.cpu.getUsed();

		require('roomPlanner').check();
		cpu_usage.Planner = Game.cpu.getUsed();

		require('control').run();
		cpu_usage.Control = Game.cpu.getUsed();

		require('builder').run();
		cpu_usage.Build = Game.cpu.getUsed();

		let test = require('test');
		//paths, extensions, defenses, newpath, [room_name, action[a]]
		//test.run(false, false, false, true, /*['E48S14', Memory.attack[0]]*/);
		//cpu_usage.Test = Game.cpu.getUsed();

		require('tower').monitor();
		cpu_usage.Tower = Game.cpu.getUsed();

		require('empire').check();
		cpu_usage.Empire = Game.cpu.getUsed();

		test.cpu_usage = cpu_usage;

		if(cpu_usage[Object.keys(cpu_usage)[Object.keys(cpu_usage).length - 1]] >= 20)
		{
			for (let module in cpu_usage)
			{
				console.log(module + " " + cpu_usage[module]);
			}
		}
	}

	//Generate a pixel.
	if (Game.cpu.bucket >= PIXEL_CPU_COST)
	{
		if (Game.cpu.generatePixel() == OK)
		{
			console.log("Generated a Pixel!");
		}
	}

	//Load our console commands.
	if (typeof global.help !== 'string')
	{
		require('commands');
	}
};