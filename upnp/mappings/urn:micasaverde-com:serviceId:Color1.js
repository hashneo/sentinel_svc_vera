'use strict';

String.prototype.zpad = function(length) {
    let str = this;
    while (str.length < length)
        str = '0' + str;
    return str;
};

module.exports.process = (_data, _state) => {

    switch (_state.variable) {
        case  'CurrentColor':
            _data['color'] = '#000000';
            if ( _state.value ) {
                let re = /(?:\d=(\d+)),?/g;
                let v = [];
                let m;
                while ( (m = re.exec(_state.value)) != null ){
                    v.push(m[1]);
                }
                if (v && v.length >= 3) {
                    _data['color'] = '#' + v[v.length - 3].zpad(2) + v[v.length - 2].zpad(2) + v[v.length - 1].zpad(2);
                }
                break;
            }
    }

    return _data;
};