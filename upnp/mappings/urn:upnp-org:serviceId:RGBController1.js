'use strict';

module.exports.process = (_data, _state) => {

    switch (_state.variable) {
        case  'Color':
            _data['color'] = _state.value.substring(1,9);
    }

    return _data;
};