var roleLBuilder =
{
	transport: require('role.transport'),
	builder: require('role.builder'),
	
	run: function(creep, s)
	{
		//Create roads wherever we go.
		if (Memory.creeps[creep.name].movenow.length == 0)
		{
			creep.room.createConstructionSite(creep.pos, STRUCTURE_ROAD);
		}

		//We only exist to build the lab stamp. If there's nothing to build, we aren't needed anymore.
		let sites = Game.rooms[creep.room.name].find(FIND_MY_CONSTRUCTION_SITES, {filter: roleLbuilder.stamp_filter}));
	},

	stamp_filter: require('role.custodian').buildfilter
};

module.exports = roleLBuilder;