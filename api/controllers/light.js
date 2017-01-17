'use strict';

module.exports.setLightState = (req, res) => {

    let id = req.swagger.params.id.value;
    let state = req.swagger.params.state.value;

    global.vera.setTarget(id, 'urn:upnp-org:serviceId:SwitchPower1', state === 'on' ? 1 : 0)
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json({code: err.code || 0, message: err.message});
        });
};

module.exports.setLightLevel = (req, res) => {

    let id = req.swagger.params.id.value;
    let value = req.swagger.params.level.value;

    global.vera.setLoadLevelTarget(id, 'urn:upnp-org:serviceId:Dimming1', value)
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};
