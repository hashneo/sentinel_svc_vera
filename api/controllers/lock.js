'use strict';

module.exports.setLockState = (req, res) => {

    let id = req.swagger.params.id.value;
    let state = req.swagger.params.state.value;

    global.module.setTarget(id, 'urn:micasaverde-com:serviceId:DoorLock1', state === 'open' ? 0 : 1)
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

