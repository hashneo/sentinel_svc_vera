'use strict';

module.exports.setSwitchState = (req, res) => {

    let id = req.swagger.params.id.value;
    let state = req.swagger.params.state.value;

    global.module.setTarget(id, 'urn:upnp-org:serviceId:SwitchPower1', state === 'on' ? 1 : 0)
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json({code: err.code || 0, message: err.message});
        });
};
