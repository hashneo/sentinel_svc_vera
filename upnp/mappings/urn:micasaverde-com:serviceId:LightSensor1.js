'use strict';

module.exports.process = (_data, _state) => {

    if ( !_data['light'] )
        _data['light'] = {};

    switch (_state.variable) {
        case  'CurrentLevel':
            _data['light']['current'] = parseInt(_state.value);
            break;
    }

    return _data;
};