'use strict';

module.exports.setHvacMode = (req, res) => {

    let id = req.swagger.params.id.value;
    let mode = req.swagger.params.mode.value;

    switch (mode){
        case 'heat':
            mode = 'HeatOn';
            break;
        case 'cool':
            mode = 'CoolOn';
            break;
        case 'auto':
            mode = 'AutoChangeOver';
            break;
        case 'off':
            mode = 'Off';
            break;
    }
    global.module.setModeTarget(id, 'urn:upnp-org:serviceId:HVAC_UserOperatingMode1', mode )
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

module.exports.setHvacTemp = (req, res) => {

    let id = req.swagger.params.id.value;
    let mode = req.swagger.params.mode.value;
    let temp = req.swagger.params.temp.value;

    let setCurrentSetpoint;

    switch (mode){
        case 'heat':
            setCurrentSetpoint = global.module.setCurrentSetpoint(id, 'urn:upnp-org:serviceId:TemperatureSetpoint1_Heat', temp);
            break;
        case 'cool':
            setCurrentSetpoint = global.module.setCurrentSetpoint(id, 'urn:upnp-org:serviceId:TemperatureSetpoint1_Cool', temp);
            break;
    }

    setCurrentSetpoint
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });

};

module.exports.setHvacFanMode = (req, res) => {

    let id = req.swagger.params.id.value;
    let mode = req.swagger.params.mode.value;

    switch (mode){
        case 'auto':
            mode = 'Auto';
            break;
        case 'continuous':
            mode = 'ContinuousOn';
            break;
        case 'periodic':
            mode = 'PeriodicOn';
            break;
        case 'off':
            mode = 'Off';
            break;
    }
    global.module.setMode(id, 'urn:upnp-org:serviceId:HVAC_FanOperatingMode1', mode )
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });

};
