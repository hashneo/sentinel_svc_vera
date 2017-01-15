'use strict';

module.exports.process = (_data, _state) => {

    if ( !_data['temperature'] )
        _data['temperature'] = {};

    if ( !_data['temperature']['heat'] )
        _data['temperature']['heat'] = {};

    switch (_state.variable) {
        case  'SetpointTarget':
           // _data['temperature']['heat']['set'] = parseInt(_state.value);
            break;
        case 'CurrentSetpoint':
            _data['temperature']['heat']['set'] = parseInt(_state.value);
            break;
    }

    return _data;
};