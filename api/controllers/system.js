'use strict';

module.exports.getDevices = (req, res) => {
    global.vera.getDevices()
        .then( (devices) => {
            res.json( { data: devices, result : 'ok'  } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

module.exports.getStatus = (req, res) => {

};

module.exports.getDeviceStatus = (req, res) => {
    global.vera.getDeviceStatus(req.swagger.params.id.value)
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};
