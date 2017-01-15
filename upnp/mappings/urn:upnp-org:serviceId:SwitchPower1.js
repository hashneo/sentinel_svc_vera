'use strict';

module.exports.process = (_data, _state) => {

    switch (_state.variable) {
        case  'Status':
            _data['on'] = (_state.value === '1');
            break;
    }

    return _data;
};