import { fromJS, Map } from 'immutable';

function stringToNumeric(obj) {
    return obj.withMutations(obj => {
        obj.forEach((v, k) => {
            if (parseInt(k, 10)) {
                obj.delete(k);
                k = parseInt(k, 10);
            }
            if (Map.isMap(v)) {
                v = stringToNumeric(v);
            }
            obj.set(k, v);
        });
    });
}

export function flatToImmutable(obj, numericIds = true) {
    const result = fromJS(obj);
    return numericIds ? stringToNumeric(result) : result;
}
