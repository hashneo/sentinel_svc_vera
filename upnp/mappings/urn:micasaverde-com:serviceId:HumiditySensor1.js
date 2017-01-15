'use strict';

module.exports.process = (_data, _state) => {

    if ( !_data['humidity'] )
        _data['humidity'] = {};

    switch (_state.variable) {
        case  'CurrentLevel':
            _data['humidity']['current'] = parseInt(_state.value);
            break;
    }

    return _data;
};