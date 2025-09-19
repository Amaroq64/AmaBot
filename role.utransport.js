var roleUTransport = 
{
	transport: require('role.transport'),

	run: undefined
};

roleUTransport.run = roleUTransport.transport.run;

module.exports = roleUTransport;