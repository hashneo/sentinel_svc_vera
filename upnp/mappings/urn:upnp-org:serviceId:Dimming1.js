'use strict';

module.exports.process = (_data, _state) => {

    switch (_state.variable) {
        case  'LoadLevelStatus':
            _data['level'] = parseInt(_state.value);
            break;
    }

    return _data;
};