'use strict';

module.exports.process = (_data, _state) => {

    if ( !_data['fan'] )
        _data['fan'] = {};

    switch (_state.variable){
        case 'Mode':
            switch(_state.value){
                case 'Auto':
                    _data['fan']['mode'] = 'auto';
                    break;
                case 'ContinuousOn':
                    _data['fan']['mode'] = 'continuous';
                    break;
                case 'PeriodicOn':
                    _data['fan']['mode'] = 'periodic';
                    break;
            }
            break;
        case 'FanStatus':
            _data['fan']['running']= (_state.value === '1');
            break;

    }

    return _data;
};