var roleETransport = 
{
	transport: require('role.transport'),

	run: undefined
};

roleETransport.run = roleETransport.transport.run;

module.exports = roleETransport;