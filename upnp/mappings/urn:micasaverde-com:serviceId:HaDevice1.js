'use strict';

module.exports.process = (_data, _state) => {

    switch (_state.variable) {
        case 'BatteryDate':
            try {

                if (!_data['battery'])
                    _data['battery'] = {};

                _data['battery']['reported'] = new Date(parseInt(_state.value)*1000).toISOString();
            }catch(e){
            }
            break;
        case  'BatteryLevel':

            if (!_data['battery'])
                _data['battery'] = {};

            _data['battery']['level'] = parseInt(_state.value);
            break;
    }

    return _data;
};