'use strict';

module.exports.process = (_data, _state) => {

    switch (_state.variable) {
        case  'ArmMode':
            _data['armed'] = (_state.value === 'Armed');
            break;
        case 'DetailedArmMode':
            switch (_state.value) {
                case 'Disarmed':
                    _data['mode'] = 'disarmed';
                    break;
                case 'Armed':
                    _data['mode'] = 'armed';
                    break;
                case 'Stay':
                    _data['mode'] = 'stay';
                    break;
                case 'StayInstant':
                    _data['mode'] = 'stay-instant';
                    break;
                case 'Night':
                    _data['mode'] = 'night';
                    break;
                case 'NightInstant':
                    _data['mode'] = 'night-instant';
                    break;
                case 'Force':
                    _data['mode'] = 'force';
                    break;
                case 'Ready':
                    _data['mode'] = 'ready';
                    break;
                case 'Vacation':
                    _data['mode'] = 'vacation';
                    break;
                case 'NotReady':
                    _data['mode'] = 'not-ready';
                    break;
                case 'FailedToArm':
                    _data['mode'] = 'failed';
                    break;
                case 'EntryDelay':
                    _data['mode'] = 'entry-delay';
                    break;
                case 'ExitDelay':
                    _data['mode'] = 'exit-delay';
                    break;
            }
            break;
        case 'Alarm':
            _data['alarming'] = (_state.value === 'Active');
            break;
        case 'ChimeEnabled':
            _data['chime'] = (_state.value === 'true');
    }

    return _data;
};