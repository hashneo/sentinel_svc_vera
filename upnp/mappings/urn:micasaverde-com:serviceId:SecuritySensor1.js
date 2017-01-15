'use strict';

module.exports.process = (_data, _state) => {

    if (!_data['tripped'])
        _data['tripped'] = {};

    switch (_state.variable) {
        case  'Armed':
            _data['armed'] = (_state.value === '1');
            break;
        case  'Tripped':
        case 'ArmedTripped':
            _data['tripped']['current'] = (_state.value === '1');
            break;
        case 'LastTrip':
            try {
                _data['tripped']['last'] = new Date(parseInt(_state.value)*1000).toISOString();
            }catch(e){
            }
            break;
    }

    return _data;
};