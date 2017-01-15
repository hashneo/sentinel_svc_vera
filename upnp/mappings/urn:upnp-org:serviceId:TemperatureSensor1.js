'use strict';

module.exports.process = (_data, _state) => {

    if ( !_data['temperature'] )
        _data['temperature'] = {};

    switch (_state.variable) {
        case  'CurrentTemperature':
            _data['temperature']['current'] = parseInt(_state.value);
            break;
    }

    return _data;
};