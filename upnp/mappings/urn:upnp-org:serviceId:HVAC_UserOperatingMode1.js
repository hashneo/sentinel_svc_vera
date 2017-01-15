'use strict';

module.exports.process = (_data, _state) => {

    switch (_state.variable){
        case 'ModeStatus':
            switch(_state.value){
                case 'Off':
                    _data['mode'] = 'off';
                    break;
                case 'HeatOn':
                    _data['mode'] = 'heat';
                    break;
                case 'CoolOn':
                    _data['mode'] = 'cool';
                    break;
                case 'AutoChangeOver':
                    _data['mode'] = 'auto';
                    break;
            }
            break;
    }

    return _data;
};