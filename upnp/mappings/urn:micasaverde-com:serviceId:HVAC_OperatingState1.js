'use strict';

module.exports.process = (_data, _state) => {

    switch (_state.variable) {
        case  'ModeState':
            switch(_state.value){
                case 'Idle':
                    _data['state'] = 'off';
                    break;
                case 'Heating':
                    _data['state'] = 'heating';
                    break;
                case 'Cooling':
                    _data['state'] = 'cooling';
                    break;
            }
    }

    return _data;
};