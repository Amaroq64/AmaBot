var roleAttacker =
{
	run: function(creep)
	{
		let enemies = Game.rooms[creep.room.name].find(FIND_HOSTILE_CREEPS, {filter: roleAttacker.checkallies});
		enemies = creep.pos.findClosestByPath(enemies);

		if (creep.attack(enemies) === ERR_NOT_IN_RANGE)
		{
			creep.moveTo(enemies, {reusePath: creep.pos.getRangeTo(enemies[0])});
		}
		else
		{
			creep.move(enemies);
		}

		return false;	//This creep just chases enemies.
	}
};

roleAttacker.checkallies = require('empire').checkallies;

module.exports = roleAttacker;