'use strict';

module.exports.process = (_data, _state) => {

    switch (_state.variable) {
        case  'ModeState':
            switch(_state.value){
                case 'Idle':
                    _data['state'] = 'off';
                    break;
                case 'Heating':
                    _data['state'] = 'heat';
                    break;
                case 'Cooling':
                    _data['state'] = 'cool';
                    break;
            }
    }

    return _data;
};