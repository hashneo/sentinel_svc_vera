'use strict';

module.exports.process = (_data, _state) => {

    if ( !_data['fan'] )
        _data['fan'] = {};

    switch (_state.variable){
        case 'Mode':
            switch(_state.value){
                case 'Auto':
                    _data['fan']['mode'] = 'off';
                    break;
                case 'ContinuousOn':
                    _data['fan']['mode'] = 'heating';
                    break;
                case 'PeriodicOn':
                    _data['fan']['mode'] = 'cooling';
                    break;
            }
            break;
        case 'FanStatus':
            _data['fan']['running']= (_state.value === '1');
            break;

    }

    return _data;
};