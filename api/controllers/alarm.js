'use strict';

module.exports.setAlarmArmedMode = (req, res) => {

    let id = req.swagger.params.id.value;
    let mode = req.swagger.params.mode.value;
    let code = req.swagger.params.pin.value;

    switch (mode) {
        case 'away':
            mode = 'Armed'; break;
        case 'stay':
            mode = 'Stay'; break;
        case 'night':
            mode = 'Night'; break;
        case 'vacation':
            mode = 'Vacation'; break;
    }

    global.module.callAction(id, 'urn:micasaverde-com:serviceId:AlarmPartition2', 'RequestArmMode', 'State', mode, {'PINCode': code})
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

module.exports.setAlarmDisarmed = (req, res) => {

    let id = req.swagger.params.id.value;
    let code = req.swagger.params.pin.value;

    global.module.callAction(id, 'urn:micasaverde-com:serviceId:AlarmPartition2', 'RequestArmMode', 'State', 'Disarmed', {'PINCode': code})
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};

module.exports.setAlarmChimeState = (req, res) => {

    let id = req.swagger.params.id.value;
    let state = req.swagger.params.state.value;
    let code = req.swagger.params.pin.value;

    let callAction;

    switch (state) {
        case 'on':
        case'off':
            callAction = global.module.callAction(id, 'urn:micasaverde-com:serviceId:VistaAlarmPanel1', 'SetChimeMode', 'Mode', state === 'on' ? '1' : '0', {'PINCode': code});
            break;
        case 'toggle':
            callAction = global.module.callAction(id, 'urn:micasaverde-com:serviceId:VistaAlarmPanel1', 'ToggleChimeMode', null, {'PINCode': code});
            break;
    }
    callAction
        .then( (status) => {
            res.json( { data: { status: status }, result : 'ok' } );
        })
        .catch( (err) => {
            res.status(500).json( { code: err.code || 0, message: err.message } );
        });
};
